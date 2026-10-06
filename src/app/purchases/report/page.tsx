import type { Metadata } from "next";
import { requirePermission } from "@/modules/auth/application/authorization";
import { getCompanyInvoices } from "@/modules/purchases/application/company-invoices";
import { PrintActions } from "@/shared/ui/print-actions";
import { PrintDocumentHeader } from "@/shared/ui/print-document-header";

export const metadata: Metadata = {
	title: "Compras de la compañía | HM Constructora",
};

const money = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const shortDate = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat("es-GT", {
	dateStyle: "long",
	timeZone: "UTC",
});
const paymentLabels: Record<string, string> = {
	IMMEDIATE: "Al contado",
	ON_DELIVERY: "Contra entrega",
	CREDIT: "Crédito",
};

function validDay(value: string | undefined) {
	return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function CompanyPurchasesReportPage({
	searchParams,
}: {
	searchParams: Promise<{ from?: string; to?: string }>;
}) {
	await requirePermission("compras.ver");
	const params = await searchParams;
	const from = validDay(params.from);
	const to = validDay(params.to);
	const { invoices, bySupplier, total } = await getCompanyInvoices({
		from,
		to,
	});
	const period =
		from && to
			? `${longDate.format(new Date(`${from}T00:00:00Z`))} al ${longDate.format(new Date(`${to}T00:00:00Z`))}`
			: from
				? `Desde ${longDate.format(new Date(`${from}T00:00:00Z`))}`
				: to
					? `Hasta ${longDate.format(new Date(`${to}T00:00:00Z`))}`
					: "Todo el historial";

	return (
		<>
			<PrintActions backHref="/purchases?view=invoices" />
			<main className="print-surface mx-auto max-w-[8.5in] bg-white px-8 py-6 text-[#111] print:p-0">
				<style>{`@page { size: letter portrait; margin: 0.35in; } @media print { body { background: white; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }`}</style>
				<PrintDocumentHeader
					details={[
						{ label: "Periodo", value: period },
						{
							label: "Emitido",
							value: new Intl.DateTimeFormat("es-GT", {
								dateStyle: "long",
							}).format(new Date()),
						},
						{
							label: "Alcance",
							value:
								"Facturas de compras para bodega. No incluye gastos de proyectos.",
							wide: true,
						},
					]}
					documentMeta={[]}
					documentTitle="Compras de la compañía"
					projectName="HM Constructora"
				/>

				<section className="mb-5 grid grid-cols-3 border border-[#cfd5d2] text-[12px]">
					<div className="border-r border-[#cfd5d2] p-3">
						<p className="text-[#5d6a66]">Facturas</p>
						<p className="mt-1 text-[18px] font-bold tabular-nums">
							{invoices.length}
						</p>
					</div>
					<div className="border-r border-[#cfd5d2] p-3">
						<p className="text-[#5d6a66]">Proveedores</p>
						<p className="mt-1 text-[18px] font-bold tabular-nums">
							{bySupplier.length}
						</p>
					</div>
					<div className="p-3">
						<p className="text-[#5d6a66]">Total facturado</p>
						<p className="mt-1 text-[18px] font-bold tabular-nums">
							{money.format(total)}
						</p>
					</div>
				</section>

				<h2 className="mb-2 text-[13px] font-bold">Detalle de facturas</h2>
				<table className="w-full border-collapse text-[11px]">
					<thead>
						<tr className="bg-[#eef1ef] text-left">
							<th className="border border-[#cfd5d2] px-2 py-1.5">Fecha</th>
							<th className="border border-[#cfd5d2] px-2 py-1.5">Factura</th>
							<th className="border border-[#cfd5d2] px-2 py-1.5">Proveedor</th>
							<th className="border border-[#cfd5d2] px-2 py-1.5">Orden</th>
							<th className="border border-[#cfd5d2] px-2 py-1.5">Bodega</th>
							<th className="border border-[#cfd5d2] px-2 py-1.5">Pago</th>
							<th className="border border-[#cfd5d2] px-2 py-1.5 text-right">
								Monto
							</th>
						</tr>
					</thead>
					<tbody>
						{invoices.length === 0 ? (
							<tr>
								<td
									className="border border-[#cfd5d2] px-2 py-4 text-center text-[#5d6a66]"
									colSpan={7}
								>
									No hay facturas de la compañía en este periodo.
								</td>
							</tr>
						) : (
							invoices.map((invoice) => (
								<tr key={invoice.id}>
									<td className="whitespace-nowrap border border-[#cfd5d2] px-2 py-1.5 tabular-nums">
										{shortDate.format(new Date(invoice.date))}
									</td>
									<td className="whitespace-nowrap border border-[#cfd5d2] px-2 py-1.5 font-semibold">
										{invoice.number ?? "Sin número"}
									</td>
									<td className="border border-[#cfd5d2] px-2 py-1.5">
										{invoice.supplier}
										{invoice.supplierTaxId ? (
											<span className="block text-[10px] text-[#5d6a66]">
												NIT {invoice.supplierTaxId}
											</span>
										) : null}
									</td>
									<td className="whitespace-nowrap border border-[#cfd5d2] px-2 py-1.5">
										{invoice.orderNumber ?? "—"}
									</td>
									<td className="border border-[#cfd5d2] px-2 py-1.5">
										{invoice.warehouse ?? "—"}
									</td>
									<td className="whitespace-nowrap border border-[#cfd5d2] px-2 py-1.5">
										{invoice.paymentType
											? (paymentLabels[invoice.paymentType] ??
												invoice.paymentType)
											: "—"}
									</td>
									<td className="whitespace-nowrap border border-[#cfd5d2] px-2 py-1.5 text-right tabular-nums">
										{money.format(invoice.amount)}
									</td>
								</tr>
							))
						)}
					</tbody>
					{invoices.length > 0 ? (
						<tfoot>
							<tr className="font-bold">
								<td
									className="border border-[#cfd5d2] px-2 py-1.5 text-right"
									colSpan={6}
								>
									Total
								</td>
								<td className="whitespace-nowrap border border-[#cfd5d2] px-2 py-1.5 text-right tabular-nums">
									{money.format(total)}
								</td>
							</tr>
						</tfoot>
					) : null}
				</table>

				{bySupplier.length > 0 ? (
					<>
						<h2 className="mt-6 mb-2 text-[13px] font-bold">Por proveedor</h2>
						<table className="w-full border-collapse text-[11px]">
							<thead>
								<tr className="bg-[#eef1ef] text-left">
									<th className="border border-[#cfd5d2] px-2 py-1.5">
										Proveedor
									</th>
									<th className="border border-[#cfd5d2] px-2 py-1.5 text-right">
										Facturas
									</th>
									<th className="border border-[#cfd5d2] px-2 py-1.5 text-right">
										Total
									</th>
									<th className="border border-[#cfd5d2] px-2 py-1.5 text-right">
										% del periodo
									</th>
								</tr>
							</thead>
							<tbody>
								{bySupplier.map((row) => (
									<tr key={row.supplier}>
										<td className="border border-[#cfd5d2] px-2 py-1.5">
											{row.supplier}
										</td>
										<td className="border border-[#cfd5d2] px-2 py-1.5 text-right tabular-nums">
											{row.count}
										</td>
										<td className="border border-[#cfd5d2] px-2 py-1.5 text-right tabular-nums">
											{money.format(row.total)}
										</td>
										<td className="border border-[#cfd5d2] px-2 py-1.5 text-right tabular-nums">
											{total > 0
												? `${((row.total / total) * 100).toFixed(1)}%`
												: "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</>
				) : null}
			</main>
		</>
	);
}
