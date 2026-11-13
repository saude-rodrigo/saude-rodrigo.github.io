// Service worker: deixa o app abrir sem internet.
// Só guarda os arquivos do próprio app. Nada de dados de saúde passa por aqui.
var CACHE = 'saude-a-dois-v9';
var ARQUIVOS = [
  './', 'index.html', 'style.css', 'app.js', 'google.js', 'config.js',
  'manifest.webmanifest', 'pdf.min.js', 'pdf.worker.min.js',
  'capa.jpg', 'icon-192.png', 'icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); })); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // Google e outros: sempre direto da rede
  e.respondWith(
    caches.match(req).then(function (hit) {
      var rede = fetch(req).then(function (resp) {
        if (resp && resp.ok) {
          var copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return resp;
      }).catch(function () { return hit || caches.match('index.html'); });
      return hit || rede;
    })
  );
});
