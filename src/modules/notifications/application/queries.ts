import type { Route } from "next";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import type { SystemNotification } from "../domain/types";
import { prisma } from "@/shared/lib/prisma";

export async function getSystemNotifications(
	user: AuthenticatedUser,
): Promise<SystemNotification[]> {
	const permissions = new Set(user.permissions);

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
			? prisma.budgetVersion.count({ where: { status: "DRAFT" } })
			: Promise.resolve(0),
		permissions.has("avance.revisar")
			? prisma.dailyReport.count({
					where: { status: { in: ["SUBMITTED", "REVIEWED"] } },
				})
			: Promise.resolve(0),
		permissions.has("documentos.compartir")
			? prisma.projectDocument.count({ where: { status: "REVIEW" } })
			: Promise.resolve(0),
		permissions.has("proyectos.ver")
			? prisma.syncOperation.count({ where: { status: "FAILED" } })
			: Promise.resolve(0),
		permissions.has("proyectos.ver")
			? prisma.project.count({
					where: {
						status: { in: ["PLANNING", "ACTIVE"] },
						expectedEndDate: { lt: new Date() },
						actualEndDate: null,
					},
				})
			: Promise.resolve(0),
		permissions.has("cronograma.ver")
			? prisma.scheduleActivity.count({ where: { status: "BLOCKED" } })
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
	]);
	const lowStock = stockLevels.filter(
		(stock) =>
			stock.material.minimumStock.gt(0) &&
			stock.quantity.lte(stock.material.minimumStock),
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
