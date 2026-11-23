import React, { useState } from 'react';
import { User, Briefcase, Check, Plus, Tag, ArrowLeft } from 'lucide-react';
import { PaymentLogo, VOUCHERS, usePaymentWallet } from '../../components/PaymentBadge';
import { useToast } from '../../components/Toast';
import type { WalletMethod } from '../../types';

interface PaymentWalletViewProps {
  wallet: ReturnType<typeof usePaymentWallet>;
  onBack?: () => void;
}

export function PaymentWalletView({ wallet, onBack }: PaymentWalletViewProps) {
  const { notify } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addKind, setAddKind] = useState<'card' | 'rakuten_pay' | 'd_barai'>('card');
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'jcb' | 'amex'>('visa');
  const [cardLast4, setCardLast4] = useState('7118');
  const [cardHolder, setCardHolder] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (addKind === 'rakuten_pay') {
      const m: WalletMethod = {
        id: 'pm-rakuten-pay',
        type: 'rakuten_pay',
        label: '楽天ペイ',
        promoHint: '楽天ポイント最大1.5%還元',
      };
      wallet.addMethod(m);
      notify('楽天ペイをお支払い方法に追加しました', 'success');
      setShowAddForm(false);
      return;
    }
    if (addKind === 'd_barai') {
      const m: WalletMethod = {
        id: 'pm-d-barai',
        type: 'd_barai',
        label: 'd払い',
        promoHint: 'dポイントが貯まる・使える',
      };
      wallet.addMethod(m);
      notify('d払いをお支払い方法に追加しました', 'success');
      setShowAddForm(false);
      return;
    }
    const cleanLast4 = cardLast4.replace(/\D/g, '').slice(-4).padStart(4, '0');
    const brandName =
      cardBrand === 'mastercard' ? 'Mastercard' : cardBrand === 'jcb' ? 'JCB' : cardBrand === 'amex' ? 'Amex' : 'Visa';
    const holderSuffix = cardHolder.trim() ? ` (${cardHolder.trim().toUpperCase()})` : '';
    const newCard: WalletMethod = {
      id: `pm-card-${cardBrand}-${cleanLast4}-${Date.now().toString(36)}`,
      type: 'credit_card',
      brand: cardBrand,
      label: `${brandName} •••• ${cleanLast4}${holderSuffix}`,
      sublabel: 'クレジットカード（即時決済）',
    };
    wallet.addMethod(newCard);
    notify(`${brandName} •••• ${cleanLast4} を追加しました`, 'success');
    setShowAddForm(false);
    setCardHolder('');
  };

  return (
    <div className="wallet-page animate-fade">
      <div className="wallet-head">
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="戻る">
            <ArrowLeft size={18} />
          </button>
        )}
        <h1 className="wallet-title">支払い方法</h1>
      </div>

      {/* Personal / Business Profile Switcher */}
      <div className="wallet-profile-toggle" role="group" aria-label="利用プロフィール切替">
        <button
          type="button"
          aria-pressed={wallet.billingProfile === 'personal'}
          className={`wallet-profile-btn ${wallet.billingProfile === 'personal' ? 'active' : ''}`}
          onClick={() => wallet.setBillingProfile('personal')}
        >
          <User size={15} aria-hidden="true" />
          個人
        </button>
        <button
          type="button"
          aria-pressed={wallet.billingProfile === 'business'}
          className={`wallet-profile-btn ${wallet.billingProfile === 'business' ? 'active' : ''}`}
          onClick={() => wallet.setBillingProfile('business')}
        >
          <Briefcase size={15} aria-hidden="true" />
          ビジネス
        </button>
      </div>

      {/* MachiEats Cash Balance Toggle */}
      <section className="wallet-balance-section" aria-labelledby="balance-heading">
        <div className="wallet-balance-top">
          <h2 id="balance-heading" className="wallet-section-h2">MachiEats Balance</h2>
          <button
            type="button"
            role="switch"
            aria-checked={wallet.useWalletCash}
            aria-label="MachiEats Cash 残高を利用する"
            className={`wallet-switch ${wallet.useWalletCash ? 'on' : ''}`}
            onClick={() => {
              wallet.toggleWalletCash();
              notify(
                !wallet.useWalletCash
                  ? 'MachiEats Cash（¥500）を次回注文へ適用します'
                  : 'MachiEats Cash の適用をオフにしました',
                'info'
              );
            }}
          >
            <span className="wallet-switch-thumb" />
          </button>
        </div>
        <div className="wallet-balance-row">
          <span className="wallet-cash-badge" aria-hidden="true">Machi</span>
          <span className="tabular-nums" style={{ fontWeight: 700, fontSize: 15 }}>
            MachiEats Cash : ¥500
            {wallet.useWalletCash && (
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--brand-green)' }}>（適用中）</span>
            )}
          </span>
        </div>
      </section>

      {/* Payment Methods List */}
      <section className="wallet-methods-section" aria-labelledby="methods-heading">
        <h2 id="methods-heading" className="wallet-section-h2">お支払い方法</h2>

        <div className="wallet-list" role="radiogroup" aria-label="お支払い方法を選択">
          {wallet.methods.map((m) => {
            const selected = wallet.selectedMethod.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className="wallet-method-row"
                onClick={() => {
                  wallet.selectMethod(m.id);
                  notify(`お支払い方法を「${m.label}」に設定しました`, 'success');
                }}
              >
                <PaymentLogo type={m.type} brand={m.brand} />
                <div className="wallet-method-text">
                  <div className="wallet-method-name">{m.label}</div>
                  {m.promoHint && (
                    <div className="wallet-method-promo">
                      <Tag size={12} aria-hidden="true" />
                      {m.promoHint}
                    </div>
                  )}
                  {m.sublabel && <div className="wallet-method-sub">{m.sublabel}</div>}
                </div>
                {selected && (
                  <span className="wallet-check-circle" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            className="wallet-method-row wallet-add-row"
            onClick={() => setShowAddForm((v) => !v)}
          >
            <span className="wallet-plus-icon" aria-hidden="true">
              <Plus size={18} />
            </span>
            <div className="wallet-method-text">
              <div className="wallet-method-name">お支払い方法を追加</div>
              <div className="wallet-method-sub">クレジットカード・楽天ペイ・d払い</div>
            </div>
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="wallet-add-panel">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                type="button"
                className={`option-pill ${addKind === 'card' ? 'selected' : ''}`}
                onClick={() => setAddKind('card')}
              >
                クレジットカード
              </button>
              <button
                type="button"
                className={`option-pill ${addKind === 'rakuten_pay' ? 'selected' : ''}`}
                onClick={() => setAddKind('rakuten_pay')}
              >
                楽天ペイ
              </button>
              <button
                type="button"
                className={`option-pill ${addKind === 'd_barai' ? 'selected' : ''}`}
                onClick={() => setAddKind('d_barai')}
              >
                d払い
              </button>
            </div>

            {addKind === 'card' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div className="field">
                  <label htmlFor="add-card-brand" className="field-label">カードブランド</label>
                  <select
                    id="add-card-brand"
                    className="select"
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value as 'visa' | 'mastercard' | 'jcb' | 'amex')}
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="jcb">JCB</option>
                    <option value="amex">American Express</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="add-card-last4" className="field-label">下4桁（表示用）</label>
                  <input
                    id="add-card-last4"
                    className="input tabular-nums"
                    maxLength={4}
                    placeholder="7118"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    required
                  />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="add-card-holder" className="field-label">名義人（任意）</label>
                  <input
                    id="add-card-holder"
                    className="input"
                    placeholder="TARO YAMADA"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddForm(false)}>
                キャンセル
              </button>
              <button type="submit" className="btn btn-dark btn-sm">
                追加して選択する
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Vouchers Section */}
      <section className="wallet-vouchers-section" aria-labelledby="vouchers-heading">
        <div className="wallet-balance-top">
          <h2 id="vouchers-heading" className="wallet-section-h2">バウチャー</h2>
          {wallet.voucherCode && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => wallet.setVoucherCode('')}
            >
              適用解除
            </button>
          )}
        </div>
        <div className="wallet-voucher-grid">
          {VOUCHERS.map((v) => {
            const active = wallet.voucherCode === v.code;
            return (
              <button
                key={v.code}
                type="button"
                aria-pressed={active}
                className={`wallet-voucher-card ${active ? 'active' : ''}`}
                onClick={() => {
                  wallet.setVoucherCode(active ? '' : v.code);
                  notify(active ? 'バウチャーを解除しました' : `バウチャー「${v.code}」を適用しました`, 'success');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>{v.title}</strong>
                  <span className="badge badge-partner">{v.code}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{v.desc}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
