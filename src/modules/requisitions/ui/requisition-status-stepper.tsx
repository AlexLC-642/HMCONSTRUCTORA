import type { RequisitionStatus } from "@prisma/client";
import { Check, Clock3, XCircle } from "lucide-react";

const visibleSteps = [
	{ id: "request", title: "Solicitud", detail: "Necesidad registrada" },
	{ id: "authorized", title: "Autorizado", detail: "Puede atenderse" },
	{ id: "fulfillment", title: "En atención", detail: "Inventario o compra" },
	{ id: "completed", title: "Completado", detail: "Recursos entregados" },
] as const;

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
					<p>La solicitud no continuará.</p>
				</div>
			</div>
		);
	}

	const currentIndex =
		status === "APPROVED"
			? 1
			: status === "PURCHASED" || (status === "RECEIVED" && !warehouseOnly)
				? 2
				: ["RECEIVED", "DELIVERED", "CLOSED"].includes(status)
					? 3
					: 0;

	return (
		<section
			aria-label="Progreso de la solicitud"
			className="requisition-progress"
		>
			<p className="requisition-progress__title">Estado de la solicitud</p>
			<ol>
				{visibleSteps.map((step, index) => {
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
							key={step.id}
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
									{state === "active" ? "Estado actual" : step.detail}
								</small>
							</div>
						</li>
					);
				})}
			</ol>
		</section>
	);
}
