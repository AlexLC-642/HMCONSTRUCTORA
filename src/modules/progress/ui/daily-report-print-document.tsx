import Image from "next/image";
import { scheduleActivityStatusLabels } from "@/modules/schedules/domain/validation";
import type { getDailyReportById } from "../application/queries";

type DailyReportPrintData = NonNullable<
	Awaited<ReturnType<typeof getDailyReportById>>
>;

const mediaTypeLabels = {
	BEFORE: "Antes",
	DURING: "Durante",
	AFTER: "Después",
	OTHER: "Otro",
} as const;
const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});

function money(value: { toNumber(): number }) {
	return currencyFormatter.format(value.toNumber());
}

function valueText(value: { toString(): string } | null | undefined) {
	return value ? value.toString() : "";
}

function mediaActivityLabel(
	report: DailyReportPrintData,
	media: DailyReportPrintData["mediaEntries"][number],
) {
	if (media.dailyReportActivityId) {
		const activity = report.activities.find(
			(item) => item.id === media.dailyReportActivityId,
		);
		if (activity)
			return `Actividad ${activity.activityCode} - ${activity.activityName}`;
	}
	if (media.activityCode) {
		const activity = report.activities.find(
			(item) => item.activityCode === media.activityCode,
		);
		if (activity)
			return `Actividad ${activity.activityCode} - ${activity.activityName}`;
	}
	if (media.activityCode) return `Actividad ${media.activityCode}`;
	return "General del informe";
}

function mediaTitle(
	media: DailyReportPrintData["mediaEntries"][number],
	index: number,
) {
	return media.title || `Evidencia ${String(index + 1).padStart(2, "0")}`;
}

export function DailyReportPrintDocument({
	report,
}: {
	report: DailyReportPrintData;
}) {
	const laborTotal = report.laborEntries.reduce(
		(sum, entry) => sum + entry.amount.toNumber(),
		0,
	);

	return (
		<div className="print-page-container">
			<style>{`
        @page {
          size: letter portrait;
          margin: 0.5in;
        }

        @media screen {
          body {
            background-color: #f3f4f6 !important;
          }
          .print-page-container {
            background-color: #f3f4f6;
            min-height: 100vh;
            padding: 2rem 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .print-sheet {
            background-color: white;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            width: 8.5in;
            min-height: 11in;
            padding: 0.5in;
            margin: 0 auto;
            box-sizing: border-box;
          }
        }

        @media print {
          body {
            background-color: white !important;
          }
          .print-page-container {
            padding: 0 !important;
            background-color: white !important;
            min-height: 0 !important;
          }
          .print-sheet {
            width: 100% !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          tr, figure, section, table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          h2, h3, thead {
            page-break-after: avoid;
            break-after: avoid;
          }
        }
      `}</style>

			<main className="print-surface print-sheet text-[#111] text-[11px] leading-relaxed">
				{/* Encabezado Profesional del Informe */}
				<header className="mb-5 border-b-2 border-black pb-4">
					<div className="flex justify-between items-start">
						<div>
							<h1 className="text-xl font-bold uppercase tracking-wide text-[var(--brand-red)]">
								Control de obra
							</h1>
							<p className="text-xs uppercase font-semibold text-[var(--muted)]">
								Informe Diario de Avance
							</p>
						</div>
						<div className="text-right border-l border-black pl-4">
							<p className="text-sm font-bold bg-[#55c7e8] px-3 py-1 rounded border border-black inline-block">
								Reporte: {report.reportNumber}
							</p>
							<p className="text-[10px] uppercase text-[var(--muted)] mt-1.5">
								Estado:{" "}
								<span className="font-semibold text-black">
									{report.status}
								</span>
							</p>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-4 gap-2 text-xs bg-[#f4f5f1] border border-black p-2.5 rounded">
						<div className="col-span-1">
							<strong>Proyecto:</strong>{" "}
							<span className="font-medium text-black">
								{report.project.code}
							</span>
						</div>
						<div className="col-span-3">
							<strong>Nombre:</strong>{" "}
							<span className="font-medium text-black">
								{report.project.name}
							</span>
						</div>
						{report.project.location && (
							<div className="col-span-4 border-t border-[#cfd5ce] pt-1.5 mt-1">
								<strong>Ubicación:</strong>{" "}
								<span className="font-medium text-black">
									{report.project.location}
								</span>
							</div>
						)}
					</div>
				</header>

				{/* Metadatos Generales */}
				<section className="mb-5 grid grid-cols-4 border border-black text-[11px] bg-white">
					<div className="border-r border-b border-black px-2 py-1.5">
						<b>Fecha:</b>
						<br />
						{report.reportDate.toLocaleDateString("es-GT")}
					</div>
					<div className="border-r border-b border-black px-2 py-1.5">
						<b>Encargado:</b>
						<br />
						{report.siteManager}
					</div>
					<div className="border-r border-b border-black px-2 py-1.5">
						<b>Jornada:</b>
						<br />
						{report.workShift ?? "N/D"}
					</div>
					<div className="border-b border-black px-2 py-1.5">
						<b>Clima:</b>
						<br />
						{report.weather ?? "N/D"}
					</div>
					<div className="col-span-4 px-2 py-1.5 bg-[#fbfbf8]">
						<b>Horario Laboral:</b> {report.startTime ?? "N/D"} -{" "}
						{report.endTime ?? "N/D"}
					</div>
				</section>

				{/* Actividades Ejecutadas */}
				<section className="mb-5">
					<h3 className="border border-black bg-[#55c7e8] py-1 text-center font-bold uppercase text-[10px]">
						Actividades Ejecutadas
					</h3>
					<table className="w-full border-collapse border-l border-r border-b border-black">
						<thead className="bg-[#eeeeee]">
							<tr>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-12">
									No.
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-left text-[9px] w-1/4">
									Actividad
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-left text-[9px] w-1/3">
									Trabajo Ejecutado
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px]">
									Hoy
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px]">
									Acumulado
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px]">
									Avance
								</th>
								<th className="border-b border-black px-1.5 py-1 text-center text-[9px]">
									Estado
								</th>
							</tr>
						</thead>
						<tbody>
							{report.activities.map((activity) => (
								<tr
									className="border-b border-black last:border-b-0 hover:bg-[#fbfbf8]"
									key={activity.id}
								>
									<td className="border-r border-black px-1.5 py-1 text-center font-medium">
										{activity.activityCode}
									</td>
									<td className="border-r border-black px-1.5 py-1 whitespace-normal break-words">
										{activity.activityName}
									</td>
									<td className="border-r border-black px-1.5 py-1 whitespace-normal break-words">
										{activity.workDescription}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center">
										{valueText(activity.todayQuantity)} {activity.unit ?? ""}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center">
										{valueText(activity.accumulatedQuantity)}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center font-semibold">
										{valueText(activity.newProgress)}%
									</td>
									<td className="px-1.5 py-1 text-center">
										{scheduleActivityStatusLabels[activity.status]}
									</td>
								</tr>
							))}
							{report.activities.length === 0 && (
								<tr>
									<td
										className="px-2 py-4 text-center text-[var(--muted)]"
										colSpan={7}
									>
										Sin actividades registradas hoy.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</section>

				{/* Personal */}
				<section className="mb-5">
					<h3 className="border border-black bg-[#55c7e8] py-1 text-center font-bold uppercase text-[10px]">
						Personal en Obra
					</h3>
					<table className="w-full border-collapse border-l border-r border-b border-black">
						<thead className="bg-[#eeeeee]">
							<tr>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-12">
									No.
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-left text-[9px] w-1/3">
									Nombre / Cuadrilla
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-left text-[9px]">
									Puesto / Rol
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-16">
									Personas
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-16">
									Horas
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-right text-[9px] w-24">
									Tarifa
								</th>
								<th className="border-b border-black px-1.5 py-1 text-right text-[9px] w-24">
									Monto
								</th>
							</tr>
						</thead>
						<tbody>
							{report.laborEntries.map((entry) => (
								<tr
									className="border-b border-black last:border-b-0 hover:bg-[#fbfbf8]"
									key={entry.id}
								>
									<td className="border-r border-black px-1.5 py-1 text-center">
										{entry.position}
									</td>
									<td className="border-r border-black px-1.5 py-1 whitespace-normal break-words">
										{entry.workerLabel}
									</td>
									<td className="border-r border-black px-1.5 py-1 whitespace-normal break-words">
										{entry.role ?? ""}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center">
										{valueText(entry.people)}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center">
										{valueText(entry.hours)}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-right">
										{money(entry.rate)}
									</td>
									<td className="px-1.5 py-1 text-right">
										{money(entry.amount)}
									</td>
								</tr>
							))}
							<tr className="border-t border-black bg-[#f4f5f1] font-bold">
								<td className="px-1.5 py-1.5 text-right uppercase" colSpan={6}>
									Total Personal
								</td>
								<td className="px-1.5 py-1.5 text-right text-[var(--brand-red)]">
									{currencyFormatter.format(laborTotal)}
								</td>
							</tr>
							{report.laborEntries.length === 0 && (
								<tr>
									<td
										className="px-2 py-4 text-center text-[var(--muted)]"
										colSpan={7}
									>
										Sin registro de personal.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</section>

				{/* Materiales */}
				<section className="mb-5">
					<h3 className="border border-black bg-[#55c7e8] py-1 text-center font-bold uppercase text-[10px]">
						Materiales Usados
					</h3>
					<table className="w-full border-collapse border-l border-r border-b border-black">
						<thead className="bg-[#eeeeee]">
							<tr>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-12">
									No.
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-left text-[9px] w-1/3">
									Material
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-left text-[9px]">
									Bodega Origen
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-20">
									Cantidad
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-16">
									Unidad
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-20">
									Desperdicio
								</th>
								<th className="border-b border-r border-black px-1.5 py-1 text-center text-[9px] w-20">
									Devuelto
								</th>
								<th className="border-b border-black px-1.5 py-1 text-center text-[9px] w-24">
									Actividad
								</th>
							</tr>
						</thead>
						<tbody>
							{report.materialEntries.map((entry) => (
								<tr
									className="border-b border-black last:border-b-0 hover:bg-[#fbfbf8]"
									key={entry.id}
								>
									<td className="border-r border-black px-1.5 py-1 text-center">
										{entry.position}
									</td>
									<td className="border-r border-black px-1.5 py-1 whitespace-normal break-words">
										{entry.materialName}
									</td>
									<td className="border-r border-black px-1.5 py-1 whitespace-normal break-words">
										{entry.warehouse ?? ""}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center font-semibold">
										{valueText(entry.quantityUsed)}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center">
										{entry.unit ?? ""}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center text-[var(--warning)]">
										{Number(entry.wasteQuantity ?? 0) > 0
											? valueText(entry.wasteQuantity)
											: "-"}
									</td>
									<td className="border-r border-black px-1.5 py-1 text-center text-[var(--success)]">
										{Number(entry.returnedQuantity ?? 0) > 0
											? valueText(entry.returnedQuantity)
											: "-"}
									</td>
									<td className="px-1.5 py-1 text-center font-medium">
										{entry.activityCode ?? ""}
									</td>
								</tr>
							))}
							{report.materialEntries.length === 0 && (
								<tr>
									<td
										className="px-2 py-4 text-center text-[var(--muted)]"
										colSpan={8}
									>
										Sin registro de materiales consumidos hoy.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</section>

				{/* Evidencias (Fotos de avance diario) */}
				<section className="mb-5">
					<h3 className="border border-black bg-[#55c7e8] py-1 text-center font-bold uppercase text-[10px]">
						Evidencias Fotográficas
					</h3>
					{report.mediaEntries.length ? (
						<div className="grid grid-cols-2 gap-4 border border-black p-4 bg-white rounded-b">
							{report.mediaEntries.map((media, index) => (
								<figure
									className="break-inside-avoid border border-[#cfd5ce] p-2.5 rounded bg-[#fbfbf8]"
									key={media.id}
								>
									<div className="mb-2 flex items-center justify-between border-b border-[#cfd5ce] pb-1.5 font-bold text-[9px] text-[var(--steel)] uppercase">
										<span>{mediaTitle(media, index)}</span>
										<span className="bg-[#e8f5ff] text-[#1e40af] px-1 rounded">
											{mediaTypeLabels[media.mediaType]}
										</span>
									</div>
									{media.mimeType.startsWith("image/") ? (
										<Image
											alt={media.title ?? media.originalName}
											className="h-44 w-full object-cover rounded border border-[#dfe3dc]"
											height={352}
											src={media.publicUrl}
											unoptimized
											width={640}
										/>
									) : (
										<div className="grid h-44 place-items-center border border-dashed border-[#cfd5ce] text-center text-xs bg-[#f4f5f1] rounded">
											Video: {media.originalName}
										</div>
									)}
									<figcaption className="mt-2.5 leading-normal text-[10px] space-y-1">
										<p>
											<b>Relación:</b>{" "}
											<span className="text-black">
												{mediaActivityLabel(report, media)}
											</span>
										</p>
										<p>
											<b>Archivo:</b>{" "}
											<span className="text-[var(--muted)]">
												{media.originalName}
											</span>
										</p>
										{media.description && (
											<p className="bg-white p-1.5 border rounded mt-1 whitespace-normal break-words italic">
												"{media.description}"
											</p>
										)}
									</figcaption>
								</figure>
							))}
						</div>
					) : (
						<p className="border border-black px-2 py-6 text-center text-[var(--muted)]">
							Sin evidencias fotográficas registradas.
						</p>
					)}
				</section>

				{/* Observaciones */}
				<section className="text-[10px] break-inside-avoid">
					<h3 className="border border-black bg-[#d9d9d9] py-1 text-center font-bold uppercase">
						Observaciones Generales
					</h3>
					<p className="min-h-16 border-l border-r border-b border-black px-3 py-2.5 whitespace-normal break-words bg-white">
						{report.generalObservations ||
							"Ninguna observación registrada para esta jornada."}
					</p>
				</section>
			</main>
		</div>
	);
}
