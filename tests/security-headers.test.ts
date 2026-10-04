import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

async function allRouteHeaders() {
	if (typeof nextConfig.headers !== "function")
		throw new Error("headers() is not defined");
	const rules = await nextConfig.headers();
	const catchAll = rules.find((rule) => rule.source === "/(.*)");
	if (!catchAll) throw new Error("No catch-all header rule found");
	return Object.fromEntries(
		catchAll.headers.map((header) => [header.key, header.value]),
	);
}

describe("security headers", () => {
	it("sets a Content-Security-Policy that blocks framing and restricts sources", async () => {
		const headers = await allRouteHeaders();
		expect(headers["Content-Security-Policy"]).toBeDefined();
		expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
		expect(headers["Content-Security-Policy"]).toContain(
			"frame-ancestors 'none'",
		);
		expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
	});

	it("sets X-Content-Type-Options to prevent MIME sniffing", async () => {
		const headers = await allRouteHeaders();
		expect(headers["X-Content-Type-Options"]).toBe("nosniff");
	});

	it("sets X-Frame-Options as a legacy clickjacking fallback", async () => {
		const headers = await allRouteHeaders();
		expect(headers["X-Frame-Options"]).toBe("DENY");
	});

	it("sets a restrictive Permissions-Policy", async () => {
		const headers = await allRouteHeaders();
		expect(headers["Permissions-Policy"]).toContain("camera=()");
		expect(headers["Permissions-Policy"]).toContain("microphone=()");
		expect(headers["Permissions-Policy"]).toContain("geolocation=()");
	});

	it("sets Strict-Transport-Security", async () => {
		const headers = await allRouteHeaders();
		expect(headers["Strict-Transport-Security"]).toContain("max-age=");
	});

	it("prevents the service worker file itself from being cached stale", async () => {
		if (typeof nextConfig.headers !== "function")
			throw new Error("headers() is not defined");
		const rules = await nextConfig.headers();
		const swRule = rules.find((rule) => rule.source === "/sw.js");
		expect(swRule).toBeDefined();
		const cacheControl = swRule?.headers.find(
			(header) => header.key === "Cache-Control",
		);
		expect(cacheControl?.value).toContain("no-cache");
	});

	it("lets stored files be framed by this site only, for the document viewer", async () => {
		if (typeof nextConfig.headers !== "function")
			throw new Error("headers() is not defined");
		const rules = await nextConfig.headers();
		for (const source of [
			"/api/documents/versions/:versionId/file",
			"/uploads/:path*",
		]) {
			const index = rules.findIndex((rule) => rule.source === source);
			const catchAllIndex = rules.findIndex((rule) => rule.source === "/(.*)");
			expect(index).toBeGreaterThan(catchAllIndex);
			const headers = Object.fromEntries(
				rules[index].headers.map((header) => [header.key, header.value]),
			);
			expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
			expect(headers["Content-Security-Policy"]).toContain(
				"frame-ancestors 'self'",
			);
			expect(headers["Content-Security-Policy"]).not.toContain(
				"frame-ancestors 'none'",
			);
		}
	});
});
