export const wasteReasonValues = [
	"CUTTING_SURPLUS",
	"BREAKAGE",
	"DAMAGE",
	"EXPIRATION",
	"LOSS",
	"THEFT",
	"OTHER",
] as const;

export type WasteReasonValue = (typeof wasteReasonValues)[number];

export const wasteReasonLabels: Record<WasteReasonValue, string> = {
	CUTTING_SURPLUS: "Corte o sobrante",
	BREAKAGE: "Rotura",
	DAMAGE: "Daño",
	EXPIRATION: "Vencimiento",
	LOSS: "Pérdida",
	THEFT: "Posible robo",
	OTHER: "Otro",
};

export type WasteReviewTrigger =
	| "HIGH_VALUE"
	| "LOSS_OR_THEFT"
	| "CONTROLLED_RESOURCE"
	| "REQUESTED_BY_USER";

export const wasteReviewTriggerLabels: Record<WasteReviewTrigger, string> = {
	HIGH_VALUE: "Valor superior al límite de control",
	LOSS_OR_THEFT: "Pérdida o posible robo",
	CONTROLLED_RESOURCE: "Herramienta o equipo controlado",
	REQUESTED_BY_USER: "Revisión solicitada al registrar",
};

type WasteReviewPolicyInput = {
	reason: WasteReasonValue;
	resourceType: "MATERIAL" | "TOOL" | "EQUIPMENT";
	totalCost: number;
	reviewAmountThreshold: number;
	requestedByUser: boolean;
};

export function evaluateWasteReview(
	input: WasteReviewPolicyInput,
): WasteReviewTrigger[] {
	const triggers: WasteReviewTrigger[] = [];
	if (input.totalCost >= input.reviewAmountThreshold) {
		triggers.push("HIGH_VALUE");
	}
	if (input.reason === "LOSS" || input.reason === "THEFT") {
		triggers.push("LOSS_OR_THEFT");
	}
	if (input.resourceType === "TOOL" || input.resourceType === "EQUIPMENT") {
		triggers.push("CONTROLLED_RESOURCE");
	}
	if (input.requestedByUser) triggers.push("REQUESTED_BY_USER");
	return triggers;
}
