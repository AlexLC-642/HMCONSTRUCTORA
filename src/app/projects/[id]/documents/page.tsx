import {
	ArrowLeft,
	CheckCircle2,
	Clock,
	Download,
	Eye,
	FileArchive,
	Files,
	FileText,
	FileUp,
	Globe,
	Layers3,
	Lock,
	MoreVertical,
	Plus,
	Search,
	Settings,
	Trash2,
	Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	createProjectDocumentAction,
	updateProjectDocumentReviewAction,
} from "@/modules/documents/application/actions";
import {
	buildDocumentPreview,
	getProjectDocumentsWorkspace,
} from "@/modules/documents/application/queries";
import { documentStatusLabels, manualDocumentCategoryKeys } from "@/modules/documents/domain/catalog";
import { DocumentPreviewModal } from "@/modules/documents/ui/document-preview-modal";
import {
	DocumentEmpty,
	DocumentMetric,
	DocumentStatus,
} from "@/modules/documents/ui/document-ui";
import { DocumentUploadDrawer } from "@/modules/documents/ui/document-upload-drawer";

const dateFormatter = new Intl.DateTimeFormat("es-GT", {
	dateStyle: "medium",
	timeStyle: "short",
});

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
	return "administrativo";
}

type ProjectDocumentsSearch = {
	preview?: string | string[];
	group?: string | string[];
	upload?: string | string[];
	q?: string | string[];
};

export default async function ProjectDocumentsPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams?: Promise<ProjectDocumentsSearch>;
}) {
	const user = await requirePermission("proyectos.ver");
	const { id } = await params;
	const query = searchParams ? await searchParams : {};
	const previewId = Array.isArray(query.preview)
		? query.preview[0]
		: query.preview;
	const activeGroup =
		(Array.isArray(query.group) ? query.group[0] : query.group) || "todos";
	const showUpload =
		(Array.isArray(query.upload) ? query.upload[0] : query.upload) === "true";
	const searchText = (Array.isArray(query.q) ? query.q[0] : query.q) ?? "";

	const workspace = await getProjectDocumentsWorkspace(id);
	if (!workspace) notFound();

	const canEdit = user.permissions.includes("proyectos.editar");
	const createAction = createProjectDocumentAction.bind(
		null,
		workspace.project.id,
	);
	const reviewAction = updateProjectDocumentReviewAction.bind(
		null,
		workspace.project.id,
	);
	const approvedCount = workspace.documents.filter(
		(document) => document.status === "APPROVED",
	).length;
	const portalCount = workspace.documents.filter(
		(document) => document.portalVisible,
	).length;
	const versionCount = workspace.documents.reduce(
		(sum, document) => sum + document.versions.length,
		0,
	);

	const groups = [
		{ key: "todos", name: "Todos" },
		{ key: "contractual", name: "Contractual" },
		{ key: "tecnico", name: "Técnico" },
		{ key: "financiero", name: "Financiero" },
		{ key: "informes", name: "Informes" },
		{ key: "administrativo", name: "Administrativo" },
	];

	const filteredDocuments = workspace.documents.filter((doc) => {
		const matchesGroup =
			activeGroup === "todos" ||
			getVisualGroup(doc.category.key) === activeGroup;
		if (!matchesGroup) return false;

		if (!searchText.trim()) return true;
		const term = searchText.toLowerCase();
		const latest = doc.versions[0];
		return [
			doc.title,
			doc.description ?? "",
			doc.tags ?? "",
			doc.category.name,
			latest?.originalName ?? "",
			latest?.notes ?? "",
		].some((value) => value.toLowerCase().includes(term));
	});

	const previewDocument = previewId
		? buildDocumentPreview(
				workspace.documents.find((document) => document.id === previewId) ??
					null,
				workspace.project,
				workspace.categories.find(
					(category) =>
						category.id ===
						workspace.documents.find((document) => document.id === previewId)
							?.categoryId,
				) ?? null,
			)
		: undefined;

	const tabClass = (groupKey: string) =>
		`documents-tab focus-ring ${activeGroup === groupKey ? "documents-tab--active" : ""}`;

	return (
		<main className="documents-project-workspace mx-auto max-w-none space-y-5">
			<nav className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
				<a
					className="hover:text-[var(--brand-red)] hover:underline"
					href="/documents"
				>
					Documentos
				</a>
				<span>/</span>
				<span className="text-[var(--foreground)] font-semibold">
					{workspace.project.code}
				</span>
			</nav>

			<section className="documents-hero">
				<div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
					<div className="flex flex-1 items-start gap-4">
						<span className="documents-hero__icon">
							<FileArchive aria-hidden="true" size={21} />
						</span>
						<div className="min-w-0">
							<h1 className="text-3xl font-extrabold leading-tight tracking-[-0.035em] text-white">
								{workspace.project.name}
							</h1>
							<p className="mt-2 text-sm font-medium text-[#c4ceca]">
								Expediente {workspace.project.code}
							</p>
						</div>
					</div>
					<a
						className="documents-secondary-action focus-ring"
						href={`/projects/${workspace.project.id}`}
					>
						<ArrowLeft aria-hidden="true" size={16} />
						Volver
					</a>
				</div>
			</section>

			<section className="kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<DocumentMetric
					detail="Archivos del proyecto"
					icon={Files}
					label="Documentos"
					value={workspace.documents.length}
				/>
				<DocumentMetric
					detail="Historial disponible"
					icon={Layers3}
					label="Versiones"
					tone="amber"
					value={versionCount}
				/>
				<DocumentMetric
					detail="Listos para operar"
					icon={CheckCircle2}
					label="Aprobados"
					tone="green"
					value={approvedCount}
				/>
				<DocumentMetric
					detail="Disponibles en portal"
					icon={Users}
					label="Visible al cliente"
					tone="red"
					value={portalCount}
				/>
			</section>

			<div className="space-y-4">
				<div className="documents-panel space-y-4 p-4">
					<nav
						aria-label="Categorías documentales"
						className="documents-tabs documents-scrollbar max-w-full overflow-x-auto"
					>
						{groups.map((group) => (
							<a
								className={tabClass(group.key)}
								href={`/projects/${workspace.project.id}/documents?group=${group.key}&q=${encodeURIComponent(searchText)}`}
								key={group.key}
							>
								{group.name}
							</a>
						))}
					</nav>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<label className="documents-search flex-1 sm:max-w-md">
							<Search aria-hidden="true" size={16} />
							<input
								aria-label="Buscar documento"
								defaultValue={searchText}
								name="q"
								placeholder="Buscar por título, archivo o etiqueta"
							/>
						</label>
						{canEdit && (
							<a
								className="documents-primary-action focus-ring"
								href={`/projects/${workspace.project.id}/documents?group=${activeGroup}&upload=true&q=${encodeURIComponent(searchText)}`}
							>
								<Plus aria-hidden="true" size={16} />
								Subir documento
							</a>
						)}
					</div>
				</div>

				<article className="documents-panel">
					<div className="documents-scrollbar overflow-x-auto">
						<table className="documents-table min-w-[960px]">
							<thead>
								<tr>
									<th className="px-4 py-3">Documento</th>
									<th className="px-4 py-3">Categoría</th>
									<th className="px-4 py-3">Versión</th>
									<th className="px-4 py-3">Estado</th>
									<th className="px-4 py-3">Fecha</th>
									<th className="px-4 py-3">Visibilidad</th>
									<th className="px-4 py-3 text-right">Acciones</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--border)]">
								{filteredDocuments.map((document) => {
									const latest = document.versions[0];
									const isPortal =
										document.status === "APPROVED" && document.portalVisible;
									const previewHref = `/projects/${workspace.project.id}/documents?group=${activeGroup}&q=${encodeURIComponent(searchText)}&preview=${document.id}`;

									return (
										<tr key={document.id}>
											<td className="max-w-[360px]">
												<div className="flex gap-3">
													<div className="mt-0.5 grid size-9 place-items-center rounded-lg bg-[#e8ede9] text-[#4f5e58]">
														<FileText size={16} />
													</div>
													<div className="min-w-0 flex-1">
														<p className="truncate font-semibold text-[var(--foreground)]">
															{document.title}
														</p>
														{document.description && (
															<p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
																{document.description}
															</p>
														)}
														{document.tags && (
															<div className="mt-2 flex flex-wrap gap-1">
																{document.tags
																	.split(",")
																	.slice(0, 2)
																	.map((tag) => (
																		<span
																			className="rounded bg-[#f4f0ed] px-2 py-0.5 text-[9px] font-semibold text-[var(--muted)]"
																			key={`${document.id}-${tag.trim()}`}
																		>
																			{tag.trim()}
																		</span>
																	))}
															</div>
														)}
													</div>
												</div>
											</td>
											<td>
												<span className="documents-category">
													<FileText size={13} />
													{document.category.name}
												</span>
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
												<DocumentStatus
													label={
														documentStatusLabels[
															document.status as keyof typeof documentStatusLabels
														] || document.status
													}
													status={document.status}
												/>
											</td>
											<td className="text-xs text-[var(--muted)]">
												{latest
													? dateFormatter.format(new Date(latest.createdAt))
													: "-"}
											</td>
											<td>
												{isPortal ? (
													<span className="inline-flex items-center gap-1 rounded bg-[#edf9f2] border border-[#b7dfcc] px-2 py-0.5 text-[10px] font-bold text-[var(--success)] uppercase">
														Cliente
													</span>
												) : (
													<span className="inline-flex items-center gap-1 rounded bg-[#f4f0ed] border border-[#d8d7d2] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)] uppercase">
														Interno
													</span>
												)}
											</td>
											<td className="text-right">
												<div className="inline-flex items-center gap-1.5">
													{latest && (
														<a
															className="documents-row-action focus-ring"
															href={previewHref}
														>
															<Eye size={13} />
															Ver
														</a>
													)}
													{latest && (
														<a
															className="documents-row-action documents-row-action--dark focus-ring"
															download
															href={latest.publicUrl}
														>
															<Download size={13} />
															Descargar
														</a>
													)}
													<details className="group relative">
														<summary
															aria-label="Más acciones del documento"
															className="focus-ring flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[#f4f0ed] hover:text-[var(--foreground)]"
														>
															<MoreVertical size={15} />
														</summary>
														<div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-[#dfe3dc] bg-white shadow-[0_16px_42px_rgba(22,27,29,0.16)] overflow-hidden">
															<div className="space-y-0.5 py-1 text-[13px]">
																{/* Información */}
																<button
																	className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--foreground)] hover:bg-[#f9f7f4] transition"
																	type="button"
																>
																	<Settings size={14} />
																	<span>Editar información</span>
																</button>
																<button
																	className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--foreground)] hover:bg-[#f9f7f4] transition"
																	type="button"
																>
																	<Clock size={14} />
																	<span>Historial</span>
																</button>
																<button
																	className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--foreground)] hover:bg-[#f9f7f4] transition"
																	type="button"
																>
																	<FileUp size={14} />
																	<span>Nueva versión</span>
																</button>

																<div className="my-1 h-px bg-[#e5e7eb]" />

																{/* Workflow */}
																{document.status !== "ARCHIVED" &&
																	document.status !== "REVIEW" && (
																		<form
																			action={reviewAction.bind(
																				null,
																				document.id,
																			)}
																		>
																			<input
																				name="status"
																				type="hidden"
																				value="REVIEW"
																			/>
																			<button
																				className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--foreground)] hover:bg-[#f9f7f4] transition"
																				type="submit"
																			>
																				<span className="flex h-4 w-4 items-center justify-center rounded-sm border border-[var(--border)]" />
																				<span>Enviar a revisión</span>
																			</button>
																		</form>
																	)}
																{document.status === "REVIEW" && (
																	<form
																		action={reviewAction.bind(
																			null,
																			document.id,
																		)}
																	>
																		<input
																			name="status"
																			type="hidden"
																			value="APPROVED"
																		/>
																		<button
																			className="w-full flex items-center gap-2.5 px-3 py-2 text-[#15803d] hover:bg-[#ecfdf5] transition"
																			type="submit"
																		>
																			<span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#15803d]" />
																			<span className="font-semibold">
																				Aprobar
																			</span>
																		</button>
																	</form>
																)}

																<div className="my-1 h-px bg-[#e5e7eb]" />

																{/* Portal */}
																{document.status === "APPROVED" &&
																	!document.portalVisible && (
																		<form
																			action={reviewAction.bind(
																				null,
																				document.id,
																			)}
																		>
																			<input
																				name="status"
																				type="hidden"
																				value="APPROVED"
																			/>
																			<input
																				name="portalVisible"
																				type="hidden"
																				value="on"
																			/>
																			<button
																				className="w-full flex items-center gap-2.5 px-3 py-2 text-[#0f766e] hover:bg-[#ecfeff] transition"
																				type="submit"
																			>
																				<Globe size={14} />
																				<span>Publicar en portal</span>
																			</button>
																		</form>
																	)}
																{document.status === "APPROVED" &&
																	document.portalVisible && (
																		<form
																			action={reviewAction.bind(
																				null,
																				document.id,
																			)}
																		>
																			<input
																				name="status"
																				type="hidden"
																				value="APPROVED"
																			/>
																			<button
																				className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--muted)] hover:bg-[#f9f7f4] transition"
																				type="submit"
																			>
																				<Lock size={14} />
																				<span>Retirar del portal</span>
																			</button>
																		</form>
																	)}

																{/* Archive */}
																{document.status !== "ARCHIVED" && (
																	<>
																		<div className="my-1 h-px bg-[#e5e7eb]" />
																		<form
																			action={reviewAction.bind(
																				null,
																				document.id,
																			)}
																		>
																			<input
																				name="status"
																				type="hidden"
																				value="ARCHIVED"
																			/>
																			<button
																				className="w-full flex items-center gap-2.5 px-3 py-2 text-[#7c2d12] hover:bg-[#fef2f2] transition"
																				type="submit"
																			>
																				<Trash2 size={14} />
																				<span>Archivar</span>
																			</button>
																		</form>
																	</>
																)}
															</div>
														</div>
													</details>
												</div>
											</td>
										</tr>
									);
								})}
								{filteredDocuments.length === 0 && (
									<tr>
										<td className="p-0" colSpan={7}>
											<DocumentEmpty
												action={
													canEdit ? (
														<a
															className="documents-primary-action focus-ring"
															href={`/projects/${workspace.project.id}/documents?group=${activeGroup}&upload=true&q=${encodeURIComponent(searchText)}`}
														>
															<Plus size={16} /> Subir documento
														</a>
													) : undefined
												}
												detail="Cambia la categoría o incorpora el primer archivo de este expediente."
												icon={FileArchive}
												title="No hay documentos en esta categoría"
											/>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</article>
			</div>

			{canEdit && showUpload && (
				<DocumentUploadDrawer
					action={createAction}
					categories={workspace.categories.filter((category) => manualDocumentCategoryKeys.has(category.key)).map((category) => ({
						id: category.id,
						key: category.key,
						name: category.name,
						description: category.description,
					}))}
					closeHref={`/projects/${workspace.project.id}/documents?group=${activeGroup}&q=${encodeURIComponent(searchText)}`}
					project={{
						id: workspace.project.id,
						code: workspace.project.code,
						name: workspace.project.name,
					}}
				/>
			)}

			{previewDocument && (
				<DocumentPreviewModal
					closeHref={`/projects/${workspace.project.id}/documents?group=${activeGroup}&q=${encodeURIComponent(searchText)}`}
					document={previewDocument}
				/>
			)}
		</main>
	);
}
