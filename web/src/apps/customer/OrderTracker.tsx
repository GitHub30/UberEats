import { useEffect, useState } from 'react';
import { Receipt, Star, RefreshCw, Bike, XCircle, CheckCircle2, Clock } from 'lucide-react';
import { api, formatTime, formatYen } from '../../api/client';
import { DeliveryMap } from '../../components/DeliveryMap';
import { OrderChat } from '../../components/OrderChat';
import { OrderTypeBadge, StatusBadge, substitutionLabel, vehicleLabel } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import type { Order, OrderEvent, OrderMessage } from '../../types';

interface OrderTrackerProps {
  orders: Order[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
  onRefreshList: () => Promise<void>;
}

const PARTNER_STEPS = [
  { key: 'placed', label: '店舗承認待ち' },
  { key: 'preparing', label: '調理中' },
  { key: 'ready_for_pickup', label: '受取準備OK' },
  { key: 'delivering', label: '配達中' },
  { key: 'delivered', label: '配達完了' },
];

const PROXY_STEPS = [
  { key: 'placed', label: 'ドライバー手配' },
  { key: 'driver_heading_to_store', label: '店舗へ移動' },
  { key: 'proxy_ordering', label: '店頭で代理注文' },
  { key: 'proxy_waiting', label: '決済済・調理待ち' },
  { key: 'delivering', label: '配達中' },
  { key: 'delivered', label: '配達完了' },
];

export function OrderTracker({ orders, selectedOrderId, onSelectOrder, onRefreshList }: OrderTrackerProps) {
  const { notify } = useToast();
  const [detail, setDetail] = useState<{ order: Order; events: OrderEvent[]; messages: OrderMessage[] } | null>(null);
  const [storeRating, setStoreRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [busy, setBusy] = useState(false);

  const activeId = selectedOrderId || orders[0]?.id || null;

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    let alive = true;
    const load = () => {
      if (document.hidden || !navigator.onLine) return;
      api
        .getOrder(activeId)
        .then((res) => {
          if (alive) setDetail(res);
        })
        .catch(() => {});
    };
    api
      .getOrder(activeId)
      .then((res) => {
        if (alive) setDetail(res);
      })
      .catch(() => {});
    const timer = window.setInterval(load, 3500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [activeId]);

  const handleCancel = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await api.cancelOrder(detail.order.id, {
        reason: 'お客様からのキャンセルリクエスト',
        actor_role: 'customer',
        actor_name: detail.order.customer_name,
      });
      notify('注文をキャンセルしました', 'info');
      await onRefreshList();
      const updated = await api.getOrder(detail.order.id);
      setDetail(updated);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'キャンセルに失敗しました', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await api.submitReview(detail.order.id, {
        store_rating: storeRating,
        driver_rating: driverRating,
        comment: reviewComment.trim(),
      });
      notify('評価を送信しました。ありがとうございます！', 'success');
      const updated = await api.getOrder(detail.order.id);
      setDetail(updated);
      await onRefreshList();
    } catch (err) {
      notify(err instanceof Error ? err.message : '評価の送信に失敗しました', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="admin-card" style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>まだ注文履歴がありません</p>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-muted)' }}>
          お店を選んで注文すると、ここでリアルタイムの配達状況・レシート・チャットを確認できます。
        </p>
      </div>
    );
  }

  const order = detail?.order;
  const isProxy = order?.order_type === 'proxy_takeout';
  const steps = isProxy ? PROXY_STEPS : PARTNER_STEPS;
  const currentStepIdx = order ? steps.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="tracker-grid animate-fade">
      <div className="order-list-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 8px' }}>
          <strong style={{ fontSize: 14 }}>注文一覧（{orders.length}件）</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void onRefreshList()}>
            <RefreshCw size={13} />
            更新
          </button>
        </div>
        {orders.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`order-list-item ${o.id === activeId ? 'active' : ''}`}
            onClick={() => onSelectOrder(o.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>{o.store_name}</span>
              <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 700 }}>
                {formatYen(o.total_amount)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusBadge status={o.status} orderType={o.order_type} />
              {o.order_type === 'proxy_takeout' && <span className="badge badge-proxy">代理持ち帰り</span>}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{o.id} / {o.customer_name}</span>
              <span>{formatTime(o.created_at)}</span>
            </div>
          </button>
        ))}
      </div>

      {order ? (
        <div className="tracker-detail">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <OrderTypeBadge isPartner={order.store_is_partner} />
                <StatusBadge status={order.status} orderType={order.order_type} />
                <span className="badge badge-neutral tabular-nums">注文番号 {order.id}</span>
              </div>
              <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>{order.store_name}</h2>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
                お届け先: {order.delivery_address}（{order.customer_name}様）
              </div>
            </div>

            {['placed', 'preparing', 'driver_heading_to_store'].includes(order.status) && (
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void handleCancel()}>
                <XCircle size={14} />
                注文をキャンセル
              </button>
            )}
          </div>

          {order.status !== 'cancelled' ? (
            <div className="stepper">
              {steps.map((st, idx) => {
                const done = currentStepIdx > idx || order.status === 'delivered';
                const current = currentStepIdx === idx && order.status !== 'delivered';
                return (
                  <div
                    key={st.key}
                    className={`step-node ${isProxy ? 'proxy' : ''} ${done ? 'done' : ''} ${current ? 'current' : ''}`}
                  >
                    <span style={{ fontSize: 11, opacity: 0.75 }}>STEP {idx + 1}</span>
                    <span>{st.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="badge badge-danger" style={{ padding: '12px 14px', borderRadius: 12, whiteSpace: 'normal' }}>
              この注文はキャンセルされました（理由：{order.cancel_reason || 'なし'}）
            </div>
          )}

          {/* Live Map */}
          <DeliveryMap order={order} />

          {/* Assigned Driver Banner */}
          {order.driver_name && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '13px 16px',
                borderRadius: 12,
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#141413',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bike size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>担当ドライバー：{order.driver_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    {vehicleLabel(order.driver_vehicle)}・評価 ★{Number(order.driver_rating || 4.9).toFixed(2)}
                    {order.estimated_prep_min ? `・調理目安 約${order.estimated_prep_min}分` : ''}
                  </div>
                </div>
              </div>
              <span className="badge badge-neutral">受取コード: {order.order_code}</span>
            </div>
          )}

          {/* Non-Partner Receipt & Actual Reconciliation Box */}
          {isProxy && (
            <div className="proxy-notice-box" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Receipt size={16} />
                  店頭持ち帰り代理注文・レシート実費精算
                </strong>
                <span style={{ fontSize: 12 }}>
                  品切れ時方針：{substitutionLabel(order.substitution_policy)}（差額許容 +{formatYen(order.max_budget_overage)}）
                </span>
              </div>

              {order.actual_subtotal !== null ? (
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13.5, marginBottom: 6 }}>
                      目安商品代金 <strong className="tabular-nums">{formatYen(order.estimated_subtotal)}</strong> → 店頭レシート実費{' '}
                      <strong className="tabular-nums" style={{ fontSize: 16 }}>
                        {formatYen(order.actual_subtotal)}
                      </strong>
                      （差額 {order.price_diff >= 0 ? `+${formatYen(order.price_diff)}` : formatYen(order.price_diff)}）
                    </div>
                    {order.receipt_note && (
                      <div style={{ fontSize: 12.5 }}>ドライバーメモ：{order.receipt_note}</div>
                    )}
                  </div>
                  {order.receipt_image_url && (
                    <div>
                      <a href={order.receipt_image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={order.receipt_image_url}
                          alt="店頭テイクアウト購入レシート"
                          className="receipt-preview-img"
                          width={240}
                          height={320}
                          loading="lazy"
                        />
                      </a>
                      <div style={{ fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                        Cloudflare KV 保存レシート（クリックで拡大）
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13 }}>
                  ドライバーが店舗で購入・決済すると、ここに<strong>実費金額とレシート写真</strong>が表示されます。
                </div>
              )}
            </div>
          )}

          {/* Items & Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>注文内容</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {order.items.map((it, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13.5 }}>
                    <div>
                      <strong>
                        {it.name} ×{it.quantity}
                      </strong>
                      {it.selected_options && it.selected_options.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{it.selected_options.join(' / ')}</div>
                      )}
                      {it.note && <div style={{ fontSize: 12, color: 'var(--proxy-amber)' }}>メモ: {it.note}</div>}
                    </div>
                    <span className="tabular-nums" style={{ fontWeight: 700 }}>
                      {formatYen(it.unit_price * it.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="price-summary">
              <div className="price-line">
                <span>商品代金（{order.actual_subtotal !== null ? '確定' : '目安'}）</span>
                <span className="tabular-nums">{formatYen(order.actual_subtotal ?? order.estimated_subtotal)}</span>
              </div>
              <div className="price-line">
                <span>配達料</span>
                <span className="tabular-nums">{formatYen(order.delivery_fee)}</span>
              </div>
              <div className="price-line">
                <span>サービス料</span>
                <span className="tabular-nums">{formatYen(order.service_fee)}</span>
              </div>
              {order.proxy_fee > 0 && (
                <div className="price-line" style={{ color: 'var(--proxy-amber)', fontWeight: 700 }}>
                  <span>店頭代理注文手数料</span>
                  <span className="tabular-nums">{formatYen(order.proxy_fee)}</span>
                </div>
              )}
              {order.tip_amount > 0 && (
                <div className="price-line">
                  <span>チップ</span>
                  <span className="tabular-nums">{formatYen(order.tip_amount)}</span>
                </div>
              )}
              <div className="price-line total">
                <span>お支払い合計</span>
                <span className="tabular-nums">{formatYen(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Real-time Chat */}
          <OrderChat
            orderId={order.id}
            messages={detail.messages}
            senderRole="customer"
            senderName={order.customer_name}
            quickReplies={['ありがとうございます！よろしくお願いします', '品切れの場合は別の商品で大丈夫です', '玄関前に置き配お願いします']}
            onSent={(msgs) => setDetail((prev) => (prev ? { ...prev, messages: msgs } : prev))}
          />

          {/* Post-delivery Review */}
          {order.status === 'delivered' && !order.customer_rating_store && (
            <div style={{ border: '1px solid var(--brand-green-border)', background: 'var(--brand-green-soft)', borderRadius: 14, padding: 16 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={17} color="#068449" />
                配達が完了しました！お店とドライバーを評価してください
              </h3>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>お店の評価</div>
                  <div style={{ display: 'flex', gap: 4 }} role="group" aria-label="お店の評価（1〜5つ星）">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`お店を${n}つ星で評価`}
                        aria-pressed={n <= storeRating}
                        onClick={() => setStoreRating(n)}
                        style={{ background: 'none', border: 'none', padding: 2 }}
                      >
                        <Star size={20} fill={n <= storeRating ? '#d97706' : 'none'} color="#d97706" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>ドライバーの評価</div>
                  <div style={{ display: 'flex', gap: 4 }} role="group" aria-label="ドライバーの評価（1〜5つ星）">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`ドライバーを${n}つ星で評価`}
                        aria-pressed={n <= driverRating}
                        onClick={() => setDriverRating(n)}
                        style={{ background: 'none', border: 'none', padding: 2 }}
                      >
                        <Star size={20} fill={n <= driverRating ? '#047843' : 'none'} color="#047843" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="感想コメント（任意）"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void handleReview()}>
                  評価を送信
                </button>
              </div>
            </div>
          )}

          {order.customer_rating_store && (
            <div className="badge badge-partner" style={{ alignSelf: 'flex-start', padding: '7px 12px' }}>
              評価済み：お店 ★{order.customer_rating_store} / ドライバー ★{order.customer_rating_driver}
              {order.customer_review_comment ? `「${order.customer_review_comment}」` : ''}
            </div>
          )}

          {/* Event Timeline */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} />
              進行タイムライン
            </h3>
            <div className="timeline-list">
              {detail.events.map((ev) => (
                <div key={ev.id} className="timeline-item">
                  <div style={{ fontWeight: 700 }}>{ev.message}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                    {ev.actor_name} ・ {formatTime(ev.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
