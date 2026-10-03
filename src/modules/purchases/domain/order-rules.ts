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
