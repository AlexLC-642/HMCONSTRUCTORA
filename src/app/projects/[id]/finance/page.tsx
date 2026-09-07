import { ArrowLeft, Banknote, ReceiptText, WalletCards } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { getProjectDashboard } from "@/modules/projects/application/dashboard";
import { moneyCompact, moneyFull, percent } from "@/shared/ui/charts/format";

function formatDate(value?: Date | null) {
	return value
		? new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" }).format(value)
		: "Sin fecha";
}

export default async function ProjectFinancePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requirePermission("finanzas.ver");
	const { id } = await params;
	const dashboard = await getProjectDashboard(id);
	if (!dashboard) notFound();

	const budgetTotal = dashboard.budget.total;
	const spent = dashboard.budget.spent;
	const paid = dashboard.budget.paid;
	const execution = budgetTotal > 0 ? (spent / budgetTotal) * 100 : 0;
	const metricCards = [
		{
			label: "Presupuesto",
			value: moneyCompact(budgetTotal),
			icon: WalletCards,
		},
		{ label: "Ejecutado", value: moneyCompact(spent), icon: Banknote },
		{ label: "Abonado", value: moneyCompact(paid), icon: ReceiptText },
		{
			label: "Saldo",
			value: moneyFull(dashboard.budget.balance),
			icon: WalletCards,
		},
	];

	return (
		<main className="mx-auto max-w-7xl space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Finanzas del proyecto</h1>
					<p className="text-sm text-[var(--muted)]">
						{dashboard.project.code} - {dashboard.project.name}
					</p>
				</div>
				<a
					className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm"
					href={`/projects/${id}`}
				>
					<ArrowLeft size={16} />
					Resumen
				</a>
			</div>
			<section className="kpi-grid grid gap-3 md:grid-cols-4">
				{metricCards.map((card) => {
					const ItemIcon = card.icon;
					return (
						<div className="project-panel" key={card.label}>
							<ItemIcon className="mb-3 text-[var(--brand-red)]" size={20} />
							<p className="text-xs font-bold uppercase text-[var(--muted)]">
								{card.label}
							</p>
							<p className="mt-1 text-2xl font-semibold">{card.value}</p>
						</div>
					);
				})}
			</section>
			<section className="project-panel">
				<div className="project-panel-header">
					<div>
						<h2>Ejecución presupuestaria</h2>
						<p>{percent(execution)} del presupuesto vigente ejecutado.</p>
					</div>
					<a href={`/finances?projectId=${id}`}>Estado de cuenta</a>
				</div>
				<div className="h-5 overflow-hidden rounded-full bg-[#e8e9e4]">
					<span
						className="block h-full rounded-full bg-[var(--safety)]"
						style={{ width: `${Math.max(0, Math.min(100, execution))}%` }}
					/>
				</div>
			</section>
			<section className="grid gap-4 lg:grid-cols-2">
				<article className="project-panel overflow-hidden p-0">
					<div className="px-5 py-4">
						<h2 className="text-lg font-semibold">Gastos recientes</h2>
					</div>
					{dashboard.finance.expenses.map((expense) => (
						<div
							className="flex justify-between border-t border-[var(--border)] px-5 py-3 text-sm"
							key={expense.id}
						>
							<span>
								{expense.description}
								<br />
								<small className="text-[var(--muted)]">
									{formatDate(expense.expenseDate)}
								</small>
							</span>
							<strong>{moneyFull(expense.subtotal.toNumber())}</strong>
						</div>
					))}
					{dashboard.finance.expenses.length === 0 ? (
						<p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
							Sin gastos registrados.
						</p>
					) : null}
				</article>
				<article className="project-panel overflow-hidden p-0">
					<div className="px-5 py-4">
						<h2 className="text-lg font-semibold">Abonos recientes</h2>
					</div>
					{dashboard.finance.payments.map((payment) => (
						<div
							className="flex justify-between border-t border-[var(--border)] px-5 py-3 text-sm"
							key={payment.id}
						>
							<span>
								{payment.paymentNumber}
								<br />
								<small className="text-[var(--muted)]">
									{formatDate(payment.paymentDate)}
								</small>
							</span>
							<strong>{moneyFull(payment.amount.toNumber())}</strong>
						</div>
					))}
					{dashboard.finance.payments.length === 0 ? (
						<p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
							Sin abonos registrados.
						</p>
					) : null}
				</article>
			</section>
		</main>
	);
}
