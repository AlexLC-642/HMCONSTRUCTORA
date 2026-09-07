import { CheckCircle2, Printer, Undo2 } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	approveBudgetVersionAction,
	createEditableBudgetDraftAction,
	createInitialBudgetAction,
	saveBudgetVersionAction,
} from "@/modules/budgets/application/actions";
import { getProjectBudget } from "@/modules/budgets/application/queries";
import type { BudgetVersionInput } from "@/modules/budgets/domain/validation";
import { normalizeLaborUnit } from "@/modules/budgets/domain/units";
import { BudgetForm } from "@/modules/budgets/ui/budget-form";
import { getProjectById } from "@/modules/projects/application/queries";

const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});

function decimalToString(value: { toString(): string } | null | undefined) {
	return value?.toString() ?? "0";
}

function optionalDecimalToString(
	value: { toString(): string } | null | undefined,
) {
	return value?.toString() ?? "";
}

function budgetStatusLabel(status: string) {
	if (status === "DRAFT") return "Borrador";
	if (status === "APPROVED") return "Aprobado";
	if (status === "SUPERSEDED") return "Reemplazado";
	return status;
}
function toBudgetInput(
	budget: NonNullable<Awaited<ReturnType<typeof getProjectBudget>>>,
	version: NonNullable<
		Awaited<ReturnType<typeof getProjectBudget>>
	>["versions"][number],
): BudgetVersionInput {
	return {
		title: budget.title,
		sourceReference: version.sourceReference ?? "",
		notes: version.notes ?? "",
		executorName: version.executorName ?? "",
		siteManagerCost: decimalToString(version.siteManagerCost),
		contingencyPercentage: decimalToString(version.contingencyPercentage),
		administrationPercentage: decimalToString(version.administrationPercentage),
		profitPercentage: decimalToString(version.profitPercentage),
		vatPercentage: decimalToString(version.vatPercentage),
		financingPercentage: decimalToString(version.financingPercentage),
		sections: version.sections.map((section) => ({
			id: section.id,
			code: section.code,
			name: section.name,
			category: section.category ?? "",
			position: section.position,
			lineItems: section.lineItems.map((line) => ({
				id: line.id,
				type: line.type,
				position: line.position,
				description: line.description,
				quantity: decimalToString(line.quantity),
				unit:
					line.type === "LABOR"
						? normalizeLaborUnit(line.unit, optionalDecimalToString(line.days))
						: (line.unit ?? ""),
				days: optionalDecimalToString(line.days),
				unitPrice: decimalToString(line.unitPrice),
			})),
		})),
	};
}

export default async function ProjectBudgetPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await requirePermission("presupuesto.ver");
	const { id } = await params;
	const [project, budget] = await Promise.all([
		getProjectById(id),
		getProjectBudget(id),
	]);

	if (!project) notFound();

	const canEdit = user.permissions.includes("presupuesto.editar");
	const canApprove = user.permissions.includes("presupuesto.aprobar");
	const createAction = createInitialBudgetAction.bind(null, id);
	const currentVersion =
		budget?.versions.find((version) => version.status === "DRAFT") ??
		budget?.versions[0];
	const draftVersion = budget?.versions.find(
		(version) => version.status === "DRAFT",
	);
	const approvedVersion = budget?.versions.find(
		(version) => version.status === "APPROVED",
	);

	return (
		<main className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Presupuesto</h1>
					<p className="text-sm text-[var(--muted)]">
						{project.code} - {project.name}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<a
						className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
						href={`/projects/${id}`}
					>
						<Undo2 aria-hidden="true" size={18} />
						Volver
					</a>
					{currentVersion ? (
						<a
							className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
							href={`/projects/${id}/budget/print`}
						>
							<Printer aria-hidden="true" size={18} />
							Vista PDF
						</a>
					) : null}
				</div>
			</div>

			{!budget || !currentVersion ? (
				<section className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
					<h2 className="text-lg font-semibold">Presupuesto inicial</h2>
					<p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
						Comienza con un presupuesto vacío. Nada se guardará hasta que pulses
						“Guardar presupuesto”.
					</p>
					{canEdit ? (
						<BudgetForm
							action={createAction}
							initialValue={{
								title: "",
								sourceReference: project.code ?? "",
								notes: "",
								executorName: "",
								siteManagerCost: "0",
								contingencyPercentage: "0",
								administrationPercentage: "0",
								profitPercentage: "0",
								vatPercentage: "0",
								financingPercentage: "0",
								sections: [],
							}}
							readOnly={false}
						/>
					) : null}
				</section>
			) : (
				<>
					<section className="grid gap-3 rounded-lg border border-[var(--border)] bg-white p-4 text-sm shadow-sm md:grid-cols-4">
						<div>
							<span className="text-[var(--muted)]">Version</span>
							<strong className="block">v{currentVersion.versionNumber}</strong>
						</div>
						<div>
							<span className="text-[var(--muted)]">Estado</span>
							<strong className="block">
								{budgetStatusLabel(currentVersion.status)}
							</strong>
						</div>
						<div>
							<span className="text-[var(--muted)]">Total general</span>
							<strong className="block">
								{currencyFormatter.format(currentVersion.grandTotal.toNumber())}
							</strong>
						</div>
						<div>
							<span className="text-[var(--muted)]">Aprobado por</span>
							<strong className="block">
								{currentVersion.approvedBy?.name ?? "Pendiente"}
							</strong>
						</div>
					</section>

					{canEdit && !draftVersion && approvedVersion ? (
						<section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f0d2d6] bg-[#fff7f8] p-4 text-sm shadow-sm">
							<div>
								<h2 className="font-semibold text-[#101416]">
									Presupuesto aprobado
								</h2>
								<p className="mt-1 text-[var(--muted)]">
									Para editarlo se crea una nueva version en borrador sin
									modificar el aprobado vigente.
								</p>
							</div>
							<form
								action={createEditableBudgetDraftAction.bind(
									null,
									id,
									approvedVersion.id,
								)}
							>
								<button
									className="focus-ring rounded-md bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(211,33,53,0.18)]"
									type="submit"
								>
									Crear version editable
								</button>
							</form>
						</section>
					) : null}

					<BudgetForm
						initialValue={toBudgetInput(budget, currentVersion)}
						readOnly={!canEdit || currentVersion.status !== "DRAFT"}
						action={saveBudgetVersionAction.bind(null, id, currentVersion.id)}
					/>

					{canApprove && currentVersion.status === "DRAFT" ? (
						<section className="rounded-[18px] border border-[#d9d3cf] bg-[linear-gradient(135deg,#f3f2f0_0%,#faf8f6_44%,#f1efed_100%)] p-5 shadow-[0_20px_36px_rgba(24,31,35,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]">
							<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
								<div className="max-w-4xl">
									<div className="mb-3 flex items-center gap-3">
										<span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8c8cc] bg-[#fff7f5] text-[#c83d4d] shadow-[0_8px_18px_rgba(200,61,77,0.12)]">
											<CheckCircle2 aria-hidden="true" size={18} />
										</span>
										<h2 className="text-[clamp(1.65rem,2vw,2.2rem)] font-semibold tracking-[-0.05em] text-[#1f2527]">
											Revisión final
										</h2>
									</div>
									<p className="max-w-3xl text-[15px] leading-7 text-[#4b585d]">
										Verifica el total, el contenido y la versión antes de
										aprobar. La aprobación deja la versión actual como vigente y
										activa la siguiente etapa del proyecto.
									</p>
								</div>
								<form
									action={approveBudgetVersionAction.bind(
										null,
										id,
										currentVersion.id,
									)}
								>
									<button
										className="focus-ring inline-flex items-center gap-2 rounded-[14px] border border-[#d75b6a] bg-white px-5 py-3 text-base font-semibold text-[#cb3246] shadow-[0_12px_24px_rgba(203,50,70,0.10)] transition hover:-translate-y-0.5 hover:bg-[#fff7f7] hover:shadow-[0_18px_28px_rgba(203,50,70,0.14)]"
										type="submit"
									>
										<CheckCircle2 aria-hidden="true" size={18} />
										Aprobar presupuesto
									</button>
								</form>
							</div>
						</section>
					) : null}

					<section className="mt-6 rounded-[18px] border border-[#d9d3cf] bg-[linear-gradient(180deg,#f5f2f0_0%,#f8f7f4_100%)] p-5 shadow-[0_18px_30px_rgba(24,31,35,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]">
						<h2 className="text-[clamp(1.7rem,2vw,2.1rem)] font-semibold tracking-[-0.05em] text-[#1f2527]">
							Historial
						</h2>
						<div className="mt-4 overflow-x-auto">
							<table className="w-full min-w-[640px] text-sm">
								<thead className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#657078]">
									<tr>
										<th className="pb-3 pr-4">Version</th>
										<th className="pb-3 pr-4">Estado</th>
										<th className="pb-3 pr-4">Total</th>
										<th className="pb-3">Fecha de aprobacion</th>
									</tr>
								</thead>
								<tbody>
									{budget.versions.map((version) => (
										<tr
											className="border-t border-[#d9d3cf] text-[#1f2527]"
											key={version.id}
										>
											<td className="py-3 pr-4 font-medium">
												v{version.versionNumber}
											</td>
											<td className="py-3 pr-4">
												{budgetStatusLabel(version.status)}
											</td>
											<td className="py-3 pr-4 font-medium tabular-nums">
												{currencyFormatter.format(
													version.grandTotal.toNumber(),
												)}
											</td>
											<td className="py-3">
												{version.approvedAt
													? version.approvedAt.toLocaleDateString("es-GT")
													: "Pendiente"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				</>
			)}
		</main>
	);
}
