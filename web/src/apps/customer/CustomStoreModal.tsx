import React, { useState } from 'react';
import { X, Plus, Trash2, Store, Sparkles } from 'lucide-react';
import { api, formatYen } from '../../api/client';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { Order, PlatformSettings } from '../../types';

interface CustomStoreModalProps {
  settings: PlatformSettings;
  defaultAddress: string;
  defaultName: string;
  onClose: () => void;
  onCreated: (order: Order) => void;
}

export function CustomStoreModal({
  settings,
  defaultAddress,
  defaultName,
  onClose,
  onCreated,
}: CustomStoreModalProps) {
  const dialogRef = useModalA11y(onClose);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeArea, setStoreArea] = useState('渋谷');
  const [storeCategory, setStoreCategory] = useState('その他');
  const [takeoutNotes, setTakeoutNotes] = useState('');
  const [customerName, setCustomerName] = useState(defaultName);
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddress);
  const [deliveryNote, setDeliveryNote] = useState('置き配希望');
  const [substitutionPolicy, setSubstitutionPolicy] = useState<'contact' | 'similar' | 'cancel_item'>('contact');
  const [maxOverage, setMaxOverage] = useState(500);
  const [tipAmount, setTipAmount] = useState(150);
  const [items, setItems] = useState<Array<{ name: string; estimated_price: number; quantity: number; note: string }>>([
    { name: '', estimated_price: 900, quantity: 1, note: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = items.reduce((s, it) => s + (Number(it.estimated_price) || 0) * (Number(it.quantity) || 1), 0);
  const serviceFee = Math.round(subtotal * settings.service_fee_rate);
  const total = subtotal + settings.base_delivery_fee + serviceFee + settings.proxy_order_fee + tipAmount;

  const fillExample = () => {
    setStoreName('精肉店 肉の吉田屋 渋谷百軒店');
    setStoreAddress('東京都渋谷区道玄坂2-18-5');
    setStoreArea('渋谷');
    setStoreCategory('焼き鳥・弁当');
    setTakeoutNotes('店頭の揚げ物ショーケースで注文してください。ソース小袋をもらえると嬉しいです。');
    setItems([
      { name: '揚げたて黒毛和牛メンチカツ', estimated_price: 380, quantity: 2, note: 'ソース別添え' },
      { name: '昔ながらの男爵コロッケ', estimated_price: 180, quantity: 3, note: '' },
      { name: '自家製ポテトサラダ（大パック）', estimated_price: 450, quantity: 1, note: '' },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.name.trim());
    if (!storeName.trim() || !storeAddress.trim() || validItems.length === 0) {
      setError('お店の名前・お店の住所・希望メニューを1品以上入力してください。');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.createCustomProxyOrder({
        store_name: storeName.trim(),
        store_address: storeAddress.trim(),
        store_area: storeArea,
        store_category: storeCategory,
        takeout_notes: takeoutNotes.trim(),
        customer_name: customerName.trim() || 'ゲストユーザー',
        customer_phone: '090-1111-2222',
        delivery_address: deliveryAddress.trim(),
        delivery_note: deliveryNote.trim(),
        items: validItems,
        tip_amount: tipAmount,
        substitution_policy: substitutionPolicy,
        max_budget_overage: maxOverage,
      });
      onCreated(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リクエストの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-store-modal-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Store size={20} color="#b34d0e" aria-hidden="true" />
            <h2 id="custom-store-modal-title">掲載されていないお店を持ち帰り代理注文</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="proxy-notice-box" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>街のどんなお店でも、ドライバーが店頭へ行ってテイクアウト購入します。</strong>
                <button type="button" className="btn btn-outline btn-sm" onClick={fillExample}>
                  <Sparkles size={13} />
                  サンプル入力（商店街のコロッケ店）
                </button>
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5 }}>
                購入後にドライバーがレシート写真をアップロードし、実費金額で自動精算されます。
              </div>
            </div>

            {error && (
              <div className="badge badge-danger" style={{ padding: '10px 14px', borderRadius: 10, whiteSpace: 'normal' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">お店の名前 *</label>
                <input
                  className="input"
                  required
                  placeholder="例：精肉店 肉の吉田屋、〇〇ベーカリー"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">エリア</label>
                <select className="select" value={storeArea} onChange={(e) => setStoreArea(e.target.value)}>
                  {['渋谷', '恵比寿', '中目黒', '代官山', '表参道', '六本木', '新宿', '下北沢'].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">お店の住所・目印 *</label>
                <input
                  className="input"
                  required
                  placeholder="例：東京都渋谷区道玄坂2-18-5（商店街入口すぐ）"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">ジャンル</label>
                <select className="select" value={storeCategory} onChange={(e) => setStoreCategory(e.target.value)}>
                  {['その他', '町中華', 'ラーメン', '洋食', '焼き鳥・弁当', 'カフェ', 'バーガー', '寿司', 'カレー'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">ドライバーへの店頭注文ヒント</label>
              <input
                className="input"
                placeholder="例：券売機で購入、右側のテイクアウト窓口から注文、現金のみ等"
                value={takeoutNotes}
                onChange={(e) => setTakeoutNotes(e.target.value)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="field-label">持ち帰り希望メニュー *</label>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    setItems((prev) => [...prev, { name: '', estimated_price: 800, quantity: 1, note: '' }])
                  }
                >
                  <Plus size={14} />
                  商品を追加
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 0.55fr 0.4fr auto',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      className="input"
                      placeholder="商品名（例：メンチカツ）"
                      value={it.name}
                      onChange={(e) =>
                        setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                      }
                    />
                    <input
                      className="input"
                      type="number"
                      min={50}
                      step={50}
                      placeholder="目安円"
                      value={it.estimated_price}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, estimated_price: Number(e.target.value) } : x))
                        )
                      }
                    />
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={20}
                      value={it.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x))
                        )
                      }
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={items.length <= 1}
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">品切れ時の対応</label>
                <select
                  className="select"
                  value={substitutionPolicy}
                  onChange={(e) => setSubstitutionPolicy(e.target.value as 'contact' | 'similar' | 'cancel_item')}
                >
                  <option value="contact">チャットで相談する</option>
                  <option value="similar">似た商品で代替してOK</option>
                  <option value="cancel_item">品切れ商品のみ除外</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">実費差額の自動承認上限</label>
                <select className="select" value={maxOverage} onChange={(e) => setMaxOverage(Number(e.target.value))}>
                  <option value={300}>+¥300まで自動承認</option>
                  <option value={500}>+¥500まで自動承認</option>
                  <option value={1000}>+¥1,000まで自動承認</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">お名前</label>
                <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">お届け先住所</label>
                <input className="input" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">配達メモ</label>
                <input className="input" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">ドライバーへのチップ</label>
                <select className="select" value={tipAmount} onChange={(e) => setTipAmount(Number(e.target.value))}>
                  <option value={0}>¥0</option>
                  <option value={100}>¥100</option>
                  <option value={150}>¥150</option>
                  <option value={300}>¥300</option>
                </select>
              </div>
            </div>

            <div className="price-summary">
              <div className="price-line">
                <span>商品代金（目安）</span>
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
              <div className="price-line" style={{ color: 'var(--proxy-amber)', fontWeight: 700 }}>
                <span>店頭代理注文手数料</span>
                <span className="tabular-nums">{formatYen(settings.proxy_order_fee)}</span>
              </div>
              {tipAmount > 0 && (
                <div className="price-line">
                  <span>ドライバーチップ</span>
                  <span className="tabular-nums">{formatYen(tipAmount)}</span>
                </div>
              )}
              <div className="price-line total">
                <span>仮決済合計（レシート実費で精算）</span>
                <span className="tabular-nums">{formatYen(total)}</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-proxy btn-lg" disabled={submitting}>
              {submitting ? '送信中...' : `代理注文をリクエスト（目安 ${formatYen(total)}）`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
