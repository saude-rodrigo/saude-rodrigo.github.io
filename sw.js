// Service worker: deixa o app abrir sem internet.
// Só guarda os arquivos do próprio app. Nada de dados de saúde passa por aqui.
var CACHE = 'saude-a-dois-v31';
var ARQUIVOS = [
  './', 'index.html', 'style.css', 'app.js', 'prontuario.js', 'ficha.js', 'socorros.js', 'neuro.js', 'google.js', 'config.js',
  'manifest.webmanifest', 'pdf.min.js', 'pdf.worker.min.js',
  'capa.jpg', 'icons.js', 'cena.jpg', 'no.png', 'impacto.png', 'icon-192.png', 'icon-512.png'
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
  var url = new URL(req.url);
  // Menu Compartilhar do Android: guarda os arquivos recebidos só neste aparelho e abre o app
  if (req.method === 'POST' && /share-target$/.test(url.pathname)) {
    e.respondWith((async function () {
      var fd = await req.formData();
      var fs = fd.getAll('arquivos').filter(function (f) { return f && f.name; });
      await caches.delete('saude-share');
      var c = await caches.open('saude-share');
      for (var i = 0; i < fs.length; i++) {
        await c.put(new Request(self.registration.scope + 'recebido/' + i + '/' + encodeURIComponent(fs[i].name)), new Response(fs[i], { headers: { 'Content-Type': fs[i].type || 'application/octet-stream' } }));
      }
      return Response.redirect(self.registration.scope + '?share=' + fs.length, 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
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
