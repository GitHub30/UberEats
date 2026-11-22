import React from 'react';
import { ShoppingBag, Bike, Store, ShieldCheck, LayoutGrid, ExternalLink, Download } from 'lucide-react';
import { routeToPath, type AppRoute } from '../seo/routes';

export type { AppRoute };

interface AppSwitcherProps {
  current: AppRoute;
  onNavigate: (route: AppRoute) => void;
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
  isOnline?: boolean;
}

export function AppSwitcher({
  current,
  onNavigate,
  canInstallPwa = false,
  onInstallPwa,
  isOnline = true,
}: AppSwitcherProps) {
  const tabs: Array<{ id: AppRoute; label: string; icon: React.ReactNode; extraClass?: string }> = [
    { id: 'home', label: '総合ポータル', icon: <LayoutGrid size={14} aria-hidden="true" /> },
    { id: 'customer', label: '注文アプリ', icon: <ShoppingBag size={14} aria-hidden="true" /> },
    { id: 'driver', label: 'ドライバーアプリ', icon: <Bike size={14} aria-hidden="true" />, extraClass: 'tab-driver' },
    { id: 'merchant', label: '店舗受注アプリ', icon: <Store size={14} aria-hidden="true" />, extraClass: 'tab-merchant' },
    { id: 'admin', label: '管理画面', icon: <ShieldCheck size={14} aria-hidden="true" />, extraClass: 'tab-admin' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, target: AppRoute) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(target);
  };

  return (
    <header className="switcher-bar">
      <div className="switcher-inner">
        <a
          href={routeToPath('home')}
          className="switcher-brand"
          style={{ textDecoration: 'none' }}
          onClick={(e) => handleLinkClick(e, 'home')}
        >
          <span className="switcher-brand-mark" aria-hidden="true">M</span>
          <span>
            MachiEats <span className="switcher-brand-sub">PWA • Cloudflare D1</span>
          </span>
        </a>

        <nav className="switcher-tabs" aria-label="アプリ切り替え">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              id={`nav-${tab.id}`}
              href={routeToPath(tab.id)}
              aria-current={current === tab.id ? 'page' : undefined}
              className={`switcher-tab ${current === tab.id ? `active ${tab.extraClass || ''}` : ''}`}
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleLinkClick(e, tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </a>
          ))}
        </nav>

        <div className="switcher-meta">
          {canInstallPwa && onInstallPwa && (
            <button
              type="button"
              id="pwa-install-btn"
              className="btn btn-primary btn-sm"
              style={{ padding: '5px 11px', fontSize: 12 }}
              onClick={onInstallPwa}
            >
              <Download size={13} aria-hidden="true" />
              アプリ追加
            </button>
          )}
          <span
            className="sync-indicator switcher-meta-secondary"
            title="全アプリがCloudflare D1とリアルタイム同期しています"
          >
            <span className="sync-dot" style={{ background: isOnline ? '#22c55e' : '#ef4444' }} />
            {isOnline ? 'D1 同期中' : 'オフライン'}
          </span>
          <a
            href={routeToPath(current === 'home' ? 'customer' : current)}
            target="_blank"
            rel="noopener noreferrer"
            className="switcher-meta-secondary"
            style={{ color: '#cfcdc7', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
            title="別タブで開いて複数アプリを同時テストできます"
          >
            別タブで開く
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}
