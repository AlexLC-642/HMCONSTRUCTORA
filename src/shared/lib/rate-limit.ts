// In-memory sliding-window limiter factory, shared by every abuse-prone
// surface that doesn't warrant its own DB table (login, passkey ceremonies,
// client-portal token lookups). Each caller gets its own isolated bucket map
// via createRateLimiter() - namespaces never collide, and a burst on one
// surface can't exhaust the budget of another.
//
// Resets on deploy/restart and does not share state across instances; if
// this app is ever horizontally scaled, replace the Map below with a shared
// store (Redis, DB row) behind the same three-method interface.
type Bucket = { count: number; windowStart: number };

export function createRateLimiter(options: {
	windowMs: number;
	maxAttempts: number;
	maxEntries?: number;
}) {
	const { windowMs, maxAttempts, maxEntries = 5000 } = options;
	const attempts = new Map<string, Bucket>();

	function prune(now: number) {
		// Keep the map from growing unbounded across a long-running process.
		if (attempts.size < maxEntries) return;
		for (const [key, bucket] of attempts) {
			if (now - bucket.windowStart > windowMs) attempts.delete(key);
		}
	}

	return {
		isLimited(key: string) {
			const bucket = attempts.get(key);
			if (!bucket) return false;
			if (Date.now() - bucket.windowStart > windowMs) return false;
			return bucket.count >= maxAttempts;
		},
		recordAttempt(key: string) {
			const now = Date.now();
			prune(now);
			const bucket = attempts.get(key);
			if (!bucket || now - bucket.windowStart > windowMs) {
				attempts.set(key, { count: 1, windowStart: now });
				return;
			}
			bucket.count += 1;
		},
		clear(key: string) {
			attempts.delete(key);
		},
	};
}
