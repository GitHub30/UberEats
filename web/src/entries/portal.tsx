import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/shared.css';
import { StandaloneShell } from '../components/StandaloneShell';
import { HomePortal } from '../apps/HomePortal';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandaloneShell>
      {(pwa) => <HomePortal canInstallPwa={pwa.canInstall} onInstallPwa={() => void pwa.installApp()} />}
    </StandaloneShell>
  </StrictMode>
);
