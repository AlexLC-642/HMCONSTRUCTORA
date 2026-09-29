import {
	Banknote,
	Calculator,
	CheckCircle2,
	CircleAlert,
	CreditCard,
	FolderKanban,
	Landmark,
	type LucideIcon,
	Printer,
	ReceiptText,
	Scale,
	Tags,
	WalletCards,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requirePermission } from "@/modules/auth/application/authorization";
import { buildDocumentPreview } from "@/modules/documents/application/queries";
import { getFinanceWorkspace } from "@/modules/finances/application/queries";
import {
	classifiedExpenseTotal,
	expenseGroupLabel,
	expenseSectionCode,
} from "@/modules/finances/application/statement";
import { FinanceEntryDialogs } from "@/modules/finances/ui/finance-entry-dialogs";
import {
	type FinanceExpenseRow,
	FinanceExpensesTable,
} from "@/modules/finances/ui/finance-expenses-table";
import {
	type FinancePayableRow,
	FinancePayablesTable,
} from "@/modules/finances/ui/finance-payables-table";
import {
	type FinancePaymentRow,
	FinancePaymentsTable,
} from "@/modules/finances/ui/finance-payments-table";
import {
	FinanceWorkspaceTabs,
	resolveFinanceTab,
} from "@/modules/finances/ui/finance-workspace-tabs";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";

const money = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});

function percentOf(value: number, total: number) {
	return total > 0 ? (value / total) * 100 : 0;
}

type MetricTone = "graphite" | "green" | "blue" | "amber" | "red";

/** Same KPI card as the other modules (coloured top rule + tinted icon). */
function Metric({
	label,
	value,
	detail,
	icon: Icon,
	tone,
	valueTone,
	meter,
}: {
	label: string;
	value: number;
	detail: ReactNode;
	icon: LucideIcon;
	tone: MetricTone;
	valueTone?: "good" | "bad";
	meter?: number;
}) {
	return (
		<article className="inventory-metric" data-tone={tone}>
			<div className="min-w-0 flex-1">
				<p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#53605b]">
					{label}
				</p>
				<strong
					className="mt-3 block text-[1.45rem] font-bold leading-none tracking-[-0.02em] tabular-nums"
					style={{
						color:
							valueTone === "bad"
								? "var(--danger)"
								: valueTone === "good"
									? "var(--success)"
									: "var(--foreground)",
					}}
				>
					{money.format(value)}
				</strong>
				{meter !== undefined ? (
					<div className="fin-meter mt-3">
						<span
							className={meter > 100 ? "is-over" : undefined}
							style={{ width: `${Math.min(100, Math.max(0, meter))}%` }}
						/>
					</div>
				) : null}
				<p className="mt-2 text-xs font-medium text-[#63706b]">{detail}</p>
			</div>
			<span className="inventory-metric-icon">
				<Icon aria-hidden="true" size={19} />
			</span>
		</article>
	);
}

/** Same panel + header as the other modules (red accent rule, dark icon). */
function Panel({
	title,
	description,
	icon: Icon,
	children,
	className = "",
}: {
	title: string;
	description?: string;
	icon: LucideIcon;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={`inventory-panel ${className}`}>
			<header className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-4">
				<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#202a2c] text-white shadow-[0_10px_22px_rgba(21,31,33,0.18)]">
					<Icon aria-hidden="true" size={18} />
				</span>
				<div className="min-w-0">
					<h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
					{description ? (
						<p className="mt-0.5 text-sm leading-5 text-[var(--muted)]">
							{description}
						</p>
					) : null}
				</div>
			</header>
			{children}
		</section>
	);
}

type FinancesPageProps = {
	searchParams: Promise<{ projectId?: string; tab?: string }>;
};

export default async function FinancesPage({
	searchParams,
}: FinancesPageProps) {
	const user = await requirePermission("finanzas.ver");
	const params = await searchParams;
	const tab = resolveFinanceTab(params.tab);
	const canRegister = user.permissions.includes("finanzas.registrar");
	const {
		projects,
		selectedProject,
		expenses,
		payments,
		payables,
		invoiceOrders,
		budgetSections,
		budgetVersion,
		summary,
	} = await getFinanceWorkspace(user, params.projectId);
	const projectId = selectedProject?.id ?? "";
	const today = new Date().toISOString().slice(0, 10);

	const totalBudget = summary.totalBudget.toNumber();
	const totalExpenses = summary.totalExpenses.toNumber();
	const totalPayments = summary.totalPayments.toNumber();
	const cashBalance = summary.availableBalance.toNumber();
	const budgetDifference = summary.budgetDifference.toNumber();
	const validExpenses = expenses.filter(
		(expense) => expense.status === "VALID",
	);
	const registeredPayments = payments.filter(
		(payment) => payment.status === "REGISTERED",
	);

	// ---- Plain, serialisable rows for the client tables ----
	const expenseRows: FinanceExpenseRow[] = expenses.map((expense) => ({
		id: expense.id,
		date: expense.expenseDate.toISOString(),
		description: expense.description,
		type: expense.type,
		supplier: expense.supplier?.businessName ?? expense.vendor,
		quantity: expense.quantity.toNumber(),
		unit: expense.unit,
		subtotal: expense.subtotal.toNumber(),
		status: expense.status,
		documentNumber: expense.documentNumber,
		group: expenseGroupLabel(expense),
	}));
	const payableRows: FinancePayableRow[] = payables.map(
		({ expense, paid, pending, estimatedTotal }) => {
			const dueDate =
				expense.purchaseOrder?.paymentType === "CREDIT"
					? (expense.purchaseOrder.paymentDueDate ?? null)
					: null;
			const overdue =
				pending.gt(0) &&
				dueDate !== null &&
				dueDate < new Date(`${today}T00:00:00.000Z`);
			return {
				id: expense.id,
				description: expense.description,
				documentNumber: expense.documentNumber,
				orderNumber: expense.purchaseOrder?.number ?? null,
				supplier:
					expense.supplier?.businessName ??
					expense.vendor ??
					"Proveedor no indicado",
				dueDate: dueDate?.toISOString() ?? null,
				state: pending.lte(0)
					? "paid"
					: overdue
						? "overdue"
						: paid.gt(0)
							? "partial"
							: "pending",
				subtotal: expense.subtotal.toNumber(),
				paid: paid.toNumber(),
				pending: pending.toNumber(),
				estimated: estimatedTotal?.toNumber() ?? null,
				payments: expense.supplierPayments
					.filter((payment) => payment.status === "REGISTERED")
					.map((payment) => ({
						id: payment.id,
						number: payment.paymentNumber,
						date: payment.paymentDate.toISOString(),
						amount: payment.amount.toNumber(),
					})),
			};
		},
	);
	const paymentRows: FinancePaymentRow[] = payments.map((payment) => ({
		id: payment.id,
		number: payment.paymentNumber,
		date: payment.paymentDate.toISOString(),
		method: payment.method,
		reference: payment.reference,
		concept: payment.concept,
		application: payment.budgetSection
			? `Renglón ${payment.budgetSection.code} · ${payment.budgetSection.name}`
			: "General (caja del proyecto)",
		amount: payment.amount.toNumber(),
		registered: payment.status === "REGISTERED",
	}));

	const supplierPaid = payableRows.reduce((sum, row) => sum + row.paid, 0);
	const supplierPending = payableRows.reduce(
		(sum, row) => sum + row.pending,
		0,
	);
	const overdueCount = payableRows.filter(
		(row) => row.state === "overdue",
	).length;

	// ---- Budget vs actual per renglón (Resumen) ----
	const sectionCodes = new Set(budgetSections.map((section) => section.code));
	const spentBySection = new Map<string, number>();
	let unassignedSpent = 0;
	for (const expense of validExpenses) {
		const code = expenseSectionCode(expense);
		if (code && sectionCodes.has(code))
			spentBySection.set(
				code,
				(spentBySection.get(code) ?? 0) + expense.subtotal.toNumber(),
			);
		else unassignedSpent += expense.subtotal.toNumber();
	}
	const sectionRows = budgetSections.map((section) => {
		const budget = section.total.toNumber();
		const clientPrice = section.clientPrice.toNumber();
		const spent = spentBySection.get(section.code) ?? 0;
		const received = registeredPayments
			.filter((payment) => payment.budgetSectionId === section.id)
			.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
		return {
			...section,
			budget,
			clientPrice,
			spent,
			received,
			execution: percentOf(spent, budget),
		};
	});
	const generalReceived = registeredPayments
		.filter((payment) => !payment.budgetSectionId)
		.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
	const sectionsBudget = sectionRows.reduce((sum, row) => sum + row.budget, 0);
	const sectionsClientPrice = sectionRows.reduce(
		(sum, row) => sum + row.clientPrice,
		0,
	);

	const checks = [
		[
			"Proveedores",
			Math.abs(totalExpenses - supplierPaid - supplierPending) <= 0.01,
		],
		["Caja", Math.abs(cashBalance - totalPayments + supplierPaid) <= 0.01],
		[
			"Presupuesto",
			Math.abs(budgetDifference - totalBudget + totalExpenses) <= 0.01,
		],
	] as const;
	const classifications = (
		[
			[
				"Supervisión",
				classifiedExpenseTotal(validExpenses, ["supervisión", "supervision"]),
			],
			[
				"Trabajos adicionales",
				classifiedExpenseTotal(validExpenses, ["adicional"]),
			],
			[
				"Gastos externos",
				classifiedExpenseTotal(validExpenses, ["externo", "distinto de obra"]),
			],
		] as const
	).filter(([, value]) => value !== 0);

	const documentPreviews = Object.fromEntries(
		expenses.flatMap((expense) =>
			expense.supportingDocument
				? [
						[
							expense.id,
							buildDocumentPreview(
								expense.supportingDocument,
								selectedProject,
								expense.supportingDocument.category,
							),
						],
					]
				: [],
		),
	);

	const spentPct = percentOf(totalExpenses, totalBudget);
	const receivedPct = percentOf(totalPayments, totalBudget);

	return (
		<main className="finances-workspace mx-auto max-w-[1520px] space-y-5 pb-10">
			{/* ---- Command bar: same graphite bar as Inventario / Compras ---- */}
			<section className="inventory-commandbar p-5 text-white sm:p-6">
				<div className="relative flex flex-wrap items-start justify-between gap-4">
					<div className="flex min-w-0 items-center gap-3.5">
						<span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-red)] text-white shadow-[0_12px_28px_rgba(200,32,47,0.34)]">
							<Landmark aria-hidden="true" size={22} />
						</span>
						<div className="min-w-0">
							<h1 className="text-2xl font-bold leading-tight tracking-[-0.02em] text-white">
								Finanzas
							</h1>
							<p className="truncate text-sm text-white/65">
								{selectedProject
									? `${selectedProject.code} · ${selectedProject.name}`
									: "Sin proyectos disponibles"}
							</p>
						</div>
					</div>
					{selectedProject ? (
						<div className="flex flex-wrap items-center gap-2">
							<Link
								className="purchases-button purchases-button--light focus-ring"
								href={`/projects/${projectId}` as Route}
							>
								<FolderKanban aria-hidden="true" size={17} /> Proyecto
							</Link>
							<Link
								className="purchases-button purchases-button--light focus-ring"
								href={`/finances/print?projectId=${projectId}` as Route}
							>
								<Printer aria-hidden="true" size={17} /> Estado de cuenta PDF
							</Link>
						</div>
					) : null}
				</div>
				<div className="relative mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-5">
					<AutoFilterForm action="/finances" className="w-full max-w-xl">
						<label className="fin-field fin-field--on-dark">
							<span>Proyecto</span>
							<select
								className="fin-input"
								defaultValue={projectId}
								name="projectId"
							>
								{projects.map((project) => (
									<option key={project.id} value={project.id}>
										{project.code} · {project.name}
									</option>
								))}
							</select>
						</label>
						<input name="tab" type="hidden" value={tab} />
					</AutoFilterForm>
					{selectedProject && canRegister ? (
						<FinanceEntryDialogs
							invoiceOrders={invoiceOrders}
							projectId={projectId}
							sections={budgetSections.map((section) => ({
								id: section.id,
								code: section.code,
								name: section.name,
								total: section.clientPrice.toString(),
							}))}
							today={today}
						/>
					) : null}
				</div>
			</section>

			{selectedProject ? (
				<>
					{/* ---- One set of exact figures (no repeats further down) ---- */}
					<section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
						<Metric
							detail={
								budgetDifference >= 0
									? `Disponible ${money.format(budgetDifference)}`
									: `Excedido por ${money.format(-budgetDifference)}`
							}
							icon={Calculator}
							label="Presupuesto"
							tone="graphite"
							valueTone={budgetDifference < 0 ? "bad" : undefined}
							value={totalBudget}
						/>
						<Metric
							detail={`${spentPct.toFixed(1)}% del presupuesto · ${validExpenses.length} gastos`}
							icon={ReceiptText}
							label="Gastado"
							meter={spentPct}
							tone="red"
							valueTone={spentPct > 100 ? "bad" : undefined}
							value={totalExpenses}
						/>
						<Metric
							detail={`${receivedPct.toFixed(1)}% del presupuesto · ${registeredPayments.length} abonos`}
							icon={Banknote}
							label="Abonado por el cliente"
							tone="green"
							valueTone="good"
							value={totalPayments}
						/>
						<Metric
							detail="Abonos recibidos menos pagos a proveedores"
							icon={WalletCards}
							label="Saldo en caja"
							tone="blue"
							valueTone={cashBalance < 0 ? "bad" : undefined}
							value={cashBalance}
						/>
						<Metric
							detail={
								overdueCount > 0
									? `A proveedores · ${overdueCount} ${overdueCount === 1 ? "vencida" : "vencidas"}`
									: supplierPending > 0
										? "A proveedores · sin vencidas"
										: "A proveedores · todo pagado"
							}
							icon={CreditCard}
							label="Por pagar"
							tone={overdueCount > 0 ? "red" : "amber"}
							valueTone={overdueCount > 0 ? "bad" : undefined}
							value={supplierPending}
						/>
					</section>

					<section className="inventory-panel">
						<FinanceWorkspaceTabs
							active={tab}
							counts={{
								gastos: validExpenses.length,
								proveedores: payableRows.filter((row) => row.pending > 0)
									.length,
								abonos: registeredPayments.length,
							}}
							projectId={projectId}
						/>

						{tab === "resumen" ? (
							<div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
								<Panel
									description={
										budgetVersion
											? `Presupuesto aprobado v${budgetVersion}: cuánto se ha gastado y cobrado en cada renglón.`
											: "Aprueba una versión del presupuesto para comparar por renglón."
									}
									icon={Calculator}
									title="Presupuesto por renglón"
								>
									<div className="fin-table-wrap">
										<table className="fin-table fin-table--stack">
											<thead>
												<tr>
													<th>Renglón</th>
													<th className="num">Costo</th>
													<th className="num">Precio al cliente</th>
													<th className="num">Gastado</th>
													<th style={{ width: "22%" }}>Ejecución</th>
													<th className="num">Abonado</th>
												</tr>
											</thead>
											<tbody>
												{sectionRows.map((row) => (
													<tr key={row.id}>
														<td className="fin-row-title">
															<span className="strong">
																{row.code} · {row.name}
															</span>
															<small>
																{row.lineItemCount} conceptos presupuestados
															</small>
														</td>
														<td className="num" data-label="Costo">
															{money.format(row.budget)}
														</td>
														<td className="num" data-label="Precio al cliente">
															{money.format(row.clientPrice)}
														</td>
														<td className="num strong" data-label="Gastado">
															{money.format(row.spent)}
														</td>
														<td data-label="Ejecución">
															<div
																className="flex items-center gap-2"
																style={{ minWidth: 120 }}
															>
																<div className="fin-meter flex-1">
																	<span
																		className={
																			row.execution > 100
																				? "is-over"
																				: undefined
																		}
																		style={{
																			width: `${Math.min(100, row.execution)}%`,
																		}}
																	/>
																</div>
																<span
																	className="w-14 text-right text-xs font-semibold tabular-nums"
																	style={{
																		color:
																			row.execution > 100
																				? "var(--danger)"
																				: undefined,
																	}}
																>
																	{row.execution.toFixed(0)}%
																</span>
															</div>
														</td>
														<td
															className="num"
															data-label="Abonado"
															style={{ color: "var(--success)" }}
														>
															{money.format(row.received)}
														</td>
													</tr>
												))}
												{unassignedSpent > 0 || generalReceived > 0 ? (
													<tr>
														<td className="fin-row-title">
															<span className="strong">
																Sin renglón asignado
															</span>
															<small>
																Gastos sin renglón y abonos generales a caja
															</small>
														</td>
														<td className="num muted" data-label="Costo">
															—
														</td>
														<td
															className="num muted"
															data-label="Precio al cliente"
														>
															—
														</td>
														<td className="num strong" data-label="Gastado">
															{money.format(unassignedSpent)}
														</td>
														<td data-label="Ejecución" />
														<td
															className="num"
															data-label="Abonado"
															style={{ color: "var(--success)" }}
														>
															{money.format(generalReceived)}
														</td>
													</tr>
												) : null}
												{sectionRows.length === 0 &&
												unassignedSpent === 0 &&
												generalReceived === 0 ? (
													<tr>
														<td className="fin-empty" colSpan={6}>
															Sin renglones aprobados ni movimientos todavía.
														</td>
													</tr>
												) : null}
											</tbody>
											{sectionRows.length > 0 ? (
												<tfoot>
													<tr>
														<td>Total</td>
														<td className="num" data-label="Costo">
															{money.format(sectionsBudget)}
														</td>
														<td className="num" data-label="Precio al cliente">
															{money.format(sectionsClientPrice)}
														</td>
														<td className="num" data-label="Gastado">
															{money.format(totalExpenses)}
														</td>
														<td />
														<td className="num" data-label="Abonado">
															{money.format(totalPayments)}
														</td>
													</tr>
												</tfoot>
											) : null}
										</table>
									</div>
								</Panel>

								<div className="grid content-start gap-5">
									<Panel icon={WalletCards} title="Flujo de caja">
										<dl className="grid gap-0 px-5 py-2 text-sm">
											{(
												[
													["Abonado por el cliente", totalPayments, "+"],
													["Pagado a proveedores", supplierPaid, "−"],
												] as const
											).map(([label, value, sign]) => (
												<div
													className="flex justify-between gap-3 border-b border-[var(--border)] py-2.5"
													key={label}
												>
													<dt className="text-[var(--muted)]">
														{sign} {label}
													</dt>
													<dd className="font-semibold tabular-nums">
														{money.format(value)}
													</dd>
												</div>
											))}
											<div className="flex justify-between gap-3 py-3">
												<dt className="font-semibold">= Saldo en caja</dt>
												<dd
													className="text-lg font-bold tabular-nums"
													style={{
														color:
															cashBalance < 0 ? "var(--danger)" : undefined,
													}}
												>
													{money.format(cashBalance)}
												</dd>
											</div>
										</dl>
									</Panel>
									<Panel
										description="Verifica que presupuesto, caja y cuentas por pagar coincidan."
										icon={Scale}
										title="Comprobación automática"
									>
										<ul className="grid gap-2 px-5 py-4 text-sm">
											{checks.map(([label, ok]) => (
												<li
													className="flex items-center justify-between gap-3"
													key={label}
												>
													<span>{label}</span>
													<span
														className={`fin-badge ${ok ? "fin-badge--ok" : "fin-badge--danger"}`}
													>
														{ok ? (
															<CheckCircle2 aria-hidden="true" size={13} />
														) : (
															<CircleAlert aria-hidden="true" size={13} />
														)}
														{ok ? "Cuadra" : "Revisar"}
													</span>
												</li>
											))}
										</ul>
									</Panel>
									{classifications.length > 0 ? (
										<Panel icon={Tags} title="Costos clasificados">
											<dl className="grid px-5 py-2 text-sm">
												{classifications.map(([label, value]) => (
													<div
														className="flex justify-between gap-3 border-b border-[var(--border)] py-2.5 last:border-0"
														key={label}
													>
														<dt className="text-[var(--muted)]">{label}</dt>
														<dd className="font-semibold tabular-nums">
															{money.format(value)}
														</dd>
													</div>
												))}
											</dl>
										</Panel>
									) : null}
								</div>
							</div>
						) : null}

						{tab === "gastos" ? (
							<FinanceExpensesTable
								canRegister={canRegister}
								documentPreviews={documentPreviews}
								projectId={projectId}
								rows={expenseRows}
							/>
						) : null}

						{tab === "proveedores" ? (
							<FinancePayablesTable
								canRegister={canRegister}
								projectId={projectId}
								rows={payableRows}
								today={today}
							/>
						) : null}

						{tab === "abonos" ? (
							<FinancePaymentsTable rows={paymentRows} />
						) : null}
					</section>
				</>
			) : (
				<section className="inventory-panel px-4 py-12 text-center text-[var(--muted)]">
					Primero crea un proyecto para registrar finanzas.
				</section>
			)}
		</main>
	);
}
