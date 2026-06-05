// Blackjack PWA — Service Worker
// Network-first for the app shell (so a redeploy reaches returning visitors
// immediately), cache-first for everything else, with an offline fallback.

var CACHE = 'blackjack-v3';
// Scope-relative so precache works when hosted under a subpath (e.g. /blackjack/ on GitHub Pages)
var FILES = ['./', './index.html', './sw.js', './manifest.webmanifest'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // Don't let one missing optional file (e.g. an icon) fail the whole install.
      return Promise.all(FILES.map(function(f) {
        return c.add(f).catch(function() {});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// The whole app lives in index.html, so treat navigations / HTML as the "app shell".
function isShell(req) {
  return req.mode === 'navigate' ||
         (req.headers.get('accept') || '').indexOf('text/html') !== -1;
}

function offlineShell(req) {
  return caches.match(req).then(function(cached) {
    if (cached) return cached;
    return caches.match('./index.html').then(function(idx) {
      return idx || caches.match('./');
    });
  });
}

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  if (isShell(req)) {
    // Network-first: always try for a fresh copy, fall back to cache when offline.
    e.respondWith(
      fetch(req).then(function(res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return res;
      }).catch(function() { return offlineShell(req); })
    );
    return;
  }

  // Static assets (manifest, icons, sw): cache-first.
  e.respondWith(
    caches.match(req).then(function(cached) {
      return cached || fetch(req).then(function(res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return res;
      });
    })
  );
});
