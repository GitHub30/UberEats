import {
  ShoppingBag,
  Bike,
  Store,
  ShieldCheck,
  ArrowRight,
  Receipt,
  Sparkles,
  Database,
  HelpCircle,
  Star,
  Download,
} from 'lucide-react';
import { resolveAssetUrl } from '../api/client';
import { OrderTypeBadge } from '../components/StatusBadge';
import { PaymentLogo } from '../components/PaymentBadge';
import {
  BASE_PATH,
  FAQ_ENTRIES,
  FEATURED_STORES,
  HOWTO_STEPS,
  routeToPath,
} from '../seo/routes';

interface HomePortalProps {
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
}

export function HomePortal({ canInstallPwa, onInstallPwa }: HomePortalProps) {
  return (
    <main className="portal-wrap animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 18 }}>
          <span className="switcher-brand-mark" aria-hidden="true">M</span>
          <span>MachiEats プラットフォーム</span>
        </div>
        {canInstallPwa && onInstallPwa && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onInstallPwa}>
            <Download size={14} aria-hidden="true" />
            ポータルをPWA追加
          </button>
        )}
      </div>

      <section className="portal-hero" aria-labelledby="portal-hero-title">
        <div className="portal-hero-copy">
          <span className="portal-hero-eyebrow">4 Independent PWAs • Cloudflare D1 + KV</span>
          <h1 id="portal-hero-title">
            街のすべてのお店から、
            <br />
            できたてを玄関先へ。
          </h1>
          <p>
            公式提携レストランからの配達に加え、デリバリー非提携の町中華や行列ラーメン店も
            ドライバーが店舗へ足を運び<strong>持ち帰り（テイクアウト）を代理注文</strong>してお届け。
            注文・ドライバー・店舗受注・管理画面はそれぞれ独立したPWAアプリとして起動・インストールできます。
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <PaymentLogo type="credit_card" brand="visa" />
            <PaymentLogo type="cash" />
            <PaymentLogo type="paypay" />
            <PaymentLogo type="suica" />
            <PaymentLogo type="apple_pay" />
            <span style={{ fontSize: 12, color: '#d6d3cb', fontWeight: 700 }}>現金・クレカ・PayPay・Suica対応</span>
          </div>
          <div className="portal-hero-actions">
            <a href={routeToPath('customer')} className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
              <ShoppingBag size={18} aria-hidden="true" />
              注文アプリを開く
            </a>
            <a href={routeToPath('driver')} className="btn btn-proxy btn-lg" style={{ textDecoration: 'none' }}>
              <Bike size={18} aria-hidden="true" />
              ドライバーアプリを開く
            </a>
          </div>
        </div>
        <div className="portal-hero-media">
          <img
            src={resolveAssetUrl('images/hero.webp')}
            alt="東京のグルメデリバリー料理（和牛バーガー、江戸前寿司、濃厚ラーメン、羽根つき餃子、宇治抹茶ラテ）"
            width={1376}
            height={768}
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </section>

      <div className="portal-section-title">
        <h2>4つの独立した専用PWAアプリ</h2>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Database size={14} aria-hidden="true" />
          各アプリは共通ヘッダーなしで独立稼働し、Cloudflare D1 / KV を通じてリアルタイム連動します
        </span>
      </div>

      <section className="portal-apps-grid" aria-label="4つの独立アプリケーション一覧">
        <a href={routeToPath('customer')} className="portal-app-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="portal-app-icon" style={{ background: 'var(--brand-green-soft)', color: 'var(--brand-green)' }}>
            <ShoppingBag size={22} aria-hidden="true" />
          </div>
          <h3>1. エンドユーザー注文アプリ</h3>
          <p>
            提携店・非提携（持ち帰り代理注文）・掲載外店舗リクエスト対応。現金・クレジットカード・PayPay・Suica・バウチャー決済とリアルタイム配達追跡。
          </p>
          <span className="portal-app-cta">
            /customer/ を開く <ArrowRight size={15} aria-hidden="true" />
          </span>
        </a>

        <a href={routeToPath('driver')} className="portal-app-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="portal-app-icon" style={{ background: '#111417', color: '#10b981' }}>
            <Bike size={22} aria-hidden="true" />
          </div>
          <h3>2. ドライバー配達アプリ</h3>
          <p>
            屋外高視認ダークUIの独立PWA。通常配達・高報酬な店頭代理注文の受諾、レシートKV保存、現金代引き回収、GPS位置更新に対応。
          </p>
          <span className="portal-app-cta">
            /driver/ を開く <ArrowRight size={15} aria-hidden="true" />
          </span>
        </a>

        <a href={routeToPath('merchant')} className="portal-app-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="portal-app-icon" style={{ background: '#fef6e4', color: '#92400e' }}>
            <Store size={22} aria-hidden="true" />
          </div>
          <h3>3. 店舗受注タブレットアプリ</h3>
          <p>
            公式提携店舗専用POSアプリ。調理時間指定受注・調理完了通知・決済種別確認・営業／混雑切替・ワンタップ売り切れ同期。
          </p>
          <span className="portal-app-cta">
            /merchant/ を開く <ArrowRight size={15} aria-hidden="true" />
          </span>
        </a>

        <a href={routeToPath('admin')} className="portal-app-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="portal-app-icon" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-primary)' }}>
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <h3>4. 運営管理画面アプリ</h3>
          <p>
            GMV・決済手段別比率の分析、全注文ライブ監視、レシート監査、未掲載リクエスト店の提携昇格、配達料・代理手数料の動的設定。
          </p>
          <span className="portal-app-cta">
            /admin/ を開く <ArrowRight size={15} aria-hidden="true" />
          </span>
        </a>
      </section>

      <div className="portal-section-title">
        <h2>注目の掲載レストラン（公式提携・非提携代理持ち帰り）</h2>
        <a
          href={routeToPath('customer')}
          style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--brand-green)', textDecoration: 'none' }}
        >
          注文アプリで全店舗を見る →
        </a>
      </div>
      <section className="portal-stores-strip" aria-label="掲載レストラン一覧">
        {FEATURED_STORES.map((s) => (
          <a
            key={s.id}
            href={`${routeToPath('customer')}?store=${encodeURIComponent(s.id)}`}
            className="portal-store-mini"
          >
            <img
              src={resolveAssetUrl(s.image)}
              alt={`${s.name}（${s.area}・${s.cuisine}）`}
              width={800}
              height={597}
              loading="lazy"
            />
            <div className="portal-store-mini-body">
              <OrderTypeBadge isPartner={s.partner} />
              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 2 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{s.area}・{s.cuisine}</span>
                <span className="tabular-nums" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 700, color: 'var(--ink-primary)' }}>
                  <Star size={11} fill="#d97706" color="#d97706" aria-hidden="true" />
                  {s.rating.toFixed(1)}（{s.reviewCount}）
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{s.priceRange}</div>
            </div>
          </a>
        ))}
      </section>

      <section className="proxy-flow-band" aria-labelledby="proxy-flow-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sparkles size={18} color="#b34d0e" aria-hidden="true" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#923d0a', letterSpacing: '0.04em' }}>
            PROXY TAKEOUT SYSTEM
          </span>
        </div>
        <h2 id="proxy-flow-heading">
          非提携店舗でも注文できる「ドライバー店頭持ち帰り代理注文」の仕組み
        </h2>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b3b1d' }}>
          店舗側へのタブレット導入や加盟契約がなくても、街のあらゆるテイクアウト対応店からデリバリーできます。
        </p>

        <div className="proxy-flow-steps">
          {HOWTO_STEPS.map((st, idx) => (
            <div key={st.name} className="proxy-flow-step">
              <span className="proxy-step-num">{idx + 1}</span>
              <h3>{st.name}</h3>
              <p>{st.text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <a href={routeToPath('customer')} className="btn btn-proxy btn-sm" style={{ textDecoration: 'none' }}>
            <Receipt size={15} aria-hidden="true" />
            注文アプリで非提携店を頼んでみる
          </a>
        </div>
      </section>

      <section className="compare-table-card" aria-labelledby="compare-table-heading">
        <h2 id="compare-table-heading">公式提携デリバリー vs 非提携・店頭持ち帰り代理注文の比較</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>比較項目</th>
                <th>公式提携店デリバリー</th>
                <th>非提携・店頭持ち帰り代理注文（Order &amp; Pay）</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>店舗タブレット・加盟契約</strong></td>
                <td>必要（店舗受注アプリで承認・調理完了）</td>
                <td>不要（店舗アプリを経由せずドライバーへ直接配信）</td>
              </tr>
              <tr>
                <td><strong>店頭での注文方法</strong></td>
                <td>アプリからキッチンPOSへ自動送信</td>
                <td>ドライバーが店頭カウンター・券売機で持ち帰り購入</td>
              </tr>
              <tr>
                <td><strong>対応決済手段</strong></td>
                <td colSpan={2}>現金（代引き）・クレジットカード（Visa/Mastercard/JCB/Amex）・PayPay・モバイルSuica・Apple Pay・楽天ペイ・d払い</td>
              </tr>
              <tr>
                <td><strong>価格確定・レシート証跡</strong></td>
                <td>サーバー側メニュー価格で即時確定</td>
                <td>目安額で仮計算 → 購入後にCloudflare KVレシート写真と実費で自動精算</td>
              </tr>
              <tr>
                <td><strong>掲載外のお店への注文</strong></td>
                <td>非対応</td>
                <td>対応（店名・住所・希望メニューを自由入力して依頼可能）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="faq-section" aria-labelledby="faq-section-heading">
        <div className="portal-section-title" style={{ marginTop: 36 }}>
          <h2 id="faq-section-heading" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={20} color="#047843" aria-hidden="true" />
            よくある質問（FAQ）
          </h2>
        </div>
        <div className="faq-list">
          {FAQ_ENTRIES.map((faq) => (
            <details key={faq.question} className="faq-item">
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <strong>MachiEats</strong> — 渋谷・恵比寿・中目黒・代官山・表参道・六本木対応フードデリバリーPWA（Cloudflare Workers / D1 / KV）
        </div>
        <nav className="site-footer-links" aria-label="フッターリンク">
          <a href={routeToPath('customer')}>注文アプリ</a>
          <a href={routeToPath('driver')}>ドライバー</a>
          <a href={routeToPath('merchant')}>店舗POS</a>
          <a href={routeToPath('admin')}>管理画面</a>
          <a href={`${BASE_PATH}/llms.txt`}>llms.txt</a>
          <a href={`${BASE_PATH}/llms-full.txt`}>llms-full.txt</a>
          <a href={`${BASE_PATH}/sitemap.xml`}>sitemap.xml</a>
        </nav>
      </footer>
    </main>
  );
}
