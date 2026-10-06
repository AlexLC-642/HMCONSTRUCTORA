import Image from "next/image";
import { progressMediaUrl } from "@/modules/progress/domain/media-url";
import { scheduleActivityStatusLabels } from "@/modules/schedules/domain/validation";
import { PrintDocumentHeader } from "@/shared/ui/print-document-header";
import type { getDailyReportById } from "../application/queries";

type DailyReportPrintData = NonNullable<
	Awaited<ReturnType<typeof getDailyReportById>>
>;

const reportStatusLabels: Record<DailyReportPrintData["status"], string> = {
	DRAFT: "Borrador",
	SUBMITTED: "En revisión",
	REVIEWED: "Revisado",
	APPROVED: "Aprobado",
	PUBLISHED: "Publicado",
};

const mediaTypeLabels = {
	BEFORE: "Antes",
	DURING: "Durante",
	AFTER: "Después",
	OTHER: "Otro",
} as const;

const currency = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const longDate = new Intl.DateTimeFormat("es-GT", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});
const number = new Intl.NumberFormat("es-GT", { maximumFractionDigits: 2 });

type Decimalish = { toNumber(): number } | null | undefined;

function num(value: Decimalish) {
	return value ? value.toNumber() : 0;
}

function mediaActivityLabel(
	report: DailyReportPrintData,
	media: DailyReportPrintData["mediaEntries"][number],
) {
	const activity =
		report.activities.find((item) => item.id === media.dailyReportActivityId) ??
		report.activities.find((item) => item.activityCode === media.activityCode);
	if (activity) return `${activity.activityCode} · ${activity.activityName}`;
	if (media.activityCode) return `Actividad ${media.activityCode}`;
	return "General";
}

function SectionTitle({
	children,
	aside,
}: {
	children: string;
	aside?: string;
}) {
	return (
		<div className="report-doc__section-title">
			<h2>{children}</h2>
			{aside ? <span>{aside}</span> : null}
		</div>
	);
}

export function DailyReportPrintDocument({
	report,
}: {
	report: DailyReportPrintData;
}) {
	const worked = report.activities.filter(
		(activity) => num(activity.todayQuantity) > 0,
	);
	const idle = report.activities.filter(
		(activity) => num(activity.todayQuantity) <= 0,
	);
	const laborTotal = report.laborEntries.reduce(
		(sum, entry) => sum + num(entry.amount),
		0,
	);
	const schedule =
		report.startTime || report.endTime
			? `${report.startTime ?? "—"} a ${report.endTime ?? "—"}`
			: null;

	return (
		<div className="print-page-container">
			<style>{`
        @page { size: letter portrait; margin: 0.5in; }
        @media screen {
          body { background-color: #f3f4f6 !important; }
          .print-page-container { background-color: #f3f4f6; min-height: 100vh; padding: 2rem 1rem; }
          .print-sheet { background: white; box-shadow: 0 10px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1); width: 8.5in; min-height: 11in; padding: 0.5in; margin: 0 auto; box-sizing: border-box; }
        }
        @media print {
          body { background-color: white !important; }
          .print-page-container { padding: 0 !important; background: white !important; min-height: 0 !important; }
          .print-sheet { width: 100% !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>

			<main className="print-surface print-sheet report-doc">
				<PrintDocumentHeader
					details={[
						{ label: "Proyecto", value: report.project.code ?? "—" },
						{
							label: "Cliente",
							value: report.project.client?.name ?? "—",
						},
						...(report.project.location
							? [
									{
										label: "Ubicación",
										value: report.project.location,
										wide: true,
									},
								]
							: []),
						{ label: "Encargado", value: report.siteManager },
						{
							label: "Jornada",
							value:
								[report.workShift, schedule].filter(Boolean).join(" · ") || "—",
						},
						{ label: "Clima", value: report.weather ?? "—" },
						{
							label: "Estado",
							value: reportStatusLabels[report.status],
						},
					]}
					documentMeta={[
						`No. ${report.reportNumber}`,
						longDate.format(report.reportDate),
					]}
					documentTitle="Informe diario"
					layout="table"
					projectName={report.project.name}
				/>

				<section className="report-doc__section">
					<SectionTitle>Avance del día</SectionTitle>
					{worked.length > 0 ? (
						<table className="report-doc__table">
							<colgroup>
								<col style={{ width: "7%" }} />
								<col />
								<col style={{ width: "14%" }} />
								<col style={{ width: "24%" }} />
								<col style={{ width: "13%" }} />
							</colgroup>
							<thead>
								<tr>
									<th>No.</th>
									<th className="text-left">Actividad</th>
									<th>Hoy</th>
									<th>Avance acumulado</th>
									<th>Estado</th>
								</tr>
							</thead>
							<tbody>
								{worked.map((activity) => {
									const progress = Math.min(
										100,
										Math.max(0, num(activity.newProgress)),
									);
									const detail =
										activity.workDescription?.trim() &&
										activity.workDescription.trim() !==
											activity.activityName.trim()
											? activity.workDescription
											: null;
									return (
										<tr key={activity.id}>
											<td className="text-center">{activity.activityCode}</td>
											<td>
												<strong>{activity.activityName}</strong>
												{detail ? <small>{detail}</small> : null}
											</td>
											<td className="text-center tabular-nums">
												{number.format(num(activity.todayQuantity))}{" "}
												{activity.unit ?? "%"}
											</td>
											<td>
												<div className="report-doc__progress">
													<span>
														<i style={{ width: `${progress}%` }} />
													</span>
													<b>{number.format(progress)}%</b>
												</div>
											</td>
											<td className="text-center">
												{scheduleActivityStatusLabels[activity.status]}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					) : (
						<p className="report-doc__empty">Sin avance registrado hoy.</p>
					)}
					{idle.length > 0 && worked.length > 0 ? (
						<p className="report-doc__footnote">
							Sin avance hoy:{" "}
							{idle
								.map(
									(activity) =>
										`${activity.activityCode} ${activity.activityName}`,
								)
								.join(" · ")}
						</p>
					) : null}
				</section>

				<section className="report-doc__section">
					<SectionTitle
						aside={
							report.laborEntries.length > 0
								? `Total ${currency.format(laborTotal)}`
								: undefined
						}
					>
						Personal en obra
					</SectionTitle>
					{report.laborEntries.length > 0 ? (
						<table className="report-doc__table">
							<colgroup>
								<col />
								<col style={{ width: "22%" }} />
								<col style={{ width: "11%" }} />
								<col style={{ width: "10%" }} />
								<col style={{ width: "14%" }} />
								<col style={{ width: "15%" }} />
							</colgroup>
							<thead>
								<tr>
									<th className="text-left">Nombre o cuadrilla</th>
									<th className="text-left">Puesto</th>
									<th>Personas</th>
									<th>Horas</th>
									<th className="text-right">Tarifa</th>
									<th className="text-right">Monto</th>
								</tr>
							</thead>
							<tbody>
								{report.laborEntries.map((entry) => (
									<tr key={entry.id}>
										<td>{entry.workerLabel}</td>
										<td>{entry.role ?? "—"}</td>
										<td className="text-center tabular-nums">
											{number.format(num(entry.people))}
										</td>
										<td className="text-center tabular-nums">
											{number.format(num(entry.hours))}
										</td>
										<td className="text-right tabular-nums">
											{currency.format(num(entry.rate))}
										</td>
										<td className="text-right tabular-nums">
											{currency.format(num(entry.amount))}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className="report-doc__empty">Sin registro de personal.</p>
					)}
				</section>

				<section className="report-doc__section">
					<SectionTitle>Materiales usados</SectionTitle>
					{report.materialEntries.length > 0 ? (
						<table className="report-doc__table">
							<colgroup>
								<col />
								<col style={{ width: "18%" }} />
								<col style={{ width: "13%" }} />
								<col style={{ width: "13%" }} />
								<col style={{ width: "12%" }} />
								<col style={{ width: "10%" }} />
							</colgroup>
							<thead>
								<tr>
									<th className="text-left">Material</th>
									<th className="text-left">Bodega</th>
									<th>Usado</th>
									<th>Desperdicio</th>
									<th>Devuelto</th>
									<th>Actividad</th>
								</tr>
							</thead>
							<tbody>
								{report.materialEntries.map((entry) => (
									<tr key={entry.id}>
										<td>{entry.materialName}</td>
										<td>{entry.warehouse ?? "—"}</td>
										<td className="text-center tabular-nums">
											{number.format(num(entry.quantityUsed))}{" "}
											{entry.unit ?? ""}
										</td>
										<td className="text-center tabular-nums">
											{num(entry.wasteQuantity) > 0
												? number.format(num(entry.wasteQuantity))
												: "—"}
										</td>
										<td className="text-center tabular-nums">
											{num(entry.returnedQuantity) > 0
												? number.format(num(entry.returnedQuantity))
												: "—"}
										</td>
										<td className="text-center">{entry.activityCode ?? "—"}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className="report-doc__empty">Sin materiales consumidos.</p>
					)}
				</section>

				{report.mediaEntries.length > 0 ? (
					<section className="report-doc__section">
						<SectionTitle>Evidencia fotográfica</SectionTitle>
						<div className="report-doc__photos">
							{report.mediaEntries.map((media, index) => (
								<figure key={media.id}>
									{media.mimeType.startsWith("image/") ? (
										<Image
											alt={media.title ?? media.originalName}
											height={352}
											src={progressMediaUrl(media.id)}
											unoptimized
											width={640}
										/>
									) : (
										<div className="report-doc__video">
											Video: {media.originalName}
										</div>
									)}
									<figcaption>
										<strong>
											{media.title ||
												`Foto ${String(index + 1).padStart(2, "0")}`}
										</strong>
										<span>
											{mediaTypeLabels[media.mediaType]} ·{" "}
											{mediaActivityLabel(report, media)}
										</span>
										{media.description ? <p>{media.description}</p> : null}
									</figcaption>
								</figure>
							))}
						</div>
					</section>
				) : null}

				<section className="report-doc__section">
					<SectionTitle>Observaciones</SectionTitle>
					<p className="report-doc__observations">
						{report.generalObservations || "Sin observaciones."}
					</p>
				</section>

				<section className="report-doc__signatures">
					<div>
						<span />
						<strong>{report.siteManager}</strong>
						<small>Elaborado por · Encargado de obra</small>
					</div>
					<div>
						<span />
						<strong>{report.approvedBy?.name ?? " "}</strong>
						<small>
							Aprobado por
							{report.approvedAt
								? ` · ${report.approvedAt.toLocaleDateString("es-GT")}`
								: ""}
						</small>
					</div>
				</section>
			</main>
		</div>
	);
}
