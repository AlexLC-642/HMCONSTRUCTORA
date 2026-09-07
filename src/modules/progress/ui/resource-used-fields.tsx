"use client";

import { HardHat, PackageCheck, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

export type LaborFieldRow = {
	rowKey: string;
	workerLabel: string;
	role: string;
	people: string;
	hours: string;
	rate: string;
	notes: string;
};

export type MaterialFieldRow = {
	rowKey: string;
	materialId: string;
	warehouseId: string;
	materialName: string;
	warehouse: string;
	quantityUsed: string;
	unit: string;
	wasteQuantity: string;
	returnedQuantity: string;
	activityCode: string;
	notes: string;
};

type ResourcesUsedFieldsProps = {
	initialLabor: LaborFieldRow[];
	initialMaterials: MaterialFieldRow[];
	resources: Array<{ id: string; code: string; name: string; unit: string }>;
	warehouses: Array<{ id: string; code: string; name: string }>;
	activities: Array<{ value: string; label: string }>;
};

const inputClass =
	"focus-ring h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";
const numberInputClass = `${inputClass} text-right tabular-nums`;
const labelClass = "grid gap-1 text-sm";
const labelTextClass =
	"text-[11px] font-semibold uppercase text-[var(--muted)]";

function blankLaborRow(index: number): LaborFieldRow {
	return {
		rowKey: `new-labor-${Date.now()}-${index}`,
		workerLabel: "",
		role: "",
		people: "",
		hours: "",
		rate: "",
		notes: "",
	};
}

function blankMaterialRow(index: number): MaterialFieldRow {
	return {
		rowKey: `new-material-${Date.now()}-${index}`,
		materialId: "",
		warehouseId: "",
		materialName: "",
		warehouse: "",
		quantityUsed: "",
		unit: "",
		wasteQuantity: "",
		returnedQuantity: "",
		activityCode: "",
		notes: "",
	};
}

function usefulLaborRows(rows: LaborFieldRow[]) {
	const useful = rows.filter(
		(row) =>
			row.workerLabel ||
			row.role ||
			row.people ||
			row.hours ||
			row.rate ||
			row.notes,
	);
	return useful.length ? useful : [blankLaborRow(0)];
}

function usefulMaterialRows(rows: MaterialFieldRow[]) {
	const useful = rows.filter(
		(row) =>
			row.materialId ||
			row.materialName ||
			row.warehouse ||
			row.quantityUsed ||
			row.unit ||
			row.wasteQuantity ||
			row.returnedQuantity ||
			row.activityCode ||
			row.notes,
	);
	return useful.length ? useful : [blankMaterialRow(0)];
}

export function ResourcesUsedFields({
	initialLabor,
	initialMaterials,
	resources,
	warehouses,
	activities,
}: ResourcesUsedFieldsProps) {
	const [laborRows, setLaborRows] = useState(() =>
		usefulLaborRows(initialLabor),
	);
	const [materialRows, setMaterialRows] = useState(() =>
		usefulMaterialRows(initialMaterials),
	);

	function updateMaterialRow(
		index: number,
		changes: Partial<MaterialFieldRow>,
	) {
		setMaterialRows((rows) =>
			rows.map((row, rowIndex) =>
				rowIndex === index ? { ...row, ...changes } : row,
			),
		);
	}

	return (
		<section className="grid gap-5 p-5 xl:grid-cols-[0.82fr_1.18fr]">
			<input name="laborCount" type="hidden" value={laborRows.length} />
			<input name="materialCount" type="hidden" value={materialRows.length} />

			<div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_16px_38px_rgba(31,42,45,0.08)]">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[#fbfbf8] px-5 py-4">
					<div className="flex items-center gap-3">
						<span className="grid size-10 place-items-center rounded-xl bg-[#edf9f2] text-[var(--success)]">
							<HardHat aria-hidden="true" size={19} />
						</span>
						<div>
							<h2 className="text-lg font-semibold">Personal</h2>
							<p className="text-sm text-[var(--muted)]">
								Registra cuadrilla solo cuando aplique.
							</p>
						</div>
					</div>
					<button
						className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
						type="button"
						onClick={() =>
							setLaborRows((rows) => [...rows, blankLaborRow(rows.length)])
						}
					>
						<Plus aria-hidden="true" size={15} />
						Agregar
					</button>
				</div>
				<div className="space-y-3 p-5">
					{laborRows.map((row, index) => (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-12"
							initial={{ opacity: 0, y: 8 }}
							key={row.rowKey}
							transition={{ duration: 0.18 }}
						>
							<label className={`${labelClass} lg:col-span-4`}>
								<span className={labelTextClass}>Cuadrilla o responsable</span>
								<input
									className={inputClass}
									name={`laborEntries.${index}.workerLabel`}
									defaultValue={row.workerLabel}
									placeholder="Ej. Cuadrilla albañiles"
								/>
							</label>
							<label className={`${labelClass} lg:col-span-3`}>
								<span className={labelTextClass}>Puesto</span>
								<input
									className={inputClass}
									name={`laborEntries.${index}.role`}
									defaultValue={row.role}
									placeholder="Albañil, ayudante"
								/>
							</label>
							<label className={`${labelClass} lg:col-span-2`}>
								<span className={labelTextClass}>Personas</span>
								<input
									className={numberInputClass}
									min="0"
									name={`laborEntries.${index}.people`}
									defaultValue={row.people}
									inputMode="decimal"
									placeholder="0"
									step="0.01"
									type="number"
								/>
							</label>
							<label className={`${labelClass} lg:col-span-2`}>
								<span className={labelTextClass}>Horas</span>
								<input
									className={numberInputClass}
									min="0"
									name={`laborEntries.${index}.hours`}
									defaultValue={row.hours}
									inputMode="decimal"
									placeholder="0"
									step="0.01"
									type="number"
								/>
							</label>
							<button
								aria-label="Quitar personal"
								className="focus-ring mt-5 grid size-10 place-items-center rounded-lg border border-[var(--border)] bg-white text-[var(--muted)] transition hover:border-[#f1b6ba] hover:bg-[#fff1f1] hover:text-[var(--brand-red)] lg:col-span-1"
								type="button"
								onClick={() =>
									setLaborRows((rows) =>
										rows.length > 1
											? rows.filter((_, rowIndex) => rowIndex !== index)
											: rows,
									)
								}
							>
								<Trash2 aria-hidden="true" size={16} />
							</button>
							<input
								name={`laborEntries.${index}.rate`}
								type="hidden"
								value={row.rate}
							/>
							<label className={`${labelClass} lg:col-span-12`}>
								<span className={labelTextClass}>Nota</span>
								<input
									className={inputClass}
									name={`laborEntries.${index}.notes`}
									defaultValue={row.notes}
									placeholder="Trabajo asignado o comentario breve."
								/>
							</label>
						</motion.div>
					))}
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_16px_38px_rgba(31,42,45,0.08)]">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[#fbfbf8] px-5 py-4">
					<div className="flex items-center gap-3">
						<span className="grid size-10 place-items-center rounded-xl bg-[#fff8e8] text-[#9b6800]">
							<PackageCheck aria-hidden="true" size={19} />
						</span>
						<div>
							<h2 className="text-lg font-semibold">Materiales usados</h2>
							<p className="text-sm text-[var(--muted)]">
								Material, cantidad y origen usado en la jornada.
							</p>
						</div>
					</div>
					<button
						className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
						type="button"
						onClick={() =>
							setMaterialRows((rows) => [
								...rows,
								blankMaterialRow(rows.length),
							])
						}
					>
						<Plus aria-hidden="true" size={15} />
						Agregar
					</button>
				</div>
				<div className="space-y-3 p-5">
					{materialRows.map((row, index) => (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-12"
							initial={{ opacity: 0, y: 8 }}
							key={row.rowKey}
							transition={{ duration: 0.18 }}
						>
							<label className={`${labelClass} lg:col-span-4`}>
								<span className={labelTextClass}>Material del inventario</span>
								<select
									className={inputClass}
									name={`materialEntries.${index}.materialId`}
									value={row.materialId}
									onChange={(event) => {
										const resource = resources.find(
											(item) => item.id === event.target.value,
										);
										updateMaterialRow(index, {
											materialId: event.target.value,
											materialName: resource?.name ?? "",
											unit: resource?.unit ?? "",
										});
									}}
								>
									<option value="">Seleccionar material</option>
									{resources.map((resource) => (
										<option key={resource.id} value={resource.id}>
											{resource.code} · {resource.name}
										</option>
									))}
								</select>
								<input
									name={`materialEntries.${index}.materialName`}
									type="hidden"
									value={row.materialName}
								/>
							</label>
							<label className={`${labelClass} lg:col-span-2`}>
								<span className={labelTextClass}>Cantidad</span>
								<input
									className={numberInputClass}
									min="0"
									name={`materialEntries.${index}.quantityUsed`}
									defaultValue={row.quantityUsed}
									inputMode="decimal"
									placeholder="0"
									step="0.01"
									type="number"
								/>
							</label>
							<label className={`${labelClass} lg:col-span-2`}>
								<span className={labelTextClass}>Unidad</span>
								<input
									className={inputClass}
									name={`materialEntries.${index}.unit`}
									placeholder="Se completa con el material"
									readOnly
									value={row.unit}
								/>
							</label>
							<label className={`${labelClass} lg:col-span-3`}>
								<span className={labelTextClass}>Bodega de salida</span>
								<select
									className={inputClass}
									name={`materialEntries.${index}.warehouseId`}
									value={row.warehouseId}
									onChange={(event) => {
										const warehouse = warehouses.find(
											(item) => item.id === event.target.value,
										);
										updateMaterialRow(index, {
											warehouseId: event.target.value,
											warehouse: warehouse?.name ?? "",
										});
									}}
								>
									<option value="">Seleccionar bodega</option>
									{warehouses.map((warehouse) => (
										<option key={warehouse.id} value={warehouse.id}>
											{warehouse.code} · {warehouse.name}
										</option>
									))}
								</select>
								<input
									name={`materialEntries.${index}.warehouse`}
									type="hidden"
									value={row.warehouse}
								/>
							</label>
							<button
								aria-label="Quitar material"
								className="focus-ring mt-5 grid size-10 place-items-center rounded-lg border border-[var(--border)] bg-white text-[var(--muted)] transition hover:border-[#f1b6ba] hover:bg-[#fff1f1] hover:text-[var(--brand-red)] lg:col-span-1"
								type="button"
								onClick={() =>
									setMaterialRows((rows) =>
										rows.length > 1
											? rows.filter((_, rowIndex) => rowIndex !== index)
											: rows,
									)
								}
							>
								<Trash2 aria-hidden="true" size={16} />
							</button>
							<input
								name={`materialEntries.${index}.wasteQuantity`}
								type="hidden"
								value={row.wasteQuantity}
							/>
							<input
								name={`materialEntries.${index}.returnedQuantity`}
								type="hidden"
								value={row.returnedQuantity}
							/>
							<label className={`${labelClass} lg:col-span-3`}>
								<span className={labelTextClass}>Actividad</span>
								<select
									className={inputClass}
									name={`materialEntries.${index}.activityCode`}
									defaultValue={row.activityCode}
								>
									<option value="">Uso general</option>
									{activities.map((activity) => (
										<option key={activity.value} value={activity.value}>
											{activity.label}
										</option>
									))}
								</select>
							</label>
							<label className={`${labelClass} lg:col-span-9`}>
								<span className={labelTextClass}>Nota</span>
								<input
									className={inputClass}
									name={`materialEntries.${index}.notes`}
									defaultValue={row.notes}
									placeholder="Uso especifico, factura, recibo o comentario breve."
								/>
							</label>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
