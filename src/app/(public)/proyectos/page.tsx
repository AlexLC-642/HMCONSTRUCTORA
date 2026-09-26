import type { Metadata } from "next";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import { PublicProjectsContent } from "@/modules/website/ui/public-projects-content";

export const metadata: Metadata = {
	title: "Construcciones y remodelaciones",
	description:
		"Galería de proyectos y remodelaciones ejecutados por HM Constructora.",
};

export default async function ProyectosPage() {
	return <PublicProjectsContent {...(await getPublicWebsiteContent())} />;
}
