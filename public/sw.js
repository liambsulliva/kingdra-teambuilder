// Kingdra no longer uses a service worker (the app is always online).
// Browsers that installed the old cache-first worker re-check this file and
// pick up this version, which clears its caches and unregisters itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) await caches.delete(key);
			await self.registration.unregister();
			for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
		})()
	);
});
