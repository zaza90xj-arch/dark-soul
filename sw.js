/* DARK SOUL service worker — يخزّن ملفات الموقع الأساسية للعمل دون اتصال */
const CACHE = 'dark-soul-v1';
const FILES = ['./', 'index.html', 'style.css', 'content.js', 'prompts.js', 'app.js', 'tools.js', 'net.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/p/') || url.pathname === '/admin.html') return;
  // الشبكة أولًا ثم النسخة المخزّنة، حتى تظهر التحديثات فور النشر
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
