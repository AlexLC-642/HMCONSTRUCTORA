"use client";

import {
	Building2,
	CalendarClock,
	ClipboardCheck,
	MapPin,
	UserRound,
	Warehouse,
	X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createRequisitionAction } from "@/modules/requisitions/application/actions";
import { RequisitionItemsBuilder } from "./requisition-items-builder";
import type {
	ActivityOption,
	MaterialOption,
	MaterialPlan,
} from "./requisition-material-picker";

type ProjectOption = { id: string; code: string; name: string };
type WarehouseOption = { id: string; code: string; name: string };
type DestinationType = "PROJECT" | "WAREHOUSE";

export function RequisitionCreateDialog({
	materials,
	materialPlans,
	projects,
	requesterName,
	warehouses,
	scheduleActivities,
}: {
	materials: MaterialOption[];
	materialPlans: MaterialPlan[];
	projects: ProjectOption[];
	requesterName: string;
	warehouses: WarehouseOption[];
	scheduleActivities: ActivityOption[];
}) {
	const [destinationType, setDestinationType] =
		useState<DestinationType>("PROJECT");
	const [projectId, setProjectId] = useState("");
	const projectMaterials = materialPlans.filter(
		(material) => material.projectId === projectId,
	);
	const projectActivities = scheduleActivities.filter(
		(activity) => activity.projectId === projectId,
	);
	const projectEnabled = destinationType === "PROJECT" && Boolean(projectId);

	return (
		<div className="requisitions-modal-backdrop" role="presentation">
			<form
				action={createRequisitionAction}
				aria-labelledby="requisition-dialog-title"
				className="requisitions-modal requisitions-create-modal"
				role="dialog"
			>
				<header className="requisitions-modal__header">
					<span className="requisitions-modal__mark">
						<ClipboardCheck aria-hidden="true" size={22} />
					</span>
					<div className="min-w-0 flex-1">
						<h2
							className="text-xl font-semibold text-white"
							id="requisition-dialog-title"
						>
							Nueva solicitud de recursos
						</h2>
						<p className="mt-1 text-sm text-[#cbd3d0]">
							Define primero dónde se utilizarán y después cómo se recibirán.
						</p>
					</div>
					<Link
						aria-label="Cerrar"
						className="requisitions-modal__close focus-ring"
						href="/requisitions"
					>
						<X aria-hidden="true" size={20} />
					</Link>
				</header>

				<div className="requisitions-modal__body requisitions-create-modal__body">
					<section className="requisitions-form-section requisitions-destination-section">
						<div className="requisitions-form-section__heading">
							<MapPin aria-hidden="true" size={19} />
							<div>
								<h3>¿Dónde se utilizarán los recursos?</h3>
								<p>
									Esta elección define si habrá una salida posterior hacia una
									obra.
								</p>
							</div>
						</div>
						<input
							name="destinationType"
							type="hidden"
							value={destinationType}
						/>
						<div className="requisitions-destination-choice">
							<button
								aria-pressed={destinationType === "PROJECT"}
								className="requisitions-destination-option focus-ring"
								data-active={destinationType === "PROJECT"}
								onClick={() => setDestinationType("PROJECT")}
								type="button"
							>
								<span>
									<Building2 aria-hidden="true" size={20} />
								</span>
								<strong>Para una obra</strong>
								<small>
									Se recibe en bodega y después se entrega al proyecto.
								</small>
							</button>
							<button
								aria-pressed={destinationType === "WAREHOUSE"}
								className="requisitions-destination-option focus-ring"
								data-active={destinationType === "WAREHOUSE"}
								onClick={() => {
									setDestinationType("WAREHOUSE");
									setProjectId("");
								}}
								type="button"
							>
								<span>
									<Warehouse aria-hidden="true" size={20} />
								</span>
								<strong>Para existencia de bodega</strong>
								<small>
									Se recibe y permanece disponible en la bodega seleccionada.
								</small>
							</button>
						</div>

						<div className="requisitions-destination-fields">
							{destinationType === "PROJECT" ? (
								<label>
									<span className="requisitions-field-label">
										Proyecto de destino
									</span>
									<select
										className="requisitions-input"
										name="projectId"
										onChange={(event) => setProjectId(event.target.value)}
										required
										value={projectId}
									>
										<option value="">Seleccionar proyecto</option>
										{projects.map((project) => (
											<option key={project.id} value={project.id}>
												{project.code} · {project.name}
											</option>
										))}
									</select>
								</label>
							) : (
								<input name="projectId" type="hidden" value="" />
							)}
							<label>
								<span className="requisitions-field-label">
									Bodega de recepción
								</span>
								<select
									className="requisitions-input"
									defaultValue=""
									name="warehouseId"
									required
								>
									<option value="">Seleccionar bodega</option>
									{warehouses.map((warehouse) => (
										<option key={warehouse.id} value={warehouse.id}>
											{warehouse.code} · {warehouse.name}
										</option>
									))}
								</select>
							</label>
						</div>
						<div
							className="requisitions-route-explainer"
							data-destination={destinationType}
						>
							<Warehouse aria-hidden="true" size={17} />
							<span>Bodega de recepción</span>
							<i aria-hidden="true" />
							{destinationType === "PROJECT" ? (
								<Building2 aria-hidden="true" size={17} />
							) : (
								<Warehouse aria-hidden="true" size={17} />
							)}
							<strong>
								{destinationType === "PROJECT"
									? "Entrega al proyecto"
									: "Permanece en bodega"}
							</strong>
						</div>
					</section>

					<section className="requisitions-form-section">
						<div className="requisitions-form-section__heading">
							<CalendarClock aria-hidden="true" size={19} />
							<div>
								<h3>Datos de la solicitud</h3>
								<p>Resume el uso, la urgencia y la fecha necesaria.</p>
							</div>
						</div>
						<div className="requisitions-request-grid">
							<label className="requisitions-request-grid__title">
								<span className="requisitions-field-label">
									Motivo o frente de trabajo
								</span>
								<input
									className="requisitions-input"
									name="title"
									placeholder={
										destinationType === "PROJECT"
											? "Ej. Instalación hidráulica del nivel 1"
											: "Ej. Reposición de existencias mínimas"
									}
									required
								/>
							</label>
							<label>
								<span className="requisitions-field-label">Prioridad</span>
								<select
									className="requisitions-input"
									defaultValue="NORMAL"
									name="priority"
								>
									<option value="LOW">Baja</option>
									<option value="NORMAL">Normal</option>
									<option value="HIGH">Alta</option>
									<option value="URGENT">Urgente</option>
								</select>
							</label>
							<label>
								<span className="requisitions-field-label">Necesario para</span>
								<input
									className="requisitions-input"
									name="neededDate"
									required
									type="date"
								/>
							</label>
						</div>
						<div className="requisitions-requester mt-4">
							<span className="requisitions-requester__avatar">
								<UserRound aria-hidden="true" size={16} />
							</span>
							<div>
								<small>Solicitante</small>
								<strong>{requesterName}</strong>
							</div>
						</div>
					</section>

					{destinationType === "WAREHOUSE" || projectEnabled ? (
						<RequisitionItemsBuilder
							activities={projectActivities}
							budgetMaterials={projectMaterials}
							materials={materials}
							projectEnabled={projectEnabled}
						/>
					) : (
						<div className="requisitions-project-prompt">
							<Building2 aria-hidden="true" size={20} />
							<span>
								Selecciona el proyecto para cargar sus partidas y actividades.
							</span>
						</div>
					)}

					<label className="grid gap-1.5">
						<span className="requisitions-field-label">
							Observaciones generales (opcional)
						</span>
						<textarea
							className="requisitions-textarea"
							name="notes"
							placeholder="Condiciones de entrega, contacto o indicaciones generales"
						/>
					</label>
				</div>

				<footer className="requisitions-modal__footer">
					<p>La solicitud no registra facturas ni pagos.</p>
					<Link
						className="requisitions-modal__cancel focus-ring"
						href="/requisitions"
					>
						Cancelar
					</Link>
					<button
						className="requisitions-submit focus-ring"
						disabled={
							(destinationType === "PROJECT" && !projectId) ||
							warehouses.length === 0
						}
						type="submit"
					>
						<ClipboardCheck aria-hidden="true" size={18} />
						Crear solicitud
					</button>
				</footer>
			</form>
		</div>
	);
}
