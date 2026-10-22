// Plan it! service worker: shows push notifications and opens the app when one is tapped.
// It deliberately caches nothing — the app always loads fresh from the server.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Plan it!', body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Plan it!', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,
    renotify: !!data.tag,
    data: { url: data.url || '/' },
    actions: data.actions || [],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    // "✅ Bitdi" straight from the notification (Android / desktop; iPhone shows no buttons)
    if (event.action?.startsWith('done:')) {
      const id = event.action.slice(5);
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        body: JSON.stringify({ done: true }),
      }).catch(() => {});
      return;
    }
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = open.find((c) => new URL(c.url).origin === self.location.origin);
    if (client) { await client.focus(); client.navigate?.(url); return; }
    await self.clients.openWindow(url);
  })());
});
