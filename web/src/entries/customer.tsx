import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/shared.css';
import '../styles/customer.css';
import { StandaloneShell } from '../components/StandaloneShell';
import { CustomerApp } from '../apps/customer/CustomerApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandaloneShell>
      {(pwa) => <CustomerApp canInstallPwa={pwa.canInstall} onInstallPwa={() => void pwa.installApp()} />}
    </StandaloneShell>
  </StrictMode>
);
