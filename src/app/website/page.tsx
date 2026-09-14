import {
	CalendarClock,
	Camera,
	ExternalLink,
	Globe,
	Inbox,
	Layers,
	Mail,
	MessageSquareText,
	Plus,
	Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	addWebsitePhotoFromEvidenceAction,
	deleteWebsitePhotoAction,
	deleteWebsiteServiceAction,
	moveWebsitePhotoAction,
	moveWebsiteServiceAction,
	setWebsitePhotoActiveAction,
	updateWebsiteInquiryStatusAction,
	upsertWebsiteServiceAction,
} from "@/modules/website/application/actions";
import { getWebsiteAdminWorkspace } from "@/modules/website/application/queries";
import { resolveWebsiteCopy } from "@/modules/website/domain/defaults";
import {
	websiteInquiryStatusLabels,
	websiteInquiryStatusValues,
} from "@/modules/website/domain/validation";
import { WebsiteGalleryUploadForm } from "@/modules/website/ui/website-gallery-upload-form";
import { WebsiteServiceIconPicker } from "@/modules/website/ui/website-service-icon-picker";
import { WebsiteSettingsEditor } from "@/modules/website/ui/website-settings-editor";

const inputClass =
	"website-admin-control focus-ring h-11 w-full px-3 text-sm text-[var(--foreground)] transition placeholder:text-[#8b9691]";
const textareaClass =
	"website-admin-control focus-ring min-h-24 w-full px-3 py-2 text-sm text-[var(--foreground)] transition placeholder:text-[#8b9691]";
const panelClass = "website-admin-panel";

const tabs = [
	{ key: "inicio", label: "Inicio" },
	{ key: "servicios", label: "Servicios" },
	{ key: "galeria", label: "Galería" },
	{ key: "solicitudes", label: "Solicitudes" },
] as const;

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="grid gap-1.5">
			<span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#58635f]">
				{label}
			</span>
			{children}
			{hint ? (
				<span className="text-xs text-[var(--muted)]">{hint}</span>
			) : null}
		</div>
	);
}

function Metric({
	label,
	value,
	detail,
	icon: Icon,
	tone,
}: {
	label: string;
	value: string;
	detail: string;
	icon: typeof Globe;
	tone: "red" | "green" | "amber" | "steel";
}) {
	const toneClass = {
		red: "bg-[var(--brand-red)] text-white",
		green: "bg-[var(--success)] text-white",
		amber: "bg-[var(--safety)] text-[#211b09]",
		steel: "bg-[var(--steel)] text-white",
	}[tone];

	return (
		<div className="website-metric" data-tone={tone}>
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#58635f]">
						{label}
					</p>
					<p className="mt-2 text-3xl font-semibold leading-none tabular-nums text-[#101416]">
						{value}
					</p>
					<p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
				</div>
				<span className={`website-metric__icon ${toneClass}`}>
					<Icon aria-hidden="true" size={18} />
				</span>
			</div>
		</div>
	);
}

export default async function WebsitePage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	await requirePermission("sitio.editar");
	const params = searchParams ? await searchParams : {};
	const activeTab =
		(Array.isArray(params.tab) ? params.tab[0] : params.tab) ?? "inicio";
	const { settings, services, photos, inquiries, reusableEvidence } =
		await getWebsiteAdminWorkspace();
	const publishedCopy = resolveWebsiteCopy(settings);

	const newInquiries = inquiries.filter((item) => item.status === "NEW").length;
	const activeServices = services.filter((item) => item.active).length;
	const activePhotos = photos.filter((item) => item.active).length;
	const galleryAlbums = Array.from(
		new Set(photos.map((photo) => photo.title)),
	).filter(Boolean);

	return (
		<main className="website-admin mx-auto max-w-[1400px] space-y-5">
			<section className="website-admin-hero overflow-hidden rounded-2xl bg-[#172123] text-white shadow-[0_26px_65px_rgba(17,28,27,0.24)]">
				<div className="website-admin-hero__layout flex flex-wrap items-center justify-between gap-5 p-6 sm:p-7">
					<div className="flex items-center gap-3">
						<span className="grid size-14 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
							<Globe aria-hidden="true" size={24} />
						</span>
						<h1 className="sr-only">Sitio web</h1>
					</div>
					<div className="website-admin-hero__actions flex flex-wrap items-center gap-2">
						<span
							className={`rounded-full border px-4 py-2 text-xs font-semibold ${settings.published ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-amber-400/40 bg-amber-400/10 text-amber-100"}`}
						>
							{settings.published ? "Sitio publicado" : "Sitio oculto"}
						</span>
						<a
							className="website-public-link focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-[#172123] shadow-[0_10px_26px_rgba(0,0,0,0.18)] transition hover:bg-[#edf2ee]"
							href="/"
							target="_blank"
							rel="noreferrer"
						>
							Ver sitio público <ExternalLink aria-hidden="true" size={14} />
						</a>
					</div>
				</div>
			</section>

			<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Metric
					detail="Visibles en /servicios"
					icon={Layers}
					label="Servicios activos"
					tone="steel"
					value={String(activeServices)}
				/>
				<Metric
					detail="Visibles en /proyectos"
					icon={Camera}
					label="Fotos publicadas"
					tone="green"
					value={String(activePhotos)}
				/>
				<Metric
					detail="Sin atender"
					icon={Inbox}
					label="Solicitudes nuevas"
					tone="amber"
					value={String(newInquiries)}
				/>
				<Metric
					detail="Total recibidas"
					icon={MessageSquareText}
					label="Solicitudes totales"
					tone="red"
					value={String(inquiries.length)}
				/>
			</section>

			<nav
				aria-label="Secciones del sitio web"
				className="website-admin-tabs flex flex-wrap gap-2 rounded-xl bg-white p-1.5 shadow-[0_12px_34px_rgba(22,27,29,0.1)]"
			>
				{tabs.map((tab) => (
					<a
						className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab.key ? "bg-[var(--steel)] text-white" : "text-[#46504c] hover:bg-[#f3f5f1]"}`}
						href={`/website?tab=${tab.key}`}
						key={tab.key}
					>
						{tab.label}
					</a>
				))}
			</nav>

			{activeTab === "inicio" ? (
				<WebsiteSettingsEditor
					copy={publishedCopy}
					heroImageUrl={settings.heroImageUrl ?? "/site/images/blog1.jpg"}
					published={settings.published}
				/>
			) : null}

			{activeTab === "servicios" ? (
				<section className="website-content-layout">
					<form
						action={upsertWebsiteServiceAction}
						className={`${panelClass} website-service-form grid gap-3 p-5`}
					>
						<div className="flex items-center gap-3 border-b border-[#e1e5df] pb-3">
							<span className="grid size-9 place-items-center rounded-lg bg-[var(--brand-red)] text-white">
								<Plus aria-hidden="true" size={16} />
							</span>
							<h2 className="text-base font-semibold">Nuevo servicio</h2>
						</div>
						<Field label="Título">
							<input className={inputClass} name="title" required />
						</Field>
						<Field label="Descripción">
							<textarea className={textareaClass} name="description" required />
						</Field>
						<WebsiteServiceIconPicker />
						<label className="flex items-center gap-2 text-sm font-semibold text-[#253033]">
							<input
								className="size-4 accent-[var(--brand-red)]"
								defaultChecked
								name="active"
								type="checkbox"
							/>
							Visible en el sitio
						</label>
						<button
							className="focus-ring mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white"
							type="submit"
						>
							Agregar servicio
						</button>
					</form>

					<div className={`${panelClass} website-service-library`}>
						{services.map((service, index) => (
							<div className="website-service-item" key={service.id}>
								<div className="flex sm:flex-col gap-1">
									<form action={moveWebsiteServiceAction}>
										<input name="id" type="hidden" value={service.id} />
										<input name="direction" type="hidden" value="up" />
										<button
											className="focus-ring rounded-md border border-[#cfd5ce] px-2 py-1 text-xs disabled:opacity-30"
											disabled={index === 0}
											type="submit"
										>
											▲
										</button>
									</form>
									<form action={moveWebsiteServiceAction}>
										<input name="id" type="hidden" value={service.id} />
										<input name="direction" type="hidden" value="down" />
										<button
											className="focus-ring rounded-md border border-[#cfd5ce] px-2 py-1 text-xs disabled:opacity-30"
											disabled={index === services.length - 1}
											type="submit"
										>
											▼
										</button>
									</form>
								</div>
								<form
									action={upsertWebsiteServiceAction}
									className="grid gap-2"
								>
									<input name="id" type="hidden" value={service.id} />
									<div className="grid gap-2">
										<input
											className={inputClass}
											defaultValue={service.title}
											name="title"
											required
										/>
									</div>
									<WebsiteServiceIconPicker
										compact
										defaultValue={service.icon}
									/>
									<textarea
										className={textareaClass}
										defaultValue={service.description}
										name="description"
										required
									/>
									<div className="flex items-center justify-between">
										<label className="flex items-center gap-2 text-xs font-semibold text-[#253033]">
											<input
												className="size-4 accent-[var(--brand-red)]"
												defaultChecked={service.active}
												name="active"
												type="checkbox"
											/>
											Visible
										</label>
										<button
											className="focus-ring rounded-lg border border-[#cfd5ce] bg-white px-3 py-1.5 text-xs font-semibold text-[#253033] hover:bg-[#f5f6f2]"
											type="submit"
										>
											Guardar
										</button>
									</div>
								</form>
								<form action={deleteWebsiteServiceAction}>
									<input name="id" type="hidden" value={service.id} />
									<button
										className="focus-ring rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
										title="Eliminar"
										type="submit"
									>
										<Trash2 aria-hidden="true" size={16} />
									</button>
								</form>
							</div>
						))}
						{services.length === 0 ? (
							<div className="website-empty-state">
								<Layers size={28} />
								<strong>No hay servicios publicados</strong>
								<p>Completa el formulario para agregar el primero.</p>
							</div>
						) : null}
					</div>
				</section>
			) : null}

			{activeTab === "galeria" ? (
				<section className="website-content-layout website-content-layout--gallery">
					<div className="grid gap-5">
						<WebsiteGalleryUploadForm albums={galleryAlbums} />

						<div className={`${panelClass} p-5`}>
							<h2 className="mb-3 text-base font-semibold">
								Reutilizar evidencia de un proyecto
							</h2>
							<p className="mb-3 text-xs text-[var(--muted)]">
								Nunca se hace pública automáticamente: elige una foto de un
								informe diario y publícala aquí.
							</p>
							<div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
								{reusableEvidence.map((item) => (
									<form
										action={addWebsitePhotoFromEvidenceAction}
										className="flex items-center gap-3 rounded-lg border border-[#e1e5df] p-2"
										key={item.id}
									>
										<input
											name="dailyReportMediaId"
											type="hidden"
											value={item.id}
										/>
										{/* biome-ignore lint/performance/noImgElement: thumbnail grid from arbitrary stored URLs, not the LCP element */}
										<img
											alt=""
											className="size-14 shrink-0 rounded-md object-cover"
											src={item.publicUrl}
										/>
										<div className="min-w-0 flex-1">
											<input
												className={`${inputClass} h-8 text-xs`}
												defaultValue={
													item.title ?? item.dailyReport.reportNumber
												}
												name="title"
												required
											/>
											<p className="mt-1 truncate text-[11px] text-[var(--muted)]">
												{item.dailyReport.project?.code} ·{" "}
												{item.dailyReport.reportNumber}
											</p>
										</div>
										<input
											name="altText"
											type="hidden"
											value={item.title ?? ""}
										/>
										<button
											className="focus-ring shrink-0 rounded-md border border-[#cfd5ce] bg-white px-2 py-1.5 text-xs font-semibold text-[#253033] hover:bg-[#f5f6f2]"
											type="submit"
										>
											Publicar
										</button>
									</form>
								))}
								{reusableEvidence.length === 0 ? (
									<p className="text-center text-sm text-[var(--muted)]">
										Sin evidencia disponible todavía.
									</p>
								) : null}
							</div>
						</div>
					</div>

					<div className={`${panelClass} website-gallery-library`}>
						<div className="website-gallery-library__header">
							<div>
								<h2>Álbumes publicados</h2>
								<p>
									Cada tarjeta indica su álbum. Puedes ocultar, ordenar o
									eliminar una foto.
								</p>
							</div>
							<span>{activePhotos} visibles</span>
						</div>
						<div className="website-gallery-library__grid">
							{photos.map((photo, index) => (
								<div className="website-gallery-card" key={photo.id}>
									{/* biome-ignore lint/performance/noImgElement: thumbnail grid from arbitrary stored URLs, not the LCP element */}
									<img
										alt={photo.altText ?? photo.title}
										className="website-gallery-card__image"
										src={photo.imageUrl}
									/>
									<div className="website-gallery-card__body">
										<p>
											<span>Álbum</span>
											<strong>{photo.title}</strong>
										</p>
										<div className="flex items-center justify-between gap-1">
											<form action={setWebsitePhotoActiveAction}>
												<input name="id" type="hidden" value={photo.id} />
												<input
													name="active"
													type="hidden"
													value={photo.active ? "" : "on"}
												/>
												<button
													className={`rounded-full px-2 py-1 text-[10px] font-semibold ${photo.active ? "bg-emerald-50 text-emerald-800" : "bg-[#eef1ef] text-[#58635f]"}`}
													type="submit"
												>
													{photo.active ? "Visible" : "Oculta"}
												</button>
											</form>
											<div className="flex items-center gap-1">
												<form action={moveWebsitePhotoAction}>
													<input name="id" type="hidden" value={photo.id} />
													<input name="direction" type="hidden" value="up" />
													<button
														className="rounded-md border border-[#cfd5ce] px-1.5 py-0.5 text-[10px] disabled:opacity-30"
														disabled={index === 0}
														type="submit"
													>
														▲
													</button>
												</form>
												<form action={moveWebsitePhotoAction}>
													<input name="id" type="hidden" value={photo.id} />
													<input name="direction" type="hidden" value="down" />
													<button
														className="rounded-md border border-[#cfd5ce] px-1.5 py-0.5 text-[10px] disabled:opacity-30"
														disabled={index === photos.length - 1}
														type="submit"
													>
														▼
													</button>
												</form>
												<form action={deleteWebsitePhotoAction}>
													<input name="id" type="hidden" value={photo.id} />
													<button
														className="website-gallery-card__delete focus-ring"
														title={`Eliminar foto de ${photo.title}`}
														type="submit"
													>
														<Trash2 aria-hidden="true" size={12} />
														<span>Eliminar</span>
													</button>
												</form>
											</div>
										</div>
									</div>
								</div>
							))}
							{photos.length === 0 ? (
								<div className="website-empty-state col-span-full">
									<Camera size={28} />
									<strong>No hay fotos publicadas</strong>
									<p>Selecciona un álbum y agrega las primeras imágenes.</p>
								</div>
							) : null}
						</div>
					</div>
				</section>
			) : null}

			{activeTab === "solicitudes" ? (
				<div
					className={`${panelClass} divide-y divide-[#e1e5df] overflow-hidden`}
				>
					{inquiries.map((inquiry) => (
						<div
							className="grid gap-3 p-4 lg:grid-cols-[1fr_260px]"
							key={inquiry.id}
						>
							<div>
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="font-semibold text-[#101416]">
										{inquiry.name}
									</h3>
									<span className="rounded-full bg-[#eef1ef] px-2.5 py-1 text-xs font-semibold text-[#46504c]">
										{websiteInquiryStatusLabels[inquiry.status]}
									</span>
								</div>
								<p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
									<span className="inline-flex items-center gap-1">
										<Mail aria-hidden="true" size={13} /> {inquiry.email}
									</span>
									<span>{inquiry.phone}</span>
									<span className="inline-flex items-center gap-1">
										<CalendarClock aria-hidden="true" size={13} />{" "}
										{new Intl.DateTimeFormat("es-GT", {
											dateStyle: "medium",
											timeStyle: "short",
										}).format(inquiry.createdAt)}
									</span>
								</p>
								<p className="mt-2 whitespace-pre-wrap text-sm text-[#253033]">
									{inquiry.message}
								</p>
								{inquiry.handledBy ? (
									<p className="mt-2 text-xs text-[var(--muted)]">
										Atendida por {inquiry.handledBy.name}
									</p>
								) : null}
							</div>
							<form
								action={updateWebsiteInquiryStatusAction}
								className="grid gap-2 self-start"
							>
								<input name="id" type="hidden" value={inquiry.id} />
								<Field label="Estado">
									<select
										className={inputClass}
										defaultValue={inquiry.status}
										name="status"
									>
										{websiteInquiryStatusValues.map((status) => (
											<option key={status} value={status}>
												{websiteInquiryStatusLabels[status]}
											</option>
										))}
									</select>
								</Field>
								<Field label="Notas internas">
									<textarea
										className={textareaClass}
										defaultValue={inquiry.notes ?? ""}
										name="notes"
									/>
								</Field>
								<button
									className="focus-ring h-9 rounded-lg bg-[var(--steel)] px-3 text-xs font-semibold text-white"
									type="submit"
								>
									Actualizar
								</button>
							</form>
						</div>
					))}
					{inquiries.length === 0 ? (
						<div className="grid min-h-[240px] place-items-center px-5 py-10 text-center">
							<div>
								<Inbox
									aria-hidden="true"
									className="mx-auto text-[#8d9792]"
									size={32}
								/>
								<p className="mt-3 font-semibold">Sin solicitudes todavía.</p>
							</div>
						</div>
					) : null}
				</div>
			) : null}
		</main>
	);
}
