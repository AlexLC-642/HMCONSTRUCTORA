import {
	Boxes,
	Building2,
	CalendarDays,
	CheckCircle2,
	ClipboardCheck,
	Link2,
	PackageCheck,
	Plus,
	ShoppingCart,
	Truck,
	Warehouse,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	approveRequisitionAction,
	closeRequisitionAction,
	deliverRequisitionAction,
	fulfillRequisitionFromStockAction,
	rejectRequisitionAction,
} from "@/modules/requisitions/application/actions";
import { getRequisitionWorkspace } from "@/modules/requisitions/application/queries";
import {
	requisitionPriorityLabels,
	requisitionStatusFilters,
	requisitionStatusLabels,
} from "@/modules/requisitions/domain/validation";
import { RequisitionCreateDialog } from "@/modules/requisitions/ui/requisition-create-dialog";
import { RequisitionMaterialLinkDialog } from "@/modules/requisitions/ui/requisition-material-link-dialog";
import { RequisitionStatusStepper } from "@/modules/requisitions/ui/requisition-status-stepper";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";
import { StatStrip } from "@/shared/ui/stat-strip";

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
	REVIEWED: "warning",
	APPROVED: "success",
	PURCHASED: "violet",
	RECEIVED: "success",
	DELIVERED: "success",
	CLOSED: "success",
	REJECTED: "danger",
} as const;
const priorityTone = {
	LOW: "neutral",
	NORMAL: "success",
	HIGH: "warning",
	URGENT: "danger",
} as const;

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
	const view =
		firstParam(params.vista) === "abastecimiento" ? "supply" : "list";
	const showAllPlans = firstParam(params.partidas) === "todas";
	const isCreating = firstParam(params.new) === "1";
	const linkItemId = firstParam(params.linkItem) ?? "";
	// Se piden todas las solicitudes del proyecto/bodega y el estado se filtra
	// aquí: así cada pestaña muestra su conteo.
	const {
		requisitions: allRequisitions,
		materials,
		warehouses,
		projects,
		materialPlans,
		scheduleActivities,
	} = await getRequisitionWorkspace(
		{ projectId: filters.projectId, warehouseId: filters.warehouseId },
		user,
	);
	const statusGroup =
		requisitionStatusFilters[
			filters.status as keyof typeof requisitionStatusFilters
		];
	const requisitions = statusGroup
		? allRequisitions.filter((item) =>
				(statusGroup.statuses as readonly string[]).includes(item.status),
			)
		: allRequisitions;
	const linkRequisition = allRequisitions.find((requisition) =>
		requisition.items.some((item) => item.id === linkItemId),
	);
	const linkItem = linkRequisition?.items.find(
		(item) => item.id === linkItemId && !item.materialId,
	);
	const requesterName = user.name || user.email.split("@")[0];
	const countOf = (key: keyof typeof requisitionStatusFilters) =>
		allRequisitions.filter((item) =>
			(requisitionStatusFilters[key].statuses as readonly string[]).includes(
				item.status,
			),
		).length;
	const pending = countOf("PENDING");
	const inAttention = countOf("IN_PROGRESS");
	const completed = countOf("COMPLETED");
	const totalOpen = allRequisitions
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
	const plansWithPending = projectPlans.filter((plan) => plan.pending > 0);
	const fullyRequested = projectPlans.length - plansWithPending.length;
	const visiblePlans = showAllPlans ? projectPlans : plansWithPending;
	const href = (changes: Record<string, string>) => {
		const query = new URLSearchParams();
		const merged = {
			projectId: filters.projectId,
			warehouseId: filters.warehouseId,
			status: filters.status,
			vista: view === "supply" ? "abastecimiento" : "",
			...changes,
		};
		for (const [key, value] of Object.entries(merged)) {
			if (value) query.set(key, value);
		}
		const text = query.toString();
		return (text ? `/requisitions?${text}` : "/requisitions") as Route;
	};

	return (
		<main className="mx-auto max-w-[1520px] space-y-4">
			<header className="req-header">
				<div>
					<h1>Requerimientos</h1>
					<p>
						Lo que la obra o la bodega necesita: se autoriza, se entrega desde
						inventario o pasa a Compras.
					</p>
				</div>
				<Link
					className="requisitions-new-button focus-ring"
					href="/requisitions?new=1"
				>
					<Plus aria-hidden="true" size={18} />
					Nueva solicitud
				</Link>
			</header>

			<StatStrip
				items={[
					{
						key: "pending",
						label: "Por autorizar",
						value: String(pending),
						detail: "Esperan una decisión",
						attention: pending > 0 ? "warning" : undefined,
						active: filters.status === "PENDING",
						href: href({ status: "PENDING", vista: "" }),
					},
					{
						key: "progress",
						label: "En atención",
						value: String(inAttention),
						detail: "Inventario, compra o recepción",
						active: filters.status === "IN_PROGRESS",
						href: href({ status: "IN_PROGRESS", vista: "" }),
					},
					{
						key: "done",
						label: "Completados",
						value: String(completed),
						detail: "Recursos entregados",
						active: filters.status === "COMPLETED",
						href: href({ status: "COMPLETED", vista: "" }),
					},
					{
						key: "open",
						label: "Valor abierto",
						value: currencyFormatter.format(totalOpen),
						detail: "Solicitudes sin cerrar",
					},
				]}
				label="Resumen de requerimientos"
			/>

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

			<section className="req-panel">
				<AutoFilterForm action="/requisitions" className="req-filters">
					{filters.status ? (
						<input name="status" type="hidden" value={filters.status} />
					) : null}
					{view === "supply" ? (
						<input name="vista" type="hidden" value="abastecimiento" />
					) : null}
					<label className="req-filter">
						<span>Proyecto</span>
						<select
							className="requisitions-input"
							defaultValue={filters.projectId}
							name="projectId"
						>
							<option value="">Todos los proyectos</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.code} - {project.name}
								</option>
							))}
						</select>
					</label>
					<label className="req-filter">
						<span>Bodega</span>
						<select
							className="requisitions-input"
							defaultValue={filters.warehouseId}
							name="warehouseId"
						>
							<option value="">Todas las bodegas</option>
							{warehouses.map((warehouse) => (
								<option key={warehouse.id} value={warehouse.id}>
									{warehouse.code} - {warehouse.name}
								</option>
							))}
						</select>
					</label>
				</AutoFilterForm>

				{selectedProject && projectPlans.length > 0 ? (
					<nav aria-label="Vistas de requerimientos" className="req-views">
						<Link
							aria-current={view === "list" ? "page" : undefined}
							href={href({ vista: "" })}
						>
							<ClipboardCheck aria-hidden="true" size={16} />
							Solicitudes <span>{allRequisitions.length}</span>
						</Link>
						<Link
							aria-current={view === "supply" ? "page" : undefined}
							href={href({ vista: "abastecimiento" })}
						>
							<Boxes aria-hidden="true" size={16} />
							Abastecimiento del proyecto <span>{plansWithPending.length}</span>
						</Link>
					</nav>
				) : null}

				{view === "supply" && selectedProject && projectPlans.length > 0 ? (
					<div className="req-supply">
						<div className="req-supply__summary">
							<p>
								<strong>{projectPlans.length}</strong> partidas del presupuesto
								aprobado · <strong>{fullyRequested}</strong> ya solicitadas ·{" "}
								<strong>{plansWithPending.length}</strong> con cantidad por
								solicitar
							</p>
							<div className="req-chips">
								<Link
									aria-current={!showAllPlans ? "true" : undefined}
									href={href({ partidas: "" })}
								>
									Por solicitar <span>{plansWithPending.length}</span>
								</Link>
								<Link
									aria-current={showAllPlans ? "true" : undefined}
									href={href({ partidas: "todas" })}
								>
									Todas <span>{projectPlans.length}</span>
								</Link>
							</div>
						</div>
						{visiblePlans.length ? (
							<div className="req-supply__scroll">
								<table className="req-supply__table">
									<thead>
										<tr>
											<th scope="col">Partida</th>
											<th scope="col">Avance</th>
											<th className="req-num" scope="col">
												Presupuestado
											</th>
											<th className="req-num" scope="col">
												Solicitado
											</th>
											<th className="req-num" scope="col">
												Recibido
											</th>
											<th className="req-num" scope="col">
												Por solicitar
											</th>
										</tr>
									</thead>
									<tbody>
										{visiblePlans.map((material) => {
											const requestedPct = material.planned
												? Math.min(
														100,
														(material.requested / material.planned) * 100,
													)
												: 0;
											const receivedPct = material.planned
												? Math.min(
														100,
														(material.received / material.planned) * 100,
													)
												: 0;
											return (
												<tr key={material.id}>
													<td data-label="Partida">
														<strong>{material.name}</strong>
														<small>{material.unit}</small>
													</td>
													<td data-label="Avance">
														<span
															aria-label={`Solicitado ${Math.round(requestedPct)}%, recibido ${Math.round(receivedPct)}%`}
															className="req-progress"
															role="img"
														>
															<span
																className="req-progress__requested"
																style={{ width: `${requestedPct}%` }}
															/>
															<span
																className="req-progress__received"
																style={{ width: `${receivedPct}%` }}
															/>
														</span>
													</td>
													<td className="req-num" data-label="Presupuestado">
														{numberFormatter.format(material.planned)}
													</td>
													<td className="req-num" data-label="Solicitado">
														{numberFormatter.format(material.requested)}
													</td>
													<td className="req-num" data-label="Recibido">
														{numberFormatter.format(material.received)}
													</td>
													<td className="req-num" data-label="Por solicitar">
														{material.pending > 0 ? (
															<span className="requisitions-pending-value">
																{numberFormatter.format(material.pending)}{" "}
																{material.unit}
															</span>
														) : (
															<span className="req-done">Completo</span>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<div className="req-empty-inline">
								Todas las partidas ya están solicitadas.
							</div>
						)}
						<p className="req-legend">
							<span className="req-legend__requested" /> Solicitado
							<span className="req-legend__received" /> Recibido
						</p>
					</div>
				) : (
					<>
						<nav aria-label="Filtrar por estado" className="req-status-tabs">
							<Link
								aria-current={!filters.status ? "page" : undefined}
								href={href({ status: "" })}
							>
								Todas <span>{allRequisitions.length}</span>
							</Link>
							{Object.entries(requisitionStatusFilters).map(([key, group]) => (
								<Link
									aria-current={filters.status === key ? "page" : undefined}
									href={href({ status: key })}
									key={key}
								>
									{group.label}{" "}
									<span>
										{countOf(key as keyof typeof requisitionStatusFilters)}
									</span>
								</Link>
							))}
						</nav>
						<div className="req-list">
							{requisitions.map((requisition) => (
								<RequisitionRow
									canApprove={canApprove}
									key={requisition.id}
									requisition={requisition}
								/>
							))}
							{requisitions.length === 0 ? (
								<div className="requisitions-empty">
									<span className="requisitions-empty__icon">
										<ClipboardCheck aria-hidden="true" size={26} />
									</span>
									<p className="mt-3 font-semibold text-[var(--foreground)]">
										No hay solicitudes en esta vista
									</p>
									<p className="mt-1 max-w-md text-sm text-[var(--muted)]">
										Cambia los filtros o crea una solicitud para comenzar el
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
					</>
				)}
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

type Requisition = Awaited<
	ReturnType<typeof getRequisitionWorkspace>
>["requisitions"][number];

function nextStepText(requisition: Requisition, canFulfillFromStock: boolean) {
	switch (requisition.status) {
		case "REQUESTED":
		case "REVIEWED":
			return "Autoriza o rechaza la solicitud";
		case "APPROVED":
			return canFulfillFromStock
				? "Hay existencia suficiente para entregar"
				: "Debe continuar en Compras";
		case "RECEIVED":
			return requisition.destinationType === "WAREHOUSE"
				? "Existencia recibida"
				: "Listo para entregar a obra";
		case "DELIVERED":
			return "Proceso completado";
		case "CLOSED":
			return "Proceso finalizado";
		case "REJECTED":
			return "Solicitud rechazada";
		default:
			return "La solicitud está en atención";
	}
}

/** Una solicitud en una fila compacta; los renglones se despliegan a pedido. */
function RequisitionRow({
	requisition,
	canApprove,
}: {
	requisition: Requisition;
	canApprove: boolean;
}) {
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
	const inventoryShortage = requisition.items.find(
		(item) =>
			!item.materialId || item.availableStock < item.quantity.toNumber(),
	);
	const canFulfillFromStock =
		requisition.destinationType === "PROJECT" &&
		allInventoryItemsLinked &&
		!inventoryShortage;
	const destination =
		requisition.destinationType === "PROJECT" && requisition.project
			? `${requisition.project.code} · ${requisition.project.name}`
			: `Existencia de ${requisition.warehouse?.name ?? "bodega"}`;

	return (
		<article className="req-row">
			<div className="req-row__main">
				<div className="req-row__title">
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
					{requisition.priority !== "NORMAL" ? (
						<span
							className="requisitions-priority"
							data-tone={priorityTone[requisition.priority]}
						>
							<span className="requisitions-priority__dot" />
							{requisitionPriorityLabels[requisition.priority]}
						</span>
					) : null}
				</div>
				<h3>{requisition.title}</h3>
				<p className="req-row__meta">
					<span>
						{requisition.destinationType === "PROJECT" ? (
							<Building2 aria-hidden="true" size={14} />
						) : (
							<Warehouse aria-hidden="true" size={14} />
						)}
						{destination}
					</span>
					<span>
						<CalendarDays aria-hidden="true" size={14} />
						{formatDate(requisition.neededDate)}
					</span>
					<span>
						Solicita{" "}
						{requisition.requestedBy ??
							requisition.createdBy?.name ??
							"sin registro"}
					</span>
				</p>
			</div>
			<div className="req-row__side">
				<strong className="req-row__total">
					{currencyFormatter.format(total)}
				</strong>
				<span className="req-row__next">
					<CheckCircle2 aria-hidden="true" size={14} />
					{nextStepText(requisition, canFulfillFromStock)}
				</span>
			</div>

			<details className="req-row__items">
				<summary>
					{requisition.items.length}{" "}
					{requisition.items.length === 1 ? "renglón" : "renglones"}
					{missingInventoryItem ? " · hay renglones sin vincular" : ""}
				</summary>
				<div className="req-row__item-list">
					{requisition.items.map((item) => (
						<div className="requisitions-item" key={item.id}>
							<div className="min-w-0">
								<span className="font-medium">{item.description}</span>
								{item.budgetLineItem ||
								item.scheduleActivity ||
								item.outsideBudget ? (
									<small className="mt-1 block text-xs text-[var(--muted)]">
										{[
											item.outsideBudget
												? `Fuera de presupuesto: ${item.outsideBudgetReason}`
												: null,
											item.budgetLineItem
												? `Partida: ${item.budgetLineItem.description}`
												: null,
											item.scheduleActivity
												? `Actividad: ${item.scheduleActivity.code}`
												: null,
										]
											.filter(Boolean)
											.join(" · ")}
									</small>
								) : null}
							</div>
							<div className="requisitions-item__availability">
								<span className="requisitions-item__qty">
									{numberFormatter.format(item.quantity.toNumber())}{" "}
									{item.unit ?? item.material?.unit ?? ""}
								</span>
								{item.materialId ? (
									<small
										className="requisitions-stock"
										data-state={
											item.availableStock >= item.quantity.toNumber()
												? "available"
												: "shortage"
										}
									>
										Existencia {numberFormatter.format(item.availableStock)}
									</small>
								) : (
									<small className="requisitions-stock" data-state="unlinked">
										Sin vincular
									</small>
								)}
							</div>
						</div>
					))}
					<RequisitionStatusStepper
						status={requisition.status}
						warehouseOnly={requisition.destinationType === "WAREHOUSE"}
					/>
				</div>
			</details>

			{canApprove ? (
				<footer className="req-row__actions">
					{["REQUESTED", "REVIEWED"].includes(requisition.status) ? (
						<ActionButton
							action={approveRequisitionAction}
							id={requisition.id}
							label="Autorizar"
							primary
						/>
					) : null}
					{["REQUESTED", "REVIEWED", "APPROVED"].includes(
						requisition.status,
					) ? (
						<ActionButton
							action={rejectRequisitionAction}
							id={requisition.id}
							label="Rechazar"
						/>
					) : null}
					{requisition.status === "APPROVED" && canFulfillFromStock ? (
						<ActionButton
							action={fulfillRequisitionFromStockAction}
							id={requisition.id}
							label="Entregar desde inventario"
							primary
						/>
					) : null}
					{requisition.status === "APPROVED" && !canFulfillFromStock ? (
						<Link
							className="focus-ring requisitions-action requisitions-action--primary"
							href={
								`/purchases?view=requisitions&requisitionId=${requisition.id}` as Route
							}
						>
							<ShoppingCart aria-hidden="true" size={15} />
							Enviar a Compras
						</Link>
					) : null}
					{requisition.status === "PURCHASED" && allInventoryItemsLinked ? (
						<Link
							className="focus-ring requisitions-action"
							href={"/purchases?view=orders" as Route}
						>
							<Truck aria-hidden="true" size={15} />
							Registrar recepción en Compras
						</Link>
					) : null}
					{requisition.status === "RECEIVED" &&
					requisition.destinationType === "PROJECT" &&
					allInventoryItemsLinked ? (
						<ActionButton
							action={deliverRequisitionAction}
							id={requisition.id}
							label="Entregar a obra"
							primary
						/>
					) : null}
					{requisition.status === "DELIVERED" ||
					(requisition.status === "RECEIVED" &&
						requisition.destinationType === "WAREHOUSE") ? (
						<ActionButton
							action={closeRequisitionAction}
							id={requisition.id}
							label="Cerrar"
						/>
					) : null}
					{["REQUESTED", "REVIEWED", "APPROVED", "PURCHASED"].includes(
						requisition.status,
					) && missingInventoryItem ? (
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
				</footer>
			) : null}
		</article>
	);
}
