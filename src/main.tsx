import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { startSyncManager } from './lib/syncManager';

// Iniciar el motor de sincronización en segundo plano (IndexedDB → Neon)
startSyncManager();

// ─── Registro del Service Worker ──────────────────────────────────────────────
// El SW permite:
//   1. Carga instantánea del POS aunque no haya internet (Cache First).
//   2. Instalación como app nativa en Android/iOS/PC (WebAPK / PWA).
//   3. Precaching del app shell para arranque offline completo.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.info('[SW] Registrado. Scope:', reg.scope);

        // Escuchar si hay una nueva versión del SW esperando activarse
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // Cuando el nuevo SW está listo y hay un SW previo activo
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Mostrar un toast sutil indicando que hay actualización disponible
              const toast = document.createElement('div');
              toast.style.cssText = [
                'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
                'background:#1e1e2e', 'color:#fff', 'padding:12px 20px',
                'border-radius:999px', 'font-family:system-ui,sans-serif',
                'font-size:14px', 'font-weight:600', 'z-index:99999',
                'display:flex', 'align-items:center', 'gap:12px',
                'box-shadow:0 8px 32px rgba(0,0,0,0.3)',
                'animation:slideUp .3s ease',
              ].join(';');
              toast.innerHTML = `
                🆕 Hay una actualización disponible
                <button onclick="window.location.reload()" style="
                  background:#E91E8C;color:#fff;border:none;border-radius:8px;
                  padding:4px 12px;cursor:pointer;font-weight:700;font-size:13px;
                ">Actualizar</button>
              `;
              document.body.appendChild(toast);
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] Error al registrar:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
