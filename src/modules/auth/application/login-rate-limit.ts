// In-memory sliding-window limiter for failed login attempts.
//
// A DB-backed limiter (like the one used for the public contact form) would
// also work, but would need a schema migration purely for a security
// control - for a single-process internal app, tracking this in memory is
// simpler and carries no risk of a bad migration. It resets on deploy/restart
// and does not share state across multiple instances; if this app is ever
// horizontally scaled, replace this with a shared store (Redis, DB row).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type Bucket = { count: number; windowStart: number };

const attempts = new Map<string, Bucket>();

function keyFor(email: string, ipAddress: string | null) {
	return `${email.toLowerCase()}|${ipAddress ?? "unknown"}`;
}

function prune(now: number) {
	// Keep the map from growing unbounded across a long-running process.
	if (attempts.size < 5000) return;
	for (const [key, bucket] of attempts) {
		if (now - bucket.windowStart > WINDOW_MS) attempts.delete(key);
	}
}

export function isLoginRateLimited(email: string, ipAddress: string | null) {
	const bucket = attempts.get(keyFor(email, ipAddress));
	if (!bucket) return false;
	if (Date.now() - bucket.windowStart > WINDOW_MS) return false;
	return bucket.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(email: string, ipAddress: string | null) {
	const now = Date.now();
	prune(now);
	const key = keyFor(email, ipAddress);
	const bucket = attempts.get(key);
	if (!bucket || now - bucket.windowStart > WINDOW_MS) {
		attempts.set(key, { count: 1, windowStart: now });
		return;
	}
	bucket.count += 1;
}

export function clearLoginAttempts(email: string, ipAddress: string | null) {
	attempts.delete(keyFor(email, ipAddress));
}
