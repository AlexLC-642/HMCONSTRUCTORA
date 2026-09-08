import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const hasPermission = vi.fn();
const findUnique = vi.fn();
const readFile = vi.fn();

vi.mock("@/modules/auth/application/current-user", () => ({
	getCurrentUser: (...args: unknown[]) => getCurrentUser(...args)
}));

vi.mock("@/shared/permissions/has-permission", () => ({
	hasPermission: (...args: unknown[]) => hasPermission(...args)
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		documentVersion: {
			findUnique: (...args: unknown[]) => findUnique(...args)
		}
	}
}));

vi.mock("node:fs/promises", () => ({
	readFile: (...args: unknown[]) => readFile(...args)
}));

const params = (versionId: string) => Promise.resolve({ versionId });

// See docs/security-audit.md H1: documents uploaded to public/uploads/... are
// served as static files with no access control at all, so "remove from
// portal" (portalVisible: false) never actually revoked download access.
// This route is the authenticated front door the internal UI now links to
// instead - these tests pin its three gates (session, permission, existence).
describe("GET /api/documents/versions/[versionId]/file", () => {
	beforeEach(() => {
		getCurrentUser.mockReset();
		hasPermission.mockReset();
		findUnique.mockReset();
		readFile.mockReset();
	});

	it("returns 401 when there is no authenticated session", async () => {
		getCurrentUser.mockResolvedValue(null);

		const { GET } = await import("@/app/api/documents/versions/[versionId]/file/route");
		const response = await GET(new Request("http://localhost/x"), { params: params("v1") });

		expect(response.status).toBe(401);
		expect(findUnique).not.toHaveBeenCalled();
	});

	it("returns 403 for a session without the proyectos.ver permission", async () => {
		getCurrentUser.mockResolvedValue({ id: "u1", permissions: [] });
		hasPermission.mockReturnValue(false);

		const { GET } = await import("@/app/api/documents/versions/[versionId]/file/route");
		const response = await GET(new Request("http://localhost/x"), { params: params("v1") });

		expect(response.status).toBe(403);
		expect(findUnique).not.toHaveBeenCalled();
	});

	it("returns 404 when the version does not exist", async () => {
		getCurrentUser.mockResolvedValue({ id: "u1", permissions: ["proyectos.ver"] });
		hasPermission.mockReturnValue(true);
		findUnique.mockResolvedValue(null);

		const { GET } = await import("@/app/api/documents/versions/[versionId]/file/route");
		const response = await GET(new Request("http://localhost/x"), { params: params("missing") });

		expect(response.status).toBe(404);
	});

	it("returns 404 when the version exists but the file is missing on disk", async () => {
		getCurrentUser.mockResolvedValue({ id: "u1", permissions: ["proyectos.ver"] });
		hasPermission.mockReturnValue(true);
		findUnique.mockResolvedValue({
			id: "v1",
			storageKey: "uploads/documents/missing.pdf",
			mimeType: "application/pdf",
			originalName: "contrato.pdf"
		});
		readFile.mockRejectedValue(new Error("ENOENT"));

		const { GET } = await import("@/app/api/documents/versions/[versionId]/file/route");
		const response = await GET(new Request("http://localhost/x"), { params: params("v1") });

		expect(response.status).toBe(404);
	});

	it("serves the file with the right headers for an authenticated, permitted request", async () => {
		getCurrentUser.mockResolvedValue({ id: "u1", permissions: ["proyectos.ver"] });
		hasPermission.mockReturnValue(true);
		findUnique.mockResolvedValue({
			id: "v1",
			storageKey: "uploads/documents/contrato.pdf",
			mimeType: "application/pdf",
			originalName: "contrato firmado.pdf"
		});
		readFile.mockResolvedValue(Buffer.from("%PDF-1.4 fake content"));

		const { GET } = await import("@/app/api/documents/versions/[versionId]/file/route");
		const response = await GET(new Request("http://localhost/x"), { params: params("v1") });

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
		expect(response.headers.get("Content-Disposition")).toContain("contrato");
		expect(response.headers.get("Cache-Control")).toContain("private");
	});
});
