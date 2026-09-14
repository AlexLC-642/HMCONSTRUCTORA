"use client";

import {
	Building2,
	Check,
	Contact,
	Eye,
	ImageIcon,
	PanelsTopLeft,
	Save,
	Search,
	Type,
} from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateWebsiteSettingsAction } from "../application/actions";
import { getSocialContact } from "../domain/contact-links";
import type { WebsiteCopy } from "../domain/defaults";

type SectionKey = "portada" | "nosotros" | "paginas" | "contacto" | "seo";
type EditableCopy = WebsiteCopy & { heroImageUrl: string };

const sections = [
	{
		key: "portada",
		label: "Página de inicio",
		detail: "Título, mensaje e imagen principal",
		icon: Type,
	},
	{
		key: "nosotros",
		label: "Quiénes somos",
		detail: "Historia y presentación de la empresa",
		icon: Building2,
	},
	{
		key: "paginas",
		label: "Servicios y proyectos",
		detail: "Textos de estas páginas públicas",
		icon: PanelsTopLeft,
	},
	{
		key: "contacto",
		label: "Contacto",
		detail: "Teléfonos, redes, correo y horarios",
		icon: Contact,
	},
	{
		key: "seo",
		label: "Aparición en Google",
		detail: "Título y descripción para buscadores",
		icon: Search,
	},
] as const;

const inputClass = "website-editor-field focus-ring";
const textareaClass =
	"website-editor-field website-editor-field--textarea focus-ring";

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: every caller supplies a nested form control through children.
		<label className="website-editor-label">
			<span>{label}</span>
			{children}
			{hint ? <small>{hint}</small> : null}
		</label>
	);
}

function SaveButton({ dirty }: { dirty: boolean }) {
	const { pending } = useFormStatus();
	return (
		<button
			className="website-editor-save focus-ring"
			disabled={pending}
			type="submit"
		>
			{pending ? (
				<span className="website-editor-spinner" />
			) : (
				<Save aria-hidden="true" size={17} />
			)}
			{pending ? "Guardando…" : "Guardar cambios"}
			{!pending && dirty ? <span className="website-editor-save__dot" /> : null}
		</button>
	);
}

export function WebsiteSettingsEditor({
	copy,
	heroImageUrl,
	published,
}: {
	copy: WebsiteCopy;
	heroImageUrl: string;
	published: boolean;
}) {
	const [activeSection, setActiveSection] = useState<SectionKey>("portada");
	const [values, setValues] = useState<EditableCopy>({ ...copy, heroImageUrl });
	const [dirty, setDirty] = useState(false);

	function update(key: keyof EditableCopy, value: string) {
		setValues((current) => ({ ...current, [key]: value }));
		setDirty(true);
	}

	return (
		<form action={updateWebsiteSettingsAction} className="website-editor-shell">
			<aside className="website-editor-nav">
				<div className="website-editor-nav__heading">
					<p>Editor del sitio web</p>
					<span>Elige qué información deseas modificar.</span>
				</div>
				<nav aria-label="Secciones del contenido">
					{sections.map((section) => {
						const Icon = section.icon;
						return (
							<button
								aria-current={
									activeSection === section.key ? "page" : undefined
								}
								className="website-editor-nav__item focus-ring"
								key={section.key}
								onClick={() => setActiveSection(section.key)}
								type="button"
							>
								<span>
									<Icon aria-hidden="true" size={17} />
								</span>
								<span>
									<strong>{section.label}</strong>
									<small>{section.detail}</small>
								</span>
							</button>
						);
					})}
				</nav>
				<label className="website-editor-publish">
					<input
						defaultChecked={published}
						name="published"
						onChange={() => setDirty(true)}
						type="checkbox"
					/>
					<span>
						<Check aria-hidden="true" size={14} />
					</span>
					Sitio visible al público
				</label>
			</aside>

			<div className="website-editor-canvas">
				<header className="website-editor-canvas__header">
					<div>
						<h2>
							{sections.find((section) => section.key === activeSection)?.label}
						</h2>
						<p>El panel derecho refleja tus cambios antes de guardarlos.</p>
					</div>
					<span
						className={
							dirty
								? "website-editor-state website-editor-state--dirty"
								: "website-editor-state"
						}
					>
						{dirty ? "Cambios sin guardar" : "Contenido sincronizado"}
					</span>
				</header>

				<div className="website-editor-workspace">
					<div className="website-editor-form">
						<section hidden={activeSection !== "portada"}>
							<Field label="Texto superior">
								<input
									className={inputClass}
									name="heroEyebrow"
									onChange={(event) =>
										update("heroEyebrow", event.target.value)
									}
									value={values.heroEyebrow}
								/>
							</Field>
							<Field label="Título principal">
								<input
									className={inputClass}
									name="heroHeading"
									onChange={(event) =>
										update("heroHeading", event.target.value)
									}
									value={values.heroHeading}
								/>
							</Field>
							<Field
								label="Mensaje principal"
								hint="Resume en una o dos frases qué hace diferente a la empresa."
							>
								<textarea
									className={textareaClass}
									name="heroSubheading"
									onChange={(event) =>
										update("heroSubheading", event.target.value)
									}
									value={values.heroSubheading}
								/>
							</Field>
							<Field
								label="Imagen de portada"
								hint="Usa una ruta del sitio o una URL pública de imagen."
							>
								<div className="website-editor-image-input">
									<ImageIcon aria-hidden="true" size={17} />
									<input
										name="heroImageUrl"
										onChange={(event) =>
											update("heroImageUrl", event.target.value)
										}
										value={values.heroImageUrl}
									/>
								</div>
							</Field>
						</section>

						<section hidden={activeSection !== "nosotros"}>
							<Field label="Título de Nosotros">
								<input
									className={inputClass}
									name="aboutHeading"
									onChange={(event) =>
										update("aboutHeading", event.target.value)
									}
									value={values.aboutHeading}
								/>
							</Field>
							<Field label="Presentación">
								<textarea
									className={textareaClass}
									name="aboutText"
									onChange={(event) => update("aboutText", event.target.value)}
									value={values.aboutText}
								/>
							</Field>
							<div className="website-editor-form__split">
								<Field label="Misión">
									<textarea
										className={textareaClass}
										name="missionText"
										onChange={(event) =>
											update("missionText", event.target.value)
										}
										value={values.missionText}
									/>
								</Field>
								<Field label="Visión">
									<textarea
										className={textareaClass}
										name="visionText"
										onChange={(event) =>
											update("visionText", event.target.value)
										}
										value={values.visionText}
									/>
								</Field>
							</div>
						</section>

						<section hidden={activeSection !== "paginas"}>
							<div className="website-editor-form__section-title">
								<strong>Servicios en Inicio</strong>
								<span>Presentación de la oferta principal.</span>
							</div>
							<div className="website-editor-form__split">
								<Field label="Texto superior">
									<input
										className={inputClass}
										name="homeServicesEyebrow"
										onChange={(event) =>
											update("homeServicesEyebrow", event.target.value)
										}
										value={values.homeServicesEyebrow}
									/>
								</Field>
								<Field label="Título">
									<input
										className={inputClass}
										name="homeServicesHeading"
										onChange={(event) =>
											update("homeServicesHeading", event.target.value)
										}
										value={values.homeServicesHeading}
									/>
								</Field>
							</div>
							<div className="website-editor-form__section-title">
								<strong>Página Servicios</strong>
								<span>Encabezado antes del catálogo.</span>
							</div>
							<div className="website-editor-form__split">
								<Field label="Texto superior">
									<input
										className={inputClass}
										name="servicesEyebrow"
										onChange={(event) =>
											update("servicesEyebrow", event.target.value)
										}
										value={values.servicesEyebrow}
									/>
								</Field>
								<Field label="Título">
									<input
										className={inputClass}
										name="servicesHeading"
										onChange={(event) =>
											update("servicesHeading", event.target.value)
										}
										value={values.servicesHeading}
									/>
								</Field>
							</div>
							<div className="website-editor-form__section-title">
								<strong>Página Construcciones</strong>
								<span>Presentación de la galería.</span>
							</div>
							<div className="website-editor-form__split">
								<Field label="Texto superior">
									<input
										className={inputClass}
										name="projectsEyebrow"
										onChange={(event) =>
											update("projectsEyebrow", event.target.value)
										}
										value={values.projectsEyebrow}
									/>
								</Field>
								<Field label="Título">
									<input
										className={inputClass}
										name="projectsHeading"
										onChange={(event) =>
											update("projectsHeading", event.target.value)
										}
										value={values.projectsHeading}
									/>
								</Field>
							</div>
							<Field label="Descripción">
								<textarea
									className={textareaClass}
									name="projectsSubheading"
									onChange={(event) =>
										update("projectsSubheading", event.target.value)
									}
									value={values.projectsSubheading}
								/>
							</Field>
							<div className="website-editor-form__section-title">
								<strong>Llamado a cotizar</strong>
								<span>Bloque final del Inicio.</span>
							</div>
							<div className="website-editor-form__split">
								<Field label="Título">
									<input
										className={inputClass}
										name="ctaHeading"
										onChange={(event) =>
											update("ctaHeading", event.target.value)
										}
										value={values.ctaHeading}
									/>
								</Field>
								<Field label="Texto">
									<input
										className={inputClass}
										name="ctaText"
										onChange={(event) => update("ctaText", event.target.value)}
										value={values.ctaText}
									/>
								</Field>
							</div>
						</section>

						<section hidden={activeSection !== "contacto"}>
							<div className="website-editor-form__section-title">
								<strong>Página Contacto</strong>
								<span>Mensaje que recibe al visitante.</span>
							</div>
							<div className="website-editor-form__split">
								<Field label="Texto superior">
									<input
										className={inputClass}
										name="contactEyebrow"
										onChange={(event) =>
											update("contactEyebrow", event.target.value)
										}
										value={values.contactEyebrow}
									/>
								</Field>
								<Field label="Título">
									<input
										className={inputClass}
										name="contactHeading"
										onChange={(event) =>
											update("contactHeading", event.target.value)
										}
										value={values.contactHeading}
									/>
								</Field>
							</div>
							<Field label="Introducción">
								<textarea
									className={textareaClass}
									name="contactSubheading"
									onChange={(event) =>
										update("contactSubheading", event.target.value)
									}
									value={values.contactSubheading}
								/>
							</Field>
							<div className="website-editor-form__section-title">
								<strong>Datos de contacto</strong>
								<span>
									Información visible en la página y el pie del sitio.
								</span>
							</div>
							<div className="website-editor-form__split">
								<Field label="Teléfono principal">
									<input
										className={inputClass}
										name="phonePrimary"
										onChange={(event) =>
											update("phonePrimary", event.target.value)
										}
										value={values.phonePrimary}
									/>
								</Field>
								<Field label="Teléfono secundario">
									<input
										className={inputClass}
										name="phoneSecondary"
										onChange={(event) =>
											update("phoneSecondary", event.target.value)
										}
										value={values.phoneSecondary}
									/>
								</Field>
								<Field label="Correo">
									<input
										className={inputClass}
										name="email"
										onChange={(event) => update("email", event.target.value)}
										type="email"
										value={values.email}
									/>
								</Field>
								<Field label="Dirección">
									<input
										className={inputClass}
										name="address"
										onChange={(event) => update("address", event.target.value)}
										value={values.address}
									/>
								</Field>
								<Field label="Horario entre semana">
									<input
										className={inputClass}
										name="hoursWeekdays"
										onChange={(event) =>
											update("hoursWeekdays", event.target.value)
										}
										value={values.hoursWeekdays}
									/>
								</Field>
								<Field label="Horario sábado">
									<input
										className={inputClass}
										name="hoursSaturday"
										onChange={(event) =>
											update("hoursSaturday", event.target.value)
										}
										value={values.hoursSaturday}
									/>
								</Field>
								<Field
									label="Enlace de Facebook"
									hint="Pega el enlace completo de la página o perfil."
								>
									<input
										className={inputClass}
										inputMode="url"
										name="facebookUrl"
										onChange={(event) =>
											update("facebookUrl", event.target.value)
										}
										placeholder="https://facebook.com/hmconstructora"
										value={values.facebookUrl}
									/>
								</Field>
								<Field
									label="Enlace de Instagram"
									hint="Pega el enlace completo; públicamente se mostrará el @usuario."
								>
									<input
										className={inputClass}
										inputMode="url"
										name="instagramUrl"
										onChange={(event) =>
											update("instagramUrl", event.target.value)
										}
										placeholder="https://instagram.com/hmconstructoragt"
										value={values.instagramUrl}
									/>
								</Field>
							</div>
						</section>

						<section hidden={activeSection !== "seo"}>
							<Field
								label="Título para buscadores"
								hint="Se muestra en la pestaña del navegador y en Google."
							>
								<input
									className={inputClass}
									maxLength={160}
									name="seoTitle"
									onChange={(event) => update("seoTitle", event.target.value)}
									value={values.seoTitle}
								/>
							</Field>
							<Field label="Descripción para buscadores">
								<textarea
									className={textareaClass}
									maxLength={300}
									name="seoDescription"
									onChange={(event) =>
										update("seoDescription", event.target.value)
									}
									value={values.seoDescription}
								/>
							</Field>
							<div className="website-search-preview">
								<span>{values.seoTitle}</span>
								<small>hmconstructora.com</small>
								<p>{values.seoDescription}</p>
							</div>
						</section>
					</div>

					<aside className="website-live-preview">
						<div className="website-live-preview__bar">
							<span>
								<Eye aria-hidden="true" size={15} /> Vista previa
							</span>
							<small>Inicio</small>
						</div>
						{activeSection === "portada" ? (
							<div className="website-live-preview__hero">
								{/* biome-ignore lint/performance/noImgElement: live preview supports arbitrary editor URLs */}
								<img
									alt=""
									src={values.heroImageUrl || "/site/images/blog1.jpg"}
								/>
								<span />
								<div>
									<small>{values.heroEyebrow}</small>
									<h3>{values.heroHeading}</h3>
									<p>{values.heroSubheading}</p>
									<button type="button">Conoce nuestros proyectos</button>
								</div>
							</div>
						) : null}
						{activeSection === "nosotros" ? (
							<div className="website-live-preview__about">
								<small>Nosotros</small>
								<h3>{values.aboutHeading}</h3>
								<p>{values.aboutText}</p>
								<div>
									<article>
										<strong>Misión</strong>
										<p>{values.missionText}</p>
									</article>
									<article>
										<strong>Visión</strong>
										<p>{values.visionText}</p>
									</article>
								</div>
							</div>
						) : null}
						{activeSection === "contacto" ? (
							<div className="website-live-preview__contact">
								<small>{values.contactEyebrow}</small>
								<h3>{values.contactHeading}</h3>
								<p>{values.contactSubheading}</p>
								<ul>
									<li>{values.phonePrimary}</li>
									<li>{values.email}</li>
									<li>{values.address}</li>
									<li>{values.hoursWeekdays}</li>
									<li>
										{getSocialContact("facebook", values.facebookUrl)?.label}
									</li>
									<li>
										{getSocialContact("instagram", values.instagramUrl)?.label}
									</li>
								</ul>
							</div>
						) : null}
						{activeSection === "paginas" ? (
							<div className="website-live-preview__pages">
								<small>{values.projectsEyebrow}</small>
								<h3>{values.projectsHeading}</h3>
								<p>{values.projectsSubheading}</p>
								<div>
									<span>{values.servicesEyebrow}</span>
									<strong>{values.servicesHeading}</strong>
								</div>
								<footer>
									<strong>{values.ctaHeading}</strong>
									<p>{values.ctaText}</p>
								</footer>
							</div>
						) : null}
						{activeSection === "seo" ? (
							<div className="website-live-preview__seo">
								<Search aria-hidden="true" size={28} />
								<strong>Así podrá encontrarte un cliente</strong>
								<p>La vista de Google se actualiza mientras escribes.</p>
							</div>
						) : null}
					</aside>
				</div>

				<footer className="website-editor-footer">
					<p>
						{dirty
							? "Revisa la vista previa y guarda cuando estés listo."
							: "Todo está actualizado."}
					</p>
					<SaveButton dirty={dirty} />
				</footer>
			</div>
		</form>
	);
}
