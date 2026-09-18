/**
 * Service Worker — EL MERENGÓN POS
 * ──────────────────────────────────────────────────────────────────────────────
 * Estrategia:
 *   • Recursos estáticos (HTML, JS, CSS, imágenes): Cache First
 *     → El POS carga INSTANTÁNEAMENTE aunque no haya internet.
 *   • Llamadas a /api/*: Network Only (nunca se cachean datos dinámicos).
 *
 * Para invalidar el caché en una nueva versión, incrementar CACHE_VERSION.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const CACHE_VERSION = 'v5';
const CACHE_NAME = `pos-template-${CACHE_VERSION}`;

// Recursos que se precargan al instalar el SW (app shell mínima)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/icon-maskable.png',
  '/favicon.png',
  '/favicon.ico',
];

// ─── Instalación: precachear el app shell ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // activar de inmediato sin esperar tab anterior
  );
});

// ─── Activación: eliminar cachés de versiones anteriores ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // tomar control de todos los tabs abiertos
  );
});

// ─── Fetch: Cache First para estáticos, Network Only para API ─────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Solo manejar peticiones del mismo origen
  if (url.origin !== self.location.origin) return;

  // 2. Peticiones a /api/* → siempre red, nunca caché
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Si la API falla offline, devolver un error JSON claro
        return new Response(
          JSON.stringify({ error: 'Sin conexión. Los datos se sincronizarán cuando vuelva el internet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 3. Solo manejar peticiones GET para el resto
  if (event.request.method !== 'GET') return;

  // 4. Cache First con fallback a red y actualización en background
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Si tenemos la respuesta en caché, devolverla de inmediato
      // y en background actualizar el caché con la versión de red.
      if (cached) {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {}); // silenciar errores de red — ya tenemos el caché
        
        // Devolver el caché de inmediato (no esperamos la red)
        void fetchPromise;
        return cached;
      }

      // Si no hay caché, ir a la red y guardar el resultado
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.ok &&
            (url.pathname.startsWith('/assets/') ||
              url.pathname === '/' ||
              url.pathname.endsWith('.html') ||
              url.pathname.endsWith('.png') ||
              url.pathname.endsWith('.ico') ||
              url.pathname.endsWith('.json'))
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Sin red y sin caché: devolver index.html para que React Router maneje la ruta
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
          // Para otros recursos (imágenes, etc.): respuesta vacía
          return new Response('', { status: 408 });
        });
    })
  );
});
