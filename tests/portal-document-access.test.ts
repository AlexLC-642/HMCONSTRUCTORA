import { beforeEach, describe, expect, it, vi } from "vitest";

const resolvePortalShare = vi.fn();
const findUnique = vi.fn();
const readStoredFile = vi.fn();

vi.mock("@/modules/client-portal/application/service", () => ({
	resolvePortalShare: (...args: unknown[]) => resolvePortalShare(...args),
}));
vi.mock("@/shared/lib/request-ip", () => ({
	requestIp: async () => "127.0.0.1",
}));
vi.mock("@/shared/lib/uploads", () => ({
	readStoredFile: (...args: unknown[]) => readStoredFile(...args),
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		documentVersion: {
			findUnique: (...args: unknown[]) => findUnique(...args),
		},
	},
}));

const version = (document: Record<string, unknown>) => ({
	storageKey: "uploads/documents/p1/d1/a.pdf",
	mimeType: "application/pdf",
	originalName: "a.pdf",
	document: {
		projectId: "p1",
		status: "APPROVED",
		portalVisible: true,
		project: { portalEnabled: true },
		...document,
	},
});

async function call() {
	const { GET } = await import(
		"@/app/api/portal/[token]/documents/[versionId]/file/route"
	);
	return GET(new Request("http://localhost/x"), {
		params: Promise.resolve({ token: "t", versionId: "v1" }),
	});
}

// El portal no tiene sesión de empleado: solo el token decide, y solo
// entrega documentos aprobados y visibles del proyecto de ese enlace.
describe("GET /api/portal/[token]/documents/[versionId]/file", () => {
	beforeEach(() => {
		resolvePortalShare.mockReset();
		findUnique.mockReset();
		readStoredFile.mockReset();
	});

	it("404 con un token inválido, vencido o revocado", async () => {
		resolvePortalShare.mockResolvedValue(null);
		expect((await call()).status).toBe(404);
		expect(findUnique).not.toHaveBeenCalled();
	});

	it("404 si el documento es de otro proyecto", async () => {
		resolvePortalShare.mockResolvedValue({ projectId: "p1" });
		findUnique.mockResolvedValue(version({ projectId: "p2" }));
		expect((await call()).status).toBe(404);
		expect(readStoredFile).not.toHaveBeenCalled();
	});

	it("404 si el documento no está visible para el cliente o no está aprobado", async () => {
		resolvePortalShare.mockResolvedValue({ projectId: "p1" });
		findUnique.mockResolvedValue(version({ portalVisible: false }));
		expect((await call()).status).toBe(404);
		findUnique.mockResolvedValue(version({ status: "DRAFT" }));
		expect((await call()).status).toBe(404);
		expect(readStoredFile).not.toHaveBeenCalled();
	});

	it("entrega el documento aprobado y visible", async () => {
		resolvePortalShare.mockResolvedValue({ projectId: "p1" });
		findUnique.mockResolvedValue(version({}));
		readStoredFile.mockResolvedValue(Buffer.from("%PDF-1.4"));
		const response = await call();
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
	});
});
