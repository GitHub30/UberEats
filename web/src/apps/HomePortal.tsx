import { ShoppingBag, Bike, Store, ShieldCheck, ArrowRight, Receipt, Sparkles, Database } from 'lucide-react';
import { resolveAssetUrl } from '../api/client';
import type { AppRoute } from '../components/AppSwitcher';

export function HomePortal({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  return (
    <main className="portal-wrap animate-fade">
      <section className="portal-hero">
        <div className="portal-hero-copy">
          <span className="portal-hero-eyebrow">Cloudflare Workers + D1 + KV</span>
          <h1>
            街のすべてのお店から、
            <br />
            できたてを玄関先へ。
          </h1>
          <p>
            公式提携レストランはもちろん、デリバリー非提携の町中華や行列ラーメン店も、
            ドライバーが店舗へ足を運び<strong>持ち帰り（テイクアウト）を代理注文</strong>してお届け。
            エンドユーザー・ドライバー・店舗・運営管理の4つのアプリがリアルタイムで連動します。
          </p>
          <div className="portal-hero-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => onNavigate('customer')}>
              <ShoppingBag size={18} />
              注文アプリを試す
            </button>
            <button
              type="button"
              className="btn btn-proxy btn-lg"
              onClick={() => onNavigate('driver')}
            >
              <Bike size={18} />
              ドライバーアプリを開く
            </button>
          </div>
        </div>
        <div className="portal-hero-media">
          <img src={resolveAssetUrl('images/hero.webp')} alt="東京のグルメデリバリー料理" />
        </div>
      </section>

      <div className="portal-section-title">
        <h2>4つの専用アプリケーション</h2>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Database size={14} />
          すべての注文・在庫・レシート画像・チャットは Cloudflare D1 / KV に永続化されます
        </span>
      </div>

      <section className="portal-apps-grid">
        <button type="button" className="portal-app-card" onClick={() => onNavigate('customer')}>
          <div className="portal-app-icon" style={{ background: 'var(--brand-green-soft)', color: 'var(--brand-green)' }}>
            <ShoppingBag size={22} />
          </div>
          <h3>1. エンドユーザー注文アプリ</h3>
          <p>
            提携店舗の注文に加え、非提携の街の名店や掲載外のお店も「持ち帰り代理注文」でリクエスト可能。配達マップ・レシート確認・ドライバーチャット対応。
          </p>
          <span className="portal-app-cta">
            注文アプリへ <ArrowRight size={15} />
          </span>
        </button>

        <button type="button" className="portal-app-card" onClick={() => onNavigate('driver')}>
          <div className="portal-app-icon" style={{ background: '#111417', color: '#10b981' }}>
            <Bike size={22} />
          </div>
          <h3>2. ドライバー配達アプリ</h3>
          <p>
            屋外視認性の高いダークUI。通常配達と高報酬な「店頭代理注文」を受諾し、持ち帰り注文リスト確認・実費入力・レシート写真アップロード・GPS更新を実行。
          </p>
          <span className="portal-app-cta">
            ドライバーアプリへ <ArrowRight size={15} />
          </span>
        </button>

        <button type="button" className="portal-app-card" onClick={() => onNavigate('merchant')}>
          <div className="portal-app-icon" style={{ background: '#fef6e4', color: '#b45309' }}>
            <Store size={22} />
          </div>
          <h3>3. 店舗受注タブレットアプリ</h3>
          <p>
            提携店舗向けPOS画面。新規注文の調理時間指定つき受注・調理完了通知・営業／混雑切替・メニュー追加とワンタップ「売り切れ」同期に対応。
          </p>
          <span className="portal-app-cta">
            店舗受注アプリへ <ArrowRight size={15} />
          </span>
        </button>

        <button type="button" className="portal-app-card" onClick={() => onNavigate('admin')}>
          <div className="portal-app-icon" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-primary)' }}>
            <ShieldCheck size={22} />
          </div>
          <h3>4. 運営管理画面アプリ</h3>
          <p>
            GMV・提携／非提携比率の可視化、全注文のライブ監視、レシート実費監査、未掲載リクエスト店のカタログ昇格・提携切替、配達料や代理手数料の動的設定。
          </p>
          <span className="portal-app-cta">
            管理画面へ <ArrowRight size={15} />
          </span>
        </button>
      </section>

      <section className="proxy-flow-band">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sparkles size={18} color="#c85a17" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#c85a17', letterSpacing: '0.04em' }}>
            PROXY TAKEOUT SYSTEM
          </span>
        </div>
        <h3>非提携店舗でも注文できる「ドライバー店頭持ち帰り代理注文」の仕組み</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b3b1d' }}>
          店舗側へのタブレット導入や加盟契約がなくても、街のあらゆるテイクアウト対応店からデリバリーできます。
        </p>

        <div className="proxy-flow-steps">
          <div className="proxy-flow-step">
            <span className="proxy-step-num">1</span>
            <h4>お店を選んで代理注文</h4>
            <p>
              非提携カタログ店（町中華・行列ラーメンなど）または「未掲載のお店を自由入力」で品切れ時の方針と希望メニューを送信。
            </p>
          </div>
          <div className="proxy-flow-step">
            <span className="proxy-step-num">2</span>
            <h4>代理決済ドライバーが店舗へ</h4>
            <p>
              法人プリペイドカード対応ドライバーへ直接リクエスト（店舗アプリは経由しません）。報酬ボーナス付きで迅速にマッチング。
            </p>
          </div>
          <div className="proxy-flow-step">
            <span className="proxy-step-num">3</span>
            <h4>店頭注文・レシート実費精算</h4>
            <p>
              ドライバーが店頭カウンターや券売機で持ち帰り注文。実費金額とレシート写真をCloudflare KVへ保存し、差額を自動精算。
            </p>
          </div>
          <div className="proxy-flow-step">
            <span className="proxy-step-num">4</span>
            <h4>リアルタイム配達＆完了</h4>
            <p>
              チャットで品切れ相談や到着連絡をしながら玄関先までお届け。お客様・管理画面の双方からレシート証跡を確認できます。
            </p>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-proxy btn-sm" onClick={() => onNavigate('customer')}>
            <Receipt size={15} />
            非提携のお店から注文してみる
          </button>
          <span style={{ fontSize: 12, color: '#7c3208' }}>
            ヒント：上部の「別タブで開く」を使うと、注文アプリとドライバー／店舗アプリを並べてリアルタイム連携を体験できます。
          </span>
        </div>
      </section>
    </main>
  );
}
