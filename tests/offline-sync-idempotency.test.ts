import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const hasPermission = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();
const create = vi.fn();
const saveDailyReport = vi.fn();
const readDailyReportFormData = vi.fn();
const projectCount = vi.fn();

vi.mock("@/modules/auth/application/current-user", () => ({
	getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));

vi.mock("@/shared/permissions/has-permission", () => ({
	hasPermission: (...args: unknown[]) => hasPermission(...args),
}));

vi.mock("@/modules/progress/application/service", () => ({
	saveDailyReport: (...args: unknown[]) => saveDailyReport(...args),
}));

vi.mock("@/modules/progress/application/form-data", () => ({
	readDailyReportFormData: (...args: unknown[]) =>
		readDailyReportFormData(...args),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		project: {
			count: (...args: unknown[]) => projectCount(...args),
		},
		syncOperation: {
			findUnique: (...args: unknown[]) => findUnique(...args),
			update: (...args: unknown[]) => update(...args),
			create: (...args: unknown[]) => create(...args),
		},
	},
}));

function jsonRequest(body: unknown) {
	return new Request("http://localhost/api/projects/p1/progress/offline-sync", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

const params = Promise.resolve({ id: "project-1" });

// See docs/security-audit.md M2: the offline-sync idempotency lookup used to
// key only on idempotencyKey, so one user could read back another user's
// cached sync result (reportId/reportNumber/status) just by reusing or
// guessing their key. These tests pin the ownership check that fixed it.
describe("POST /api/projects/[id]/progress/offline-sync — idempotency ownership", () => {
	beforeEach(() => {
		getCurrentUser.mockReset();
		hasPermission.mockReset();
		findUnique.mockReset();
		update.mockReset();
		create.mockReset();
		saveDailyReport.mockReset();
		readDailyReportFormData.mockReset();
		projectCount.mockReset();

		getCurrentUser.mockResolvedValue({
			id: "user-a",
			roles: ["supervisor"],
			permissions: ["avance.crear"],
		});
		hasPermission.mockReturnValue(true);
		projectCount.mockResolvedValue(1);
	});

	it("rejects synchronization for a project outside the user's assignments", async () => {
		projectCount.mockResolvedValue(0);

		const { POST } = await import(
			"@/app/api/projects/[id]/progress/offline-sync/route"
		);
		const response = await POST(
			jsonRequest({
				idempotencyKey: "foreign-project-123",
				operationType: "dailyReport.saveDraft",
				formData: {},
			}),
			{ params },
		);

		expect(response.status).toBe(403);
		expect(findUnique).not.toHaveBeenCalled();
		expect(saveDailyReport).not.toHaveBeenCalled();
	});

	it("refuses to hand back a cached result that belongs to a different user", async () => {
		findUnique.mockResolvedValue({
			id: "sync-1",
			userId: "user-b",
			status: "SYNCED",
			result: { reportId: "report-b", reportNumber: 7, status: "SUBMITTED" },
		});

		const { POST } = await import(
			"@/app/api/projects/[id]/progress/offline-sync/route"
		);
		const response = await POST(
			jsonRequest({
				idempotencyKey: "shared-key-123",
				operationType: "dailyReport.saveDraft",
				formData: {},
			}),
			{ params },
		);

		expect(response.status).toBe(409);
		const body = await response.json();
		expect(body.error.code).toBe("IDEMPOTENCY_KEY_CONFLICT");
		expect(update).not.toHaveBeenCalled();
		expect(saveDailyReport).not.toHaveBeenCalled();
	});

	it("replays the cached result when the key belongs to the requesting user", async () => {
		findUnique.mockResolvedValue({
			id: "sync-1",
			userId: "user-a",
			status: "SYNCED",
			result: { reportId: "report-a", reportNumber: 3, status: "SUBMITTED" },
		});

		const { POST } = await import(
			"@/app/api/projects/[id]/progress/offline-sync/route"
		);
		const response = await POST(
			jsonRequest({
				idempotencyKey: "own-key-123456",
				operationType: "dailyReport.saveDraft",
				formData: {},
			}),
			{ params },
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.data.reportId).toBe("report-a");
		expect(saveDailyReport).not.toHaveBeenCalled();
	});

	it("creates a fresh operation for a brand new key with no prior owner", async () => {
		findUnique.mockResolvedValue(null);
		create.mockResolvedValue({
			id: "sync-2",
			userId: "user-a",
			status: "PENDING",
		});
		update.mockResolvedValue({});
		readDailyReportFormData.mockReturnValue({});
		saveDailyReport.mockResolvedValue({
			id: "report-c",
			reportNumber: 9,
			status: "SUBMITTED",
		});

		const { POST } = await import(
			"@/app/api/projects/[id]/progress/offline-sync/route"
		);
		const response = await POST(
			jsonRequest({
				idempotencyKey: "new-key-123456",
				operationType: "dailyReport.saveDraft",
				formData: {},
			}),
			{ params },
		);

		expect(response.status).toBe(200);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ userId: "user-a" }),
			}),
		);
	});
});
