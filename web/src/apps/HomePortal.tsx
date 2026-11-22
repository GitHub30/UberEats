import React from 'react';
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
} from 'lucide-react';
import { resolveAssetUrl } from '../api/client';
import { OrderTypeBadge } from '../components/StatusBadge';
import {
  BASE_PATH,
  FAQ_ENTRIES,
  FEATURED_STORES,
  HOWTO_STEPS,
  routeToPath,
  type AppRoute,
} from '../seo/routes';

export function HomePortal({ onNavigate }: { onNavigate: (route: AppRoute, search?: string) => void }) {
  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, route: AppRoute, search = '') => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(route, search);
  };

  return (
    <main className="portal-wrap animate-fade">
      <section className="portal-hero" aria-labelledby="portal-hero-title">
        <div className="portal-hero-copy">
          <span className="portal-hero-eyebrow">PWA • Cloudflare Workers + D1 + KV</span>
          <h1 id="portal-hero-title">
            街のすべてのお店から、
            <br />
            できたてを玄関先へ。
          </h1>
          <p>
            MachiEats（まちイーツ）は、公式提携レストランからの配達に加え、デリバリー非提携の町中華や行列ラーメン店も
            ドライバーが店舗へ足を運び<strong>持ち帰り（テイクアウト）を代理注文・代理決済</strong>してお届けするフードデリバリーPWAです。
          </p>
          <div className="portal-hero-actions">
            <a
              href={routeToPath('customer')}
              className="btn btn-primary btn-lg"
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleLink(e, 'customer')}
            >
              <ShoppingBag size={18} aria-hidden="true" />
              注文アプリを試す
            </a>
            <a
              href={routeToPath('driver')}
              className="btn btn-proxy btn-lg"
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleLink(e, 'driver')}
            >
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
        <h2>4つの専用アプリケーション</h2>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Database size={14} aria-hidden="true" />
          すべての注文・在庫・レシート画像・チャットは Cloudflare D1 / KV に永続化されます
        </span>
      </div>

      <section className="portal-apps-grid" aria-label="4つのアプリケーション一覧">
        <a
          href={routeToPath('customer')}
          className="portal-app-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => handleLink(e, 'customer')}
        >
          <div className="portal-app-icon" style={{ background: 'var(--brand-green-soft)', color: 'var(--brand-green)' }}>
            <ShoppingBag size={22} aria-hidden="true" />
          </div>
          <h3>1. エンドユーザー注文アプリ</h3>
          <p>
            提携店舗の注文に加え、非提携の街の名店や掲載外のお店も「持ち帰り代理注文」でリクエスト可能。配達マップ・レシート確認・ドライバーチャット対応。
          </p>
          <span className="portal-app-cta">
            注文アプリへ <ArrowRight size={15} aria-hidden="true" />
          </span>
        </a>

        <a
          href={routeToPath('driver')}
          className="portal-app-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => handleLink(e, 'driver')}
        >
          <div className="portal-app-icon" style={{ background: '#111417', color: '#10b981' }}>
            <Bike size={22} aria-hidden="true" />
          </div>
          <h3>2. ドライバー配達アプリ</h3>
          <p>
            屋外視認性の高いダークUI。通常配達と高報酬な「店頭代理注文」を受諾し、持ち帰り注文リスト確認・実費入力・レシート写真アップロード・GPS更新を実行。
          </p>
          <span className="portal-app-cta">
            ドライバーアプリへ <ArrowRight size={15} aria-hidden="true" />
          </span>
        </a>

        <a
          href={routeToPath('merchant')}
          className="portal-app-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => handleLink(e, 'merchant')}
        >
          <div className="portal-app-icon" style={{ background: '#fef6e4', color: '#92400e' }}>
            <Store size={22} aria-hidden="true" />
          </div>
          <h3>3. 店舗受注タブレットアプリ</h3>
          <p>
            提携店舗向けPOS画面。新規注文の調理時間指定つき受注・調理完了通知・営業／混雑切替・メニュー追加とワンタップ「売り切れ」同期に対応。
          </p>
          <span className="portal-app-cta">
            店舗受注アプリへ <ArrowRight size={15} aria-hidden="true" />
          </span>
        </a>

        <a
          href={routeToPath('admin')}
          className="portal-app-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => handleLink(e, 'admin')}
        >
          <div className="portal-app-icon" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-primary)' }}>
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <h3>4. 運営管理画面アプリ</h3>
          <p>
            GMV・提携／非提携比率の可視化、全注文のライブ監視、レシート実費監査、未掲載リクエスト店のカタログ昇格・提携切替、配達料や代理手数料の動的設定。
          </p>
          <span className="portal-app-cta">
            管理画面へ <ArrowRight size={15} aria-hidden="true" />
          </span>
        </a>
      </section>

      {/* Featured Restaurants matching ItemList/Restaurant JSON-LD 1:1 */}
      <div className="portal-section-title">
        <h2>注目の掲載レストラン（公式提携・非提携代理持ち帰り）</h2>
        <a
          href={routeToPath('customer')}
          onClick={(e) => handleLink(e, 'customer')}
          style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--brand-green)', textDecoration: 'none' }}
        >
          すべてのお店を見る →
        </a>
      </div>
      <section className="portal-stores-strip" aria-label="掲載レストラン一覧">
        {FEATURED_STORES.map((s) => (
          <a
            key={s.id}
            href={`${routeToPath('customer')}?store=${encodeURIComponent(s.id)}`}
            className="portal-store-mini"
            onClick={(e) => handleLink(e, 'customer', `?store=${encodeURIComponent(s.id)}`)}
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

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={routeToPath('customer')}
            className="btn btn-proxy btn-sm"
            style={{ textDecoration: 'none' }}
            onClick={(e) => handleLink(e, 'customer')}
          >
            <Receipt size={15} aria-hidden="true" />
            非提携のお店から注文してみる
          </a>
          <span style={{ fontSize: 12, color: '#7c3208' }}>
            ヒント：上部の「別タブで開く」を使うと、注文アプリとドライバー／店舗アプリを並べてリアルタイム連携を体験できます。
          </span>
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
                <td><strong>標準料金（デフォルト）</strong></td>
                <td>基本配達料 ¥320 ＋ サービス料 10%</td>
                <td>基本配達料 ¥320 ＋ サービス料 10% ＋ 店頭代理注文手数料 ¥250</td>
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
          <a href={routeToPath('customer')} onClick={(e) => handleLink(e, 'customer')}>注文アプリ</a>
          <a href={routeToPath('driver')} onClick={(e) => handleLink(e, 'driver')}>ドライバー</a>
          <a href={routeToPath('merchant')} onClick={(e) => handleLink(e, 'merchant')}>店舗POS</a>
          <a href={routeToPath('admin')} onClick={(e) => handleLink(e, 'admin')}>管理画面</a>
          <a href={`${BASE_PATH}/llms.txt`}>llms.txt</a>
          <a href={`${BASE_PATH}/llms-full.txt`}>llms-full.txt</a>
          <a href={`${BASE_PATH}/sitemap.xml`}>sitemap.xml</a>
        </nav>
      </footer>
    </main>
  );
}
