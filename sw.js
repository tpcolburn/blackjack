// Blackjack PWA — Service Worker
// Caches the app so it works offline after the first visit

var CACHE = 'blackjack-v2';
// Scope-relative so precache works when hosted under a subpath (e.g. /blackjack/ on GitHub Pages)
var FILES = ['./', './index.html', './sw.js'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(FILES);
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

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        // Cache any new page responses
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return response;
      });
    }).catch(function() {
      // Return cached index as fallback when offline
      return caches.match('./index.html');
    })
  );
});
