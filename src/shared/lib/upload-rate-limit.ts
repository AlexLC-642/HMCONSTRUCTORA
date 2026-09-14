import { createRateLimiter } from "./rate-limit";

// Any authenticated user with edit permission could otherwise call the
// upload action in a loop (each file up to 80MB for documents, 15MB for
// website images) and exhaust disk space - unlike the other rate limiters in
// this app, this isn't about locking out guesses, it's a per-account
// throughput cap against disk-exhaustion abuse. Keyed by userId, not IP:
// this only ever runs behind an authenticated, permission-checked action, so
// the account itself is the right unit to throttle and it stays fair across
// shared office networks/VPNs.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_UPLOADS = 20;

const limiter = createRateLimiter({
	windowMs: WINDOW_MS,
	maxAttempts: MAX_UPLOADS,
});

export function isUploadRateLimited(userId: string) {
	return limiter.isLimited(userId);
}

export function recordUploadAttempt(userId: string) {
	limiter.recordAttempt(userId);
}
