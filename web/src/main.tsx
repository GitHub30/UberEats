import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/shared.css';
import './styles/customer.css';
import './styles/driver.css';
import './styles/merchant.css';
import './styles/admin.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
