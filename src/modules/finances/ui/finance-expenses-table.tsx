"use client";

import { Fragment, useMemo, useState } from "react";
import type { DocumentPreviewData } from "@/modules/documents/application/queries";
import { ExpenseDocumentControl } from "./expense-document-control";
import {
	EmptyRow,
	formatDate,
	matches,
	money,
	ResultMeta,
	SearchField,
	SelectField,
} from "./finance-table-kit";

export type FinanceExpenseRow = {
	id: string;
	date: string;
	description: string;
	type: string | null;
	supplier: string | null;
	quantity: number;
	unit: string | null;
	subtotal: number;
	status: string;
	documentNumber: string | null;
	group: string;
};

const quantityFormat = new Intl.NumberFormat("es-GT", {
	maximumFractionDigits: 2,
});

export function FinanceExpensesTable({
	rows,
	documentPreviews,
	canRegister,
	projectId,
}: {
	rows: FinanceExpenseRow[];
	documentPreviews: Record<string, DocumentPreviewData>;
	canRegister: boolean;
	projectId: string;
}) {
	const [query, setQuery] = useState("");
	const [group, setGroup] = useState("");
	const [status, setStatus] = useState("VALID");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [grouped, setGrouped] = useState(true);

	const groups = useMemo(
		() =>
			Array.from(new Set(rows.map((row) => row.group))).sort((a, b) =>
				a.localeCompare(b, "es", { numeric: true }),
			),
		[rows],
	);
	const filtered = rows.filter(
		(row) =>
			matches(
				query,
				row.description,
				row.supplier,
				row.documentNumber,
				row.type,
			) &&
			(!group || row.group === group) &&
			(status === "ALL" || row.status === status) &&
			(!from || row.date.slice(0, 10) >= from) &&
			(!to || row.date.slice(0, 10) <= to),
	);
	const isFiltered = Boolean(
		query || group || status !== "VALID" || from || to,
	);
	const voidCount = rows.filter((row) => row.status === "VOID").length;
	// Default view hides voided expenses; say so instead of a confusing count.
	const note =
		!isFiltered && voidCount > 0
			? `${filtered.length} ${filtered.length === 1 ? "gasto válido" : "gastos válidos"} · ${voidCount} ${voidCount === 1 ? "anulado oculto" : "anulados ocultos"}`
			: undefined;
	const validTotal = filtered
		.filter((row) => row.status === "VALID")
		.reduce((sum, row) => sum + row.subtotal, 0);
	const sections = grouped
		? groups
				.map(
					(name) =>
						[name, filtered.filter((row) => row.group === name)] as const,
				)
				.filter(([, items]) => items.length > 0)
		: [["", filtered] as const];
	const reset = () => {
		setQuery("");
		setGroup("");
		setStatus("VALID");
		setFrom("");
		setTo("");
	};
	const columns = grouped ? 7 : 8;

	return (
		<div>
			<div className="fin-toolbar">
				<SearchField
					label="Buscar"
					onChange={setQuery}
					placeholder="Descripción, proveedor o comprobante…"
					value={query}
				/>
				<SelectField label="Renglón o etapa" onChange={setGroup} value={group}>
					<option value="">Todos</option>
					{groups.map((name) => (
						<option key={name} value={name}>
							{name}
						</option>
					))}
				</SelectField>
				<SelectField label="Estado" onChange={setStatus} value={status}>
					<option value="VALID">Válidos</option>
					<option value="VOID">Anulados</option>
					<option value="ALL">Todos</option>
				</SelectField>
				<label className="fin-field">
					<span>Desde</span>
					<input
						className="fin-input"
						max={to || undefined}
						onChange={(event) => setFrom(event.target.value)}
						type="date"
						value={from}
					/>
				</label>
				<label className="fin-field">
					<span>Hasta</span>
					<input
						className="fin-input"
						min={from || undefined}
						onChange={(event) => setTo(event.target.value)}
						type="date"
						value={to}
					/>
				</label>
				<label className="fin-toggle">
					<input
						checked={grouped}
						onChange={(event) => setGrouped(event.target.checked)}
						type="checkbox"
					/>
					Agrupar por renglón
				</label>
				<ResultMeta
					filtered={isFiltered}
					note={note}
					noun={["gasto", "gastos"]}
					onReset={reset}
					shown={filtered.length}
					total={rows.length}
				/>
			</div>
			<div className="fin-table-wrap">
				<table className="fin-table fin-table--stack">
					<thead>
						<tr>
							<th>Fecha</th>
							<th>Descripción</th>
							<th>Proveedor</th>
							{grouped ? null : <th>Renglón o etapa</th>}
							<th className="num">Cantidad</th>
							<th>UM</th>
							<th className="num">Subtotal</th>
							<th>Comprobante</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<EmptyRow
								colSpan={columns}
								emptyText="Aún no hay gastos registrados en este proyecto."
								filtered={isFiltered}
							/>
						) : (
							sections.map(([name, items]) => (
								<Fragment key={name || "all"}>
									{grouped ? (
										<tr className="fin-group">
											<td colSpan={columns}>
												<span className="fin-group__label">{name}</span>
											</td>
										</tr>
									) : null}
									{items.map((row) => (
										<tr
											className={row.status === "VOID" ? "is-void" : undefined}
											key={row.id}
										>
											<td className="nowrap" data-label="Fecha">
												{formatDate(row.date)}
											</td>
											<td className="fin-row-title">
												<span className="fin-strike strong">
													{row.description}
												</span>
												{row.status === "VOID" ? (
													<span
														className="fin-badge fin-badge--neutral"
														style={{ marginLeft: 8 }}
													>
														Anulado
													</span>
												) : null}
												{row.type ? <small>{row.type}</small> : null}
											</td>
											<td data-label="Proveedor">{row.supplier ?? "—"}</td>
											{grouped ? null : (
												<td data-label="Renglón">{row.group}</td>
											)}
											<td className="num" data-label="Cantidad">
												{row.quantity > 0
													? quantityFormat.format(row.quantity)
													: "—"}
											</td>
											<td data-label="UM">{row.unit ?? "—"}</td>
											<td className="num strong" data-label="Subtotal">
												<span className="fin-strike">
													{money.format(row.subtotal)}
												</span>
											</td>
											<td data-label="Comprobante">
												<ExpenseDocumentControl
													canRegister={canRegister}
													document={documentPreviews[row.id] ?? null}
													documentNumber={row.documentNumber}
													expenseId={row.id}
													projectId={projectId}
												/>
											</td>
										</tr>
									))}
									{grouped ? (
										<tr className="fin-subtotal">
											<td colSpan={columns - 2}>Subtotal {name}</td>
											<td className="num">
												{money.format(
													items
														.filter((row) => row.status === "VALID")
														.reduce((sum, row) => sum + row.subtotal, 0),
												)}
											</td>
											<td />
										</tr>
									) : null}
								</Fragment>
							))
						)}
					</tbody>
					{filtered.length > 0 ? (
						<tfoot>
							<tr>
								<td colSpan={columns - 2}>
									{isFiltered
										? "Total de gastos válidos filtrados"
										: "Total de gastos válidos"}
								</td>
								<td className="num">{money.format(validTotal)}</td>
								<td />
							</tr>
						</tfoot>
					) : null}
				</table>
			</div>
		</div>
	);
}
