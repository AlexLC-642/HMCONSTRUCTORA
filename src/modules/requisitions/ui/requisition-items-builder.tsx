"use client";

import { Boxes, PackagePlus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type {
	ActivityOption,
	MaterialOption,
	MaterialPlan,
} from "./requisition-material-picker";

type ResourceType = "MATERIAL" | "TOOL" | "EQUIPMENT";

type DraftItem = {
	id: number;
	resourceType: ResourceType;
	materialId: string;
	description: string;
	unit: string;
	quantity: string;
	estimatedCost: string;
	budgetLineItemId: string;
	outsideBudget: boolean;
	outsideBudgetReason: string;
	scheduleActivityId: string;
	catalogNewMaterial: boolean;
	minimumStock: string;
	specification: string;
	brand: string;
	model: string;
	trackIndividually: boolean;
	itemNotes: string;
};

const resourceLabels: Record<ResourceType, string> = {
	MATERIAL: "Material",
	TOOL: "Herramienta",
	EQUIPMENT: "Equipo",
};

function emptyItem(id: number): DraftItem {
	return {
		id,
		resourceType: "MATERIAL",
		materialId: "",
		description: "",
		unit: "",
		quantity: "1",
		estimatedCost: "0",
		budgetLineItemId: "",
		outsideBudget: false,
		outsideBudgetReason: "",
		scheduleActivityId: "",
		catalogNewMaterial: false,
		minimumStock: "0",
		specification: "",
		brand: "",
		model: "",
		trackIndividually: false,
		itemNotes: "",
	};
}

export function RequisitionItemsBuilder({
	activities,
	budgetMaterials,
	materials,
	projectEnabled,
}: {
	activities: ActivityOption[];
	budgetMaterials: MaterialPlan[];
	materials: MaterialOption[];
	projectEnabled: boolean;
}) {
	const [nextId, setNextId] = useState(2);
	const [items, setItems] = useState<DraftItem[]>([emptyItem(1)]);

	function update(id: number, values: Partial<DraftItem>) {
		setItems((current) =>
			current.map((item) => {
				if (item.id !== id) return item;
				// Cambiar el tipo de recurso de ESTE renglón invalida el material
				// que tenía elegido (el catálogo disponible cambia con el tipo).
				if (values.resourceType) return { ...item, ...values, materialId: "" };
				return { ...item, ...values };
			}),
		);
	}

	function addItem() {
		setItems((current) => [...current, emptyItem(nextId)]);
		setNextId((current) => current + 1);
	}

	function removeItem(id: number) {
		setItems((current) => current.filter((item) => item.id !== id));
	}

	const payload = useMemo(
		() =>
			items.map(({ id: _id, ...item }) => {
				const selected = materials.find(
					(material) => material.id === item.materialId,
				);
				return {
					...item,
					resourceType: selected?.resourceType ?? item.resourceType,
					description: selected?.name ?? item.description,
					unit: selected?.unit ?? item.unit,
					estimatedCost: selected?.unitCost ?? item.estimatedCost,
					budgetLineItemId: projectEnabled ? item.budgetLineItemId : "",
					scheduleActivityId: projectEnabled ? item.scheduleActivityId : "",
				};
			}),
		[items, materials, projectEnabled],
	);

	return (
		<div className="requisition-items-builder">
			<input
				name="items"
				readOnly
				type="hidden"
				value={JSON.stringify(payload)}
			/>
			<div className="requisition-items-builder__heading">
				<div>
					<h3>Recursos solicitados</h3>
					<p>
						Agrega todos los renglones del mismo tipo que pertenecen a esta
						solicitud.
					</p>
				</div>
				<span>
					{items.length} {items.length === 1 ? "renglón" : "renglones"}
				</span>
			</div>

			<div className="requisition-items-builder__list">
				{items.map((item, index) => {
					const selected = materials.find(
						(material) => material.id === item.materialId,
					);
					const availableMaterials = materials.filter(
						(material) => material.resourceType === item.resourceType,
					);
					return (
						<section className="requisition-line" key={item.id}>
							<header className="requisition-line__header">
								<span className="requisition-line__number">{index + 1}</span>
								<div>
									<strong>
										{selected?.name || item.description || "Nuevo recurso"}
									</strong>
									<small>
										Completa el recurso, la cantidad y su costo estimado.
									</small>
								</div>
								{items.length > 1 ? (
									<button
										aria-label={`Eliminar renglón ${index + 1}`}
										className="requisition-line__remove focus-ring"
										onClick={() => removeItem(item.id)}
										type="button"
									>
										<Trash2 aria-hidden="true" size={16} />
									</button>
								) : null}
							</header>

							<div className="requisition-line__grid">
								<label>
									<span className="requisitions-field-label">Tipo</span>
									<select
										className="requisitions-input"
										onChange={(event) =>
											update(item.id, {
												resourceType: event.target.value as ResourceType,
												materialId: "",
											})
										}
										value={item.resourceType}
									>
										{Object.entries(resourceLabels).map(([value, label]) => (
											<option key={value} value={value}>
												{label}
											</option>
										))}
									</select>
								</label>
								<label className="requisition-line__resource">
									<span className="requisitions-field-label">
										Recurso del catálogo
									</span>
									<select
										className="requisitions-input"
										onChange={(event) =>
											update(item.id, { materialId: event.target.value })
										}
										value={item.materialId}
									>
										<option value="">Registrar uno nuevo</option>
										{availableMaterials.map((material) => (
											<option key={material.id} value={material.id}>
												{material.code} · {material.name} ({material.unit})
											</option>
										))}
									</select>
								</label>

								{selected ? (
									<div className="requisition-line__selected">
										<Boxes aria-hidden="true" size={17} />
										<span>
											<strong>{selected.name}</strong>
											<small>
												{selected.code} · {selected.unit} · Q{" "}
												{selected.unitCost}
											</small>
										</span>
									</div>
								) : (
									<>
										<label className="requisition-line__resource">
											<span className="requisitions-field-label">
												Nombre específico
											</span>
											<input
												className="requisitions-input"
												onChange={(event) =>
													update(item.id, { description: event.target.value })
												}
												placeholder="Ej. Tubería PVC de 3/4"
												required
												value={item.description}
											/>
										</label>
										<label>
											<span className="requisitions-field-label">Unidad</span>
											<input
												className="requisitions-input"
												onChange={(event) =>
													update(item.id, { unit: event.target.value })
												}
												placeholder="U, m, m², saco"
												required
												value={item.unit}
											/>
										</label>
									</>
								)}

								<label>
									<span className="requisitions-field-label">Cantidad</span>
									<input
										className="requisitions-input"
										min="0.01"
										onChange={(event) =>
											update(item.id, { quantity: event.target.value })
										}
										required
										step="0.01"
										type="number"
										value={item.quantity}
									/>
								</label>
								<label>
									<span className="requisitions-field-label">
										Costo unitario estimado
									</span>
									<input
										className="requisitions-input"
										disabled={Boolean(selected)}
										min="0"
										onChange={(event) =>
											update(item.id, { estimatedCost: event.target.value })
										}
										step="0.01"
										type="number"
										value={selected?.unitCost ?? item.estimatedCost}
									/>
								</label>

								{projectEnabled ? (
									<>
										<label className="requisition-line__resource">
											<span className="requisitions-field-label">
												Control presupuestario
											</span>
											<select
												className="requisitions-input"
												onChange={(event) =>
													update(item.id, {
														budgetLineItemId: event.target.value,
														outsideBudget: false,
														outsideBudgetReason: "",
													})
												}
												disabled={item.outsideBudget}
												value={item.budgetLineItemId}
											>
												<option value="">Seleccionar partida</option>
												{budgetMaterials.map((plan) => (
													<option key={plan.id} value={plan.budgetLineItemId}>
														{plan.name} · {plan.pending} {plan.unit} pendientes
													</option>
												))}
											</select>
										</label>
										<div className="requisition-line__budget-control">
											<label className="requisition-line__check">
												<input
													checked={item.outsideBudget}
													onChange={(event) =>
														update(item.id, {
															outsideBudget: event.target.checked,
															budgetLineItemId: "",
														})
													}
													type="checkbox"
												/>
												<span>
													<strong>Fuera de presupuesto</strong>
													<small>
														Se autorizará como una excepción trazable.
													</small>
												</span>
											</label>
											{item.outsideBudget ? (
												<textarea
													className="requisitions-textarea"
													minLength={10}
													onChange={(event) =>
														update(item.id, {
															outsideBudgetReason: event.target.value,
														})
													}
													placeholder="Motivo, necesidad e impacto esperado"
													required
													value={item.outsideBudgetReason}
												/>
											) : null}
										</div>
										<label className="requisition-line__resource">
											<span className="requisitions-field-label">
												Actividad del cronograma (opcional)
											</span>
											<select
												className="requisitions-input"
												onChange={(event) =>
													update(item.id, {
														scheduleActivityId: event.target.value,
													})
												}
												value={item.scheduleActivityId}
											>
												<option value="">Sin actividad relacionada</option>
												{activities.map((activity) => (
													<option key={activity.id} value={activity.id}>
														{activity.code} · {activity.description}
													</option>
												))}
											</select>
										</label>
									</>
								) : null}

								{!selected ? (
									<div className="requisition-line__catalog">
										<label className="requisition-line__check">
											<input
												checked={item.catalogNewMaterial}
												onChange={(event) =>
													update(item.id, {
														catalogNewMaterial: event.target.checked,
													})
												}
												type="checkbox"
											/>
											<span>
												<strong>Guardar en el catálogo</strong>
												<small>
													Quedará disponible para futuras solicitudes.
												</small>
											</span>
										</label>
										{item.catalogNewMaterial ? (
											<div className="requisition-line__details">
												<input
													className="requisitions-input"
													onChange={(event) =>
														update(item.id, {
															specification: event.target.value,
														})
													}
													placeholder="Especificación"
													value={item.specification}
												/>
												<input
													className="requisitions-input"
													onChange={(event) =>
														update(item.id, { brand: event.target.value })
													}
													placeholder="Marca"
													value={item.brand}
												/>
												<input
													className="requisitions-input"
													onChange={(event) =>
														update(item.id, { model: event.target.value })
													}
													placeholder="Modelo"
													value={item.model}
												/>
												<input
													className="requisitions-input"
													min="0"
													onChange={(event) =>
														update(item.id, {
															minimumStock: event.target.value,
														})
													}
													placeholder="Stock mínimo"
													step="0.01"
													type="number"
													value={item.minimumStock}
												/>
											</div>
										) : null}
									</div>
								) : null}

								<label className="requisition-line__resource">
									<span className="requisitions-field-label">
										Nota del renglón (opcional)
									</span>
									<input
										className="requisitions-input"
										onChange={(event) =>
											update(item.id, { itemNotes: event.target.value })
										}
										placeholder="Presentación, proveedor sugerido o detalle de entrega"
										value={item.itemNotes}
									/>
								</label>
							</div>
						</section>
					);
				})}
			</div>

			<button
				className="requisition-items-builder__add focus-ring"
				onClick={addItem}
				type="button"
			>
				<Plus aria-hidden="true" size={17} />
				Agregar otro recurso
			</button>
			<div className="requisition-items-builder__finance-note">
				<PackagePlus aria-hidden="true" size={17} />
				<p>
					<strong>La factura no se captura aquí.</strong> Al confirmar la
					compra, el número y la imagen del comprobante se completan únicamente
					en Finanzas.
				</p>
			</div>
		</div>
	);
}
