import { createRateLimiter } from "@/shared/lib/rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const limiter = createRateLimiter({
	windowMs: WINDOW_MS,
	maxAttempts: MAX_ATTEMPTS,
});

function keyFor(email: string, ipAddress: string | null) {
	return `${email.toLowerCase()}|${ipAddress ?? "unknown"}`;
}

export function isLoginRateLimited(email: string, ipAddress: string | null) {
	return limiter.isLimited(keyFor(email, ipAddress));
}

export function recordFailedLogin(email: string, ipAddress: string | null) {
	limiter.recordAttempt(keyFor(email, ipAddress));
}

export function clearLoginAttempts(email: string, ipAddress: string | null) {
	limiter.clear(keyFor(email, ipAddress));
}
