import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, Receipt } from 'lucide-react';
import { api, formatYen } from '../../api/client';
import { OrderTypeBadge } from '../../components/StatusBadge';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { CartItem, Order, PlatformSettings, Store } from '../../types';

interface CartDrawerProps {
  store: Store | null;
  items: CartItem[];
  settings: PlatformSettings;
  customerName: string;
  deliveryAddress: string;
  onChangeCustomerName: (v: string) => void;
  onChangeDeliveryAddress: (v: string) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onClear: () => void;
  onClose: () => void;
  onOrderPlaced: (order: Order) => void;
}

export function CartDrawer({
  store,
  items,
  settings,
  customerName,
  deliveryAddress,
  onChangeCustomerName,
  onChangeDeliveryAddress,
  onUpdateQty,
  onClear,
  onClose,
  onOrderPlaced,
}: CartDrawerProps) {
  const drawerRef = useModalA11y(onClose);
  const [deliveryNote, setDeliveryNote] = useState('玄関ドア前に置き配希望');
  const [tipAmount, setTipAmount] = useState(100);
  const [substitutionPolicy, setSubstitutionPolicy] = useState<'contact' | 'similar' | 'cancel_item'>('contact');
  const [maxOverage, setMaxOverage] = useState(300);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isPartner = store?.is_partner ?? true;
  const subtotal = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const serviceFee = Math.round(subtotal * settings.service_fee_rate);
  const proxyFee = isPartner ? 0 : settings.proxy_order_fee;
  const total = subtotal + settings.base_delivery_fee + serviceFee + proxyFee + tipAmount;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || items.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.createOrder({
        store_id: store.id,
        customer_name: customerName.trim() || 'ゲストユーザー',
        customer_phone: '090-1234-5678',
        delivery_address: deliveryAddress.trim() || '東京都渋谷区桜丘町15-14 402',
        delivery_note: deliveryNote.trim(),
        items: items.map((it) => ({
          menu_item_id: it.menu_item_id,
          name: it.name,
          unit_price: it.unit_price,
          quantity: it.quantity,
          selected_options: it.selected_options,
          note: it.note,
        })),
        tip_amount: tipAmount,
        substitution_policy: substitutionPolicy,
        max_budget_overage: isPartner ? 0 : maxOverage,
      });
      onOrderPlaced(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注文の送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={19} aria-hidden="true" />
            <h2 id="cart-drawer-title">注文カート</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        {!store || items.length === 0 ? (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--ink-muted)' }}>
            <ShoppingBag size={42} strokeWidth={1.5} />
            <p style={{ margin: 0, fontWeight: 700 }}>カートは空です</p>
            <p style={{ margin: 0, fontSize: 13, textAlign: 'center' }}>
              お店を選んでメニューを追加してください。
            </p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{store.name}</div>
                  <div style={{ marginTop: 4 }}>
                    <OrderTypeBadge isPartner={store.is_partner} />
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
                  <Trash2 size={14} />
                  空にする
                </button>
              </div>

              {!store.is_partner && (
                <div className="proxy-notice-box" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, marginBottom: 3 }}>
                    <Receipt size={15} />
                    店頭持ち帰り代理注文モード
                  </div>
                  ドライバーが店頭で持ち帰り注文・代理決済し、レシート写真と実費金額を共有します。
                </div>
              )}

              <div>
                {items.map((it) => (
                  <div key={it.key} className="cart-item-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                      {it.selected_options.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                          {it.selected_options.join(' / ')}
                        </div>
                      )}
                      {it.note && (
                        <div style={{ fontSize: 12, color: 'var(--proxy-amber)' }}>メモ: {it.note}</div>
                      )}
                      <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                        {formatYen(it.unit_price * it.quantity)}
                      </div>
                    </div>
                    <div className="qty-control" style={{ alignSelf: 'center' }}>
                      <button type="button" className="qty-btn" onClick={() => onUpdateQty(it.key, -1)} aria-label="減らす">
                        <Minus size={12} />
                      </button>
                      <span className="tabular-nums" style={{ minWidth: 18, textAlign: 'center', fontWeight: 800, fontSize: 13 }}>
                        {it.quantity}
                      </span>
                      <button type="button" className="qty-btn" onClick={() => onUpdateQty(it.key, 1)} aria-label="増やす">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="badge badge-danger" style={{ padding: '10px 12px', borderRadius: 10, whiteSpace: 'normal' }}>
                  {error}
                </div>
              )}

              <div className="field">
                <label className="field-label">お名前</label>
                <input className="input" value={customerName} onChange={(e) => onChangeCustomerName(e.target.value)} required />
              </div>

              <div className="field">
                <label className="field-label">お届け先住所</label>
                <input
                  className="input"
                  value={deliveryAddress}
                  onChange={(e) => onChangeDeliveryAddress(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label">配達指示・置き配メモ</label>
                <input className="input" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
              </div>

              {!isPartner && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="field">
                    <label className="field-label">品切れ時の対応</label>
                    <select
                      className="select"
                      value={substitutionPolicy}
                      onChange={(e) => setSubstitutionPolicy(e.target.value as 'contact' | 'similar' | 'cancel_item')}
                    >
                      <option value="contact">チャットで相談</option>
                      <option value="similar">似た商品で代替</option>
                      <option value="cancel_item">該当品のみ除外</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">実費差額の許容</label>
                    <select className="select" value={maxOverage} onChange={(e) => setMaxOverage(Number(e.target.value))}>
                      <option value={300}>+¥300まで</option>
                      <option value={500}>+¥500まで</option>
                      <option value={1000}>+¥1,000まで</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="field">
                <label className="field-label">ドライバーへのチップ</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 100, 200, 300].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`option-pill ${tipAmount === v ? 'selected' : ''}`}
                      onClick={() => setTipAmount(v)}
                    >
                      {v === 0 ? 'なし' : formatYen(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="price-summary">
                <div className="price-line">
                  <span>商品小計{!isPartner ? '（目安）' : ''}</span>
                  <span className="tabular-nums">{formatYen(subtotal)}</span>
                </div>
                <div className="price-line">
                  <span>配達料</span>
                  <span className="tabular-nums">{formatYen(settings.base_delivery_fee)}</span>
                </div>
                <div className="price-line">
                  <span>サービス料（{Math.round(settings.service_fee_rate * 100)}%）</span>
                  <span className="tabular-nums">{formatYen(serviceFee)}</span>
                </div>
                {!isPartner && (
                  <div className="price-line" style={{ color: 'var(--proxy-amber)', fontWeight: 700 }}>
                    <span>店頭代理注文手数料</span>
                    <span className="tabular-nums">{formatYen(proxyFee)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="price-line">
                    <span>チップ</span>
                    <span className="tabular-nums">{formatYen(tipAmount)}</span>
                  </div>
                )}
                <div className="price-line total">
                  <span>合計{!isPartner ? '（目安）' : ''}</span>
                  <span className="tabular-nums">{formatYen(total)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="submit"
                id="checkout-submit-btn"
                className={`btn btn-lg btn-block ${isPartner ? 'btn-primary' : 'btn-proxy'}`}
                disabled={submitting}
              >
                {submitting
                  ? '注文を送信中...'
                  : isPartner
                  ? `注文を確定する（${formatYen(total)}）`
                  : `持ち帰り代理注文を確定（目安 ${formatYen(total)}）`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
