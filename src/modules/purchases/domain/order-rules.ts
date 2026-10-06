/**
 * Reglas compartidas entre Compras y Finanzas sobre el ciclo de una orden.
 * Viven en el dominio para que el servicio (que las hace cumplir) y la
 * interfaz (que las explica antes de que el usuario lo intente) no diverjan.
 */

export type OrderLifecycleSnapshot = {
	status: "DRAFT" | "ISSUED" | "PARTIAL" | "RECEIVED" | "CANCELED";
	/** Facturas válidas registradas en Finanzas contra la orden. */
	validInvoiceCount: number;
	/** Verdadero si algún renglón ya tiene cantidad recibida en bodega. */
	hasReceipts: boolean;
};

/** Devuelve por qué no se puede anular la orden, o null si sí se puede. */
export function purchaseOrderCancelBlocker(
	order: OrderLifecycleSnapshot,
): string | null {
	if (order.status === "CANCELED") return "La orden ya está anulada.";
	if (
		order.status === "PARTIAL" ||
		order.status === "RECEIVED" ||
		order.hasReceipts
	) {
		return "La orden ya tiene material recibido en bodega; no se puede anular.";
	}
	if (order.validInvoiceCount > 0) {
		return order.validInvoiceCount === 1
			? "La orden ya tiene una factura registrada en Finanzas; anularla dejaría ese gasto sin orden de respaldo."
			: `La orden ya tiene ${order.validInvoiceCount} facturas registradas en Finanzas; anularla dejaría esos gastos sin orden de respaldo.`;
	}
	return null;
}

/**
 * Finanzas solo registra facturas, gastos y abonos de compras vinculadas a un
 * proyecto. Una compra general (solo bodega) se controla en Inventario.
 */
export function purchaseOrderTracksFinance(order: {
	projectId: string | null;
}) {
	return Boolean(order.projectId);
}

/**
 * Relación de una orden con el presupuesto del proyecto:
 * - WAREHOUSE: compra de bodega; no consume presupuesto al comprarse, el costo
 *   llega al proyecto cuando el material sale de bodega.
 * - BUDGETED: viene de un requerimiento cuyos renglones están ligados a partidas.
 * - MIXED: viene de un requerimiento con algún renglón fuera de presupuesto.
 * - OUTSIDE: compra directa para un proyecto, sin requerimiento ni partida.
 */
export type PurchaseBudgetScope =
	| "WAREHOUSE"
	| "BUDGETED"
	| "MIXED"
	| "OUTSIDE";

export function purchaseOrderBudgetScope(order: {
	projectId: string | null;
	requisitionId: string | null;
	items: Array<{ outsideBudget: boolean }>;
}): PurchaseBudgetScope {
	if (!order.projectId) return "WAREHOUSE";
	if (!order.requisitionId) return "OUTSIDE";
	return order.items.some((item) => item.outsideBudget) ? "MIXED" : "BUDGETED";
}

export const purchaseBudgetScopeLabels: Record<PurchaseBudgetScope, string> = {
	WAREHOUSE: "Stock de bodega",
	BUDGETED: "Dentro de presupuesto",
	MIXED: "Parcialmente fuera de presupuesto",
	OUTSIDE: "Fuera de presupuesto",
};
