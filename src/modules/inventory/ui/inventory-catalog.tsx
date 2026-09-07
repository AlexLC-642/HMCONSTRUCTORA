"use client";

import {
	Boxes,
	CircleDollarSign,
	Cog,
	Edit3,
	Hammer,
	Library,
	type LucideIcon,
	MapPin,
	PackageOpen,
	Plus,
	Search,
	Wrench,
	Warehouse as WarehouseIcon,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";
import {
	createInventoryMaterialAction,
	createWarehouseAction,
	updateInventoryMaterialAction,
} from "../application/actions";
import type { getInventoryCatalog } from "../application/queries";
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

type Catalog = Awaited<ReturnType<typeof getInventoryCatalog>>;
type Material = Catalog["materials"][number];
type Params = Record<string, string | string[] | undefined>;

const currency = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const number = new Intl.NumberFormat("es-GT", { maximumFractionDigits: 2 });

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}
function resourceTypeLabel(value: Material["resourceType"]) {
	if (value === "TOOL") return "Herramienta";
	if (value === "EQUIPMENT") return "Equipo";
	return "Material";
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

export function InventoryCatalog({
	data,
	params,
}: {
	data: Catalog;
	params: Params;
}) {
	const [dialog, setDialog] = useState<
		"material" | "warehouse" | Material | null
	>(null);
	const view =
		first(params.catalog) === "warehouses" ? "warehouses" : "materials";
	const stockValue = data.warehouses.reduce(
		(sum, warehouse) => sum + warehouse.stats.value,
		0,
	);

	useEffect(() => {
		function close(event: KeyboardEvent) {
			if (event.key === "Escape") setDialog(null);
		}
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, []);

	return (
		<div className="space-y-5">
			<InventoryPanel>
				<InventorySectionHeader
					action={
						<div className="flex flex-wrap gap-2">
							<button
								className={inventoryPrimaryButtonClass}
								onClick={() => setDialog("material")}
								type="button"
							>
								<Plus aria-hidden="true" size={17} />
								Nuevo recurso
							</button>
							<button
								className={inventorySecondaryButtonClass}
								onClick={() => setDialog("warehouse")}
								type="button"
							>
								<Plus aria-hidden="true" size={17} />
								Nueva bodega
							</button>
						</div>
					}
					description="Materiales consumibles, herramientas, equipos y sus ubicaciones."
					icon={Library}
					title="Catálogo"
				/>
				<nav
					aria-label="Secciones del catálogo"
					className="inventory-scrollbar flex gap-1 overflow-x-auto px-4 py-3 sm:px-5"
				>
					<a
						aria-current={view === "materials" ? "page" : undefined}
						className="inventory-catalog-tab focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition"
						href={href(params, { catalog: "materials", page: "1" })}
					>
						<Boxes aria-hidden="true" size={16} />
						Recursos
					</a>
					<a
						aria-current={view === "warehouses" ? "page" : undefined}
						className="inventory-catalog-tab focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition"
						href={href(params, { catalog: "warehouses", page: "1" })}
					>
						<WarehouseIcon aria-hidden="true" size={16} />
						Bodegas
					</a>
				</nav>
			</InventoryPanel>

			<section
				aria-label="Resumen del catálogo"
				className="kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
			>
				<InventoryMetric
					detail={`${data.resourceCounts.TOOL ?? 0} herramientas`}
					icon={Boxes}
					label="Recursos"
					tone="graphite"
					value={data.activeMaterials + data.inactiveMaterials}
				/>
				<InventoryMetric
					detail={`${data.resourceCounts.EQUIPMENT ?? 0} equipos`}
					icon={Wrench}
					label="Activos"
					tone="green"
					value={data.activeMaterials}
				/>
				<InventoryMetric
					detail="ubicaciones registradas"
					icon={WarehouseIcon}
					label="Bodegas"
					tone="blue"
					value={data.warehouses.length}
				/>
				<InventoryMetric
					detail="existencias acumuladas"
					icon={CircleDollarSign}
					label="Valor en catálogo"
					tone="amber"
					value={currency.format(stockValue)}
				/>
			</section>

			{view === "materials" ? (
				<Materials data={data} params={params} onEdit={setDialog} />
			) : (
				<Warehouses data={data} params={params} />
			)}
			{dialog === "material" ? (
				<CatalogDrawer
					icon={PackageOpen}
					subtitle="Nuevo registro"
					title="Crear recurso"
					onClose={() => setDialog(null)}
				>
					<MaterialForm onClose={() => setDialog(null)} />
				</CatalogDrawer>
			) : null}
			{dialog === "warehouse" ? (
				<CatalogDrawer
					icon={WarehouseIcon}
					subtitle="Nueva ubicación"
					title="Crear bodega"
					onClose={() => setDialog(null)}
				>
					<WarehouseForm onClose={() => setDialog(null)} />
				</CatalogDrawer>
			) : null}
			{dialog && typeof dialog !== "string" ? (
				<CatalogDrawer
					icon={Edit3}
					subtitle={dialog.code}
					title="Editar recurso"
					onClose={() => setDialog(null)}
				>
					<MaterialForm material={dialog} onClose={() => setDialog(null)} />
				</CatalogDrawer>
			) : null}
		</div>
	);
}

function Materials({
	data,
	params,
	onEdit,
}: {
	data: Catalog;
	params: Params;
	onEdit: (material: Material) => void;
}) {
	const query = first(params.q) ?? "";
	const status = first(params.status) ?? "";
	const unit = first(params.unit) ?? "";
	const resourceType = first(params.resourceType) ?? "";

	return (
		<InventoryPanel>
			<nav
				aria-label="Tipos de recurso"
				className="inventory-scrollbar flex gap-2 overflow-x-auto border-b border-[#dde2de] px-4 py-3"
			>
				{[
					["", "Todos", Boxes],
					["MATERIAL", "Materiales", PackageOpen],
					["TOOL", "Herramientas", Hammer],
					["EQUIPMENT", "Equipos", Wrench],
				].map(([value, label, Icon]) => (
					<a
						aria-current={resourceType === value ? "page" : undefined}
						className="inventory-catalog-tab focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold"
						href={href(params, {
							resourceType: String(value),
							page: "1",
						})}
						key={String(value)}
					>
						<Icon aria-hidden="true" size={16} />
						{String(label)}
					</a>
				))}
			</nav>
			<AutoFilterForm
				action="/inventory"
				className="grid gap-2 border-b border-[#dde2de] p-3 sm:p-4 md:grid-cols-[minmax(220px,1fr)_165px_165px]"
			>
				<input name="view" type="hidden" value="catalog" />
				<input name="catalog" type="hidden" value="materials" />
				<input name="resourceType" type="hidden" value={resourceType} />
				<label className="relative">
					<span className="sr-only">Buscar por código o material</span>
					<Search
						aria-hidden="true"
						className="absolute left-3.5 top-3.5 text-[#6d7974]"
						size={18}
					/>
					<input
						className={`${inventoryInputClass} pl-10`}
						defaultValue={query}
						name="q"
						placeholder="Código o nombre del material"
						type="text"
					/>
				</label>
				<label>
					<span className="sr-only">Filtrar por estado</span>
					<select
						className={inventoryInputClass}
						defaultValue={status}
						name="status"
					>
						<option value="">Todos los estados</option>
						<option value="active">Activos</option>
						<option value="inactive">Inactivos</option>
					</select>
				</label>
				<label>
					<span className="sr-only">Filtrar por unidad</span>
					<select
						className={inventoryInputClass}
						defaultValue={unit}
						name="unit"
					>
						<option value="">Todas las unidades</option>
						{data.unitsCatalog.map((item) => (
							<option key={item}>{item}</option>
						))}
					</select>
				</label>
			</AutoFilterForm>
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e1e5e1] px-4 py-3 sm:px-5">
				<div>
					<h2 className="font-bold">Materiales</h2>
					<p className="text-xs text-[#68746f]">
						{data.totalMaterials} resultados · catálogo de recursos
					</p>
				</div>
			</div>
			{data.materials.length ? (
				<>
					<div className="inventory-scrollbar hidden overflow-x-auto md:block">
						<table className="inventory-table w-full min-w-[1000px] text-sm">
							<thead>
								<tr>
									{[
										"Código",
										"Recurso",
										"Tipo",
										"Unidad",
										"Costo base",
										"Stock mínimo",
										"Stock total",
										"Bodegas",
										"Estado",
										"Acción",
									].map((heading) => (
										<th key={heading}>{heading}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.materials.map((material) => (
									<tr key={material.id}>
										<td className="font-bold">{material.code}</td>
										<td className="font-bold">{material.name}</td>
										<td>{resourceTypeLabel(material.resourceType)}</td>
										<td>{material.unit}</td>
										<td className="tabular-nums">
											{currency.format(material.unitCost)}
										</td>
										<td className="tabular-nums">
											{number.format(material.minimumStock)}
										</td>
										<td className="font-semibold tabular-nums">
											{number.format(material.stats.total)}
										</td>
										<td className="tabular-nums">
											{material.stats.warehouseCount}
										</td>
										<td>
											<MaterialStatus material={material} />
										</td>
										<td>
											<button
												aria-label={`Editar ${material.name}`}
												className={inventorySecondaryButtonClass}
												onClick={() => onEdit(material)}
												type="button"
											>
												<Edit3 aria-hidden="true" size={15} />
												Editar
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="grid gap-3 p-3 md:hidden">
						{data.materials.map((material) => (
							<article
								className="rounded-2xl bg-[#f3f5f1] p-4 shadow-[inset_0_0_0_1px_rgba(48,62,56,0.08)]"
								key={material.id}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<strong className="block truncate">{material.name}</strong>
										<p className="mt-0.5 text-xs text-[#68746f]">
											{material.code} ·{" "}
											{resourceTypeLabel(material.resourceType)} ·{" "}
											{material.unit}
										</p>
									</div>
									<MaterialStatus material={material} />
								</div>
								<dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-[#68746f]">
									<div>
										<dt>Stock</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{number.format(material.stats.total)}
										</dd>
									</div>
									<div>
										<dt>Mínimo</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{number.format(material.minimumStock)}
										</dd>
									</div>
									<div>
										<dt>Costo</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{currency.format(material.unitCost)}
										</dd>
									</div>
								</dl>
								<button
									className={`${inventorySecondaryButtonClass} mt-4 w-full`}
									onClick={() => onEdit(material)}
									type="button"
								>
									<Edit3 aria-hidden="true" size={15} />
									Editar recurso
								</button>
							</article>
						))}
					</div>
					<Pagination data={data} params={params} />
				</>
			) : (
				<InventoryEmpty
					description="Prueba con otros filtros o crea el primer material del catálogo."
					icon={PackageOpen}
					title="No se encontraron materiales"
				/>
			)}
		</InventoryPanel>
	);
}

function Warehouses({ data, params }: { data: Catalog; params: Params }) {
	return (
		<InventoryPanel>
			<InventorySectionHeader
				description={`${data.warehouses.length} ${data.warehouses.length === 1 ? "ubicación registrada" : "ubicaciones registradas"}.`}
				icon={WarehouseIcon}
				title="Bodegas"
			/>
			{data.warehouses.length ? (
				<>
					<div className="inventory-scrollbar hidden overflow-x-auto md:block">
						<table className="inventory-table w-full min-w-[900px] text-sm">
							<thead>
								<tr>
									{[
										"Código",
										"Bodega",
										"Ubicación",
										"Materiales",
										"Existencia",
										"Valor",
										"Alertas",
										"Acción",
									].map((heading) => (
										<th key={heading}>{heading}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.warehouses.map((warehouse) => (
									<tr key={warehouse.id}>
										<td className="font-bold">{warehouse.code}</td>
										<td className="font-bold">{warehouse.name}</td>
										<td className="text-[#66736e]">
											{warehouse.location ?? "Sin ubicación"}
										</td>
										<td className="tabular-nums">
											{warehouse.stats.materialCount}
										</td>
										<td className="tabular-nums">
											{number.format(warehouse.stats.total)}
										</td>
										<td className="font-semibold tabular-nums">
											{currency.format(warehouse.stats.value)}
										</td>
										<td>
											{warehouse.stats.alerts ? (
												<InventoryStatus tone="warning">
													{warehouse.stats.alerts} alertas
												</InventoryStatus>
											) : (
												<InventoryStatus tone="success">
													Sin alertas
												</InventoryStatus>
											)}
										</td>
										<td>
											<a
												className={inventorySecondaryButtonClass}
												href={href(params, {
													view: "stock",
													warehouseId: warehouse.id,
													catalog: "",
												})}
											>
												<Boxes aria-hidden="true" size={15} />
												Ver stock
											</a>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="grid gap-3 p-3 md:hidden">
						{data.warehouses.map((warehouse) => (
							<article
								className="rounded-2xl bg-[#f3f5f1] p-4 shadow-[inset_0_0_0_1px_rgba(48,62,56,0.08)]"
								key={warehouse.id}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<strong>{warehouse.name}</strong>
										<p className="mt-0.5 text-xs text-[#68746f]">
											{warehouse.code}
										</p>
									</div>
									{warehouse.stats.alerts ? (
										<InventoryStatus tone="warning">
											{warehouse.stats.alerts} alertas
										</InventoryStatus>
									) : (
										<InventoryStatus tone="success">
											Sin alertas
										</InventoryStatus>
									)}
								</div>
								<p className="mt-3 flex items-center gap-1.5 text-sm text-[#5f6c67]">
									<MapPin aria-hidden="true" size={14} />
									{warehouse.location ?? "Sin ubicación"}
								</p>
								<dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-[#68746f]">
									<div>
										<dt>Materiales</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{warehouse.stats.materialCount}
										</dd>
									</div>
									<div>
										<dt>Existencia</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{number.format(warehouse.stats.total)}
										</dd>
									</div>
									<div>
										<dt>Valor</dt>
										<dd className="mt-1 font-bold text-[#202a28]">
											{currency.format(warehouse.stats.value)}
										</dd>
									</div>
								</dl>
								<a
									className={`${inventorySecondaryButtonClass} mt-4 w-full`}
									href={href(params, {
										view: "stock",
										warehouseId: warehouse.id,
										catalog: "",
									})}
								>
									<Boxes aria-hidden="true" size={15} />
									Ver stock
								</a>
							</article>
						))}
					</div>
				</>
			) : (
				<InventoryEmpty
					description="Crea una bodega para comenzar a ubicar y controlar materiales."
					icon={WarehouseIcon}
					title="No hay bodegas registradas"
				/>
			)}
		</InventoryPanel>
	);
}

function MaterialStatus({ material }: { material: Material }) {
	if (!material.active)
		return <InventoryStatus tone="neutral">Inactivo</InventoryStatus>;
	if (material.stats.low)
		return <InventoryStatus tone="warning">Bajo mínimo</InventoryStatus>;
	return <InventoryStatus tone="success">Disponible</InventoryStatus>;
}

function CatalogDrawer({
	title,
	subtitle,
	icon: Icon,
	children,
	onClose,
}: {
	title: string;
	subtitle: string;
	icon: LucideIcon;
	children: React.ReactNode;
	onClose: () => void;
}) {
	return (
		<div className="inventory-drawer-backdrop inventory-modal-backdrop">
			<button
				aria-label="Cerrar formulario"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				type="button"
			/>
			<section
				aria-labelledby="catalog-dialog-title"
				aria-modal="true"
				className="inventory-modal"
				role="dialog"
			>
				<div className="inventory-commandbar inventory-modal__header px-5 py-5">
					<div className="relative z-10 flex items-start justify-between gap-4">
						<div className="flex min-w-0 items-start gap-3">
							<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#cf2032] text-white shadow-[0_10px_24px_rgba(200,32,47,0.26)]">
								<Icon aria-hidden="true" size={20} strokeWidth={1.8} />
							</span>
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#bdc8c3]">
									{subtitle}
								</p>
								<h2
									className="mt-1 text-xl font-bold text-white"
									id="catalog-dialog-title"
								>
									{title}
								</h2>
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
				<div className="inventory-modal__body inventory-scrollbar p-5">
					{children}
				</div>
			</section>
		</div>
	);
}

function MaterialForm({
	material,
	onClose,
}: {
	material?: Material;
	onClose: () => void;
}) {
	const action = material
		? updateInventoryMaterialAction
		: createInventoryMaterialAction;
	const [resourceType, setResourceType] = useState<Material["resourceType"]>(
		material?.resourceType ?? "MATERIAL",
	);
	const [trackIndividually, setTrackIndividually] = useState(
		material?.trackIndividually ?? false,
	);
	const resourceConfig = {
		MATERIAL: {
			label: "Material consumible",
			detail: "Se compra, almacena y consume por cantidad.",
			icon: PackageOpen,
			nameLabel: "Nombre del material",
			namePlaceholder: "Ej. Tubería PVC 3/4 pulg.",
			specLabel: "Presentación o especificación",
			specPlaceholder: "Ej. Tramo de 6 m, presión 160 PSI",
			unitLabel: "Unidad de control",
			unitPlaceholder: "metro, saco, galón, unidad",
			minimumLabel: "Stock mínimo",
			costLabel: "Costo unitario base",
		},
		TOOL: {
			label: "Herramienta",
			detail: "Se asigna a una persona y debe devolverse.",
			icon: Hammer,
			nameLabel: "Nombre de la herramienta",
			namePlaceholder: "Ej. Taladro percutor 1/2 pulg.",
			specLabel: "Medida o características",
			specPlaceholder: "Ej. 850 W, mandril 1/2 pulg., 110 V",
			unitLabel: "Unidad de inventario",
			unitPlaceholder: "unidad",
			minimumLabel: "Disponibilidad mínima",
			costLabel: "Costo de reposición",
		},
		EQUIPMENT: {
			label: "Equipo o maquinaria",
			detail: "Activo durable con marca, modelo y responsable.",
			icon: Cog,
			nameLabel: "Nombre del equipo",
			namePlaceholder: "Ej. Mezcladora de concreto 1 saco",
			specLabel: "Capacidad o ficha técnica",
			specPlaceholder: "Ej. Tambor 350 L, motor 6.5 HP",
			unitLabel: "Unidad de inventario",
			unitPlaceholder: "unidad",
			minimumLabel: "Disponibilidad mínima",
			costLabel: "Valor de adquisición",
		},
	} as const;
	const config = resourceConfig[resourceType];
	return (
		<form action={action} className="grid gap-4">
			{material ? <input name="id" type="hidden" value={material.id} /> : null}
			<div className="grid gap-1.5">
				<span className={inventoryLabelClass}>Código</span>
				<div className="flex min-h-12 items-center rounded-xl bg-[#e9ede9] px-3.5 text-sm font-semibold text-[#57645f]">
					{material?.code ?? "Se asignará al guardar"}
				</div>
			</div>
			<fieldset className="grid gap-2">
				<legend className={inventoryLabelClass}>Tipo de recurso</legend>
				<input name="resourceType" type="hidden" value={resourceType} />
				<div className="grid gap-2 sm:grid-cols-3">
					{Object.entries(resourceConfig).map(([value, option]) => {
						const TypeIcon = option.icon;
						const active = resourceType === value;
						return (
							<button
								aria-pressed={active}
								className={`focus-ring rounded-xl px-3 py-3 text-left transition ${
									active
										? "bg-[#172225] text-white shadow-[0_10px_24px_rgba(23,34,37,0.18)]"
										: "bg-[#eef2ef] text-[#26312f] hover:bg-[#e3e9e5]"
								}`}
								key={value}
								onClick={() => {
									setResourceType(value as Material["resourceType"]);
									setTrackIndividually(value !== "MATERIAL");
								}}
								type="button"
							>
								<TypeIcon aria-hidden="true" size={18} />
								<strong className="mt-2 block text-sm">{option.label}</strong>
								<small
									className={`mt-1 block leading-4 ${active ? "text-[#c8d1ce]" : "text-[#65716c]"}`}
								>
									{option.detail}
								</small>
							</button>
						);
					})}
				</div>
			</fieldset>
			<div className="rounded-xl bg-[#f7f1e8] px-4 py-3 text-sm leading-5 text-[#6d4b16]">
				<strong>{config.label}:</strong> {config.detail}
			</div>
			<label className="grid gap-1.5">
				<span className={inventoryLabelClass}>{config.nameLabel}</span>
				<input
					className={inventoryInputClass}
					name="name"
					defaultValue={material?.name}
					placeholder={config.namePlaceholder}
					required
				/>
			</label>
			<label className="grid gap-1.5">
				<span className={inventoryLabelClass}>{config.specLabel}</span>
				<input
					className={inventoryInputClass}
					defaultValue={material?.specification ?? ""}
					name="specification"
					placeholder={config.specPlaceholder}
				/>
			</label>
			<div className="grid gap-4 sm:grid-cols-2">
				<label className="grid gap-1.5">
					<span className={inventoryLabelClass}>Marca</span>
					<input
						className={inventoryInputClass}
						defaultValue={material?.brand ?? ""}
						name="brand"
						placeholder="Opcional"
					/>
				</label>
				{resourceType !== "MATERIAL" ? (
					<label className="grid gap-1.5">
						<span className={inventoryLabelClass}>
							Modelo o serie comercial
						</span>
						<input
							className={inventoryInputClass}
							defaultValue={material?.model ?? ""}
							name="model"
							placeholder="Opcional"
						/>
					</label>
				) : (
					<div className="hidden sm:block" />
				)}
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<label className="grid gap-1.5">
					<span className={inventoryLabelClass}>{config.unitLabel}</span>
					<input
						className={inventoryInputClass}
						name="unit"
						defaultValue={material?.unit}
						placeholder={config.unitPlaceholder}
						required
					/>
				</label>
				<label className="grid gap-1.5">
					<span className={inventoryLabelClass}>{config.costLabel}</span>
					<input
						className={inventoryInputClass}
						min="0"
						name="unitCost"
						step="0.01"
						type="number"
						defaultValue={material?.unitCost ?? 0}
					/>
				</label>
			</div>
			<label className="grid gap-1.5">
				<span className={inventoryLabelClass}>{config.minimumLabel}</span>
				<input
					className={inventoryInputClass}
					min="0"
					name="minimumStock"
					step="0.01"
					type="number"
					defaultValue={material?.minimumStock ?? 0}
				/>
			</label>
			{resourceType !== "MATERIAL" ? (
				<label className="flex items-start gap-3 rounded-xl bg-[#edf2ee] p-3.5 text-sm font-semibold text-[#26312f]">
					<input
						checked={trackIndividually}
						className="mt-0.5 size-4 accent-[#c8202f]"
						name="trackIndividually"
						onChange={(event) => setTrackIndividually(event.target.checked)}
						type="checkbox"
					/>
					<span>
						Control individual
						<small className="mt-1 block font-normal text-[#68746f]">
							Permite identificar quién lo tiene y cuándo debe devolverlo.
						</small>
					</span>
				</label>
			) : null}
			<label className="grid gap-1.5">
				<span className={inventoryLabelClass}>
					Notas{" "}
					<span className="normal-case tracking-normal text-[#74807b]">
						(opcional)
					</span>
				</span>
				<textarea
					className={inventoryTextareaClass}
					name="notes"
					defaultValue={material?.notes ?? ""}
					placeholder="Especificaciones o uso habitual"
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
				<button className={inventoryPrimaryButtonClass} type="submit">
					{material ? "Guardar cambios" : "Crear recurso"}
				</button>
			</div>
		</form>
	);
}

function WarehouseForm({ onClose }: { onClose: () => void }) {
	return (
		<form action={createWarehouseAction} className="grid gap-4">
			<div className="grid gap-1.5">
				<span className={inventoryLabelClass}>Código</span>
				<div className="flex min-h-12 items-center rounded-xl bg-[#e9ede9] px-3.5 text-sm font-semibold text-[#57645f]">
					Se asignará al guardar
				</div>
			</div>
			<label className="grid gap-1.5">
				<span className={inventoryLabelClass}>Nombre de la bodega</span>
				<input
					className={inventoryInputClass}
					name="name"
					placeholder="Ej. Bodega central"
					required
				/>
			</label>
			<label className="grid gap-1.5">
				<span className={inventoryLabelClass}>
					Ubicación{" "}
					<span className="normal-case tracking-normal text-[#74807b]">
						(opcional)
					</span>
				</span>
				<input
					className={inventoryInputClass}
					name="location"
					placeholder="Dirección o referencia"
				/>
			</label>
			<label className="grid gap-1.5">
				<span className={inventoryLabelClass}>
					Notas{" "}
					<span className="normal-case tracking-normal text-[#74807b]">
						(opcional)
					</span>
				</span>
				<textarea
					className={inventoryTextareaClass}
					name="notes"
					placeholder="Responsable, horario o indicaciones"
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
				<button className={inventoryPrimaryButtonClass} type="submit">
					Crear bodega
				</button>
			</div>
		</form>
	);
}

function Pagination({ data, params }: { data: Catalog; params: Params }) {
	const pageSize = first(params.pageSize) ?? "25";
	return (
		<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1e5e1] px-4 py-3 text-xs font-medium text-[#68746f]">
			<span>
				Página {data.page} de {data.totalPages}
			</span>
			<div className="flex items-center gap-2">
				<select
					aria-label="Materiales por página"
					className="h-9 rounded-xl border border-[#cbd2ce] bg-white px-2"
					defaultValue={pageSize}
					onChange={(event) => {
						window.location.href = href(params, {
							pageSize: event.target.value,
							page: "1",
						});
					}}
				>
					<option>25</option>
					<option>50</option>
					<option>100</option>
				</select>
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
