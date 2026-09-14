"use client";

import { HardHat, PackageCheck, PackageOpen, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

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
	resources: Array<{
		id: string;
		code: string;
		name: string;
		unit: string;
		warehouseId: string;
		warehouseCode: string;
		warehouseName: string;
		delivered: number;
		available: number;
	}>;
	activities: Array<{ value: string; label: string }>;
};

const inputClass = "progress-resource-input focus-ring";
const numberInputClass = `${inputClass} text-right tabular-nums`;
const labelClass = "grid min-w-0 content-start gap-1.5 text-sm";
const labelTextClass = "progress-resource-label";

function blankLaborRow(index: number): LaborFieldRow {
	return {
		rowKey: `new-labor-${index}`,
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
		rowKey: `new-material-${index}`,
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
	activities,
}: ResourcesUsedFieldsProps) {
	const [laborRows, setLaborRows] = useState(() =>
		usefulLaborRows(initialLabor),
	);
	const [materialRows, setMaterialRows] = useState(() =>
		usefulMaterialRows(initialMaterials),
	);
	const nextLaborKey = useRef(1000);
	const nextMaterialKey = useRef(1000);

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
		<section className="progress-resources-layout">
			<input name="laborCount" type="hidden" value={laborRows.length} />
			<input name="materialCount" type="hidden" value={materialRows.length} />

			<section
				className="progress-resource-section"
				aria-labelledby="labor-heading"
			>
				<header className="progress-resource-section__header">
					<div className="progress-resource-section__heading">
						<span className="progress-resource-section__icon progress-resource-section__icon--labor">
							<HardHat aria-hidden="true" size={20} />
						</span>
						<div>
							<h2 id="labor-heading">Personal de la jornada</h2>
							<p>Registra únicamente la cuadrilla que trabajó hoy.</p>
						</div>
					</div>
					<button
						className="progress-resource-add focus-ring"
						type="button"
						onClick={() =>
							setLaborRows((rows) => [
								...rows,
								blankLaborRow(nextLaborKey.current++),
							])
						}
					>
						<Plus aria-hidden="true" size={16} />
						Agregar personal
					</button>
				</header>

				<div className="progress-resource-entries">
					{laborRows.map((row, index) => (
						<div className="progress-resource-entry" key={row.rowKey}>
							<div className="progress-labor-grid">
								<label className={labelClass}>
									<span className={labelTextClass}>
										Cuadrilla o responsable
									</span>
									<input
										className={inputClass}
										name={`laborEntries.${index}.workerLabel`}
										defaultValue={row.workerLabel}
										placeholder="Ej. Cuadrilla de albañilería"
									/>
								</label>
								<label className={labelClass}>
									<span className={labelTextClass}>Trabajo realizado</span>
									<input
										className={inputClass}
										name={`laborEntries.${index}.role`}
										defaultValue={row.role}
										placeholder="Ej. Albañilería, apoyo"
									/>
								</label>
								<label className={labelClass}>
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
								<label className={labelClass}>
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
									aria-label="Quitar registro de personal"
									className="progress-resource-remove focus-ring"
									disabled={laborRows.length === 1}
									type="button"
									onClick={() =>
										setLaborRows((rows) =>
											rows.filter((_, rowIndex) => rowIndex !== index),
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
								<label className={`${labelClass} progress-labor-note`}>
									<span className={labelTextClass}>Nota de trabajo</span>
									<input
										className={inputClass}
										name={`laborEntries.${index}.notes`}
										defaultValue={row.notes}
										placeholder="Actividad asignada, rendimiento o incidencia breve"
									/>
								</label>
							</div>
						</div>
					))}
				</div>
			</section>

			<section
				className="progress-resource-section"
				aria-labelledby="materials-heading"
			>
				<header className="progress-resource-section__header">
					<div className="progress-resource-section__heading">
						<span className="progress-resource-section__icon progress-resource-section__icon--material">
							<PackageCheck aria-hidden="true" size={20} />
						</span>
						<div>
							<h2 id="materials-heading">Movimiento de materiales</h2>
							<p>
								Declara lo usado, desperdiciado o devuelto de lo entregado a la
								obra.
							</p>
						</div>
					</div>
					<button
						className="progress-resource-add focus-ring"
						disabled={resources.length === 0}
						type="button"
						onClick={() =>
							setMaterialRows((rows) => [
								...rows,
								blankMaterialRow(nextMaterialKey.current++),
							])
						}
					>
						<Plus aria-hidden="true" size={16} />
						Agregar material
					</button>
				</header>

				{resources.length === 0 ? (
					<div className="progress-resource-empty">
						<PackageOpen aria-hidden="true" size={24} />
						<div>
							<strong>No hay materiales entregados a esta obra</strong>
							<p>
								Cuando bodega registre una entrega, aparecerá aquí para reportar
								su uso.
							</p>
						</div>
					</div>
				) : (
					<div className="progress-resource-entries">
						{materialRows.map((row, index) => {
							const selectedResource = resources.find(
								(resource) =>
									resource.id === row.materialId &&
									resource.warehouseId === row.warehouseId,
							);

							return (
								<div className="progress-resource-entry" key={row.rowKey}>
									<div className="progress-material-primary-grid">
										<label className={labelClass}>
											<span className={labelTextClass}>
												Material disponible en obra
											</span>
											<select
												className={inputClass}
												value={
													row.materialId && row.warehouseId
														? `${row.materialId}:${row.warehouseId}`
														: ""
												}
												onChange={(event) => {
													const resource = resources.find(
														(item) =>
															`${item.id}:${item.warehouseId}` ===
															event.target.value,
													);
													updateMaterialRow(index, {
														materialId: resource?.id ?? "",
														warehouseId: resource?.warehouseId ?? "",
														materialName: resource?.name ?? "",
														warehouse: resource?.warehouseName ?? "",
														unit: resource?.unit ?? "",
													});
												}}
											>
												<option value="">Seleccionar material entregado</option>
												{resources.map((resource) => (
													<option
														key={`${resource.id}:${resource.warehouseId}`}
														value={`${resource.id}:${resource.warehouseId}`}
													>
														{resource.code} · {resource.name} ·{" "}
														{resource.available.toFixed(2)} {resource.unit}
													</option>
												))}
											</select>
											{selectedResource ? (
												<small className="progress-resource-availability">
													Disponible:{" "}
													<strong>
														{selectedResource.available.toFixed(2)}{" "}
														{selectedResource.unit}
													</strong>
												</small>
											) : null}
											<input
												name={`materialEntries.${index}.materialId`}
												type="hidden"
												value={row.materialId}
											/>
											<input
												name={`materialEntries.${index}.materialName`}
												type="hidden"
												value={row.materialName}
											/>
										</label>
										<label className={labelClass}>
											<span className={labelTextClass}>Usado hoy</span>
											<input
												className={numberInputClass}
												max={selectedResource?.available}
												min="0"
												name={`materialEntries.${index}.quantityUsed`}
												defaultValue={row.quantityUsed}
												inputMode="decimal"
												placeholder="0"
												step="0.01"
												type="number"
											/>
										</label>
										<div className={labelClass}>
											<span className={labelTextClass}>Unidad</span>
											<div className="progress-resource-readonly">
												{row.unit || "—"}
											</div>
											<input
												name={`materialEntries.${index}.unit`}
												type="hidden"
												value={row.unit}
											/>
										</div>
										<div className={labelClass}>
											<span className={labelTextClass}>Bodega de origen</span>
											<div
												className="progress-resource-readonly"
												title={row.warehouse}
											>
												{row.warehouse || "Se completa al elegir"}
											</div>
											<input
												name={`materialEntries.${index}.warehouseId`}
												type="hidden"
												value={row.warehouseId}
											/>
											<input
												name={`materialEntries.${index}.warehouse`}
												type="hidden"
												value={row.warehouse}
											/>
										</div>
										<button
											aria-label="Quitar registro de material"
											className="progress-resource-remove focus-ring"
											disabled={materialRows.length === 1}
											type="button"
											onClick={() =>
												setMaterialRows((rows) =>
													rows.filter((_, rowIndex) => rowIndex !== index),
												)
											}
										>
											<Trash2 aria-hidden="true" size={16} />
										</button>
									</div>

									<div className="progress-material-secondary-grid">
										<label className={labelClass}>
											<span className={labelTextClass}>Desperdicio</span>
											<input
												className={numberInputClass}
												min="0"
												name={`materialEntries.${index}.wasteQuantity`}
												defaultValue={row.wasteQuantity}
												step="0.01"
												type="number"
											/>
										</label>
										<label className={labelClass}>
											<span className={labelTextClass}>Devuelto a bodega</span>
											<input
												className={numberInputClass}
												min="0"
												name={`materialEntries.${index}.returnedQuantity`}
												defaultValue={row.returnedQuantity}
												step="0.01"
												type="number"
											/>
										</label>
										<label className={labelClass}>
											<span className={labelTextClass}>
												Actividad relacionada
											</span>
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
										<label className={labelClass}>
											<span className={labelTextClass}>Nota de uso</span>
											<input
												className={inputClass}
												name={`materialEntries.${index}.notes`}
												defaultValue={row.notes}
												placeholder="Destino exacto, incidencia o comentario breve"
											/>
										</label>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</section>
	);
}
