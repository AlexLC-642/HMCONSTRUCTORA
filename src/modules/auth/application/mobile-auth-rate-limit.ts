import { createRateLimiter } from "@/shared/lib/rate-limit";

const enrollLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, maxAttempts: 8 });
const sessionLimiter = createRateLimiter({ windowMs: 60 * 1000, maxAttempts: 30 });

export function isMobileEnrollLimited(key: string) {
	return enrollLimiter.isLimited(key);
}

export function recordMobileEnrollFailure(key: string) {
	enrollLimiter.recordAttempt(key);
}

export function clearMobileEnrollFailures(key: string) {
	enrollLimiter.clear(key);
}

export function isMobileSessionLimited(key: string) {
	return sessionLimiter.isLimited(key);
}

export function recordMobileSessionAttempt(key: string) {
	sessionLimiter.recordAttempt(key);
}
