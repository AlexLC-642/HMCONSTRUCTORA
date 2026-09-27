import Link from "next/link";
import { getWhatsAppLink } from "@/modules/website/domain/contact-links";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import type { PublicWebsiteContent } from "../domain/public-content";
import { PublicCtaBand } from "./public-cta-band";
import { PublicPageHero } from "./public-page-hero";
import { PublicServiceExplorer } from "./public-service-explorer";

export function PublicServicesContent(content: PublicWebsiteContent) {
	const { services, settings } = content;

	return (
		<>
			<PublicPageHero
				eyebrow="Servicios"
				image="/site/images/blog1.jpg"
				imagePosition="center 40%"
				next={{ href: "#catalogo", label: "Ver servicios" }}
				title={withDefault(
					settings?.servicesHeading,
					websiteDefaults.servicesHeading,
				)}
				lede={withDefault(
					settings?.servicesEyebrow,
					websiteDefaults.servicesEyebrow,
				)}
			/>

			<section className="hm-section hm-section--lit" id="catalogo">
				<div className="hm-wrap">
					{services.length === 0 ? (
						<p className="hm-empty">
							Estamos actualizando nuestros servicios.{" "}
							<Link href="/contacto">
								Contáctanos para consultar tu proyecto.
							</Link>
						</p>
					) : (
						<PublicServiceExplorer services={services} />
					)}
				</div>
			</section>

			<PublicCtaBand
				heading={withDefault(settings?.ctaHeading, websiteDefaults.ctaHeading)}
				image="/site/images/Rd4.jpg"
				text={withDefault(settings?.ctaText, websiteDefaults.ctaText)}
				whatsAppHref={getWhatsAppLink(
					withDefault(settings?.phonePrimary, websiteDefaults.phonePrimary),
				)}
			/>
		</>
	);
}
