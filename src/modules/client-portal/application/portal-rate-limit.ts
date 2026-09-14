import { createRateLimiter } from "@/shared/lib/rate-limit";

// A portal token is 256 bits of entropy - not realistically guessable - so
// this isn't a brute-force defense so much as a throttle on automated
// scanning/DB-hammering of the public, session-less token lookup. Per-IP
// only: there is no account identity to key on until a token resolves.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const limiter = createRateLimiter({
	windowMs: WINDOW_MS,
	maxAttempts: MAX_ATTEMPTS,
});

function keyFor(ipAddress: string | null) {
	return ipAddress ?? "unknown";
}

export function isPortalLookupRateLimited(ipAddress: string | null) {
	return limiter.isLimited(keyFor(ipAddress));
}

export function recordFailedPortalLookup(ipAddress: string | null) {
	limiter.recordAttempt(keyFor(ipAddress));
}

export function clearPortalLookupAttempts(ipAddress: string | null) {
	limiter.clear(keyFor(ipAddress));
}
