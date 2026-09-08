import {
	CheckCircle2,
	Clock3,
	Download,
	Eye,
	FileArchive,
	Files,
	FileText,
	FolderKanban,
	FolderOpen,
	Layers3,
	Plus,
	Search,
	X,
} from "lucide-react";
import { requirePermission } from "@/modules/auth/application/authorization";
import { createProjectDocumentGlobalAction } from "@/modules/documents/application/actions";
import {
	buildDocumentPreview,
	getDocumentLibrary,
} from "@/modules/documents/application/queries";
import { documentFileUrl, documentStatusLabels, manualDocumentCategoryKeys } from "@/modules/documents/domain/catalog";
import { DocumentPreviewModal } from "@/modules/documents/ui/document-preview-modal";
import {
	DocumentEmpty,
	DocumentMetric,
	DocumentStatus,
	documentInputClass,
} from "@/modules/documents/ui/document-ui";
import { DocumentUploadDrawer } from "@/modules/documents/ui/document-upload-drawer";
import { prisma } from "@/shared/lib/prisma";
import { AnimatedFolderIcon } from "@/shared/ui/animated-folder-icon";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";

const dateFormatter = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });
const inputClass = documentInputClass;
const textareaClass = "documents-textarea focus-ring";

type DocumentsSearch = {
	q?: string | string[];
	tab?: string | string[];
	project?: string | string[];
	category?: string | string[];
	status?: string | string[];
	preview?: string | string[];
	upload?: string | string[];
	page?: string | string[];
};

function searchValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatBytes(value: number) {
	if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
	if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
	return `${value} B`;
}

function getVisualGroup(
	categoryKey: string,
): "contractual" | "tecnico" | "financiero" | "informes" | "administrativo" {
	if (categoryKey === "contratos") return "contractual";
	if (categoryKey === "planos") return "tecnico";
	if (
		categoryKey === "presupuestos" ||
		categoryKey === "estados-cuenta" ||
		categoryKey === "comprobantes"
	)
		return "financiero";
	if (categoryKey === "informes") return "informes";
	return "administrativo"; // requerimientos, otros, evidencias, etc.
}

function formatRelativeTime(date: Date) {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	if (diffDays === 0) {
		return "Actualizado hoy";
	}
	if (diffDays === 1) {
		return "Nueva versión ayer";
	}
	return `Actualizado hace ${diffDays} días`;
}

function documentsHref(
	params: DocumentsSearch,
	next: Partial<Record<keyof DocumentsSearch, string>>,
) {
	const query = new URLSearchParams();
	const current = {
		q: searchValue(params.q),
		tab: searchValue(params.tab),
		project: searchValue(params.project),
		category: searchValue(params.category),
		status: searchValue(params.status),
		preview: searchValue(params.preview),
		upload: searchValue(params.upload),
		page: searchValue(params.page),
	};

	for (const [key, value] of Object.entries({ ...current, ...next })) {
		if (value) query.set(key, value);
	}

	const text = query.toString();
	return text ? `/documents?${text}` : "/documents";
}

export default async function DocumentsPage({
	searchParams,
}: {
	searchParams?: Promise<DocumentsSearch>;
}) {
	await requirePermission("proyectos.ver");
	const { documents } = await getDocumentLibrary();
	const params = searchParams ? await searchParams : {};

	// Form parameters
	const query = searchValue(params.q).trim().toLowerCase();
	const activeTab = searchValue(params.tab) || "por-proyecto";
	const projectFilter = searchValue(params.project);
	const statusFilter = searchValue(params.status);
	const categoryFilter = searchValue(params.category);
	const previewId = searchValue(params.preview);
	const showUpload = searchValue(params.upload) === "true";
	const currentPage = Math.max(1, Number(searchValue(params.page)) || 1);

	// Fetch all projects for global card views and dropdown
	const allProjects = await prisma.project.findMany({
		select: { id: true, code: true, name: true },
		orderBy: { code: "asc" },
	});

	// Fetch active categories
	const allCategories = await prisma.documentCategory.findMany({
		where: { active: true },
		orderBy: { sortOrder: "asc" },
	});

	// Apply filters
	const filteredDocuments = documents.filter((document) => {
		if (projectFilter && document.project.id !== projectFilter) return false;
		if (statusFilter && document.status !== statusFilter) return false;
		if (categoryFilter && document.category.key !== categoryFilter)
			return false;
		if (!query) return true;
		const latest = document.versions[0];
		return [
			document.title,
			document.description ?? "",
			document.tags ?? "",
			document.project.code,
			document.project.name,
			document.category.name,
			latest?.originalName ?? "",
			latest?.checksum ?? "",
		].some((value) => value.toLowerCase().includes(query));
	});

	// Filter projects by search query
	const matchingProjects = allProjects.filter((proj) => {
		if (!query) return true;
		const projectMatches =
			proj.code.toLowerCase().includes(query) ||
			proj.name.toLowerCase().includes(query);
		if (projectMatches) return true;
		// Or project has a document matching the search query
		return filteredDocuments.some((doc) => doc.projectId === proj.id);
	});

	// Recientes: last 15 updated documents
	const recentDocuments = [...documents]
		.sort((a, b) => {
			const aTime = a.versions[0]
				? new Date(a.versions[0].createdAt).getTime()
				: new Date(a.updatedAt).getTime();
			const bTime = b.versions[0]
				? new Date(b.versions[0].createdAt).getTime()
				: new Date(b.updatedAt).getTime();
			return bTime - aTime;
		})
		.slice(0, 15);

	// Pagination for "Todos"
	const itemsPerPage = 25;
	const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
	const paginatedDocuments = filteredDocuments.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	const previewDocument = previewId
		? (() => {
				const document = documents.find((item) => item.id === previewId);
				if (!document) return undefined;
				return buildDocumentPreview(
					document,
					document.project,
					document.category,
				);
			})()
		: undefined;

	const totalVersions = documents.reduce(
		(sum, document) => sum + document.versions.length,
		0,
	);
	const approvedDocuments = documents.filter(
		(document) => document.status === "APPROVED",
	).length;
	const projectsWithDocuments = new Set(
		documents.map((document) => document.projectId),
	).size;

	const tabClass = (tabName: string) =>
		`documents-tab focus-ring ${activeTab === tabName ? "documents-tab--active" : ""}`;

	return (
		<main className="mx-auto max-w-[1480px] space-y-5">
			<section className="documents-hero">
				<div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
					<div className="flex max-w-2xl items-start gap-4">
						<span className="documents-hero__icon">
							<Files aria-hidden="true" size={22} />
						</span>
						<div>
							<h1 className="text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl">
								Documentos
							</h1>
							<p className="mt-2 max-w-xl text-sm leading-6 text-[#c4ceca]">
								Consulta expedientes, versiones y archivos de todos los
								proyectos.
							</p>
						</div>
					</div>
					<a
						className="documents-primary-action focus-ring"
						href={documentsHref(params, { upload: "true" })}
					>
						<Plus aria-hidden="true" size={17} /> Subir documento
					</a>
				</div>
			</section>

			<section
				aria-label="Resumen documental"
				className="kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
			>
				<DocumentMetric
					detail="Archivos registrados"
					icon={Files}
					label="Documentos"
					value={documents.length}
				/>
				<DocumentMetric
					detail="Con expediente activo"
					icon={FolderOpen}
					label="Proyectos"
					tone="red"
					value={projectsWithDocuments}
				/>
				<DocumentMetric
					detail="Historial acumulado"
					icon={Layers3}
					label="Versiones"
					tone="amber"
					value={totalVersions}
				/>
				<DocumentMetric
					detail="Listos para consulta"
					icon={CheckCircle2}
					label="Aprobados"
					tone="green"
					value={approvedDocuments}
				/>
			</section>

			<section className="documents-panel documents-toolbar">
				<nav aria-label="Vistas de documentos" className="documents-tabs">
					<a
						className={tabClass("por-proyecto")}
						href={documentsHref(params, { tab: "por-proyecto", page: "1" })}
					>
						<FolderKanban size={16} /> Por proyecto
					</a>
					<a
						className={tabClass("recientes")}
						href={documentsHref(params, { tab: "recientes", page: "1" })}
					>
						<Clock3 size={16} /> Recientes
					</a>
					<a
						className={tabClass("todos")}
						href={documentsHref(params, { tab: "todos", page: "1" })}
					>
						<FileArchive size={16} /> Todos
					</a>
				</nav>

				<AutoFilterForm action="/documents" className="w-full sm:max-w-md">
					{activeTab !== "por-proyecto" && (
						<input type="hidden" name="tab" value={activeTab} />
					)}
					<label className="documents-search">
						<Search aria-hidden="true" size={17} />
						<input
							aria-label="Buscar documentos"
							defaultValue={searchValue(params.q)}
							name="q"
							placeholder="Buscar documento, código o archivo"
						/>
					</label>
				</AutoFilterForm>
			</section>

			{/* Tabs Content */}
			{activeTab === "por-proyecto" && (
				<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{matchingProjects.map((project) => {
						const projectDocs = filteredDocuments.filter(
							(d) => d.projectId === project.id,
						);
						const totalCount = projectDocs.length;
						if (totalCount === 0 && query !== "") return null;

						const contratosCount = projectDocs.filter(
							(d) => getVisualGroup(d.category.key) === "contractual",
						).length;
						const planosCount = projectDocs.filter(
							(d) => getVisualGroup(d.category.key) === "tecnico",
						).length;
						const financierosCount = projectDocs.filter(
							(d) => getVisualGroup(d.category.key) === "financiero",
						).length;
						const informesCount = projectDocs.filter(
							(d) => getVisualGroup(d.category.key) === "informes",
						).length;
						const otrosCount = projectDocs.filter(
							(d) => getVisualGroup(d.category.key) === "administrativo",
						).length;

						const lastUpdate =
							projectDocs.length > 0
								? new Date(
										Math.max(
											...projectDocs.map((d) =>
												new Date(d.updatedAt).getTime(),
											),
										),
									)
								: null;
						const lastUpdateText = lastUpdate
							? lastUpdate.toLocaleDateString("es-GT", {
									day: "2-digit",
									month: "2-digit",
									year: "numeric",
								})
							: "Sin documentos";

						return (
							<div className="documents-project-card group" key={project.id}>
								<div>
									<div className="flex items-start justify-between gap-3">
										<AnimatedFolderIcon />
										<span className="rounded-full bg-[#fce9eb] px-2.5 py-1 text-xs font-bold text-[#b91c2c]">
											{totalCount}{" "}
											{totalCount === 1 ? "documento" : "documentos"}
										</span>
									</div>
									<h3 className="mt-4 text-lg font-extrabold tracking-[-0.02em] text-[#172122]">
										{project.code}
									</h3>
									<p className="mt-1 line-clamp-1 text-sm text-[#65736e]">
										{project.name}
									</p>

									<div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[var(--muted)]">
										<div className="flex justify-between border-b border-[#f4f0ed] pb-1">
											<span>Contratos</span>
											<strong className="text-[var(--foreground)]">
												{contratosCount}
											</strong>
										</div>
										<div className="flex justify-between border-b border-[#f4f0ed] pb-1">
											<span>Planos</span>
											<strong className="text-[var(--foreground)]">
												{planosCount}
											</strong>
										</div>
										<div className="flex justify-between border-b border-[#f4f0ed] pb-1">
											<span>Financieros</span>
											<strong className="text-[var(--foreground)]">
												{financierosCount}
											</strong>
										</div>
										<div className="flex justify-between border-b border-[#f4f0ed] pb-1">
											<span>Informes</span>
											<strong className="text-[var(--foreground)]">
												{informesCount}
											</strong>
										</div>
										<div className="col-span-2 flex justify-between border-b border-[#f4f0ed] pb-1">
											<span>Otros</span>
											<strong className="text-[var(--foreground)]">
												{otrosCount}
											</strong>
										</div>
									</div>
								</div>

								<div className="mt-5 flex items-center justify-between gap-3 border-t border-[#dce2dd] pt-3">
									<span className="text-[11px] text-[var(--muted)]">
										Actualizado: {lastUpdateText}
									</span>
									<a
										className="documents-project-link focus-ring"
										href={`/projects/${project.id}/documents`}
									>
										Abrir documentos →
									</a>
								</div>
							</div>
						);
					})}
					{matchingProjects.length === 0 && (
						<div className="documents-panel col-span-full">
							<DocumentEmpty
								detail="Prueba con otro nombre, código o archivo para encontrar el expediente."
								icon={FolderKanban}
								title="No hay proyectos que coincidan"
							/>
						</div>
					)}
				</section>
			)}

			{activeTab === "recientes" && (
				<section className="documents-panel">
					<div className="flex items-center justify-between border-b border-[#dce2dd] px-5 py-4">
						<div>
							<h2 className="text-lg font-extrabold tracking-[-0.02em] text-[#172122]">
								Documentos recientes
							</h2>
							<p className="mt-0.5 text-xs text-[#65736e]">
								Últimas versiones incorporadas al sistema
							</p>
						</div>
						<Clock3 className="text-[#68756f]" size={19} />
					</div>
					{recentDocuments.length ? (
						<div className="documents-scrollbar overflow-x-auto">
							<table className="documents-table min-w-[800px]">
								<thead>
									<tr>
										<th className="px-4 py-3">Documento</th>
										<th className="px-4 py-3">Proyecto</th>
										<th className="px-4 py-3">Categoría</th>
										<th className="px-4 py-3">Modificado</th>
										<th className="px-4 py-3">Versión</th>
										<th className="px-4 py-3 text-right">Acciones</th>
									</tr>
								</thead>
								<tbody>
									{recentDocuments.map((doc) => {
										const latest = doc.versions[0];
										const modDate = latest
											? new Date(latest.createdAt)
											: new Date(doc.updatedAt);
										return (
											<tr key={doc.id}>
												<td>
													<p className="font-semibold text-[var(--foreground)]">
														{doc.title}
													</p>
													{doc.description && (
														<p className="mt-0.5 text-xs text-[var(--muted)] truncate max-w-[320px]">
															{doc.description}
														</p>
													)}
												</td>
												<td>
													<p className="font-medium text-[var(--foreground)]">
														{doc.project.code}
													</p>
													<p className="text-xs text-[var(--muted)] truncate max-w-[200px]">
														{doc.project.name}
													</p>
												</td>
												<td>
													<span className="documents-category">
														<FileText size={13} />
														{doc.category.name}
													</span>
												</td>
												<td className="text-xs text-[var(--muted)]">
													{formatRelativeTime(modDate)}
												</td>
												<td>
													<span className="documents-version">
														v{latest?.versionNumber ?? 1}
													</span>
												</td>
												<td className="text-right">
													<a
														className="documents-row-action focus-ring"
														href={documentsHref(params, { preview: doc.id })}
													>
														<Eye size={14} />
														Ver
													</a>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<DocumentEmpty
							detail="Cuando se cargue o actualice un archivo, aparecerá en esta vista."
							icon={Clock3}
							title="Aún no hay documentos recientes"
						/>
					)}
				</section>
			)}

			{activeTab === "todos" && (
				<div className="space-y-4">
					{/* Filters Form */}
					<AutoFilterForm
						action="/documents"
						className="documents-panel grid items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
					>
						<input type="hidden" name="tab" value="todos" />
						{searchValue(params.q) && (
							<input type="hidden" name="q" value={searchValue(params.q)} />
						)}

						<label className="documents-field">
							Proyecto
							<select
								className={documentInputClass}
								defaultValue={projectFilter}
								name="project"
							>
								<option value="">Todos los proyectos</option>
								{allProjects.map((project) => (
									<option key={project.id} value={project.id}>
										{project.code} - {project.name}
									</option>
								))}
							</select>
						</label>

						<label className="documents-field">
							Categoría
							<select
								className={documentInputClass}
								defaultValue={categoryFilter}
								name="category"
							>
								<option value="">Todas las categorías</option>
								{allCategories.map((category) => (
									<option key={category.key} value={category.key}>
										{category.name}
									</option>
								))}
							</select>
						</label>

						<label className="documents-field">
							Estado
							<select
								className={documentInputClass}
								defaultValue={statusFilter}
								name="status"
							>
								<option value="">Todos los estados</option>
								{Object.entries(documentStatusLabels).map(([status, label]) => (
									<option key={status} value={status}>
										{label}
									</option>
								))}
							</select>
						</label>

						<div className="flex gap-2">
							{(projectFilter || categoryFilter || statusFilter || query) && (
								<a
									className="documents-clear focus-ring"
									href="/documents?tab=todos"
								>
									Limpiar filtros
								</a>
							)}
						</div>
					</AutoFilterForm>

					{/* Documents Table */}
					<article className="documents-panel">
						{paginatedDocuments.length ? (
							<div className="documents-scrollbar overflow-x-auto">
								<table className="documents-table min-w-[1040px]">
									<thead>
										<tr>
											<th className="px-4 py-3">Documento</th>
											<th className="px-4 py-3">Proyecto</th>
											<th className="px-4 py-3">Categoría</th>
											<th className="px-4 py-3">Estado</th>
											<th className="px-4 py-3">Versión</th>
											<th className="px-4 py-3">Archivo</th>
											<th className="px-4 py-3">Fecha</th>
											<th className="px-4 py-3 text-right">Acciones</th>
										</tr>
									</thead>
									<tbody>
										{paginatedDocuments.map((document) => {
											const latest = document.versions[0];
											return (
												<tr key={document.id}>
													<td>
														<p className="font-semibold text-[var(--foreground)]">
															{document.title}
														</p>
														{(document.description ?? document.tags) ? (
															<p className="mt-1 max-w-[300px] truncate text-xs text-[var(--muted)]">
																{document.description ?? document.tags}
															</p>
														) : null}
													</td>
													<td>
														<p className="font-medium text-[var(--foreground)]">
															{document.project.code}
														</p>
														<p className="max-w-[220px] truncate text-xs text-[var(--muted)]">
															{document.project.name}
														</p>
													</td>
													<td>
														<span className="documents-category">
															<FileText size={13} />
															{document.category.name}
														</span>
													</td>
													<td>
														<DocumentStatus
															label={
																documentStatusLabels[
																	document.status as keyof typeof documentStatusLabels
																] || document.status
															}
															status={document.status}
														/>
													</td>
													<td>
														{latest ? (
															<span className="documents-version">
																v{latest.versionNumber}
															</span>
														) : (
															"-"
														)}
													</td>
													<td>
														{latest ? (
															<>
																<p className="text-xs">
																	{formatBytes(latest.fileSize)}
																</p>
																<p
																	className="max-w-[180px] truncate text-[11px] text-[var(--muted)]"
																	title={latest.originalName}
																>
																	{latest.originalName}
																</p>
															</>
														) : (
															"-"
														)}
													</td>
													<td className="text-xs text-[var(--muted)]">
														{latest
															? dateFormatter.format(new Date(latest.createdAt))
															: "-"}
													</td>
													<td className="text-right">
														<div className="inline-flex gap-2">
															{latest ? (
																<a
																	className="documents-row-action focus-ring"
																	href={documentsHref(params, {
																		preview: document.id,
																	})}
																>
																	<Eye size={14} />
																	Ver
																</a>
															) : null}
															{latest ? (
																<a
																	className="documents-row-action documents-row-action--dark focus-ring"
																	download
																	href={documentFileUrl(latest.id)}
																>
																	<Download size={14} />
																	Descargar
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
						) : (
							<DocumentEmpty
								detail="Cambia los filtros o sube el primer archivo para comenzar el expediente."
								icon={FileArchive}
								title="No hay documentos en esta vista"
							/>
						)}

						{/* Pagination Controls */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3.5 bg-[#fbfbf8] text-sm">
								<span className="text-xs text-[var(--muted)]">
									Página {currentPage} de {totalPages} (
									{filteredDocuments.length} documentos totales)
								</span>
								<div className="flex gap-2">
									<a
										className={`focus-ring rounded border px-3 py-1.5 text-xs font-semibold transition ${
											currentPage <= 1
												? "pointer-events-none text-[var(--muted)] bg-[#f5f5f5]"
												: "bg-white hover:bg-[#f4f0ed]"
										}`}
										href={documentsHref(params, {
											page: String(currentPage - 1),
										})}
									>
										Anterior
									</a>
									<a
										className={`focus-ring rounded border px-3 py-1.5 text-xs font-semibold transition ${
											currentPage >= totalPages
												? "pointer-events-none text-[var(--muted)] bg-[#f5f5f5]"
												: "bg-white hover:bg-[#f4f0ed]"
										}`}
										href={documentsHref(params, {
											page: String(currentPage + 1),
										})}
									>
										Siguiente
									</a>
								</div>
							</div>
						)}
					</article>
				</div>
			)}

			{/* Global Upload Modal */}
			{false && showUpload && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-[#111819]/60 p-4 backdrop-blur-sm">
					<section className="w-[min(560px,94vw)] rounded-2xl bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
						<header className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
							<h2 className="text-lg font-semibold flex items-center gap-2">
								<FolderKanban className="text-[var(--brand-red)]" size={20} />
								Subir documento
							</h2>
							<a
								aria-label="Cerrar modal"
								className="focus-ring grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f4f0ed] text-[var(--muted)]"
								href={documentsHref(params, { upload: "" })}
							>
								<X size={18} />
							</a>
						</header>

						<form
							action={createProjectDocumentGlobalAction}
							className="space-y-4"
						>
							<label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
								Proyecto *
								<select
									className={`${inputClass} mt-1`}
									name="projectId"
									required
								>
									<option value="">Selecciona un proyecto</option>
									{allProjects.map((p) => (
										<option key={p.id} value={p.id}>
											{p.code} - {p.name}
										</option>
									))}
								</select>
							</label>

							<div className="grid gap-3 sm:grid-cols-2">
								<label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
									Tipo / Categoría *
									<select
										className={`${inputClass} mt-1`}
										name="categoryId"
										required
									>
										{allCategories.map((cat) => (
											<option key={cat.id} value={cat.id}>
												{cat.name}
											</option>
										))}
									</select>
								</label>

								<label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
									Estado *
									<select
										className={`${inputClass} mt-1`}
										name="status"
										defaultValue="DRAFT"
									>
										<option value="DRAFT">Borrador</option>
										<option value="REVIEW">En revisión</option>
										<option value="APPROVED">Aprobado</option>
									</select>
								</label>
							</div>

							<label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
								Título (Nombre visible)
								<input
									className={`${inputClass} mt-1`}
									name="title"
									placeholder="Ej. Contrato de Obra Civil"
								/>
							</label>

							<label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
								Archivo *
								<input
									className={`${inputClass} mt-1`}
									name="file"
									required
									type="file"
								/>
							</label>

							<div className="grid gap-3 sm:grid-cols-2">
								<label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
									Etiquetas
									<input
										className={`${inputClass} mt-1`}
										name="tags"
										placeholder="ej. fase 1, plano, aprobado"
									/>
								</label>

								<div className="flex items-center gap-2 rounded-lg border border-[#cfd5ce] bg-[#fbfbf8] px-3 self-end h-11">
									<input
										id="portalVisible"
										name="portalVisible"
										type="checkbox"
										className="h-4 w-4 rounded"
									/>
									<label
										htmlFor="portalVisible"
										className="text-xs text-[var(--muted)] cursor-pointer select-none"
									>
										Visible en portal *
									</label>
								</div>
							</div>

							<label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
								Descripción
								<textarea
									className={`${textareaClass} mt-1`}
									name="description"
									placeholder="Añade una descripción sobre este archivo..."
								/>
							</label>

							<label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
								Notas de versión (v1)
								<textarea
									className={`${textareaClass} mt-1`}
									name="versionNotes"
									placeholder="Detalles de la primera carga..."
								/>
							</label>

							<p className="text-[10px] text-[var(--muted)] leading-normal italic">
								* Nota: El documento solo se hará visible al cliente en el
								portal si su estado es "Aprobado".
							</p>

							<div className="flex gap-2 border-t border-[var(--border)] pt-4 mt-2 justify-end">
								<a
									className="focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-[#cfd5ce] bg-white px-4 text-sm font-semibold text-[var(--muted)] hover:bg-[#f4f0ed]"
									href={documentsHref(params, { upload: "" })}
								>
									Cancelar
								</a>
								<button
									className="focus-ring inline-flex h-10 items-center justify-center rounded-lg bg-[var(--brand-red)] px-5 text-sm font-semibold text-white hover:bg-[#b51d2a] shadow-sm"
									type="submit"
								>
									Subir Documento
								</button>
							</div>
						</form>
					</section>
				</div>
			)}

			{showUpload && (
				<DocumentUploadDrawer
					action={createProjectDocumentGlobalAction}
					categories={allCategories.filter((category) => manualDocumentCategoryKeys.has(category.key)).map((category) => ({
						id: category.id,
						key: category.key,
						name: category.name,
						description: category.description,
					}))}
					closeHref={documentsHref(params, { upload: "" })}
					projects={allProjects}
				/>
			)}

			{/* Preview Modal */}
			{previewDocument && (
				<DocumentPreviewModal
					closeHref={documentsHref(params, { preview: "" })}
					document={previewDocument}
				/>
			)}
		</main>
	);
}
