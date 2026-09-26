import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ photo: vi.fn(), user: vi.fn() }));
vi.mock("../src/shared/lib/prisma", () => ({
	prisma: { websiteProjectPhoto: { findUnique: mocks.photo } },
}));
vi.mock("../src/modules/auth/application/current-user", () => ({
	getCurrentUser: mocks.user,
}));

import { GET } from "../src/app/api/website/photos/[id]/route";

const request = () =>
	GET(new Request("https://example.com/api/website/photos/photo"), {
		params: Promise.resolve({ id: "photo" }),
	});
describe("persistent website images", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.user.mockResolvedValue(null);
	});
	it("serves the stored bytes without a local filesystem dependency", async () => {
		mocks.photo.mockResolvedValue({
			active: true,
			imageData: new Uint8Array([1, 2, 3]),
			imageMimeType: "image/png",
		});
		const response = await request();
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/png");
		expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([
			1, 2, 3,
		]);
		expect(response.headers.get("cache-control")).toContain("no-store");
	});
	it("hides unpublished photos from anonymous visitors", async () => {
		mocks.photo.mockResolvedValue({
			active: false,
			imageData: new Uint8Array([1]),
			imageMimeType: "image/png",
		});
		expect((await request()).status).toBe(404);
	});
	it("returns 404 for missing files", async () => {
		mocks.photo.mockResolvedValue(null);
		expect((await request()).status).toBe(404);
	});
});
