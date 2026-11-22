import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { AppSwitcher } from './components/AppSwitcher';
import { ToastProvider } from './components/Toast';
import { HomePortal } from './apps/HomePortal';
import {
  applyRouteHead,
  parseRouteFromPathname,
  routeToPath,
  type AppRoute,
} from './seo/routes';
import { usePwa } from './hooks/usePwa';

const CustomerApp = lazy(() =>
  import('./apps/customer/CustomerApp').then((m) => ({ default: m.CustomerApp }))
);
const DriverApp = lazy(() =>
  import('./apps/driver/DriverApp').then((m) => ({ default: m.DriverApp }))
);
const MerchantApp = lazy(() =>
  import('./apps/merchant/MerchantApp').then((m) => ({ default: m.MerchantApp }))
);
const AdminApp = lazy(() =>
  import('./apps/admin/AdminApp').then((m) => ({ default: m.AdminApp }))
);

function resolveInitialRoute(): AppRoute {
  try {
    const redirected = sessionStorage.getItem('machieats_redirect_path');
    if (redirected) {
      sessionStorage.removeItem('machieats_redirect_path');
      const [rawPath, rawSearch] = redirected.split('?');
      const parsed = parseRouteFromPathname(rawPath);
      const cleanPath = routeToPath(parsed);
      const restoredUrl = rawSearch ? `${cleanPath}?${rawSearch}` : cleanPath;
      window.history.replaceState({ route: parsed }, '', restoredUrl);
      return parsed;
    }
  } catch {
    // ignore storage restrictions
  }
  const parsed = parseRouteFromPathname(window.location.pathname);
  const canonicalPath = routeToPath(parsed);
  if (window.location.pathname !== canonicalPath) {
    window.history.replaceState({ route: parsed }, '', `${canonicalPath}${window.location.search}`);
  }
  return parsed;
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => resolveInitialRoute());
  const pwa = usePwa();

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRouteFromPathname(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    applyRouteHead(route);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [route]);

  const navigate = useCallback((next: AppRoute, search = '') => {
    const targetPath = routeToPath(next);
    const fullUrl = search ? `${targetPath}${search}` : targetPath;
    if (window.location.pathname + window.location.search !== fullUrl) {
      window.history.pushState({ route: next }, '', fullUrl);
    }
    setRoute(next);
  }, []);

  return (
    <ToastProvider>
      <AppSwitcher
        current={route}
        onNavigate={navigate}
        canInstallPwa={pwa.canInstall}
        onInstallPwa={() => void pwa.installApp()}
        isOnline={pwa.isOnline}
      />

      {!pwa.isOnline && (
        <div className="pwa-banner pwa-banner-offline" role="alert">
          <WifiOff size={15} aria-hidden="true" />
          <span>現在オフラインです。キャッシュ済みの画面を表示していますが、注文や更新にはインターネット接続が必要です。</span>
        </div>
      )}

      {pwa.updateReady && (
        <div className="pwa-banner pwa-banner-update" role="status">
          <span>新しいバージョンの MachiEats が利用可能です。</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={pwa.applyUpdate}>
            <RefreshCw size={13} aria-hidden="true" />
            今すぐ更新
          </button>
        </div>
      )}

      <Suspense
        fallback={
          <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 20px', textAlign: 'center', color: 'var(--ink-muted)' }}>
            アプリを読み込んでいます...
          </main>
        }
      >
        {route === 'home' && <HomePortal onNavigate={navigate} />}
        {route === 'customer' && <CustomerApp />}
        {route === 'driver' && <DriverApp />}
        {route === 'merchant' && <MerchantApp />}
        {route === 'admin' && <AdminApp />}
      </Suspense>
    </ToastProvider>
  );
}
