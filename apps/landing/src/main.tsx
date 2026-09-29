import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { resolveProvince } from './province.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App province={resolveProvince()} />
  </StrictMode>,
);
