import { ClipboardCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { resolveWebsiteServiceIcon } from "@/modules/website/domain/icon-registry";
import { serviceCardPhoto } from "@/modules/website/domain/service-card-photos";
import { PublicArchitecturalBackdrop } from "@/modules/website/ui/public-architectural-backdrop";
import { PublicHeroRail } from "@/modules/website/ui/public-hero-rail";

export default async function PublicHomePage() {
	const { settings, services, photos } = await getPublicWebsiteContent();
	const homeServices = services.slice(0, 3).map((service) => ({
		id: service.id,
		icon: resolveWebsiteServiceIcon(service.icon),
		title: service.title,
		description: service.description,
	}));
	const featuredProject = photos[0] ?? null;

	return (
		<>
			<section className="public-hero">
				<PublicArchitecturalBackdrop
					priority
					src={settings?.heroImageUrl || "/assets/plates/hero-photo.png"}
				/>
				<div className="public-hero__inner">
					<div className="public-hero__copy">
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
								href="/contacto"
							>
								Solicitar cotización
							</Link>
							<Link
								className="public-button public-button--ghost"
								href="/proyectos"
							>
								Conoce nuestros proyectos
							</Link>
						</div>
					</div>
				</div>
				<PublicHeroRail />
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
							<div className="public-service-card__head">
								<span className="public-service-card__icon">
									<service.icon aria-hidden="true" size={20} />
								</span>
								<h3>{service.title}</h3>
							</div>
							<div className="public-service-card__media">
								<Image
									alt=""
									fill
									sizes="(min-width: 960px) 25vw, 90vw"
									src={serviceCardPhoto(index)}
								/>
							</div>
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
					<div className="public-about__media">
						<Image
							alt="Obra de HM Constructora en ejecución"
							fill
							sizes="(min-width: 960px) 38vw, 92vw"
							src="/site/images/Rd.png"
						/>
					</div>
					<div className="public-about__content">
						<div>
							<p className="public-eyebrow">Nosotros</p>
							<h2>
								{withDefault(
									settings?.aboutHeading,
									websiteDefaults.aboutHeading,
								)}
							</h2>
							<p>
								{withDefault(settings?.aboutText, websiteDefaults.aboutText)}
							</p>
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
									{withDefault(
										settings?.visionText,
										websiteDefaults.visionText,
									)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{featuredProject ? (
				<section className="public-section" id="proyectos-destacados">
					<div className="public-projects-teaser">
						<div className="public-projects-teaser__content">
							<p className="public-eyebrow">Proyectos destacados</p>
							<h2>Obras que dejan huella</h2>
							<p>
								Cada proyecto refleja nuestro compromiso con la calidad, la
								funcionalidad y la confianza de nuestros clientes.
							</p>
							<div className="public-projects-teaser__actions">
								<Link
									className="public-button public-button--ghost"
									href="/proyectos"
								>
									Ver todos los proyectos
								</Link>
							</div>
						</div>
						<div className="public-projects-teaser__media">
							<Image
								alt={featuredProject.altText ?? featuredProject.title}
								fill
								sizes="(min-width: 960px) 50vw, 92vw"
								src={featuredProject.imageUrl}
							/>
							<div className="public-projects-teaser__caption">
								<strong>{featuredProject.title}</strong>
								<Link href="/proyectos">Ver proyecto →</Link>
							</div>
						</div>
					</div>
				</section>
			) : null}

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
