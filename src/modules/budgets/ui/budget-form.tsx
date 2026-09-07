"use client";

import { Handshake, Plus, Ruler, Save, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import {
	generalUnitOptions,
	laborQuantityLabel,
	laborUnitOptions,
	laborUnitUsesJornadas,
} from "../domain/units";
import {
	budgetLineTypeLabels,
	type BudgetVersionInput,
} from "../domain/validation";

type BudgetLineType =
	BudgetVersionInput["sections"][number]["lineItems"][number]["type"];
type BudgetSection = BudgetVersionInput["sections"][number];
type BudgetLine = BudgetSection["lineItems"][number];

type BudgetFormProps = {
	initialValue: BudgetVersionInput;
	readOnly: boolean;
	action: (formData: FormData) => void | Promise<void>;
};

const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});

function toNumber(value: string | undefined) {
	const parsed = Number(value || "0");
	return Number.isFinite(parsed) ? parsed : 0;
}

function acceptsDecimalInput(value: string) {
	return /^\d*(\.\d{0,2})?$/.test(value);
}

function isCompleteDecimalInput(value: string | undefined, maximum?: number) {
	if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) return false;
	const number = Number(value);
	return (
		Number.isFinite(number) &&
		number >= 0 &&
		(maximum === undefined || number <= maximum)
	);
}

function lineSubtotal(line: BudgetLine) {
	const quantity = toNumber(line.quantity);
	const unitPrice = toNumber(line.unitPrice);
	const days = toNumber(line.days);

	if (line.type === "LABOR" && laborUnitUsesJornadas(line.unit) && days > 0) {
		return quantity * days * unitPrice;
	}

	return quantity * unitPrice;
}
function emptyLine(type: BudgetLineType, position: number): BudgetLine {
	return {
		id: crypto.randomUUID(),
		type,
		position,
		description: "",
		quantity: "1",
		unit: type === "LABOR" ? "persona" : "unidad",
		days: type === "LABOR" ? "1" : "",
		unitPrice: "0",
	};
}

function emptySection(position: number): BudgetSection {
	return {
		id: crypto.randomUUID(),
		code: String(position),
		name: "",
		category: "",
		position,
		lineItems: [],
	};
}

export function BudgetForm({
	initialValue,
	readOnly,
	action,
}: BudgetFormProps) {
	const [value, setValue] = useState<BudgetVersionInput>(initialValue);
	const financialSummaryComplete =
		isCompleteDecimalInput(value.siteManagerCost) &&
		isCompleteDecimalInput(value.contingencyPercentage, 100) &&
		isCompleteDecimalInput(value.administrationPercentage, 100) &&
		isCompleteDecimalInput(value.profitPercentage, 100) &&
		isCompleteDecimalInput(value.vatPercentage, 100) &&
		isCompleteDecimalInput(value.financingPercentage, 100);
	const canSave =
		financialSummaryComplete &&
		value.title.trim().length > 0 &&
		value.sections.length > 0 &&
		value.sections.every(
			(section) =>
				section.code.trim().length > 0 &&
				section.name.trim().length > 0 &&
				section.lineItems.length > 0 &&
				section.lineItems.every(
					(line) =>
						line.description.trim().length > 0 &&
						isCompleteDecimalInput(line.quantity) &&
						isCompleteDecimalInput(line.unitPrice) &&
						(line.type !== "LABOR" ||
							!laborUnitUsesJornadas(line.unit) ||
							(isCompleteDecimalInput(line.days) && toNumber(line.days) > 0)),
				),
		);

	const totals = useMemo(() => {
		const sections = value.sections.map((section) => {
			const materialSubtotal = section.lineItems
				.filter((line) => line.type === "MATERIAL")
				.reduce((sum, line) => sum + lineSubtotal(line), 0);
			const laborSubtotal = section.lineItems
				.filter((line) => line.type === "LABOR")
				.reduce((sum, line) => sum + lineSubtotal(line), 0);
			const otherSubtotal = section.lineItems
				.filter((line) => line.type === "OTHER")
				.reduce((sum, line) => sum + lineSubtotal(line), 0);

			return {
				materialSubtotal,
				laborSubtotal,
				otherSubtotal,
				total: materialSubtotal + laborSubtotal + otherSubtotal,
			};
		});
		const lineSubtotalTotal = sections.reduce(
			(sum, section) => sum + section.total,
			0,
		);
		const siteManagerCost = toNumber(value.siteManagerCost);
		const directCost = lineSubtotalTotal + siteManagerCost;
		const contingencyAmount =
			directCost * (toNumber(value.contingencyPercentage) / 100);
		const subtotal = directCost + contingencyAmount;
		const administrationAmount =
			subtotal * (toNumber(value.administrationPercentage) / 100);
		const afterAdministration = subtotal + administrationAmount;
		const profitAmount =
			afterAdministration * (toNumber(value.profitPercentage) / 100);
		const afterProfit = afterAdministration + profitAmount;
		const vatAmount = afterProfit * (toNumber(value.vatPercentage) / 100);
		const afterVat = afterProfit + vatAmount;
		const financingAmount =
			afterVat * (toNumber(value.financingPercentage) / 100);

		return {
			sections,
			lineSubtotalTotal,
			siteManagerCost,
			directCost,
			contingencyAmount,
			subtotal,
			administrationAmount,
			profitAmount,
			vatAmount,
			financingAmount,
			grandTotal: afterVat + financingAmount,
		};
	}, [value]);

	function updateSection(index: number, patch: Partial<BudgetSection>) {
		setValue((current) => ({
			...current,
			sections: current.sections.map((section, sectionIndex) =>
				sectionIndex === index ? { ...section, ...patch } : section,
			),
		}));
	}

	function updateLine(
		sectionIndex: number,
		lineIndex: number,
		patch: Partial<BudgetLine>,
	) {
		setValue((current) => ({
			...current,
			sections: current.sections.map((section, currentSectionIndex) =>
				currentSectionIndex === sectionIndex
					? {
							...section,
							lineItems: section.lineItems.map((line, currentLineIndex) =>
								currentLineIndex === lineIndex ? { ...line, ...patch } : line,
							),
						}
					: section,
			),
		}));
	}

	function updateFinancialField(
		field:
			| "siteManagerCost"
			| "contingencyPercentage"
			| "administrationPercentage"
			| "profitPercentage"
			| "vatPercentage"
			| "financingPercentage",
		nextValue: string,
		maximum?: number,
	) {
		if (!acceptsDecimalInput(nextValue)) return;
		if (nextValue && maximum !== undefined && Number(nextValue) > maximum)
			return;
		setValue((current) => ({ ...current, [field]: nextValue }));
	}

	function updateLineUnit(
		sectionIndex: number,
		lineIndex: number,
		line: BudgetLine,
		unit: string,
	) {
		if (line.type !== "LABOR") {
			updateLine(sectionIndex, lineIndex, { unit });
			return;
		}

		if (unit === "persona") {
			updateLine(sectionIndex, lineIndex, { unit, days: line.days || "1" });
			return;
		}

		if (unit === "global") {
			updateLine(sectionIndex, lineIndex, { unit, quantity: "1", days: "" });
			return;
		}

		updateLine(sectionIndex, lineIndex, { unit, days: "" });
	}

	function addLine(sectionIndex: number, type: BudgetLineType) {
		setValue((current) => ({
			...current,
			sections: current.sections.map((section, currentSectionIndex) => {
				if (currentSectionIndex !== sectionIndex) return section;
				const position =
					section.lineItems.filter((line) => line.type === type).length + 1;
				return {
					...section,
					lineItems: [...section.lineItems, emptyLine(type, position)],
				};
			}),
		}));
	}

	function removeLine(sectionIndex: number, lineIndex: number) {
		setValue((current) => ({
			...current,
			sections: current.sections.map((section, currentSectionIndex) =>
				currentSectionIndex === sectionIndex
					? {
							...section,
							lineItems: section.lineItems.filter(
								(_, currentLineIndex) => currentLineIndex !== lineIndex,
							),
						}
					: section,
			),
		}));
	}

	return (
		<form action={action} className="space-y-4">
			<input name="payload" type="hidden" value={JSON.stringify(value)} />

			<section className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm">
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_minmax(260px,0.8fr)_minmax(280px,1fr)]">
					<label className="block space-y-1">
						<span className="text-xs font-medium uppercase text-[var(--muted)]">
							Titulo del presupuesto
						</span>
						<input
							disabled={readOnly}
							required
							className="focus-ring w-full rounded-md border border-[var(--border)] px-3 py-2"
							value={value.title}
							onChange={(event) =>
								setValue({ ...value, title: event.target.value })
							}
						/>
					</label>
					<label className="block space-y-1">
						<span className="text-xs font-medium uppercase text-[var(--muted)]">
							Referencia
						</span>
						<input
							readOnly
							className="focus-ring w-full rounded-md border border-[var(--border)] bg-[#f5f6f4] px-3 py-2 text-[#4d5551]"
							value={value.sourceReference ?? ""}
						/>
					</label>
					<label className="block space-y-1 md:col-span-2 xl:col-span-1">
						<span className="text-xs font-medium uppercase text-[var(--muted)]">
							Ejecutor o empresa contratada
						</span>
						<input
							disabled={readOnly}
							className="focus-ring w-full rounded-md border border-[var(--border)] px-3 py-2"
							maxLength={160}
							placeholder="Opcional: empresa externa"
							value={value.executorName}
							onChange={(event) =>
								setValue({ ...value, executorName: event.target.value })
							}
						/>
					</label>
				</div>
			</section>

			<section
				className="budget-measurement-guide"
				aria-label="Formas de calcular la mano de obra"
			>
				<div className="budget-measurement-guide__item">
					<span className="budget-measurement-guide__icon budget-measurement-guide__icon--people">
						<UsersRound aria-hidden="true" size={18} />
					</span>
					<span>
						<strong>Por personal</strong>
						<small>Personal × jornadas × tarifa diaria</small>
					</span>
				</div>
				<div className="budget-measurement-guide__item">
					<span className="budget-measurement-guide__icon budget-measurement-guide__icon--measure">
						<Ruler aria-hidden="true" size={18} />
					</span>
					<span>
						<strong>Por cantidad</strong>
						<small>Día, m², m³ o unidad × precio</small>
					</span>
				</div>
				<div className="budget-measurement-guide__item">
					<span className="budget-measurement-guide__icon budget-measurement-guide__icon--deal">
						<Handshake aria-hidden="true" size={18} />
					</span>
					<span>
						<strong>Por trato</strong>
						<small>Un precio global, sin multiplicadores</small>
					</span>
				</div>
			</section>

			{value.sections.map((section, sectionIndex) => (
				<section
					className="overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm"
					key={section.id}
				>
					<div className="grid gap-3 border-b border-[var(--border)] bg-[#f4f7f4] p-3 md:grid-cols-[120px_minmax(260px,1fr)_minmax(220px,1fr)]">
						<label className="space-y-1">
							<span className="text-xs font-medium uppercase text-[var(--muted)]">
								Renglon
							</span>
							<input
								disabled={readOnly}
								required
								className="focus-ring w-full rounded-md border border-[var(--border)] px-3 py-1.5"
								value={section.code}
								onChange={(event) =>
									updateSection(sectionIndex, { code: event.target.value })
								}
							/>
						</label>
						<label className="space-y-1">
							<span className="text-xs font-medium uppercase text-[var(--muted)]">
								Descripcion
							</span>
							<textarea
								disabled={readOnly}
								required
								rows={1}
								className="focus-ring min-h-10 w-full resize-y rounded-md border border-[var(--border)] px-3 py-1.5 text-sm leading-snug"
								value={section.name}
								onChange={(event) =>
									updateSection(sectionIndex, { name: event.target.value })
								}
							/>
						</label>
						<label className="space-y-1">
							<span className="text-xs font-medium uppercase text-[var(--muted)]">
								Categoria
							</span>
							<input
								disabled={readOnly}
								className="focus-ring w-full rounded-md border border-[var(--border)] px-3 py-1.5"
								value={section.category ?? ""}
								onChange={(event) =>
									updateSection(sectionIndex, { category: event.target.value })
								}
							/>
						</label>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full min-w-[1120px] table-fixed border-collapse text-sm">
							<thead>
								<tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted)]">
									<th className="px-3 py-1.5">Tipo</th>
									<th className="w-[340px] px-3 py-1.5">Descripcion</th>
									<th className="px-3 py-1.5">Medición</th>
									<th className="px-3 py-1.5">Unidad</th>
									<th className="px-3 py-1.5 text-right">Jornadas</th>
									<th className="px-3 py-1.5 text-right">Precio</th>
									<th className="px-3 py-1.5 text-right">Subtotal</th>
									<th className="w-12 px-3 py-1.5" />
								</tr>
							</thead>
							<tbody>
								{section.lineItems.map((line, lineIndex) => (
									<tr className="border-b border-[var(--border)]" key={line.id}>
										<td className="px-3 py-1.5 align-middle">
											{budgetLineTypeLabels[line.type]}
										</td>
										<td className="px-3 py-1.5">
											<textarea
												disabled={readOnly}
												required
												rows={1}
												className="focus-ring min-h-10 w-full resize-y rounded-md border border-[var(--border)] px-3 py-1.5 leading-snug"
												value={line.description}
												onChange={(event) =>
													updateLine(sectionIndex, lineIndex, {
														description: event.target.value,
													})
												}
											/>
										</td>
										<td className="px-3 py-1.5">
											<label className="budget-measurement-field">
												<span>
													{line.type === "LABOR"
														? laborQuantityLabel(line.unit)
														: "Cantidad"}
												</span>
												<input
													aria-label={
														line.type === "LABOR"
															? laborQuantityLabel(line.unit)
															: "Cantidad"
													}
													disabled={
														readOnly ||
														(line.type === "LABOR" && line.unit === "global")
													}
													required
													className="budget-measurement-input focus-ring"
													min="0"
													step="0.01"
													type="number"
													value={line.quantity}
													onChange={(event) =>
														acceptsDecimalInput(event.target.value) &&
														updateLine(sectionIndex, lineIndex, {
															quantity: event.target.value,
														})
													}
												/>
											</label>
										</td>
										<td className="px-3 py-1.5">
											<select
												aria-label={`Unidad de ${line.description || budgetLineTypeLabels[line.type]}`}
												disabled={readOnly}
												className="budget-unit-select focus-ring"
												value={line.unit ?? ""}
												onChange={(event) =>
													updateLineUnit(
														sectionIndex,
														lineIndex,
														line,
														event.target.value,
													)
												}
											>
												{(line.type === "LABOR"
													? laborUnitOptions
													: generalUnitOptions
												).map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
												{line.unit &&
												!(
													line.type === "LABOR"
														? laborUnitOptions
														: generalUnitOptions
												).some((option) => option.value === line.unit) ? (
													<option value={line.unit}>{line.unit}</option>
												) : null}
											</select>
										</td>
										<td className="px-3 py-1.5">
											{line.type === "LABOR" &&
											laborUnitUsesJornadas(line.unit) ? (
												<input
													aria-label="Jornadas de trabajo"
													disabled={readOnly}
													required
													min="0.01"
													step="0.01"
													type="number"
													className="focus-ring w-full rounded-md border border-[var(--border)] px-2 py-1 text-right"
													value={line.days ?? ""}
													onChange={(event) =>
														acceptsDecimalInput(event.target.value) &&
														updateLine(sectionIndex, lineIndex, {
															days: event.target.value,
														})
													}
												/>
											) : (
												<span className="budget-not-applicable">No aplica</span>
											)}
										</td>
										<td className="px-3 py-1.5">
											<label className="budget-measurement-field budget-measurement-field--price">
												<span>
													{line.type === "LABOR" && line.unit === "global"
														? "Total del trato"
														: "Precio unitario"}
												</span>
												<input
													aria-label={
														line.type === "LABOR" && line.unit === "global"
															? "Total del trato"
															: "Precio unitario"
													}
													disabled={readOnly}
													className="budget-measurement-input focus-ring"
													required
													min="0"
													step="0.01"
													type="number"
													value={line.unitPrice}
													onChange={(event) =>
														acceptsDecimalInput(event.target.value) &&
														updateLine(sectionIndex, lineIndex, {
															unitPrice: event.target.value,
														})
													}
												/>
											</label>
										</td>
										<td className="px-3 py-1.5 text-right align-middle font-medium tabular-nums">
											{currencyFormatter.format(lineSubtotal(line))}
										</td>
										<td className="px-3 py-1.5 text-right align-middle">
											{!readOnly ? (
												<button
													className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)]"
													type="button"
													onClick={() => removeLine(sectionIndex, lineIndex)}
													title="Eliminar linea"
												>
													<Trash2 aria-hidden="true" size={16} />
												</button>
											) : null}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
						<div className="flex flex-wrap gap-2">
							{!readOnly
								? (["MATERIAL", "LABOR", "OTHER"] as BudgetLineType[]).map(
										(type) => (
											<button
												className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-1.5"
												key={type}
												type="button"
												onClick={() => addLine(sectionIndex, type)}
											>
												<Plus aria-hidden="true" size={16} />
												{budgetLineTypeLabels[type]}
											</button>
										),
									)
								: null}
						</div>
						<div className="grid min-w-[280px] gap-1 text-right">
							<span>
								Materiales:{" "}
								<strong>
									{currencyFormatter.format(
										totals.sections[sectionIndex]?.materialSubtotal ?? 0,
									)}
								</strong>
							</span>
							<span>
								Mano de obra:{" "}
								<strong>
									{currencyFormatter.format(
										totals.sections[sectionIndex]?.laborSubtotal ?? 0,
									)}
								</strong>
							</span>
							<span>
								Total renglon:{" "}
								<strong>
									{currencyFormatter.format(
										totals.sections[sectionIndex]?.total ?? 0,
									)}
								</strong>
							</span>
						</div>
					</div>
				</section>
			))}

			{!readOnly ? (
				<button
					className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
					type="button"
					onClick={() =>
						setValue({
							...value,
							sections: [
								...value.sections,
								emptySection(value.sections.length + 1),
							],
						})
					}
				>
					<Plus aria-hidden="true" size={18} />
					Agregar renglon
				</button>
			) : null}

			<section className="budget-financial-summary">
				<div className="budget-financial-summary__heading">
					<div>
						<h2>Resumen financiero</h2>
						<p>
							Todos los valores son obligatorios. Escribe 0 cuando un concepto
							no aplique; los porcentajes se calculan en el orden mostrado.
						</p>
					</div>
					{value.executorName ? (
						<span>Ejecutor: {value.executorName}</span>
					) : null}
				</div>
				<div className="budget-financial-summary__body">
					<div className="budget-financial-summary__controls">
						<label>
							<span>Encargado de obra</span>
							<input
								disabled={readOnly}
								required
								inputMode="decimal"
								min="0"
								step="0.01"
								type="number"
								value={value.siteManagerCost}
								onChange={(event) =>
									updateFinancialField("siteManagerCost", event.target.value)
								}
							/>
						</label>
						{(
							[
								["Imprevistos", "contingencyPercentage"],
								["Administración", "administrationPercentage"],
								["Utilidad", "profitPercentage"],
								["IVA", "vatPercentage"],
								["Financiamiento", "financingPercentage"],
							] as const
						).map(([label, field]) => (
							<label key={field}>
								<span>{label}</span>
								<span className="budget-percentage-input">
									<input
										disabled={readOnly}
										required
										inputMode="decimal"
										max="100"
										min="0"
										step="0.01"
										type="number"
										value={value[field]}
										onChange={(event) =>
											updateFinancialField(field, event.target.value, 100)
										}
									/>
									<b>%</b>
								</span>
							</label>
						))}
					</div>
					<div className="budget-financial-summary__totals">
						<div>
							<span>Total de renglones</span>
							<strong>
								{currencyFormatter.format(totals.lineSubtotalTotal)}
							</strong>
						</div>
						<div>
							<span>Encargado de obra</span>
							<strong>
								{currencyFormatter.format(totals.siteManagerCost)}
							</strong>
						</div>
						<div>
							<span>
								Imprevistos ({toNumber(value.contingencyPercentage)}%)
							</span>
							<strong>
								{currencyFormatter.format(totals.contingencyAmount)}
							</strong>
						</div>
						<div>
							<span>Subtotal</span>
							<strong>{currencyFormatter.format(totals.subtotal)}</strong>
						</div>
						<div>
							<span>
								Administración ({toNumber(value.administrationPercentage)}%)
							</span>
							<strong>
								{currencyFormatter.format(totals.administrationAmount)}
							</strong>
						</div>
						<div>
							<span>Utilidad ({toNumber(value.profitPercentage)}%)</span>
							<strong>{currencyFormatter.format(totals.profitAmount)}</strong>
						</div>
						<div>
							<span>IVA ({toNumber(value.vatPercentage)}%)</span>
							<strong>{currencyFormatter.format(totals.vatAmount)}</strong>
						</div>
						<div>
							<span>
								Financiamiento ({toNumber(value.financingPercentage)}%)
							</span>
							<strong>
								{currencyFormatter.format(totals.financingAmount)}
							</strong>
						</div>
						<div className="budget-financial-summary__grand-total">
							<span>Total general</span>
							<strong>{currencyFormatter.format(totals.grandTotal)}</strong>
						</div>
					</div>
				</div>
			</section>
			{!readOnly && !financialSummaryComplete ? (
				<p className="text-sm font-medium text-[var(--danger)]" role="alert">
					Completa el resumen financiero con valores entre 0 y 100. Usa 0 cuando
					un concepto no aplique.
				</p>
			) : null}
			{!readOnly ? (
				<button
					className="focus-ring inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
					disabled={!canSave}
					type="submit"
				>
					<Save aria-hidden="true" size={18} />
					Guardar presupuesto
				</button>
			) : null}
		</form>
	);
}
