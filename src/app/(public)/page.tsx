import { ClipboardCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { resolveWebsiteServiceIcon } from "@/modules/website/domain/icon-registry";

export default async function PublicHomePage() {
	const { settings, services } = await getPublicWebsiteContent();
	const homeServices = services.slice(0, 3).map((service) => ({
		id: service.id,
		icon: resolveWebsiteServiceIcon(service.icon),
		title: service.title,
		description: service.description,
	}));

	return (
		<>
			<section className="public-hero">
				<div className="public-hero__background">
					<Image
						alt="Obra en ejecución HM Constructora"
						fill
						priority
						sizes="100vw"
						src={settings?.heroImageUrl || "/site/images/blog1.jpg"}
					/>
				</div>
				<div className="public-hero__overlay" />
				<div className="public-hero__inner">
					<p className="public-eyebrow">
						{withDefault(settings?.heroEyebrow, websiteDefaults.heroEyebrow)}
					</p>
					<h1>
						{settings?.heroHeading ? (
							settings.heroHeading
						) : (
							<>
								Constructora <em>H&amp;M</em>
							</>
						)}
					</h1>
					<p className="public-hero__lede">
						{withDefault(
							settings?.heroSubheading,
							websiteDefaults.heroSubheading,
						)}
					</p>
					<div className="public-hero__actions">
						<Link
							className="public-button public-button--primary"
							href="/proyectos"
						>
							Conoce nuestros proyectos
						</Link>
						<Link
							className="public-button public-button--ghost"
							href="/contacto"
						>
							Solicitar cotización
						</Link>
					</div>
				</div>
				<span className="public-hero__scroll">Descubre más</span>
			</section>

			<section className="public-section" id="servicios">
				<div className="public-section__heading">
					<p className="public-eyebrow">
						{withDefault(
							settings?.homeServicesEyebrow,
							websiteDefaults.homeServicesEyebrow,
						)}
					</p>
					<h2>
						{withDefault(
							settings?.homeServicesHeading,
							websiteDefaults.homeServicesHeading,
						)}
					</h2>
				</div>
				<div className="public-service-grid">
					{homeServices.map((service, index) => (
						<div
							className="public-service-card"
							key={service.id}
							style={{ "--i": index } as React.CSSProperties}
						>
							<span className="public-service-card__icon">
								<service.icon aria-hidden="true" size={22} />
							</span>
							<h3>{service.title}</h3>
							<p>{service.description}</p>
						</div>
					))}
				</div>
				<div className="public-section__footer">
					<Link
						className="public-button public-button--ghost"
						href="/servicios"
					>
						Ver todos los servicios
					</Link>
				</div>
			</section>

			<section className="public-section public-section--muted" id="nosotros">
				<div className="public-about">
					<div>
						<p className="public-eyebrow">Nosotros</p>
						<h2>
							{withDefault(
								settings?.aboutHeading,
								websiteDefaults.aboutHeading,
							)}
						</h2>
						<p>{withDefault(settings?.aboutText, websiteDefaults.aboutText)}</p>
					</div>
					<div className="public-about__cards">
						<div className="public-about__card">
							<span className="public-about__badge">
								<ClipboardCheck aria-hidden="true" size={20} />
							</span>
							<h3>Misión</h3>
							<p>
								{withDefault(
									settings?.missionText,
									websiteDefaults.missionText,
								)}
							</p>
						</div>
						<div className="public-about__card">
							<span className="public-about__badge">
								<ClipboardCheck aria-hidden="true" size={20} />
							</span>
							<h3>Visión</h3>
							<p>
								{withDefault(settings?.visionText, websiteDefaults.visionText)}
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className="public-cta">
				<div>
					<h2>
						{withDefault(settings?.ctaHeading, websiteDefaults.ctaHeading)}
					</h2>
					<p>{withDefault(settings?.ctaText, websiteDefaults.ctaText)}</p>
				</div>
				<Link className="public-button public-button--primary" href="/contacto">
					Solicitar cotización
				</Link>
			</section>
		</>
	);
}
