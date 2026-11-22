import { useCallback, useEffect, useState } from 'react';
import {
  MapPin,
  Search,
  ShoppingBag,
  Star,
  Clock,
  Receipt,
  Sparkles,
  Store as StoreIcon,
  ClipboardList,
  HelpCircle,
} from 'lucide-react';
import { api, formatYen, resolveAssetUrl } from '../../api/client';
import { OrderTypeBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { FAQ_ENTRIES } from '../../seo/routes';
import type { CartItem, Order, PlatformSettings, Store } from '../../types';
import { StoreDetailModal } from './StoreDetailModal';
import { CustomStoreModal } from './CustomStoreModal';
import { CartDrawer } from './CartDrawer';
import { OrderTracker } from './OrderTracker';

const CATEGORIES = ['すべて', 'バーガー', '寿司', 'カレー', 'カフェ', '町中華', 'ラーメン', '洋食', '焼き鳥・弁当'];

export function CustomerApp() {
  const { notify } = useToast();
  const [view, setView] = useState<'browse' | 'orders'>('browse');
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [partnerFilter, setPartnerFilter] = useState<'all' | '1' | '0'>('all');
  const [category, setCategory] = useState('すべて');
  const [search, setSearch] = useState('');

  const [activeStoreId, setActiveStoreId] = useState<string | null>(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('store');
  });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const [customerName, setCustomerName] = useState('山田 花子');
  const [deliveryAddress, setDeliveryAddress] = useState('東京都渋谷区桜丘町15-14 渋谷レジデンス 402');

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
        ? `店頭代理注文（${order.id}）をドライバーへ送信しました！`
        : `注文（${order.id}）を店舗へ送信しました！`,
      'success'
    );
  };

  const cartCount = cartItems.reduce((s, it) => s + it.quantity, 0);
  const cartSubtotal = cartItems.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const activeOrdersCount = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <div>
      <div className="cust-header" role="region" aria-label="検索・配達先バー">
        <div className="cust-header-inner">
          <div className="cust-address-pill" title="配達先住所（カート画面で変更可能）">
            <MapPin size={15} color="#047843" aria-hidden="true" />
            <span>{deliveryAddress.slice(0, 22)}{deliveryAddress.length > 22 ? '…' : ''}</span>
          </div>

          <div className="cust-search-wrap">
            <Search size={16} className="cust-search-icon" aria-hidden="true" />
            <label htmlFor="customer-search-input" className="sr-only">
              お店・ジャンル・エリアで検索
            </label>
            <input
              id="customer-search-input"
              className="cust-search-input"
              placeholder="お店・ジャンル・エリアで検索（例：町中華、渋谷、ラーメン）"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (view !== 'browse') setView('browse');
              }}
            />
          </div>

          <div className="cust-header-actions">
            <button
              type="button"
              id="customer-orders-tab"
              className={`btn btn-sm ${view === 'orders' ? 'btn-dark' : 'btn-outline'}`}
              onClick={() => {
                setView(view === 'orders' ? 'browse' : 'orders');
                void fetchAll();
              }}
            >
              <ClipboardList size={15} aria-hidden="true" />
              注文状況
              {activeOrdersCount > 0 && (
                <span className="badge badge-partner" style={{ padding: '2px 7px', fontSize: 11 }}>
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              id="customer-cart-btn"
              className="btn btn-primary btn-sm"
              onClick={() => setShowCart(true)}
            >
              <ShoppingBag size={15} aria-hidden="true" />
              カート ({cartCount})
              {cartCount > 0 && <span className="tabular-nums">・{formatYen(cartSubtotal)}</span>}
            </button>
          </div>
        </div>
      </div>

      <main className="cust-main">
        {view === 'orders' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>リアルタイム注文状況・履歴</h1>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setView('browse')}>
                <StoreIcon size={15} aria-hidden="true" />
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
                    公式提携店のスムーズな配達から、デリバリー未対応の町中華・行列ラーメンの「ドライバー店頭持ち帰り代理注文」まで、ワンアプリでお届けします。
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
                    商店街のお惣菜店や地元のお気に入り食堂など、アプリ未掲載のお店の名前とメニューを入力するだけで代理購入リクエストが可能です。
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

            <div className="cust-filters-bar">
              <div className="segmented" role="group" aria-label="提携種別フィルタ">
                <button
                  type="button"
                  aria-pressed={partnerFilter === 'all'}
                  className={`segmented-btn ${partnerFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setPartnerFilter('all')}
                >
                  すべて（{stores.length}）
                </button>
                <button
                  type="button"
                  aria-pressed={partnerFilter === '1'}
                  className={`segmented-btn ${partnerFilter === '1' ? 'active' : ''}`}
                  onClick={() => setPartnerFilter('1')}
                >
                  公式提携店（{stores.filter((s) => s.is_partner).length}）
                </button>
                <button
                  type="button"
                  aria-pressed={partnerFilter === '0'}
                  className={`segmented-btn seg-proxy ${partnerFilter === '0' ? 'active' : ''}`}
                  onClick={() => setPartnerFilter('0')}
                >
                  非提携・代理持ち帰り（{stores.filter((s) => !s.is_partner).length}）
                </button>
              </div>

              {settings && (
                <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                  基本配達料 <strong className="tabular-nums">{formatYen(settings.base_delivery_fee)}</strong> ・ 非提携代理手数料{' '}
                  <strong className="tabular-nums">{formatYen(settings.proxy_order_fee)}</strong>
                </span>
              )}
            </div>

            <div className="category-strip" role="group" aria-label="ジャンル絞り込み">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={category === cat}
                  className={`cat-chip ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <section aria-labelledby="catalog-list-heading">
              <h2 id="catalog-list-heading" className="sr-only">
                掲載レストラン一覧（公式提携・非提携代理持ち帰り対応）
              </h2>

              {loading ? (
                <div className="store-grid" aria-busy="true">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="store-card"
                      style={{ minHeight: 310, background: 'var(--bg-subtle)' }}
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
                <div className="store-grid">
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
                            {store.is_open && store.busy_mode && <span className="badge badge-warn">混雑中</span>}
                          </div>
                        </div>

                        <div className="store-card-body">
                          <div className="store-card-title-row">
                            <h3 className="store-card-title">{store.name}</h3>
                            <span className="store-rating-pill tabular-nums">
                              <Star size={12} fill="#d97706" color="#d97706" aria-hidden="true" />
                              {store.rating.toFixed(1)}
                            </span>
                          </div>
                          <div className="store-card-meta">
                            <span>{store.area}</span>
                            <span aria-hidden="true">•</span>
                            <span>{store.category}</span>
                            <span aria-hidden="true">•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={12} aria-hidden="true" />
                              {store.avg_prep_min + 12}〜{store.avg_prep_min + 22}分
                            </span>
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
                注文・非提携代理持ち帰りに関するよくある質問
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
          defaultAddress={deliveryAddress}
          defaultName={customerName}
          onClose={() => setShowCustomModal(false)}
          onCreated={handleOrderCreated}
        />
      )}

      {showCart && settings && (
        <CartDrawer
          store={cartStore}
          items={cartItems}
          settings={settings}
          customerName={customerName}
          deliveryAddress={deliveryAddress}
          onChangeCustomerName={setCustomerName}
          onChangeDeliveryAddress={setDeliveryAddress}
          onUpdateQty={handleUpdateQty}
          onClear={() => {
            setCartItems([]);
            setCartStore(null);
          }}
          onClose={() => setShowCart(false)}
          onOrderPlaced={handleOrderCreated}
        />
      )}
    </div>
  );
}
