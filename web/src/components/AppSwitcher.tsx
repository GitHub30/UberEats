import { ShoppingBag, Bike, Store, ShieldCheck, LayoutGrid, ExternalLink } from 'lucide-react';

export type AppRoute = 'home' | 'customer' | 'driver' | 'merchant' | 'admin';

interface AppSwitcherProps {
  current: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export function AppSwitcher({ current, onNavigate }: AppSwitcherProps) {
  const tabs: Array<{ id: AppRoute; label: string; icon: React.ReactNode; extraClass?: string }> = [
    { id: 'home', label: '総合ポータル', icon: <LayoutGrid size={14} /> },
    { id: 'customer', label: '注文アプリ', icon: <ShoppingBag size={14} /> },
    { id: 'driver', label: 'ドライバーアプリ', icon: <Bike size={14} />, extraClass: 'tab-driver' },
    { id: 'merchant', label: '店舗受注アプリ', icon: <Store size={14} />, extraClass: 'tab-merchant' },
    { id: 'admin', label: '管理画面', icon: <ShieldCheck size={14} />, extraClass: 'tab-admin' },
  ];

  return (
    <header className="switcher-bar">
      <div className="switcher-inner">
        <button type="button" className="switcher-brand" onClick={() => onNavigate('home')}>
          <span className="switcher-brand-mark">M</span>
          <span>
            MachiEats <span className="switcher-brand-sub">Cloudflare D1 Live</span>
          </span>
        </button>

        <nav className="switcher-tabs" aria-label="アプリ切り替え">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={`nav-${tab.id}`}
              className={`switcher-tab ${current === tab.id ? `active ${tab.extraClass || ''}` : ''}`}
              onClick={() => onNavigate(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="switcher-meta">
          <span className="sync-indicator" title="全アプリがCloudflare D1とリアルタイム同期しています">
            <span className="sync-dot" />
            D1 同期中
          </span>
          <a
            href={`#/${current === 'home' ? 'customer' : current}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#cfcdc7', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
            title="別タブで開いて複数アプリを同時テストできます"
          >
            別タブで開く
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </header>
  );
}
