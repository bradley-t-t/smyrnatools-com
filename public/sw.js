const CACHE_NAME = 'video-cache-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/static/media/') &&
      event.request.url.includes('.mp4')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response
        }

        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
      })
    )
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // eslint-disable-next-line no-undef
    clients.claim()
  )
})