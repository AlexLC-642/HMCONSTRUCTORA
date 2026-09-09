import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifySessionToken = vi.fn();

vi.mock("@/modules/auth/application/session", () => ({
	verifySessionToken: (...args: unknown[]) => verifySessionToken(...args)
}));

function requestFor(pathname: string, sessionCookie?: string) {
	const url = new URL(pathname, "http://localhost");
	const request = new NextRequest(url);
	if (sessionCookie) request.cookies.set("session", sessionCookie);
	return request;
}

// See docs/security-audit.md M3: the proxy's matcher used to only cover
// /dashboard and /projects. Every internal route group is expected to
// redirect an unauthenticated visitor to /login, as a defense-in-depth net
// on top of the requirePermission()/requireAuthenticatedUser() calls each
// page already makes on its own.
describe("proxy — session gate on internal route groups", () => {
	beforeEach(() => {
		verifySessionToken.mockReset();
	});

	const protectedPaths = [
		"/account/security",
		"/dashboard",
		"/documents",
		"/finances",
		"/inventory",
		"/projects/abc-123",
		"/purchases",
		"/reports",
		"/requisitions",
		"/users",
		"/website"
	];

	it.each(protectedPaths)("redirects an anonymous request to /login for %s", async (pathname) => {
		verifySessionToken.mockResolvedValue(null);
		const { proxy } = await import("@/proxy");

		const response = await proxy(requestFor(pathname));

		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toContain("/login");
	});

	it.each(protectedPaths)("lets a request with a valid session through for %s", async (pathname) => {
		verifySessionToken.mockResolvedValue({ sub: "user-1" });
		const { proxy } = await import("@/proxy");

		const response = await proxy(requestFor(pathname, "a-valid-token"));

		expect(response.status).toBe(200);
	});

	it("does not gate public routes such as the marketing home page", async () => {
		verifySessionToken.mockResolvedValue(null);
		const { proxy } = await import("@/proxy");

		const response = await proxy(requestFor("/"));

		expect(response.status).toBe(200);
		expect(verifySessionToken).not.toHaveBeenCalled();
	});

	it("rejects a session cookie that fails verification, not just a missing one", async () => {
		verifySessionToken.mockResolvedValue(null);
		const { proxy } = await import("@/proxy");

		const response = await proxy(requestFor("/finances", "a-tampered-or-expired-token"));

		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toContain("/login");
	});
});
