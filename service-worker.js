/*
========================================
M.I.S.E.
Service Worker — Version 2

Application mobile
Fonctionnement hors connexion
========================================
*/

"use strict";


/*
========================================
CONFIGURATION DU CACHE
========================================
*/

const CACHE_NAME = "mise-app-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./jeu.html",
  "./action.html",
  "./opposition.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "./mise-icon-192.png",
  "./mise-icon-512.png"
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

    caches.keys()

      .then(names => {

        return Promise.all(

          names

            .filter(name =>

              name.startsWith("mise-app-") &&
              name !== CACHE_NAME

            )

            .map(name => caches.delete(name))

        );

      })

      .then(() => {

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

  /*
    Nous ne traitons que les
    requêtes de lecture.
  */

  if (event.request.method !== "GET") {
    return;
  }


  /*
    Vérification de l'origine.
  */

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }


  /*
    Limitation au répertoire M.I.S.E.
  */

  const repertoire = new URL(
    "./",
    self.registration.scope
  ).pathname;

  if (!url.pathname.startsWith(repertoire)) {
    return;
  }


  /*
    Priorité à Internet.

    Si la connexion échoue,
    utilisation des fichiers
    enregistrés localement.
  */

  event.respondWith(

    fetch(event.request)

      .then(response => {

        if (response && response.ok) {

          const copie = response.clone();

          event.waitUntil(

            caches.open(CACHE_NAME)

              .then(cache => {

                return cache.put(
                  event.request,
                  copie
                );

              })

          );

        }

        return response;

      })

      .catch(() => {

        return caches.match(
          event.request,
          {
            ignoreSearch: true
          }
        );

      })

  );

});
