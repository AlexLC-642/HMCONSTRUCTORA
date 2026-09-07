import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { getProjectBudget } from "@/modules/budgets/application/queries";
import {
	budgetUnitLabel,
	persistedLaborLineUsesJornadas,
} from "@/modules/budgets/domain/units";
import { PrintActions } from "@/shared/ui/print-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ZERO = new Prisma.Decimal(0);
const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});

function money(value: { toNumber(): number }) {
	return currencyFormatter.format(value.toNumber());
}

function decimalOrZero(value: Prisma.Decimal | null | undefined) {
	return value ? new Prisma.Decimal(value.toString()) : new Prisma.Decimal(0);
}

function lineSubtotal(line: {
	type: string;
	quantity: Prisma.Decimal;
	unit: string | null;
	days: Prisma.Decimal | null;
	unitPrice: Prisma.Decimal;
}) {
	if (
		line.type === "LABOR" &&
		persistedLaborLineUsesJornadas(line.unit, line.days) &&
		line.days?.gt(0)
	) {
		return line.quantity.mul(line.days).mul(line.unitPrice).toDecimalPlaces(2);
	}

	return line.quantity.mul(line.unitPrice).toDecimalPlaces(2);
}

function sumLines(
	lines: Array<{
		type: string;
		quantity: Prisma.Decimal;
		unit: string | null;
		days: Prisma.Decimal | null;
		unitPrice: Prisma.Decimal;
	}>,
) {
	return lines.reduce((sum, line) => sum.add(lineSubtotal(line)), ZERO);
}

function labelForType(type: string) {
	if (type === "MATERIAL") return "MATERIAL";
	if (type === "LABOR") return "MANO DE OBRA";
	return "OTROS";
}

function categoryTitle(section: { category: string | null; name: string }) {
	return section.category?.trim() || section.name;
}

function hasDays(value: { toNumber(): number } | null) {
	return value ? value.toNumber() > 0 : false;
}

export default async function BudgetPrintPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requirePermission("presupuesto.ver");
	const { id } = await params;
	const budget = await getProjectBudget(id);
	const version =
		budget?.versions.find((item) => item.status === "APPROVED") ??
		budget?.versions[0];

	if (!budget || !version) notFound();

	const financial = {
		lineSubtotal: decimalOrZero(version.lineSubtotal),
		siteManagerCost: decimalOrZero(version.siteManagerCost),
		contingencyPercentage: decimalOrZero(version.contingencyPercentage),
		contingencyAmount: decimalOrZero(version.contingencyAmount),
		subtotal: decimalOrZero(version.subtotal),
		administrationPercentage: decimalOrZero(
			version.administrationPercentage,
		),
		administrationAmount: decimalOrZero(version.administrationAmount),
		profitPercentage: decimalOrZero(version.profitPercentage),
		profitAmount: decimalOrZero(version.profitAmount),
		vatPercentage: decimalOrZero(version.vatPercentage),
		vatAmount: decimalOrZero(version.vatAmount),
		financingPercentage: decimalOrZero(version.financingPercentage),
		financingAmount: decimalOrZero(version.financingAmount),
		grandTotal: decimalOrZero(version.grandTotal),
	};
	const directBase = financial.lineSubtotal.add(financial.siteManagerCost);

	return (
		<>
			<PrintActions backHref={`/projects/${id}/budget`} />
			<main className="print-surface mx-auto max-w-[1120px] bg-white px-8 py-6 text-[#111] print:p-0">
				<style>{`@media print { body { background: white; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } table { page-break-inside: avoid; } section { page-break-inside: avoid; } }`}</style>

				<header className="mb-6 text-xs uppercase">
					<div className="overflow-hidden border-2 border-[#172023]">
						<div className="flex items-center justify-between bg-[#172023] px-4 py-2 text-left text-white">
							<div>
								<p className="font-bold tracking-[0.12em]">HM Constructora</p>
								<p className="mt-0.5 text-[9px] font-medium text-[#c8d4cf]">
									Control de obra
								</p>
							</div>
							<p className="font-bold tracking-[0.08em]">Presupuesto integrado</p>
						</div>
						<p className="px-3 py-1 text-center text-[9px] font-semibold tracking-[0.12em] text-[#52605b]">
							Nombre del proyecto
						</p>
						<h1 className="border-t border-[#172023] bg-[#e9eeeb] px-3 py-1.5 text-center text-base font-bold">
							{budget.project.name}
						</h1>
						<div className="grid grid-cols-2 border-t border-[#172023] text-[10px] normal-case">
							<p className="border-r border-[#172023] px-3 py-1.5">
								<span className="font-bold">Código:</span> {budget.project.code}
							</p>
							<p className="px-3 py-1.5">
								<span className="font-bold">Ubicación:</span>{" "}
								{budget.project.location || "Sin especificar"}
							</p>
							<p className="border-r border-t border-[#172023] px-3 py-1.5">
								<span className="font-bold">Cliente:</span>{" "}
								{budget.project.client?.name || "Sin especificar"}
							</p>
							<p className="border-t border-[#172023] px-3 py-1.5">
								<span className="font-bold">Ejecutor:</span>{" "}
								{version.executorName || "HM Constructora"}
							</p>
						</div>
					</div>
				</header>

				{version.sections.map((section) => {
					const groups = ["MATERIAL", "LABOR", "OTHER"]
						.map((type) => {
							const lines = section.lineItems.filter(
								(line) => line.type === type,
							);
							return { type, lines, subtotal: sumLines(lines) };
						})
						.filter((group) => group.lines.length > 0);
					const sectionTotal = groups.reduce(
						(sum, group) => sum.add(group.subtotal),
						ZERO,
					);

					return (
						<section className="mb-5 text-[11px]" key={section.id}>
							<h3 className="mb-3 border-2 border-black bg-[#55c7e8] py-1 text-center font-bold uppercase">
								{categoryTitle(section)}
							</h3>
							<div className="grid grid-cols-[96px_1fr] border-2 border-black bg-[#d9d9d9] font-bold uppercase">
								<div className="border-r border-black bg-[#55c7e8] px-2 py-1">
									Renglon {section.code}
								</div>
								<div className="px-2 py-1 text-center">{section.name}</div>
							</div>

							{groups.map((group) => (
								<table className="w-full border-collapse" key={group.type}>
									<thead>
										<tr>
											<th
												className="border-x-2 border-black bg-[#d9d9d9] py-1 text-center font-bold"
												colSpan={group.type === "LABOR" ? 7 : 6}
											>
												{labelForType(group.type)}
											</th>
										</tr>
										<tr className="bg-[#eeeeee]">
											<th className="w-16 border border-black px-1 py-1">
												No.
											</th>
											<th className="border border-black px-1 py-1">
												Descripcion
											</th>
											<th className="w-20 border border-black px-1 py-1">
												Cantidad
											</th>
											{group.type === "LABOR" ? (
												<th className="w-16 border border-black px-1 py-1">
													Jornadas
												</th>
											) : null}
											<th className="w-20 border border-black px-1 py-1">
												Unidad
											</th>
											<th className="w-24 border border-black px-1 py-1">
												P/U
											</th>
											<th className="w-28 border border-black px-1 py-1">
												Subtotal
											</th>
										</tr>
									</thead>
									<tbody>
										{group.lines.map((line) => (
											<tr key={line.id}>
												<td className="border border-black px-1 py-1 text-center">
													{line.position}
												</td>
												<td className="border border-black px-1 py-1">
													{line.description}
												</td>
												<td className="border border-black px-1 py-1 text-center">
													{line.quantity.toString()}
												</td>
												{group.type === "LABOR" ? (
													<td className="border border-black px-1 py-1 text-center">
														{persistedLaborLineUsesJornadas(
															line.unit,
															line.days,
														) && hasDays(line.days)
															? line.days?.toString()
															: "—"}
													</td>
												) : null}
												<td className="border border-black px-1 py-1 text-center">
													{budgetUnitLabel(line.unit)}
												</td>
												<td className="border border-black px-1 py-1 text-right">
													{money(line.unitPrice)}
												</td>
												<td className="border border-black px-1 py-1 text-right">
													{money(lineSubtotal(line))}
												</td>
											</tr>
										))}
										<tr>
											<td
												className="border border-black px-1 py-1 text-right font-bold"
												colSpan={group.type === "LABOR" ? 6 : 5}
											>
												SUB TOTAL DE {labelForType(group.type)}
											</td>
											<td className="border border-black px-1 py-1 text-right font-bold">
												{money(group.subtotal)}
											</td>
										</tr>
									</tbody>
								</table>
							))}

							<table className="w-full border-collapse">
								<tbody>
									<tr>
										<td
											className="border border-black bg-[#d9d9d9] px-1 py-1 text-right font-bold"
											colSpan={5}
										>
											TOTAL DEL RENGLON
										</td>
										<td className="w-28 border border-black bg-[#55c7e8] px-1 py-1 text-right font-bold">
											{money(sectionTotal)}
										</td>
									</tr>
								</tbody>
							</table>
						</section>
					);
				})}

				<section className="ml-auto mt-8 w-full max-w-[520px] text-xs">
					<h3 className="border-2 border-[#172023] bg-[#172023] px-3 py-2 text-center font-bold uppercase tracking-[0.08em] text-white">
						Resumen financiero
					</h3>
					<table className="w-full border-collapse">
						<tbody>
							<tr>
								<td className="border border-black px-2 py-1">
									Total de renglones
								</td>
								<td className="border border-black px-2 py-1 text-right">
									{money(financial.lineSubtotal)}
								</td>
							</tr>
							<tr>
								<td className="border border-black px-2 py-1">Encargado de obra</td>
								<td className="border border-black px-2 py-1 text-right">
									{money(financial.siteManagerCost)}
								</td>
							</tr>
							<tr className="bg-[#eef2ef] font-semibold">
								<td className="border border-black px-2 py-1">Base directa</td>
								<td className="border border-black px-2 py-1 text-right">
									{money(directBase)}
								</td>
							</tr>
							<tr>
								<td className="border border-black px-2 py-1">
									Imprevistos {financial.contingencyPercentage.toString()}%
								</td>
								<td className="border border-black px-2 py-1 text-right">
									{money(financial.contingencyAmount)}
								</td>
							</tr>
							<tr className="bg-[#eef2ef] font-semibold">
								<td className="border border-black px-2 py-1">Subtotal</td>
								<td className="border border-black px-2 py-1 text-right">
									{money(financial.subtotal)}
								</td>
							</tr>
							{(
								[
									[
										"Administración",
										financial.administrationPercentage,
										financial.administrationAmount,
									],
									["Utilidad", financial.profitPercentage, financial.profitAmount],
									["IVA", financial.vatPercentage, financial.vatAmount],
									[
										"Financiamiento",
										financial.financingPercentage,
										financial.financingAmount,
									],
								] as const
							).map(([label, percentage, amount]) => (
								<tr key={label}>
									<td className="border border-black px-2 py-1">
										{label} {percentage.toString()}%
									</td>
									<td className="border border-black px-2 py-1 text-right">
										{money(amount)}
									</td>
								</tr>
							))}
							<tr>
								<td className="border-2 border-[#172023] bg-[#d5eee1] px-3 py-2 font-bold uppercase">
									Total general
								</td>
								<td className="border-2 border-[#172023] bg-[#d5eee1] px-3 py-2 text-right text-sm font-bold">
									{money(financial.grandTotal)}
								</td>
							</tr>
						</tbody>
					</table>
				</section>
			</main>
		</>
	);
}
