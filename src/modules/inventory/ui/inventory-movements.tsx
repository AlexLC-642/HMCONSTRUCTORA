"use client";

import {
	ArrowDownToLine,
	ArrowLeftRight,
	ArrowUpFromLine,
	CircleDollarSign,
	ClipboardList,
	History,
	PackageOpen,
	Plus,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";
import { recordStockMovementAction } from "../application/actions";
import type { getMovementHistory } from "../application/queries";
import {
	InventoryEmpty,
	InventoryMetric,
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
}: {
	data: HistoryData;
	params: Params;
}) {
	const [open, setOpen] = useState(false);
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
					description="Entradas, salidas, traslados y ajustes con trazabilidad."
					icon={ArrowLeftRight}
					title="Movimientos de inventario"
				/>
			</InventoryPanel>

			<section
				aria-label="Resumen de movimientos"
				className="kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
			>
				<InventoryMetric
					detail="según los filtros actuales"
					icon={History}
					label="Movimientos"
					tone="graphite"
					value={data.total}
				/>
				<InventoryMetric
					detail="entradas y devoluciones"
					icon={ArrowDownToLine}
					label="Ingresos"
					tone="green"
					value={incoming}
				/>
				<InventoryMetric
					detail="salidas y desperdicios"
					icon={ArrowUpFromLine}
					label="Egresos"
					tone="red"
					value={outgoing}
				/>
				<InventoryMetric
					detail="costo acumulado filtrado"
					icon={CircleDollarSign}
					label="Valor movilizado"
					tone="amber"
					value={currency.format(data.movedValue)}
				/>
			</section>

			<AutoFilterForm
				action="/inventory"
				className="inventory-panel grid gap-2 p-3 sm:p-4 md:grid-cols-[minmax(220px,1fr)_175px_195px]"
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
				<label>
					<span className="sr-only">Filtrar por tipo</span>
					<select
						className={inventoryInputClass}
						defaultValue={first(params.type) ?? ""}
						name="type"
					>
						<option value="">Todos los tipos</option>
						{types.map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
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
			<p className="-mt-2 px-1 text-xs font-medium text-[#63706b]">
				Los resultados se actualizan al cambiar los filtros.
			</p>

			<InventoryPanel>
				<InventorySectionHeader
					description={`${data.total} ${data.total === 1 ? "registro encontrado" : "registros encontrados"}.`}
					icon={ClipboardList}
					title="Kardex"
				/>
				{data.items.length ? (
					<>
						<div className="inventory-scrollbar hidden overflow-x-auto md:block">
							<table className="inventory-table w-full min-w-[1180px] text-sm">
								<thead>
									<tr>
										{[
											"Fecha",
											"Tipo",
											"Material",
											"Bodega",
											"Proyecto",
											"Cantidad",
											"Costo",
											"Total",
											"Referencia",
											"Usuario",
											"Acción",
										].map((heading) => (
											<th key={heading}>{heading}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{data.items.map((item) => (
										<tr key={item.id}>
											<td className="whitespace-nowrap text-xs">
												{item.createdAtLabel}
											</td>
											<td>
												<InventoryStatus tone={typeTone(item.type)}>
													{typeLabel(item.type)}
												</InventoryStatus>
											</td>
											<td className="font-bold">
												{item.material.name}
												<small className="mt-0.5 block text-xs font-medium text-[#6a7671]">
													{item.material.code}
												</small>
											</td>
											<td>
												{item.warehouse.name}
												<small className="mt-0.5 block text-xs text-[#6a7671]">
													{item.warehouse.code}
												</small>
											</td>
											<td>{item.project?.code ?? "—"}</td>
											<td className="font-bold tabular-nums">
												{signedQuantity(item)}
											</td>
											<td className="tabular-nums">
												{currency.format(item.unitCost)}
											</td>
											<td className="font-semibold tabular-nums">
												{currency.format(item.totalCost)}
											</td>
											<td>{item.reference ?? "—"}</td>
											<td title={item.createdBy?.name ?? "Sin usuario"}>
												{item.createdBy?.name?.replace(" Constructora", "") ??
													"—"}
											</td>
											<td>
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
						<div className="grid gap-3 p-3 md:hidden">
							{data.items.map((item) => (
								<article
									className="rounded-2xl bg-[#f3f5f1] p-4 shadow-[inset_0_0_0_1px_rgba(48,62,56,0.08)]"
									key={item.id}
								>
									<div className="flex items-center justify-between gap-3">
										<InventoryStatus tone={typeTone(item.type)}>
											{typeLabel(item.type)}
										</InventoryStatus>
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
				<MovementDialog data={data} onClose={() => setOpen(false)} />
			) : null}
			{selected ? (
				<MovementDetail movement={selected} onClose={() => setSelected(null)} />
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
}: {
	movement: Movement;
	onClose: () => void;
}) {
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
					<InventoryStatus tone={typeTone(movement.type)}>
						{typeLabel(movement.type)}
					</InventoryStatus>
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
					</dl>
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

function MovementDialog({
	data,
	onClose,
}: {
	data: HistoryData;
	onClose: () => void;
}) {
	const [type, setType] = useState("IN");
	const [materialId, setMaterialId] = useState("");
	const selectedResource = data.materials.find(
		(item) => item.id === materialId,
	);
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
								onChange={(event) => setMaterialId(event.target.value)}
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
								<span className={inventoryLabelClass}>Cantidad</span>
								<input
									className={inventoryInputClass}
									min="0.01"
									name="quantity"
									required
									step="0.01"
									type="number"
								/>
							</label>
						)}
						<label className="grid gap-1.5">
							<span className={inventoryLabelClass}>Costo unitario</span>
							<input
								className={inventoryInputClass}
								min="0"
								name="unitCost"
								step="0.01"
								type="number"
								defaultValue="0"
							/>
						</label>
					</div>
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
								Esta salida se registrará como asignación al proyecto. La devolución debe ingresarse como “Devolución”.
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
							name="notes"
							required={destructive}
							placeholder={
								destructive
									? "Explica el motivo del ajuste"
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
