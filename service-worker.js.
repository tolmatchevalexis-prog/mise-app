/*
========================================
M.I.S.E.
Service Worker — Version 1

Fonctionnement hors connexion
========================================
*/

"use strict";

const CACHE_NAME = "mise-app-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./jeu.html",
  "./action.html",
  "./opposition.html",
  "./app.js",
  "./style.css",
  "./manifest.json"
];


/*
========================================
INSTALLATION
========================================
*/

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })

  );

});


/*
========================================
ACTIVATION
========================================
*/

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(names => {

      return Promise.all(

        names
          .filter(name =>
            name.startsWith("mise-app-") &&
            name !== CACHE_NAME
          )
          .map(name => caches.delete(name))

      );

    }).then(() => {
      return self.clients.claim();
    })

  );

});


/*
========================================
FONCTIONNEMENT HORS CONNEXION
========================================
*/

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (!url.pathname.startsWith(
    new URL("./", self.registration.scope).pathname
  )) {
    return;
  }

  event.respondWith(

    fetch(event.request)

      .then(response => {

        if (response && response.ok) {

          const copy = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(event.request, copy);
            })
          );

        }

        return response;

      })

      .catch(() => {

        return caches.match(event.request, {
          ignoreSearch: true
        });

      })

  );

});
