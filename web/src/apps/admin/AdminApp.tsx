import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Store as StoreIcon,
  Bike,
  Sliders,
  RefreshCw,
  RotateCcw,
  Plus,
  Receipt,
  X,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react';
import { api, formatTime, formatYen } from '../../api/client';
import { OrderTypeBadge, StatusBadge, vehicleLabel } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import type { AdminAnalytics, Driver, Order, OrderStatus, PlatformSettings, Store } from '../../types';

type AdminTab = 'overview' | 'orders' | 'stores' | 'drivers' | 'settings';

export function AdminApp() {
  const { notify } = useToast();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  // Filters & modals
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'partner' | 'proxy_takeout'>('all');
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('');
  const [overrideDriverId, setOverrideDriverId] = useState<string>('');

  // New store form
  const [stName, setStName] = useState('');
  const [stCat, setStCat] = useState('町中華');
  const [stArea, setStArea] = useState('渋谷');
  const [stAddr, setStAddr] = useState('');
  const [stPartner, setStPartner] = useState(false);
  const [stNotes, setStNotes] = useState('');

  // New driver form
  const [drvName, setDrvName] = useState('');
  const [drvPhone, setDrvPhone] = useState('090-3333-4444');
  const [drvVehicle, setDrvVehicle] = useState<'bicycle' | 'ebike' | 'scooter' | 'car'>('ebike');
  const [drvProxyCard, setDrvProxyCard] = useState(true);

  const refreshAll = useCallback(async () => {
    const [an, ord, st, drv, set] = await Promise.all([
      api.getAnalytics(),
      api.listOrders(),
      api.listStores({ include_unlisted: true }),
      api.listDrivers(),
      api.getSettings(),
    ]);
    setAnalytics(an);
    setOrders(ord.orders);
    setStores(st.stores);
    setDrivers(drv.drivers);
    setSettings(set);
  }, []);

  useEffect(() => {
    void refreshAll();
    const timer = window.setInterval(() => {
      void refreshAll();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshAll]);

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      notify('Cloudflare D1 のデモデータを初期状態へリセットしました', 'success');
      await refreshAll();
    } catch {
      notify('リセットに失敗しました', 'error');
    }
  };

  const openInspect = (o: Order) => {
    setInspectOrder(o);
    setOverrideStatus(o.status);
    setOverrideDriverId(o.driver_id || '');
  };

  const handleAdminOrderUpdate = async () => {
    if (!inspectOrder) return;
    try {
      await api.adminUpdateOrder(inspectOrder.id, {
        status: overrideStatus,
        driver_id: overrideDriverId || null,
      });
      notify(`注文 ${inspectOrder.id} を更新しました`, 'success');
      setInspectOrder(null);
      await refreshAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : '更新に失敗しました', 'error');
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stName.trim() || !stAddr.trim()) return;
    try {
      await api.createStore({
        name: stName.trim(),
        category: stCat,
        area: stArea,
        address: stAddr.trim(),
        is_partner: stPartner,
        takeout_notes: stNotes.trim(),
        description: stPartner ? '公式提携レストラン' : '非提携店舗（ドライバー店頭持ち帰り代理注文対応）',
      });
      setStName('');
      setStAddr('');
      setStNotes('');
      notify('店舗を登録しました', 'success');
      await refreshAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : '登録に失敗しました', 'error');
    }
  };

  const handleTogglePartner = async (store: Store) => {
    try {
      await api.updateStore(store.id, {
        is_partner: !store.is_partner,
        is_unlisted_request: false,
      });
      notify(
        !store.is_partner
          ? `「${store.name}」を公式提携店舗へ昇格しました！店舗受注アプリに表示されます。`
          : `「${store.name}」を非提携（代理持ち帰り）へ切り替えました`,
        'success'
      );
      await refreshAll();
    } catch {
      notify('切替に失敗しました', 'error');
    }
  };

  const handlePublishUnlisted = async (store: Store) => {
    try {
      await api.updateStore(store.id, { is_unlisted_request: false });
      notify(`「${store.name}」を非提携カタログ店舗として公開しました`, 'success');
      await refreshAll();
    } catch {
      notify('公開に失敗しました', 'error');
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drvName.trim()) return;
    try {
      await api.createDriver({
        name: drvName.trim(),
        phone: drvPhone.trim(),
        vehicle_type: drvVehicle,
        proxy_card_enabled: drvProxyCard,
      });
      setDrvName('');
      notify('ドライバーを登録しました', 'success');
      await refreshAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : '登録に失敗しました', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      notify('手数料・報酬設定を Cloudflare D1 に保存しました', 'success');
      await refreshAll();
    } catch {
      notify('設定の保存に失敗しました', 'error');
    }
  };

  const filteredOrders = orders.filter((o) =>
    orderTypeFilter === 'all' ? true : o.order_type === orderTypeFilter
  );

  const summary = analytics?.summary;
  const totalValidOrders = Math.max(1, (summary?.partner_orders || 0) + (summary?.proxy_orders || 0));
  const partnerPct = Math.round(((summary?.partner_orders || 0) / totalValidOrders) * 100);
  const proxyPct = 100 - partnerPct;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">MachiEats Admin</div>
        <button
          type="button"
          className={`admin-nav-btn ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          <BarChart3 size={16} />
          概要・分析
        </button>
        <button
          type="button"
          className={`admin-nav-btn ${tab === 'orders' ? 'active' : ''}`}
          onClick={() => setTab('orders')}
        >
          <ClipboardList size={16} />
          ライブ注文監視 ({orders.length})
        </button>
        <button
          type="button"
          className={`admin-nav-btn ${tab === 'stores' ? 'active' : ''}`}
          onClick={() => setTab('stores')}
        >
          <StoreIcon size={16} />
          店舗・提携管理 ({stores.length})
        </button>
        <button
          type="button"
          className={`admin-nav-btn ${tab === 'drivers' ? 'active' : ''}`}
          onClick={() => setTab('drivers')}
        >
          <Bike size={16} />
          ドライバー管理 ({drivers.length})
        </button>
        <button
          type="button"
          className={`admin-nav-btn ${tab === 'settings' ? 'active' : ''}`}
          onClick={() => setTab('settings')}
        >
          <Sliders size={16} />
          手数料・報酬設定
        </button>

        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <button type="button" className="btn btn-outline btn-sm btn-block" onClick={() => void handleResetDemo()}>
            <RotateCcw size={14} />
            デモデータを初期化
          </button>
        </div>
      </aside>

      <main className="admin-content animate-fade">
        <div className="admin-page-head">
          <h1>
            {tab === 'overview' && 'プラットフォーム運営サマリー'}
            {tab === 'orders' && 'ライブ注文モニター・レシート監査'}
            {tab === 'stores' && '店舗カタログ・提携昇格管理'}
            {tab === 'drivers' && 'ドライバー・代理決済カード管理'}
            {tab === 'settings' && 'プラットフォーム手数料・報酬設定'}
          </h1>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void refreshAll()}>
            <RefreshCw size={14} />
            最新データ取得
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && summary && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">総流通額（GMV）</div>
                <div className="kpi-value tabular-nums">{formatYen(summary.total_gmv)}</div>
                <div className="kpi-sub">
                  提携 {formatYen(summary.partner_gmv)} ／ 代理 {formatYen(summary.proxy_gmv)}
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">稼働中 / 総注文数</div>
                <div className="kpi-value tabular-nums">
                  {summary.active_orders} <span style={{ fontSize: 15, color: 'var(--ink-muted)' }}>/ {summary.total_orders} 件</span>
                </div>
                <div className="kpi-sub">
                  完了 {summary.completed_orders} ・ キャンセル {summary.cancelled_orders}
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">掲載店舗（提携 / 非提携）</div>
                <div className="kpi-value tabular-nums">
                  {summary.partner_stores} / {summary.non_partner_stores}
                </div>
                <div className="kpi-sub">未掲載リクエスト店: {summary.unlisted_stores} 件</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">稼働ドライバー / 代理決済可</div>
                <div className="kpi-value tabular-nums">
                  {summary.online_drivers} / {summary.total_drivers} 名
                </div>
                <div className="kpi-sub">代理カード保有: {summary.proxy_capable_drivers} 名</div>
              </div>
            </div>

            <div className="admin-split">
              <div className="admin-card">
                <h2>公式提携 vs 非提携（店頭代理注文）の内訳</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  <span style={{ color: 'var(--brand-green)' }}>
                    公式提携注文：{summary.partner_orders}件（{partnerPct}%）
                  </span>
                  <span style={{ color: 'var(--proxy-amber)' }}>
                    店頭代理注文：{summary.proxy_orders}件（{proxyPct}%）
                  </span>
                </div>
                <div className="bar-track" style={{ marginBottom: 18 }}>
                  <div className="bar-fill-green" style={{ width: `${partnerPct}%` }} />
                  <div className="bar-fill-amber" style={{ width: `${proxyPct}%` }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-canvas)' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>店舗手数料収益</div>
                    <div className="tabular-nums" style={{ fontWeight: 800, fontSize: 17 }}>
                      {formatYen(summary.commission_revenue)}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-canvas)' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>配達・代理・サービス料</div>
                    <div className="tabular-nums" style={{ fontWeight: 800, fontSize: 17 }}>
                      {formatYen(summary.fee_revenue)}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--brand-green-soft)' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--brand-green)' }}>運営純収益（推定）</div>
                    <div className="tabular-nums" style={{ fontWeight: 800, fontSize: 17, color: 'var(--brand-green)' }}>
                      {formatYen(summary.net_platform_revenue)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-card">
                <h2>リアルタイム稼働ログ</h2>
                <div className="timeline-list" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {(analytics?.recent_events || []).slice(0, 10).map((ev) => (
                    <div key={ev.id} className="timeline-item">
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        [{ev.order_id}] {ev.message}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                        {ev.store_name} ・ {ev.actor_name} ・ {formatTime(ev.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div className="segmented">
                <button
                  type="button"
                  className={`segmented-btn ${orderTypeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setOrderTypeFilter('all')}
                >
                  すべて ({orders.length})
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${orderTypeFilter === 'partner' ? 'active' : ''}`}
                  onClick={() => setOrderTypeFilter('partner')}
                >
                  公式提携 ({orders.filter((o) => o.order_type === 'partner').length})
                </button>
                <button
                  type="button"
                  className={`segmented-btn seg-proxy ${orderTypeFilter === 'proxy_takeout' ? 'active' : ''}`}
                  onClick={() => setOrderTypeFilter('proxy_takeout')}
                >
                  非提携・代理持ち帰り ({orders.filter((o) => o.order_type === 'proxy_takeout').length})
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>注文ID</th>
                    <th>種別</th>
                    <th>店舗 / お客様</th>
                    <th>ステータス</th>
                    <th>担当ドライバー</th>
                    <th>金額（目安 / 実費）</th>
                    <th>レシート</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="tabular-nums">
                        <strong>{o.id}</strong>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{formatTime(o.created_at)}</div>
                      </td>
                      <td>
                        <OrderTypeBadge isPartner={o.store_is_partner} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{o.store_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{o.customer_name}様</div>
                      </td>
                      <td>
                        <StatusBadge status={o.status} orderType={o.order_type} />
                      </td>
                      <td>{o.driver_name || <span style={{ color: 'var(--ink-muted)' }}>未割当</span>}</td>
                      <td className="tabular-nums">
                        <strong>{formatYen(o.total_amount)}</strong>
                        {o.order_type === 'proxy_takeout' && (
                          <div style={{ fontSize: 11.5, color: o.price_diff !== 0 ? 'var(--proxy-amber)' : 'var(--ink-muted)' }}>
                            {o.actual_subtotal !== null
                              ? `実費 ${formatYen(o.actual_subtotal)} (差額 ${o.price_diff >= 0 ? '+' : ''}${o.price_diff})`
                              : `目安 ${formatYen(o.estimated_subtotal)}`}
                          </div>
                        )}
                      </td>
                      <td>
                        {o.receipt_image_url ? (
                          <a href={o.receipt_image_url} target="_blank" rel="noreferrer" className="badge badge-partner">
                            <Receipt size={12} />
                            KV画像あり
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => openInspect(o)}>
                          詳細・介入
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STORES TAB */}
        {tab === 'stores' && (
          <>
            <form onSubmit={handleCreateStore} className="admin-card">
              <h2>新規店舗を登録（提携 / 非提携・代理持ち帰り）</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.7fr 1.3fr', gap: 10, marginBottom: 10 }}>
                <input
                  className="input"
                  required
                  placeholder="店舗名"
                  value={stName}
                  onChange={(e) => setStName(e.target.value)}
                />
                <input className="input" placeholder="ジャンル" value={stCat} onChange={(e) => setStCat(e.target.value)} />
                <input className="input" placeholder="エリア" value={stArea} onChange={(e) => setStArea(e.target.value)} />
                <input
                  className="input"
                  required
                  placeholder="住所"
                  value={stAddr}
                  onChange={(e) => setStAddr(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700 }}>
                  <input type="checkbox" checked={stPartner} onChange={(e) => setStPartner(e.target.checked)} />
                  公式提携店舗として登録（OFFの場合は非提携・店頭代理注文）
                </label>
                {!stPartner && (
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 240 }}
                    placeholder="ドライバー向け店頭テイクアウト注文メモ"
                    value={stNotes}
                    onChange={(e) => setStNotes(e.target.value)}
                  />
                )}
                <button type="submit" className="btn btn-primary btn-sm">
                  <Plus size={14} />
                  店舗を登録
                </button>
              </div>
            </form>

            <div className="admin-card">
              <h2>登録店舗一覧（未掲載リクエスト含む）</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>店舗名 / 住所</th>
                      <th>種別</th>
                      <th>ステータス</th>
                      <th>評価 / 注文数</th>
                      <th>管理アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                            {s.area}・{s.category}・{s.address}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <OrderTypeBadge isPartner={s.is_partner} />
                            {s.is_unlisted_request && <span className="badge badge-warn">ユーザー自由リクエスト</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${s.is_open ? 'badge-partner' : 'badge-danger'}`}>
                            {s.is_open ? '営業中' : '停止中'}
                          </span>
                        </td>
                        <td className="tabular-nums">
                          ★{s.rating.toFixed(1)} ／ {s.total_orders ?? 0}件
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {s.is_unlisted_request && (
                              <button
                                type="button"
                                className="btn btn-proxy btn-sm"
                                onClick={() => void handlePublishUnlisted(s)}
                              >
                                カタログ公開
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => void handleTogglePartner(s)}
                            >
                              <ArrowUpRight size={13} />
                              {s.is_partner ? '非提携へ変更' : '公式提携へ昇格'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* DRIVERS TAB */}
        {tab === 'drivers' && (
          <>
            <form onSubmit={handleCreateDriver} className="admin-card">
              <h2>新規ドライバーを追加</h2>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="input"
                  style={{ maxWidth: 200 }}
                  required
                  placeholder="氏名"
                  value={drvName}
                  onChange={(e) => setDrvName(e.target.value)}
                />
                <input
                  className="input"
                  style={{ maxWidth: 160 }}
                  placeholder="電話番号"
                  value={drvPhone}
                  onChange={(e) => setDrvPhone(e.target.value)}
                />
                <select
                  className="select"
                  style={{ maxWidth: 180 }}
                  value={drvVehicle}
                  onChange={(e) => setDrvVehicle(e.target.value as Driver['vehicle_type'])}
                >
                  <option value="ebike">電動アシスト自転車</option>
                  <option value="scooter">原付・バイク</option>
                  <option value="bicycle">自転車</option>
                  <option value="car">軽貨物・車</option>
                </select>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={drvProxyCard}
                    onChange={(e) => setDrvProxyCard(e.target.checked)}
                  />
                  代理決済カード発行
                </label>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Plus size={14} />
                  ドライバー登録
                </button>
              </div>
            </form>

            <div className="admin-card">
              <h2>登録ドライバー一覧</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ドライバー名</th>
                      <th>車両</th>
                      <th>稼働状態</th>
                      <th>代理決済カード</th>
                      <th>実績・報酬</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{d.phone}</div>
                        </td>
                        <td>{vehicleLabel(d.vehicle_type)}</td>
                        <td>
                          <span className={`badge ${d.is_online ? 'badge-partner' : 'badge-neutral'}`}>
                            {d.is_online ? 'オンライン' : 'オフライン'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${d.proxy_card_enabled ? 'badge-proxy' : 'badge-neutral'}`}>
                            <CreditCard size={12} />
                            {d.proxy_card_enabled ? '店頭代理決済 OK' : '無効'}
                          </span>
                        </td>
                        <td className="tabular-nums">
                          {d.completed_deliveries}件 ／ <strong>{formatYen(d.total_earnings)}</strong>（★{d.rating.toFixed(2)}）
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={async () => {
                              await api.updateDriver(d.id, { proxy_card_enabled: !d.proxy_card_enabled });
                              notify(`${d.name}の代理決済カード設定を更新しました`, 'success');
                              await refreshAll();
                            }}
                          >
                            {d.proxy_card_enabled ? '代理カード停止' : '代理カード有効化'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && settings && (
          <form onSubmit={handleSaveSettings} className="admin-card">
            <h2>手数料・ドライバー報酬ルール（Cloudflare D1 永続化）</h2>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--ink-secondary)' }}>
              ここで変更した料金は即座にエンドユーザー注文アプリのカート計算およびドライバー報酬へ反映されます。
            </p>
            <div className="settings-grid">
              <div className="field">
                <label className="field-label">基本配達料（円）</label>
                <input
                  type="number"
                  className="input tabular-nums"
                  value={settings.base_delivery_fee}
                  onChange={(e) => setSettings({ ...settings, base_delivery_fee: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label className="field-label">非提携・店頭代理注文手数料（円）</label>
                <input
                  type="number"
                  className="input tabular-nums"
                  value={settings.proxy_order_fee}
                  onChange={(e) => setSettings({ ...settings, proxy_order_fee: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label className="field-label">ユーザーサービス料率（例: 0.10 = 10%）</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.5"
                  className="input tabular-nums"
                  value={settings.service_fee_rate}
                  onChange={(e) => setSettings({ ...settings, service_fee_rate: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label className="field-label">公式提携店舗 手数料率（例: 0.25 = 25%）</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.5"
                  className="input tabular-nums"
                  value={settings.merchant_commission_rate}
                  onChange={(e) => setSettings({ ...settings, merchant_commission_rate: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label className="field-label">ドライバー基本配達報酬（円）</label>
                <input
                  type="number"
                  className="input tabular-nums"
                  value={settings.driver_base_payout}
                  onChange={(e) => setSettings({ ...settings, driver_base_payout: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label className="field-label">ドライバー店頭代理注文ボーナス（円）</label>
                <input
                  type="number"
                  className="input tabular-nums"
                  value={settings.driver_proxy_bonus}
                  onChange={(e) => setSettings({ ...settings, driver_proxy_bonus: Number(e.target.value) })}
                />
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <button type="submit" className="btn btn-primary btn-lg">
                設定を Cloudflare D1 に保存
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Admin Order Inspection & Override Modal */}
      {inspectOrder && (
        <div className="overlay" onClick={() => setInspectOrder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>注文詳細・運営介入：{inspectOrder.id}</h2>
              <button type="button" className="icon-btn" onClick={() => setInspectOrder(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <OrderTypeBadge isPartner={inspectOrder.store_is_partner} />
                <StatusBadge status={inspectOrder.status} orderType={inspectOrder.order_type} />
              </div>

              <div style={{ fontSize: 13.5 }}>
                <strong>店舗：</strong>
                {inspectOrder.store_name}（{inspectOrder.store_address}）
                <br />
                <strong>お客様：</strong>
                {inspectOrder.customer_name} ／ {inspectOrder.delivery_address}
              </div>

              {inspectOrder.receipt_image_url && (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                    店頭代理購入レシート（Cloudflare KV 保存）
                  </div>
                  <img
                    src={inspectOrder.receipt_image_url}
                    alt="レシート"
                    className="receipt-preview-img"
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">ステータス強制変更</label>
                  <select
                    className="select"
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)}
                  >
                    {[
                      'placed',
                      'preparing',
                      'ready_for_pickup',
                      'driver_heading_to_store',
                      'proxy_ordering',
                      'proxy_waiting',
                      'delivering',
                      'delivered',
                      'cancelled',
                    ].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">手動ドライバー割当</label>
                  <select
                    className="select"
                    value={overrideDriverId}
                    onChange={(e) => setOverrideDriverId(e.target.value)}
                  >
                    <option value="">（未割当）</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}（{d.proxy_card_enabled ? '代理OK' : '通常'}）
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setInspectOrder(null)}>
                閉じる
              </button>
              <button type="button" className="btn btn-dark" onClick={() => void handleAdminOrderUpdate()}>
                変更を適用する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
