import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { submitWebsiteInquiryAction } from "@/modules/website/application/actions";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { FacebookIcon, InstagramIcon } from "@/modules/website/ui/social-icons";

export const metadata: Metadata = {
	title: "Contacto",
	description:
		"Contáctanos para cotizar tu proyecto de construcción o remodelación.",
};

const outcomeMessages: Record<
	string,
	{ tone: "success" | "error"; text: string }
> = {
	ok: {
		tone: "success",
		text: "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.",
	},
	validation: {
		tone: "error",
		text: "Revisa los datos del formulario e intenta de nuevo.",
	},
	rate_limit: {
		tone: "error",
		text: "Has enviado demasiadas solicitudes. Intenta de nuevo más tarde.",
	},
	server: {
		tone: "error",
		text: "No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos.",
	},
};

export default async function ContactoPage({
	searchParams,
}: {
	searchParams: Promise<{ enviado?: string }>;
}) {
	const params = await searchParams;
	const outcome = params.enviado ? outcomeMessages[params.enviado] : undefined;
	const { settings } = await getPublicWebsiteContent();
	const phonePrimary = withDefault(
		settings?.phonePrimary,
		websiteDefaults.phonePrimary,
	);
	const phoneSecondary = withDefault(
		settings?.phoneSecondary,
		websiteDefaults.phoneSecondary,
	);
	const email = withDefault(settings?.email, websiteDefaults.email);
	const address = withDefault(settings?.address, websiteDefaults.address);
	const hoursWeekdays = withDefault(
		settings?.hoursWeekdays,
		websiteDefaults.hoursWeekdays,
	);
	const hoursSaturday = withDefault(
		settings?.hoursSaturday,
		websiteDefaults.hoursSaturday,
	);
	const facebookUrl = withDefault(
		settings?.facebookUrl,
		websiteDefaults.facebookUrl,
	);
	const instagramUrl = withDefault(
		settings?.instagramUrl,
		websiteDefaults.instagramUrl,
	);

	return (
		<>
			<section className="public-page-hero">
				<div className="public-page-hero__background">
					<Image alt="" fill sizes="100vw" src="/site/images/Rd4.jpg" />
				</div>
				<div className="public-page-hero__overlay" />
				<div className="public-page-hero__inner">
					<p className="public-eyebrow">
						{withDefault(
							settings?.contactEyebrow,
							websiteDefaults.contactEyebrow,
						)}
					</p>
					<h1>
						{withDefault(
							settings?.contactHeading,
							websiteDefaults.contactHeading,
						)}
					</h1>
					<p className="public-page-hero__lede">
						{withDefault(
							settings?.contactSubheading,
							websiteDefaults.contactSubheading,
						)}
					</p>
				</div>
			</section>

			<section className="public-section public-contact" id="formulario">
				<div className="public-contact__info">
					<div className="public-contact__item">
						<Phone aria-hidden="true" size={18} />
						<div>
							<a href={`tel:${phonePrimary.replace(/[^+\d]/g, "")}`}>
								{phonePrimary}
							</a>
							<a href={`tel:${phoneSecondary.replace(/[^+\d]/g, "")}`}>
								{phoneSecondary}
							</a>
						</div>
					</div>
					<div className="public-contact__item">
						<Mail aria-hidden="true" size={18} />
						<a href={`mailto:${email}`}>{email}</a>
					</div>
					<div className="public-contact__item">
						<MapPin aria-hidden="true" size={18} />
						<span>{address}</span>
					</div>
					<div className="public-contact__item">
						<Clock aria-hidden="true" size={18} />
						<div>
							<span>{hoursWeekdays}</span>
							<span>{hoursSaturday}</span>
						</div>
					</div>
					<div className="public-contact__item">
						<FacebookIcon size={18} />
						<span>{facebookUrl}</span>
					</div>
					<div className="public-contact__item">
						<InstagramIcon size={18} />
						<span>{instagramUrl}</span>
					</div>
				</div>

				<form
					action={submitWebsiteInquiryAction}
					className="public-contact__form"
				>
					<input name="startedAt" type="hidden" value={Date.now()} />
					<div aria-hidden="true" className="public-honeypot">
						<label htmlFor="website">No llenar este campo</label>
						<input
							autoComplete="off"
							id="website"
							name="website"
							tabIndex={-1}
							type="text"
						/>
					</div>

					{outcome ? (
						<p
							className={`public-form-message public-form-message--${outcome.tone}`}
							role="status"
						>
							{outcome.text}
						</p>
					) : null}

					<label className="public-field">
						<span>Nombre y apellido</span>
						<input name="name" required type="text" />
					</label>
					<label className="public-field">
						<span>Teléfono</span>
						<input name="phone" required type="tel" />
					</label>
					<label className="public-field">
						<span>Correo electrónico</span>
						<input name="email" required type="email" />
					</label>
					<label className="public-field">
						<span>Mensaje</span>
						<textarea name="message" required rows={5} />
					</label>
					<button
						className="public-button public-button--primary"
						type="submit"
					>
						Enviar mensaje
					</button>
				</form>
			</section>
		</>
	);
}
