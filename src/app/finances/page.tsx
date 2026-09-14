import {
	Banknote,
	Calculator,
	CreditCard,
	FileText,
	FolderKanban,
	Landmark,
	Printer,
	ReceiptText,
	TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { requirePermission } from "@/modules/auth/application/authorization";
import { buildDocumentPreview } from "@/modules/documents/application/queries";
import { getFinanceWorkspace } from "@/modules/finances/application/queries";
import {
	classifiedExpenseTotal,
	expenseGroupLabel,
} from "@/modules/finances/application/statement";
import { AccountStatement } from "@/modules/finances/ui/account-statement";
import { FinanceEntryDialogs } from "@/modules/finances/ui/finance-entry-dialogs";
import { FinanceStatementSummary } from "@/modules/finances/ui/finance-statement-summary";
import { FinanceWorkspaceTabs } from "@/modules/finances/ui/finance-workspace-tabs";
import { SupplierPaymentDialog } from "@/modules/finances/ui/supplier-payment-dialog";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";

const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const compactCurrencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
	notation: "compact",
	maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });

const inputClass =
	"focus-ring h-11 w-full rounded-md border border-[#cfd5ce] bg-white px-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition placeholder:text-[#96a09b] hover:border-[#aeb8b1]";
const panelClass =
	"finances-panel rounded-xl bg-white shadow-[0_16px_38px_rgba(22,27,29,0.08)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid gap-1.5">
			<span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#58635f]">
				{label}
			</span>
			{children}
		</div>
	);
}

function MoneyMetric({
	label,
	value,
	detail,
	icon: Icon,
	tone,
}: {
	label: string;
	value: number;
	detail: string;
	icon: typeof Calculator;
	tone: "red" | "green" | "amber" | "steel";
}) {
	const styles = {
		red: {
			bar: "bg-[var(--brand-red)]",
			badge: "bg-[#fff0f1] text-[var(--brand-red)]",
			glow: "bg-[#fff5f6]",
		},
		green: {
			bar: "bg-[var(--success)]",
			badge: "bg-[#e8f6ef] text-[#167154]",
			glow: "bg-[#eff9f4]",
		},
		amber: {
			bar: "bg-[#e59a00]",
			badge: "bg-[#fff3d1] text-[#8a5a00]",
			glow: "bg-[#fff9e8]",
		},
		steel: {
			bar: "bg-[#263438]",
			badge: "bg-[#eaf0ee] text-[#263438]",
			glow: "bg-[#f1f5f3]",
		},
	}[tone];

	return (
		<div className="finances-metric group relative overflow-hidden rounded-xl bg-white/80 p-4 shadow-[0_14px_34px_rgba(22,27,29,0.1)] backdrop-blur-xl backdrop-saturate-150 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(22,27,29,0.15)]">
			<span className={`absolute inset-x-0 top-0 h-1 ${styles.bar}`} />
			<span
				className={`pointer-events-none absolute -bottom-10 -right-8 size-24 rounded-full ${styles.glow} transition duration-300 group-hover:scale-125`}
			/>
			<div className="relative flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#58635f]">
						{label}
					</p>
					<p className="mt-2 truncate text-xl font-semibold leading-none tabular-nums text-[#101416] sm:text-3xl">
						{compactCurrencyFormatter.format(value)}
					</p>
					<p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
				</div>
				<span
					className={`grid size-10 place-items-center rounded-xl shadow-[0_8px_20px_rgba(22,27,29,0.09)] transition duration-300 group-hover:-rotate-3 group-hover:scale-105 ${styles.badge}`}
				>
					<Icon aria-hidden="true" size={18} />
				</span>
			</div>
		</div>
	);
}

function ratio(value: number, total: number) {
	if (total <= 0) return 0;
	return Math.max(0, Math.min(100, (value / total) * 100));
}

type FinancesPageProps = {
	searchParams: Promise<{ projectId?: string }>;
};

export default async function FinancesPage({
	searchParams,
}: FinancesPageProps) {
	const user = await requirePermission("finanzas.ver");
	const params = await searchParams;
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
	const selectedProjectId = selectedProject?.id ?? "";
	const totalBudget = summary.totalBudget.toNumber();
	const totalExpenses = summary.totalExpenses.toNumber();
	const totalPayments = summary.totalPayments.toNumber();
	const availableBalance = summary.availableBalance.toNumber();
	const budgetDifference = summary.budgetDifference.toNumber();
	const spentRatio = ratio(totalExpenses, totalBudget);
	const paidRatio = ratio(totalPayments, totalBudget);
	const validExpenses = expenses.filter(
		(expense) => expense.status === "VALID",
	);
	const lastExpense = validExpenses.at(-1);
	const lastPayment = payments
		.filter((payment) => payment.status === "REGISTERED")
		.at(-1);
	const today = new Date().toISOString().slice(0, 10);
	const totalPayable = payables.reduce(
		(sum, payable) => sum + payable.pending.toNumber(),
		0,
	);
	const totalPaidToSuppliers = payables.reduce(
		(sum, payable) => sum + payable.paid.toNumber(),
		0,
	);
	const allocations = budgetSections.map((section) => {
		const paid = payments
			.filter(
				(payment) =>
					payment.status === "REGISTERED" &&
					payment.budgetSectionId === section.id,
			)
			.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
		return {
			...section,
			paid,
			pending: Math.max(0, section.total.toNumber() - paid),
			coverage: ratio(paid, section.total.toNumber()),
		};
	});
	const expenseDocumentPreviews = Object.fromEntries(
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
	const phaseTotals = Array.from(
		validExpenses.reduce((groups, expense) => {
			const phase = expenseGroupLabel(expense);
			groups.set(phase, (groups.get(phase) ?? 0) + expense.subtotal.toNumber());
			return groups;
		}, new Map<string, number>()),
	).map(([name, total]) => ({ name, total }));
	const statementDate =
		[
			...validExpenses.map((expense) => expense.expenseDate),
			...payments.map((payment) => payment.paymentDate),
		].sort((left, right) => right.getTime() - left.getTime())[0] ?? new Date();

	return (
		<main className="finances-workspace mx-auto max-w-[1520px] space-y-6 pb-10">
			<section className="finances-hero relative overflow-hidden rounded-2xl bg-[#172023] text-white shadow-[0_26px_72px_rgba(22,27,29,0.26)]">
				<div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full bg-[#c8202f]/30 blur-3xl" />
				<div className="pointer-events-none absolute inset-y-0 left-[48%] w-px rotate-[28deg] bg-white/[0.06] shadow-[70px_0_0_rgba(255,255,255,0.04),140px_0_0_rgba(255,255,255,0.025)]" />
				<div className="relative grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-center">
					<div className="flex items-center gap-4">
						<span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--brand-red)] text-white shadow-[0_12px_28px_rgba(200,32,47,0.34)]">
							<Landmark aria-hidden="true" size={24} />
						</span>
						<h1 className="sr-only">Finanzas</h1>
					</div>
					<AutoFilterForm
						action="/finances"
						className="rounded-xl bg-white/[0.1] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_28px_rgba(0,0,0,0.12)] [&_span]:text-white/75"
					>
						<Field label="Proyecto activo">
							<div>
								<select
									className={`${inputClass} border-white/20 bg-white text-[#101416]`}
									name="projectId"
									defaultValue={selectedProjectId}
								>
									{projects.map((project) => (
										<option key={project.id} value={project.id}>
											{project.code} - {project.name}
										</option>
									))}
								</select>
							</div>
						</Field>
					</AutoFilterForm>
				</div>
			</section>

			<section className="kpi-grid grid grid-cols-2 gap-3 xl:grid-cols-4">
				<MoneyMetric
					detail={`${spentRatio.toFixed(1)}% ejecutado`}
					icon={Calculator}
					label="Presupuesto"
					tone="steel"
					value={totalBudget}
				/>
				<MoneyMetric
					detail={`${paidRatio.toFixed(1)}% cubierto`}
					icon={Banknote}
					label="Abonos del cliente"
					tone="green"
					value={totalPayments}
				/>
				<MoneyMetric
					detail={`${validExpenses.length} registros válidos`}
					icon={ReceiptText}
					label="Gastado"
					tone="amber"
					value={totalExpenses}
				/>
				<MoneyMetric
					detail={
						budgetDifference >= 0
							? "Presupuesto disponible"
							: "Sobre presupuesto"
					}
					icon={TrendingUp}
					label="Diferencia"
					tone={budgetDifference >= 0 ? "green" : "red"}
					value={budgetDifference}
				/>
			</section>

			{selectedProject ? (
				<section className={`${panelClass} overflow-hidden`}>
					<div className="grid gap-4 p-5 lg:grid-cols-[1fr_280px] lg:items-center">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#58635f]">
								{selectedProject.code}
							</p>
							<h2 className="mt-1 text-2xl font-semibold">
								{selectedProject.name}
							</h2>
							<div className="kpi-grid mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
								<div className="rounded-xl bg-[#ecf7f1] p-3 shadow-[inset_0_0_0_1px_rgba(31,122,91,0.09)] transition hover:bg-[#e4f3eb]">
									<p className="text-xs font-semibold uppercase text-[#58635f]">
										Saldo caja
									</p>
									<p className="mt-1 text-xl font-semibold tabular-nums">
										{currencyFormatter.format(availableBalance)}
									</p>
								</div>
								<div className="rounded-xl bg-[#fff7e6] p-3 shadow-[inset_0_0_0_1px_rgba(229,154,0,0.1)] transition hover:bg-[#fff2d6]">
									<p className="text-xs font-semibold uppercase text-[#58635f]">
										Último gasto
									</p>
									<p className="mt-1 text-sm font-semibold">
										{lastExpense
											? `${lastExpense.description} — ${currencyFormatter.format(lastExpense.subtotal.toNumber())}`
											: "Sin gastos"}
									</p>
								</div>
								<div className="col-span-2 rounded-xl bg-[#f1f4f3] p-3 shadow-[inset_0_0_0_1px_rgba(38,52,56,0.08)] transition hover:bg-[#e9eeec] lg:col-span-1">
									<p className="text-xs font-semibold uppercase text-[#58635f]">
										Último abono
									</p>
									<p className="mt-1 text-sm font-semibold">
										{lastPayment
											? `${lastPayment.paymentNumber} — ${currencyFormatter.format(lastPayment.amount.toNumber())}`
											: "Sin abonos"}
									</p>
								</div>
							</div>
						</div>
						<div className="grid gap-2">
							<a
								className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--success)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(31,122,91,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(31,122,91,0.3)]"
								href={`/finances/print?projectId=${selectedProjectId}`}
							>
								<Printer aria-hidden="true" size={18} /> Vista PDF
							</a>
							<a
								className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f0f3f1] px-4 text-sm font-semibold text-[#253033] shadow-[0_7px_18px_rgba(22,27,29,0.08)] transition hover:-translate-y-0.5 hover:bg-[#e8eeea]"
								href={`/projects/${selectedProjectId}`}
							>
								<FolderKanban aria-hidden="true" size={18} /> Abrir proyecto
							</a>
						</div>
					</div>
					<div className="border-t border-[#dfe3dc] px-5 py-4">
						<div className="grid gap-3 lg:grid-cols-[150px_minmax(0,1fr)_70px] lg:items-center">
							<span className="text-sm font-medium text-[#58635f]">
								Ejecución
							</span>
							<div className="h-3 overflow-hidden rounded-full bg-[#e4e8e2] shadow-[inset_0_1px_2px_rgba(22,27,29,0.1)]">
								<div
									className="h-full rounded-full bg-[var(--brand-red)]"
									style={{ width: `${spentRatio}%` }}
								/>
							</div>
							<span className="text-right text-sm font-semibold tabular-nums">
								{spentRatio.toFixed(1)}%
							</span>
							<span className="text-sm font-medium text-[#58635f]">
								Cobertura
							</span>
							<div className="h-3 overflow-hidden rounded-full bg-[#e4e8e2] shadow-[inset_0_1px_2px_rgba(22,27,29,0.1)]">
								<div
									className="h-full rounded-full bg-[var(--success)]"
									style={{ width: `${paidRatio}%` }}
								/>
							</div>
							<span className="text-right text-sm font-semibold tabular-nums">
								{paidRatio.toFixed(1)}%
							</span>
						</div>
					</div>
				</section>
			) : (
				<section
					className={`${panelClass} px-4 py-12 text-center text-[var(--muted)]`}
				>
					Primero cree un proyecto para registrar finanzas.
				</section>
			)}

			{selectedProject && canRegister ? (
				<FinanceEntryDialogs
					invoiceOrders={invoiceOrders}
					projectId={selectedProjectId}
					sections={budgetSections.map((section) => ({
						id: section.id,
						code: section.code,
						name: section.name,
						total: section.total.toString(),
					}))}
					today={today}
				/>
			) : null}

			<FinanceWorkspaceTabs
				counts={[
					allocations.length,
					validExpenses.length,
					payables.length,
					payments.length,
				]}
			>
				<section
					className={`${panelClass} overflow-hidden`}
					key="budget-allocations"
				>
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd5ce] px-5 py-4">
						<div>
							<h2 className="text-xl font-semibold">
								Aplicación de abonos por renglón
							</h2>
							<p className="text-sm text-[var(--muted)]">
								Presupuesto aprobado{budgetVersion ? ` v${budgetVersion}` : ""}.
								Los abonos generales permanecen en la caja del proyecto.
							</p>
						</div>
					</div>
					<div className="hidden overflow-x-auto md:block">
						<table className="w-full min-w-[760px] border-collapse text-sm">
							<thead className="bg-[#f3f5f1] text-left text-xs uppercase tracking-[0.06em] text-[#58635f]">
								<tr>
									<th className="px-5 py-3">Renglón</th>
									<th className="px-5 py-3">Descripción</th>
									<th className="px-5 py-3 text-right">Valor</th>
									<th className="px-5 py-3 text-right">Abonado</th>
									<th className="px-5 py-3 text-right">Pendiente</th>
								</tr>
							</thead>
							<tbody>
								{allocations.map((line) => (
									<tr className="border-t border-[#e1e5df]" key={line.id}>
										<td className="px-5 py-4 font-semibold">{line.code}</td>
										<td className="px-5 py-4">
											{line.name}
											<small className="mt-1 block text-[var(--muted)]">
												{line.lineItemCount} conceptos presupuestados
											</small>
											<div className="mt-2 flex max-w-sm items-center gap-2">
												<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5e9e4]">
													<div
														className="h-full rounded-full bg-[var(--success)]"
														style={{ width: `${line.coverage}%` }}
													/>
												</div>
												<small className="w-11 text-right font-semibold tabular-nums text-[#52605b]">
													{line.coverage.toFixed(0)}%
												</small>
											</div>
										</td>
										<td className="px-5 py-4 text-right tabular-nums">
											{currencyFormatter.format(line.total.toNumber())}
										</td>
										<td className="px-5 py-4 text-right font-semibold tabular-nums text-[var(--success)]">
											{currencyFormatter.format(line.paid)}
										</td>
										<td className="px-5 py-4 text-right font-semibold tabular-nums">
											{currencyFormatter.format(line.pending)}
										</td>
									</tr>
								))}
								{allocations.length === 0 ? (
									<tr>
										<td
											className="px-5 py-10 text-center text-[var(--muted)]"
											colSpan={5}
										>
											Aprueba una versión del presupuesto para aplicar abonos
											por renglón.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
					<div className="grid gap-3 p-4 md:hidden">
						{allocations.map((line) => (
							<div
								className="rounded-2xl border border-[#e1e5df] bg-[#f9faf8] p-4"
								key={line.id}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<strong>{line.code}</strong>
										<p className="mt-0.5 text-sm text-[var(--muted)]">
											{line.name}
										</p>
										<small className="text-[var(--muted)]">
											{line.lineItemCount} conceptos presupuestados
										</small>
									</div>
									<span className="shrink-0 font-semibold tabular-nums text-[#52605b]">
										{line.coverage.toFixed(0)}%
									</span>
								</div>
								<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e9e4]">
									<div
										className="h-full rounded-full bg-[var(--success)]"
										style={{ width: `${line.coverage}%` }}
									/>
								</div>
								<dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
									<div>
										<dt>Valor</dt>
										<dd className="mt-1 font-bold tabular-nums text-[var(--foreground)]">
											{currencyFormatter.format(line.total.toNumber())}
										</dd>
									</div>
									<div>
										<dt>Abonado</dt>
										<dd className="mt-1 font-bold tabular-nums text-[var(--success)]">
											{currencyFormatter.format(line.paid)}
										</dd>
									</div>
									<div>
										<dt>Pendiente</dt>
										<dd className="mt-1 font-bold tabular-nums text-[var(--foreground)]">
											{currencyFormatter.format(line.pending)}
										</dd>
									</div>
								</dl>
							</div>
						))}
						{allocations.length === 0 ? (
							<p className="py-8 text-center text-sm text-[var(--muted)]">
								Aprueba una versión del presupuesto para aplicar abonos por
								renglón.
							</p>
						) : null}
					</div>
				</section>

				<section
					className={`${panelClass} overflow-hidden`}
					key="account-statement"
				>
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd5ce] px-5 py-4">
						<div className="flex items-center gap-3">
							<span className="grid size-10 place-items-center rounded-md bg-[#f2f4f0] text-[var(--steel)]">
								<FileText aria-hidden="true" size={18} />
							</span>
							<div>
								<h2 className="text-xl font-semibold">Estado de cuenta</h2>
							</div>
						</div>
					</div>
					<FinanceStatementSummary
						additionalWork={classifiedExpenseTotal(validExpenses, [
							"adicional",
						])}
						asOf={statementDate}
						budget={totalBudget}
						budgetRemaining={budgetDifference}
						cashBalance={availableBalance}
						customerPayments={payments
							.filter((payment) => payment.status === "REGISTERED")
							.map((payment) => ({
								id: payment.id,
								paymentNumber: payment.paymentNumber,
								paymentDate: payment.paymentDate,
								amount: payment.amount.toNumber(),
								method: payment.method,
								reference: payment.reference,
							}))}
						externalExpenses={classifiedExpenseTotal(validExpenses, [
							"externo",
							"distinto de obra",
						])}
						phaseTotals={phaseTotals}
						supervision={classifiedExpenseTotal(validExpenses, [
							"supervisión",
							"supervision",
						])}
						supplierPaid={totalPaidToSuppliers}
						supplierPending={totalPayable}
						totalSpent={totalExpenses}
					/>
					<div className="border-t border-[#dfe4df] bg-white p-5">
						<div className="mb-4">
							<h3 className="font-semibold text-[#172023]">
								Detalle de compras y comprobantes
							</h3>
							<p className="mt-1 text-sm text-[var(--muted)]">
								Consulta cada gasto y abre su factura o recibo desde el folio.
							</p>
						</div>
						<div className="overflow-x-auto">
							<AccountStatement
								canRegister={canRegister}
								documentPreviews={expenseDocumentPreviews}
								projectName={selectedProject?.name ?? "PROYECTO"}
								projectId={selectedProjectId}
								expenses={expenses}
							/>
						</div>
					</div>
				</section>

				<section
					className={`${panelClass} overflow-hidden`}
					key="supplier-payables"
				>
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd5ce] px-5 py-4">
						<div className="flex items-center gap-3">
							<span className="grid size-10 place-items-center rounded-md bg-[#f2f4f0] text-[var(--steel)]">
								<CreditCard aria-hidden="true" size={18} />
							</span>
							<div>
								<h2 className="text-xl font-semibold">
									Cuentas por pagar a proveedor
								</h2>
								<p className="text-sm text-[var(--muted)]">
									Pagado {currencyFormatter.format(totalPaidToSuppliers)} de{" "}
									{currencyFormatter.format(
										totalPaidToSuppliers + totalPayable,
									)}{" "}
									comprado &middot; pendiente{" "}
									{currencyFormatter.format(totalPayable)}
								</p>
							</div>
						</div>
					</div>
					<div className="hidden overflow-x-auto md:block">
						<table className="w-full min-w-[1020px] border-collapse text-sm">
							<thead className="bg-[#f3f5f1] text-left text-xs uppercase tracking-[0.06em] text-[#58635f]">
								<tr>
									<th className="px-5 py-3">Compra</th>
									<th className="px-5 py-3">Proveedor</th>
									<th className="px-5 py-3">Vencimiento</th>
									<th className="px-5 py-3 text-right">Comprado</th>
									<th className="px-5 py-3 text-right">Pagado</th>
									<th className="px-5 py-3 text-right">Pendiente</th>
									{canRegister ? (
										<th className="px-5 py-3">Registrar pago</th>
									) : null}
								</tr>
							</thead>
							<tbody>
								{payables.map(({ expense, paid, pending, estimatedTotal }) => (
									<tr
										className="border-t border-[#e1e5df] align-top transition hover:bg-[#fbfaf6]"
										key={expense.id}
									>
										<td className="px-5 py-4">
											<p className="font-medium">{expense.description}</p>
											<p className="text-xs text-[var(--muted)]">
												{expense.purchaseOrder
													? `${expense.purchaseOrder.number} · `
													: ""}
												{expense.documentNumber ?? "Sin documento"}
											</p>
											{estimatedTotal !== null ? (
												<p className="mt-1 text-xs text-[var(--muted)]">
													Estimado{" "}
													{currencyFormatter.format(estimatedTotal.toNumber())}{" "}
													&middot; variacion{" "}
													<span
														className={
															expense.subtotal.gt(estimatedTotal)
																? "font-semibold text-[var(--danger)]"
																: "font-semibold text-[var(--success)]"
														}
													>
														{currencyFormatter.format(
															expense.subtotal.sub(estimatedTotal).toNumber(),
														)}
													</span>
												</p>
											) : null}
											{expense.supplierPayments.some(
												(payment) => payment.status === "REGISTERED",
											) ? (
												<details className="mt-2 rounded-lg border border-[#dfe4df] bg-[#f7f9f6] px-2.5 py-2 text-xs">
													<summary className="cursor-pointer font-semibold text-[#43504c]">
														Registro de pagos (
														{
															expense.supplierPayments.filter(
																(payment) => payment.status === "REGISTERED",
															).length
														}
														)
													</summary>
													<div className="mt-2 grid gap-1.5">
														{expense.supplierPayments
															.filter(
																(payment) => payment.status === "REGISTERED",
															)
															.map((payment) => (
																<div
																	className="flex items-center justify-between gap-3 border-t border-[#e2e7e2] pt-1.5"
																	key={payment.id}
																>
																	<span>
																		{payment.paymentNumber} ·{" "}
																		{dateFormatter.format(payment.paymentDate)}
																	</span>
																	<strong className="tabular-nums text-[var(--success)]">
																		{currencyFormatter.format(
																			payment.amount.toNumber(),
																		)}
																	</strong>
																</div>
															))}
													</div>
												</details>
											) : null}
										</td>
										<td className="px-5 py-4">
											{expense.supplier?.businessName ?? expense.vendor ?? "-"}
										</td>
										<td className="px-5 py-4">
											{expense.purchaseOrder?.paymentType === "CREDIT" &&
											expense.purchaseOrder.paymentDueDate ? (
												<div className="grid gap-1">
													<span className="font-medium">
														{dateFormatter.format(
															expense.purchaseOrder.paymentDueDate,
														)}
													</span>
													{pending.gt(0) &&
													new Date(expense.purchaseOrder.paymentDueDate) <
														new Date(`${today}T00:00:00.000Z`) ? (
														<span className="w-fit rounded-full bg-[#fdebed] px-2 py-0.5 text-[11px] font-semibold text-[#a81929]">
															Vencida
														</span>
													) : pending.gt(0) ? (
														<span className="text-xs text-[var(--muted)]">
															Por pagar
														</span>
													) : (
														<span className="text-xs font-semibold text-[var(--success)]">
															Pagada
														</span>
													)}
												</div>
											) : (
												<span className="text-[var(--muted)]">No aplica</span>
											)}
										</td>
										<td className="px-5 py-4 text-right font-semibold tabular-nums">
											{currencyFormatter.format(expense.subtotal.toNumber())}
										</td>
										<td className="px-5 py-4 text-right tabular-nums">
											{currencyFormatter.format(paid.toNumber())}
										</td>
										<td className="px-5 py-4 text-right font-semibold tabular-nums">
											{pending.gt(0) ? (
												<span
													className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paid.gt(0) ? "bg-[#fff0cf] text-[#825600]" : "bg-[#fdebed] text-[#a81929]"}`}
												>
													{paid.gt(0) ? "Parcial · " : "Pendiente · "}
													{currencyFormatter.format(pending.toNumber())}
												</span>
											) : (
												<span className="rounded-full bg-[#e5f5ed] px-2.5 py-1 text-xs font-semibold text-[#126348]">
													Pagado
												</span>
											)}
										</td>
										{canRegister ? (
											<td className="px-5 py-4">
												{pending.gt(0) ? (
													<SupplierPaymentDialog
														description={expense.description}
														expenseId={expense.id}
														pending={pending.toFixed(2)}
														projectId={selectedProjectId}
														provider={
															expense.supplier?.businessName ??
															expense.vendor ??
															"Proveedor no indicado"
														}
														today={today}
													/>
												) : null}
											</td>
										) : null}
									</tr>
								))}
								{payables.length === 0 ? (
									<tr>
										<td
											className="px-5 py-12 text-center text-[var(--muted)]"
											colSpan={canRegister ? 7 : 6}
										>
											Sin compras registradas.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
					<div className="grid gap-3 p-4 md:hidden">
						{payables.map(({ expense, paid, pending, estimatedTotal }) => (
							<div
								className="rounded-2xl border border-[#e1e5df] bg-[#f9faf8] p-4"
								key={expense.id}
							>
								<p className="font-medium">{expense.description}</p>
								<p className="text-xs text-[var(--muted)]">
									{expense.supplier?.businessName ?? expense.vendor ?? "-"}
								</p>
								{estimatedTotal !== null ? (
									<p className="mt-1 text-xs text-[var(--muted)]">
										Estimado{" "}
										{currencyFormatter.format(estimatedTotal.toNumber())}
									</p>
								) : null}
								{expense.purchaseOrder?.paymentType === "CREDIT" &&
								expense.purchaseOrder.paymentDueDate ? (
									<p className="mt-2 text-xs">
										Vence{" "}
										<span className="font-medium">
											{dateFormatter.format(
												expense.purchaseOrder.paymentDueDate,
											)}
										</span>
										{pending.gt(0) &&
										new Date(expense.purchaseOrder.paymentDueDate) <
											new Date(`${today}T00:00:00.000Z`) ? (
											<span className="ml-2 rounded-full bg-[#fdebed] px-2 py-0.5 text-[11px] font-semibold text-[#a81929]">
												Vencida
											</span>
										) : null}
									</p>
								) : null}
								<dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
									<div>
										<dt>Comprado</dt>
										<dd className="mt-1 font-bold tabular-nums text-[var(--foreground)]">
											{currencyFormatter.format(expense.subtotal.toNumber())}
										</dd>
									</div>
									<div>
										<dt>Pagado</dt>
										<dd className="mt-1 font-bold tabular-nums text-[var(--foreground)]">
											{currencyFormatter.format(paid.toNumber())}
										</dd>
									</div>
									<div>
										<dt>Pendiente</dt>
										<dd
											className={`mt-1 font-bold tabular-nums ${pending.gt(0) ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
										>
											{pending.gt(0)
												? currencyFormatter.format(pending.toNumber())
												: "Pagado"}
										</dd>
									</div>
								</dl>
								{canRegister && pending.gt(0) ? (
									<div className="mt-3">
										<SupplierPaymentDialog
											description={expense.description}
											expenseId={expense.id}
											pending={pending.toFixed(2)}
											projectId={selectedProjectId}
											provider={
												expense.supplier?.businessName ??
												expense.vendor ??
												"Proveedor no indicado"
											}
											today={today}
										/>
									</div>
								) : null}
							</div>
						))}
						{payables.length === 0 ? (
							<p className="py-8 text-center text-sm text-[var(--muted)]">
								Sin compras registradas.
							</p>
						) : null}
					</div>
				</section>

				<section
					className={`${panelClass} overflow-hidden`}
					key="client-payments"
				>
					<div className="border-b border-[#cfd5ce] px-5 py-4">
						<h2 className="text-xl font-semibold">
							Abonos del cliente (ingresos)
						</h2>
					</div>
					<div className="hidden overflow-x-auto md:block">
						<table className="w-full min-w-[760px] border-collapse text-sm">
							<thead className="bg-[#f3f5f1] text-left text-xs uppercase tracking-[0.06em] text-[#58635f]">
								<tr>
									<th className="px-5 py-3">No.</th>
									<th className="px-5 py-3">Fecha</th>
									<th className="px-5 py-3">Medio</th>
									<th className="px-5 py-3">Aplicación</th>
									<th className="px-5 py-3">Referencia</th>
									<th className="px-5 py-3 text-right">Monto</th>
								</tr>
							</thead>
							<tbody>
								{payments.map((payment) => (
									<tr
										className="border-t border-[#e1e5df] transition hover:bg-[#fbfaf6]"
										key={payment.id}
									>
										<td className="px-5 py-4 font-semibold">
											{payment.paymentNumber}
										</td>
										<td className="px-5 py-4">
											{dateFormatter.format(payment.paymentDate)}
										</td>
										<td className="px-5 py-4">{payment.method ?? "-"}</td>
										<td className="px-5 py-4">
											{payment.budgetSection
												? `Renglón ${payment.budgetSection.code} · ${payment.budgetSection.name}`
												: "General"}
											{payment.concept ? (
												<small className="mt-1 block text-[var(--muted)]">
													{payment.concept}
												</small>
											) : null}
										</td>
										<td className="px-5 py-4">{payment.reference ?? "-"}</td>
										<td className="px-5 py-4 text-right font-semibold tabular-nums">
											{currencyFormatter.format(payment.amount.toNumber())}
										</td>
									</tr>
								))}
								{payments.length === 0 ? (
									<tr>
										<td
											className="px-5 py-12 text-center text-[var(--muted)]"
											colSpan={6}
										>
											Sin abonos registrados.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
					<div className="grid gap-3 p-4 md:hidden">
						{payments.map((payment) => (
							<div
								className="rounded-2xl border border-[#e1e5df] bg-[#f9faf8] p-4"
								key={payment.id}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<strong>{payment.paymentNumber}</strong>
										<p className="mt-0.5 text-xs text-[var(--muted)]">
											{dateFormatter.format(payment.paymentDate)}
											{payment.method ? ` · ${payment.method}` : ""}
										</p>
									</div>
									<span className="shrink-0 font-bold tabular-nums text-[var(--foreground)]">
										{currencyFormatter.format(payment.amount.toNumber())}
									</span>
								</div>
								<p className="mt-2 text-xs text-[var(--muted)]">
									{payment.budgetSection
										? `Renglón ${payment.budgetSection.code} · ${payment.budgetSection.name}`
										: "General"}
								</p>
								{payment.concept ? (
									<p className="mt-1 text-xs text-[var(--muted)]">
										{payment.concept}
									</p>
								) : null}
								{payment.reference ? (
									<p className="mt-1 text-xs text-[var(--muted)]">
										Ref. {payment.reference}
									</p>
								) : null}
							</div>
						))}
						{payments.length === 0 ? (
							<p className="py-8 text-center text-sm text-[var(--muted)]">
								Sin abonos registrados.
							</p>
						) : null}
					</div>
				</section>
			</FinanceWorkspaceTabs>
		</main>
	);
}
