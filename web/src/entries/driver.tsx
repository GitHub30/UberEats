import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/shared.css';
import '../styles/driver.css';
import { StandaloneShell } from '../components/StandaloneShell';
import { DriverApp } from '../apps/driver/DriverApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandaloneShell>
      {(pwa) => <DriverApp canInstallPwa={pwa.canInstall} onInstallPwa={() => void pwa.installApp()} />}
    </StandaloneShell>
  </StrictMode>
);
