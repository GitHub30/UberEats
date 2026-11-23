import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { ToastProvider } from './Toast';
import { usePwa } from '../hooks/usePwa';

interface StandaloneShellProps {
  children: (pwa: ReturnType<typeof usePwa>) => React.ReactNode;
}

/** Wraps each independent app with ToastProvider and PWA offline/update bars — NO shared header! */
export function StandaloneShell({ children }: StandaloneShellProps) {
  const pwa = usePwa();

  return (
    <ToastProvider>
      {!pwa.isOnline && (
        <div className="pwa-banner pwa-banner-offline" role="alert">
          <WifiOff size={15} aria-hidden="true" />
          <span>現在オフラインです。最新の注文・更新にはインターネット接続が必要です。</span>
        </div>
      )}
      {pwa.updateReady && (
        <div className="pwa-banner pwa-banner-update" role="status">
          <span>新しいバージョンのアプリが利用可能です。</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={pwa.applyUpdate}>
            <RefreshCw size={13} aria-hidden="true" />
            今すぐ更新
          </button>
        </div>
      )}
      {children(pwa)}
    </ToastProvider>
  );
}
