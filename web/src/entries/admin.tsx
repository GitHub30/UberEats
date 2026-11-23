import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/shared.css';
import '../styles/admin.css';
import { StandaloneShell } from '../components/StandaloneShell';
import { AdminApp } from '../apps/admin/AdminApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandaloneShell>
      {(pwa) => <AdminApp canInstallPwa={pwa.canInstall} onInstallPwa={() => void pwa.installApp()} />}
    </StandaloneShell>
  </StrictMode>
);
