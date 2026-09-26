import type { Metadata } from "next";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import { PublicServicesContent } from "@/modules/website/ui/public-services-content";

export const metadata: Metadata = {
	title: "Servicios",
	description:
		"Diseño arquitectónico, planificación, ejecución de obra, remodelaciones e instalaciones.",
};

export default async function ServiciosPage() {
	return <PublicServicesContent {...(await getPublicWebsiteContent())} />;
}
