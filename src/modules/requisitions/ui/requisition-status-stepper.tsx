import type { RequisitionStatus } from "@prisma/client";
import { Check, Clock3, XCircle } from "lucide-react";

const projectSteps: Array<{
	status: RequisitionStatus;
	title: string;
	detail: string;
}> = [
	{
		status: "REQUESTED",
		title: "Solicitud enviada",
		detail: "Pendiente de revisión",
	},
	{ status: "REVIEWED", title: "Revisión", detail: "Información verificada" },
	{ status: "APPROVED", title: "Aprobación", detail: "Compra autorizada" },
	{ status: "PURCHASED", title: "Compra", detail: "Comprobante en Finanzas" },
	{ status: "RECEIVED", title: "Recepción", detail: "Ingreso a la bodega" },
	{ status: "DELIVERED", title: "Entrega", detail: "Salida hacia la obra" },
	{ status: "CLOSED", title: "Cierre", detail: "Proceso finalizado" },
];

export function RequisitionStatusStepper({
	status,
	warehouseOnly,
}: {
	status: RequisitionStatus;
	warehouseOnly: boolean;
}) {
	if (status === "REJECTED") {
		return (
			<div className="requisition-progress requisition-progress--rejected">
				<div className="requisition-progress__rejected-icon">
					<XCircle aria-hidden="true" size={20} />
				</div>
				<div>
					<strong>Solicitud rechazada</strong>
					<p>El proceso se detuvo antes de la recepción.</p>
				</div>
			</div>
		);
	}

	const steps = warehouseOnly
		? projectSteps.filter((step) => step.status !== "DELIVERED")
		: projectSteps;
	const currentIndex = Math.max(
		steps.findIndex((step) => step.status === status),
		0,
	);

	return (
		<section
			aria-label="Progreso del requerimiento"
			className="requisition-progress"
		>
			<p className="requisition-progress__title">Estado del requerimiento</p>
			<ol>
				{steps.map((step, index) => {
					const state =
						index < currentIndex
							? "completed"
							: index === currentIndex
								? "active"
								: "pending";
					return (
						<li
							aria-current={state === "active" ? "step" : undefined}
							data-state={state}
							key={step.status}
						>
							<span className="requisition-progress__rail" aria-hidden="true" />
							<span className="requisition-progress__circle" aria-hidden="true">
								{state === "completed" ? (
									<Check size={14} />
								) : state === "active" ? (
									<Clock3 size={14} />
								) : (
									index + 1
								)}
							</span>
							<div>
								<strong>{step.title}</strong>
								<small>
									{state === "active" ? "Etapa actual" : step.detail}
								</small>
							</div>
						</li>
					);
				})}
			</ol>
		</section>
	);
}
