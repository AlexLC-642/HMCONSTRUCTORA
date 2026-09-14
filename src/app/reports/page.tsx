import type { Prisma } from "@prisma/client";
import {
	ArrowRight,
	CalendarDays,
	CheckCircle2,
	ClipboardList,
	Clock3,
	Download,
	Eye,
	FileBarChart2,
	FileText,
	FolderKanban,
	Plus,
	Search,
	SlidersHorizontal,
	Upload,
	X,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
	projectAccessWhere,
	requirePermission,
	requireProjectPermission,
} from "@/modules/auth/application/authorization";
import { buildDocumentPreview } from "@/modules/documents/application/queries";
import { DocumentPreviewModal } from "@/modules/documents/ui/document-preview-modal";
import {
	ReportEmpty,
	ReportMetric,
	ReportStatus,
} from "@/modules/reports/ui/report-ui";
import { prisma } from "@/shared/lib/prisma";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";

const dateFormatter = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });
const reportStatusLabels: Record<string, string> = {
	DRAFT: "Borrador",
	SUBMITTED: "Enviado",
	REVIEWED: "Revisado",
	APPROVED: "Aprobado",
	PUBLISHED: "Publicado",
};

type ReportsSearch = {
	tab?: string | string[];
	q?: string | string[];
	project?: string | string[];
	status?: string | string[];
	dateFrom?: string | string[];
	dateTo?: string | string[];
	preview?: string | string[];
	newReport?: string | string[];
};

type DailyReportRow = Prisma.DailyReportGetPayload<{
	include: {
		project: { select: { id: true; code: true; name: true } };
		mediaEntries: { select: { id: true } };
	};
}>;

type ManualReportRow = Prisma.ProjectDocumentGetPayload<{
	include: {
		project: { select: { id: true; code: true; name: true } };
		category: { select: { name: true } };
		author: { select: { name: true } };
		versions: {
			include: { uploadedBy: { select: { name: true } } };
		};
	};
}>;

function searchValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function reportsHref(
	params: ReportsSearch,
	next: Partial<Record<keyof ReportsSearch, string>>,
) {
	const query = new URLSearchParams();
	const current = {
		tab: searchValue(params.tab),
		q: searchValue(params.q),
		project: searchValue(params.project),
		status: searchValue(params.status),
		dateFrom: searchValue(params.dateFrom),
		dateTo: searchValue(params.dateTo),
		preview: searchValue(params.preview),
		newReport: searchValue(params.newReport),
	};

	for (const [key, value] of Object.entries({ ...current, ...next })) {
		if (value) query.set(key, value);
	}
	const text = query.toString();
	return text ? `/reports?${text}` : "/reports";
}

async function handleNewReportRedirect(formData: FormData) {
	"use server";
	await requirePermission("proyectos.ver");
	const projectId = formData.get("projectId");
	if (typeof projectId === "string" && projectId) {
		await requireProjectPermission(projectId, "proyectos.ver");
		redirect(`/projects/${projectId}/progress?tab=registro`);
	}
}

export default async function ReportsPage({
	searchParams,
}: {
	searchParams?: Promise<ReportsSearch>;
}) {
	const user = await requirePermission("proyectos.ver");
	const params = searchParams ? await searchParams : {};
	const activeTab =
		searchValue(params.tab) === "reportes" ? "reportes" : "avance-diario";
	const query = searchValue(params.q).trim().toLowerCase();
	const projectFilter = searchValue(params.project);
	const statusFilter = searchValue(params.status);
	const dateFromFilter = searchValue(params.dateFrom);
	const dateToFilter = searchValue(params.dateTo);
	const previewId = searchValue(params.preview);
	const showNewReportModal = searchValue(params.newReport) === "true";

	const allProjects = await prisma.project.findMany({
		where: projectAccessWhere(user),
		select: { id: true, code: true, name: true },
		orderBy: { code: "asc" },
	});
	const dailyReportsRaw = await prisma.dailyReport.findMany({
		where: { project: projectAccessWhere(user) },
		include: {
			project: { select: { id: true, code: true, name: true } },
			mediaEntries: { select: { id: true } },
		},
		orderBy: { reportDate: "desc" },
	});
	const manualReportsRaw = await prisma.projectDocument.findMany({
		where: {
			category: { key: "informes" },
			project: projectAccessWhere(user),
		},
		include: {
			project: { select: { id: true, code: true, name: true } },
			category: { select: { name: true } },
			author: { select: { name: true } },
			versions: {
				orderBy: { versionNumber: "desc" },
				include: { uploadedBy: { select: { name: true } } },
			},
		},
		orderBy: { updatedAt: "desc" },
	});

	const filteredDailyReports = dailyReportsRaw.filter((report) => {
		if (projectFilter && report.projectId !== projectFilter) return false;
		if (statusFilter && report.status !== statusFilter) return false;
		if (
			dateFromFilter &&
			new Date(report.reportDate) < new Date(dateFromFilter)
		)
			return false;
		if (dateToFilter && new Date(report.reportDate) > new Date(dateToFilter))
			return false;
		if (!query) return true;
		return [
			report.reportNumber,
			report.siteManager,
			report.project.code,
			report.project.name,
			report.generalObservations ?? "",
		].some((value) => value.toLowerCase().includes(query));
	});

	const filteredManualReports = manualReportsRaw.filter((document) => {
		if (projectFilter && document.projectId !== projectFilter) return false;
		if (statusFilter && document.status !== statusFilter) return false;
		const latest = document.versions[0];
		const documentDate = latest
			? new Date(latest.createdAt)
			: new Date(document.createdAt);
		if (dateFromFilter && documentDate < new Date(dateFromFilter)) return false;
		if (dateToFilter && documentDate > new Date(dateToFilter)) return false;
		if (!query) return true;
		return [
			document.title,
			document.description ?? "",
			document.tags ?? "",
			document.project.code,
			document.project.name,
			latest?.originalName ?? "",
		].some((value) => value.toLowerCase().includes(query));
	});

	const previewDocument = previewId
		? (() => {
				const document = manualReportsRaw.find((item) => item.id === previewId);
				if (!document) return undefined;
				return buildDocumentPreview(document, document.project, {
					id: document.projectId,
					key: "informes",
					name: document.category.name,
				});
			})()
		: undefined;

	const inputClass = "reports-input focus-ring";
	const tabClass = (name: string) =>
		`reports-tab ${activeTab === name ? "reports-tab--active" : ""}`;
	const pendingCount = dailyReportsRaw.filter((report) =>
		["DRAFT", "SUBMITTED", "REVIEWED"].includes(report.status),
	).length;
	const approvedCount = dailyReportsRaw.filter((report) =>
		["APPROVED", "PUBLISHED"].includes(report.status),
	).length;
	const hasFilters = Boolean(
		projectFilter || statusFilter || dateFromFilter || dateToFilter || query,
	);

	return (
		<main className="mx-auto max-w-[1480px] space-y-5">
			<section className="reports-hero">
				<div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
					<div className="flex items-center gap-4">
						<span className="reports-hero__icon">
							<FileBarChart2 aria-hidden="true" size={23} />
						</span>
						<p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ef9ba3]">
							Control documental
						</p>
						<h1 className="sr-only">Informes de obra</h1>
					</div>
					<a
						className="reports-primary-action focus-ring"
						href={reportsHref(params, { newReport: "true" })}
					>
						<Plus aria-hidden="true" size={18} /> Nuevo informe
					</a>
				</div>
			</section>

			<section
				aria-label="Resumen de informes"
				className="kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
			>
				<ReportMetric
					detail="Registros de avance"
					icon={ClipboardList}
					label="Informes diarios"
					value={dailyReportsRaw.length}
				/>
				<ReportMetric
					detail="Pendientes de cierre"
					icon={Clock3}
					label="Por revisar"
					tone="amber"
					value={pendingCount}
				/>
				<ReportMetric
					detail="Listos para consulta"
					icon={CheckCircle2}
					label="Aprobados"
					tone="green"
					value={approvedCount}
				/>
				<ReportMetric
					detail="Documentos externos"
					icon={FileText}
					label="Archivos cargados"
					tone="red"
					value={manualReportsRaw.length}
				/>
			</section>

			<section className="reports-panel overflow-hidden">
				<div className="flex flex-col gap-4 border-b border-[#dce2dd] p-4 lg:flex-row lg:items-center lg:justify-between">
					<nav aria-label="Tipos de informe" className="reports-tabs">
						<a
							className={tabClass("avance-diario")}
							href={reportsHref(params, { tab: "avance-diario" })}
						>
							<ClipboardList aria-hidden="true" size={17} /> Avance diario
						</a>
						<a
							className={tabClass("reportes")}
							href={reportsHref(params, { tab: "reportes" })}
						>
							<FileText aria-hidden="true" size={17} /> Informes cargados
						</a>
					</nav>
					<AutoFilterForm action="/reports" className="w-full lg:max-w-md">
						<input name="tab" type="hidden" value={activeTab} />
						<label className="reports-search">
							<Search aria-hidden="true" size={18} />
							<input
								aria-label="Buscar informes"
								defaultValue={searchValue(params.q)}
								name="q"
								placeholder="Buscar informe, proyecto o responsable"
							/>
						</label>
					</AutoFilterForm>
				</div>

				<AutoFilterForm action="/reports" className="reports-filters">
					<input name="tab" type="hidden" value={activeTab} />
					{searchValue(params.q) ? (
						<input name="q" type="hidden" value={searchValue(params.q)} />
					) : null}
					<div className="flex items-center gap-2 text-sm font-bold text-[#273232] sm:col-span-2 lg:col-span-1">
						<span className="grid size-9 place-items-center rounded-lg bg-[#e9eeea] text-[#52605b]">
							<SlidersHorizontal size={17} />
						</span>
						Filtros
					</div>
					<label className="reports-field">
						Proyecto
						<select
							className={inputClass}
							defaultValue={projectFilter}
							name="project"
						>
							<option value="">Todos los proyectos</option>
							{allProjects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.code} · {project.name}
								</option>
							))}
						</select>
					</label>
					<label className="reports-field">
						Estado
						<select
							className={inputClass}
							defaultValue={statusFilter}
							name="status"
						>
							<option value="">Todos los estados</option>
							<option value="DRAFT">Borrador</option>
							<option value="SUBMITTED">Enviado</option>
							<option value="REVIEWED">Revisado</option>
							<option value="APPROVED">Aprobado</option>
							<option value="PUBLISHED">Publicado</option>
						</select>
					</label>
					<label className="reports-field">
						Desde
						<input
							className={inputClass}
							defaultValue={dateFromFilter}
							name="dateFrom"
							type="date"
						/>
					</label>
					<label className="reports-field">
						Hasta
						<input
							className={inputClass}
							defaultValue={dateToFilter}
							name="dateTo"
							type="date"
						/>
					</label>
					{hasFilters ? (
						<a
							className="reports-clear focus-ring"
							href={`/reports?tab=${activeTab}`}
						>
							Limpiar filtros
						</a>
					) : null}
				</AutoFilterForm>
			</section>

			<section className="reports-panel overflow-hidden">
				<header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2dd] px-5 py-4">
					<div>
						<h2 className="text-lg font-extrabold tracking-[-0.02em] text-[#172021]">
							{activeTab === "avance-diario"
								? "Registro de avances"
								: "Biblioteca de informes"}
						</h2>
						<p className="mt-0.5 text-xs text-[#66736e]">
							{activeTab === "avance-diario"
								? `${filteredDailyReports.length} informes en esta vista`
								: `${filteredManualReports.length} archivos en esta vista`}
						</p>
					</div>
					<span className="reports-count">
						{activeTab === "avance-diario"
							? "Seguimiento de campo"
							: "Archivo documental"}
					</span>
				</header>

				{activeTab === "avance-diario" &&
					(filteredDailyReports.length ? (
						<DailyReportsTable reports={filteredDailyReports} />
					) : (
						<ReportEmpty
							action={
								<a
									className="reports-primary-action reports-primary-action--compact focus-ring"
									href={reportsHref(params, { newReport: "true" })}
								>
									<Plus size={16} /> Crear informe
								</a>
							}
							detail={
								hasFilters
									? "Prueba con otros filtros o limpia la búsqueda para ver más resultados."
									: "Cuando registres el primer avance del proyecto, aparecerá aquí."
							}
							icon={ClipboardList}
							title={
								hasFilters
									? "No hay coincidencias"
									: "Aún no hay avances diarios"
							}
						/>
					))}
				{activeTab === "reportes" &&
					(filteredManualReports.length ? (
						<ManualReportsTable
							documents={filteredManualReports}
							params={params}
						/>
					) : (
						<ReportEmpty
							action={
								<a
									className="reports-secondary-action focus-ring"
									href="/documents?upload=true"
								>
									<Upload size={16} /> Subir archivo
								</a>
							}
							detail={
								hasFilters
									? "Prueba con otros filtros o limpia la búsqueda para ver más resultados."
									: "Los informes que subas para un proyecto quedarán organizados aquí."
							}
							icon={FileText}
							title={
								hasFilters
									? "No hay coincidencias"
									: "Aún no hay informes cargados"
							}
						/>
					))}
			</section>

			{showNewReportModal ? (
				<NewReportModal
					allProjects={allProjects}
					closeHref={reportsHref(params, { newReport: "" })}
					inputClass={inputClass}
				/>
			) : null}
			{previewDocument ? (
				<DocumentPreviewModal
					closeHref={reportsHref(params, { preview: "" })}
					document={previewDocument}
				/>
			) : null}
		</main>
	);
}

function DailyReportsTable({ reports }: { reports: DailyReportRow[] }) {
	return (
		<>
			<div className="reports-scrollbar hidden overflow-x-auto md:block">
				<table className="reports-table min-w-[980px]">
					<thead>
						<tr>
							<th>Informe</th>
							<th>Proyecto</th>
							<th>Fecha</th>
							<th>Responsable</th>
							<th>Estado</th>
							<th>Evidencias</th>
							<th className="text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{reports.map((report) => (
							<tr key={report.id}>
								<td>
									<p className="font-bold text-[#172021]">
										{report.reportNumber}
									</p>
									<span className="reports-origin">Registro interno</span>
								</td>
								<td>
									<p className="font-semibold text-[#172021]">
										{report.project.code}
									</p>
									<p className="mt-0.5 max-w-[230px] truncate text-xs text-[#6a7671]">
										{report.project.name}
									</p>
								</td>
								<td>
									<span className="inline-flex items-center gap-2 text-xs font-medium text-[#46534f]">
										<CalendarDays size={14} />
										{new Date(report.reportDate).toLocaleDateString("es-GT", {
											dateStyle: "medium",
										})}
									</span>
								</td>
								<td className="text-xs font-semibold text-[#34413d]">
									{report.siteManager}
								</td>
								<td>
									<ReportStatus
										label={reportStatusLabels[report.status] ?? "Sin estado"}
										status={report.status}
									/>
								</td>
								<td className="text-xs font-semibold text-[#52605b]">
									{report.mediaEntries.length}{" "}
									{report.mediaEntries.length === 1
										? "evidencia"
										: "evidencias"}
								</td>
								<td>
									<div className="flex justify-end gap-2">
										<a
											className="reports-row-action focus-ring"
											href={`/projects/${report.projectId}/progress/reports/${report.id}`}
										>
											<Eye size={14} /> Ver
										</a>
										<a
											className="reports-row-action reports-row-action--dark focus-ring"
											href={`/projects/${report.projectId}/progress/reports/${report.id}/print`}
											rel="noopener noreferrer"
											target="_blank"
										>
											<FileText size={14} /> PDF
										</a>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="grid gap-3 p-3 md:hidden">
				{reports.map((report) => (
					<div
						className="rounded-2xl border border-[#dfe4df] bg-[#f9faf8] p-4"
						key={report.id}
					>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="font-bold text-[#172021]">
									{report.reportNumber}
								</p>
								<p className="mt-0.5 truncate text-xs text-[#6a7671]">
									{report.project.code} · {report.project.name}
								</p>
							</div>
							<ReportStatus
								label={reportStatusLabels[report.status] ?? "Sin estado"}
								status={report.status}
							/>
						</div>
						<div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-[#46534f]">
							<span className="inline-flex items-center gap-1.5">
								<CalendarDays size={13} />
								{new Date(report.reportDate).toLocaleDateString("es-GT", {
									dateStyle: "medium",
								})}
							</span>
							<span>{report.siteManager}</span>
							<span>
								{report.mediaEntries.length}{" "}
								{report.mediaEntries.length === 1 ? "evidencia" : "evidencias"}
							</span>
						</div>
						<div className="mt-3 flex gap-2">
							<a
								className="reports-row-action focus-ring flex-1 justify-center"
								href={`/projects/${report.projectId}/progress/reports/${report.id}`}
							>
								<Eye size={14} /> Ver
							</a>
							<a
								className="reports-row-action reports-row-action--dark focus-ring flex-1 justify-center"
								href={`/projects/${report.projectId}/progress/reports/${report.id}/print`}
								rel="noopener noreferrer"
								target="_blank"
							>
								<FileText size={14} /> PDF
							</a>
						</div>
					</div>
				))}
			</div>
		</>
	);
}

function ManualReportsTable({
	documents,
	params,
}: {
	documents: ManualReportRow[];
	params: ReportsSearch;
}) {
	return (
		<>
			<div className="reports-scrollbar hidden overflow-x-auto md:block">
				<table className="reports-table min-w-[980px]">
					<thead>
						<tr>
							<th>Informe</th>
							<th>Proyecto</th>
							<th>Fecha</th>
							<th>Autor</th>
							<th>Versión</th>
							<th>Origen</th>
							<th className="text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{documents.map((document) => {
							const latest = document.versions[0];
							const date = latest
								? new Date(latest.createdAt)
								: new Date(document.createdAt);
							return (
								<tr key={document.id}>
									<td>
										<p className="max-w-[280px] truncate font-bold text-[#172021]">
											{document.title}
										</p>
										{document.description ? (
											<p className="mt-0.5 max-w-[280px] truncate text-xs text-[#6a7671]">
												{document.description}
											</p>
										) : null}
									</td>
									<td>
										<p className="font-semibold text-[#172021]">
											{document.project.code}
										</p>
										<p className="mt-0.5 max-w-[220px] truncate text-xs text-[#6a7671]">
											{document.project.name}
										</p>
									</td>
									<td className="text-xs font-medium text-[#46534f]">
										{dateFormatter.format(date)}
									</td>
									<td className="text-xs font-semibold text-[#34413d]">
										{latest?.uploadedBy?.name ||
											document.author?.name ||
											"Sin autor"}
									</td>
									<td>
										<span className="reports-version">
											v{latest?.versionNumber ?? 1}
										</span>
									</td>
									<td>
										<span className="reports-origin">Archivo</span>
									</td>
									<td>
										<div className="flex justify-end gap-2">
											<a
												className="reports-row-action focus-ring"
												href={reportsHref(params, { preview: document.id })}
											>
												<Eye size={14} /> Ver
											</a>
											{latest ? (
												<a
													className="reports-row-action reports-row-action--dark focus-ring"
													download
													href={latest.publicUrl}
												>
													<Download size={14} /> Descargar
												</a>
											) : null}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div className="grid gap-3 p-3 md:hidden">
				{documents.map((document) => {
					const latest = document.versions[0];
					const date = latest
						? new Date(latest.createdAt)
						: new Date(document.createdAt);
					return (
						<div
							className="rounded-2xl border border-[#dfe4df] bg-[#f9faf8] p-4"
							key={document.id}
						>
							<p className="truncate font-bold text-[#172021]">
								{document.title}
							</p>
							{document.description ? (
								<p className="mt-0.5 truncate text-xs text-[#6a7671]">
									{document.description}
								</p>
							) : null}
							<p className="mt-2 text-xs text-[#6a7671]">
								{document.project.code} · {document.project.name}
							</p>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<span className="reports-version">
									v{latest?.versionNumber ?? 1}
								</span>
								<span className="reports-origin">Archivo</span>
								<span className="text-xs font-medium text-[#46534f]">
									{dateFormatter.format(date)}
								</span>
							</div>
							<div className="mt-3 flex gap-2">
								<a
									className="reports-row-action focus-ring flex-1 justify-center"
									href={reportsHref(params, { preview: document.id })}
								>
									<Eye size={14} /> Ver
								</a>
								{latest ? (
									<a
										className="reports-row-action reports-row-action--dark focus-ring flex-1 justify-center"
										download
										href={latest.publicUrl}
									>
										<Download size={14} /> Descargar
									</a>
								) : null}
							</div>
						</div>
					);
				})}
			</div>
		</>
	);
}

function NewReportModal({
	allProjects,
	closeHref,
	inputClass,
}: {
	allProjects: Array<{ id: string; code: string; name: string }>;
	closeHref: string;
	inputClass: string;
}) {
	return (
		<div className="reports-modal-backdrop">
			<section
				aria-labelledby="new-report-title"
				aria-modal="true"
				className="reports-modal"
				role="dialog"
			>
				<header className="reports-modal__header">
					<span className="grid size-11 place-items-center rounded-xl bg-[#d12032] text-white shadow-[0_10px_24px_rgba(200,32,47,0.28)]">
						<FolderKanban size={20} />
					</span>
					<div className="min-w-0 flex-1">
						<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e9969f]">
							Nuevo registro
						</p>
						<h2
							className="mt-1 text-xl font-bold text-white"
							id="new-report-title"
						>
							Crear informe
						</h2>
					</div>
					<a
						aria-label="Cerrar"
						className="reports-modal__close focus-ring"
						href={closeHref}
					>
						<X size={18} />
					</a>
				</header>
				<form action={handleNewReportRedirect} className="space-y-5 p-5 sm:p-6">
					<div>
						<p className="text-base font-bold text-[#172021]">
							Selecciona el proyecto
						</p>
						<p className="mt-1 text-sm leading-6 text-[#66736e]">
							Continuarás al registro de avance diario del proyecto elegido.
						</p>
					</div>
					<label className="reports-field">
						Proyecto de obra
						<select className={inputClass} name="projectId" required>
							<option value="">Seleccionar proyecto...</option>
							{allProjects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.code} · {project.name}
								</option>
							))}
						</select>
					</label>
					<a
						className="reports-upload-option focus-ring"
						href="/documents?upload=true"
					>
						<span className="grid size-10 place-items-center rounded-lg bg-[#eef1ed] text-[#34413d]">
							<Upload size={18} />
						</span>
						<span className="min-w-0 flex-1">
							<strong>Subir un informe existente</strong>
							<small>Agrega un archivo al expediente del proyecto.</small>
						</span>
						<ArrowRight size={17} />
					</a>
					<div className="flex flex-col-reverse gap-2 border-t border-[#dce2dd] pt-5 sm:flex-row sm:justify-end">
						<a className="reports-secondary-action focus-ring" href={closeHref}>
							Cancelar
						</a>
						<button
							className="reports-primary-action reports-primary-action--compact focus-ring"
							type="submit"
						>
							Continuar <ArrowRight size={16} />
						</button>
					</div>
				</form>
			</section>
		</div>
	);
}
