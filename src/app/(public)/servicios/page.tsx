import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { resolveWebsiteServiceIcon } from "@/modules/website/domain/icon-registry";

export const metadata: Metadata = {
	title: "Servicios",
	description:
		"Diseño arquitectónico, planificación, ejecución de obra, remodelaciones e instalaciones.",
};

export default async function ServiciosPage() {
	const { services: dbServices, settings } = await getPublicWebsiteContent();
	const services = dbServices.map((service) => ({
		id: service.id,
		icon: resolveWebsiteServiceIcon(service.icon),
		title: service.title,
		description: service.description,
	}));

	return (
		<>
			<section className="public-page-hero">
				<div className="public-page-hero__background">
					<Image alt="" fill sizes="100vw" src="/site/images/Rd1.png" />
				</div>
				<div className="public-page-hero__overlay" />
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
			</section>

			<section className="public-section">
				<div className="public-service-grid public-service-grid--full">
					{services.map((service) => (
						<div className="public-service-card" key={service.id}>
							<span className="public-service-card__icon">
								<service.icon aria-hidden="true" size={22} />
							</span>
							<h3>{service.title}</h3>
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
