import Image from "next/image";
import Link from "next/link";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { resolveWebsiteServiceIcon } from "@/modules/website/domain/icon-registry";
import { serviceCardPhoto } from "@/modules/website/domain/service-card-photos";
import { PublicArchitecturalBackdrop } from "@/modules/website/ui/public-architectural-backdrop";
import { PublicHeroRail } from "@/modules/website/ui/public-hero-rail";
import type { PublicWebsiteContent } from "../domain/public-content";

export function PublicServicesContent(content: PublicWebsiteContent) {
	const { services: dbServices, settings } = content;
	const services = dbServices.map((service) => ({
		id: service.id,
		image: serviceCardPhoto(service.position),
		icon: resolveWebsiteServiceIcon(service.icon),
		title: service.title,
		description: service.description,
	}));

	return (
		<>
			<section className="public-page-hero">
				<PublicArchitecturalBackdrop
					position="center 44%"
					src="/site/images/Rd1.png"
				/>
				<div className="public-page-hero__inner">
					<p className="public-eyebrow">
						{withDefault(
							settings?.servicesEyebrow,
							websiteDefaults.servicesEyebrow,
						)}
					</p>
					<h1>
						{withDefault(
							settings?.servicesHeading,
							websiteDefaults.servicesHeading,
						)}
					</h1>
				</div>
				<PublicHeroRail />
			</section>

			<section className="public-section public-services-catalog">
				{services.length === 0 ? (
					<p className="public-empty-message">
						Estamos actualizando nuestros servicios.{" "}
						<Link href="/contacto">
							Contáctanos para consultar tu proyecto.
						</Link>
					</p>
				) : null}
				<div className="public-service-grid public-service-grid--full">
					{services.map((service, index) => (
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
									src={service.image}
								/>
							</div>
							<p>{service.description}</p>
							<Link
								className="public-service-card__cta"
								href="/contacto#formulario"
							>
								Contáctanos
							</Link>
						</div>
					))}
				</div>
			</section>
		</>
	);
}
