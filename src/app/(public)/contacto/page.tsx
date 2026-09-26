import type { Metadata } from "next";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import { PublicContactContent } from "@/modules/website/ui/public-contact-content";

export const metadata: Metadata = {
	title: "Contacto",
	description:
		"Contáctanos para cotizar tu proyecto de construcción o remodelación.",
};

export default async function ContactoPage({
	searchParams,
}: {
	searchParams: Promise<{ enviado?: string }>;
}) {
	const [content, params] = await Promise.all([
		getPublicWebsiteContent(),
		searchParams,
	]);
	return <PublicContactContent {...content} outcomeKey={params.enviado} />;
}
