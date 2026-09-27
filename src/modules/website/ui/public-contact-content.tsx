import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import { submitWebsiteInquiryAction } from "@/modules/website/application/actions";
import {
	getGmailComposeLink,
	getSocialContact,
	getWhatsAppLink,
} from "@/modules/website/domain/contact-links";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { FacebookIcon, InstagramIcon } from "@/modules/website/ui/social-icons";
import type { PublicWebsiteContent } from "../domain/public-content";
import { PublicInquirySubmit } from "./public-inquiry-submit";
import { PublicPageHero } from "./public-page-hero";

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

const delay = (d: number) => ({ "--d": d }) as React.CSSProperties;

export function PublicContactContent({
	settings,
	outcomeKey,
}: PublicWebsiteContent & { outcomeKey?: string }) {
	const outcome = outcomeKey ? outcomeMessages[outcomeKey] : undefined;
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
	const primaryWhatsApp = getWhatsAppLink(phonePrimary);
	const secondaryWhatsApp = getWhatsAppLink(phoneSecondary);
	const gmailCompose = getGmailComposeLink(email);
	const socials = [
		{
			Icon: FacebookIcon,
			contact: getSocialContact(
				"facebook",
				withDefault(settings?.facebookUrl, websiteDefaults.facebookUrl),
			),
		},
		{
			Icon: InstagramIcon,
			contact: getSocialContact(
				"instagram",
				withDefault(settings?.instagramUrl, websiteDefaults.instagramUrl),
			),
		},
	];
	const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

	return (
		<>
			<PublicPageHero
				eyebrow={withDefault(
					settings?.contactEyebrow,
					websiteDefaults.contactEyebrow,
				)}
				image="/site/images/Rd4.jpg"
				imagePosition="center 60%"
				lede={withDefault(
					settings?.contactSubheading,
					websiteDefaults.contactSubheading,
				)}
				next={{ href: "#formulario", label: "Escríbenos" }}
				title={withDefault(
					settings?.contactHeading,
					websiteDefaults.contactHeading,
				)}
			/>

			<section className="hm-section hm-section--lit" id="formulario">
				<div className="hm-wrap hm-contact">
					<div className="hm-contact__info">
						<h2 data-reveal="up">Conversemos.</h2>
						<p className="hm-contact__intro" data-reveal="up" style={delay(1)}>
							El primer paso de tu proyecto empieza aquí.
						</p>
						<div className="hm-channels">
							<article
								className="hm-channel"
								data-glow
								data-reveal="up"
								style={delay(1)}
							>
								<MessageCircle aria-hidden="true" size={22} />
								<h3>WhatsApp</h3>
								{primaryWhatsApp ? (
									<a
										aria-label={`Escribir por WhatsApp al ${phonePrimary}`}
										href={primaryWhatsApp}
										rel="noreferrer"
										target="_blank"
									>
										{phonePrimary}
									</a>
								) : null}
								{secondaryWhatsApp ? (
									<a
										aria-label={`Escribir por WhatsApp al ${phoneSecondary}`}
										href={secondaryWhatsApp}
										rel="noreferrer"
										target="_blank"
									>
										{phoneSecondary}
									</a>
								) : null}
							</article>
							<article
								className="hm-channel"
								data-glow
								data-reveal="up"
								style={delay(2)}
							>
								<Mail aria-hidden="true" size={22} />
								<h3>Correo</h3>
								{gmailCompose ? (
									<a
										aria-label={`Redactar correo para ${email} en Gmail`}
										className="hm-channel__break"
										href={gmailCompose}
										rel="noreferrer"
										target="_blank"
									>
										{email}
									</a>
								) : null}
							</article>
							<article
								className="hm-channel"
								data-glow
								data-reveal="up"
								style={delay(3)}
							>
								<MapPin aria-hidden="true" size={22} />
								<h3>Visítanos</h3>
								<p>{address}</p>
								<a href={mapHref} rel="noreferrer" target="_blank">
									Abrir en Google Maps
									<ArrowUpRight aria-hidden="true" size={15} />
								</a>
							</article>
							<article
								className="hm-channel"
								data-glow
								data-reveal="up"
								style={delay(4)}
							>
								<Clock aria-hidden="true" size={22} />
								<h3>Horario</h3>
								<p>{hoursWeekdays}</p>
								<p>{hoursSaturday}</p>
							</article>
						</div>
						<div
							className="hm-contact__social"
							data-reveal="up"
							style={delay(2)}
						>
							{socials.map(({ Icon, contact }) =>
								contact ? (
									contact.href ? (
										<a
											href={contact.href}
											key={contact.label}
											rel="noreferrer"
											target="_blank"
										>
											<Icon size={18} />
											{contact.label}
										</a>
									) : (
										<span key={contact.label}>
											<Icon size={18} />
											{contact.label}
										</span>
									)
								) : null,
							)}
						</div>
					</div>

					<form
						action={submitWebsiteInquiryAction}
						className="hm-form"
						data-glow
						data-reveal="up"
						style={delay(1)}
					>
						<h2>Cuéntanos los detalles</h2>
						<p className="hm-form__note">
							Todos los campos son obligatorios. Te respondemos en horario
							laboral.
						</p>
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
								className={`hm-form__message hm-form__message--${outcome.tone}`}
								role="status"
							>
								{outcome.text}
							</p>
						) : null}

						<div className="hm-form__row">
							<label className="hm-field">
								<span>Nombre y apellido</span>
								<input
									autoComplete="name"
									maxLength={160}
									minLength={2}
									name="name"
									required
									type="text"
								/>
							</label>
							<label className="hm-field">
								<span>Teléfono</span>
								<input
									autoComplete="tel"
									maxLength={30}
									minLength={7}
									name="phone"
									required
									type="tel"
								/>
							</label>
						</div>
						<label className="hm-field">
							<span>Correo electrónico</span>
							<input
								autoComplete="email"
								maxLength={200}
								name="email"
								required
								type="email"
							/>
						</label>
						<label className="hm-field">
							<span>Mensaje</span>
							<textarea
								maxLength={4000}
								minLength={10}
								name="message"
								placeholder="Tipo de obra, ubicación y lo que tienes en mente…"
								required
								rows={5}
							/>
						</label>
						<PublicInquirySubmit />
					</form>
				</div>
			</section>
		</>
	);
}
