import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import './index.css';

// Catch benign Vite HMR WebSocket connection messages in dev environment
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = typeof reason === 'string' ? reason : reason?.message || String(reason || '');
  if (msg.toLowerCase().includes('websocket') || msg.toLowerCase().includes('vite')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || String(event || '');
  if (msg.toLowerCase().includes('websocket') || msg.toLowerCase().includes('vite')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);


