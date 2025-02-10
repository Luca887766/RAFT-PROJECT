const cacheName = 'RAFTpwa';
const appFiles = [
    'index.html',
    'script.js',
    'style.css',
    'sw.js',
    'favicon.ico',
    'favicon.png',
    'vocabolario.json',
    'manifest.json',
    'README.md',
    'gesture_recognizer.task',
    'fonts/Bluffolk-nAD4V.ttf',
    'fonts/Lato-Regular.ttf',
    'fonts/Quantico-Regular.ttf',
    'img/0-DEL.jpg',
    'img/0-SPACE.jpg',
    'img/allenamentoOff.png',
    'img/allenamentoOn.png',
    'img/A.jpg', 'img/B.jpg', 'img/C.jpg', 'img/D.jpg',
    'img/E.jpg', 'img/F.jpg', 'img/G.jpg', 'img/H.jpg',
    'img/I.jpg', 'img/J.jpg', 'img/K.jpg', 'img/L.jpg',
    'img/M.jpg', 'img/N.jpg', 'img/O.jpg', 'img/P.jpg',
    'img/Q.jpg', 'img/R.jpg', 'img/S.jpg', 'img/T.jpg',
    'img/U.jpg', 'img/V.jpg', 'img/W.jpg', 'img/X.jpg',
    'img/Y.jpg', 'img/Z.jpg',
    'img/logoGalilei.png',
    'img/logoOverlimits.png',
    'img/logoRaft.png',
    'img/pattern.png',
    'img/traduzioneOff.png',
    'img/traduzioneOn.png'
];

// Install event: Cache PWA shell files
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(cacheName).then((cache) => {
            return cache.addAll(appFiles);
        }).catch((error) => console.error('Cache installation failed:', error))
    );
});

// Fetch event: Serve from cache or fetch from network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            if (event.request.url.includes('pwaversion.txt')) {
                console.log(`[Service Worker] Fetching version info: ${event.request.url}`);
                return fetch(event.request);
            } else {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
                    return cachedResponse;
                }

                try {
                    const networkResponse = await fetch(event.request);
                    const cache = await caches.open(cacheName);
                    cache.put(event.request, networkResponse.clone());
                    console.log(`[Service Worker] Caching new resource: ${event.request.url}`);
                    return networkResponse;
                } catch (error) {
                    console.error(`[Service Worker] Fetch failed: ${event.request.url}`, error);
                    throw error;
                }
            }
        })()
    );
});

// Activate event: Cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activated');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter(name => name !== cacheName).map(name => caches.delete(name))
            );
        })
    );
});