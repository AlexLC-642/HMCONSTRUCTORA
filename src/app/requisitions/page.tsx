import {
	Boxes,
	Building2,
	CalendarDays,
	CheckCircle2,
	ClipboardCheck,
	Clock3,
	Link2,
	PackageCheck,
	Plus,
	ShoppingCart,
	SlidersHorizontal,
	Truck,
	Warehouse,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	approveRequisitionAction,
	closeRequisitionAction,
	deliverRequisitionAction,
	markRequisitionPurchasedAction,
	receiveRequisitionAction,
	rejectRequisitionAction,
	reviewRequisitionAction,
} from "@/modules/requisitions/application/actions";
import { getRequisitionWorkspace } from "@/modules/requisitions/application/queries";
import {
	requisitionPriorityLabels,
	requisitionStatusLabels,
} from "@/modules/requisitions/domain/validation";
import { RequisitionCreateDialog } from "@/modules/requisitions/ui/requisition-create-dialog";
import { RequisitionMaterialLinkDialog } from "@/modules/requisitions/ui/requisition-material-link-dialog";
import { RequisitionStatusStepper } from "@/modules/requisitions/ui/requisition-status-stepper";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";

const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const numberFormatter = new Intl.NumberFormat("es-GT", {
	maximumFractionDigits: 2,
});

const statusTone = {
	DRAFT: "neutral",
	REQUESTED: "warning",
	REVIEWED: "info",
	APPROVED: "success",
	PURCHASED: "violet",
	RECEIVED: "success",
	DELIVERED: "neutral",
	CLOSED: "neutral",
	REJECTED: "danger",
} as const;
const priorityTone = {
	LOW: "neutral",
	NORMAL: "success",
	HIGH: "warning",
	URGENT: "danger",
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid gap-1.5">
			<span className="requisitions-field-label">{label}</span>
			{children}
		</div>
	);
}

function ActionButton({
	action,
	id,
	label,
	primary = false,
}: {
	action: (formData: FormData) => Promise<void>;
	id: string;
	label: string;
	primary?: boolean;
}) {
	return (
		<form action={action}>
			<input name="requisitionId" type="hidden" value={id} />
			<button
				className={`focus-ring requisitions-action ${primary ? "requisitions-action--primary" : ""}`}
				type="submit"
			>
				{label}
			</button>
		</form>
	);
}

function Metric({
	label,
	value,
	detail,
	icon: Icon,
	tone,
}: {
	label: string;
	value: string;
	detail: string;
	icon: typeof ClipboardCheck;
	tone: "red" | "green" | "amber" | "steel";
}) {
	return (
		<div className="requisitions-metric" data-tone={tone}>
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#58635f]">
					{label}
				</p>
				<p className="mt-2 text-3xl font-semibold leading-none tabular-nums text-[#101416]">
					{value}
				</p>
				<p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
			</div>
			<span className="requisitions-metric__icon">
				<Icon aria-hidden="true" size={18} />
			</span>
		</div>
	);
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "Sin fecha límite";
	return new Intl.DateTimeFormat("es-GT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

function firstParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function toResourceType(type: string): "MATERIAL" | "TOOL" | "EQUIPMENT" {
	return type === "TOOL" || type === "EQUIPMENT" ? type : "MATERIAL";
}

export default async function RequisitionsPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const user = await requirePermission("inventario.mover");
	const canApprove = user.permissions.includes("requerimiento.aprobar");
	const params = searchParams ? await searchParams : {};
	const filters = {
		projectId: firstParam(params.projectId) ?? "",
		warehouseId: firstParam(params.warehouseId) ?? "",
		status: firstParam(params.status) ?? "",
	};
	const isCreating = firstParam(params.new) === "1";
	const linkItemId = firstParam(params.linkItem) ?? "";
	const {
		requisitions,
		materials,
		warehouses,
		projects,
		materialPlans,
		scheduleActivities,
	} = await getRequisitionWorkspace(filters);
	const linkRequisition = requisitions.find((requisition) =>
		requisition.items.some((item) => item.id === linkItemId),
	);
	const linkItem = linkRequisition?.items.find(
		(item) => item.id === linkItemId && !item.materialId,
	);
	const requesterName = user.name || user.email.split("@")[0];
	const activeFilters = [
		filters.projectId,
		filters.warehouseId,
		filters.status,
	].filter(Boolean).length;
	const pending = requisitions.filter(
		(item) => item.status === "REQUESTED" || item.status === "REVIEWED",
	).length;
	const inPurchase = requisitions.filter(
		(item) => item.status === "APPROVED" || item.status === "PURCHASED",
	).length;
	const received = requisitions.filter(
		(item) => item.status === "RECEIVED" || item.status === "DELIVERED",
	).length;
	const totalOpen = requisitions
		.filter((item) => item.status !== "CLOSED" && item.status !== "REJECTED")
		.reduce(
			(sum, requisition) =>
				sum +
				requisition.items.reduce(
					(subtotal, item) =>
						subtotal + item.estimatedCost.toNumber() * item.quantity.toNumber(),
					0,
				),
			0,
		);
	const selectedProject = projects.find(
		(project) => project.id === filters.projectId,
	);
	const projectPlans = filters.projectId
		? materialPlans.filter(
				(material) => material.projectId === filters.projectId,
			)
		: [];

	return (
		<main className="mx-auto max-w-[1520px] space-y-5">
			<section className="requisitions-hero">
				<div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
					<div className="flex max-w-3xl items-start gap-4">
						<span className="requisitions-hero__icon">
							<ClipboardCheck aria-hidden="true" size={22} />
						</span>
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ef9ba3]">
								Abastecimiento de obra
							</p>
							<h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">
								Requerimientos
							</h1>
							<p className="mt-2 max-w-2xl text-sm leading-6 text-[#c9d0ce]">
								Solicita recursos para una obra o para existencia de bodega y
								controla cada etapa sin registrar facturas fuera de Finanzas.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="requisitions-hero__stat">
							<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#c9d0ce]">
								Valor abierto
							</p>
							<p className="mt-1 text-2xl font-semibold tabular-nums text-white">
								{currencyFormatter.format(totalOpen)}
							</p>
						</div>
						<Link
							className="requisitions-new-button focus-ring"
							href="/requisitions?new=1"
						>
							<Plus aria-hidden="true" size={18} />
							Nueva solicitud
						</Link>
					</div>
				</div>
			</section>

			<section
				aria-label="Resumen de requerimientos"
				className="kpi-grid grid gap-3 md:grid-cols-2 xl:grid-cols-4"
			>
				<Metric
					detail="Solicitados o en revisión"
					icon={Clock3}
					label="Por revisar"
					tone="amber"
					value={String(pending)}
				/>
				<Metric
					detail="Aprobados o comprados"
					icon={ShoppingCart}
					label="En compra"
					tone="steel"
					value={String(inPurchase)}
				/>
				<Metric
					detail="En bodega o entregados"
					icon={Truck}
					label="Recepción"
					tone="green"
					value={String(received)}
				/>
				<Metric
					detail="Suma de solicitudes abiertas"
					icon={Boxes}
					label="Comprometido"
					tone="red"
					value={currencyFormatter.format(totalOpen)}
				/>
			</section>

			{materials.length === 0 || warehouses.length === 0 ? (
				<section className="requisitions-setup">
					<PackageCheck aria-hidden="true" size={18} />
					<div>
						<strong>Falta preparar el inventario</strong>
						<p>
							Crea al menos un recurso y una bodega antes de registrar
							solicitudes.
						</p>
					</div>
					<Link href="/inventory?view=catalog">Abrir inventario</Link>
				</section>
			) : null}

			{selectedProject && projectPlans.length > 0 ? (
				<section className="requisitions-panel overflow-hidden">
					<div className="requisitions-panel__heading">
						<div>
							<p className="requisitions-eyebrow">Presupuesto aprobado</p>
							<h2>Abastecimiento de {selectedProject.name}</h2>
							<p>
								Compara lo planificado con lo solicitado, comprado y recibido.
							</p>
						</div>
						<span className="requisitions-count">
							{projectPlans.length} partidas
						</span>
					</div>
					<div className="requisitions-plan-table-wrap">
						<table className="requisitions-plan-table">
							<thead>
								<tr>
									<th>Partida</th>
									<th>Presupuestado</th>
									<th>Solicitado</th>
									<th>Comprado</th>
									<th>Recibido</th>
									<th>Pendiente</th>
								</tr>
							</thead>
							<tbody>
								{projectPlans.map((material) => (
									<tr key={material.id}>
										<td>
											<strong>{material.name}</strong>
											<small>
												v{material.budgetVersion} · {material.unit}
											</small>
										</td>
										<td>{numberFormatter.format(material.planned)}</td>
										<td>{numberFormatter.format(material.requested)}</td>
										<td>{numberFormatter.format(material.purchased)}</td>
										<td>{numberFormatter.format(material.received)}</td>
										<td>
											<span className="requisitions-pending-value">
												{numberFormatter.format(material.pending)}{" "}
												{material.unit}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : null}

			<section className="requisitions-panel overflow-hidden">
				<div className="requisitions-panel__heading">
					<div>
						<p className="requisitions-eyebrow">Control operativo</p>
						<h2>Bandeja de solicitudes</h2>
						<p>
							Revisa el estado, destino y siguiente acción de cada
							requerimiento.
						</p>
					</div>
					<span className="requisitions-count">
						<SlidersHorizontal aria-hidden="true" size={13} />
						{activeFilters} filtros
					</span>
				</div>
				<AutoFilterForm
					action="/requisitions"
					className="requisitions-filters sm:grid-cols-3"
				>
					<Field label="Proyecto">
						<select
							className="requisitions-input"
							name="projectId"
							defaultValue={filters.projectId}
						>
							<option value="">Todos los proyectos</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.code} - {project.name}
								</option>
							))}
						</select>
					</Field>
					<Field label="Bodega">
						<select
							className="requisitions-input"
							name="warehouseId"
							defaultValue={filters.warehouseId}
						>
							<option value="">Todas las bodegas</option>
							{warehouses.map((warehouse) => (
								<option key={warehouse.id} value={warehouse.id}>
									{warehouse.code} - {warehouse.name}
								</option>
							))}
						</select>
					</Field>
					<Field label="Estado">
						<select
							className="requisitions-input"
							name="status"
							defaultValue={filters.status}
						>
							<option value="">Todos los estados</option>
							{Object.entries(requisitionStatusLabels).map(
								([status, label]) => (
									<option key={status} value={status}>
										{label}
									</option>
								),
							)}
						</select>
					</Field>
				</AutoFilterForm>
				<div className="requisitions-list">
					{requisitions.map((requisition) => {
						const total = requisition.items.reduce(
							(sum, item) =>
								sum + item.estimatedCost.toNumber() * item.quantity.toNumber(),
							0,
						);
						const missingInventoryItem = requisition.items.find(
							(item) => !item.materialId,
						);
						const allInventoryItemsLinked =
							requisition.items.length > 0 && !missingInventoryItem;
						return (
							<article className="requisitions-card" key={requisition.id}>
								<div className="requisitions-card__top">
									<div className="flex min-w-0 flex-wrap items-center gap-2">
										<span className="requisitions-card__number">
											{requisition.number}
										</span>
										<span
											className="requisitions-status"
											data-tone={statusTone[requisition.status]}
										>
											<span className="requisitions-status__dot" />
											{requisitionStatusLabels[requisition.status]}
										</span>
										<span
											className="requisitions-priority"
											data-tone={priorityTone[requisition.priority]}
										>
											<span className="requisitions-priority__dot" />
											{requisitionPriorityLabels[requisition.priority]}
										</span>
									</div>
									<p className="font-semibold tabular-nums text-[#111719]">
										{currencyFormatter.format(total)}
									</p>
								</div>
								<div className="requisitions-card__body">
									<div className="min-w-0">
										<h3>{requisition.title}</h3>
										<p className="mt-1 text-sm text-[#66736e]">
											Solicitante:{" "}
											{requisition.requestedBy ??
												requisition.createdBy?.name ??
												"Sin registro"}
										</p>
										<div className="mt-3 grid gap-2">
											{requisition.items.map((item) => (
												<div className="requisitions-item" key={item.id}>
													<div className="min-w-0">
														<span className="font-medium">
															{item.description}
														</span>
														{item.budgetLineItem || item.scheduleActivity ? (
															<small className="mt-1 block text-xs text-[#66736e]">
																{item.budgetLineItem
																	? `Partida: ${item.budgetLineItem.description}`
																	: ""}
																{item.budgetLineItem && item.scheduleActivity
																	? " · "
																	: ""}
																{item.scheduleActivity
																	? `Actividad: ${item.scheduleActivity.code}`
																	: ""}
															</small>
														) : null}
													</div>
													<span className="requisitions-item__qty">
														{numberFormatter.format(item.quantity.toNumber())}{" "}
														{item.unit ?? item.material?.unit ?? ""}
													</span>
												</div>
											))}
										</div>
									</div>
									<div className="requisitions-card__destination">
										{requisition.destinationType === "PROJECT" ? (
											<Building2 aria-hidden="true" size={17} />
										) : (
											<Warehouse aria-hidden="true" size={17} />
										)}
										<div>
											<small>Destino final</small>
											<strong>
												{requisition.destinationType === "PROJECT" &&
												requisition.project
													? `${requisition.project.code} · ${requisition.project.name}`
													: `Existencia de ${requisition.warehouse?.name ?? "bodega"}`}
											</strong>
											<span>
												{requisition.destinationType === "PROJECT"
													? `Recibe: ${requisition.warehouse?.name ?? "Sin bodega"}`
													: "El recurso permanecerá en esta bodega"}
											</span>
										</div>
									</div>
									<div className="requisitions-card__date">
										<CalendarDays aria-hidden="true" size={17} />
										<div>
											<small>Fecha límite</small>
											<strong>{formatDate(requisition.neededDate)}</strong>
										</div>
									</div>
									<RequisitionStatusStepper
										status={requisition.status}
										warehouseOnly={requisition.destinationType === "WAREHOUSE"}
									/>
								</div>
								<footer className="requisitions-card__footer">
									<div className="requisitions-next-step">
										<CheckCircle2 aria-hidden="true" size={15} />
										<span>
											{requisition.status === "RECEIVED"
												? requisition.destinationType === "WAREHOUSE"
													? "Existencia recibida; listo para cerrar"
													: "Listo para entregar a obra"
												: requisition.status === "DELIVERED"
													? "Listo para cerrar"
													: requisition.status === "CLOSED"
														? "Proceso finalizado"
														: "Continúa con la siguiente etapa"}
										</span>
									</div>
									<div className="flex flex-wrap justify-end gap-2">
										{canApprove && requisition.status === "REQUESTED" ? (
											<ActionButton
												action={reviewRequisitionAction}
												id={requisition.id}
												label="Marcar revisado"
												primary
											/>
										) : null}
										{canApprove && requisition.status === "REVIEWED" ? (
											<ActionButton
												action={approveRequisitionAction}
												id={requisition.id}
												label="Aprobar"
												primary
											/>
										) : null}
										{canApprove &&
										["REQUESTED", "REVIEWED", "APPROVED"].includes(
											requisition.status,
										) ? (
											<ActionButton
												action={rejectRequisitionAction}
												id={requisition.id}
												label="Rechazar"
											/>
										) : null}
										{canApprove && requisition.status === "APPROVED" ? (
											<ActionButton
												action={markRequisitionPurchasedAction}
												id={requisition.id}
												label="Confirmar compra"
												primary
											/>
										) : null}
										{canApprove &&
										requisition.status === "PURCHASED" &&
										allInventoryItemsLinked ? (
											<ActionButton
												action={receiveRequisitionAction}
												id={requisition.id}
												label="Recibir en bodega"
												primary
											/>
										) : null}
										{canApprove &&
										requisition.status === "RECEIVED" &&
										requisition.destinationType === "PROJECT" &&
										allInventoryItemsLinked ? (
											<ActionButton
												action={deliverRequisitionAction}
												id={requisition.id}
												label="Entregar a obra"
												primary
											/>
										) : null}
										{canApprove &&
										(requisition.status === "DELIVERED" ||
											(requisition.status === "RECEIVED" &&
												requisition.destinationType === "WAREHOUSE")) ? (
											<ActionButton
												action={closeRequisitionAction}
												id={requisition.id}
												label="Cerrar"
											/>
										) : null}
										{canApprove &&
										["REQUESTED", "REVIEWED", "APPROVED", "PURCHASED"].includes(
											requisition.status,
										) &&
										missingInventoryItem ? (
											<Link
												className="requisitions-action requisitions-action--link focus-ring"
												href={
													`/requisitions?linkItem=${missingInventoryItem.id}` as Route
												}
											>
												<Link2 aria-hidden="true" size={15} />
												Vincular recurso
											</Link>
										) : null}
									</div>
								</footer>
							</article>
						);
					})}
					{requisitions.length === 0 ? (
						<div className="requisitions-empty">
							<span className="requisitions-empty__icon">
								<ClipboardCheck aria-hidden="true" size={26} />
							</span>
							<p className="mt-3 font-semibold text-[#172021]">
								No hay solicitudes en esta vista
							</p>
							<p className="mt-1 max-w-md text-sm text-[#66736e]">
								Cambia los filtros o crea la primera solicitud para comenzar el
								abastecimiento.
							</p>
							<Link
								className="requisitions-empty__action"
								href="/requisitions?new=1"
							>
								<Plus aria-hidden="true" size={16} />
								Nueva solicitud
							</Link>
						</div>
					) : null}
				</div>
			</section>

			{isCreating ? (
				<RequisitionCreateDialog
					materialPlans={materialPlans}
					materials={materials.map((material) => ({
						id: material.id,
						code: material.code,
						name: material.name,
						unit: material.unit,
						unitCost: material.unitCost.toString(),
						minimumStock: material.minimumStock.toString(),
						resourceType: material.resourceType,
						specification: material.specification ?? "",
						brand: material.brand ?? "",
						model: material.model ?? "",
						trackIndividually: material.trackIndividually,
					}))}
					projects={projects}
					requesterName={requesterName}
					scheduleActivities={scheduleActivities}
					warehouses={warehouses.map((warehouse) => ({
						id: warehouse.id,
						code: warehouse.code,
						name: warehouse.name,
					}))}
				/>
			) : null}

			{canApprove && linkItem && linkRequisition ? (
				<RequisitionMaterialLinkDialog
					item={{
						id: linkItem.id,
						description: linkItem.description,
						unit: linkItem.unit ?? "",
						estimatedCost: linkItem.estimatedCost.toString(),
						quantity: numberFormatter.format(linkItem.quantity.toNumber()),
						requisitionNumber: linkRequisition.number,
						project: linkRequisition.project
							? `${linkRequisition.project.code} · ${linkRequisition.project.name}`
							: "Sin proyecto",
						warehouse: linkRequisition.warehouse
							? `${linkRequisition.warehouse.code} - ${linkRequisition.warehouse.name}`
							: "Sin bodega",
						resourceType: toResourceType(linkRequisition.type),
					}}
					materials={materials.map((material) => ({
						id: material.id,
						code: material.code,
						name: material.name,
						unit: material.unit,
						unitCost: material.unitCost.toString(),
						resourceType: material.resourceType,
					}))}
				/>
			) : null}
		</main>
	);
}
