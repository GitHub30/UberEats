import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/shared.css';
import '../styles/merchant.css';
import { StandaloneShell } from '../components/StandaloneShell';
import { MerchantApp } from '../apps/merchant/MerchantApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandaloneShell>
      {(pwa) => <MerchantApp canInstallPwa={pwa.canInstall} onInstallPwa={() => void pwa.installApp()} />}
    </StandaloneShell>
  </StrictMode>
);
