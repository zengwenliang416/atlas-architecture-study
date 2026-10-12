import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { Providers } from './app/providers';
import './styles/theme.css';
import './styles/app.css';
import './styles/auth.css';

const root = document.getElementById('root');
if (!root) throw new Error('缺少 #root');
createRoot(root).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
