"use client";

import {
	Boxes,
	CircleDollarSign,
	Eye,
	PackageCheck,
	PackageOpen,
	TriangleAlert,
	Warehouse,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { chartTooltip, hmChartColors } from "@/shared/ui/charts/chart-theme";
import { EChart } from "@/shared/ui/charts/e-chart";
import type { getStockDashboard } from "../application/queries";
import {
	InventoryEmpty,
	InventoryMetric,
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

export function InventoryStockDashboard({
	data,
}: {
	data: Dashboard;
	params?: Record<string, string | string[] | undefined>;
}) {
	const [dialogRow, setDialogRow] = useState<StockRow | null>(null);
	const totalHealth =
		data.health.available + data.health.low + data.health.empty;
	const filterHref = (status: string) =>
		`/inventory?view=stock&status=${status}`;

	useEffect(() => {
		function close(event: KeyboardEvent) {
			if (event.key === "Escape") setDialogRow(null);
		}
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, []);

	return (
		<div className="space-y-5">
			<section
				aria-label="Resumen del inventario"
				className="kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
			>
				<InventoryMetric
					detail="en el catálogo"
					icon={PackageCheck}
					label="Materiales activos"
					tone="red"
					value={data.activeMaterials}
				/>
				<InventoryMetric
					detail="ubicaciones operativas"
					icon={Warehouse}
					label="Bodegas"
					tone="blue"
					value={data.activeWarehouses}
				/>
				<InventoryMetric
					detail="con saldo disponible"
					icon={Boxes}
					label="Posiciones de stock"
					tone="green"
					value={data.positionCount}
				/>
				<InventoryMetric
					detail="valor estimado actual"
					icon={CircleDollarSign}
					label="Valor del inventario"
					tone="amber"
					value={currency.format(data.inventoryValue)}
				/>
			</section>

			<div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
				<InventoryPanel>
					<InventorySectionHeader
						description="Disponibilidad frente al stock mínimo."
						icon={PackageCheck}
						title="Salud del inventario"
					/>
					{totalHealth ? (
						<div className="p-4 sm:p-5">
							<div className="relative">
								<EChart
									className="h-[220px] w-full"
									onChartClick={(event) => {
										const name = (event as { name?: string }).name;
										window.location.href = filterHref(
											name === "Bajo mínimo"
												? "low"
												: name === "Sin existencias"
													? "empty"
													: "available",
										);
									}}
									option={{
										tooltip: {
											...chartTooltip(),
											trigger: "item",
											formatter: "{b}<br/>{c} materiales ({d}%)",
										},
										legend: { show: false },
										series: [
											{
												type: "pie",
												radius: ["58%", "76%"],
												label: { show: false },
												itemStyle: { borderColor: "#fff", borderWidth: 3 },
												data: [
													{
														name: "Disponible",
														value: data.health.available,
														itemStyle: { color: hmChartColors.green },
													},
													{
														name: "Bajo mínimo",
														value: data.health.low,
														itemStyle: { color: hmChartColors.amber },
													},
													{
														name: "Sin existencias",
														value: data.health.empty,
														itemStyle: { color: "#c8202f" },
													},
												],
											},
										],
									}}
								/>
								<div className="pointer-events-none absolute inset-x-0 top-[78px] text-center">
									<strong className="block text-3xl font-bold tracking-[-0.03em] tabular-nums">
										{totalHealth}
									</strong>
									<span className="text-xs font-medium text-[#68746f]">
										materiales
									</span>
								</div>
							</div>
							<div className="grid gap-2 sm:grid-cols-3">
								<a
									className="rounded-xl bg-[#e8f5ee] px-3 py-2.5 text-sm font-semibold text-[#126348] transition hover:bg-[#dcefe5]"
									href={filterHref("available")}
								>
									Disponible{" "}
									<strong className="float-right tabular-nums">
										{data.health.available}
									</strong>
								</a>
								<a
									className="rounded-xl bg-[#fff3d7] px-3 py-2.5 text-sm font-semibold text-[#805400] transition hover:bg-[#fce9bc]"
									href={filterHref("low")}
								>
									Bajo mínimo{" "}
									<strong className="float-right tabular-nums">
										{data.health.low}
									</strong>
								</a>
								<a
									className="rounded-xl bg-[#f9e8e9] px-3 py-2.5 text-sm font-semibold text-[#991b29] transition hover:bg-[#f4dadd]"
									href={filterHref("empty")}
								>
									Sin stock{" "}
									<strong className="float-right tabular-nums">
										{data.health.empty}
									</strong>
								</a>
							</div>
						</div>
					) : (
						<InventoryEmpty
							description="Los indicadores aparecerán cuando registres el primer material y su existencia."
							icon={PackageOpen}
							title="Todavía no hay stock"
						/>
					)}
				</InventoryPanel>

				<InventoryPanel>
					<InventorySectionHeader
						description="Valor estimado de los materiales almacenados."
						icon={Warehouse}
						title="Distribución por bodega"
					/>
					{data.warehouseValues.length === 1 &&
					data.warehouseValues[0].value > 0 ? (
						<div className="p-5 sm:p-6">
							<div className="flex flex-wrap items-end justify-between gap-3">
								<div>
									<p className="text-sm font-bold text-[#273330]">
										{data.warehouseValues[0].name}
									</p>
									<p className="text-xs text-[#68746f]">
										{data.warehouseValues[0].code}
									</p>
								</div>
								<strong className="text-2xl font-bold tracking-[-0.03em] text-[#126348] tabular-nums">
									{currency.format(data.warehouseValues[0].value)}
								</strong>
							</div>
							<div className="mt-8 h-3 overflow-hidden rounded-full bg-[#e1e6e1]">
								<div className="h-full w-full rounded-full bg-[#197456]" />
							</div>
							<div className="mt-3 flex justify-between gap-3 text-xs font-medium text-[#68746f]">
								<span>100% del valor registrado</span>
								<span>{data.warehouseValues[0].materialCount} materiales</span>
							</div>
						</div>
					) : data.warehouseValues.some((item) => item.value > 0) ? (
						<div className="p-4 sm:p-5">
							<EChart
								className="h-[265px] w-full"
								option={{
									tooltip: {
										...chartTooltip(),
										trigger: "axis",
										formatter: (items: unknown) => {
											const item = (
												items as Array<{
													name: string;
													value: number;
													data: { materialCount: number };
												}>
											)[0];
											return `${item.name}<br/>${currency.format(item.value)}<br/>${item.data.materialCount} materiales`;
										},
									},
									grid: {
										left: 12,
										right: 28,
										top: 12,
										bottom: 12,
										containLabel: true,
									},
									xAxis: {
										type: "value",
										axisLabel: {
											formatter: (value: number) => currency.format(value),
										},
										splitLine: { lineStyle: { color: "#e3e7e3" } },
									},
									yAxis: {
										type: "category",
										inverse: true,
										data: data.warehouseValues.map((item) => item.code),
										axisLine: { show: false },
										axisTick: { show: false },
									},
									series: [
										{
											type: "bar",
											barMaxWidth: 22,
											itemStyle: { borderRadius: [0, 5, 5, 0] },
											data: data.warehouseValues.map((item) => ({
												value: item.value,
												name: item.name,
												materialCount: item.materialCount,
												itemStyle: { color: hmChartColors.green },
											})),
										},
									],
								}}
							/>
						</div>
					) : (
						<InventoryEmpty
							description="Agrega costos y existencias para comparar el valor almacenado en cada bodega."
							icon={Warehouse}
							title="Sin valores para comparar"
						/>
					)}
				</InventoryPanel>
			</div>

			{data.alerts.length ? (
				<InventoryPanel>
					<InventorySectionHeader
						action={
							<a
								className="text-sm font-bold text-[#a71928] hover:underline"
								href={filterHref("low")}
							>
								Revisar todos
							</a>
						}
						description="Materiales agotados o próximos al mínimo."
						icon={TriangleAlert}
						title="Atención requerida"
					/>
					<div className="divide-y divide-[#e1e5e1]">
						{data.alerts.map((row) => (
							<button
								className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-[#f7f8f5] sm:px-5"
								key={row.id}
								onClick={() => setDialogRow(row)}
								type="button"
							>
								<div className="min-w-0">
									<strong className="block truncate text-sm text-[#17201f]">
										{row.material.name}
									</strong>
									<p className="mt-0.5 text-xs text-[#68746f]">
										{row.warehouse.name} · {number.format(row.quantity)} de
										mínimo {number.format(row.material.minimumStock)}{" "}
										{row.material.unit}
									</p>
								</div>
								<InventoryStatus tone={stateTone(row.status)}>
									{stateLabel(row.status)}
								</InventoryStatus>
							</button>
						))}
					</div>
				</InventoryPanel>
			) : totalHealth > 0 ? (
				<div className="flex items-center gap-3 rounded-2xl bg-[#e5f5ed] px-4 py-3.5 text-sm font-semibold text-[#126348] shadow-[0_10px_26px_rgba(18,99,72,0.1)]">
					<PackageCheck aria-hidden="true" size={18} />
					El stock está dentro de los niveles definidos.
				</div>
			) : null}

			<StockRows data={data} onSelect={setDialogRow} />
			{dialogRow ? (
				<StockDetail row={dialogRow} onClose={() => setDialogRow(null)} />
			) : null}
		</div>
	);
}

function StockRows({
	data,
	onSelect,
}: {
	data: Dashboard;
	onSelect: (row: StockRow) => void;
}) {
	return (
		<InventoryPanel>
			<InventorySectionHeader
				description="Existencia, costo y estado por material y bodega."
				icon={Boxes}
				title="Existencias"
			/>
			{data.rows.length ? (
				<>
					<div className="inventory-scrollbar hidden overflow-x-auto md:block">
						<table className="inventory-table w-full min-w-[980px] text-sm">
							<thead>
								<tr>
									{[
										"Material",
										"Bodega",
										"Existencia",
										"Costo unitario",
										"Valor",
										"Mínimo",
										"Estado",
										"Acción",
									].map((heading) => (
										<th key={heading}>{heading}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.rows.map((row) => (
									<tr key={row.id}>
										<td className="font-bold text-[#202a28]">
											{row.material.name}
											<small className="mt-0.5 block text-xs font-medium text-[#6a7671]">
												{row.material.code}
											</small>
										</td>
										<td>
											{row.warehouse.name}
											<small className="mt-0.5 block text-xs text-[#6a7671]">
												{row.warehouse.code}
											</small>
										</td>
										<td className="font-semibold tabular-nums">
											{number.format(row.quantity)} {row.material.unit}
										</td>
										<td className="tabular-nums">
											{currency.format(row.unitCost)}
										</td>
										<td className="font-semibold tabular-nums">
											{currency.format(row.value)}
										</td>
										<td className="tabular-nums">
											{number.format(row.material.minimumStock)}
										</td>
										<td>
											<InventoryStatus tone={stateTone(row.status)}>
												{stateLabel(row.status)}
											</InventoryStatus>
										</td>
										<td>
											<button
												className={inventorySecondaryButtonClass}
												onClick={() => onSelect(row)}
												type="button"
											>
												<Eye aria-hidden="true" size={15} />
												Detalle
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="grid gap-3 p-3 md:hidden">
						{data.rows.map((row) => (
							<article
								className="rounded-2xl bg-[#f3f5f1] p-4 shadow-[inset_0_0_0_1px_rgba(48,62,56,0.08)]"
								key={row.id}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<strong className="block truncate">
											{row.material.name}
										</strong>
										<p className="mt-0.5 text-xs text-[#68746f]">
											{row.material.code} · {row.warehouse.name}
										</p>
									</div>
									<InventoryStatus tone={stateTone(row.status)}>
										{stateLabel(row.status)}
									</InventoryStatus>
								</div>
								<dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-[#68746f]">
									<div>
										<dt>Existencia</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{number.format(row.quantity)} {row.material.unit}
										</dd>
									</div>
									<div>
										<dt>Mínimo</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{number.format(row.material.minimumStock)}
										</dd>
									</div>
									<div>
										<dt>Valor</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{currency.format(row.value)}
										</dd>
									</div>
								</dl>
								<button
									className={`${inventorySecondaryButtonClass} mt-4 w-full`}
									onClick={() => onSelect(row)}
									type="button"
								>
									<Eye aria-hidden="true" size={15} />
									Ver detalle
								</button>
							</article>
						))}
					</div>
				</>
			) : (
				<InventoryEmpty
					action={
						<a
							className={inventoryPrimaryButtonClass}
							href="/inventory?view=catalog"
						>
							Abrir catálogo
						</a>
					}
					description="Crea materiales y registra el primer movimiento para comenzar a controlar existencias."
					icon={PackageOpen}
					title="No hay existencias registradas"
				/>
			)}
		</InventoryPanel>
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
						href="/inventory?view=movement"
					>
						Registrar movimiento
					</a>
				</div>
			</section>
		</div>
	);
}
