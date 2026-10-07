"use client";

import {
	AlertTriangle,
	ArrowLeftRight,
	CheckCircle2,
	ClipboardList,
	PackageOpen,
	Plus,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";
import { StatStrip } from "@/shared/ui/stat-strip";
import {
	recordStockMovementAction,
	reviewWasteMovementAction,
} from "../application/actions";
import type { getMovementHistory } from "../application/queries";
import {
	evaluateWasteReview,
	type WasteReasonValue,
	type WasteReviewTrigger,
	wasteReasonLabels,
	wasteReasonValues,
	wasteReviewTriggerLabels,
} from "../domain/waste-review";
import {
	InventoryEmpty,
	InventoryPanel,
	InventorySectionHeader,
	InventoryStatus,
	inventoryInputClass,
	inventoryLabelClass,
	inventoryPrimaryButtonClass,
	inventorySecondaryButtonClass,
	inventoryTextareaClass,
} from "./inventory-ui";

type HistoryData = Awaited<ReturnType<typeof getMovementHistory>>;
type Movement = HistoryData["items"][number];
type Params = Record<string, string | string[] | undefined>;

const number = new Intl.NumberFormat("es-GT", { maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const types = [
	["IN", "Entrada"],
	["OUT", "Salida"],
	["RETURN", "Devolución"],
	["WASTE", "Desperdicio"],
	["ADJUSTMENT", "Ajuste"],
	["TRANSFER", "Traslado"],
] as const;

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}
function typeLabel(type: string) {
	return types.find(([value]) => value === type)?.[1] ?? type;
}
function typeTone(
	type: string,
): "success" | "warning" | "danger" | "neutral" | "info" {
	if (type === "IN" || type === "RETURN") return "success";
	if (type === "WASTE") return "danger";
	if (type === "ADJUSTMENT") return "warning";
	if (type === "TRANSFER") return "info";
	return "neutral";
}
function wasteReviewLabel(status: Movement["wasteReviewStatus"]) {
	if (status === "PENDING") return "Por revisar";
	if (status === "NEEDS_ACTION") return "Con observación";
	if (status === "REVIEWED") return "Revisado";
	if (status === "NOT_REQUIRED") return "Registrado";
	return null;
}
function wasteReviewTone(
	status: Movement["wasteReviewStatus"],
): "success" | "warning" | "danger" | "neutral" {
	if (status === "REVIEWED") return "success";
	if (status === "NEEDS_ACTION") return "danger";
	if (status === "PENDING") return "warning";
	return "neutral";
}
function signedQuantity(item: Movement) {
	const sign =
		item.type === "IN" || item.type === "RETURN"
			? "+"
			: item.type === "OUT" || item.type === "WASTE"
				? "−"
				: "";
	return `${sign}${number.format(item.quantity)} ${item.material.unit}`;
}
function href(params: Params, changes: Record<string, string>) {
	const query = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		const item = first(value);
		if (item) query.set(key, item);
	});
	Object.entries(changes).forEach(([key, value]) => {
		if (value) query.set(key, value);
		else query.delete(key);
	});
	return `/inventory?${query.toString()}`;
}

export function InventoryMovements({
	data,
	params,
	canReviewWaste,
}: {
	data: HistoryData;
	params: Params;
	canReviewWaste: boolean;
}) {
	// Desde el detalle de un producto se llega con ?nuevo=1&recurso=&bodega=:
	// el formulario abre con esos datos ya elegidos.
	const prefill = {
		materialId: first(params.recurso) ?? "",
		warehouseId: first(params.bodega) ?? "",
	};
	const [open, setOpen] = useState(first(params.nuevo) === "1");
	const [selected, setSelected] = useState<Movement | null>(null);
	const incoming =
		(data.movementCounts.IN ?? 0) + (data.movementCounts.RETURN ?? 0);
	const outgoing =
		(data.movementCounts.OUT ?? 0) + (data.movementCounts.WASTE ?? 0);

	useEffect(() => {
		function close(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpen(false);
				setSelected(null);
			}
		}
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, []);

	return (
		<div className="space-y-5">
			<StatStrip
				items={[
					{
						key: "all",
						label: "Movimientos",
						value: String(data.total),
						detail: "Según los filtros actuales",
						active: !first(params.type),
						href: href(params, { view: "movement", type: "", page: "1" }),
					},
					{
						key: "in",
						label: "Entradas",
						value: String(incoming),
						detail: "Entradas y devoluciones",
						active: first(params.type) === "IN",
						href: href(params, { view: "movement", type: "IN", page: "1" }),
					},
					{
						key: "out",
						label: "Salidas",
						value: String(outgoing),
						detail: "Salidas y desperdicios",
						active: first(params.type) === "OUT",
						href: href(params, { view: "movement", type: "OUT", page: "1" }),
					},
					{
						key: "value",
						label: "Valor movilizado",
						value: currency.format(data.movedValue),
						detail: "Costo de lo filtrado",
					},
				]}
				label="Resumen de movimientos"
			/>

			{canReviewWaste && data.pendingWasteReviews > 0 ? (
				<a
					className="inventory-panel flex min-h-16 items-center justify-between gap-4 px-4 py-3 transition hover:bg-[#fff8e8]"
					href={href(params, {
						view: "movement",
						review: "pending",
						page: "1",
					})}
				>
					<span className="flex min-w-0 items-center gap-3">
						<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff1c7] text-[#9a6200]">
							<AlertTriangle aria-hidden="true" size={19} />
						</span>
						<span className="min-w-0">
							<strong className="block text-sm text-[#182224]">
								{data.pendingWasteReviews}{" "}
								{data.pendingWasteReviews === 1
									? "desperdicio requiere"
									: "desperdicios requieren"}{" "}
								revisión
							</strong>
							<span className="block text-xs leading-5 text-[#68746f]">
								El stock ya fue actualizado; falta confirmar el seguimiento.
							</span>
						</span>
					</span>
					<span className="shrink-0 text-xs font-bold text-[#8a5700]">
						Revisar
					</span>
				</a>
			) : null}

			<InventoryPanel>
				<InventorySectionHeader
					action={
						<button
							className={inventoryPrimaryButtonClass}
							onClick={() => setOpen(true)}
							type="button"
						>
							<Plus aria-hidden="true" size={17} />
							Registrar movimiento
						</button>
					}
					description={`${data.total} ${data.total === 1 ? "registro encontrado" : "registros encontrados"} · entradas, salidas, traslados y ajustes con trazabilidad.`}
					icon={ClipboardList}
					title="Kardex"
				/>
				<nav aria-label="Tipo de movimiento" className="inventory-type-tabs">
					<a
						aria-current={!first(params.type) ? "page" : undefined}
						href={href(params, { view: "movement", type: "", page: "1" })}
					>
						Todos
					</a>
					{types.map(([value, label]) => (
						<a
							aria-current={first(params.type) === value ? "page" : undefined}
							href={href(params, { view: "movement", type: value, page: "1" })}
							key={value}
						>
							{label}
						</a>
					))}
				</nav>
				<AutoFilterForm
					action="/inventory"
					className="inventory-movement-filters"
				>
					<input name="view" type="hidden" value="movement" />
					<label className="relative">
						<span className="sr-only">Buscar material o referencia</span>
						<Search
							aria-hidden="true"
							className="absolute left-3.5 top-3.5 text-[#6d7974]"
							size={18}
						/>
						<input
							className={`${inventoryInputClass} pl-10`}
							defaultValue={first(params.q)}
							name="q"
							placeholder="Material o referencia"
							type="text"
						/>
					</label>
					{first(params.type) ? (
						<input name="type" type="hidden" value={first(params.type)} />
					) : null}
					<label>
						<span className="sr-only">Filtrar revisión de desperdicio</span>
						<select
							className={inventoryInputClass}
							defaultValue={first(params.review) ?? ""}
							name="review"
						>
							<option value="">Todo seguimiento</option>
							<option value="pending">Por revisar</option>
							<option value="reviewed">Revisados</option>
							<option value="normal">Sin revisión requerida</option>
						</select>
					</label>
					<label>
						<span className="sr-only">Filtrar por bodega</span>
						<select
							className={inventoryInputClass}
							defaultValue={first(params.warehouseId) ?? ""}
							name="warehouseId"
						>
							<option value="">Todas las bodegas</option>
							{data.warehouses.map((item) => (
								<option key={item.id} value={item.id}>
									{item.code} · {item.name}
								</option>
							))}
						</select>
					</label>
				</AutoFilterForm>

				{data.items.length ? (
					<>
						<div className="inventory-scrollbar hidden overflow-x-auto md:block">
							<table className="inventory-table inventory-kardex w-full min-w-[880px] text-sm">
								<colgroup>
									<col style={{ width: "13%" }} />
									<col style={{ width: "12%" }} />
									<col style={{ width: "28%" }} />
									<col style={{ width: "12%" }} />
									<col style={{ width: "13%" }} />
									<col style={{ width: "16%" }} />
									<col style={{ width: "6%" }} />
								</colgroup>
								<thead>
									<tr>
										<th>Fecha</th>
										<th>Tipo</th>
										<th>Recurso y bodega</th>
										<th className="text-right">Cantidad</th>
										<th className="text-right">Total</th>
										<th>Referencia</th>
										<th>
											<span className="sr-only">Acción</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{data.items.map((item) => (
										<tr key={item.id}>
											<td className="text-xs">
												{item.createdAtLabel}
												{item.project ? (
													<small className="mt-0.5 block text-xs text-[var(--muted)]">
														Proyecto {item.project.code}
													</small>
												) : null}
											</td>
											<td>
												<div className="flex flex-col items-start gap-1.5">
													<InventoryStatus tone={typeTone(item.type)}>
														{typeLabel(item.type)}
													</InventoryStatus>
													{item.type === "WASTE" && item.wasteReviewStatus ? (
														<InventoryStatus
															tone={wasteReviewTone(item.wasteReviewStatus)}
														>
															{wasteReviewLabel(item.wasteReviewStatus)}
														</InventoryStatus>
													) : null}
												</div>
											</td>
											<td>
												<strong className="block truncate">
													{item.material.name}
												</strong>
												<small className="mt-0.5 block truncate text-xs text-[var(--muted)]">
													{item.material.code} · {item.warehouse.name}
												</small>
											</td>
											<td className="text-right font-bold tabular-nums">
												{signedQuantity(item)}
											</td>
											<td className="text-right tabular-nums">
												<span className="font-semibold">
													{currency.format(item.totalCost)}
												</span>
												<small className="mt-0.5 block text-xs text-[var(--muted)]">
													{currency.format(item.unitCost)} c/u
												</small>
											</td>
											<td>
												<span className="block truncate">
													{item.reference ?? "—"}
												</span>
												<small
													className="mt-0.5 block truncate text-xs text-[var(--muted)]"
													title={item.createdBy?.name ?? "Sin usuario"}
												>
													{item.createdBy?.name?.replace(" Constructora", "") ??
														"Sin usuario"}
												</small>
											</td>
											<td className="text-right">
												<button
													className={inventorySecondaryButtonClass}
													onClick={() => setSelected(item)}
													type="button"
												>
													Ver
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="grid grid-cols-1 gap-3 p-3 md:hidden">
							{data.items.map((item) => (
								<article
									className="rounded-2xl bg-[#f3f5f1] p-4 shadow-[inset_0_0_0_1px_rgba(48,62,56,0.08)]"
									key={item.id}
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex flex-wrap gap-1.5">
											<InventoryStatus tone={typeTone(item.type)}>
												{typeLabel(item.type)}
											</InventoryStatus>
											{item.type === "WASTE" && item.wasteReviewStatus ? (
												<InventoryStatus
													tone={wasteReviewTone(item.wasteReviewStatus)}
												>
													{wasteReviewLabel(item.wasteReviewStatus)}
												</InventoryStatus>
											) : null}
										</div>
										<time className="text-xs text-[#68746f]">
											{item.createdAtLabel}
										</time>
									</div>
									<strong className="mt-3 block">{item.material.name}</strong>
									<p className="mt-0.5 text-xs text-[#68746f]">
										{item.material.code} · {item.warehouse.name}
									</p>
									<div className="mt-4 flex items-end justify-between gap-3">
										<b className="tabular-nums">{signedQuantity(item)}</b>
										<span className="text-sm font-semibold tabular-nums">
											{currency.format(item.totalCost)}
										</span>
									</div>
									<button
										className={`${inventorySecondaryButtonClass} mt-4 w-full`}
										onClick={() => setSelected(item)}
										type="button"
									>
										Ver detalle
									</button>
								</article>
							))}
						</div>
						<Pagination data={data} params={params} />
					</>
				) : (
					<InventoryEmpty
						action={
							<button
								className={inventoryPrimaryButtonClass}
								onClick={() => setOpen(true)}
								type="button"
							>
								<Plus aria-hidden="true" size={17} />
								Registrar el primero
							</button>
						}
						description="Aquí aparecerá la trazabilidad de cada entrada, salida, traslado o ajuste."
						icon={PackageOpen}
						title="No hay movimientos registrados"
					/>
				)}
			</InventoryPanel>

			{open ? (
				<MovementDialog
					data={data}
					initialMaterialId={prefill.materialId}
					initialWarehouseId={prefill.warehouseId}
					onClose={() => setOpen(false)}
				/>
			) : null}
			{selected ? (
				<MovementDetail
					canReviewWaste={canReviewWaste}
					movement={selected}
					onClose={() => setSelected(null)}
				/>
			) : null}
		</div>
	);
}

function Pagination({ data, params }: { data: HistoryData; params: Params }) {
	return (
		<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1e5e1] px-4 py-3 text-xs font-medium text-[#68746f]">
			<span>
				Página {data.page} de {data.totalPages}
			</span>
			<div className="flex gap-2">
				<a
					aria-disabled={data.page <= 1}
					className={`${inventorySecondaryButtonClass} min-h-9 px-3 ${data.page <= 1 ? "pointer-events-none opacity-45" : ""}`}
					href={href(params, { page: String(Math.max(1, data.page - 1)) })}
				>
					Anterior
				</a>
				<a
					aria-disabled={data.page >= data.totalPages}
					className={`${inventorySecondaryButtonClass} min-h-9 px-3 ${data.page >= data.totalPages ? "pointer-events-none opacity-45" : ""}`}
					href={href(params, {
						page: String(Math.min(data.totalPages, data.page + 1)),
					})}
				>
					Siguiente
				</a>
			</div>
		</footer>
	);
}

function MovementDetail({
	movement,
	onClose,
	canReviewWaste,
}: {
	movement: Movement;
	onClose: () => void;
	canReviewWaste: boolean;
}) {
	const reviewLabel = wasteReviewLabel(movement.wasteReviewStatus);
	const validateReviewDecision = (event: FormEvent<HTMLFormElement>) => {
		const submitter = (event.nativeEvent as SubmitEvent)
			.submitter as HTMLButtonElement | null;
		const notes = event.currentTarget.elements.namedItem(
			"notes",
		) as HTMLTextAreaElement | null;
		if (!notes) return;

		notes.setCustomValidity("");
		if (submitter?.value === "NEEDS_ACTION" && notes.value.trim().length < 8) {
			event.preventDefault();
			notes.setCustomValidity(
				"Explique la acción requerida con al menos 8 caracteres.",
			);
			notes.reportValidity();
		}
	};
	return (
		<div className="inventory-drawer-backdrop">
			<button
				aria-label="Cerrar detalle"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				type="button"
			/>
			<section
				aria-labelledby="movement-detail-title"
				aria-modal="true"
				className="inventory-drawer inventory-scrollbar"
				role="dialog"
			>
				<DrawerHeader
					onClose={onClose}
					subtitle="Detalle del movimiento"
					title={typeLabel(movement.type)}
				/>
				<div className="p-5">
					<div className="flex flex-wrap gap-2">
						<InventoryStatus tone={typeTone(movement.type)}>
							{typeLabel(movement.type)}
						</InventoryStatus>
						{reviewLabel ? (
							<InventoryStatus
								tone={wasteReviewTone(movement.wasteReviewStatus)}
							>
								{reviewLabel}
							</InventoryStatus>
						) : null}
					</div>
					<dl className="mt-5 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-4 text-sm">
						<dt className="text-[#68746f]">Fecha</dt>
						<dd>{movement.createdAtLabel}</dd>
						<dt className="text-[#68746f]">Recurso</dt>
						<dd className="font-bold">
							{movement.material.name}
							<small className="block font-medium text-[#68746f]">
								{movement.material.code}
							</small>
						</dd>
						<dt className="text-[#68746f]">Bodega</dt>
						<dd>
							{movement.warehouse.name}
							<small className="block text-[#68746f]">
								{movement.warehouse.code}
							</small>
						</dd>
						<dt className="text-[#68746f]">Proyecto</dt>
						<dd>{movement.project?.code ?? "Sin proyecto"}</dd>
						{movement.responsibleName ? (
							<>
								<dt className="text-[#68746f]">Responsable</dt>
								<dd>{movement.responsibleName}</dd>
								<dt className="text-[#68746f]">Devolución</dt>
								<dd>
									{movement.expectedReturnDate
										? new Intl.DateTimeFormat("es-GT").format(
												new Date(movement.expectedReturnDate),
											)
										: "Sin fecha definida"}
								</dd>
							</>
						) : null}
						<dt className="text-[#68746f]">Cantidad</dt>
						<dd className="font-bold tabular-nums">
							{signedQuantity(movement)}
						</dd>
						<dt className="text-[#68746f]">Costo</dt>
						<dd className="tabular-nums">
							{currency.format(movement.unitCost)}
						</dd>
						<dt className="text-[#68746f]">Total</dt>
						<dd className="font-bold tabular-nums">
							{currency.format(movement.totalCost)}
						</dd>
						<dt className="text-[#68746f]">Referencia</dt>
						<dd>{movement.reference ?? "Sin referencia"}</dd>
						<dt className="text-[#68746f]">Usuario</dt>
						<dd>{movement.createdBy?.name ?? "Sin usuario"}</dd>
						<dt className="text-[#68746f]">Notas</dt>
						<dd>{movement.notes ?? "Sin notas"}</dd>
						{movement.type === "WASTE" ? (
							<>
								<dt className="text-[#68746f]">Causa</dt>
								<dd>
									{movement.wasteReason
										? wasteReasonLabels[movement.wasteReason]
										: "Sin clasificar"}
								</dd>
								{movement.wasteReviewTriggers.length > 0 ? (
									<>
										<dt className="text-[#68746f]">Control</dt>
										<dd className="space-y-1">
											{movement.wasteReviewTriggers.map((trigger) => (
												<span className="block" key={trigger}>
													{wasteReviewTriggerLabels[
														trigger as WasteReviewTrigger
													] ?? trigger}
												</span>
											))}
										</dd>
									</>
								) : null}
								{movement.wasteReviewedBy ? (
									<>
										<dt className="text-[#68746f]">Revisó</dt>
										<dd>
											{movement.wasteReviewedBy.name}
											{movement.wasteReviewedAt ? (
												<small className="block text-[#68746f]">
													{new Intl.DateTimeFormat("es-GT", {
														dateStyle: "short",
														timeStyle: "short",
													}).format(new Date(movement.wasteReviewedAt))}
												</small>
											) : null}
										</dd>
									</>
								) : null}
								{movement.wasteReviewNotes ? (
									<>
										<dt className="text-[#68746f]">Seguimiento</dt>
										<dd>{movement.wasteReviewNotes}</dd>
									</>
								) : null}
							</>
						) : null}
					</dl>

					{canReviewWaste &&
					movement.type === "WASTE" &&
					(movement.wasteReviewStatus === "PENDING" ||
						movement.wasteReviewStatus === "NEEDS_ACTION") ? (
						<form
							action={reviewWasteMovementAction}
							className="mt-6 grid gap-3 rounded-xl bg-[#f2f4f0] p-4"
							onSubmit={validateReviewDecision}
						>
							<input name="movementId" type="hidden" value={movement.id} />
							<div className="flex items-start gap-3">
								<ShieldCheck
									aria-hidden="true"
									className="mt-0.5 shrink-0 text-[#1f7a57]"
									size={19}
								/>
								<div>
									<strong className="block text-sm">
										Registrar seguimiento
									</strong>
									<p className="mt-1 text-xs leading-5 text-[#64706b]">
										El inventario ya fue descontado. Esta decisión solo
										documenta la revisión.
									</p>
								</div>
							</div>
							<textarea
								className={inventoryTextareaClass}
								maxLength={1000}
								name="notes"
								onInput={(event) => event.currentTarget.setCustomValidity("")}
								placeholder="Observación o acción solicitada"
							/>
							<div className="grid gap-2 sm:grid-cols-2">
								<button
									className={inventorySecondaryButtonClass}
									name="status"
									type="submit"
									value="NEEDS_ACTION"
								>
									<AlertTriangle aria-hidden="true" size={16} />
									Solicitar acción
								</button>
								<button
									className={inventoryPrimaryButtonClass}
									name="status"
									type="submit"
									value="REVIEWED"
								>
									<CheckCircle2 aria-hidden="true" size={16} />
									Marcar revisado
								</button>
							</div>
						</form>
					) : null}
				</div>
			</section>
		</div>
	);
}

function DrawerHeader({
	title,
	subtitle,
	onClose,
}: {
	title: string;
	subtitle: string;
	onClose: () => void;
}) {
	return (
		<div className="inventory-commandbar rounded-none px-5 py-5">
			<div className="relative z-10 flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#bdc8c3]">
						{subtitle}
					</p>
					<h2
						className="mt-1 text-xl font-bold text-white"
						id="movement-detail-title"
					>
						{title}
					</h2>
				</div>
				<button
					aria-label="Cerrar"
					className="focus-ring grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20"
					onClick={onClose}
					type="button"
				>
					<X aria-hidden="true" size={18} />
				</button>
			</div>
		</div>
	);
}

/** Bodega sugerida: la que más tiene del recurso, o la única que exista. */
function suggestedWarehouse(data: HistoryData, materialId: string) {
	const withStock = data.stock
		.filter((row) => row.materialId === materialId && row.quantity > 0)
		.sort((left, right) => right.quantity - left.quantity);
	return (
		withStock[0]?.warehouseId ??
		(data.warehouses.length === 1 ? (data.warehouses[0]?.id ?? "") : "")
	);
}

/** Costo sugerido: promedio de entradas en esa bodega o el costo del catálogo. */
function suggestedCost(
	data: HistoryData,
	materialId: string,
	warehouseId: string,
) {
	const row = data.stock.find(
		(item) =>
			item.materialId === materialId && item.warehouseId === warehouseId,
	);
	const catalog = data.materials.find((item) => item.id === materialId);
	const cost = row?.averageCost ?? catalog?.unitCost ?? 0;
	return Math.round(cost * 100) / 100;
}

function MovementDialog({
	data,
	initialMaterialId,
	initialWarehouseId,
	onClose,
}: {
	data: HistoryData;
	initialMaterialId: string;
	initialWarehouseId: string;
	onClose: () => void;
}) {
	const validInitialMaterial = data.materials.some(
		(item) => item.id === initialMaterialId,
	)
		? initialMaterialId
		: "";
	const validInitialWarehouse = data.warehouses.some(
		(item) => item.id === initialWarehouseId,
	)
		? initialWarehouseId
		: validInitialMaterial
			? suggestedWarehouse(data, validInitialMaterial)
			: data.warehouses.length === 1
				? (data.warehouses[0]?.id ?? "")
				: "";
	const [type, setType] = useState(validInitialMaterial ? "OUT" : "IN");
	const [materialId, setMaterialId] = useState(validInitialMaterial);
	const [warehouseId, setWarehouseId] = useState(validInitialWarehouse);
	const [quantity, setQuantity] = useState(0);
	const [unitCost, setUnitCost] = useState(
		validInitialMaterial
			? suggestedCost(data, validInitialMaterial, validInitialWarehouse)
			: 0,
	);
	// Si la persona escribe su propio costo, ya no se reemplaza al cambiar
	// de bodega; sí al cambiar de recurso, porque es otro precio.
	const [costEdited, setCostEdited] = useState(false);
	const [wasteReason, setWasteReason] =
		useState<WasteReasonValue>("CUTTING_SURPLUS");
	const [requestWasteReview, setRequestWasteReview] = useState(false);
	const selectedResource = data.materials.find(
		(item) => item.id === materialId,
	);
	const effectiveUnitCost =
		unitCost > 0 ? unitCost : (selectedResource?.unitCost ?? 0);
	const available =
		materialId && warehouseId
			? (data.stock.find(
					(row) =>
						row.materialId === materialId && row.warehouseId === warehouseId,
				)?.quantity ?? 0)
			: null;
	const takesStock = ["OUT", "WASTE", "TRANSFER"].includes(type);
	const exceedsStock = takesStock && available !== null && quantity > available;
	const unit = selectedResource?.unit ?? "";
	const chooseMaterial = (nextMaterialId: string) => {
		setMaterialId(nextMaterialId);
		if (!nextMaterialId) return;
		const nextWarehouse =
			warehouseId || suggestedWarehouse(data, nextMaterialId);
		if (!warehouseId) setWarehouseId(nextWarehouse);
		setUnitCost(suggestedCost(data, nextMaterialId, nextWarehouse));
		setCostEdited(false);
	};
	const chooseWarehouse = (nextWarehouseId: string) => {
		setWarehouseId(nextWarehouseId);
		if (materialId && !costEdited) {
			setUnitCost(suggestedCost(data, materialId, nextWarehouseId));
		}
	};
	const hasWasteReviewPreview = Boolean(selectedResource && quantity > 0);
	const wasteReviewTriggers =
		type === "WASTE" && selectedResource && hasWasteReviewPreview
			? evaluateWasteReview({
					reason: wasteReason,
					resourceType: selectedResource.resourceType,
					totalCost: quantity * effectiveUnitCost,
					reviewAmountThreshold: data.wasteReviewAmountThreshold,
					requestedByUser: requestWasteReview,
				})
			: [];
	const isAssignable =
		type === "OUT" &&
		selectedResource &&
		selectedResource.resourceType !== "MATERIAL";
	const destructive = type === "WASTE" || type === "ADJUSTMENT";
	return (
		<div className="inventory-drawer-backdrop inventory-modal-backdrop">
			<button
				aria-label="Cerrar formulario"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				type="button"
			/>
			<section
				aria-labelledby="movement-form-title"
				aria-modal="true"
				className="inventory-modal"
				role="dialog"
			>
				<div className="inventory-commandbar inventory-modal__header px-5 py-5">
					<div className="relative z-10 flex items-start justify-between gap-4">
						<div className="flex min-w-0 items-start gap-3">
							<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#cf2032] text-white shadow-[0_10px_24px_rgba(200,32,47,0.26)]">
								<ArrowLeftRight
									aria-hidden="true"
									size={20}
									strokeWidth={1.8}
								/>
							</span>
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#bdc8c3]">
									Nueva operación
								</p>
								<h2
									className="mt-1 text-xl font-bold text-white"
									id="movement-form-title"
								>
									Registrar movimiento
								</h2>
								<p className="mt-1 text-sm text-[#bdc8c3]">
									Actualiza el stock con trazabilidad.
								</p>
							</div>
						</div>
						<button
							aria-label="Cerrar"
							className="focus-ring grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20"
							onClick={onClose}
							type="button"
						>
							<X aria-hidden="true" size={18} />
						</button>
					</div>
				</div>
				<form
					action={recordStockMovementAction}
					className="inventory-modal__body inventory-scrollbar grid gap-4 p-5"
				>
					<label className="grid gap-1.5">
						<span className={inventoryLabelClass}>Tipo de movimiento</span>
						<select
							className={inventoryInputClass}
							name="type"
							onChange={(event) => setType(event.target.value)}
							value={type}
						>
							{types.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</label>
					<div className="grid gap-4 sm:grid-cols-2">
						<label className="grid gap-1.5">
							<span className={inventoryLabelClass}>Recurso</span>
							<select
								className={inventoryInputClass}
								name="materialId"
								onChange={(event) => chooseMaterial(event.target.value)}
								required
								value={materialId}
							>
								<option value="">Seleccionar</option>
								{data.materials.map((item) => (
									<option key={item.id} value={item.id}>
										{item.code} · {item.name}
									</option>
								))}
							</select>
						</label>
						<label className="grid gap-1.5">
							<span className={inventoryLabelClass}>Bodega de origen</span>
							<select
								className={inventoryInputClass}
								name="warehouseId"
								onChange={(event) => chooseWarehouse(event.target.value)}
								required
								value={warehouseId}
							>
								<option value="">Seleccionar</option>
								{data.warehouses.map((item) => (
									<option key={item.id} value={item.id}>
										{item.code} · {item.name}
									</option>
								))}
							</select>
						</label>
					</div>
					{type === "TRANSFER" ? (
						<label className="grid gap-1.5">
							<span className={inventoryLabelClass}>Bodega de destino</span>
							<select
								className={inventoryInputClass}
								name="destinationWarehouseId"
								required
							>
								<option value="">Seleccionar</option>
								{data.warehouses.map((item) => (
									<option key={item.id} value={item.id}>
										{item.code} · {item.name}
									</option>
								))}
							</select>
						</label>
					) : null}
					<div className="grid gap-4 sm:grid-cols-2">
						{type === "ADJUSTMENT" ? (
							<label className="grid gap-1.5">
								<span className={inventoryLabelClass}>
									Stock físico contado
								</span>
								<input
									className={inventoryInputClass}
									min="0"
									name="physicalStock"
									required
									step="0.01"
									type="number"
								/>
							</label>
						) : (
							<label className="grid gap-1.5">
								<span className={inventoryLabelClass}>
									Cantidad
									{unit ? (
										<span className="normal-case tracking-normal text-[#74807b]">
											{" "}
											({unit})
										</span>
									) : null}
								</span>
								<input
									aria-describedby="movement-available"
									aria-invalid={exceedsStock || undefined}
									className={inventoryInputClass}
									max={takesStock && available !== null ? available : undefined}
									min="0.01"
									name="quantity"
									onChange={(event) =>
										setQuantity(Number(event.target.value) || 0)
									}
									required
									step="0.01"
									type="number"
								/>
								{available !== null ? (
									<span
										className={`text-xs ${exceedsStock ? "font-semibold text-[#b42318]" : "text-[#5d6964]"}`}
										id="movement-available"
									>
										{exceedsStock
											? `Solo hay ${available.toLocaleString("es-GT")} ${unit} en esta bodega`
											: `Disponible en esta bodega: ${available.toLocaleString("es-GT")} ${unit}`}
									</span>
								) : null}
							</label>
						)}
						<label className="grid gap-1.5">
							<span className={inventoryLabelClass}>Costo unitario</span>
							<input
								className={inventoryInputClass}
								min="0"
								name="unitCost"
								onChange={(event) => {
									setUnitCost(Number(event.target.value) || 0);
									setCostEdited(true);
								}}
								step="0.01"
								type="number"
								value={unitCost}
							/>
							{selectedResource ? (
								<span className="text-xs text-[#5d6964]">
									{costEdited
										? "Costo escrito a mano"
										: "Tomado del costo promedio o del catálogo"}
								</span>
							) : null}
						</label>
					</div>
					{type === "WASTE" ? (
						<div className="grid gap-4 rounded-xl bg-[#f5f1ed] p-4">
							<label className="grid gap-1.5">
								<span className={inventoryLabelClass}>
									Causa del desperdicio
								</span>
								<select
									className={inventoryInputClass}
									name="wasteReason"
									onChange={(event) =>
										setWasteReason(event.target.value as WasteReasonValue)
									}
									required
									value={wasteReason}
								>
									{wasteReasonValues.map((reason) => (
										<option key={reason} value={reason}>
											{wasteReasonLabels[reason]}
										</option>
									))}
								</select>
							</label>
							<label className="flex min-h-11 items-start gap-3 rounded-xl bg-white px-3 py-2.5 text-sm text-[#263130]">
								<input
									checked={requestWasteReview}
									className="mt-0.5 size-4 accent-[#c8202f]"
									name="requestWasteReview"
									onChange={(event) =>
										setRequestWasteReview(event.target.checked)
									}
									type="checkbox"
								/>
								<span>
									<strong className="block text-sm">Solicitar revisión</strong>
									<span className="mt-0.5 block text-xs leading-5 text-[#65716c]">
										Úsalo si el caso necesita seguimiento aunque no active una
										regla automática.
									</span>
								</span>
							</label>
							<div
								aria-live="polite"
								className={`flex items-start gap-3 rounded-xl px-3 py-3 text-sm ${
									!hasWasteReviewPreview
										? "bg-[#eef1ef] text-[#52605b]"
										: wasteReviewTriggers.length > 0
											? "bg-[#fff1c7] text-[#704800]"
											: "bg-[#eaf5ee] text-[#245d43]"
								}`}
							>
								{!hasWasteReviewPreview ? (
									<ShieldCheck
										aria-hidden="true"
										className="mt-0.5 shrink-0"
										size={18}
									/>
								) : wasteReviewTriggers.length > 0 ? (
									<AlertTriangle
										aria-hidden="true"
										className="mt-0.5 shrink-0"
										size={18}
									/>
								) : (
									<CheckCircle2
										aria-hidden="true"
										className="mt-0.5 shrink-0"
										size={18}
									/>
								)}
								<span>
									<strong className="block">
										{!hasWasteReviewPreview
											? "Completa recurso y cantidad"
											: wasteReviewTriggers.length > 0
												? "Se enviará a revisión"
												: "No requiere revisión"}
									</strong>
									<span className="mt-0.5 block text-xs leading-5">
										{hasWasteReviewPreview
											? "El stock se descontará inmediatamente al registrar el movimiento."
											: "Con esos datos te indicaremos si necesita seguimiento."}
									</span>
								</span>
							</div>
						</div>
					) : null}
					<label className="grid gap-1.5">
						<span className={inventoryLabelClass}>
							Proyecto{" "}
							<span className="normal-case tracking-normal text-[#74807b]">
								(opcional)
							</span>
						</span>
						<select className={inventoryInputClass} name="projectId">
							<option value="">Sin proyecto</option>
							{data.projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.code} · {project.name}
								</option>
							))}
						</select>
					</label>
					{isAssignable ? (
						<div className="grid gap-4 rounded-xl bg-[#edf4ef] p-4 sm:grid-cols-2">
							<label className="grid gap-1.5">
								<span className={inventoryLabelClass}>Responsable</span>
								<input
									className={inventoryInputClass}
									maxLength={120}
									name="responsibleName"
									placeholder="Persona que recibe"
									required
								/>
							</label>
							<label className="grid gap-1.5">
								<span className={inventoryLabelClass}>Devolución esperada</span>
								<input
									className={inventoryInputClass}
									name="expectedReturnDate"
									type="date"
								/>
							</label>
							<p className="text-xs leading-5 text-[#52615b] sm:col-span-2">
								Esta salida se registrará como asignación al proyecto. La
								devolución debe ingresarse como “Devolución”.
							</p>
						</div>
					) : null}
					<label className="grid gap-1.5">
						<span className={inventoryLabelClass}>
							Referencia{" "}
							<span className="normal-case tracking-normal text-[#74807b]">
								(opcional)
							</span>
						</span>
						<input
							className={inventoryInputClass}
							maxLength={120}
							name="reference"
							placeholder="Factura, vale o documento"
						/>
					</label>
					<label className="grid gap-1.5">
						<span className={inventoryLabelClass}>
							{destructive ? "Motivo" : "Notas"}
						</span>
						<textarea
							className={inventoryTextareaClass}
							maxLength={1000}
							minLength={type === "WASTE" ? 8 : undefined}
							name="notes"
							required={destructive}
							placeholder={
								destructive
									? type === "WASTE"
										? "Describe brevemente qué ocurrió"
										: "Explica el motivo del ajuste"
									: "Información adicional"
							}
						/>
					</label>
					<div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button
							className={inventorySecondaryButtonClass}
							onClick={onClose}
							type="button"
						>
							Cancelar
						</button>
						<button
							className={
								destructive
									? `${inventoryPrimaryButtonClass} bg-[#202a2c] shadow-[0_12px_26px_rgba(25,35,36,0.2)] hover:bg-[#11191a]`
									: inventoryPrimaryButtonClass
							}
							type="submit"
						>
							<SlidersHorizontal aria-hidden="true" size={17} />
							{type === "ADJUSTMENT"
								? "Aplicar ajuste"
								: type === "TRANSFER"
									? "Completar traslado"
									: `Registrar ${typeLabel(type).toLowerCase()}`}
						</button>
					</div>
				</form>
			</section>
		</div>
	);
}
