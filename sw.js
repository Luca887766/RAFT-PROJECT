const cacheName = 'RAFTpwa';
const appFiles = [
    'index.html',
    'script.js',
    'style.css',
    'sw.js',
    'favicon.ico',
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
    'img/A.jpg',
    'img/B.jpg',
    'img/C.jpg',
    'img/D.jpg',
    'img/E.jpg',
    'img/F.jpg',
    'img/G.jpg',
    'img/H.jpg',
    'img/I.jpg',
    'img/J.jpg',
    'img/K.jpg',
    'img/L.jpg',
    'img/M.jpg',
    'img/N.jpg',
    'img/O.jpg',
    'img/P.jpg',
    'img/Q.jpg',
    'img/R.jpg',
    'img/S.jpg',
    'img/T.jpg',
    'img/U.jpg',
    'img/V.jpg',
    'img/W.jpg',
    'img/X.jpg',
    'img/Y.jpg',
    'img/Z.jpg',
    'img/logoGalilei.png',
    'img/logoOverlimits.png',
    'img/logoRaft.png',
    'img/pattern.png',
    'img/traduzioneOff.png',
    'img/traduzioneOn.png'

];

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
    const filesUpdate = cache => {
        const stack = [];
        appFiles.forEach(file => stack.push(
            cache.add(file).catch(_ => console.error(`can't load ${file} to cache`))
        ));
        return Promise.all(stack);
    };
    e.waitUntil(caches.open(cacheName).then(filesUpdate));
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        (async () => {
            const r = await caches.match(e.request);
            console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
            if (r) {
                return r;
            }
            const response = await fetch(e.request);
            const cache = await caches.open(cacheName);
            console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
            cache.put(e.request, response.clone());
            return response;
        })()
    );
});

self.addEventListener('activate', (e) => {
    console.log("[Service Worker] Activated");
});
