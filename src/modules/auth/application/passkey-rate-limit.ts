import { createRateLimiter } from "@/shared/lib/rate-limit";

// authenticate/options and authenticate/verify are public (no session) - and
// unlike password login there is no target account known at /options time,
// so this is purely per-IP: it throttles automated hammering of the WebAuthn
// ceremony endpoints rather than locking out one account. Both routes check
// and record against the same bucket, so an attacker can't dodge the limit
// by spreading calls across the two endpoints.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const limiter = createRateLimiter({
	windowMs: WINDOW_MS,
	maxAttempts: MAX_ATTEMPTS,
});

function keyFor(ipAddress: string | null) {
	return ipAddress ?? "unknown";
}

export function isPasskeyAuthRateLimited(ipAddress: string | null) {
	return limiter.isLimited(keyFor(ipAddress));
}

export function recordPasskeyAuthAttempt(ipAddress: string | null) {
	limiter.recordAttempt(keyFor(ipAddress));
}

export function clearPasskeyAuthAttempts(ipAddress: string | null) {
	limiter.clear(keyFor(ipAddress));
}
