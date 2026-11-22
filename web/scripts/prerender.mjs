import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const SCHEMA_DATA = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/seo/schemaData.json'), 'utf8')
);

const SITE_ORIGIN = SCHEMA_DATA.siteOrigin;
const BASE_PATH = SCHEMA_DATA.basePath;
const FAQS = SCHEMA_DATA.faqs;
const FEATURED_STORES = SCHEMA_DATA.featuredStores;
const HOWTO_STEPS = SCHEMA_DATA.howToSteps;

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeJsonLdString(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function buildJsonLd(routeKey, meta) {
  const homeUrl = `${SITE_ORIGIN}${BASE_PATH}/`;
  const customerUrl = `${SITE_ORIGIN}${BASE_PATH}/customer/`;
  const canonical = `${SITE_ORIGIN}${meta.path}`;

  const graph = [
    {
      '@type': 'Organization',
      '@id': `${homeUrl}#organization`,
      name: 'MachiEats',
      url: homeUrl,
      logo: `${SITE_ORIGIN}${BASE_PATH}/icons/icon-512.png`,
      description:
        '公式提携店と非提携店舗（ドライバー店頭持ち帰り代理注文）の両方に対応するフードデリバリーPWA',
    },
    {
      '@type': 'WebSite',
      '@id': `${homeUrl}#website`,
      name: 'MachiEats',
      url: homeUrl,
      inLanguage: 'ja',
      publisher: { '@id': `${homeUrl}#organization` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${canonical}#webapp`,
      name: meta.title,
      url: canonical,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web, iOS, Android',
      inLanguage: 'ja',
      isAccessibleForFree: true,
      description: meta.description,
      publisher: { '@id': `${homeUrl}#organization` },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'JPY',
      },
    },
    {
      '@type': 'Service',
      '@id': `${homeUrl}#delivery-service`,
      name: 'MachiEats 公式提携＆非提携店頭持ち帰り代理注文デリバリー',
      serviceType: 'Food Delivery & Takeout Proxy Service',
      provider: { '@id': `${homeUrl}#organization` },
      areaServed: ['渋谷区', '目黒区', '港区', '東京都'],
      description:
        '公式提携レストランからの配達および、非提携飲食店のテイクアウトをドライバーが店頭で代理注文・レシート実費精算してお届けするサービス。',
      offers: {
        '@type': 'Offer',
        price: '320',
        priceCurrency: 'JPY',
        description: '基本配達料 ¥320（非提携店舗の店頭代理注文手数料 ¥250・サービス料 10%）',
      },
    },
  ];

  if (routeKey !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'MachiEats ホーム', item: homeUrl },
        { '@type': 'ListItem', position: 2, name: meta.breadcrumb, item: canonical },
      ],
    });
  }

  if (routeKey === 'home' || routeKey === 'customer') {
    graph.push({
      '@type': 'ItemList',
      name: 'MachiEats 掲載レストラン一覧（公式提携・非提携代理持ち帰り）',
      itemListElement: FEATURED_STORES.map((s, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${customerUrl}?store=${encodeURIComponent(s.id)}`,
        item: {
          '@type': 'Restaurant',
          name: s.name,
          url: `${customerUrl}?store=${encodeURIComponent(s.id)}`,
          image: `${SITE_ORIGIN}${BASE_PATH}/${s.image}`,
          servesCuisine: s.cuisine,
          priceRange: s.priceRange,
          address: {
            '@type': 'PostalAddress',
            streetAddress: s.streetAddress,
            addressLocality: s.locality,
            addressRegion: '東京都',
            addressCountry: 'JP',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: s.rating,
            reviewCount: s.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        },
      })),
    });

    graph.push({
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }

  if (routeKey === 'home') {
    graph.push({
      '@type': 'HowTo',
      name: '非提携店舗の持ち帰り（テイクアウト）をドライバー代理注文で頼む手順',
      description:
        'デリバリー未加盟の飲食店でも、MachiEatsドライバーが店頭で持ち帰り注文・代理決済して配達する4ステップ。',
      totalTime: 'PT35M',
      step: HOWTO_STEPS.map((st, idx) => ({
        '@type': 'HowToStep',
        position: idx + 1,
        name: st.name,
        text: st.text,
      })),
    });
  }

  return safeJsonLdString({ '@context': 'https://schema.org', '@graph': graph });
}

function buildRouteBody(routeKey, meta) {
  let extra = '';
  if (routeKey === 'home') {
    extra = `
      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading">掲載レストラン（公式提携店・非提携代理持ち帰り対応店）</h2>
        <ul>
          ${FEATURED_STORES.map(
            (s) =>
              `<li><a href="${BASE_PATH}/customer/?store=${encodeURIComponent(s.id)}"><strong>${escapeHtml(s.name)}</strong></a>（${escapeHtml(s.area)}・${escapeHtml(s.cuisine)}・★${s.rating}）— ${
                s.partner ? '公式提携店' : '非提携・店頭持ち帰り代理注文対応'
              } / ${escapeHtml(s.priceRange)}</li>`
          ).join('')}
        </ul>
      </section>
      <section aria-labelledby="howto-heading">
        <h2 id="howto-heading">非提携店舗の持ち帰り代理注文の流れ</h2>
        <ol>
          ${HOWTO_STEPS.map((st) => `<li><strong>${escapeHtml(st.name)}</strong>：${escapeHtml(st.text)}</li>`).join('')}
        </ol>
      </section>
      <section aria-labelledby="compare-heading">
        <h2 id="compare-heading">公式提携デリバリー vs 非提携・店頭持ち帰り代理注文の比較</h2>
        <table>
          <thead><tr><th>比較項目</th><th>公式提携店デリバリー</th><th>非提携・店頭持ち帰り代理注文</th></tr></thead>
          <tbody>
            <tr><td>店舗タブレット・加盟契約</td><td>必要（店舗受注アプリで承認）</td><td>不要（ドライバーへ直接配信）</td></tr>
            <tr><td>標準料金</td><td>配達料 ¥320 ＋ サービス料 10%</td><td>配達料 ¥320 ＋ サービス料 10% ＋ 代理注文手数料 ¥250</td></tr>
            <tr><td>価格とレシート精算</td><td>サーバー側DB価格で確定</td><td>レシート写真（Cloudflare KV）と実費で自動精算</td></tr>
            <tr><td>掲載外のお店のリクエスト</td><td>非対応</td><td>対応（店名・住所・希望メニュー自由入力）</td></tr>
          </tbody>
        </table>
      </section>
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading">よくある質問（FAQ）</h2>
        ${FAQS.map((f) => `<details open><summary>${escapeHtml(f.question)}</summary><p>${escapeHtml(f.answer)}</p></details>`).join('')}
      </section>
    `;
  } else if (routeKey === 'customer') {
    extra = `
      <section aria-labelledby="stores-heading">
        <h2 id="stores-heading">掲載レストラン一覧（提携店・非提携代理持ち帰り対応店）</h2>
        <ul>
          ${FEATURED_STORES.map(
            (s) =>
              `<li><strong>${escapeHtml(s.name)}</strong>（${escapeHtml(s.area)}・${escapeHtml(s.cuisine)}・★${s.rating}）— ${
                s.partner ? '公式提携店' : '非提携・店頭持ち帰り代理注文対応'
              } / ${escapeHtml(s.priceRange)}</li>`
          ).join('')}
        </ul>
      </section>
      <section aria-labelledby="faq-customer">
        <h2 id="faq-customer">注文・代理購入に関するよくある質問</h2>
        ${FAQS.map((f) => `<details open><summary>${escapeHtml(f.question)}</summary><p>${escapeHtml(f.answer)}</p></details>`).join('')}
      </section>
    `;
  }

  return `
    <div data-prerendered="true" style="max-width:1200px;margin:0 auto;padding:24px 20px;font-family:'Noto Sans JP',sans-serif;color:#141413;line-height:1.65">
      <header style="border-bottom:1px solid #e5e2d9;padding-bottom:12px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between">
        <a href="${BASE_PATH}/" style="font-weight:800;font-size:18px;color:#047843;text-decoration:none">MachiEats</a>
        <nav aria-label="主要ナビゲーション" style="display:flex;gap:14px;flex-wrap:wrap;font-size:14px">
          <a href="${BASE_PATH}/">総合ポータル</a>
          <a href="${BASE_PATH}/customer/">注文アプリ</a>
          <a href="${BASE_PATH}/driver/">ドライバーアプリ</a>
          <a href="${BASE_PATH}/merchant/">店舗受注アプリ</a>
          <a href="${BASE_PATH}/admin/">管理画面</a>
        </nav>
      </header>
      <main>
        <h1>${escapeHtml(meta.h1)}</h1>
        <p>${escapeHtml(meta.lead)}</p>
        ${extra}
      </main>
      <footer style="margin-top:36px;padding-top:16px;border-top:1px solid #e5e2d9;font-size:12px;color:#66635c">
        <p>MachiEats — GitHub Pages PWA + Cloudflare Workers / D1 / KV | <a href="${BASE_PATH}/llms.txt">llms.txt</a> | <a href="${BASE_PATH}/llms-full.txt">llms-full.txt</a> | <a href="${BASE_PATH}/sitemap.xml">sitemap.xml</a></p>
      </footer>
    </div>
  `.trim();
}

const templatePath = path.join(DIST_DIR, 'index.html');
const templateHtml = fs.readFileSync(templatePath, 'utf8');
if (!templateHtml.includes('<!-- ROUTE_META_PLACEHOLDER -->')) {
  throw new Error('dist/index.html is missing <!-- ROUTE_META_PLACEHOLDER -->. Run vite build first.');
}

const ogImage = `${SITE_ORIGIN}${BASE_PATH}/og-image.jpg`;
const ogAlt = 'MachiEats — 和牛バーガー・江戸前寿司・濃厚ラーメン・羽根つき餃子・宇治抹茶ラテのデリバリー食卓';

for (const [routeKey, meta] of Object.entries(SCHEMA_DATA.routes)) {
  const canonical = `${SITE_ORIGIN}${meta.path}`;
  const jsonLd = buildJsonLd(routeKey, meta);
  const preloadHero =
    routeKey === 'home' || routeKey === 'customer'
      ? `<link rel="preload" as="image" href="${BASE_PATH}/images/hero.webp" type="image/webp" fetchpriority="high" />`
      : '';

  const headInject = [
    preloadHero,
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="alternate" hreflang="ja" href="${canonical}" />`,
    `<link rel="alternate" hreflang="x-default" href="${canonical}" />`,
    `<link rel="alternate" type="text/plain" title="LLMs.txt" href="${SITE_ORIGIN}${BASE_PATH}/llms.txt" />`,
    `<meta property="og:site_name" content="MachiEats" />`,
    `<meta property="og:locale" content="ja_JP" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(ogAlt)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(ogAlt)}" />`,
    `<script id="route-jsonld" data-route="${routeKey}" type="application/ld+json">${jsonLd}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  const html = templateHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`
    )
    .replace('<!-- ROUTE_META_PLACEHOLDER -->', headInject)
    .replace('<div id="root"></div>', `<div id="root">${buildRouteBody(routeKey, meta)}</div>`);

  const outPath = path.join(DIST_DIR, meta.outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Prerendered ${meta.outRel} -> ${canonical}`);
}

// 1. Inject Vite hashed assets & deterministic build hash into dist/sw.js for first-visit offline PWA reliability
const assetsDir = path.join(DIST_DIR, 'assets');
const assetFiles = fs.existsSync(assetsDir)
  ? fs
      .readdirSync(assetsDir)
      .filter((f) => /\.(js|css)$/.test(f))
      .sort()
      .map((f) => `${BASE_PATH}/assets/${f}`)
  : [];
const buildVersion = crypto
  .createHash('sha256')
  .update(assetFiles.join('|'))
  .digest('hex')
  .slice(0, 10);

const swPath = path.join(DIST_DIR, 'sw.js');
let swCode = fs.readFileSync(swPath, 'utf8');
swCode = swCode
  .replace(/__BUILD_VERSION__/g, buildVersion)
  .replace('/* __VITE_ASSETS__ */', assetFiles.map((u) => `'${u}'`).join(',\n  '));
fs.writeFileSync(swPath, swCode, 'utf8');
console.log(`Injected ${assetFiles.length} hashed assets + version ${buildVersion} into dist/sw.js`);

// 2. Dynamically regenerate sitemap.xml with current build date
const today = new Date().toISOString().slice(0, 10);
const priorities = { home: '1.0', customer: '0.95', driver: '0.85', merchant: '0.85', admin: '0.70' };
const freq = { home: 'daily', customer: 'daily', driver: 'weekly', merchant: 'weekly', admin: 'weekly' };
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.entries(SCHEMA_DATA.routes)
  .map(
    ([key, meta]) => `  <url>
    <loc>${SITE_ORIGIN}${meta.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq[key]}</changefreq>
    <priority>${priorities[key]}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
console.log(`Generated dist/sitemap.xml (lastmod=${today})`);

// 3. Clean case-insensitive non-hash 404.html fallback preserving query string
const notFoundHtml = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ページを移動しています — MachiEats</title>
    <meta name="robots" content="noindex" />
    <script>
      (function () {
        var p = window.location.pathname;
        var s = window.location.search || '';
        var lower = p.toLowerCase();
        var baseLower = '${BASE_PATH.toLowerCase()}';
        if (lower === baseLower || lower.indexOf(baseLower + '/') === 0) {
          try { sessionStorage.setItem('machieats_redirect_path', p + s); } catch (e) {}
          window.location.replace('${BASE_PATH}/');
        }
      })();
    </script>
  </head>
  <body>
    <main style="max-width:520px;margin:64px auto;padding:24px;font-family:sans-serif;text-align:center">
      <h1>MachiEats へ移動しています</h1>
      <p>自動的に切り替わらない場合は以下からお選びください。</p>
      <p>
        <a href="${BASE_PATH}/">ホーム</a> |
        <a href="${BASE_PATH}/customer/">注文アプリ</a> |
        <a href="${BASE_PATH}/driver/">ドライバーアプリ</a> |
        <a href="${BASE_PATH}/merchant/">店舗受注アプリ</a> |
        <a href="${BASE_PATH}/admin/">管理画面</a>
      </p>
    </main>
  </body>
</html>
`;
fs.writeFileSync(path.join(DIST_DIR, '404.html'), notFoundHtml, 'utf8');
console.log('Generated case-insensitive clean 404.html fallback');
