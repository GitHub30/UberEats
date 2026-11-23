import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Search,
  ShoppingCart,
  Star,
  Clock,
  Receipt,
  Sparkles,
  Bell,
  ChevronDown,
  Home,
  User,
  Download,
  HelpCircle,
  X,
} from 'lucide-react';
import { api, formatYen, resolveAssetUrl } from '../../api/client';
import { OrderTypeBadge } from '../../components/StatusBadge';
import { PaymentLogo, usePaymentWallet } from '../../components/PaymentBadge';
import { useToast } from '../../components/Toast';
import { FAQ_ENTRIES } from '../../seo/routes';
import type { CartItem, Order, PlatformSettings, Store } from '../../types';
import { StoreDetailModal } from './StoreDetailModal';
import { CustomStoreModal } from './CustomStoreModal';
import { CartDrawer } from './CartDrawer';
import { OrderTracker } from './OrderTracker';
import { PaymentWalletView } from './PaymentWalletView';

const CATEGORY_ITEMS = [
  { id: 'すべて', label: 'すべて', icon: '🍽️' },
  { id: 'バーガー', label: 'バーガー', icon: '🍔' },
  { id: '寿司', label: '寿司', icon: '🍣' },
  { id: 'ラーメン', label: 'ラーメン', icon: '🍜' },
  { id: 'カレー', label: 'カレー', icon: '🍛' },
  { id: '町中華', label: '町中華', icon: '🥟' },
  { id: '洋食', label: '洋食', icon: '🍳' },
  { id: 'カフェ', label: 'カフェ', icon: '🍵' },
  { id: '焼き鳥・弁当', label: '焼鳥・弁当', icon: '🍱' },
];

interface CustomerAppProps {
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
}

export function CustomerApp({ canInstallPwa, onInstallPwa }: CustomerAppProps) {
  const { notify } = useToast();
  const wallet = usePaymentWallet();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [view, setView] = useState<'browse' | 'orders' | 'wallet'>('browse');
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [partnerFilter, setPartnerFilter] = useState<'all' | '1' | '0'>('all');
  const [category, setCategory] = useState('すべて');
  const [fastOnly, setFastOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [editingAddress, setEditingAddress] = useState(false);
  const [customerName, setCustomerName] = useState('山田 花子');
  const [deliveryAddress, setDeliveryAddress] = useState('東京都渋谷区桜丘町15-14 渋谷レジデンス 402');

  const [activeStoreId, setActiveStoreId] = useState<string | null>(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('store');
  });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const [cartStore, setCartStore] = useState<Store | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [storesRes, ordersRes, settingsRes] = await Promise.all([
      api.listStores(),
      api.listOrders(),
      api.getSettings(),
    ]);
    setStores(storesRes.stores);
    setOrders(ordersRes.orders);
    setSettings(settingsRes);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll()
      .catch(() => notify('データの読み込みに失敗しました', 'error'))
      .finally(() => setLoading(false));
  }, [fetchAll, notify]);

  const filteredStores = stores.filter((s) => {
    if (partnerFilter === '1' && !s.is_partner) return false;
    if (partnerFilter === '0' && s.is_partner) return false;
    if (category !== 'すべて' && s.category !== category) return false;
    if (fastOnly && s.avg_prep_min + 12 > 30) return false;
    if (topRatedOnly && s.rating < 4.8) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAddToCart = (store: Store, item: CartItem) => {
    if (cartStore && cartStore.id !== store.id && cartItems.length > 0) {
      setCartStore(store);
      setCartItems([item]);
      notify(`カートを「${store.name}」に切り替えて追加しました`, 'info');
      return;
    }
    setCartStore(store);
    setCartItems((prev) => {
      const existing = prev.find((x) => x.key === item.key);
      if (existing) {
        return prev.map((x) => (x.key === item.key ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, item];
    });
    notify(`「${item.name}」をカートに追加しました`, 'success');
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => (it.key === key ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const handleOrderCreated = async (order: Order) => {
    setCartItems([]);
    setCartStore(null);
    setShowCart(false);
    setShowCustomModal(false);
    setActiveStoreId(null);
    setSelectedOrderId(order.id);
    setView('orders');
    await fetchAll();
    notify(
      order.order_type === 'proxy_takeout'
        ? `店頭代理注文（${order.id} / ${order.payment_label}）をドライバーへ送信しました！`
        : `注文（${order.id} / ${order.payment_label}）を店舗へ送信しました！`,
      'success'
    );
  };

  const cartCount = cartItems.reduce((s, it) => s + it.quantity, 0);
  const activeOrdersCount = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
  const shortAddress = deliveryAddress.replace(/^東京都/, '').slice(0, 18);

  return (
    <div className="ue-app-shell">
      {/* Standalone Uber Eats Japan White Header (NO cross-app header!) */}
      {view !== 'wallet' && (
        <header className="ue-top-bar">
          <div className="ue-top-bar-inner">
            <div className="ue-location-row">
              <button
                type="button"
                className="ue-address-btn"
                onClick={() => setEditingAddress((v) => !v)}
                aria-expanded={editingAddress}
                aria-label="お届け先住所を変更"
              >
                <MapPin size={19} strokeWidth={2.3} aria-hidden="true" />
                <span>{shortAddress}{deliveryAddress.length > 21 ? '…' : ''}</span>
                <ChevronDown size={17} aria-hidden="true" />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {canInstallPwa && onInstallPwa && (
                  <button
                    type="button"
                    id="pwa-install-btn"
                    className="btn btn-primary btn-sm"
                    style={{ borderRadius: 999, padding: '6px 12px', fontSize: 12 }}
                    onClick={onInstallPwa}
                  >
                    <Download size={13} aria-hidden="true" />
                    アプリ追加
                  </button>
                )}
                <button
                  type="button"
                  className="ue-bell-btn"
                  aria-label={`注文状況・通知（進行中 ${activeOrdersCount} 件）`}
                  onClick={() => {
                    setView(view === 'orders' ? 'browse' : 'orders');
                    void fetchAll();
                  }}
                >
                  <Bell size={22} strokeWidth={2} aria-hidden="true" />
                  {activeOrdersCount > 0 && <span className="ue-badge-dot">{activeOrdersCount}</span>}
                </button>
              </div>
            </div>

            {editingAddress && (
              <div style={{ display: 'flex', gap: 8, paddingBottom: 10 }}>
                <input
                  className="input"
                  aria-label="お届け先住所入力"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="お届け先住所を入力..."
                />
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  onClick={() => {
                    setEditingAddress(false);
                    notify('お届け先を更新しました', 'success');
                  }}
                >
                  決定
                </button>
              </div>
            )}

            {view === 'browse' && (
              <nav className="ue-top-tabs" aria-label="お店種別タブ">
                <button
                  type="button"
                  className={`ue-top-tab ${partnerFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setPartnerFilter('all')}
                >
                  すべて
                </button>
                <button
                  type="button"
                  className={`ue-top-tab ${partnerFilter === '1' ? 'active' : ''}`}
                  onClick={() => setPartnerFilter('1')}
                >
                  公式提携店
                </button>
                <button
                  type="button"
                  className={`ue-top-tab ${partnerFilter === '0' ? 'active' : ''}`}
                  onClick={() => setPartnerFilter('0')}
                >
                  非提携・持ち帰り代理
                </button>
                <button
                  type="button"
                  className="ue-top-tab"
                  style={{ color: 'var(--proxy-amber)' }}
                  onClick={() => setShowCustomModal(true)}
                >
                  ＋ 掲載外のお店を頼む
                </button>
              </nav>
            )}
          </div>
        </header>
      )}

      <main className={view === 'wallet' ? '' : 'cust-main'} style={view === 'wallet' ? undefined : { paddingTop: 12 }}>
        {view === 'wallet' ? (
          <PaymentWalletView wallet={wallet} onBack={() => setView('browse')} />
        ) : view === 'orders' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>リアルタイム注文状況・履歴</h1>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setView('browse')}>
                お店一覧に戻る
              </button>
            </div>
            <OrderTracker
              orders={orders}
              selectedOrderId={selectedOrderId}
              onSelectOrder={setSelectedOrderId}
              onRefreshList={fetchAll}
            />
          </div>
        ) : (
          <div className="animate-fade">
            {searchOpen && (
              <div className="ue-search-bar-panel">
                <Search size={16} className="cust-search-icon" aria-hidden="true" />
                <label htmlFor="customer-search-input" className="sr-only">
                  お店・ジャンル・エリアで検索
                </label>
                <input
                  ref={searchInputRef}
                  id="customer-search-input"
                  className="cust-search-input"
                  placeholder="お店・料理・エリアで検索（例：町中華、渋谷、ラーメン）"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="検索をクリア"
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      padding: 4,
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Category Icon Rail (Uber Eats Japan Style) */}
            <div className="ue-cat-rail" role="group" aria-label="料理ジャンル">
              {CATEGORY_ITEMS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={category === c.id}
                  className={`ue-cat-item ${category === c.id ? 'active' : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  <span className="ue-cat-icon" aria-hidden="true">{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Horizontal Quick Filter Pills */}
            <div className="ue-filter-pills" role="group" aria-label="クイック絞り込み">
              <button
                type="button"
                aria-pressed={partnerFilter === '0'}
                className={`ue-pill-btn proxy ${partnerFilter === '0' ? 'active' : ''}`}
                onClick={() => setPartnerFilter(partnerFilter === '0' ? 'all' : '0')}
              >
                <Receipt size={14} aria-hidden="true" />
                非提携・持ち帰り代理
              </button>
              <button
                type="button"
                aria-pressed={fastOnly}
                className={`ue-pill-btn ${fastOnly ? 'active' : ''}`}
                onClick={() => setFastOnly((v) => !v)}
              >
                <Clock size={14} aria-hidden="true" />
                30分以内
              </button>
              <button
                type="button"
                aria-pressed={topRatedOnly}
                className={`ue-pill-btn ${topRatedOnly ? 'active' : ''}`}
                onClick={() => setTopRatedOnly((v) => !v)}
              >
                <Star size={14} aria-hidden="true" />
                高評価 4.8+
              </button>
              <button
                type="button"
                className="ue-pill-btn"
                onClick={() => setView('wallet')}
              >
                <PaymentLogo type={wallet.selectedMethod.type} brand={wallet.selectedMethod.brand} />
                <span>{wallet.selectedMethod.label}</span>
              </button>
            </div>

            {/* Hero + Unlisted Proxy Request Banner */}
            <section className="cust-promo-grid">
              <div className="cust-hero-card">
                <img
                  src={resolveAssetUrl('images/hero.webp')}
                  alt="東京のおすすめデリバリーグルメ"
                  className="cust-hero-bg"
                  width={1376}
                  height={768}
                  fetchPriority="high"
                  decoding="async"
                />
                <div className="cust-hero-overlay">
                  <h1>提携店も、街の非提携の名店も。</h1>
                  <p>
                    現金・クレジットカード・PayPay・モバイルSuica対応。非提携の町中華や行列ラーメンもドライバーが店頭で持ち帰り購入してお届けします。
                  </p>
                </div>
              </div>

              <div className="cust-unlisted-cta">
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#923d0a', marginBottom: 8 }}>
                    <Sparkles size={15} aria-hidden="true" />
                    どんなお店でもテイクアウト代行
                  </div>
                  <h2>載っていないお店も、ドライバーが買いに行きます</h2>
                  <p style={{ marginTop: 6 }}>
                    商店街のお惣菜店や地元のお気に入り食堂など、未掲載のお店でも店名とメニューを入力するだけで代理注文できます。
                  </p>
                </div>
                <button
                  type="button"
                  id="open-custom-proxy-btn"
                  className="btn btn-proxy btn-block"
                  onClick={() => setShowCustomModal(true)}
                >
                  <Receipt size={16} aria-hidden="true" />
                  掲載外のお店を代理注文する
                </button>
              </div>
            </section>

            {/* Restaurant Grid */}
            <section aria-labelledby="catalog-list-heading">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 id="catalog-list-heading" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                  MachiEats で紹介（{filteredStores.length}店舗）
                </h2>
                {settings && (
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    配達料 {formatYen(settings.base_delivery_fee)}〜
                  </span>
                )}
              </div>

              {loading ? (
                <div className="ue-store-grid" aria-busy="true">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="store-card"
                      style={{ minHeight: 240, background: 'var(--bg-subtle)' }}
                    />
                  ))}
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700 }}>条件に一致するお店が見つかりませんでした</p>
                  <button type="button" className="btn btn-proxy btn-sm" onClick={() => setShowCustomModal(true)}>
                    お気に入りのお店を代理注文リクエストする
                  </button>
                </div>
              ) : (
                <div className="ue-store-grid">
                  {filteredStores.map((store) => (
                    <article key={store.id} className={`store-card ${!store.is_open ? 'closed' : ''}`}>
                      <button
                        type="button"
                        className="store-card-btn"
                        aria-label={`${store.name}（${store.is_partner ? '公式提携店' : '非提携・代理持ち帰り'}）のメニューを開く`}
                        onClick={() => setActiveStoreId(store.id)}
                      >
                        <div className="store-card-media">
                          <img
                            src={resolveAssetUrl(store.image_url)}
                            alt={`${store.name}の料理写真`}
                            width={800}
                            height={597}
                            loading="lazy"
                          />
                          <div className="store-card-badges">
                            <OrderTypeBadge isPartner={store.is_partner} />
                            {!store.is_open && <span className="badge badge-danger">準備中</span>}
                          </div>
                        </div>

                        <div className="store-card-body">
                          <h3 className="store-card-title">{store.name}</h3>
                          <div className="store-card-meta tabular-nums">
                            <span>
                              {store.is_partner
                                ? `配達手数料 ${formatYen(settings?.base_delivery_fee ?? 320)}`
                                : `代理手数料 ${formatYen(settings?.proxy_order_fee ?? 250)}`}
                            </span>
                          </div>
                          <div className="store-card-meta tabular-nums" style={{ color: 'var(--ink-primary)', fontWeight: 700 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              {store.rating.toFixed(1)}
                              <Star size={12} fill="#141413" color="#141413" aria-hidden="true" />
                              ({store.review_count})
                            </span>
                            <span>・</span>
                            <span>{store.avg_prep_min + 12} 分</span>
                          </div>
                          <p className="store-card-desc">{store.description}</p>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Visible FAQ section matching /customer/ FAQPage JSON-LD 1:1 */}
            <section className="faq-section" aria-labelledby="customer-faq-heading" style={{ marginTop: 42 }}>
              <h2 id="customer-faq-heading" style={{ fontSize: 18, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7, margin: '0 0 14px' }}>
                <HelpCircle size={18} color="#047843" aria-hidden="true" />
                注文・お支払い・非提携代理持ち帰りに関するよくある質問
              </h2>
              <div className="faq-list">
                {FAQ_ENTRIES.map((faq) => (
                  <details key={faq.question} className="faq-item">
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Floating Uber Eats Japan Pill Bottom Navigation Bar */}
      <nav className="ue-bottom-nav" aria-label="ボトムナビゲーション">
        <button
          type="button"
          className={`ue-nav-circle ${view === 'browse' && !searchOpen ? 'active' : ''}`}
          aria-label="ホーム（お店一覧）"
          onClick={() => {
            setView('browse');
            setSearchOpen(false);
          }}
        >
          <Home size={20} aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`ue-nav-circle ${view === 'orders' ? 'active' : ''}`}
          aria-label={`注文状況・配達追跡（進行中 ${activeOrdersCount} 件）`}
          onClick={() => {
            setView('orders');
            void fetchAll();
          }}
        >
          <MapPin size={20} aria-hidden="true" />
          {activeOrdersCount > 0 && <span className="ue-badge-dot">{activeOrdersCount}</span>}
        </button>

        <button
          type="button"
          className={`ue-nav-search-pill ${searchOpen ? 'active' : ''}`}
          onClick={() => {
            setView('browse');
            setSearchOpen(true);
            window.setTimeout(() => searchInputRef.current?.focus(), 60);
          }}
        >
          <Search size={18} aria-hidden="true" />
          <span>検索</span>
        </button>

        <button
          type="button"
          id="customer-cart-btn"
          className="ue-nav-circle"
          aria-label={`カートを開く（${cartCount}点）`}
          onClick={() => setShowCart(true)}
        >
          <ShoppingCart size={20} aria-hidden="true" />
          {cartCount > 0 && <span className="ue-badge-dot">{cartCount}</span>}
        </button>

        <button
          type="button"
          id="customer-wallet-btn"
          className={`ue-nav-circle ${view === 'wallet' ? 'active' : ''}`}
          aria-label="支払い方法・アカウント設定"
          onClick={() => setView('wallet')}
        >
          <User size={20} aria-hidden="true" />
        </button>
      </nav>

      {activeStoreId && (
        <StoreDetailModal
          storeId={activeStoreId}
          onClose={() => setActiveStoreId(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {showCustomModal && settings && (
        <CustomStoreModal
          settings={settings}
          wallet={wallet}
          defaultAddress={deliveryAddress}
          defaultName={customerName}
          onOpenWallet={() => {
            setShowCustomModal(false);
            setView('wallet');
          }}
          onClose={() => setShowCustomModal(false)}
          onCreated={handleOrderCreated}
        />
      )}

      {showCart && settings && (
        <CartDrawer
          store={cartStore}
          items={cartItems}
          settings={settings}
          wallet={wallet}
          customerName={customerName}
          deliveryAddress={deliveryAddress}
          onChangeCustomerName={setCustomerName}
          onChangeDeliveryAddress={setDeliveryAddress}
          onUpdateQty={handleUpdateQty}
          onClear={() => {
            setCartItems([]);
            setCartStore(null);
          }}
          onOpenWallet={() => {
            setShowCart(false);
            setView('wallet');
          }}
          onClose={() => setShowCart(false)}
          onOrderPlaced={handleOrderCreated}
        />
      )}
    </div>
  );
}
