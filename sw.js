/* Class Attendance — Service Worker
   Caches the app shell so the portal opens instantly and works offline.
   Attendance data is always read live from Firebase (never cached). */

const CACHE = "ugpass-v1";
const SHELL = ["student.html", "CHISAG_MASTER_NAMES.js", "icon.svg", "manifest.json"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var url = new URL(e.request.url);

  // Never cache Firebase attendance data — always go to network.
  if (url.origin === "https://stu-attend-default-rtdb.firebaseio.com") return;

  // App navigation: try network, fall back to cached shell when offline.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(function(){ return caches.match("student.html"); })
    );
    return;
  }

  // Static assets: cache-first with background refresh.
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if (hit) return hit;
      return fetch(e.request).then(function(resp){
        if (resp && resp.ok) {
          var ext = url.pathname.split(".").pop().toLowerCase();
          if (["html","js","svg","json","css"].indexOf(ext) >= 0) {
            caches.open(CACHE).then(function(c){ c.put(e.request, resp.clone()); });
          }
        }
        return resp;
      }).catch(function(){ return caches.match(e.request); });
    })
  );
});
