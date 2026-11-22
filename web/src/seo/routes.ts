import schemaData from './schemaData.json';

export type AppRoute = 'home' | 'customer' | 'driver' | 'merchant' | 'admin';

export const SITE_ORIGIN = schemaData.siteOrigin;
export const BASE_PATH = schemaData.basePath;
export const FAQ_ENTRIES = schemaData.faqs;
export const FEATURED_STORES = schemaData.featuredStores;
export const HOWTO_STEPS = schemaData.howToSteps;

export interface RouteMeta {
  route: AppRoute;
  path: string;
  canonical: string;
  title: string;
  description: string;
  breadcrumbName: string;
}

export const ROUTE_META: Record<AppRoute, RouteMeta> = {
  home: {
    route: 'home',
    path: schemaData.routes.home.path,
    canonical: `${SITE_ORIGIN}${schemaData.routes.home.path}`,
    title: schemaData.routes.home.title,
    description: schemaData.routes.home.description,
    breadcrumbName: schemaData.routes.home.breadcrumb,
  },
  customer: {
    route: 'customer',
    path: schemaData.routes.customer.path,
    canonical: `${SITE_ORIGIN}${schemaData.routes.customer.path}`,
    title: schemaData.routes.customer.title,
    description: schemaData.routes.customer.description,
    breadcrumbName: schemaData.routes.customer.breadcrumb,
  },
  driver: {
    route: 'driver',
    path: schemaData.routes.driver.path,
    canonical: `${SITE_ORIGIN}${schemaData.routes.driver.path}`,
    title: schemaData.routes.driver.title,
    description: schemaData.routes.driver.description,
    breadcrumbName: schemaData.routes.driver.breadcrumb,
  },
  merchant: {
    route: 'merchant',
    path: schemaData.routes.merchant.path,
    canonical: `${SITE_ORIGIN}${schemaData.routes.merchant.path}`,
    title: schemaData.routes.merchant.title,
    description: schemaData.routes.merchant.description,
    breadcrumbName: schemaData.routes.merchant.breadcrumb,
  },
  admin: {
    route: 'admin',
    path: schemaData.routes.admin.path,
    canonical: `${SITE_ORIGIN}${schemaData.routes.admin.path}`,
    title: schemaData.routes.admin.title,
    description: schemaData.routes.admin.description,
    breadcrumbName: schemaData.routes.admin.breadcrumb,
  },
};

export function parseRouteFromPathname(rawInput: string): AppRoute {
  const pathOnly = rawInput.split(/[?#]/)[0] || '/';
  let rel = pathOnly;
  const lower = pathOnly.toLowerCase();
  const baseLower = BASE_PATH.toLowerCase();
  if (lower === baseLower || lower.startsWith(`${baseLower}/`)) {
    rel = pathOnly.slice(BASE_PATH.length);
  }
  const segment = rel.replace(/^\/+|\/+$/g, '').split('/')[0]?.toLowerCase() || '';
  if (segment === 'customer' || segment === 'driver' || segment === 'merchant' || segment === 'admin') {
    return segment;
  }
  return 'home';
}

export function routeToPath(route: AppRoute): string {
  return ROUTE_META[route].path;
}

export function buildRouteJsonLd(route: AppRoute) {
  const meta = ROUTE_META[route];
  const homeUrl = `${SITE_ORIGIN}${BASE_PATH}/`;
  const customerUrl = `${SITE_ORIGIN}${BASE_PATH}/customer/`;

  const graph: Record<string, unknown>[] = [
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
      '@id': `${meta.canonical}#webapp`,
      name: meta.title,
      url: meta.canonical,
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

  // Emit BreadcrumbList only when >= 2 items (Google Rich Results requirement)
  if (route !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'MachiEats ホーム', item: homeUrl },
        { '@type': 'ListItem', position: 2, name: meta.breadcrumbName, item: meta.canonical },
      ],
    });
  }

  if (route === 'home' || route === 'customer') {
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
      mainEntity: FAQ_ENTRIES.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }

  if (route === 'home') {
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

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(selector: string, attrs: Record<string, string>) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
}

export function applyRouteHead(route: AppRoute) {
  const meta = ROUTE_META[route];
  document.title = meta.title;
  upsertMeta('name', 'description', meta.description);
  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', meta.description);
  upsertMeta('property', 'og:url', meta.canonical);
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', meta.description);

  upsertLink('link[rel="canonical"]', { rel: 'canonical', href: meta.canonical });
  upsertLink('link[rel="alternate"][hreflang="ja"]', {
    rel: 'alternate',
    hreflang: 'ja',
    href: meta.canonical,
  });
  upsertLink('link[rel="alternate"][hreflang="x-default"]', {
    rel: 'alternate',
    hreflang: 'x-default',
    href: meta.canonical,
  });

  let ld = document.getElementById('route-jsonld');
  const nextJson = JSON.stringify(buildRouteJsonLd(route));
  if (!ld) {
    ld = document.createElement('script');
    ld.id = 'route-jsonld';
    ld.setAttribute('type', 'application/ld+json');
    document.head.appendChild(ld);
    ld.textContent = nextJson;
  } else if (ld.dataset.route !== route) {
    ld.dataset.route = route;
    ld.textContent = nextJson;
  }
}
