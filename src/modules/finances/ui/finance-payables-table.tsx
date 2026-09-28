"use client";

import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import {
	EmptyRow,
	formatDate,
	matches,
	money,
	ResultMeta,
	SearchField,
} from "./finance-table-kit";
import { SupplierPaymentDialog } from "./supplier-payment-dialog";

export type PayableState = "paid" | "partial" | "pending" | "overdue";
export type FinancePayableRow = {
	id: string;
	description: string;
	documentNumber: string | null;
	orderNumber: string | null;
	supplier: string;
	dueDate: string | null;
	state: PayableState;
	subtotal: number;
	paid: number;
	pending: number;
	estimated: number | null;
	payments: Array<{ id: string; number: string; date: string; amount: number }>;
};

const stateBadge: Record<PayableState, [string, string]> = {
	paid: ["Pagado", "fin-badge--ok"],
	partial: ["Parcial", "fin-badge--warn"],
	pending: ["Pendiente", "fin-badge--neutral"],
	overdue: ["Vencida", "fin-badge--danger"],
};
const filters: Array<[string, string, (row: FinancePayableRow) => boolean]> = [
	["all", "Todas", () => true],
	["open", "Por pagar", (row) => row.pending > 0],
	["overdue", "Vencidas", (row) => row.state === "overdue"],
	["paid", "Pagadas", (row) => row.state === "paid"],
];

export function FinancePayablesTable({
	rows,
	canRegister,
	projectId,
	today,
}: {
	rows: FinancePayableRow[];
	canRegister: boolean;
	projectId: string;
	today: string;
}) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState("open");
	const [open, setOpen] = useState<string | null>(null);
	const active = filters.find(([key]) => key === filter) ?? filters[0];
	const filtered = rows.filter(
		(row) =>
			active[2](row) &&
			matches(
				query,
				row.description,
				row.supplier,
				row.documentNumber,
				row.orderNumber,
			),
	);
	const isFiltered = Boolean(query) || filter !== "all";
	const totals = filtered.reduce(
		(sum, row) => ({
			subtotal: sum.subtotal + row.subtotal,
			paid: sum.paid + row.paid,
			pending: sum.pending + row.pending,
		}),
		{ subtotal: 0, paid: 0, pending: 0 },
	);
	const columns = canRegister ? 7 : 6;

	return (
		<div>
			<div className="fin-toolbar">
				<div className="fin-field" style={{ minWidth: "auto" }}>
					<span>Mostrar</span>
					<div className="fin-chips">
						{filters.map(([key, label, test]) => (
							<button
								aria-pressed={filter === key}
								className="fin-chip"
								key={key}
								onClick={() => setFilter(key)}
								type="button"
							>
								{label}
								<small>{rows.filter(test).length}</small>
							</button>
						))}
					</div>
				</div>
				<SearchField
					label="Buscar"
					onChange={setQuery}
					placeholder="Compra, proveedor, factura u orden…"
					value={query}
				/>
				<ResultMeta
					filtered={isFiltered}
					noun={["compra", "compras"]}
					onReset={() => {
						setQuery("");
						setFilter("all");
					}}
					shown={filtered.length}
					total={rows.length}
				/>
			</div>
			<div className="fin-table-wrap">
				<table className="fin-table fin-table--stack">
					<thead>
						<tr>
							<th>Compra</th>
							<th>Proveedor</th>
							<th>Vence</th>
							<th className="num">Comprado</th>
							<th className="num">Pagado</th>
							<th className="num">Pendiente</th>
							{canRegister ? <th aria-label="Acciones" /> : null}
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<EmptyRow
								colSpan={columns}
								emptyText="Sin compras registradas en este proyecto."
								filtered={isFiltered}
							/>
						) : (
							filtered.map((row) => {
								const [badge, tone] = stateBadge[row.state];
								const expanded = open === row.id;
								return (
									<Fragment key={row.id}>
										<tr>
											<td className="fin-row-title">
												<span className="strong">{row.description}</span>
												<small>
													{[
														row.orderNumber,
														row.documentNumber ?? "Sin comprobante",
													]
														.filter(Boolean)
														.join(" · ")}
												</small>
												{row.payments.length > 0 ? (
													<button
														aria-expanded={expanded}
														className="fin-link-button"
														onClick={() => setOpen(expanded ? null : row.id)}
														style={{
															display: "inline-flex",
															alignItems: "center",
															gap: 4,
															marginTop: 6,
															padding: 0,
														}}
														type="button"
													>
														{row.payments.length === 1
															? "Ver 1 pago"
															: `Ver ${row.payments.length} pagos`}
														<ChevronDown
															aria-hidden="true"
															size={14}
															style={{
																transform: expanded
																	? "rotate(180deg)"
																	: undefined,
																transition: "transform 200ms",
															}}
														/>
													</button>
												) : null}
											</td>
											<td data-label="Proveedor">{row.supplier}</td>
											<td className="nowrap" data-label="Vence">
												{row.dueDate ? (
													formatDate(row.dueDate)
												) : (
													<span className="muted">Contado</span>
												)}
											</td>
											<td className="num" data-label="Comprado">
												{money.format(row.subtotal)}
												{row.estimated !== null ? (
													<small>Estimado {money.format(row.estimated)}</small>
												) : null}
											</td>
											<td
												className={`num ${row.paid > 0 ? "fin-money-in" : "muted"}`}
												data-label="Pagado"
											>
												{money.format(row.paid)}
											</td>
											<td className="num" data-label="Pendiente">
												<span
													className={`strong ${
														row.state === "overdue"
															? "fin-money-out"
															: row.state === "paid"
																? "fin-money-in"
																: "fin-money-warn"
													}`}
												>
													{money.format(row.pending)}
												</span>
												<small>
													<span className={`fin-badge ${tone}`}>{badge}</span>
												</small>
											</td>
											{canRegister ? (
												<td data-label="Acción">
													{row.pending > 0 ? (
														<SupplierPaymentDialog
															description={row.description}
															expenseId={row.id}
															pending={row.pending.toFixed(2)}
															projectId={projectId}
															provider={row.supplier}
															today={today}
														/>
													) : null}
												</td>
											) : null}
										</tr>
										{expanded ? (
											<tr className="fin-detail">
												<td colSpan={columns}>
													<table
														className="fin-table"
														style={{ fontSize: "0.8rem" }}
													>
														<thead>
															<tr>
																<th>Pago</th>
																<th>Fecha</th>
																<th className="num">Monto</th>
															</tr>
														</thead>
														<tbody>
															{row.payments.map((payment) => (
																<tr key={payment.id}>
																	<td>{payment.number}</td>
																	<td>{formatDate(payment.date)}</td>
																	<td className="num">
																		{money.format(payment.amount)}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</td>
											</tr>
										) : null}
									</Fragment>
								);
							})
						)}
					</tbody>
					{filtered.length > 0 ? (
						<tfoot>
							<tr>
								<td colSpan={3}>Total</td>
								<td className="num" data-label="Comprado">
									{money.format(totals.subtotal)}
								</td>
								<td className="num" data-label="Pagado">
									{money.format(totals.paid)}
								</td>
								<td className="num" data-label="Pendiente">
									{money.format(totals.pending)}
								</td>
								{canRegister ? <td /> : null}
							</tr>
						</tfoot>
					) : null}
				</table>
			</div>
		</div>
	);
}
