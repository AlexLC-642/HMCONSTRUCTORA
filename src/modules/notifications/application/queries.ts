import type { Route } from "next";
import {
	hasPortfolioAccess,
	hasProjectScopePortfolioAccess,
	projectAccessWhere,
	projectScopeWhere,
} from "@/modules/auth/application/authorization";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { prisma } from "@/shared/lib/prisma";
import type { SystemNotification } from "../domain/types";

export async function getSystemNotifications(
	user: AuthenticatedUser,
): Promise<SystemNotification[]> {
	const permissions = new Set(user.permissions);
	const projectRelationWhere = hasPortfolioAccess(user)
		? undefined
		: projectAccessWhere(user);
	const canSeePurchasePortfolio = hasProjectScopePortfolioAccess(
		user,
		"purchases",
	);
	const purchaseProjectWhere = projectScopeWhere(user, "purchases");
	const financeProjectWhere = projectScopeWhere(user, "finances");
	const canSeeInventoryPortfolio = hasProjectScopePortfolioAccess(
		user,
		"inventory",
	);
	const inventoryProjectWhere = projectScopeWhere(user, "inventory");
	const canSeeFinancePortfolio = hasProjectScopePortfolioAccess(
		user,
		"finances",
	);
	const now = new Date();
	const today = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
	);
	const creditWindowEnd = new Date(today);
	creditWindowEnd.setUTCDate(creditWindowEnd.getUTCDate() + 7);

	const [
		newInquiries,
		pendingRequisitions,
		draftBudgets,
		pendingReports,
		reviewDocuments,
		failedSyncs,
		overdueProjects,
		blockedActivities,
		stockLevels,
		approvedPurchases,
		overdueOrders,
		receivedWithoutInvoice,
		creditOrders,
		pendingWasteReviews,
	] = await Promise.all([
		permissions.has("sitio.editar")
			? prisma.websiteInquiry.count({ where: { status: "NEW" } })
			: Promise.resolve(0),
		permissions.has("requerimiento.aprobar")
			? prisma.requisition.count({
					where: { status: { in: ["REQUESTED", "REVIEWED"] } },
				})
			: Promise.resolve(0),
		permissions.has("presupuesto.aprobar")
			? prisma.budgetVersion.count({
					where: {
						status: "DRAFT",
						...(projectRelationWhere
							? { budget: { project: projectRelationWhere } }
							: {}),
					},
				})
			: Promise.resolve(0),
		permissions.has("avance.revisar")
			? prisma.dailyReport.count({
					where: {
						status: { in: ["SUBMITTED", "REVIEWED"] },
						...(projectRelationWhere ? { project: projectRelationWhere } : {}),
					},
				})
			: Promise.resolve(0),
		permissions.has("documentos.compartir")
			? prisma.projectDocument.count({
					where: {
						status: "REVIEW",
						...(projectRelationWhere ? { project: projectRelationWhere } : {}),
					},
				})
			: Promise.resolve(0),
		permissions.has("proyectos.ver")
			? prisma.syncOperation.count({
					where: {
						status: "FAILED",
						...(projectRelationWhere ? { project: projectRelationWhere } : {}),
					},
				})
			: Promise.resolve(0),
		permissions.has("proyectos.ver")
			? prisma.project.count({
					where: {
						...(projectRelationWhere ?? {}),
						status: { in: ["PLANNING", "ACTIVE"] },
						expectedEndDate: { lt: new Date() },
						actualEndDate: null,
					},
				})
			: Promise.resolve(0),
		permissions.has("cronograma.ver")
			? prisma.scheduleActivity.count({
					where: {
						status: "BLOCKED",
						...(projectRelationWhere
							? { schedule: { project: projectRelationWhere } }
							: {}),
					},
				})
			: Promise.resolve(0),
		permissions.has("inventario.mover")
			? prisma.stock.findMany({
					where: { material: { active: true }, warehouse: { active: true } },
					select: {
						quantity: true,
						material: { select: { minimumStock: true } },
					},
				})
			: Promise.resolve([]),
		permissions.has("compras.ver")
			? prisma.requisition.count({
					where: {
						status: "APPROVED",
						purchaseOrders: { none: { status: { not: "CANCELED" } } },
						...(!canSeePurchasePortfolio
							? { project: purchaseProjectWhere }
							: {}),
					},
				})
			: Promise.resolve(0),
		permissions.has("compras.ver")
			? prisma.purchaseOrder.count({
					where: {
						status: { in: ["ISSUED", "PARTIAL"] },
						expectedDate: { lt: new Date() },
						...(!canSeePurchasePortfolio
							? { project: purchaseProjectWhere }
							: {}),
					},
				})
			: Promise.resolve(0),
		permissions.has("finanzas.ver")
			? prisma.purchaseOrder.count({
					where: {
						status: "RECEIVED",
						financialExpenses: { none: { status: "VALID" } },
						...(!canSeeFinancePortfolio
							? { project: financeProjectWhere }
							: {}),
					},
				})
			: Promise.resolve(0),
		permissions.has("finanzas.ver")
			? prisma.purchaseOrder.findMany({
					where: {
						paymentType: "CREDIT",
						paymentDueDate: { not: null },
						status: { not: "CANCELED" },
						...(!canSeeFinancePortfolio
							? { project: financeProjectWhere }
							: {}),
					},
					select: {
						total: true,
						paymentDueDate: true,
						financialExpenses: {
							where: { status: "VALID" },
							select: {
								supplierPayments: {
									where: { status: "REGISTERED" },
									select: { amount: true },
								},
							},
						},
					},
				})
			: Promise.resolve([]),
		permissions.has("inventario.desperdicio.revisar")
			? prisma.stockMovement.count({
					where: {
						type: "WASTE",
						wasteReviewStatus: { in: ["PENDING", "NEEDS_ACTION"] },
						...(!canSeeInventoryPortfolio
							? { project: inventoryProjectWhere }
							: {}),
					},
				})
			: Promise.resolve(0),
	]);
	const lowStock = stockLevels.filter(
		(stock) =>
			stock.material.minimumStock.gt(0) &&
			stock.quantity.lte(stock.material.minimumStock),
	).length;
	const pendingCreditOrders = creditOrders.filter((order) => {
		const paid = order.financialExpenses
			.flatMap((expense) => expense.supplierPayments)
			.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
		return paid < order.total.toNumber();
	});
	const overdueCreditOrders = pendingCreditOrders.filter(
		(order) => order.paymentDueDate && order.paymentDueDate < today,
	).length;
	const dueSoonCreditOrders = pendingCreditOrders.filter(
		(order) =>
			order.paymentDueDate &&
			order.paymentDueDate >= today &&
			order.paymentDueDate <= creditWindowEnd,
	).length;

	const alerts: SystemNotification[] = [];
	const addAlert = (
		id: string,
		count: number,
		title: string,
		detail: string,
		href: Route,
		module: string,
		actionLabel: string,
	) => {
		if (count < 1) return;
		alerts.push({
			id: `alert:${id}:${count}`,
			title,
			detail: `${count} ${detail}`,
			href,
			unread: true,
			type: "alert",
			module,
			actionLabel,
		});
	};
	addAlert(
		"overdue-credit-purchases",
		overdueCreditOrders,
		"Créditos de proveedor vencidos",
		overdueCreditOrders === 1
			? "compra a crédito conserva saldo después de su vencimiento."
			: "compras a crédito conservan saldo después de su vencimiento.",
		"/purchases?view=orders" as Route,
		"Compras",
		"Revisar créditos",
	);
	addAlert(
		"credit-purchases-due-soon",
		dueSoonCreditOrders,
		"Créditos próximos a vencer",
		dueSoonCreditOrders === 1
			? "compra a crédito vence durante los próximos 7 días."
			: "compras a crédito vencen durante los próximos 7 días.",
		"/purchases?view=orders" as Route,
		"Compras",
		"Programar pagos",
	);
	addAlert(
		"received-without-invoice",
		receivedWithoutInvoice,
		"Recepciones pendientes de factura",
		receivedWithoutInvoice === 1
			? "orden recibida debe registrarse en cuentas por pagar."
			: "ordenes recibidas deben registrarse en cuentas por pagar.",
		"/finances" as Route,
		"Finanzas",
		"Registrar facturas",
	);
	addAlert(
		"overdue-purchase-orders",
		overdueOrders,
		"Órdenes con entrega vencida",
		overdueOrders === 1
			? "orden necesita seguimiento con el proveedor."
			: "órdenes necesitan seguimiento con el proveedor.",
		"/purchases?status=ISSUED" as Route,
		"Compras",
		"Revisar órdenes",
	);
	addAlert(
		"approved-purchases",
		approvedPurchases,
		"Compras listas para preparar",
		approvedPurchases === 1
			? "requerimiento aprobado aún no tiene orden."
			: "requerimientos aprobados aún no tienen orden.",
		"/purchases?view=requisitions" as Route,
		"Compras",
		"Preparar órdenes",
	);
	addAlert(
		"overdue-projects",
		overdueProjects,
		"Proyectos fuera de fecha",
		overdueProjects === 1
			? "proyecto superó su finalización prevista."
			: "proyectos superaron su finalización prevista.",
		"/projects",
		"Proyectos",
		"Revisar proyectos",
	);
	addAlert(
		"blocked-activities",
		blockedActivities,
		"Actividades bloqueadas",
		blockedActivities === 1
			? "actividad requiere atención."
			: "actividades requieren atención.",
		"/projects",
		"Cronograma",
		"Revisar cronogramas",
	);
	addAlert(
		"waste-reviews",
		pendingWasteReviews,
		"Desperdicios por revisar",
		pendingWasteReviews === 1
			? "movimiento necesita seguimiento."
			: "movimientos necesitan seguimiento.",
		"/inventory?view=movement&review=pending" as Route,
		"Inventario",
		"Revisar desperdicios",
	);
	addAlert(
		"low-stock",
		lowStock,
		"Existencias en nivel crítico",
		lowStock === 1
			? "existencia alcanzó su mínimo."
			: "existencias alcanzaron su mínimo.",
		"/inventory?view=stock&status=low" as Route,
		"Inventario",
		"Revisar existencias",
	);
	addAlert(
		"website-inquiries",
		newInquiries,
		"Solicitudes web nuevas",
		newInquiries === 1
			? "solicitud espera atención."
			: "solicitudes esperan atención.",
		"/website?tab=solicitudes" as Route,
		"Sitio web",
		"Atender solicitudes",
	);
	addAlert(
		"requisitions",
		pendingRequisitions,
		"Requerimientos por revisar",
		pendingRequisitions === 1
			? "requerimiento necesita revisión."
			: "requerimientos necesitan revisión.",
		"/requisitions",
		"Requerimientos",
		"Revisar requerimientos",
	);
	addAlert(
		"budgets",
		draftBudgets,
		"Presupuestos en borrador",
		draftBudgets === 1
			? "presupuesto sigue pendiente."
			: "presupuestos siguen pendientes.",
		"/projects",
		"Presupuestos",
		"Revisar presupuestos",
	);
	addAlert(
		"reports",
		pendingReports,
		"Avances pendientes",
		pendingReports === 1
			? "informe necesita revisión."
			: "informes necesitan revisión.",
		"/reports",
		"Informes",
		"Revisar informes",
	);
	addAlert(
		"documents",
		reviewDocuments,
		"Documentos en revisión",
		reviewDocuments === 1
			? "documento espera aprobación."
			: "documentos esperan aprobación.",
		"/documents",
		"Documentos",
		"Revisar documentos",
	);
	addAlert(
		"sync",
		failedSyncs,
		"Sincronizaciones con error",
		failedSyncs === 1
			? "operación necesita reintento."
			: "operaciones necesitan reintento.",
		"/projects",
		"Sistema",
		"Revisar proyectos",
	);

	return alerts;
}
