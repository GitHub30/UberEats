import React, { useCallback, useEffect, useState } from 'react';
import {
  Store as StoreIcon,
  Bell,
  ChefHat,
  PackageCheck,
  UtensilsCrossed,
  Plus,
  Power,
  Flame,
  RefreshCw,
  XCircle,
  Trash2,
} from 'lucide-react';
import { api, formatTime, formatYen } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import type { MenuItem, Order, Store } from '../../types';

export function MerchantApp() {
  const { notify } = useToast();
  const [partnerStores, setPartnerStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('store-wagyu-burger');
  const [storeDetail, setStoreDetail] = useState<Store | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'board' | 'menu'>('board');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add menu item form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('1200');
  const [newCat, setNewCat] = useState('メイン');

  const refreshAll = useCallback(async (storeId: string) => {
    const [storesRes, detailRes, ordersRes] = await Promise.all([
      api.listStores({ partner: '1' }),
      api.getStore(storeId).catch(() => null),
      api.listOrders({ store_id: storeId }),
    ]);
    setPartnerStores(storesRes.stores);
    if (detailRes) {
      setStoreDetail(detailRes.store);
      setMenu(detailRes.menu);
    } else if (storesRes.stores.length > 0 && storesRes.stores[0].id !== storeId) {
      setSelectedStoreId(storesRes.stores[0].id);
    }
    setOrders(ordersRes.orders);
  }, []);

  useEffect(() => {
    refreshAll(selectedStoreId).catch(() => {});
    const timer = window.setInterval(() => {
      if (document.hidden || !navigator.onLine) return;
      refreshAll(selectedStoreId).catch(() => {});
    }, 3500);
    return () => window.clearInterval(timer);
  }, [selectedStoreId, refreshAll]);

  const incoming = orders.filter((o) => o.status === 'placed');
  const preparing = orders.filter((o) => o.status === 'preparing');
  const readyOrOut = orders.filter((o) => ['ready_for_pickup', 'delivering'].includes(o.status));
  const completedToday = orders.filter((o) => o.status === 'delivered');
  const todaySales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.actual_subtotal ?? o.estimated_subtotal), 0);

  const handleAccept = async (order: Order, prepMin: number) => {
    setBusyId(order.id);
    try {
      await api.merchantAccept(order.id, prepMin);
      notify(`注文 ${order.order_code} を受注しました（調理目安 ${prepMin}分・ドライバー手配中）`, 'success');
      await refreshAll(selectedStoreId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '受注に失敗しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReady = async (order: Order) => {
    setBusyId(order.id);
    try {
      await api.merchantReady(order.id);
      notify(`注文 ${order.order_code} を受け渡し準備OKにしました`, 'success');
      await refreshAll(selectedStoreId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '更新に失敗しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (order: Order) => {
    setBusyId(order.id);
    try {
      await api.merchantReject(order.id, '現在キッチン大変混雑または一部食材品切れのため');
      notify(`注文 ${order.order_code} をキャンセルしました`, 'info');
      await refreshAll(selectedStoreId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '拒否処理に失敗しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStoreFlag = async (field: 'is_open' | 'busy_mode') => {
    if (!storeDetail) return;
    try {
      await api.updateStore(storeDetail.id, { [field]: !storeDetail[field] });
      await refreshAll(selectedStoreId);
      notify('店舗ステータスを更新しました（注文アプリへ即時反映）', 'success');
    } catch {
      notify('更新に失敗しました', 'error');
    }
  };

  const handleToggleMenuAvailability = async (item: MenuItem) => {
    try {
      await api.updateMenuItem(item.id, { is_available: !item.is_available });
      await refreshAll(selectedStoreId);
      notify(item.is_available ? `「${item.name}」を売り切れにしました` : `「${item.name}」を販売再開しました`, 'info');
    } catch {
      notify('在庫更新に失敗しました', 'error');
    }
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !storeDetail) return;
    try {
      await api.addMenuItem(storeDetail.id, {
        name: newName.trim(),
        description: newDesc.trim(),
        price: Number(newPrice || 1000),
        category: newCat.trim() || 'メイン',
      });
      setNewName('');
      setNewDesc('');
      notify('新メニューを追加しました', 'success');
      await refreshAll(selectedStoreId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '追加に失敗しました', 'error');
    }
  };

  const handleDeleteMenu = async (item: MenuItem) => {
    try {
      await api.deleteMenuItem(item.id);
      notify(`「${item.name}」を削除しました`, 'info');
      await refreshAll(selectedStoreId);
    } catch {
      notify('削除に失敗しました', 'error');
    }
  };

  return (
    <main className="merchant-shell">
      <div className="merchant-container animate-fade">
        <div className="merchant-header" role="region" aria-label="店舗操作ヘッダー">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#fef3c7',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StoreIcon size={22} aria-hidden="true" />
            </div>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--ink-primary)' }}>
                公式提携店舗 受注タブレット POS
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label htmlFor="merchant-store-selector" className="sr-only">
                  操作する提携店舗を選択
                </label>
                <select
                  id="merchant-store-selector"
                  className="select"
                  style={{ width: 'auto', fontWeight: 800, padding: '6px 12px' }}
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                >
                  {partnerStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}（{s.area}）
                    </option>
                  ))}
                </select>
                <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  本日売上: <strong>{formatYen(todaySales)}</strong>（完了 {completedToday.length}件）
                </span>
              </div>
            </div>
          </div>

          <div className="merchant-controls">
            {storeDetail && (
              <>
                <button
                  type="button"
                  className={`btn btn-sm ${storeDetail.is_open ? 'btn-primary' : 'btn-danger'}`}
                  onClick={() => void handleToggleStoreFlag('is_open')}
                >
                  <Power size={14} aria-hidden="true" />
                  {storeDetail.is_open ? '営業中（受付ON）' : '準備中（停止中）'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${storeDetail.busy_mode ? 'btn-proxy' : 'btn-outline'}`}
                  onClick={() => void handleToggleStoreFlag('busy_mode')}
                >
                  <Flame size={14} aria-hidden="true" />
                  {storeDetail.busy_mode ? '混雑モードON' : '通常混雑度'}
                </button>
              </>
            )}

            <div className="segmented" role="group" aria-label="画面切替">
              <button
                type="button"
                aria-pressed={tab === 'board'}
                className={`segmented-btn ${tab === 'board' ? 'active' : ''}`}
                onClick={() => setTab('board')}
              >
                受注ボード ({incoming.length + preparing.length + readyOrOut.length})
              </button>
              <button
                type="button"
                aria-pressed={tab === 'menu'}
                className={`segmented-btn ${tab === 'menu' ? 'active' : ''}`}
                onClick={() => setTab('menu')}
              >
                メニュー・売り切れ ({menu.length})
              </button>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              aria-label="注文一覧を最新に更新"
              onClick={() => void refreshAll(selectedStoreId)}
            >
              <RefreshCw size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          style={{
            fontSize: 12.5,
            color: 'var(--ink-secondary)',
            background: '#ffffff',
            border: '1px solid var(--pos-border)',
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          ※この画面は<strong>公式提携店舗</strong>の受注タブレットです。非提携店舗（町中華 龍鳳軒、麺屋 篝火など）への注文は店舗タブレットを経由せず、ドライバーアプリへ直接「店頭代理注文」として配信されます。
        </div>

        {tab === 'board' ? (
          <div className="pos-board">
            {/* Column 1: Incoming */}
            <section className="pos-column">
              <div className="pos-col-head">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Bell size={16} color="#c42b2b" />
                  新規注文（承認待ち）
                </h2>
                <span className={`pos-count ${incoming.length > 0 ? 'incoming' : ''}`}>{incoming.length}</span>
              </div>

              {incoming.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)' }}>
                  新規注文はありません
                </div>
              ) : (
                incoming.map((o) => (
                  <article key={o.id} className="pos-ticket urgent">
                    <div className="pos-ticket-top">
                      <span className="pos-order-code tabular-nums">#{o.order_code}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{formatTime(o.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                      お客様：{o.customer_name}様 ・ <span className="tabular-nums">{formatYen(o.estimated_subtotal)}</span>
                    </div>
                    <ul className="pos-items">
                      {o.items.map((it, idx) => (
                        <li key={idx}>
                          <div style={{ fontWeight: 800 }}>
                            {it.name} ×{it.quantity}
                          </div>
                          {it.selected_options && it.selected_options.length > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                              {it.selected_options.join(' / ')}
                            </div>
                          )}
                          {it.note && <div style={{ fontSize: 12, color: 'var(--proxy-amber)' }}>要望: {it.note}</div>}
                        </li>
                      ))}
                    </ul>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-muted)', marginBottom: 6 }}>
                        調理時間を選んで受注する：
                      </div>
                      <div className="prep-time-row">
                        {[10, 15, 25, 35].map((min) => (
                          <button
                            key={min}
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1 }}
                            disabled={busyId === o.id}
                            onClick={() => void handleAccept(o, min)}
                          >
                            {min}分で受注
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--status-danger)' }}
                      disabled={busyId === o.id}
                      onClick={() => void handleReject(o)}
                    >
                      <XCircle size={14} />
                      受注を辞退（キャンセル）
                    </button>
                  </article>
                ))
              )}
            </section>

            {/* Column 2: Preparing */}
            <section className="pos-column">
              <div className="pos-col-head">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <ChefHat size={16} color="#1d63b8" />
                  調理中
                </h2>
                <span className="pos-count">{preparing.length}</span>
              </div>

              {preparing.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)' }}>
                  調理中の注文はありません
                </div>
              ) : (
                preparing.map((o) => (
                  <article key={o.id} className="pos-ticket">
                    <div className="pos-ticket-top">
                      <span className="pos-order-code tabular-nums">#{o.order_code}</span>
                      <span className="badge badge-info">目安 {o.estimated_prep_min || 15}分</span>
                    </div>
                    <div style={{ fontSize: 12.5 }}>
                      ドライバー：<strong>{o.driver_name || 'ドライバー手配中...'}</strong>
                    </div>
                    <ul className="pos-items">
                      {o.items.map((it, idx) => (
                        <li key={idx}>
                          <strong>
                            {it.name} ×{it.quantity}
                          </strong>
                          {it.note && <div style={{ fontSize: 12, color: 'var(--proxy-amber)' }}>要望: {it.note}</div>}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      disabled={busyId === o.id}
                      onClick={() => void handleReady(o)}
                    >
                      <PackageCheck size={16} />
                      調理完了・受け渡し準備OK
                    </button>
                  </article>
                ))
              )}
            </section>

            {/* Column 3: Ready for Pickup & Out */}
            <section className="pos-column">
              <div className="pos-col-head">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <PackageCheck size={16} color="#068449" />
                  受け渡し待ち・配達中
                </h2>
                <span className="pos-count">{readyOrOut.length}</span>
              </div>

              {readyOrOut.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)' }}>
                  受け渡し待ちの注文はありません
                </div>
              ) : (
                readyOrOut.map((o) => (
                  <article key={o.id} className="pos-ticket">
                    <div className="pos-ticket-top">
                      <span className="pos-order-code tabular-nums">#{o.order_code}</span>
                      <StatusBadge status={o.status} orderType={o.order_type} />
                    </div>
                    <div style={{ fontSize: 13 }}>
                      担当ドライバー：<strong>{o.driver_name || '割当待ち'}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      {o.items.map((it) => `${it.name}×${it.quantity}`).join('、')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
                      {o.status === 'ready_for_pickup'
                        ? 'カウンターでドライバーへ受取コードを確認のうえお渡しください。'
                        : 'ドライバーが配達中です。'}
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <form
              onSubmit={handleAddMenu}
              className="admin-card"
              style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UtensilsCrossed size={17} />
                新メニューを追加
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.6fr 1.4fr auto', gap: 10 }}>
                <input
                  className="input"
                  required
                  placeholder="商品名（例：期間限定トリュフバーガー）"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min={100}
                  step={10}
                  required
                  placeholder="価格(円)"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="カテゴリ"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="説明文"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  <Plus size={15} />
                  追加
                </button>
              </div>
            </form>

            <div className="merchant-menu-grid">
              {menu.map((item) => (
                <div key={item.id} className="merchant-menu-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{item.category}</div>
                    </div>
                    <span className="tabular-nums" style={{ fontWeight: 800, fontSize: 16 }}>
                      {formatYen(item.price)}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-secondary)' }}>{item.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${item.is_available ? 'btn-primary' : 'btn-danger'}`}
                      onClick={() => void handleToggleMenuAvailability(item)}
                    >
                      {item.is_available ? '販売中（タップで売り切れ）' : '売り切れ中（タップで再開）'}
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => void handleDeleteMenu(item)}
                      aria-label="削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
