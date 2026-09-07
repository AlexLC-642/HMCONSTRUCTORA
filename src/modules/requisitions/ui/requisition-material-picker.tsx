"use client";

import { CheckCircle2, PackageSearch } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

export type MaterialOption = {
	id: string;
	code: string;
	name: string;
	unit: string;
	unitCost: string;
	minimumStock: string;
	resourceType: "MATERIAL" | "TOOL" | "EQUIPMENT";
	specification: string;
	brand: string;
	model: string;
	trackIndividually: boolean;
};

export type MaterialPlan = {
	id: string;
	budgetLineItemId: string;
	projectId: string;
	name: string;
	unit: string;
	planned: number;
	requested: number;
	purchased: number;
	received: number;
	pending: number;
	unitPrice: number;
	budgetVersion: number;
	source: "budget";
};

export type ActivityOption = {
	id: string;
	code: string;
	description: string;
	projectId: string;
};

const resourceLabels = {
	MATERIAL: "Material",
	TOOL: "Herramienta",
	EQUIPMENT: "Equipo",
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid gap-1.5">
			<span className="requisitions-field-label">{label}</span>
			{children}
		</div>
	);
}

const numberFormatter = new Intl.NumberFormat("es-GT", {
	maximumFractionDigits: 2,
});

export function RequisitionMaterialPicker({
	inputClass,
	materials,
	budgetMaterials = [],
	activities = [],
}: {
	inputClass: string;
	materials: MaterialOption[];
	budgetMaterials?: MaterialPlan[];
	activities?: ActivityOption[];
}) {
	const [selectedId, setSelectedId] = useState("");
	const [selectedPlanId, setSelectedPlanId] = useState("");
	const [manualName, setManualName] = useState("");
	const [unit, setUnit] = useState("");
	const [estimatedCost, setEstimatedCost] = useState("0");
	const [catalogNewMaterial, setCatalogNewMaterial] = useState(false);
	const [resourceType, setResourceType] =
		useState<keyof typeof resourceLabels>("MATERIAL");

	const selected = useMemo(
		() => materials.find((material) => material.id === selectedId) ?? null,
		[materials, selectedId],
	);
	const selectedPlan = useMemo(
		() =>
			budgetMaterials.find((material) => material.id === selectedPlanId) ??
			null,
		[budgetMaterials, selectedPlanId],
	);

	function selectMaterial(nextId: string) {
		setSelectedId(nextId);
		const material = materials.find((item) => item.id === nextId);
		if (material) {
			setUnit(material.unit);
			setEstimatedCost(material.unitCost);
			setResourceType(material.resourceType);
			setManualName("");
			setCatalogNewMaterial(false);
			return;
		}
		setUnit("");
		setEstimatedCost("0");
	}

	function applyBudgetSuggestion(nextId: string) {
		setSelectedPlanId(nextId);
	}

	return (
		<div className="grid gap-4">
			<input
				name="budgetLineItemId"
				readOnly
				type="hidden"
				value={selectedPlan?.budgetLineItemId ?? ""}
			/>
			{budgetMaterials.length > 0 ? (
				<Field label="Partida del presupuesto (referencia)">
					<select
						className={inputClass}
						onChange={(event) => applyBudgetSuggestion(event.target.value)}
						value={selectedPlanId}
					>
						<option value="">Sin partida relacionada</option>
						{budgetMaterials.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name} · {numberFormatter.format(item.pending)} {item.unit}{" "}
								pendientes
							</option>
						))}
					</select>
				</Field>
			) : (
				<div className="requisitions-plan-empty">
					Este proyecto no tiene partidas en un presupuesto aprobado. Aun puedes
					solicitar un recurso específico del catálogo.
				</div>
			)}

			{selectedPlan ? (
				<div className="requisitions-plan-summary">
					<div className="requisitions-plan-summary__heading">
						<div>
							<p className="font-semibold text-[#111719]">
								{selectedPlan.name}
							</p>
							<p className="mt-1 text-xs text-[#61706a]">
								Presupuesto v{selectedPlan.budgetVersion} · {selectedPlan.unit}
							</p>
						</div>
						<span className="requisitions-plan-summary__pending">
							{numberFormatter.format(selectedPlan.pending)} pendientes
						</span>
					</div>
					<div className="requisitions-plan-grid">
						<span>
							<small>Presupuestado</small>
							<strong>{numberFormatter.format(selectedPlan.planned)}</strong>
						</span>
						<span>
							<small>Solicitado</small>
							<strong>{numberFormatter.format(selectedPlan.requested)}</strong>
						</span>
						<span>
							<small>Comprado</small>
							<strong>{numberFormatter.format(selectedPlan.purchased)}</strong>
						</span>
						<span>
							<small>Recibido</small>
							<strong>{numberFormatter.format(selectedPlan.received)}</strong>
						</span>
					</div>
					<p className="mt-3 text-xs leading-5 text-[#52605b]">
						Esta partida solo explica dónde se usará la compra. No se registrará
						como material, herramienta ni equipo.
					</p>
				</div>
			) : null}

			<div className="grid gap-3 sm:grid-cols-2">
				<Field label="Tipo de recurso">
					<select
						className={inputClass}
						disabled={Boolean(selected)}
						onChange={(event) => {
							setResourceType(
								event.target.value as keyof typeof resourceLabels,
							);
							setSelectedId("");
						}}
						value={resourceType}
					>
						{Object.entries(resourceLabels).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
					<input name="resourceType" type="hidden" value={resourceType} />
				</Field>
				<Field label="Actividad del cronograma (opcional)">
					<select className={inputClass} name="scheduleActivityId">
						<option value="">Sin actividad relacionada</option>
						{activities.map((activity) => (
							<option key={activity.id} value={activity.id}>
								{activity.code} · {activity.description}
							</option>
						))}
					</select>
				</Field>
			</div>

			<Field label="Recurso específico del catálogo">
				<div className="requisitions-input-with-icon">
					<PackageSearch
						aria-hidden="true"
						className="requisitions-input-with-icon__icon"
						size={17}
					/>
					<select
						className={`${inputClass} requisitions-input--with-icon`}
						name="materialId"
						onChange={(event) => selectMaterial(event.target.value)}
						value={selectedId}
					>
						<option value="">Registrar un recurso nuevo</option>
						{materials
							.filter((material) => material.resourceType === resourceType)
							.map((material) => (
								<option key={material.id} value={material.id}>
									{material.code} - {material.name} ({material.unit})
								</option>
							))}
					</select>
				</div>
			</Field>

			{selected ? (
				<div className="requisitions-selected overflow-hidden p-0">
					<div className="flex items-start justify-between gap-3 border-b border-emerald-200/70 bg-emerald-50/70 p-4">
						<div className="flex items-start gap-3">
						<span className="requisitions-selected__icon">
							<CheckCircle2 aria-hidden="true" size={17} />
						</span>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-[#101416]">
								{selected.name}
							</p>
							<div className="mt-1 flex flex-wrap gap-2 text-[#26312f]">
								<span className="requisitions-tag">{selected.code}</span>
								<span className="requisitions-tag">{selected.unit}</span>
							</div>
						</div>
						</div>
						<span className="requisitions-tag shrink-0">Datos cargados</span>
					</div>
					<div className="grid gap-3 p-4 sm:grid-cols-2">
						<div className="sm:col-span-2"><span className="requisitions-field-label">Recurso seleccionado</span><div className="mt-1.5 rounded-lg border border-[#d5dcd6] bg-white px-3 py-2.5 text-sm font-medium">{selected.name}</div></div>
						<div><span className="requisitions-field-label">Unidad</span><div className="mt-1.5 rounded-lg border border-[#d5dcd6] bg-white px-3 py-2.5 text-sm">{selected.unit || "Sin unidad"}</div></div>
						<div><span className="requisitions-field-label">Costo unitario</span><div className="mt-1.5 rounded-lg border border-[#d5dcd6] bg-white px-3 py-2.5 text-sm tabular-nums">Q {numberFormatter.format(Number(selected.unitCost || 0))}</div></div>
						{selected.specification ? <div className="sm:col-span-2"><span className="requisitions-field-label">Especificación</span><div className="mt-1.5 rounded-lg border border-[#d5dcd6] bg-white px-3 py-2.5 text-sm">{selected.specification}</div></div> : null}
						{selected.brand || selected.model ? <div className="sm:col-span-2 grid grid-cols-2 gap-3"><div><span className="requisitions-field-label">Marca</span><div className="mt-1.5 rounded-lg border border-[#d5dcd6] bg-white px-3 py-2.5 text-sm">{selected.brand || "No indicada"}</div></div><div><span className="requisitions-field-label">Modelo</span><div className="mt-1.5 rounded-lg border border-[#d5dcd6] bg-white px-3 py-2.5 text-sm">{selected.model || "No indicado"}</div></div></div> : null}
						{selected.resourceType !== "MATERIAL" ? <div className="sm:col-span-2 rounded-lg bg-[#eef2ee] px-3 py-2 text-xs text-[#53615c]">Control: {selected.trackIndividually ? "asignación y devolución individual" : "control por existencias"}.</div> : null}
					</div>
					<input
						name="description"
						readOnly
						type="hidden"
						value={selected.name}
					/>
					<input name="unit" readOnly type="hidden" value={selected.unit} />
					<input
						name="estimatedCost"
						readOnly
						type="hidden"
						value={selected.unitCost}
					/>
					<input
						name="minimumStock"
						readOnly
						type="hidden"
						value={selected.minimumStock}
					/>
				</div>
			) : (
				<>
					<Field
						label={`Nombre específico del ${resourceLabels[resourceType].toLowerCase()}`}
					>
						<input
							className={inputClass}
							name="description"
							onChange={(event) => setManualName(event.target.value)}
							placeholder={
								resourceType === "MATERIAL"
									? "Ej. Tubería PVC 3/4 pulg."
									: resourceType === "TOOL"
										? "Ej. Carretilla reforzada"
										: "Ej. Mezcladora de concreto"
							}
							required
							value={manualName}
						/>
					</Field>
					<div className="grid gap-3 sm:grid-cols-2">
						<Field label="Unidad">
							<input
								className={inputClass}
								name="unit"
								onChange={(event) => setUnit(event.target.value)}
								placeholder="saco, m², U"
								value={unit}
							/>
						</Field>
						<Field label="Costo unitario">
							<input
								className={inputClass}
								min="0"
								name="estimatedCost"
								onChange={(event) => setEstimatedCost(event.target.value)}
								step="0.01"
								type="number"
								value={estimatedCost}
							/>
						</Field>
					</div>
				</>
			)}

			{!selected ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Especificación (opcional)">
						<input
							className={inputClass}
							name="specification"
							placeholder="Medida, capacidad o presentación"
						/>
					</Field>
					<div className="grid grid-cols-2 gap-3">
						<Field label="Marca">
							<input className={inputClass} name="brand" />
						</Field>
						<Field label="Modelo">
							<input className={inputClass} name="model" />
						</Field>
					</div>
				</div>
			) : null}

			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
				<Field label="Uso o frente de trabajo">
					<input
						className={inputClass}
						name="title"
						placeholder="Ej. Muros del nivel 1"
						required
					/>
				</Field>
				<Field label="Cantidad solicitada">
					<input
						className={inputClass}
						min="0.01"
						name="quantity"
						required
						step="0.01"
						type="number"
					/>
				</Field>
			</div>

			{!selected ? (
				<div className="requisitions-checkbox-card">
					<label className="flex items-start gap-3 text-sm font-semibold text-[#101416]">
						<input
							checked={catalogNewMaterial}
							className="mt-1 size-4 accent-[var(--brand-red)]"
							name="catalogNewMaterial"
							onChange={(event) => setCatalogNewMaterial(event.target.checked)}
							type="checkbox"
						/>
						<span>Agregar este recurso al catálogo de inventario</span>
					</label>
					{catalogNewMaterial ? (
						<div className="mt-2 grid gap-3 sm:grid-cols-2">
							<Field label="Existencia mínima">
								<input
									className={inputClass}
									defaultValue="0"
									min="0"
									name="minimumStock"
									step="0.01"
									type="number"
								/>
							</Field>
							{resourceType !== "MATERIAL" ? (
								<label className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#101416]">
									<input
										className="size-4 accent-[var(--brand-red)]"
										name="trackIndividually"
										type="checkbox"
									/>
									Controlar cada unidad por separado
								</label>
							) : null}
						</div>
					) : (
						<input name="minimumStock" readOnly type="hidden" value="0" />
					)}
				</div>
			) : null}
		</div>
	);
}
