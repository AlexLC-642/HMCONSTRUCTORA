"use client";

import {
	ArrowLeftRight,
	Boxes,
	Eye,
	Hammer,
	PackageCheck,
	PackageOpen,
	TriangleAlert,
	Warehouse,
	Wrench,
	X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { StatStrip } from "@/shared/ui/stat-strip";
import type { getStockDashboard } from "../application/queries";
import {
	InventoryEmpty,
	InventoryPanel,
	InventorySectionHeader,
	InventoryStatus,
	inventoryPrimaryButtonClass,
	inventorySecondaryButtonClass,
} from "./inventory-ui";

type Dashboard = Awaited<ReturnType<typeof getStockDashboard>>;
type StockRow = Dashboard["rows"][number];

const currency = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const number = new Intl.NumberFormat("es-GT", { maximumFractionDigits: 2 });

function movementHref(row: StockRow) {
	return `/inventory?view=movement&nuevo=1&recurso=${row.materialId}&bodega=${row.warehouseId}`;
}

function stateLabel(status: string) {
	return status === "empty"
		? "Sin existencias"
		: status === "low"
			? "Bajo mínimo"
			: "Disponible";
}

function stateTone(status: string): "danger" | "warning" | "success" {
	return status === "empty"
		? "danger"
		: status === "low"
			? "warning"
			: "success";
}

const resourceTypeGroups = [
	{ key: "MATERIAL", label: "Materiales", icon: Boxes },
	{ key: "TOOL", label: "Herramientas", icon: Hammer },
	{ key: "EQUIPMENT", label: "Maquinaria y equipo", icon: Wrench },
] as const;

export function InventoryStockDashboard({
	data,
	toolbar,
	activeStatus,
	activeWarehouse,
}: {
	data: Dashboard;
	params?: Record<string, string | string[] | undefined>;
	/** Filtros de la página: se muestran dentro del panel de existencias. */
	toolbar?: ReactNode;
	activeStatus?: string;
	activeWarehouse?: string;
}) {
	const [dialogRow, setDialogRow] = useState<StockRow | null>(null);
	const stockHref = (changes: { status?: string; warehouseId?: string }) => {
		const query = new URLSearchParams({ view: "stock" });
		const status = changes.status ?? activeStatus ?? "";
		const warehouseId = changes.warehouseId ?? activeWarehouse ?? "";
		if (status) query.set("status", status);
		if (warehouseId) query.set("warehouseId", warehouseId);
		return `/inventory?${query.toString()}`;
	};
	const selectedWarehouse = data.warehouseValues.find(
		(warehouse) => warehouse.id === activeWarehouse,
	);

	useEffect(() => {
		function close(event: KeyboardEvent) {
			if (event.key === "Escape") setDialogRow(null);
		}
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, []);

	return (
		<div className="space-y-4">
			<StatStrip
				items={[
					{
						key: "materials",
						label: "Recursos con existencia",
						value: `${data.resourcesInStock}`,
						detail: `de ${data.activeMaterials} en el catálogo`,
						active: !activeStatus,
						href: stockHref({ status: "" }),
					},
					{
						key: "value",
						label: "Valor del inventario",
						value: currency.format(data.inventoryValue),
						detail: selectedWarehouse
							? `En ${selectedWarehouse.name}`
							: "Todas las bodegas",
					},
					{
						key: "low",
						label: "Bajo mínimo",
						value: String(data.health.low),
						detail: "Conviene reponer pronto",
						attention: data.health.low > 0 ? "warning" : undefined,
						active: activeStatus === "low",
						href: stockHref({ status: "low" }),
					},
					{
						key: "empty",
						label: "Sin existencias",
						value: String(data.health.empty),
						detail: "Agotados",
						attention: data.health.empty > 0 ? "danger" : undefined,
						active: activeStatus === "empty",
						href: stockHref({ status: "empty" }),
					},
				]}
				label="Resumen del inventario"
			/>

			<div className="inventory-overview">
				<InventoryPanel>
					<InventorySectionHeader
						description="Elige una bodega para ver solo su stock, ordenado por tipo."
						icon={Warehouse}
						title="Bodegas"
					/>
					<nav aria-label="Bodegas" className="inventory-warehouses">
						<a
							aria-current={!activeWarehouse ? "page" : undefined}
							href={stockHref({ warehouseId: "" })}
						>
							<strong>Todas las bodegas</strong>
							<span className="inventory-warehouses__value">
								{currency.format(
									data.warehouseValues.reduce(
										(sum, warehouse) => sum + warehouse.value,
										0,
									),
								)}
							</span>
							<span className="inventory-warehouses__types">
								{data.warehouseValues.length}{" "}
								{data.warehouseValues.length === 1 ? "bodega" : "bodegas"}
							</span>
						</a>
						{data.warehouseValues.map((warehouse) => (
							<a
								aria-current={
									activeWarehouse === warehouse.id ? "page" : undefined
								}
								data-alert={warehouse.alerts > 0 || undefined}
								href={stockHref({ warehouseId: warehouse.id })}
								key={warehouse.id}
							>
								<strong>{warehouse.name}</strong>
								<span className="inventory-warehouses__value">
									{currency.format(warehouse.value)}
								</span>
								<span className="inventory-warehouses__types">
									{resourceTypeGroups
										.map((group) => ({
											label: group.label.toLowerCase(),
											count: warehouse.byType[group.key],
										}))
										.filter((item) => item.count > 0)
										.map((item) => `${item.count} ${item.label}`)
										.join(" · ") || "Sin existencias"}
								</span>
								{warehouse.alerts > 0 ? (
									<em>{warehouse.alerts} por reponer</em>
								) : null}
							</a>
						))}
					</nav>
				</InventoryPanel>
				<InventoryPanel>
					<InventorySectionHeader
						description="Existencia frente al mínimo definido."
						icon={TriangleAlert}
						title="Estado y reposición"
					/>
					<StockHealth
						activeStatus={activeStatus}
						filterHref={(status) => stockHref({ status })}
						health={data.health}
						rows={data.rows}
					/>
				</InventoryPanel>
			</div>

			<StockRows
				data={data}
				onSelect={setDialogRow}
				title={selectedWarehouse ? selectedWarehouse.name : "Todas las bodegas"}
				toolbar={toolbar}
			/>
			{dialogRow ? (
				<StockDetail row={dialogRow} onClose={() => setDialogRow(null)} />
			) : null}
		</div>
	);
}

/** Barra segmentada del estado + lista de materiales por reponer. */
function StockHealth({
	health,
	rows,
	filterHref,
	activeStatus,
}: {
	health: Dashboard["health"];
	rows: StockRow[];
	filterHref: (status: string) => string;
	activeStatus?: string;
}) {
	const total = health.available + health.low + health.empty;
	const segments = [
		{ key: "available", label: "Disponible", value: health.available },
		{ key: "low", label: "Bajo mínimo", value: health.low },
		{ key: "empty", label: "Sin existencias", value: health.empty },
	];
	const toRestock = rows
		.filter((row) => row.status !== "available")
		.sort(
			(a, b) =>
				a.quantity / (a.material.minimumStock || 1) -
				b.quantity / (b.material.minimumStock || 1),
		)
		.slice(0, 5);
	if (total === 0) {
		return (
			<InventoryEmpty
				description="Registra recursos y existencias para ver su estado."
				icon={PackageOpen}
				title="Todavía no hay stock"
			/>
		);
	}
	return (
		<div className="grid grid-cols-1 gap-4 p-4 sm:p-5">
			<div className="min-w-0">
				<div aria-hidden="true" className="inventory-health-bar">
					{segments.map((segment) =>
						segment.value > 0 ? (
							<span
								data-status={segment.key}
								key={segment.key}
								style={{ flexGrow: segment.value }}
							/>
						) : null,
					)}
				</div>
				<div className="inventory-health-legend">
					{segments.map((segment) => (
						<a
							aria-current={activeStatus === segment.key ? "true" : undefined}
							data-status={segment.key}
							href={filterHref(segment.key)}
							key={segment.key}
						>
							<i aria-hidden="true" />
							{segment.label}
							<strong>{segment.value}</strong>
						</a>
					))}
				</div>
			</div>
			{toRestock.length ? (
				<ul className="inventory-restock">
					{toRestock.map((row) => {
						const minimum = row.material.minimumStock;
						const ratio = minimum > 0 ? Math.min(1, row.quantity / minimum) : 0;
						return (
							<li key={row.id}>
								<div className="min-w-0">
									<strong>{row.material.name}</strong>
									<small>
										{row.warehouse.name} · {number.format(row.quantity)} de{" "}
										{number.format(minimum)} {row.material.unit}
									</small>
									<span aria-hidden="true" className="inventory-restock__bar">
										<span
											data-status={row.status}
											style={{ width: `${Math.max(ratio * 100, 2)}%` }}
										/>
									</span>
								</div>
								<a
									className="inventory-restock__action focus-ring"
									href={movementHref(row)}
								>
									Registrar entrada
								</a>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="inventory-restock__ok">
					<PackageCheck aria-hidden="true" size={16} />
					Todo está por encima del mínimo.
				</p>
			)}
		</div>
	);
}

/**
 * Existencias en una sola tabla. El tipo se elige con pestañas (como en
 * Catálogo) y la bodega con las tarjetas de arriba: la lista se mantiene corta.
 */
function StockRows({
	data,
	onSelect,
	toolbar,
	title,
}: {
	data: Dashboard;
	onSelect: (row: StockRow) => void;
	toolbar?: ReactNode;
	title: string;
}) {
	const [type, setType] = useState<"" | "MATERIAL" | "TOOL" | "EQUIPMENT">("");
	const counts = {
		MATERIAL: data.rows.filter(
			(row) => row.material.resourceType === "MATERIAL",
		).length,
		TOOL: data.rows.filter((row) => row.material.resourceType === "TOOL")
			.length,
		EQUIPMENT: data.rows.filter(
			(row) => row.material.resourceType === "EQUIPMENT",
		).length,
	};
	const rows = type
		? data.rows.filter((row) => row.material.resourceType === type)
		: data.rows;
	const showWarehouse =
		new Set(data.rows.map((row) => row.warehouseId)).size > 1;
	const tabs = [
		["", "Todos", Boxes, data.rows.length],
		["MATERIAL", "Materiales", PackageOpen, counts.MATERIAL],
		["TOOL", "Herramientas", Hammer, counts.TOOL],
		["EQUIPMENT", "Maquinaria y equipo", Wrench, counts.EQUIPMENT],
	] as const;

	return (
		<InventoryPanel>
			<InventorySectionHeader
				description={`${rows.length} ${rows.length === 1 ? "registro" : "registros"} · ${currency.format(rows.reduce((sum, row) => sum + row.value, 0))} en existencias.`}
				icon={Boxes}
				title={`Existencias · ${title}`}
			/>
			<nav
				aria-label="Tipos de recurso"
				className="inventory-scrollbar flex gap-2 overflow-x-auto border-t border-[var(--border)] px-4 py-3"
			>
				{tabs.map(([value, label, Icon, count]) => (
					<button
						aria-pressed={type === value}
						className="inventory-catalog-tab focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold"
						disabled={value !== "" && count === 0}
						key={value}
						onClick={() => setType(value)}
						type="button"
					>
						<Icon aria-hidden="true" size={16} />
						{label}
						<span className="rounded-md bg-black/5 px-1.5 text-xs tabular-nums opacity-80">
							{count}
						</span>
					</button>
				))}
			</nav>
			{toolbar}
			{rows.length === 0 ? (
				<InventoryEmpty
					action={
						<a
							className={inventoryPrimaryButtonClass}
							href="/inventory?view=catalog"
						>
							Abrir catálogo
						</a>
					}
					description="No hay existencias con estos filtros. Cambia la búsqueda o registra un movimiento."
					icon={PackageOpen}
					title="Sin existencias para mostrar"
				/>
			) : (
				<StockTable
					onSelect={onSelect}
					rows={rows}
					showWarehouse={showWarehouse}
				/>
			)}
		</InventoryPanel>
	);
}

function StockTable({
	rows,
	onSelect,
	showWarehouse,
}: {
	rows: StockRow[];
	onSelect: (row: StockRow) => void;
	/** Con varias bodegas visibles, cada fila dice en cuál está. */
	showWarehouse: boolean;
}) {
	return (
		<>
			<div className="hidden overflow-x-auto md:block">
				<table className="inventory-stock-table inventory-stock-table--flat">
					<colgroup>
						<col />
						<col style={{ width: "22%" }} />
						<col style={{ width: "15%" }} />
						<col style={{ width: "14%" }} />
						<col style={{ width: "11.5rem" }} />
					</colgroup>
					<thead>
						<tr>
							<th scope="col">Recurso</th>
							<th scope="col">Existencia</th>
							<th className="inventory-num" scope="col">
								Valor
							</th>
							<th scope="col">Estado</th>
							<th className="inventory-actions" scope="col">
								<span className="sr-only">Acciones</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr key={row.id}>
								<td>
									<strong>{row.material.name}</strong>
									<small>
										{row.material.code}
										{showWarehouse ? ` · ${row.warehouse.name}` : ""}
									</small>
								</td>
								<td>
									<span className="font-semibold tabular-nums">
										{number.format(row.quantity)} {row.material.unit}
									</span>
									{row.material.minimumStock > 0 ? (
										<span className="inventory-stock-level">
											<span
												aria-hidden="true"
												className="inventory-restock__bar"
											>
												<span
													data-status={row.status}
													style={{
														width: `${Math.max(Math.min(1, row.quantity / (row.material.minimumStock * 2)) * 100, 2)}%`,
													}}
												/>
											</span>
											<small>
												mín. {number.format(row.material.minimumStock)}
											</small>
										</span>
									) : null}
								</td>
								<td className="inventory-num">
									<strong>{currency.format(row.value)}</strong>
									<small>{currency.format(row.unitCost)} c/u</small>
								</td>
								<td>
									<InventoryStatus tone={stateTone(row.status)}>
										{stateLabel(row.status)}
									</InventoryStatus>
								</td>
								<td className="inventory-actions">
									<span className="inventory-row-actions">
										<a
											className="inventory-row-action focus-ring"
											href={movementHref(row)}
											title="Registrar entrada, salida o traslado"
										>
											<ArrowLeftRight aria-hidden="true" size={14} />
											Movimiento
										</a>
										<button
											aria-label={`Ver detalle de ${row.material.name}`}
											className="inventory-row-action inventory-row-action--icon focus-ring"
											onClick={() => onSelect(row)}
											title="Ver detalle"
											type="button"
										>
											<Eye aria-hidden="true" size={14} />
										</button>
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="grid grid-cols-1 gap-2 p-3 md:hidden">
				{rows.map((row) => (
					<article className="inventory-stock-card" key={row.id}>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<strong className="block truncate">{row.material.name}</strong>
								<small>{row.material.code}</small>
							</div>
							<InventoryStatus tone={stateTone(row.status)}>
								{stateLabel(row.status)}
							</InventoryStatus>
						</div>
						<dl>
							<div>
								<dt>Existencia</dt>
								<dd>
									{number.format(row.quantity)} {row.material.unit}
								</dd>
							</div>
							<div>
								<dt>Mínimo</dt>
								<dd>{number.format(row.material.minimumStock)}</dd>
							</div>
							<div>
								<dt>Valor</dt>
								<dd>{currency.format(row.value)}</dd>
							</div>
						</dl>
						<div className="grid grid-cols-2 gap-2">
							<a
								className={inventorySecondaryButtonClass}
								href={movementHref(row)}
							>
								<ArrowLeftRight aria-hidden="true" size={15} />
								Movimiento
							</a>
							<button
								className={inventorySecondaryButtonClass}
								onClick={() => onSelect(row)}
								type="button"
							>
								<Eye aria-hidden="true" size={15} />
								Detalle
							</button>
						</div>
					</article>
				))}
			</div>
		</>
	);
}

function StockDetail({ row, onClose }: { row: StockRow; onClose: () => void }) {
	return (
		<div className="inventory-drawer-backdrop" role="presentation">
			<button
				aria-label="Cerrar detalle"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				type="button"
			/>
			<section
				aria-labelledby="stock-detail-title"
				aria-modal="true"
				className="inventory-drawer inventory-scrollbar"
				role="dialog"
			>
				<div className="inventory-commandbar rounded-none px-5 py-5">
					<div className="relative z-10 flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#bdc8c3]">
								Detalle de existencia
							</p>
							<h2
								className="mt-1 text-xl font-bold text-white"
								id="stock-detail-title"
							>
								{row.material.name}
							</h2>
							<p className="mt-1 text-sm text-[#bdc8c3]">
								{row.material.code} · {row.warehouse.name}
							</p>
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
				<div className="p-5">
					<InventoryStatus tone={stateTone(row.status)}>
						{stateLabel(row.status)}
					</InventoryStatus>
					<dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
						<div className="rounded-xl bg-white p-3 shadow-[0_8px_20px_rgba(28,40,38,0.07)]">
							<dt className="text-xs text-[#68746f]">Existencia</dt>
							<dd className="mt-1 text-lg font-bold tabular-nums">
								{number.format(row.quantity)} {row.material.unit}
							</dd>
						</div>
						<div className="rounded-xl bg-white p-3 shadow-[0_8px_20px_rgba(28,40,38,0.07)]">
							<dt className="text-xs text-[#68746f]">Stock mínimo</dt>
							<dd className="mt-1 text-lg font-bold tabular-nums">
								{number.format(row.material.minimumStock)}
							</dd>
						</div>
						<div className="rounded-xl bg-white p-3 shadow-[0_8px_20px_rgba(28,40,38,0.07)]">
							<dt className="text-xs text-[#68746f]">Costo unitario</dt>
							<dd className="mt-1 font-bold tabular-nums">
								{currency.format(row.unitCost)}
							</dd>
						</div>
						<div className="rounded-xl bg-white p-3 shadow-[0_8px_20px_rgba(28,40,38,0.07)]">
							<dt className="text-xs text-[#68746f]">Valor total</dt>
							<dd className="mt-1 font-bold tabular-nums">
								{currency.format(row.value)}
							</dd>
						</div>
					</dl>
					<a
						className={`${inventoryPrimaryButtonClass} mt-5 w-full`}
						href={movementHref(row)}
					>
						Registrar movimiento
					</a>
				</div>
			</section>
		</div>
	);
}
