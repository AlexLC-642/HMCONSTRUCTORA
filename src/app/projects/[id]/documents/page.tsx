import {
	Archive,
	ArrowLeft,
	CheckCircle2,
	Download,
	Eye,
	FileArchive,
	Files,
	FileText,
	Globe,
	History,
	Layers3,
	Lock,
	MoreVertical,
	Pencil,
	Play,
	Plus,
	Search,
	Trash2,
	Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	addProjectDocumentVersionAction,
	createProjectDocumentAction,
	deleteProjectDocumentAction,
	updateProjectDocumentInfoAction,
	updateProjectDocumentReviewAction,
} from "@/modules/documents/application/actions";
import {
	buildDocumentPreview,
	getProjectDocumentsWorkspace,
} from "@/modules/documents/application/queries";
import {
	documentFileUrl,
	documentStatusLabels,
	manualDocumentCategoryKeys,
} from "@/modules/documents/domain/catalog";
import { DocumentEditDrawer } from "@/modules/documents/ui/document-edit-drawer";
import { DocumentPreviewModal } from "@/modules/documents/ui/document-preview-modal";
import {
	DocumentEmpty,
	DocumentMetric,
	DocumentStatus,
} from "@/modules/documents/ui/document-ui";
import { DocumentUploadDrawer } from "@/modules/documents/ui/document-upload-drawer";
import { DocumentVersionsDrawer } from "@/modules/documents/ui/document-versions-drawer";
import { ConfirmSubmitButton } from "@/shared/components/confirm-submit-button";

const dateFormatter = new Intl.DateTimeFormat("es-GT", {
	dateStyle: "medium",
	timeStyle: "short",
});

type ProjectDocumentsSearch = {
	preview?: string | string[];
	edit?: string | string[];
	versions?: string | string[];
	group?: string | string[];
	upload?: string | string[];
	q?: string | string[];
};

type WorkspaceDocument = NonNullable<
	Awaited<ReturnType<typeof getProjectDocumentsWorkspace>>
>["documents"][number];

function isMediaVersion(mimeType: string | undefined) {
	return (
		!!mimeType &&
		(mimeType.startsWith("image/") || mimeType.startsWith("video/"))
	);
}

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
	const editId = Array.isArray(query.edit) ? query.edit[0] : query.edit;
	const versionsId = Array.isArray(query.versions)
		? query.versions[0]
		: query.versions;
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
	const editAction = updateProjectDocumentInfoAction.bind(
		null,
		workspace.project.id,
	);
	const addVersionAction = addProjectDocumentVersionAction.bind(
		null,
		workspace.project.id,
	);
	const deleteAction = deleteProjectDocumentAction.bind(
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

	// Tabs mirror the real category catalog (the same options shown in the
	// upload dialog) instead of an invented grouping, and only list
	// categories that actually have a document - an empty tab is just noise.
	const categoryDocumentCounts = new Map<string, number>();
	for (const document of workspace.documents) {
		categoryDocumentCounts.set(
			document.category.key,
			(categoryDocumentCounts.get(document.category.key) ?? 0) + 1,
		);
	}
	const groups = [
		{ key: "todos", name: "Todos" },
		...workspace.categories
			.filter((category) => (categoryDocumentCounts.get(category.key) ?? 0) > 0)
			.map((category) => ({ key: category.key, name: category.name })),
	];

	const filteredDocuments = workspace.documents.filter((doc) => {
		const matchesGroup =
			activeGroup === "todos" || doc.category.key === activeGroup;
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

	const mediaDocuments = filteredDocuments.filter((doc) =>
		isMediaVersion(doc.versions[0]?.mimeType),
	);
	const fileDocuments = filteredDocuments.filter(
		(doc) => !isMediaVersion(doc.versions[0]?.mimeType),
	);

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

	const editDocument = editId
		? (workspace.documents.find((document) => document.id === editId) ?? null)
		: null;

	const versionsDocument = versionsId
		? (workspace.documents.find((document) => document.id === versionsId) ??
			null)
		: null;

	const baseHref = (extra: Record<string, string> = {}) => {
		const urlParams = new URLSearchParams({
			group: activeGroup,
			q: searchText,
			...extra,
		});
		for (const [key, value] of Array.from(urlParams.entries())) {
			if (!value) urlParams.delete(key);
		}
		return `/projects/${workspace.project.id}/documents?${urlParams.toString()}`;
	};

	const tabClass = (groupKey: string) =>
		`documents-tab focus-ring ${activeGroup === groupKey ? "documents-tab--active" : ""}`;

	function renderActionsMenu(document: WorkspaceDocument, openUpward = false) {
		return (
			<details className="group relative">
				<summary
					aria-label="Más acciones del documento"
					className="focus-ring flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[#f4f0ed] hover:text-[var(--foreground)]"
				>
					<MoreVertical size={15} />
				</summary>
				<div
					className={`absolute right-0 z-30 w-52 rounded-xl border border-[#dfe3dc] bg-white shadow-[0_16px_42px_rgba(22,27,29,0.16)] overflow-hidden ${openUpward ? "bottom-full mb-1" : "top-full mt-1"}`}
				>
					<div className="space-y-0.5 py-1 text-[13px]">
						{canEdit ? (
							<a
								className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--foreground)] hover:bg-[#f9f7f4] transition"
								href={baseHref({ edit: document.id })}
							>
								<Pencil size={14} />
								<span>Editar información</span>
							</a>
						) : null}
						<a
							className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--foreground)] hover:bg-[#f9f7f4] transition"
							href={baseHref({ versions: document.id })}
						>
							<History size={14} />
							<span>Historial y versiones</span>
						</a>

						{canEdit && document.status === "APPROVED" ? (
							<>
								<div className="my-1 h-px bg-[#e5e7eb]" />
								{!document.portalVisible ? (
									<form action={reviewAction.bind(null, document.id)}>
										<input name="status" type="hidden" value="APPROVED" />
										<input name="portalVisible" type="hidden" value="on" />
										<button
											className="w-full flex items-center gap-2.5 px-3 py-2 text-[#0f766e] hover:bg-[#ecfeff] transition"
											type="submit"
										>
											<Globe size={14} />
											<span>Publicar en portal</span>
										</button>
									</form>
								) : (
									<form action={reviewAction.bind(null, document.id)}>
										<input name="status" type="hidden" value="APPROVED" />
										<button
											className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--muted)] hover:bg-[#f9f7f4] transition"
											type="submit"
										>
											<Lock size={14} />
											<span>Retirar del portal</span>
										</button>
									</form>
								)}
							</>
						) : null}

						{canEdit ? (
							<>
								<div className="my-1 h-px bg-[#e5e7eb]" />
								{document.status !== "ARCHIVED" ? (
									<form action={reviewAction.bind(null, document.id)}>
										<input name="status" type="hidden" value="ARCHIVED" />
										<button
											className="w-full flex items-center gap-2.5 px-3 py-2 text-[#7c2d12] hover:bg-[#fef2f2] transition"
											type="submit"
										>
											<Archive size={14} />
											<span>Archivar</span>
										</button>
									</form>
								) : null}
								<form action={deleteAction.bind(null, document.id)}>
									<ConfirmSubmitButton
										className="w-full flex items-center gap-2.5 px-3 py-2 text-[#b3261e] hover:bg-[#fef2f2] transition"
										description={`Se eliminará "${document.title}" de forma permanente, junto con su archivo y el historial de versiones. Esta acción no se puede deshacer.`}
										title="Eliminar documento"
									>
										<Trash2 size={14} />
										<span>Eliminar</span>
									</ConfirmSubmitButton>
								</form>
							</>
						) : null}
					</div>
				</div>
			</details>
		);
	}

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
								href={baseHref({ group: group.key })}
								key={group.key}
							>
								{group.name}
							</a>
						))}
					</nav>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<form
							action={`/projects/${workspace.project.id}/documents`}
							className="documents-search flex-1 sm:max-w-md"
							method="GET"
						>
							<Search aria-hidden="true" size={16} />
							<input
								aria-label="Buscar documento"
								defaultValue={searchText}
								name="q"
								placeholder="Buscar por título, archivo o etiqueta"
							/>
							<input name="group" type="hidden" value={activeGroup} />
						</form>
						{canEdit && (
							<a
								className="documents-primary-action focus-ring"
								href={baseHref({ upload: "true" })}
							>
								<Plus aria-hidden="true" size={16} />
								Subir documento
							</a>
						)}
					</div>
				</div>

				{mediaDocuments.length > 0 && (
					<article className="documents-panel p-4">
						<h2 className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
							Fotos y videos ({mediaDocuments.length})
						</h2>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{mediaDocuments.map((document) => {
								const latest = document.versions[0];
								if (!latest) return null;
								const isVideo = latest.mimeType.startsWith("video/");
								const previewHref = baseHref({ preview: document.id });
								return (
									<div
										className="group relative rounded-xl border border-[var(--border)] bg-[#101719]"
										key={document.id}
									>
										<a
											aria-label={`Ver ${document.title}`}
											className="block aspect-[4/3] w-full overflow-hidden rounded-t-xl"
											href={previewHref}
										>
											{isVideo ? (
												<video
													className="h-full w-full object-cover opacity-90"
													muted
													preload="metadata"
													src={`${documentFileUrl(latest.id)}#t=0.1`}
												>
													<track kind="captions" />
												</video>
											) : (
												// biome-ignore lint/performance/noImgElement: thumbnail grid, not the Next/Image optimized path.
												<img
													alt={document.title}
													className="h-full w-full object-cover"
													src={documentFileUrl(latest.id)}
												/>
											)}
											{isVideo && (
												<span className="absolute inset-0 grid place-items-center">
													<span className="grid size-9 place-items-center rounded-full bg-black/55 text-white">
														<Play fill="currentColor" size={16} />
													</span>
												</span>
											)}
										</a>
										{/* Not overflow-hidden like the card used to be: the actions
										menu below opens as an absolutely-positioned popup that must
										be able to extend past this card's edges instead of being
										clipped by it. */}
										<div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 rounded-b-xl bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-6">
											<div className="min-w-0">
												<p className="truncate text-xs font-semibold text-white">
													{document.title}
												</p>
												<p className="truncate text-[10px] text-[#c4ceca]">
													{document.category.name}
												</p>
											</div>
											<div className="flex shrink-0 items-center gap-1">
												<a
													aria-label="Descargar"
													className="grid size-7 place-items-center rounded-md bg-white/15 text-white hover:bg-white/25"
													download
													href={documentFileUrl(latest.id)}
												>
													<Download size={13} />
												</a>
												{canEdit && renderActionsMenu(document, true)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</article>
				)}

				{(fileDocuments.length > 0 || mediaDocuments.length === 0) && (
					<article className="documents-panel">
						<div className="documents-scrollbar hidden overflow-x-auto md:block">
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
									{fileDocuments.map((document) => {
										const latest = document.versions[0];
										const isPortal =
											document.status === "APPROVED" && document.portalVisible;
										const previewHref = baseHref({ preview: document.id });

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
																href={documentFileUrl(latest.id)}
															>
																<Download size={13} />
																Descargar
															</a>
														)}
														{renderActionsMenu(document)}
													</div>
												</td>
											</tr>
										);
									})}
									{fileDocuments.length === 0 && (
										<tr>
											<td className="p-0" colSpan={7}>
												<DocumentEmpty
													action={
														canEdit ? (
															<a
																className="documents-primary-action focus-ring"
																href={baseHref({ upload: "true" })}
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
							<div className="grid gap-3 p-3 md:hidden">
								{fileDocuments.map((document) => {
									const latest = document.versions[0];
									const isPortal =
										document.status === "APPROVED" && document.portalVisible;
									const previewHref = baseHref({ preview: document.id });
									return (
										<div
											className="rounded-2xl border border-[#e5e8e3] bg-[#f9faf8] p-4"
											key={document.id}
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex min-w-0 gap-3">
													<div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-[#e8ede9] text-[#4f5e58]">
														<FileText size={16} />
													</div>
													<div className="min-w-0">
														<p className="truncate font-semibold text-[var(--foreground)]">
															{document.title}
														</p>
														{document.description ? (
															<p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
																{document.description}
															</p>
														) : null}
													</div>
												</div>
												{renderActionsMenu(document)}
											</div>
											<div className="mt-3 flex flex-wrap items-center gap-2">
												<span className="documents-category">
													<FileText size={13} />
													{document.category.name}
												</span>
												<DocumentStatus
													label={
														documentStatusLabels[
															document.status as keyof typeof documentStatusLabels
														] || document.status
													}
													status={document.status}
												/>
												{isPortal ? (
													<span className="inline-flex items-center gap-1 rounded border border-[#b7dfcc] bg-[#edf9f2] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--success)]">
														Cliente
													</span>
												) : null}
											</div>
											{latest ? (
												<p className="mt-2 text-xs text-[var(--muted)]">
													v{latest.versionNumber} ·{" "}
													{dateFormatter.format(new Date(latest.createdAt))}
												</p>
											) : null}
											{latest ? (
												<div className="mt-3 flex gap-2">
													<a
														className="documents-row-action focus-ring flex-1 justify-center"
														href={previewHref}
													>
														<Eye size={13} />
														Ver
													</a>
													<a
														className="documents-row-action documents-row-action--dark focus-ring flex-1 justify-center"
														download
														href={documentFileUrl(latest.id)}
													>
														<Download size={13} />
														Descargar
													</a>
												</div>
											) : null}
										</div>
									);
								})}
								{fileDocuments.length === 0 && (
									<DocumentEmpty
										action={
											canEdit ? (
												<a
													className="documents-primary-action focus-ring"
													href={baseHref({ upload: "true" })}
												>
													<Plus size={16} /> Subir documento
												</a>
											) : undefined
										}
										detail="Cambia la categoría o incorpora el primer archivo de este expediente."
										icon={FileArchive}
										title="No hay documentos en esta categoría"
									/>
								)}
							</div>
						</div>
					</article>
				)}
			</div>

			{canEdit && showUpload && (
				<DocumentUploadDrawer
					action={createAction}
					categories={workspace.categories
						.filter((category) => manualDocumentCategoryKeys.has(category.key))
						.map((category) => ({
							id: category.id,
							key: category.key,
							name: category.name,
							description: category.description,
						}))}
					closeHref={baseHref()}
					project={{
						id: workspace.project.id,
						code: workspace.project.code,
						name: workspace.project.name,
					}}
				/>
			)}

			{canEdit && editDocument && (
				<DocumentEditDrawer
					action={editAction.bind(null, editDocument.id)}
					categories={workspace.categories.map((category) => ({
						id: category.id,
						key: category.key,
						name: category.name,
					}))}
					closeHref={baseHref()}
					document={{
						title: editDocument.title,
						description: editDocument.description,
						tags: editDocument.tags,
						categoryId: editDocument.categoryId,
						latestFileName: editDocument.versions[0]?.originalName,
					}}
				/>
			)}

			{versionsDocument && (
				<DocumentVersionsDrawer
					action={addVersionAction.bind(null, versionsDocument.id)}
					canAddVersion={canEdit}
					closeHref={baseHref()}
					documentTitle={versionsDocument.title}
					versions={versionsDocument.versions.map((version) => ({
						id: version.id,
						versionNumber: version.versionNumber,
						originalName: version.originalName,
						fileSize: version.fileSize,
						createdAt: version.createdAt.toISOString(),
						notes: version.notes,
						uploadedBy: version.uploadedBy,
						downloadHref: documentFileUrl(version.id),
					}))}
				/>
			)}

			{previewDocument && (
				<DocumentPreviewModal
					closeHref={baseHref()}
					document={previewDocument}
					showProjectCard={false}
				/>
			)}
		</main>
	);
}
