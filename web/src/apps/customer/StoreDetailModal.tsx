import { useEffect, useState } from 'react';
import { X, Star, MapPin, Clock, Plus, Info, ShoppingBag } from 'lucide-react';
import { api, formatYen, resolveAssetUrl } from '../../api/client';
import { OrderTypeBadge } from '../../components/StatusBadge';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { CartItem, MenuItem, Store } from '../../types';

interface StoreDetailModalProps {
  storeId: string;
  onClose: () => void;
  onAddToCart: (store: Store, item: CartItem) => void;
}

export function StoreDetailModal({ storeId, onClose, onAddToCart }: StoreDetailModalProps) {
  const dialogRef = useModalA11y(onClose);
  const [store, setStore] = useState<Store | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, { label: string; price: number }>>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('1000');
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getStore(storeId)
      .then((res) => {
        if (!active) return;
        setStore(res.store);
        setMenu(res.menu);
        const defaults: Record<string, Record<string, { label: string; price: number }>> = {};
        for (const m of res.menu) {
          defaults[m.id] = {};
          for (const g of m.options || []) {
            if (g.choices.length > 0) {
              defaults[m.id][g.name] = g.choices[0];
            }
          }
        }
        setSelectedOptions(defaults);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId]);

  const handleAddItem = (m: MenuItem) => {
    if (!store) return;
    const chosenMap = selectedOptions[m.id] || {};
    const chosenList = Object.values(chosenMap);
    const extraPrice = chosenList.reduce((s, c) => s + (c.price || 0), 0);
    const optionLabels = chosenList.map((c) => c.label);
    const note = (itemNotes[m.id] || '').trim();
    const key = `${m.id}::${optionLabels.join('|')}::${note}`;

    onAddToCart(store, {
      key,
      menu_item_id: m.id,
      name: m.name,
      unit_price: m.price + extraPrice,
      quantity: 1,
      selected_options: optionLabels,
      note,
    });
  };

  const handleAddCustomItem = () => {
    if (!store || !customName.trim()) return;
    const price = Math.max(100, Math.round(Number(customPrice || 0)));
    onAddToCart(store, {
      key: `custom-${Date.now()}-${Math.random()}`,
      menu_item_id: '',
      name: customName.trim(),
      unit_price: price,
      quantity: 1,
      selected_options: ['店頭メニュー自由指定'],
      note: customNote.trim(),
    });
    setCustomName('');
    setCustomNote('');
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
        aria-labelledby="store-detail-modal-title"
      >
        {loading || !store ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: 48 }}>
            店舗情報を読み込み中...
          </div>
        ) : (
          <>
            <div className="store-modal-hero">
              <img src={resolveAssetUrl(store.image_url)} alt={store.name} />
              <button
                type="button"
                className="icon-btn store-modal-close"
                onClick={onClose}
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <OrderTypeBadge isPartner={store.is_partner} />
                <span className="badge badge-neutral">{store.category}</span>
                {store.busy_mode && <span className="badge badge-warn">現在混雑中</span>}
                {!store.is_open && <span className="badge badge-danger">営業時間外</span>}
              </div>

              <h2 id="store-detail-modal-title" style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
                {store.name}
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--ink-secondary)' }}>
                {store.description}
              </p>

              <div className="store-card-meta" style={{ marginBottom: 16 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: 'var(--ink-primary)' }}>
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  {store.rating.toFixed(1)}（{store.review_count}件）
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={14} />
                  目安 {store.avg_prep_min + 12}〜{store.avg_prep_min + 22}分
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={14} />
                  {store.address}
                </span>
              </div>

              {!store.is_partner && (
                <div className="proxy-notice-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, marginBottom: 4 }}>
                    <Info size={16} />
                    このお店は非提携のため、ドライバーが店頭で持ち帰り注文を行います
                  </div>
                  <div>
                    表示価格は店頭メニューの参考価格です。購入後にドライバーが<strong>レシート写真と実費金額</strong>を登録し、差額を透明に精算します。
                    {store.takeout_notes && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(200,90,23,0.3)' }}>
                        <strong>店頭テイクアウトメモ：</strong>
                        {store.takeout_notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>
                {store.is_partner ? 'メニュー' : '参考テイクアウトメニュー'}
              </h3>

              <div className="menu-list">
                {menu.map((m) => {
                  const chosen = selectedOptions[m.id] || {};
                  const extra = Object.values(chosen).reduce((s, c) => s + (c.price || 0), 0);
                  return (
                    <div key={m.id} className={`menu-row ${!m.is_available ? 'sold-out' : ''}`}>
                      <div className="menu-row-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h4>{m.name}</h4>
                          {m.is_popular && <span className="badge badge-warn">人気</span>}
                          {!m.is_available && <span className="badge badge-danger">売り切れ</span>}
                        </div>
                        <p>{m.description}</p>
                        <div className="tabular-nums" style={{ fontWeight: 800, fontSize: 15 }}>
                          {formatYen(m.price + extra)}
                          {!store.is_partner && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', marginLeft: 6 }}>
                              目安価格
                            </span>
                          )}
                        </div>

                        {m.is_available && (m.options || []).map((g) => (
                          <div key={g.name} className="menu-option-group">
                            <div className="menu-option-title">{g.name}</div>
                            <div className="menu-option-choices">
                              {g.choices.map((ch) => {
                                const isSelected = chosen[g.name]?.label === ch.label;
                                return (
                                  <button
                                    key={ch.label}
                                    type="button"
                                    className={`option-pill ${isSelected ? 'selected' : ''}`}
                                    onClick={() =>
                                      setSelectedOptions((prev) => ({
                                        ...prev,
                                        [m.id]: { ...(prev[m.id] || {}), [g.name]: ch },
                                      }))
                                    }
                                  >
                                    {ch.label}
                                    {ch.price > 0 ? ` (+${formatYen(ch.price)})` : ''}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {m.is_available && (
                          <div style={{ marginTop: 8 }}>
                            <input
                              className="input"
                              style={{ padding: '6px 10px', fontSize: 12.5 }}
                              placeholder="ご要望メモ（例：ネギ抜き、タレ別添え、割り箸希望）"
                              value={itemNotes[m.id] || ''}
                              onChange={(e) => setItemNotes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${store.is_partner ? 'btn-primary' : 'btn-proxy'}`}
                          disabled={!m.is_available || !store.is_open}
                          onClick={() => handleAddItem(m)}
                        >
                          <Plus size={15} />
                          カートに追加
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!store.is_partner && store.is_open && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 12,
                    border: '1px dashed var(--proxy-amber-border)',
                    background: 'var(--bg-canvas)',
                  }}
                >
                  <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShoppingBag size={15} color="#c85a17" />
                    掲載メニューにない商品を自由入力で追加（店頭代理購入）
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 8, marginBottom: 8 }}>
                    <input
                      className="input"
                      placeholder="例：季節限定冷やし中華、単品の麻婆豆腐など"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                    <input
                      className="input"
                      type="number"
                      min={100}
                      step={50}
                      placeholder="目安金額(円)"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      placeholder="ドライバーへの注文メモ（例：辛さ控えめ）"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-proxy btn-sm"
                      disabled={!customName.trim()}
                      onClick={handleAddCustomItem}
                    >
                      追加
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
