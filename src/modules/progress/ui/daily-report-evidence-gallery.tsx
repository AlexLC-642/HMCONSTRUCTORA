import {
	ArrowDown,
	ArrowUp,
	CalendarDays,
	Eye,
	FileVideo,
	ImageIcon,
	Pencil,
	Trash2,
} from "lucide-react";
import {
	deleteDailyReportMediaAction,
	moveDailyReportMediaAction,
	updateDailyReportMediaAction,
} from "../application/actions";
import type {
	getProjectEvidenceGallery,
	getProjectProgressWorkspace,
} from "../application/queries";

type Report = NonNullable<
	Awaited<ReturnType<typeof getProjectProgressWorkspace>>["latestReport"]
>;
type Media = Report["mediaEntries"][number];
type GalleryReports = Awaited<ReturnType<typeof getProjectEvidenceGallery>>;
type ReportWithActivities = Pick<Report, "activities">;
type ModalReport = Pick<Report, "activities" | "reportDate" | "reportNumber">;

const mediaTypeLabels = {
	BEFORE: "Antes",
	DURING: "Durante",
	AFTER: "Despues",
	OTHER: "Otro",
} as const;

const mediaTypeTone = {
	BEFORE: "border-[#d8e4ef] bg-[#f2f7fb] text-[#31506a]",
	DURING: "border-[#d8cda8] bg-[#fff8e8] text-[#8a5a00]",
	AFTER: "border-[#b7dfcc] bg-[#edf9f2] text-[#1f7a5a]",
	OTHER: "border-[#d7d9d2] bg-[#fbfaf6] text-[#52615f]",
} as const;

function formatDate(value: Date) {
	return value.toLocaleDateString("es-GT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatDateTime(value: Date) {
	return value.toLocaleString("es-GT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function findActivity(report: ReportWithActivities | undefined, media: Media) {
	if (!report) return null;
	if (media.dailyReportActivityId) {
		const activity = report.activities.find(
			(item) => item.id === media.dailyReportActivityId,
		);
		if (activity) return activity;
	}
	if (media.activityCode)
		return (
			report.activities.find(
				(item) => item.activityCode === media.activityCode,
			) ?? null
		);
	return null;
}

function activityLabel(media: Media, report?: ReportWithActivities) {
	const activity = findActivity(report, media);
	if (activity) return `${activity.activityCode} - ${activity.activityName}`;
	if (media.activityCode) return `Actividad ${media.activityCode}`;
	return "General del informe";
}

function mediaAlt(media: Media, report?: ReportWithActivities) {
	return (
		media.title ||
		media.description ||
		activityLabel(media, report) ||
		media.originalName
	);
}

function activityOptions(report: Report) {
	return [
		{ label: "General del informe", value: "" },
		...report.activities.map((activity) => ({
			label: `${activity.activityCode} - ${activity.activityName}`,
			value: `id:${activity.id}`,
		})),
	];
}

function currentActivityValue(media: Media) {
	if (media.dailyReportActivityId) return `id:${media.dailyReportActivityId}`;
	if (media.activityCode) return `code:${media.activityCode}`;
	return "";
}

export function DailyReportEvidenceGallery({
	editable = false,
	projectId,
	report,
}: {
	editable?: boolean;
	projectId: string;
	report: Report;
}) {
	const options = activityOptions(report);
	const galleryId = `evidence-gallery-${report.id}`;

	return (
		<section
			className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[0_18px_44px_rgba(20,25,27,0.09)]"
			id={galleryId}
		>
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[#fbfbf8] px-5 py-4">
				<div>
					<h2 className="text-lg font-semibold">Evidencias de la jornada</h2>
					<p className="text-sm text-[var(--muted)]">
						{report.reportNumber} - {formatDate(report.reportDate)}
					</p>
				</div>
				<span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
					{report.mediaEntries.length} archivos
				</span>
			</div>

			{report.mediaEntries.length ? (
				<div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
					{report.mediaEntries.map((media, index) => (
						<article
							className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[#fbfaf6] shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(31,42,45,0.11)]"
							key={media.id}
						>
							<a className="group block" href={`#evidence-${media.id}`}>
								<div className="relative aspect-[4/3] overflow-hidden bg-[#e6e8e4]">
									{media.mimeType.startsWith("image/") ? (
										// biome-ignore lint/performance/noImgElement: Las evidencias se sirven desde almacenamiento local del proyecto.
										<img
											alt={mediaAlt(media, report)}
											className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
											loading="lazy"
											src={media.publicUrl}
										/>
									) : (
										<div className="grid h-full place-items-center text-[var(--muted)]">
											<FileVideo aria-hidden="true" size={42} />
										</div>
									)}
									<span
										className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-semibold ${mediaTypeTone[media.mediaType]}`}
									>
										{mediaTypeLabels[media.mediaType]}
									</span>
								</div>
							</a>
							<div className="p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<h3 className="truncate text-sm font-semibold">
											{media.title || media.originalName}
										</h3>
										<p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
											{activityLabel(media, report)}
										</p>
									</div>
									<a
										className="focus-ring grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-white shadow-sm"
										href={`#evidence-${media.id}`}
										aria-label="Ver evidencia"
									>
										<Eye aria-hidden="true" size={16} />
									</a>
								</div>
								{media.description ? (
									<p className="mt-3 line-clamp-2 text-sm text-[#33403f]">
										{media.description}
									</p>
								) : null}
								<p className="mt-3 text-xs text-[var(--muted)]">
									{formatDateTime(media.createdAt)}
								</p>

								{editable ? (
									<div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4">
										<details className="rounded-xl border border-[var(--border)] bg-white">
											<summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold">
												<Pencil aria-hidden="true" size={15} />
												Editar datos
											</summary>
											<form
												action={updateDailyReportMediaAction.bind(
													null,
													projectId,
													report.id,
													media.id,
												)}
												className="grid gap-3 border-t border-[var(--border)] p-3"
											>
												<label className="grid gap-1 text-xs font-semibold uppercase text-[var(--muted)]">
													Tipo
													<select
														className="focus-ring h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm normal-case text-[var(--foreground)]"
														name="mediaType"
														defaultValue={media.mediaType}
													>
														{Object.entries(mediaTypeLabels).map(
															([value, label]) => (
																<option key={value} value={value}>
																	{label}
																</option>
															),
														)}
													</select>
												</label>
												<label className="grid gap-1 text-xs font-semibold uppercase text-[var(--muted)]">
													Actividad
													<select
														className="focus-ring h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm normal-case text-[var(--foreground)]"
														name="activityRef"
														defaultValue={currentActivityValue(media)}
													>
														{options.map((option) => (
															<option
																key={option.value || "general"}
																value={option.value}
															>
																{option.label}
															</option>
														))}
													</select>
												</label>
												<label className="grid gap-1 text-xs font-semibold uppercase text-[var(--muted)]">
													Titulo
													<input
														className="focus-ring h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm normal-case text-[var(--foreground)]"
														name="title"
														defaultValue={media.title ?? ""}
													/>
												</label>
												<label className="grid gap-1 text-xs font-semibold uppercase text-[var(--muted)]">
													Descripcion
													<textarea
														className="focus-ring min-h-20 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm normal-case text-[var(--foreground)]"
														name="description"
														defaultValue={media.description ?? ""}
													/>
												</label>
												<button
													className="focus-ring rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white shadow-sm"
													type="submit"
												>
													Guardar evidencia
												</button>
											</form>
										</details>
										<div className="flex flex-wrap gap-2">
											<form
												action={moveDailyReportMediaAction.bind(
													null,
													projectId,
													report.id,
													media.id,
													"up",
												)}
											>
												<button
													className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold shadow-sm disabled:opacity-40"
													disabled={index === 0}
													type="submit"
												>
													<ArrowUp aria-hidden="true" size={14} />
													Subir
												</button>
											</form>
											<form
												action={moveDailyReportMediaAction.bind(
													null,
													projectId,
													report.id,
													media.id,
													"down",
												)}
											>
												<button
													className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold shadow-sm disabled:opacity-40"
													disabled={index === report.mediaEntries.length - 1}
													type="submit"
												>
													<ArrowDown aria-hidden="true" size={14} />
													Bajar
												</button>
											</form>
											<details className="relative">
												<summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-[#f0c8cd] bg-[#fff7f8] px-3 py-2 text-xs font-semibold text-[var(--brand-red)] shadow-sm">
													<Trash2 aria-hidden="true" size={14} />
													Eliminar
												</summary>
												<form
													action={deleteDailyReportMediaAction.bind(
														null,
														projectId,
														report.id,
														media.id,
													)}
													className="absolute bottom-full right-0 z-10 mb-2 w-52 rounded-xl border border-[#f0c8cd] bg-white p-3 text-xs shadow-[0_16px_32px_rgba(31,42,45,0.14)]"
												>
													<p className="font-semibold text-[#1f2a2d]">
														Eliminar evidencia?
													</p>
													<p className="mt-1 text-[var(--muted)]">
														La imagen o video saldra del informe.
													</p>
													<button
														className="focus-ring mt-3 w-full rounded-lg bg-[var(--brand-red)] px-3 py-2 font-semibold text-white"
														type="submit"
													>
														Confirmar
													</button>
												</form>
											</details>
										</div>
									</div>
								) : null}
							</div>
							<EvidenceModal
								closeHref={`#${galleryId}`}
								media={media}
								report={report}
							/>
						</article>
					))}
				</div>
			) : (
				<div className="grid min-h-40 place-items-center p-8 text-center">
					<div>
						<ImageIcon
							aria-hidden="true"
							className="mx-auto text-[var(--muted)]"
							size={34}
						/>
						<p className="mt-3 font-semibold">
							{editable
								? "No hay evidencias guardadas."
								: "Sin evidencias registradas."}
						</p>
					</div>
				</div>
			)}
		</section>
	);
}

function EvidenceModal({
	closeHref,
	media,
	report,
}: {
	closeHref: string;
	media: Media;
	report: ModalReport;
}) {
	return (
		<div
			className="fixed inset-0 z-50 hidden items-center justify-center bg-black/70 p-4 target:flex"
			id={`evidence-${media.id}`}
		>
			<a
				className="absolute inset-0"
				href={closeHref}
				aria-label="Cerrar evidencia"
			>
				<span className="sr-only">Cerrar evidencia</span>
			</a>
			<article className="relative z-10 grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-[minmax(0,1fr)_320px]">
				<div className="grid min-h-[360px] place-items-center bg-[#121719]">
					{media.mimeType.startsWith("image/") ? (
						// biome-ignore lint/performance/noImgElement: Vista ampliada del archivo local.
						<img
							alt={mediaAlt(media, report)}
							className="max-h-[78vh] w-full object-contain"
							src={media.publicUrl}
						/>
					) : (
						<video
							className="max-h-[78vh] w-full"
							controls
							src={media.publicUrl}
						>
							<track kind="captions" />
						</video>
					)}
				</div>
				<aside className="overflow-y-auto p-5">
					<a
						className="focus-ring float-right rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold"
						href={closeHref}
					>
						Cerrar
					</a>
					<span
						className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${mediaTypeTone[media.mediaType]}`}
					>
						{mediaTypeLabels[media.mediaType]}
					</span>
					<h3 className="mt-4 text-xl font-semibold">
						{media.title || media.originalName}
					</h3>
					<dl className="mt-5 grid gap-3 text-sm">
						<div>
							<dt className="text-xs font-semibold uppercase text-[var(--muted)]">
								Informe
							</dt>
							<dd className="mt-1 font-semibold">{report.reportNumber}</dd>
						</div>
						<div>
							<dt className="text-xs font-semibold uppercase text-[var(--muted)]">
								Actividad
							</dt>
							<dd className="mt-1">{activityLabel(media, report)}</dd>
						</div>
						<div>
							<dt className="text-xs font-semibold uppercase text-[var(--muted)]">
								Fecha
							</dt>
							<dd className="mt-1">{formatDateTime(media.createdAt)}</dd>
						</div>
						{media.description ? (
							<div>
								<dt className="text-xs font-semibold uppercase text-[var(--muted)]">
									Descripcion
								</dt>
								<dd className="mt-1 leading-6">{media.description}</dd>
							</div>
						) : null}
					</dl>
				</aside>
			</article>
		</div>
	);
}

export function ProjectEvidenceGallery({
	projectId,
	reports,
}: {
	projectId: string;
	reports: GalleryReports;
}) {
	const total = reports.reduce(
		(sum, report) => sum + report.mediaEntries.length,
		0,
	);
	const types = reports
		.flatMap((report) => report.mediaEntries)
		.reduce<Record<string, number>>((acc, media) => {
			acc[media.mediaType] = (acc[media.mediaType] ?? 0) + 1;
			return acc;
		}, {});

	return (
		<section className="space-y-4" id="project-evidence-gallery">
			<div className="kpi-grid grid gap-3 md:grid-cols-4">
				<GalleryMetric label="Evidencias" value={String(total)} />
				<GalleryMetric label="Jornadas" value={String(reports.length)} />
				<GalleryMetric
					label="Imagenes"
					value={String(
						reports
							.flatMap((report) => report.mediaEntries)
							.filter((media) => media.mimeType.startsWith("image/")).length,
					)}
				/>
				<GalleryMetric
					label="Videos"
					value={String(
						reports
							.flatMap((report) => report.mediaEntries)
							.filter((media) => media.mimeType.startsWith("video/")).length,
					)}
				/>
			</div>
			<div className="rounded-[18px] border border-[var(--border)] bg-white shadow-[0_18px_44px_rgba(20,25,27,0.09)]">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
					<div>
						<h2 className="text-lg font-semibold">Galeria historica</h2>
					</div>
					<div className="flex flex-wrap gap-2">
						{Object.entries(types).map(([type, count]) => (
							<span
								className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${mediaTypeTone[type as keyof typeof mediaTypeTone]}`}
								key={type}
							>
								{mediaTypeLabels[type as keyof typeof mediaTypeLabels]} {count}
							</span>
						))}
					</div>
				</div>
				{reports.length ? (
					<div className="divide-y divide-[var(--border)]">
						{reports.map((report) => (
							<article className="p-5" key={report.id}>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div className="flex items-center gap-3">
										<span className="grid size-10 place-items-center rounded-xl bg-[#f4f5f2] text-[var(--muted)]">
											<CalendarDays aria-hidden="true" size={18} />
										</span>
										<div>
											<h3 className="font-semibold">
												{formatDate(report.reportDate)}
											</h3>
											<p className="text-sm text-[var(--muted)]">
												{report.reportNumber}
											</p>
										</div>
									</div>
									<a
										className="focus-ring rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold shadow-sm"
										href={`/projects/${projectId}/progress/reports/${report.id}`}
									>
										Ver informe
									</a>
								</div>
								<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
									{report.mediaEntries.map((media) => (
										<a
											className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[#fbfaf6] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
											href={`#evidence-${media.id}`}
											key={media.id}
										>
											<div className="aspect-[4/3] bg-[#e6e8e4]">
												{media.mimeType.startsWith("image/") ? (
													// biome-ignore lint/performance/noImgElement: Galeria historica de evidencias locales.
													<img
														alt={mediaAlt(
															media as Media,
															report as ReportWithActivities,
														)}
														className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
														loading="lazy"
														src={media.publicUrl}
													/>
												) : (
													<div className="grid h-full place-items-center text-[var(--muted)]">
														<FileVideo aria-hidden="true" size={34} />
													</div>
												)}
											</div>
											<div className="p-3">
												<p className="truncate text-sm font-semibold">
													{media.title || media.originalName}
												</p>
												<p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">
													{activityLabel(
														media as Media,
														report as ReportWithActivities,
													)}
												</p>
											</div>
										</a>
									))}
								</div>
								{report.mediaEntries.map((media) => (
									<EvidenceModal
										closeHref="#project-evidence-gallery"
										key={`modal-${media.id}`}
										media={media as Media}
										report={report as ModalReport}
									/>
								))}
							</article>
						))}
					</div>
				) : (
					<div className="grid min-h-56 place-items-center p-8 text-center">
						<div>
							<ImageIcon
								aria-hidden="true"
								className="mx-auto text-[var(--muted)]"
								size={34}
							/>
							<p className="mt-3 font-semibold">Sin evidencias historicas.</p>
						</div>
					</div>
				)}
			</div>
		</section>
	);
}

function GalleryMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_14px_30px_rgba(31,42,45,0.08)]">
			<p className="text-xs font-semibold uppercase text-[var(--muted)]">
				{label}
			</p>
			<p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
		</div>
	);
}
