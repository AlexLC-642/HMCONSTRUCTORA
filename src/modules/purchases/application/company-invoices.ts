import { documentFileUrl } from "@/modules/documents/domain/catalog";
import { prisma } from "@/shared/lib/prisma";

/**
 * Facturas de compras de la compañía: órdenes de bodega (sin proyecto). Son
 * `FinancialExpense` con `projectId` null, así que nunca suman a una obra; el
 * costo llega a cada proyecto cuando el material sale de bodega.
 */
export type CompanyInvoiceFilters = {
	from?: string;
	to?: string;
};

function day(value: string | undefined, endOfDay = false) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
	return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
}

export async function getCompanyInvoices(filters: CompanyInvoiceFilters = {}) {
	const from = day(filters.from);
	const to = day(filters.to, true);
	const rows = await prisma.financialExpense.findMany({
		where: {
			projectId: null,
			status: "VALID",
			purchaseOrderId: { not: null },
			...(from || to
				? {
						expenseDate: {
							...(from ? { gte: from } : {}),
							...(to ? { lte: to } : {}),
						},
					}
				: {}),
		},
		select: {
			id: true,
			expenseDate: true,
			documentNumber: true,
			subtotal: true,
			notes: true,
			supplier: { select: { businessName: true, taxId: true } },
			purchaseOrder: {
				select: {
					id: true,
					number: true,
					paymentType: true,
					warehouse: { select: { name: true } },
				},
			},
			supportingDocument: {
				select: {
					versions: {
						select: { id: true },
						orderBy: { versionNumber: "desc" },
						take: 1,
					},
				},
			},
			createdBy: { select: { name: true } },
		},
		orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
	});

	const invoices = rows.map((row) => {
		const versionId = row.supportingDocument?.versions[0]?.id;
		return {
			id: row.id,
			date: row.expenseDate.toISOString(),
			number: row.documentNumber,
			amount: row.subtotal.toNumber(),
			supplier: row.supplier?.businessName ?? "Sin proveedor",
			supplierTaxId: row.supplier?.taxId ?? null,
			orderId: row.purchaseOrder?.id ?? null,
			orderNumber: row.purchaseOrder?.number ?? null,
			paymentType: row.purchaseOrder?.paymentType ?? null,
			warehouse: row.purchaseOrder?.warehouse?.name ?? null,
			registeredBy: row.createdBy?.name ?? null,
			fileUrl: versionId ? documentFileUrl(versionId) : null,
		};
	});

	const bySupplier = Array.from(
		invoices.reduce((groups, invoice) => {
			const current = groups.get(invoice.supplier) ?? { count: 0, total: 0 };
			groups.set(invoice.supplier, {
				count: current.count + 1,
				total: current.total + invoice.amount,
			});
			return groups;
		}, new Map<string, { count: number; total: number }>()),
	)
		.map(([supplier, value]) => ({ supplier, ...value }))
		.sort((left, right) => right.total - left.total);

	return {
		invoices,
		bySupplier,
		total: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
	};
}
