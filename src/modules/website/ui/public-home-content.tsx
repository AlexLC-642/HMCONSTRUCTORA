import { ArrowDown, ArrowUpRight, Eye, Target } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getWhatsAppLink } from "@/modules/website/domain/contact-links";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { hdImage } from "@/modules/website/domain/hd-images";
import type { PublicWebsiteContent } from "../domain/public-content";
import { PublicCtaBand } from "./public-cta-band";
import { PublicFeaturedProjects } from "./public-featured-projects";
import { PublicMarquee } from "./public-marquee";
import { PublicServiceExplorer } from "./public-service-explorer";

const delay = (d: number) => ({ "--d": d }) as React.CSSProperties;

export function PublicHomeContent(content: PublicWebsiteContent) {
	const { settings, services, photos } = content;
	const homeServices = services.slice(0, 4);
	const albums = Array.from(
		photos
			.reduce((grouped, photo) => {
				const key = photo.title.trim().toLocaleLowerCase("es-GT");
				const album = grouped.get(key);
				if (album) album.count += 1;
				else grouped.set(key, { ...photo, count: 1 });
				return grouped;
			}, new Map<string, (typeof photos)[number] & { count: number }>())
			.values(),
	).slice(0, 8);
	const heroImage = settings?.heroImageUrl || "/assets/plates/hero-photo.png";
	const whatsApp = getWhatsAppLink(
		withDefault(settings?.phonePrimary, websiteDefaults.phonePrimary),
	);

	return (
		<>
			<section className="hm-hero">
				<div aria-hidden="true" className="hm-hero__media" data-parallax="0.09">
					<Image
						alt=""
						fill
						priority
						quality={90}
						sizes="100vw"
						src={hdImage(heroImage)}
						unoptimized={heroImage.startsWith("/api/")}
					/>
				</div>
				<div aria-hidden="true" className="hm-veil hm-veil--hero" />
				<div aria-hidden="true" className="hm-worklight" />
				<div className="hm-hero__inner">
					<p className="hm-tag hm-rise" style={delay(0)}>
						{withDefault(settings?.heroEyebrow, websiteDefaults.heroEyebrow)}
					</p>
					<h1 className="hm-hero__title hm-rise" style={delay(1)}>
						{settings?.heroHeading ? (
							settings.heroHeading
						) : (
							<>
								Constructora <em>H&amp;M</em>
							</>
						)}
					</h1>
					<p className="hm-hero__lede hm-rise" style={delay(2)}>
						{withDefault(
							settings?.heroSubheading,
							websiteDefaults.heroSubheading,
						)}
					</p>
					<div className="hm-hero__actions hm-rise" style={delay(3)}>
						<Link
							className="hm-btn hm-btn--primary hm-btn--lg"
							href="/contacto"
						>
							Solicitar cotización
							<ArrowUpRight aria-hidden="true" size={20} />
						</Link>
						<Link className="hm-btn hm-btn--ghost hm-btn--lg" href="/proyectos">
							Conoce nuestros proyectos
							<ArrowUpRight aria-hidden="true" size={19} />
						</Link>
					</div>
				</div>
				<a className="hm-scroll-cue" href="#servicios">
					<span>Explora lo que construimos</span>
					<ArrowDown aria-hidden="true" size={16} />
				</a>
				<PublicMarquee items={services.map((service) => service.title)} />
			</section>

			<section className="hm-section hm-section--lit" id="servicios">
				<div className="hm-wrap">
					<header className="hm-heading">
						<div>
							<p className="hm-tag" data-reveal="up">
								{withDefault(
									settings?.homeServicesEyebrow,
									websiteDefaults.homeServicesEyebrow,
								)}
							</p>
							<h2 data-reveal="up" style={delay(1)}>
								{withDefault(
									settings?.homeServicesHeading,
									websiteDefaults.homeServicesHeading,
								)}
							</h2>
						</div>
						<Link
							className="hm-link"
							data-reveal="up"
							href="/servicios"
							style={delay(2)}
						>
							Ver todos los servicios
							<ArrowUpRight aria-hidden="true" size={18} />
						</Link>
					</header>
					<PublicServiceExplorer services={homeServices} />
				</div>
			</section>

			<section className="hm-section hm-about" id="nosotros">
				<div className="hm-wrap hm-about__grid">
					<div className="hm-about__media">
						<div className="hm-about__main" data-reveal="clip">
							<Image
								alt="Cielo falso terminado por HM Constructora"
								fill
								sizes="(min-width: 960px) 40vw, 92vw"
								src="/site/hd/blog3.jpg"
							/>
						</div>
						<div
							className="hm-about__inset"
							data-parallax="0.08"
							data-reveal="clip"
							style={delay(2)}
						>
							<Image
								alt="Detalle de construcción de HM Constructora"
								fill
								sizes="(min-width: 960px) 18vw, 45vw"
								src="/site/images/Rd3.jpg"
							/>
						</div>
					</div>
					<div className="hm-about__content">
						<p className="hm-tag" data-reveal="up">
							Nosotros
						</p>
						<h2 data-reveal="up" style={delay(1)}>
							{withDefault(
								settings?.aboutHeading,
								websiteDefaults.aboutHeading,
							)}
						</h2>
						<p className="hm-about__text" data-reveal="up" style={delay(2)}>
							{withDefault(settings?.aboutText, websiteDefaults.aboutText)}
						</p>
						<div className="hm-pillars">
							<article
								className="hm-pillar"
								data-glow
								data-reveal="up"
								style={delay(3)}
							>
								<Target aria-hidden="true" size={22} />
								<h3>Misión</h3>
								<p>
									{withDefault(
										settings?.missionText,
										websiteDefaults.missionText,
									)}
								</p>
							</article>
							<article
								className="hm-pillar"
								data-glow
								data-reveal="up"
								style={delay(4)}
							>
								<Eye aria-hidden="true" size={22} />
								<h3>Visión</h3>
								<p>
									{withDefault(
										settings?.visionText,
										websiteDefaults.visionText,
									)}
								</p>
							</article>
						</div>
					</div>
				</div>
			</section>

			{albums.length ? (
				<section
					className="hm-section hm-section--lit hm-work"
					id="proyectos-destacados"
				>
					<div className="hm-wrap">
						<header className="hm-heading">
							<div>
								<p className="hm-tag" data-reveal="up">
									Construcciones y remodelaciones
								</p>
								<h2 data-reveal="up" style={delay(1)}>
									Obras que dejan huella
								</h2>
							</div>
							<Link
								className="hm-link"
								data-reveal="up"
								href="/proyectos"
								style={delay(2)}
							>
								Explorar construcciones
								<ArrowUpRight aria-hidden="true" size={18} />
							</Link>
						</header>
					</div>
					<PublicFeaturedProjects projects={albums} />
				</section>
			) : null}

			<PublicCtaBand
				heading={withDefault(settings?.ctaHeading, websiteDefaults.ctaHeading)}
				text={withDefault(settings?.ctaText, websiteDefaults.ctaText)}
				whatsAppHref={whatsApp}
			/>
		</>
	);
}
