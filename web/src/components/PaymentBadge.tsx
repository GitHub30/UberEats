import { useEffect, useState } from 'react';
import type { BillingProfile, PaymentMethodType, PaymentStatus, WalletMethod } from '../types';

export const DEFAULT_WALLET_METHODS: WalletMethod[] = [
  {
    id: 'pm-visa-4919',
    type: 'credit_card',
    brand: 'visa',
    label: 'Visa •••• 4919',
    sublabel: 'クレジットカード（即時決済）',
  },
  {
    id: 'pm-cash',
    type: 'cash',
    label: '現金',
    sublabel: '配達時にドライバーへ現金でお支払い',
  },
  {
    id: 'pm-paypay',
    type: 'paypay',
    label: 'PayPay',
    promoHint: 'PayPayポイント 0.5%以上付与予定',
  },
  {
    id: 'pm-suica',
    type: 'suica',
    label: 'モバイルSuica / 交通系IC',
    promoHint: 'Suica・PASMO・ICOCA タッチ決済対応',
  },
  {
    id: 'pm-apple-pay',
    type: 'apple_pay',
    label: 'Apple Pay',
    sublabel: 'Face ID / Touch ID でワンタップ決済',
  },
];

export const VOUCHERS = [
  { code: 'WELCOME500', title: '初回 ¥500 OFF バウチャー', desc: '商品小計 ¥1,000 以上で適用', amount: 500 },
  { code: 'PROXY250', title: '非提携・店頭代理手数料 無料', desc: '非提携店舗の持ち帰り代理注文で ¥250 OFF', amount: 250 },
  { code: 'PAYPAY100', title: 'PayPay 決済 ¥100 OFF', desc: 'お支払い方法に PayPay 選択時', amount: 100 },
  { code: 'SUICA100', title: 'Suica 決済 ¥100 OFF', desc: 'お支払い方法に モバイルSuica 選択時', amount: 100 },
];

export function paymentMethodDisplay(method: PaymentMethodType | string): string {
  switch (method) {
    case 'credit_card':
      return 'クレジットカード';
    case 'cash':
      return '現金（代引き）';
    case 'paypay':
      return 'PayPay';
    case 'suica':
      return 'モバイルSuica';
    case 'apple_pay':
      return 'Apple Pay';
    case 'rakuten_pay':
      return '楽天ペイ';
    case 'd_barai':
      return 'd払い';
    default:
      return String(method);
  }
}

export function paymentStatusDisplay(status?: PaymentStatus | string): string {
  switch (status) {
    case 'paid':
      return '事前決済済';
    case 'cash_on_delivery':
      return '現金回収待ち';
    case 'cash_collected':
      return '現金受領済';
    case 'refunded':
      return '返金済';
    default:
      return '決済済';
  }
}

export function PaymentLogo({ type, brand }: { type: PaymentMethodType | string; brand?: string }) {
  if (type === 'cash') {
    return (
      <span className="pm-logo pm-logo-cash" aria-hidden="true">
        ¥
      </span>
    );
  }
  if (type === 'paypay') {
    return (
      <span className="pm-logo pm-logo-paypay" aria-hidden="true">
        P
      </span>
    );
  }
  if (type === 'suica') {
    return (
      <span className="pm-logo pm-logo-suica" aria-hidden="true">
        IC
      </span>
    );
  }
  if (type === 'apple_pay') {
    return (
      <span className="pm-logo pm-logo-apple" aria-hidden="true">
        Pay
      </span>
    );
  }
  if (type === 'rakuten_pay') {
    return (
      <span className="pm-logo pm-logo-rakuten" aria-hidden="true">
        R
      </span>
    );
  }
  if (type === 'd_barai') {
    return (
      <span className="pm-logo pm-logo-dbarai" aria-hidden="true">
        d
      </span>
    );
  }
  const text =
    brand === 'mastercard' ? 'MC' : brand === 'jcb' ? 'JCB' : brand === 'amex' ? 'AMEX' : 'VISA';
  const cls =
    brand === 'mastercard'
      ? 'pm-logo-mc'
      : brand === 'jcb'
      ? 'pm-logo-jcb'
      : 'pm-logo-visa';
  return (
    <span className={`pm-logo ${cls}`} aria-hidden="true">
      {text}
    </span>
  );
}

export function PaymentBadge({
  method,
  label,
  status,
  dark = false,
}: {
  method: PaymentMethodType | string;
  label?: string;
  status?: PaymentStatus | string;
  dark?: boolean;
}) {
  const isCash = method === 'cash';
  const text = label || paymentMethodDisplay(method);
  const st = status ? `・${paymentStatusDisplay(status)}` : '';
  return (
    <span
      className="badge"
      style={{
        background: isCash
          ? dark
            ? 'rgba(245, 158, 11, 0.22)'
            : '#fef3c7'
          : dark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'var(--bg-subtle)',
        color: isCash
          ? dark
            ? '#fcd34d'
            : '#92400e'
          : dark
          ? '#e5e7eb'
          : 'var(--ink-primary)',
        border: isCash ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
      }}
    >
      <PaymentLogo type={method} />
      <span>
        {text}
        {st}
      </span>
    </span>
  );
}

const STORAGE_KEY = 'machieats_wallet_v1';

interface PersistedWallet {
  methods: WalletMethod[];
  selectedId: string;
  billingProfile: BillingProfile;
  useWalletCash: boolean;
  voucherCode: string;
}

function loadWallet(): PersistedWallet {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedWallet>;
      if (Array.isArray(parsed.methods) && parsed.methods.length > 0) {
        return {
          methods: parsed.methods,
          selectedId: parsed.selectedId || parsed.methods[0].id,
          billingProfile: parsed.billingProfile === 'business' ? 'business' : 'personal',
          useWalletCash: Boolean(parsed.useWalletCash),
          voucherCode: typeof parsed.voucherCode === 'string' ? parsed.voucherCode : '',
        };
      }
    }
  } catch {
    // ignore storage restriction
  }
  return {
    methods: DEFAULT_WALLET_METHODS,
    selectedId: DEFAULT_WALLET_METHODS[0].id,
    billingProfile: 'personal',
    useWalletCash: false,
    voucherCode: '',
  };
}

export function usePaymentWallet() {
  const [wallet, setWallet] = useState<PersistedWallet>(() => loadWallet());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
    } catch {
      // ignore storage restriction
    }
  }, [wallet]);

  const selectedMethod =
    wallet.methods.find((m) => m.id === wallet.selectedId) || wallet.methods[0] || DEFAULT_WALLET_METHODS[0];

  const selectMethod = (id: string) => setWallet((w) => ({ ...w, selectedId: id }));
  const setBillingProfile = (billingProfile: BillingProfile) => setWallet((w) => ({ ...w, billingProfile }));
  const toggleWalletCash = () => setWallet((w) => ({ ...w, useWalletCash: !w.useWalletCash }));
  const setVoucherCode = (voucherCode: string) => setWallet((w) => ({ ...w, voucherCode }));

  const addMethod = (method: WalletMethod) => {
    setWallet((w) => {
      const exists = w.methods.find((m) => m.id === method.id);
      if (exists) return { ...w, selectedId: exists.id };
      return {
        ...w,
        methods: [...w.methods, method],
        selectedId: method.id,
      };
    });
  };

  return {
    methods: wallet.methods,
    selectedMethod,
    billingProfile: wallet.billingProfile,
    useWalletCash: wallet.useWalletCash,
    voucherCode: wallet.voucherCode,
    selectMethod,
    setBillingProfile,
    toggleWalletCash,
    setVoucherCode,
    addMethod,
  };
}

export function previewDiscount(
  voucherCode: string,
  useWalletCash: boolean,
  subtotal: number,
  proxyFee: number,
  paymentMethod: PaymentMethodType
): number {
  const code = voucherCode.trim().toUpperCase();
  let d = 0;
  if (code === 'WELCOME500' && subtotal >= 1000) d += 500;
  else if (code === 'PROXY250' && proxyFee > 0) d += proxyFee;
  else if (code === 'PAYPAY100' && paymentMethod === 'paypay') d += 100;
  else if (code === 'SUICA100' && paymentMethod === 'suica') d += 100;
  if (useWalletCash) d += 500;
  return Math.min(d, subtotal + proxyFee);
}
