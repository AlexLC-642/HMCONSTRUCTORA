import type { WebsiteSettings } from "@prisma/client";
import { ArrowUpRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import {
	getGmailComposeLink,
	getSocialContact,
	getWhatsAppLink,
} from "@/modules/website/domain/contact-links";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { PublicDesktopNav } from "@/modules/website/ui/public-desktop-nav";
import { PublicMobileNav } from "@/modules/website/ui/public-mobile-nav";
import { FacebookIcon, InstagramIcon } from "@/modules/website/ui/social-icons";
import { PublicExperience } from "./public-experience";
import { publicFontVariables } from "./public-fonts";

const navLinks: Array<{ href: Route; label: string }> = [
	{ href: "/", label: "Inicio" },
	{ href: "/servicios", label: "Servicios" },
	{ href: "/proyectos", label: "Construcciones" },
	{ href: "/contacto", label: "Contacto" },
];

export function PublicSiteFrame({
	children,
	settings,
}: {
	children: React.ReactNode;
	settings: WebsiteSettings | null;
}) {
	if (!settings)
		return (
			<main
				className={`public-site hm-experience hm-maintenance ${publicFontVariables}`}
			>
				<h1>Estamos actualizando nuestro sitio</h1>
				<p>
					Volveremos pronto con información de nuestros servicios y
					construcciones.
				</p>
			</main>
		);
	const phonePrimary = withDefault(
		settings.phonePrimary,
		websiteDefaults.phonePrimary,
	);
	const phoneSecondary = withDefault(
		settings.phoneSecondary,
		websiteDefaults.phoneSecondary,
	);
	const email = withDefault(settings.email, websiteDefaults.email);
	const address = withDefault(settings.address, websiteDefaults.address);
	const hoursWeekdays = withDefault(
		settings.hoursWeekdays,
		websiteDefaults.hoursWeekdays,
	);
	const hoursSaturday = withDefault(
		settings.hoursSaturday,
		websiteDefaults.hoursSaturday,
	);
	const primaryWhatsApp = getWhatsAppLink(phonePrimary);
	const secondaryWhatsApp = getWhatsAppLink(phoneSecondary);
	const gmailCompose = getGmailComposeLink(email);
	const facebook = getSocialContact(
		"facebook",
		withDefault(settings.facebookUrl, websiteDefaults.facebookUrl),
	);
	const instagram = getSocialContact(
		"instagram",
		withDefault(settings.instagramUrl, websiteDefaults.instagramUrl),
	);
	const socials = [
		{ network: "Facebook", contact: facebook },
		{ network: "Instagram", contact: instagram },
	];

	return (
		<PublicExperience>
			<a className="hm-skip-link" href="#contenido">
				Ir al contenido
			</a>
			<header className="hm-nav">
				<div className="hm-nav__inner">
					<Link
						className="hm-nav__brand"
						href="/"
						aria-label="HM Constructora, inicio"
					>
						<Image
							alt=""
							height={80}
							priority
							src="/assets/plates/brand-logo.png"
							width={87}
						/>
					</Link>
					<PublicDesktopNav links={navLinks} />
					<Link className="hm-btn hm-btn--primary hm-nav__cta" href="/contacto">
						Solicitar cotización
						<ArrowUpRight aria-hidden="true" size={18} />
					</Link>
					<PublicMobileNav
						links={navLinks}
						phone={phonePrimary}
						phoneHref={primaryWhatsApp}
					/>
				</div>
				<span aria-hidden="true" className="hm-nav__progress" />
			</header>

			<main id="contenido" tabIndex={-1}>
				{children}
			</main>

			<footer className="hm-footer">
				<div className="hm-footer__statement">
					<p className="hm-footer__motto" data-reveal="up">
						Construyendo un mejor mañana
					</p>
					<Link className="hm-btn hm-btn--primary" href="/contacto">
						Empieza tu proyecto
						<ArrowUpRight aria-hidden="true" size={20} />
					</Link>
				</div>
				<div className="hm-footer__grid">
					<div className="hm-footer__brand">
						<Image
							alt="HM Constructora"
							height={64}
							src="/assets/plates/brand-logo.png"
							width={70}
						/>
						<p>
							Constructora H&amp;M — tu aliado estratégico en la materialización
							de proyectos arquitectónicos y de ingeniería.
						</p>
						<div className="hm-footer__social">
							{facebook?.href ? (
								<a
									aria-label={`Facebook: ${facebook.label}`}
									href={facebook.href}
									rel="noreferrer"
									target="_blank"
								>
									<FacebookIcon size={18} />
								</a>
							) : null}
							{instagram?.href ? (
								<a
									aria-label={`Instagram: ${instagram.label}`}
									href={instagram.href}
									rel="noreferrer"
									target="_blank"
								>
									<InstagramIcon size={18} />
								</a>
							) : null}
						</div>
					</div>
					<nav aria-label="Navegación del pie de página">
						<p className="hm-footer__heading">Navegación</p>
						<ul>
							{navLinks.map((link) => (
								<li key={link.href}>
									<Link href={link.href}>{link.label}</Link>
								</li>
							))}
						</ul>
					</nav>
					<div>
						<p className="hm-footer__heading">Contacto</p>
						<ul>
							{primaryWhatsApp ? (
								<li>
									<a href={primaryWhatsApp} rel="noreferrer" target="_blank">
										{phonePrimary}
									</a>
								</li>
							) : null}
							{secondaryWhatsApp ? (
								<li>
									<a href={secondaryWhatsApp} rel="noreferrer" target="_blank">
										{phoneSecondary}
									</a>
								</li>
							) : null}
							{gmailCompose ? (
								<li>
									<a href={gmailCompose} rel="noreferrer" target="_blank">
										{email}
									</a>
								</li>
							) : null}
							<li>{address}</li>
						</ul>
					</div>
					<div>
						<p className="hm-footer__heading">Horario</p>
						<ul>
							<li>{hoursWeekdays}</li>
							<li>{hoursSaturday}</li>
						</ul>
						<p className="hm-footer__heading">Síguenos</p>
						<ul>
							{socials.map(({ network, contact }) =>
								contact ? (
									<li key={network}>
										{contact.href ? (
											<a href={contact.href} rel="noreferrer" target="_blank">
												{network} — {contact.label}
											</a>
										) : (
											<span>
												{network} — {contact.label}
											</span>
										)}
									</li>
								) : null,
							)}
						</ul>
					</div>
				</div>
				<div className="hm-footer__bottom">
					<span>
						© {new Date().getFullYear()} Constructora H&amp;M. Todos los
						derechos reservados.
					</span>
					<Link href={"/login" as Route}>Acceso interno</Link>
				</div>
			</footer>
		</PublicExperience>
	);
}
