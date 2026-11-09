/* El service worker de TRIM: solo para el aviso de apagón (Fase 4 de facilidades, D2).
 *
 * El push llega SIN contenido (el servidor no cifra nada): al recibirlo, se le pregunta al servidor qué
 * le toca a este dispositivo (`GET /api/push/aviso?endpoint=`), que lo dice según el rol con que se
 * activó. Si el servidor no contesta, se avisa igual con un texto genérico: un apagón no se calla.
 * No guarda nada en caché ni intercepta pedidos: TRIM sigue funcionando igual sin él. */
const API = new URL(self.location.href).searchParams.get('api') || '/api'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let a = { titulo: 'TRIM · aviso de planta', cuerpo: 'Puede haber un apagón. Abra TRIM para verlo.', url: '/', evento: 'trim-planta' }
    try {
      const sub = await self.registration.pushManager.getSubscription()
      const r = await fetch(`${API}/push/aviso?endpoint=${encodeURIComponent(sub ? sub.endpoint : '')}`, { headers: { accept: 'application/json' } })
      if (r.ok) a = { ...a, ...(await r.json()) }
    } catch { /* sin servidor: el texto genérico */ }
    await self.registration.showNotification(a.titulo, {
      body: a.cuerpo, tag: a.evento || 'trim-planta', renotify: true, requireInteraction: true,
      icon: '/brand/logo_256.png', data: { url: a.url || '/' },
    })
  })())
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const abierta = ventanas.find(v => new URL(v.url).origin === self.location.origin)
    if (abierta) { await abierta.focus(); return abierta.navigate(url) }
    return self.clients.openWindow(url)
  })())
})
