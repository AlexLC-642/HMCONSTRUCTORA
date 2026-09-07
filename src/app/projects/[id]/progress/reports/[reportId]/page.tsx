import { Printer, Undo2 } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { saveDailyReportAction } from "@/modules/progress/application/actions";
import {
	getDailyReportById,
	getProjectProgressWorkspace,
} from "@/modules/progress/application/queries";
import { DailyReportEvidenceGallery } from "@/modules/progress/ui/daily-report-evidence-gallery";
import { DailyReportForm } from "@/modules/progress/ui/daily-report-form";
import { scheduleActivityStatusLabels } from "@/modules/schedules/domain/validation";

const statusLabels = {
	DRAFT: "Borrador",
	SUBMITTED: "En revision",
	REVIEWED: "Revisado",
	APPROVED: "Aprobado",
	PUBLISHED: "Publicado",
} as const;

const statusTone = {
	DRAFT: "border-[#d7d9d2] bg-[#fbfaf6] text-[#52615f]",
	SUBMITTED: "border-[#f2d58a] bg-[#fff8e8] text-[#7a4d00]",
	REVIEWED: "border-[#bed4ff] bg-[#edf4ff] text-[#2057c9]",
	APPROVED: "border-[#b7dfcc] bg-[#edf9f2] text-[#1f7a5a]",
	PUBLISHED: "border-[#b7dfcc] bg-[#edf9f2] text-[#1f7a5a]",
} as const;

const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});

function decimalText(value: { toString(): string } | null | undefined) {
	return value ? value.toString() : "0";
}

function money(value: { toNumber(): number }) {
	return currencyFormatter.format(value.toNumber());
}

function formatDate(value: Date) {
	return value.toLocaleDateString("es-GT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export default async function DailyReportDetailPage({
	params,
}: {
	params: Promise<{ id: string; reportId: string }>;
}) {
	await requirePermission("avance.crear");
	const { id, reportId } = await params;
	const [report, workspace] = await Promise.all([
		getDailyReportById(id, reportId),
		getProjectProgressWorkspace(id),
	]);

	if (!report || !workspace.project) notFound();

	const isDraft = report.status === "DRAFT";
	const saveAction = saveDailyReportAction.bind(null, id);

	if (isDraft) {
		return (
			<main className="mx-auto max-w-[1480px] space-y-5">
				<ReportHeader
					id={id}
					reportId={reportId}
					reportNumber={report.reportNumber}
					status={report.status}
					title="Editar informe"
				/>
				<DailyReportEvidenceGallery editable projectId={id} report={report} />
				<DailyReportForm
					action={saveAction}
					workspace={{ ...workspace, latestReport: report }}
				/>
			</main>
		);
	}

	const laborTotal = report.laborEntries.reduce(
		(sum, entry) => sum + entry.amount.toNumber(),
		0,
	);
	const materialCount = report.materialEntries.filter(
		(entry) => entry.quantityUsed.toNumber() > 0,
	).length;

	return (
		<main className="mx-auto max-w-[1240px] space-y-5">
			<ReportHeader
				id={id}
				reportId={reportId}
				reportNumber={report.reportNumber}
				status={report.status}
				title="Informe diario"
			/>

			<section className="kpi-grid grid gap-4 md:grid-cols-4">
				<Metric label="Fecha" value={formatDate(report.reportDate)} />
				<Metric label="Actividades" value={String(report.activities.length)} />
				<Metric
					label="Personal"
					value={money({ toNumber: () => laborTotal })}
				/>
				<Metric label="Materiales" value={String(materialCount)} />
			</section>

			<section className="rounded-[18px] border border-[var(--border)] bg-white shadow-[0_16px_38px_rgba(20,25,27,0.08)]">
				<div className="grid gap-4 border-b border-[var(--border)] px-5 py-4 md:grid-cols-4">
					<Info label="Encargado" value={report.siteManager} />
					<Info label="Jornada" value={report.workShift ?? "Sin registro"} />
					<Info
						label="Horario"
						value={`${report.startTime ?? "--"} - ${report.endTime ?? "--"}`}
					/>
					<Info label="Clima" value={report.weather ?? "Sin registro"} />
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[920px] border-collapse text-sm">
						<thead className="bg-[#f4f5f2] text-xs uppercase text-[var(--muted)]">
							<tr>
								<th className="px-5 py-3 text-left">No.</th>
								<th className="px-5 py-3 text-left">Actividad</th>
								<th className="px-5 py-3 text-left">Trabajo realizado</th>
								<th className="px-5 py-3 text-right">Hoy</th>
								<th className="px-5 py-3 text-right">Acumulado</th>
								<th className="px-5 py-3 text-left">Estado</th>
							</tr>
						</thead>
						<tbody>
							{report.activities.map((activity) => (
								<tr
									className="border-t border-[var(--border)]"
									key={activity.id}
								>
									<td className="px-5 py-4 font-semibold">
										{activity.activityCode}
									</td>
									<td className="px-5 py-4">{activity.activityName}</td>
									<td className="px-5 py-4 text-[var(--muted)]">
										{activity.workDescription}
									</td>
									<td className="px-5 py-4 text-right tabular-nums">
										{decimalText(activity.todayQuantity)} {activity.unit ?? ""}
									</td>
									<td className="px-5 py-4 text-right tabular-nums">
										{decimalText(activity.newProgress)}%
									</td>
									<td className="px-5 py-4">
										{scheduleActivityStatusLabels[activity.status]}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			<section className="grid gap-4 lg:grid-cols-2">
				<SimpleTable
					columns={["Personal", "Puesto", "Horas", "Monto"]}
					empty="Sin personal registrado."
					rows={report.laborEntries.map((entry) => ({
						cells: [
							entry.workerLabel,
							entry.role ?? "-",
							decimalText(entry.hours),
							money(entry.amount),
						],
						id: entry.id,
					}))}
					title="Personal"
				/>
				<SimpleTable
					columns={["Material", "Bodega", "Usado", "Actividad"]}
					empty="Sin materiales registrados."
					rows={report.materialEntries.map((entry) => ({
						cells: [
							entry.materialName,
							entry.warehouse ?? "-",
							`${decimalText(entry.quantityUsed)} ${entry.unit ?? ""}`,
							entry.activityCode ?? "-",
						],
						id: entry.id,
					}))}
					title="Materiales"
				/>
			</section>

			<DailyReportEvidenceGallery projectId={id} report={report} />
		</main>
	);
}

function ReportHeader({
	id,
	reportId,
	reportNumber,
	status,
	title,
}: {
	id: string;
	reportId: string;
	reportNumber: string;
	status: keyof typeof statusLabels;
	title: string;
}) {
	return (
		<section className="rounded-[18px] border border-[var(--border)] bg-white px-5 py-4 shadow-[0_18px_45px_rgba(20,25,27,0.08)]">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-sm font-semibold text-[var(--brand-red)]">
						{reportNumber}
					</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
						{title}
					</h1>
					<span
						className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[status]}`}
					>
						{statusLabels[status]}
					</span>
				</div>
				<div className="flex flex-wrap gap-2">
					<a
						className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
						href={`/projects/${id}/progress?tab=historial`}
					>
						<Undo2 aria-hidden="true" size={18} />
						Historial
					</a>
					<a
						className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
						href={`/projects/${id}/progress/reports/${reportId}/print`}
					>
						<Printer aria-hidden="true" size={18} />
						PDF
					</a>
				</div>
			</div>
		</section>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-[var(--border)] bg-white/80 p-4 shadow-[0_14px_30px_rgba(31,42,45,0.08)] backdrop-blur-xl backdrop-saturate-150">
			<p className="text-xs font-semibold uppercase text-[var(--muted)]">
				{label}
			</p>
			<p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
		</div>
	);
}

function Info({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-xs font-semibold uppercase text-[var(--muted)]">
				{label}
			</p>
			<p className="mt-1 font-semibold">{value}</p>
		</div>
	);
}

function SimpleTable({
	columns,
	empty,
	rows,
	title,
}: {
	columns: string[];
	empty: string;
	rows: Array<{ cells: string[]; id: string }>;
	title: string;
}) {
	return (
		<section className="rounded-[18px] border border-[var(--border)] bg-white shadow-[0_16px_38px_rgba(20,25,27,0.08)]">
			<h2 className="border-b border-[var(--border)] px-5 py-4 text-lg font-semibold">
				{title}
			</h2>
			{rows.length ? (
				<div className="overflow-x-auto">
					<table className="w-full min-w-[520px] border-collapse text-sm">
						<thead className="bg-[#f4f5f2] text-xs uppercase text-[var(--muted)]">
							<tr>
								{columns.map((column) => (
									<th className="px-5 py-3 text-left" key={column}>
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr className="border-t border-[var(--border)]" key={row.id}>
									{row.cells.map((cell) => (
										<td className="px-5 py-4" key={`${row.id}-${cell}`}>
											{cell}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="px-5 py-8 text-sm text-[var(--muted)]">{empty}</p>
			)}
		</section>
	);
}
