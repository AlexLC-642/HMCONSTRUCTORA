import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const hasPermission = vi.fn();
const findUnique = vi.fn();
const readFile = vi.fn();
const canAccessProject = vi.fn();

vi.mock("@/modules/auth/application/current-user", () => ({
	getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));
vi.mock("@/modules/auth/application/authorization", () => ({
	canAccessProject: (...args: unknown[]) => canAccessProject(...args),
}));
vi.mock("@/shared/permissions/has-permission", () => ({
	hasPermission: (...args: unknown[]) => hasPermission(...args),
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		dailyReportMedia: {
			findUnique: (...args: unknown[]) => findUnique(...args),
		},
	},
}));
vi.mock("node:fs/promises", () => ({
	readFile: (...args: unknown[]) => readFile(...args),
}));

const params = (mediaId: string) => Promise.resolve({ mediaId });
const media = {
	storageKey: "uploads/progress/p1/r1/foto.jpg",
	mimeType: "image/jpeg",
	originalName: "foto.jpg",
	dailyReport: { projectId: "p1" },
};

async function call() {
	const { GET } = await import("@/app/api/progress/media/[mediaId]/file/route");
	return GET(new Request("http://localhost/x"), { params: params("m1") });
}

// Las evidencias subidas después del build no se sirven desde public/ en
// producción; esta ruta las entrega con sesión y acceso al proyecto.
describe("GET /api/progress/media/[mediaId]/file", () => {
	beforeEach(() => {
		getCurrentUser.mockReset();
		hasPermission.mockReset();
		findUnique.mockReset();
		readFile.mockReset();
		canAccessProject.mockReset();
	});

	it("returns 401 without a session", async () => {
		getCurrentUser.mockResolvedValue(null);
		expect((await call()).status).toBe(401);
		expect(findUnique).not.toHaveBeenCalled();
	});

	it("returns 403 without project or progress permission", async () => {
		getCurrentUser.mockResolvedValue({ id: "u1", permissions: [] });
		hasPermission.mockReturnValue(false);
		expect((await call()).status).toBe(403);
		expect(findUnique).not.toHaveBeenCalled();
	});

	it("returns 403 when the user cannot access the report's project", async () => {
		getCurrentUser.mockResolvedValue({ id: "u1", permissions: [] });
		hasPermission.mockReturnValue(true);
		findUnique.mockResolvedValue(media);
		canAccessProject.mockResolvedValue(false);
		expect((await call()).status).toBe(403);
		expect(readFile).not.toHaveBeenCalled();
	});

	it("serves the file with its MIME type", async () => {
		getCurrentUser.mockResolvedValue({ id: "u1", permissions: [] });
		hasPermission.mockReturnValue(true);
		findUnique.mockResolvedValue(media);
		canAccessProject.mockResolvedValue(true);
		readFile.mockResolvedValue(Buffer.from([0xff, 0xd8, 0xff]));
		const response = await call();
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/jpeg");
	});
});
