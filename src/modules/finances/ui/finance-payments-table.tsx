"use client";

import { useMemo, useState } from "react";
import {
	EmptyRow,
	formatDate,
	matches,
	money,
	ResultMeta,
	SearchField,
	SelectField,
} from "./finance-table-kit";

export type FinancePaymentRow = {
	id: string;
	number: string;
	date: string;
	method: string | null;
	reference: string | null;
	concept: string | null;
	application: string;
	amount: number;
	registered: boolean;
};

export function FinancePaymentsTable({ rows }: { rows: FinancePaymentRow[] }) {
	const [query, setQuery] = useState("");
	const [application, setApplication] = useState("");
	const [method, setMethod] = useState("");
	const applications = useMemo(
		() => Array.from(new Set(rows.map((row) => row.application))),
		[rows],
	);
	const methods = useMemo(
		() =>
			Array.from(
				new Set(
					rows
						.map((row) => row.method)
						.filter((value): value is string => Boolean(value)),
				),
			),
		[rows],
	);
	const filtered = rows.filter(
		(row) =>
			matches(query, row.number, row.reference, row.concept) &&
			(!application || row.application === application) &&
			(!method || row.method === method),
	);
	const isFiltered = Boolean(query || application || method);
	const total = filtered
		.filter((row) => row.registered)
		.reduce((sum, row) => sum + row.amount, 0);

	return (
		<div>
			<div className="fin-toolbar">
				<SearchField
					label="Buscar"
					onChange={setQuery}
					placeholder="No. de abono, referencia o concepto…"
					value={query}
				/>
				<SelectField
					label="Aplicación"
					onChange={setApplication}
					value={application}
				>
					<option value="">Todas</option>
					{applications.map((value) => (
						<option key={value} value={value}>
							{value}
						</option>
					))}
				</SelectField>
				<SelectField label="Medio" onChange={setMethod} value={method}>
					<option value="">Todos</option>
					{methods.map((value) => (
						<option key={value} value={value}>
							{value}
						</option>
					))}
				</SelectField>
				<ResultMeta
					filtered={isFiltered}
					noun={["abono", "abonos"]}
					onReset={() => {
						setQuery("");
						setApplication("");
						setMethod("");
					}}
					shown={filtered.length}
					total={rows.length}
				/>
			</div>
			<div className="fin-table-wrap">
				<table className="fin-table fin-table--stack">
					<thead>
						<tr>
							<th>Abono</th>
							<th>Fecha</th>
							<th>Medio</th>
							<th>Aplicación</th>
							<th>Referencia</th>
							<th className="num">Monto</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<EmptyRow
								colSpan={6}
								emptyText="Aún no hay abonos del cliente en este proyecto."
								filtered={isFiltered}
							/>
						) : (
							filtered.map((row) => (
								<tr
									className={row.registered ? undefined : "is-void"}
									key={row.id}
								>
									<td className="fin-row-title">
										<span className="fin-strike strong">{row.number}</span>
										{row.registered ? null : (
											<span
												className="fin-badge fin-badge--neutral"
												style={{ marginLeft: 8 }}
											>
												Anulado
											</span>
										)}
										{row.concept ? <small>{row.concept}</small> : null}
									</td>
									<td className="nowrap" data-label="Fecha">
										{formatDate(row.date)}
									</td>
									<td data-label="Medio">{row.method ?? "—"}</td>
									<td data-label="Aplicación">{row.application}</td>
									<td data-label="Referencia">{row.reference ?? "—"}</td>
									<td
										className="num strong"
										data-label="Monto"
										style={{
											color: row.registered ? "var(--success)" : undefined,
										}}
									>
										<span className="fin-strike">
											{money.format(row.amount)}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
					{filtered.length > 0 ? (
						<tfoot>
							<tr>
								<td colSpan={5}>
									{isFiltered ? "Total recibido (filtrado)" : "Total recibido"}
								</td>
								<td className="num">{money.format(total)}</td>
							</tr>
						</tfoot>
					) : null}
				</table>
			</div>
		</div>
	);
}
