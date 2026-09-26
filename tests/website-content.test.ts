import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	connection: vi.fn(),
	settings: vi.fn(),
	services: vi.fn(),
	photos: vi.fn(),
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("../src/modules/website/application/service", () => ({
	getWebsiteSettings: mocks.settings,
	listWebsiteServices: mocks.services,
	listWebsitePhotos: mocks.photos,
	listReusableProjectEvidence: vi.fn(),
	listWebsiteInquiries: vi.fn(),
}));

import { getPublicWebsiteContent } from "../src/modules/website/application/queries";

describe("public CMS content", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.settings.mockResolvedValue({ published: true, heroHeading: "HM" });
	});
	it("reads current records on each request and excludes inactive records", async () => {
		mocks.services
			.mockResolvedValueOnce([
				{ id: "first", active: true },
				{ id: "hidden", active: false },
			])
			.mockResolvedValueOnce([{ id: "changed", active: true }]);
		mocks.photos.mockResolvedValue([
			{ id: "photo", active: true },
			{ id: "hidden", active: false },
		]);
		expect(
			(await getPublicWebsiteContent()).services.map((item) => item.id),
		).toEqual(["first"]);
		const next = await getPublicWebsiteContent();
		expect(next.services.map((item) => item.id)).toEqual(["changed"]);
		expect(next.photos.map((item) => item.id)).toEqual(["photo"]);
		expect(mocks.connection).toHaveBeenCalledTimes(2);
	});
	it("does not republish deleted collections through invisible fallback records", async () => {
		mocks.services.mockResolvedValue([]);
		mocks.photos.mockResolvedValue([]);
		const content = await getPublicWebsiteContent();
		expect(content.services).toEqual([]);
		expect(content.photos).toEqual([]);
	});
	it("hides all content while the website is unpublished", async () => {
		mocks.settings.mockResolvedValue({ published: false });
		mocks.services.mockResolvedValue([{ id: "service", active: true }]);
		mocks.photos.mockResolvedValue([{ id: "photo", active: true }]);
		expect(await getPublicWebsiteContent()).toEqual({
			settings: null,
			services: [],
			photos: [],
		});
	});
});
