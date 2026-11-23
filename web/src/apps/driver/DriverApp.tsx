import React, { useCallback, useEffect, useState } from 'react';
import {
  Bike,
  CreditCard,
  MapPin,
  Navigation,
  Receipt,
  CheckCircle2,
  Camera,
  RefreshCw,
  Power,
  AlertTriangle,
  Sparkles,
  PackageCheck,
  Download,
  Banknote,
} from 'lucide-react';
import {
  api,
  compressImageFile,
  formatTime,
  formatYen,
  generateReceiptDataUrl,
} from '../../api/client';
import { DeliveryMap } from '../../components/DeliveryMap';
import { OrderChat } from '../../components/OrderChat';
import { PaymentBadge } from '../../components/PaymentBadge';
import { StatusBadge, substitutionLabel, vehicleLabel } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import type { Driver, DriverStorePaymentMethod, Order, OrderMessage } from '../../types';

const STORE_PAY_OPTIONS: Array<{ value: DriverStorePaymentMethod; label: string; receiptLabel: string }> = [
  { value: 'proxy_card', label: 'MachiEats 代理カード', receiptLabel: 'MachiEats 代理決済カード（済）' },
  { value: 'cash', label: '現金立替（券売機・現金のみ店）', receiptLabel: '現金立替払い（領収済）' },
  { value: 'paypay', label: 'PayPay 店頭決済', receiptLabel: 'PayPay 店頭決済（済）' },
  { value: 'suica', label: 'モバイルSuica / 交通系IC', receiptLabel: 'Suica / 交通系IC 決済（済）' },
];

export interface DriverAppProps {
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
}

export function DriverApp({ canInstallPwa = false, onInstallPwa }: DriverAppProps = {}) {
  const { notify } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('drv-tanaka');
  const [availableJobs, setAvailableJobs] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeMessages, setActiveMessages] = useState<Record<string, OrderMessage[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Proxy purchase & COD cash confirmation state keyed by order id
  const [actualPriceMap, setActualPriceMap] = useState<Record<string, string>>({});
  const [receiptUrlMap, setReceiptUrlMap] = useState<Record<string, string>>({});
  const [receiptNoteMap, setReceiptNoteMap] = useState<Record<string, string>>({});
  const [storePayMap, setStorePayMap] = useState<Record<string, DriverStorePaymentMethod>>({});
  const [cashConfirmedMap, setCashConfirmedMap] = useState<Record<string, boolean>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const currentDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0] || null;

  const refreshData = useCallback(async (driverId: string) => {
    const [drvRes, availRes, mineRes] = await Promise.all([
      api.listDrivers(),
      api.listOrders({ available_for_driver: true }),
      api.listOrders({ driver_id: driverId }),
    ]);
    setDrivers(drvRes.drivers);
    setAvailableJobs(availRes.orders);
    setMyOrders(mineRes.orders);

    // Fetch messages for active missions
    const activeMissions = mineRes.orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
    if (activeMissions.length > 0) {
      const entries = await Promise.all(
        activeMissions.map(async (o) => {
          const mRes = await api.listMessages(o.id);
          return [o.id, mRes.messages] as const;
        })
      );
      setActiveMessages(Object.fromEntries(entries));
    }
  }, []);

  useEffect(() => {
    refreshData(selectedDriverId).catch(() => {});
    const timer = window.setInterval(() => {
      if (document.hidden || !navigator.onLine) return;
      refreshData(selectedDriverId).catch(() => {});
    }, 3500);
    return () => window.clearInterval(timer);
  }, [selectedDriverId, refreshData]);

  const activeMissions = myOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const completedMissions = myOrders.filter((o) => o.status === 'delivered');

  const handleToggleOnline = async () => {
    if (!currentDriver) return;
    try {
      await api.updateDriver(currentDriver.id, { is_online: !currentDriver.is_online });
      await refreshData(currentDriver.id);
      notify(currentDriver.is_online ? 'オフラインにしました' : 'オンラインで配達受付を開始しました', 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : '更新に失敗しました', 'error');
    }
  };

  const handleAcceptJob = async (order: Order) => {
    if (!currentDriver) return;
    setBusyId(order.id);
    try {
      await api.driverAccept(order.id, currentDriver.id);
      notify(
        order.order_type === 'proxy_takeout'
          ? `店頭代理注文（${order.store_name}）を受諾しました！店舗へ向かってください。`
          : `配達（${order.store_name}）を受諾しました！`,
        'success'
      );
      await refreshData(currentDriver.id);
    } catch (err) {
      notify(err instanceof Error ? err.message : '受諾に失敗しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleProxyStartOrdering = async (order: Order) => {
    setBusyId(order.id);
    try {
      await api.proxyStartOrdering(order.id, selectedDriverId);
      setActualPriceMap((prev) => ({ ...prev, [order.id]: String(order.estimated_subtotal) }));
      notify('店舗到着を記録しました。持ち帰り注文を行ってください。', 'success');
      await refreshData(selectedDriverId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '更新に失敗しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReceiptFileChange = async (order: Order, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(order.id);
    try {
      const dataUrl = await compressImageFile(file);
      const uploaded = await api.uploadMedia(dataUrl);
      setReceiptUrlMap((prev) => ({ ...prev, [order.id]: uploaded.url }));
      notify('レシート写真をCloudflare KVへ保存しました', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'アップロードに失敗しました', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const handleGenerateDemoReceipt = async (order: Order) => {
    setUploadingId(order.id);
    try {
      const price = Math.max(0, Math.round(Number(actualPriceMap[order.id] ?? order.estimated_subtotal)));
      const storePay = storePayMap[order.id] || 'proxy_card';
      const opt = STORE_PAY_OPTIONS.find((o) => o.value === storePay) || STORE_PAY_OPTIONS[0];
      const dataUrl = generateReceiptDataUrl(order, price, opt.receiptLabel);
      const uploaded = await api.uploadMedia(dataUrl);
      setReceiptUrlMap((prev) => ({ ...prev, [order.id]: uploaded.url }));
      notify('テスト用レシート写真を撮影し Cloudflare KV へ保存しました', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'レシート生成に失敗しました', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const handleProxyConfirmPurchase = async (order: Order) => {
    setBusyId(order.id);
    try {
      const price = Math.max(0, Math.round(Number(actualPriceMap[order.id] ?? order.estimated_subtotal)));
      const storePay = storePayMap[order.id] || 'proxy_card';
      const opt = STORE_PAY_OPTIONS.find((o) => o.value === storePay) || STORE_PAY_OPTIONS[0];
      let receiptUrl = receiptUrlMap[order.id];
      if (!receiptUrl) {
        const dataUrl = generateReceiptDataUrl(order, price, opt.receiptLabel);
        const uploaded = await api.uploadMedia(dataUrl);
        receiptUrl = uploaded.url;
        setReceiptUrlMap((prev) => ({ ...prev, [order.id]: receiptUrl }));
      }
      await api.proxyConfirmPurchase(order.id, {
        actual_subtotal: price,
        receipt_image_url: receiptUrl,
        receipt_note: receiptNoteMap[order.id] || `店頭テイクアウト注文・${opt.label}決済完了`,
        driver_id: selectedDriverId,
        driver_store_payment_method: storePay,
      });
      notify(`実費 ${formatYen(price)}（${opt.label}）とレシートを登録しました！`, 'success');
      await refreshData(selectedDriverId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '登録に失敗しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handlePickup = async (order: Order) => {
    setBusyId(order.id);
    try {
      await api.driverPickup(order.id, selectedDriverId);
      notify('商品を受け取りました！お届け先へ配達を開始します。', 'success');
      await refreshData(selectedDriverId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '受取処理に失敗しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveCloserGps = async (order: Order) => {
    if (!currentDriver) return;
    const targetLat = order.status === 'delivering' ? order.delivery_lat : order.store_lat;
    const targetLng = order.status === 'delivering' ? order.delivery_lng : order.store_lng;
    const nextLat = currentDriver.current_lat + (targetLat - currentDriver.current_lat) * 0.55;
    const nextLng = currentDriver.current_lng + (targetLng - currentDriver.current_lng) * 0.55;
    try {
      await api.updateDriver(currentDriver.id, { current_lat: nextLat, current_lng: nextLng });
      notify('GPS現在地を更新しました（お客様のマップに反映されます）', 'info');
      await refreshData(selectedDriverId);
    } catch {
      notify('GPS更新に失敗しました', 'error');
    }
  };

  const handleDeliver = async (order: Order) => {
    if (order.payment_method === 'cash' && !cashConfirmedMap[order.id]) {
      notify(`先に現金 ${formatYen(order.total_amount)} の受領確認にチェックを入れてください`, 'error');
      return;
    }
    setBusyId(order.id);
    try {
      await api.driverDeliver(order.id, undefined, selectedDriverId);
      notify(
        order.payment_method === 'cash'
          ? `現金 ${formatYen(order.total_amount)} 回収＆配達完了！報酬 ${formatYen(order.driver_payout)} 確定`
          : `配達完了！報酬 ${formatYen(order.driver_payout)} が確定しました。`,
        'success'
      );
      await refreshData(selectedDriverId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '完了処理に失敗しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="driver-shell">
      <div className="driver-container animate-fade">
        {/* Driver Top Bar */}
        <div className="driver-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(16,185,129,0.16)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bike size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--drv-muted)', fontWeight: 700 }}>
                MACHIEATS DRIVER CONSOLE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                <select
                  id="driver-selector"
                  className="driver-select"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}（{vehicleLabel(d.vehicle_type)} / {d.proxy_card_enabled ? '代理決済OK' : '通常配達のみ'}）
                    </option>
                  ))}
                </select>
                {currentDriver && (
                  <span
                    className="badge"
                    style={{
                      background: currentDriver.proxy_card_enabled ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.08)',
                      color: currentDriver.proxy_card_enabled ? '#fcd34d' : '#9aa4b2',
                    }}
                  >
                    <CreditCard size={12} />
                    {currentDriver.proxy_card_enabled ? '代理決済カード有効' : '代理決済カード無効'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {canInstallPwa && onInstallPwa && (
              <button type="button" className="btn btn-drv-ghost btn-sm" onClick={onInstallPwa}>
                <Download size={14} aria-hidden="true" />
                アプリ追加
              </button>
            )}
            <button
              type="button"
              className="btn btn-drv-ghost btn-sm"
              onClick={() => void refreshData(selectedDriverId)}
            >
              <RefreshCw size={14} />
              更新
            </button>
            {currentDriver && (
              <button
                type="button"
                className={`btn btn-sm ${currentDriver.is_online ? 'btn-drv-emerald' : 'btn-drv-ghost'}`}
                onClick={() => void handleToggleOnline()}
              >
                <Power size={14} />
                {currentDriver.is_online ? 'オンライン稼働中' : 'オフライン（タップで稼働）'}
              </button>
            )}
          </div>
        </div>

        {/* KPI Strip */}
        {currentDriver && (
          <div className="driver-stats-strip">
            <div className="driver-stat-card">
              <div className="driver-stat-label">累計報酬</div>
              <div className="driver-stat-val tabular-nums" style={{ color: '#10b981' }}>
                {formatYen(currentDriver.total_earnings)}
              </div>
            </div>
            <div className="driver-stat-card">
              <div className="driver-stat-label">完了配達数</div>
              <div className="driver-stat-val tabular-nums">{currentDriver.completed_deliveries} 件</div>
            </div>
            <div className="driver-stat-card">
              <div className="driver-stat-label">進行中の配達</div>
              <div className="driver-stat-val tabular-nums">{activeMissions.length} 件</div>
            </div>
            <div className="driver-stat-card">
              <div className="driver-stat-label">ドライバー評価</div>
              <div className="driver-stat-val tabular-nums">★ {currentDriver.rating.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Main 2-column Workspace */}
        <div className="driver-layout">
          {/* LEFT: Active Missions */}
          <section className="driver-panel">
            <h1 className="driver-panel-title">
              <span>進行中の配達・店頭代理ミッション（{activeMissions.length}）</span>
            </h1>

            {activeMissions.length === 0 ? (
              <div
                style={{
                  padding: '44px 20px',
                  textAlign: 'center',
                  color: 'var(--drv-muted)',
                  background: 'rgba(0,0,0,0.18)',
                  borderRadius: 14,
                }}
              >
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--drv-ink)' }}>
                  現在進行中の配達はありません
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                  右側の「新着配達リクエスト」から通常配達または店頭代理注文を受諾してください。
                </p>
              </div>
            ) : (
              activeMissions.map((order) => {
                const isProxy = order.order_type === 'proxy_takeout';
                const priceInput = actualPriceMap[order.id] ?? String(order.actual_subtotal ?? order.estimated_subtotal);
                const previewReceipt = receiptUrlMap[order.id] || order.receipt_image_url;

                return (
                  <div key={order.id} className="driver-mission-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span
                            className="badge"
                            style={{
                              background: isProxy ? 'rgba(245,158,11,0.22)' : 'rgba(16,185,129,0.2)',
                              color: isProxy ? '#fcd34d' : '#6ee7b7',
                            }}
                          >
                            {isProxy ? '店頭代理注文（Order & Pay）' : '公式提携ピックアップ'}
                          </span>
                          <StatusBadge status={order.status} orderType={order.order_type} />
                          <PaymentBadge
                            method={order.payment_method}
                            label={order.payment_label}
                            status={order.payment_status}
                            dark
                          />
                        </div>
                        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{order.store_name}</h2>
                        <div style={{ fontSize: 12.5, color: 'var(--drv-muted)', marginTop: 3 }}>
                          {order.id} ・ 受取コード <strong style={{ color: '#fff' }}>{order.order_code}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--drv-muted)' }}>見込み報酬</div>
                        <div className="driver-payout-big tabular-nums">{formatYen(order.driver_payout)}</div>
                      </div>
                    </div>

                    {order.payment_method === 'cash' && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'rgba(245, 158, 11, 0.16)',
                          border: '1px solid rgba(245, 158, 11, 0.48)',
                          color: '#fde68a',
                          fontSize: 13,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Banknote size={17} aria-hidden="true" />
                        <span>
                          代金引換（現金払い）：お届け先で現金{' '}
                          <strong className="tabular-nums" style={{ color: '#fff', fontSize: 15 }}>
                            {formatYen(order.total_amount)}
                          </strong>{' '}
                          を回収してください（置き配不可・対面手渡し）
                        </span>
                      </div>
                    )}

                    <div className="driver-route-line">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} color={isProxy ? '#f59e0b' : '#10b981'} />
                        <strong>店舗：</strong>
                        <span>{order.store_address}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Navigation size={14} color="#60a5fa" />
                        <strong>お届け先：</strong>
                        <span>
                          {order.delivery_address}（{order.customer_name}様）
                        </span>
                      </div>
                      {order.delivery_note && (
                        <div style={{ fontSize: 12, color: '#fcd34d' }}>配達メモ：{order.delivery_note}</div>
                      )}
                    </div>

                    <DeliveryMap order={order} />

                    {/* Proxy Takeout Detailed Checklist & Receipt Upload */}
                    {isProxy && (
                      <div className="proxy-script-box">
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fcd34d' }}>
                          <Receipt size={15} style={{ verticalAlign: '-2px', marginRight: 5 }} aria-hidden="true" />
                          店頭テイクアウト代理注文リスト（代理カード・現金立替・PayPay・Suica対応）
                        </h3>
                        {order.takeout_notes && (
                          <div style={{ fontSize: 12.5, color: '#fde68a', lineHeight: 1.55 }}>
                            <strong>店舗攻略ヒント：</strong>
                            {order.takeout_notes}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: '#e5e7eb' }}>
                          品切れ時対応：<strong>{substitutionLabel(order.substitution_policy)}</strong> ／ 予算超過許容：
                          <strong>+{formatYen(order.max_budget_overage)}</strong>
                        </div>
                        <ul className="proxy-checklist">
                          {order.items.map((it, i) => (
                            <li key={i}>
                              <div>
                                <strong>
                                  {it.name} ×{it.quantity}
                                </strong>
                                {it.selected_options && it.selected_options.length > 0 && (
                                  <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>
                                    {it.selected_options.join(' / ')}
                                  </div>
                                )}
                                {it.note && (
                                  <div style={{ fontSize: 11.5, color: '#fcd34d' }}>お客様メモ：{it.note}</div>
                                )}
                              </div>
                              <span className="tabular-nums" style={{ fontWeight: 700, color: '#fcd34d' }}>
                                目安 {formatYen(it.unit_price * it.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {order.status === 'proxy_ordering' && (
                          <div
                            style={{
                              marginTop: 8,
                              paddingTop: 12,
                              borderTop: '1px dashed rgba(245,158,11,0.35)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                            }}
                          >
                            <div>
                              <label
                                htmlFor={`store-pay-${order.id}`}
                                style={{ display: 'block', fontSize: 12, color: '#fcd34d', fontWeight: 700, marginBottom: 4 }}
                              >
                                店頭でのお支払い手段（券売機・キャッシュレス対応）
                              </label>
                              <select
                                id={`store-pay-${order.id}`}
                                className="driver-input"
                                value={storePayMap[order.id] || 'proxy_card'}
                                onChange={(e) =>
                                  setStorePayMap((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value as DriverStorePaymentMethod,
                                  }))
                                }
                              >
                                {STORE_PAY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <div>
                                <label
                                  htmlFor={`actual-price-${order.id}`}
                                  style={{ display: 'block', fontSize: 12, color: '#fcd34d', fontWeight: 700, marginBottom: 4 }}
                                >
                                  レシート実費合計（税込・円）
                                </label>
                                <input
                                  id={`actual-price-${order.id}`}
                                  type="number"
                                  className="driver-input tabular-nums"
                                  value={priceInput}
                                  onChange={(e) =>
                                    setActualPriceMap((prev) => ({ ...prev, [order.id]: e.target.value }))
                                  }
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`receipt-note-${order.id}`}
                                  style={{ display: 'block', fontSize: 12, color: '#fcd34d', fontWeight: 700, marginBottom: 4 }}
                                >
                                  購入メモ（容器代・代替など）
                                </label>
                                <input
                                  id={`receipt-note-${order.id}`}
                                  className="driver-input"
                                  placeholder="例：容器代+100円込み、約10分待ち"
                                  value={receiptNoteMap[order.id] || ''}
                                  onChange={(e) =>
                                    setReceiptNoteMap((prev) => ({ ...prev, [order.id]: e.target.value }))
                                  }
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <label className="btn btn-drv-ghost btn-sm" style={{ cursor: 'pointer' }}>
                                <Camera size={14} aria-hidden="true" />
                                {uploadingId === order.id ? '保存中...' : 'レシート写真を選択'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => void handleReceiptFileChange(order, e)}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn btn-drv-ghost btn-sm"
                                disabled={uploadingId === order.id}
                                onClick={() => void handleGenerateDemoReceipt(order)}
                              >
                                <Sparkles size={14} aria-hidden="true" />
                                テスト用レシート写真を撮影（KV保存）
                              </button>
                            </div>

                            {previewReceipt && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <img
                                  src={previewReceipt}
                                  alt="アップロード済みレシート"
                                  width={92}
                                  height={122}
                                  style={{ width: 92, aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
                                />
                                <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 700 }}>
                                  Cloudflare KV にレシート画像を保存済み
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              className="btn btn-drv-amber btn-lg btn-block"
                              disabled={busyId === order.id || uploadingId === order.id}
                              onClick={() => void handleProxyConfirmPurchase(order)}
                            >
                              <Receipt size={17} aria-hidden="true" />
                              代理決済完了・レシートを送信（実費 {formatYen(Number(priceInput || 0))}）
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Partner Order Item Summary */}
                    {!isProxy && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--drv-muted)', marginBottom: 6 }}>
                          受取商品一覧（店舗にコード「{order.order_code}」を提示）
                        </div>
                        {order.items.map((it, i) => (
                          <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>
                            • {it.name} ×{it.quantity}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {isProxy && order.status === 'driver_heading_to_store' && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-drv-ghost btn-sm"
                            onClick={() => void handleMoveCloserGps(order)}
                          >
                            <Navigation size={14} aria-hidden="true" />
                            GPS移動シミュレーション
                          </button>
                          <button
                            type="button"
                            className="btn btn-drv-amber btn-lg"
                            style={{ flex: 1 }}
                            disabled={busyId === order.id}
                            onClick={() => void handleProxyStartOrdering(order)}
                          >
                            店舗に到着・持ち帰り注文を開始
                          </button>
                        </div>
                      )}

                      {((isProxy && order.status === 'proxy_waiting') ||
                        (!isProxy && order.status === 'ready_for_pickup')) && (
                        <button
                          type="button"
                          className="btn btn-drv-emerald btn-lg btn-block"
                          disabled={busyId === order.id}
                          onClick={() => void handlePickup(order)}
                        >
                          <PackageCheck size={18} aria-hidden="true" />
                          商品を受け取って配達開始
                        </button>
                      )}

                      {!isProxy && order.status === 'preparing' && (
                        <div
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'rgba(29,99,184,0.18)',
                            color: '#93c5fd',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          店舗で調理中です。店舗アプリ側で「調理完了・受け渡し準備OK」になると受け取りボタンが有効になります。
                        </div>
                      )}

                      {order.status === 'delivering' && (
                        <>
                          {order.payment_method === 'cash' && (
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '12px 14px',
                                borderRadius: 12,
                                background: cashConfirmedMap[order.id]
                                  ? 'rgba(16, 185, 129, 0.16)'
                                  : 'rgba(245, 158, 11, 0.18)',
                                border: cashConfirmedMap[order.id]
                                  ? '1px solid rgba(16, 185, 129, 0.5)'
                                  : '1px solid rgba(245, 158, 11, 0.55)',
                                cursor: 'pointer',
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: '#fff',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(cashConfirmedMap[order.id])}
                                onChange={(e) =>
                                  setCashConfirmedMap((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.checked,
                                  }))
                                }
                                style={{ width: 18, height: 18, accentColor: '#10b981' }}
                              />
                              <span>
                                お客様から現金{' '}
                                <strong className="tabular-nums" style={{ color: '#fcd34d' }}>
                                  {formatYen(order.total_amount)}
                                </strong>{' '}
                                を受領しました（領収確認）
                              </span>
                            </label>
                          )}
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-drv-ghost"
                              onClick={() => void handleMoveCloserGps(order)}
                            >
                              <Navigation size={15} />
                              GPSをお届け先へ進める
                            </button>
                            <button
                              type="button"
                              className="btn btn-drv-emerald btn-lg"
                              style={{ flex: 1 }}
                              disabled={
                                busyId === order.id ||
                                (order.payment_method === 'cash' && !cashConfirmedMap[order.id])
                              }
                              onClick={() => void handleDeliver(order)}
                            >
                              <CheckCircle2 size={18} />
                              {order.payment_method === 'cash'
                                ? `現金受領＆配達完了（+${formatYen(order.driver_payout)}）`
                                : `配達完了を報告（+${formatYen(order.driver_payout)}）`}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Live Customer Chat */}
                    <OrderChat
                      orderId={order.id}
                      messages={activeMessages[order.id] || []}
                      senderRole="driver"
                      senderName={currentDriver?.name || 'ドライバー'}
                      dark
                      quickReplies={
                        isProxy
                          ? [
                              '店舗に到着しました。これから持ち帰り注文を行います！',
                              '店頭で注文完了しました。あと10分ほどで受け取れる見込みです。',
                              '商品を受け取りました。これからお届けに向かいます！',
                            ]
                          : ['商品を受け取りました。あと5分ほどで到着予定です！', '玄関前に置き配完了しました！']
                      }
                      onSent={(msgs) => setActiveMessages((prev) => ({ ...prev, [order.id]: msgs }))}
                    />
                  </div>
                );
              })
            )}
          </section>

          {/* RIGHT: Available Job Radar + Completed History */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="driver-panel">
              <h2 className="driver-panel-title">
                <span>新着配達リクエスト（{availableJobs.length}）</span>
                <span style={{ fontSize: 11, color: '#6ee7b7' }}>3.5秒自動更新</span>
              </h2>

              {currentDriver && !currentDriver.is_online && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(239,68,68,0.16)',
                    color: '#fca5a5',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={15} />
                  現在オフラインです。右上のボタンからオンラインに切り替えてください。
                </div>
              )}

              {availableJobs.length === 0 ? (
                <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--drv-muted)', fontSize: 13 }}>
                  現在待機中の配達リクエストはありません。
                  <br />
                  注文アプリから新しい注文（特に非提携店舗！）を作成すると即座にここへ届きます。
                </div>
              ) : (
                availableJobs.map((job) => {
                  const isProxy = job.order_type === 'proxy_takeout';
                  const blockedByCard = isProxy && currentDriver && !currentDriver.proxy_card_enabled;
                  return (
                    <div key={job.id} className={`driver-job-card ${isProxy ? 'proxy-job' : ''}`}>
                      <div className={`driver-job-banner ${isProxy ? 'proxy' : 'partner'}`}>
                        <span>{isProxy ? '店頭代理注文（持ち帰り購入・高報酬）' : '公式提携・ピックアップ配達'}</span>
                        <span>{formatTime(job.created_at)}</span>
                      </div>
                      <div className="driver-job-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>{job.store_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--drv-muted)' }}>{job.store_address}</div>
                          </div>
                          <div className="driver-payout-big tabular-nums">{formatYen(job.driver_payout)}</div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <PaymentBadge
                            method={job.payment_method}
                            label={job.payment_label}
                            status={job.payment_status}
                            dark
                          />
                          {job.payment_method === 'cash' && (
                            <span style={{ fontSize: 12, color: '#fcd34d', fontWeight: 700 }}>
                              要現金回収 {formatYen(job.total_amount)}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 12.5, color: '#cbd5e1' }}>
                          商品 {job.items.reduce((s, i) => s + i.quantity, 0)}点 → {job.delivery_address}
                        </div>

                        {isProxy && (
                          <div style={{ fontSize: 12, color: '#fcd34d' }}>
                            店頭立替目安：{formatYen(job.estimated_subtotal)}（代理カード・現金立替・PayPay・Suica可）
                          </div>
                        )}

                        {blockedByCard ? (
                          <div style={{ fontSize: 12, color: '#fca5a5' }}>
                            ※このドライバーは代理決済カード無効のため受諾できません（管理画面で有効化、または対応ドライバーへ切替）
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={`btn btn-block ${isProxy ? 'btn-drv-amber' : 'btn-drv-emerald'}`}
                            disabled={busyId === job.id || !currentDriver?.is_online}
                            onClick={() => void handleAcceptJob(job)}
                          >
                            {isProxy ? '店頭代理注文を受諾して店舗へ向かう' : 'この配達を受諾する'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="driver-panel">
              <h2 className="driver-panel-title">
                <span>最近の配達完了履歴（{completedMissions.length}）</span>
              </h2>
              {completedMissions.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--drv-muted)' }}>完了した配達はまだありません。</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {completedMissions.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{m.store_name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--drv-muted)' }}>
                          {m.id} ・ {m.order_type === 'proxy_takeout' ? '店頭代理' : '提携'} ・ {formatTime(m.updated_at)}
                        </div>
                      </div>
                      <span className="tabular-nums" style={{ fontWeight: 800, color: '#10b981' }}>
                        +{formatYen(m.driver_payout)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
