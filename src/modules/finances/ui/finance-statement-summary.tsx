import { Banknote, CalendarDays, CheckCircle2, Landmark, Scale, WalletCards } from "lucide-react";

const currency = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" });
const date = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });

type PaymentRow = { id: string; paymentNumber: string; paymentDate: Date; amount: number; method: string | null; reference: string | null };
type PhaseRow = { name: string; total: number };
export type FinanceStatementSummaryProps = {
	asOf: Date; budget: number; budgetRemaining: number; cashBalance: number; customerPayments: PaymentRow[]; additionalWork: number; externalExpenses: number; phaseTotals: PhaseRow[]; supervision: number; supplierPaid: number; supplierPending: number; totalSpent: number;
};

function ProgressBar({ value }: { value: number }) {
	const width = Math.max(0, Math.min(100, value));
	return <div className="h-2 overflow-hidden rounded-full bg-[#e2e7e3]"><div className="h-full rounded-full bg-[var(--brand-red)] transition-[width] duration-500 ease-out" style={{ width: `${width}%` }} /></div>;
}

function StatementHeader({ asOf }: { asOf: Date }) {
	return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe4df] px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#eaf2ee] text-[#2a5f4d]"><CalendarDays size={18} /></span><div><h3 className="font-semibold text-[#172023]">Estado financiero a la fecha</h3><p className="text-xs text-[#68756f]">Corte {date.format(asOf)}</p></div></div><span className="rounded-full bg-[#edf2ef] px-3 py-1 text-xs font-semibold text-[#52615c]">Cifras conciliadas</span></header>;
}

function AmountRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
	return <div className="flex items-center justify-between gap-4 border-t border-[#e3e7e3] py-2.5"><span className="text-sm text-[#5f6c67]">{label}</span><span className={`tabular-nums text-[#172023] ${strong ? "font-bold" : "font-semibold"}`}>{currency.format(value)}</span></div>;
}

export function FinanceStatementSummary(props: FinanceStatementSummaryProps) {
	const { asOf, budget, budgetRemaining, cashBalance, customerPayments, additionalWork, externalExpenses, phaseTotals, supervision, supplierPaid, supplierPending, totalSpent } = props;
	const totalReceived = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);
	const execution = budget > 0 ? (totalSpent / budget) * 100 : 0;
	const checks = [
		Math.abs(totalSpent - supplierPaid - supplierPending) <= 0.01,
		Math.abs(cashBalance - totalReceived + supplierPaid) <= 0.01,
		Math.abs(budgetRemaining - budget + totalSpent) <= 0.01,
	];
	const classifications = [["Supervisión", supervision], ["Trabajos adicionales", additionalWork], ["Gastos externos", externalExpenses]].filter(([, value]) => Number(value) !== 0) as [string, number][];

	return <div className="finance-statement-dashboard space-y-4 border-t border-[#dfe4df] bg-[#f3f5f2] p-4 sm:p-5">
		<section className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_rgba(22,27,29,0.09)]">
			<StatementHeader asOf={asOf} />
			<div className="grid gap-0 xl:grid-cols-2">
				<div className="p-5 xl:border-r xl:border-[#dfe4df]">
					<div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.07em] text-[#67746f]">Posición presupuestaria</p><p className="mt-1 text-sm text-[#78837f]">Disponible para continuar la obra</p></div><Landmark className="text-[#65736e]" size={20} /></div>
					<strong className={`mt-5 block text-3xl tabular-nums ${budgetRemaining < 0 ? "text-[#b22230]" : "text-[#176f54]"}`}>{currency.format(budgetRemaining)}</strong>
					<div className="mt-5"><div className="mb-2 flex justify-between text-xs text-[#68756f]"><span>Ejecución comprometida</span><strong>{execution.toFixed(1)}%</strong></div><ProgressBar value={execution} /></div>
					<div className="mt-4"><AmountRow label="Presupuesto aprobado" value={budget} /><AmountRow label="Compras y gastos válidos" value={totalSpent} strong /></div>
				</div>
				<div className="border-t border-[#dfe4df] p-5 xl:border-t-0">
					<div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.07em] text-[#67746f]">Flujo de caja</p><p className="mt-1 text-sm text-[#78837f]">Dinero recibido menos salidas pagadas</p></div><WalletCards className="text-[#65736e]" size={20} /></div>
					<strong className={`mt-5 block text-3xl tabular-nums ${cashBalance < 0 ? "text-[#b22230]" : "text-[#172023]"}`}>{currency.format(cashBalance)}</strong>
					<div className="mt-5"><AmountRow label="Abonado por el cliente" value={totalReceived} /><AmountRow label="Pagado a proveedores" value={supplierPaid} /></div>
					<div className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${supplierPending > 0 ? "bg-[#fff0f2] text-[#a82431]" : "bg-[#eaf7f0] text-[#176f54]"}`}><span className="text-sm font-semibold">Pendiente a proveedores</span><strong className="tabular-nums">{currency.format(supplierPending)}</strong></div>
				</div>
			</div>
		</section>

		<div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
			<section className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_rgba(22,27,29,0.08)]"><header className="flex items-center gap-3 border-b border-[#dfe4df] px-4 py-4"><span className="grid size-9 place-items-center rounded-lg bg-[#edf1ef] text-[#42524c]"><Landmark size={17} /></span><div><h3 className="font-semibold">Costos por etapa o renglón</h3><p className="text-xs text-[#6b7873]">Origen presupuestario de cada costo.</p></div></header><div className="divide-y divide-[#e4e8e3]">{phaseTotals.map((phase, index) => <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3" key={phase.name}><span className="grid size-7 place-items-center rounded-md bg-[#f0f3f1] text-xs font-semibold">{index + 1}</span><span className="text-sm font-medium">{phase.name}</span><strong className="text-sm tabular-nums">{currency.format(phase.total)}</strong></div>)}{phaseTotals.length === 0 ? <p className="px-4 py-8 text-center text-sm text-[#71807a]">Sin costos clasificados.</p> : null}</div></section>

			<section className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_rgba(22,27,29,0.08)]"><header className="flex items-center gap-3 border-b border-[#dfe4df] px-4 py-4"><span className="grid size-9 place-items-center rounded-lg bg-[#e8f6ef] text-[#176f54]"><Banknote size={17} /></span><div><h3 className="font-semibold">Abonos del cliente</h3><p className="text-xs text-[#6b7873]">Ingresos recibidos y su referencia.</p></div></header><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead className="bg-[#f3f6f3] text-left text-[11px] uppercase tracking-[0.06em] text-[#596762]"><tr><th className="px-4 py-3">Abono</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Medio</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3 text-right">Cantidad</th></tr></thead><tbody>{customerPayments.map((payment) => <tr className="border-t border-[#e4e8e3]" key={payment.id}><td className="px-4 py-3 font-semibold">{payment.paymentNumber}</td><td className="px-4 py-3">{date.format(payment.paymentDate)}</td><td className="px-4 py-3">{payment.method ?? "-"}</td><td className="px-4 py-3">{payment.reference ?? "-"}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-[#176f54]">{currency.format(payment.amount)}</td></tr>)}</tbody></table></div>{customerPayments.length === 0 ? <p className="px-4 py-8 text-center text-sm text-[#71807a]">Sin abonos registrados.</p> : null}<div className="flex justify-between border-t border-[#d6ddd7] bg-[#f3f6f3] px-4 py-3 text-sm"><strong>Total recibido</strong><strong className="tabular-nums text-[#176f54]">{currency.format(totalReceived)}</strong></div></section>
		</div>

		<section className="flex flex-col gap-3 rounded-2xl bg-[#172023] px-5 py-4 text-white shadow-[0_14px_34px_rgba(22,27,29,0.16)] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Scale size={18} /><div><h3 className="text-sm font-semibold">Comprobación automática</h3><p className="text-xs text-white/65">Presupuesto, caja y cuentas por pagar.</p></div></div><div className="flex flex-wrap gap-2">{checks.map((valid, index) => <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${valid ? "bg-white/10 text-[#bcebd7]" : "bg-[#c8202f] text-white"}`} key={["Proveedores", "Caja", "Presupuesto"][index]}>{valid ? <CheckCircle2 size={14} /> : null}{["Proveedores", "Caja", "Presupuesto"][index]}: {valid ? "cuadra" : "revisar"}</span>)}</div></section>

		{classifications.length > 0 ? <section className="rounded-2xl bg-white px-5 py-4 shadow-[0_12px_32px_rgba(22,27,29,0.08)]"><h3 className="font-semibold">Costos clasificados</h3><div className="mt-3 grid gap-3 sm:grid-cols-3">{classifications.map(([label, value]) => <AmountRow key={label} label={label} value={value} />)}</div></section> : null}
	</div>;
}

export function FinanceStatementPrintSummary(props: FinanceStatementSummaryProps) {
	const { asOf, budget, budgetRemaining, cashBalance, customerPayments, additionalWork, externalExpenses, phaseTotals, supervision, supplierPaid, supplierPending, totalSpent } = props;
	const totalReceived = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);
	const specialRows = [["Supervisión", supervision], ["Trabajos adicionales", additionalWork], ["Gastos externos de obra", externalExpenses]].filter(([, value]) => Number(value) !== 0) as [string, number][];
	return <div className="finance-print-summary mt-5 space-y-5">
		<style>{`.finance-print-summary table{width:100%;border-collapse:collapse;table-layout:fixed}.finance-print-summary th,.finance-print-summary td{border:1.5px solid #111;padding:3px 5px;font-size:10px;line-height:1.25}.finance-print-summary th{background:#d0d0d0;font-weight:700}.finance-print-summary .title{font-size:13px;text-align:center}.finance-print-summary .no-col{width:34px}.finance-print-summary .money-col{width:170px}.finance-print-summary .payment-amount-col{width:150px}.finance-print-summary .label{font-weight:700}.finance-print-summary .money{text-align:right;white-space:nowrap}.finance-print-summary .blue{background:#c9edf8}.finance-print-summary .green{background:#dcefd2}.finance-print-summary .yellow{background:#ffe55c}.finance-print-summary .total{background:#55c3dd;font-weight:700}.finance-print-summary section{break-inside:avoid}@media print{.finance-print-summary{margin-top:12px!important;gap:12px}.finance-print-summary th,.finance-print-summary td{font-size:8px;padding:2px 3px}.finance-print-summary .title{font-size:10px}.finance-print-summary .no-col{width:28px}.finance-print-summary .money-col{width:125px}.finance-print-summary .payment-amount-col{width:110px}}`}</style>
		<section><table aria-label="Estado financiero a la fecha"><colgroup><col className="no-col" /><col /><col className="money-col" /></colgroup><thead><tr><th className="title" colSpan={3}>ESTADO FINANCIERO A LA FECHA {date.format(asOf).toUpperCase()}</th></tr><tr><th>No.</th><th>DESCRIPCIÓN</th><th>MONTO</th></tr></thead><tbody>{[
			["Presupuesto aprobado", budget, ""], ["Compras y gastos registrados", totalSpent, "blue"], ["Pagado a proveedores", supplierPaid, ""], ["Pendiente a proveedores", supplierPending, "yellow"], ["Total abonado por el cliente", totalReceived, "green"], ["Saldo disponible en caja", cashBalance, cashBalance < 0 ? "yellow" : "green"], ["Presupuesto disponible", budgetRemaining, "total"],
		].map(([label, value, className], index) => <tr key={String(label)}><td className="text-center">{index + 1}</td><td className={`label ${className}`}>{label}</td><td className={`money ${className}`}>{currency.format(Number(value))}</td></tr>)}</tbody></table></section>

		<section><table aria-label="Costo por etapa o renglón"><colgroup><col className="no-col" /><col /><col className="money-col" /></colgroup><thead><tr><th className="title" colSpan={3}>COSTOS POR ETAPA O RENGLÓN</th></tr><tr><th>No.</th><th>ETAPA O RENGLÓN</th><th>SUB TOTAL</th></tr></thead><tbody>{phaseTotals.length ? phaseTotals.map((phase, index) => <tr key={phase.name}><td className="text-center">{index + 1}</td><td className="blue">{phase.name}</td><td className="money">{currency.format(phase.total)}</td></tr>) : <tr><td colSpan={3} className="text-center">Sin costos clasificados.</td></tr>}<tr><th colSpan={2} className="text-right">TOTAL COMPROMETIDO</th><th className="money total">{currency.format(totalSpent)}</th></tr></tbody></table></section>

		<section><table aria-label="Abonos del cliente"><colgroup><col className="no-col" /><col /><col /><col /><col /><col className="payment-amount-col" /></colgroup><thead><tr><th className="title" colSpan={6}>CONSOLIDADO DE ABONOS DEL CLIENTE</th></tr><tr><th>No.</th><th>ABONO</th><th>FECHA</th><th>MEDIO</th><th>REFERENCIA</th><th>CANTIDAD</th></tr></thead><tbody>{customerPayments.length ? customerPayments.map((payment, index) => <tr key={payment.id}><td className="text-center">{index + 1}</td><td>{payment.paymentNumber}</td><td className="text-center">{date.format(payment.paymentDate)}</td><td>{payment.method ?? "-"}</td><td>{payment.reference ?? "-"}</td><td className="money">{currency.format(payment.amount)}</td></tr>) : <tr><td colSpan={6} className="text-center">Sin abonos registrados.</td></tr>}<tr><th colSpan={5} className="text-right">TOTAL ABONADO</th><th className="money green">{currency.format(totalReceived)}</th></tr></tbody></table></section>

		{specialRows.length ? <section><table aria-label="Clasificación de costos"><colgroup><col className="no-col" /><col /><col className="money-col" /></colgroup><thead><tr><th className="title" colSpan={3}>CLASIFICACIÓN DE COSTOS ESPECIALES</th></tr><tr><th>No.</th><th>DESCRIPCIÓN FINANCIERA</th><th>MONTO</th></tr></thead><tbody>{specialRows.map(([label, value], index) => <tr key={label}><td className="text-center">{index + 1}</td><td>{label}</td><td className="money">{currency.format(value)}</td></tr>)}</tbody></table></section> : null}
	</div>;
}
