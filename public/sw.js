const CACHE_PREFIX = "hm-constructora-";
const CACHE_NAME = `${CACHE_PREFIX}offline-v7`;
const STATIC_CACHE_NAME = `${CACHE_PREFIX}static-v7`;
const OFFLINE_URL = "/offline";
const CORE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/brand/logo.png"];
const KEEP_CACHES = new Set([CACHE_NAME, STATIC_CACHE_NAME]);

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(CORE_URLS);

			// La página /offline necesita sus propios scripts para hidratar (y que
			// el botón "Reintentar ahora" y el reintento automático funcionen) aun
			// si el usuario pierde la conexión antes de visitar cualquier otra
			// ruta. Se parsean sus <script src> y se precachean aparte.
			// IMPORTANTE: cada archivo se cachea por separado (nunca con addAll,
			// que es todo-o-nada) - un solo chunk que falle (ej. en npm run dev,
			// donde los nombres cambian con cada recompilación) no debe tumbar la
			// instalación completa del service worker.
			const offlineResponse = await cache.match(OFFLINE_URL);
			if (offlineResponse) {
				const html = await offlineResponse.clone().text();
				const scriptSrcs = Array.from(
					html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+)"/g),
				).map((match) => match[1]);
				if (scriptSrcs.length > 0) {
					const staticCache = await caches.open(STATIC_CACHE_NAME);
					await Promise.allSettled(
						scriptSrcs.map((src) =>
							staticCache.add(src).catch(() => undefined),
						),
					);
				}
			}
		})(),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key.startsWith(CACHE_PREFIX) && !KEEP_CACHES.has(key))
						.map((key) => caches.delete(key)),
				),
			),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET") return;

	const url = new URL(request.url);

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(async () => {
				const fallback = await caches.match(OFFLINE_URL);
				return fallback ?? Response.error();
			}),
		);
		return;
	}

	if (url.origin === self.location.origin && CORE_URLS.includes(url.pathname)) {
		event.respondWith(
			caches.match(request).then((cached) => cached ?? fetch(request)),
		);
		return;
	}

	// Los archivos estáticos de Next.js (JS/CSS con hash de contenido en el
	// nombre) son inmutables: se guardan la primera vez que se piden mientras
	// hay red. Sin esto, la página /offline cacheada llega como HTML muerto
	// cuando de verdad no hay conexión: React nunca hidrata, así que el botón
	// "Reintentar ahora" y el spinner (su reintento automático) no reaccionan.
	if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
		event.respondWith(
			caches.open(STATIC_CACHE_NAME).then(async (cache) => {
				const cached = await cache.match(request);
				if (cached) return cached;
				try {
					const response = await fetch(request);
					if (response.ok) cache.put(request, response.clone());
					return response;
				} catch (error) {
					if (cached) return cached;
					throw error;
				}
			}),
		);
		return;
	}

	// Next.js, los estilos y los datos siempre deben venir de la versión activa.
	// Sin capturar el error aquí, cualquier fetch que el propio navegador
	// cancele o rechace (una petición cortada por una navegación rápida, una
	// extensión bloqueadora, un parpadeo de red) queda como una promesa sin
	// atender - el navegador ya maneja ese fallo por su cuenta, pero aparece
	// como "Uncaught (in promise)" en la consola si no se captura aquí.
	event.respondWith(fetch(request).catch(() => Response.error()));
});
