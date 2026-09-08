import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const isSuperAdministrator = vi.fn();
const deleteMany = vi.fn().mockResolvedValue({ count: 0 });

vi.mock("@/modules/auth/application/current-user", () => ({
	getCurrentUser: (...args: unknown[]) => getCurrentUser(...args)
}));

vi.mock("@/modules/auth/application/authorization", () => ({
	isSuperAdministrator: (...args: unknown[]) => isSuperAdministrator(...args)
}));

vi.mock("@/shared/lib/prisma", () => {
	const models = [
		"dailyReportActivity", "dailyReportLabor", "dailyReportMaterial", "dailyReportMedia",
		"dailyReport", "scheduleActivityDependency", "scheduleAssignment", "scheduleActivity",
		"schedule", "budgetLineItem", "budgetSection", "budgetVersion", "budget",
		"requisitionItem", "requisition", "stockMovement", "stock", "inventoryMaterial",
		"warehouse", "documentVersion", "projectDocument", "projectMember", "portalShare",
		"project", "financialExpense", "clientPayment", "client"
	];
	const prisma = Object.fromEntries(models.map((model) => [model, { deleteMany }]));
	return { prisma };
});

// This endpoint deletes nearly all operational data (see docs/security-audit.md
// C1) and must be unreachable unless every one of its three gates holds:
// NODE_ENV=development, an explicit ALLOW_DEV_DB_RESET=true opt-in, and an
// authenticated superadministrator session. These tests exercise each gate
// in isolation with the real database and session lookups mocked out.
describe("POST /api/dev/reset-database", () => {
	beforeEach(() => {
		getCurrentUser.mockReset();
		isSuperAdministrator.mockReset();
		deleteMany.mockClear();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("refuses when NODE_ENV is not development, even with every other condition satisfied", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("ALLOW_DEV_DB_RESET", "true");
		getCurrentUser.mockResolvedValue({ id: "u1", roles: ["SUPERADMIN"] });
		isSuperAdministrator.mockReturnValue(true);

		const { POST } = await import("@/app/api/dev/reset-database/route");
		const response = await POST();

		expect(response.status).toBe(403);
		expect(getCurrentUser).not.toHaveBeenCalled();
		expect(deleteMany).not.toHaveBeenCalled();
	});

	it("refuses in development when ALLOW_DEV_DB_RESET is not explicitly \"true\"", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("ALLOW_DEV_DB_RESET", "");
		getCurrentUser.mockResolvedValue({ id: "u1", roles: ["SUPERADMIN"] });
		isSuperAdministrator.mockReturnValue(true);

		const { POST } = await import("@/app/api/dev/reset-database/route");
		const response = await POST();

		expect(response.status).toBe(403);
		expect(getCurrentUser).not.toHaveBeenCalled();
		expect(deleteMany).not.toHaveBeenCalled();
	});

	it("refuses when there is no authenticated session, even with NODE_ENV and the opt-in set", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("ALLOW_DEV_DB_RESET", "true");
		getCurrentUser.mockResolvedValue(null);

		const { POST } = await import("@/app/api/dev/reset-database/route");
		const response = await POST();

		expect(response.status).toBe(403);
		expect(deleteMany).not.toHaveBeenCalled();
	});

	it("refuses an authenticated session that is not a superadministrator", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("ALLOW_DEV_DB_RESET", "true");
		getCurrentUser.mockResolvedValue({ id: "u1", roles: ["GERENTE"] });
		isSuperAdministrator.mockReturnValue(false);

		const { POST } = await import("@/app/api/dev/reset-database/route");
		const response = await POST();

		expect(response.status).toBe(403);
		expect(deleteMany).not.toHaveBeenCalled();
	});

	it("proceeds only when all three gates hold", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("ALLOW_DEV_DB_RESET", "true");
		getCurrentUser.mockResolvedValue({ id: "u1", roles: ["SUPERADMIN"] });
		isSuperAdministrator.mockReturnValue(true);

		const { POST } = await import("@/app/api/dev/reset-database/route");
		const response = await POST();

		expect(response.status).toBe(200);
		expect(deleteMany).toHaveBeenCalled();
	});
});
