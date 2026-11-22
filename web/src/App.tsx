import { useEffect, useState } from 'react';
import { AppSwitcher, type AppRoute } from './components/AppSwitcher';
import { ToastProvider } from './components/Toast';
import { HomePortal } from './apps/HomePortal';
import { CustomerApp } from './apps/customer/CustomerApp';
import { DriverApp } from './apps/driver/DriverApp';
import { MerchantApp } from './apps/merchant/MerchantApp';
import { AdminApp } from './apps/admin/AdminApp';

const TITLES: Record<AppRoute, string> = {
  home: 'MachiEats — 街のすべてのお店から届くフードデリバリー',
  customer: 'MachiEats 注文アプリ — 提携店も非提携の持ち帰り代理注文も',
  driver: 'MachiEats ドライバーアプリ — 配達・店頭代理注文コンソール',
  merchant: 'MachiEats 店舗受注アプリ — 公式提携レストラン POS',
  admin: 'MachiEats 管理画面 — プラットフォーム運営コンソール',
};

function parseRouteFromHash(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
  if (hash === 'customer' || hash === 'driver' || hash === 'merchant' || hash === 'admin') {
    return hash;
  }
  return 'home';
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRouteFromHash());

  useEffect(() => {
    const onHashChange = () => setRoute(parseRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = TITLES[route];
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [route]);

  const navigate = (next: AppRoute) => {
    window.location.hash = next === 'home' ? '#/' : `#/${next}`;
    setRoute(next);
  };

  return (
    <ToastProvider>
      <AppSwitcher current={route} onNavigate={navigate} />
      {route === 'home' && <HomePortal onNavigate={navigate} />}
      {route === 'customer' && <CustomerApp />}
      {route === 'driver' && <DriverApp />}
      {route === 'merchant' && <MerchantApp />}
      {route === 'admin' && <AdminApp />}
    </ToastProvider>
  );
}
