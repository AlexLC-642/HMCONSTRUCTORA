import { getWhatsAppLink } from "@/modules/website/domain/contact-links";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { PublicProjectGallery } from "@/modules/website/ui/public-project-gallery";
import type { PublicWebsiteContent } from "../domain/public-content";
import { PublicCtaBand } from "./public-cta-band";
import { PublicPageHero } from "./public-page-hero";

type Album = {
	id: string;
	title: string;
	photos: Array<{ id: string; image: string; alt: string }>;
};

export function PublicProjectsContent(content: PublicWebsiteContent) {
	const { photos, settings } = content;
	const albums = Array.from(
		photos
			.reduce((grouped, photo) => {
				const key = photo.title.trim().toLocaleLowerCase("es-GT");
				const entry = {
					id: photo.id,
					image: photo.imageUrl,
					alt: photo.altText ?? photo.title,
				};
				const album = grouped.get(key);
				if (album) album.photos.push(entry);
				else
					grouped.set(key, {
						id: photo.id,
						title: photo.title,
						photos: [entry],
					});
				return grouped;
			}, new Map<string, Album>())
			.values(),
	);

	return (
		<>
			<PublicPageHero
				eyebrow={withDefault(
					settings?.projectsEyebrow,
					websiteDefaults.projectsEyebrow,
				)}
				image="/site/images/Rd.png"
				imagePosition="center 55%"
				lede={withDefault(
					settings?.projectsSubheading,
					websiteDefaults.projectsSubheading,
				)}
				next={{ href: "#galeria", label: "Ver la galería" }}
				title={withDefault(
					settings?.projectsHeading,
					websiteDefaults.projectsHeading,
				)}
			/>

			<section className="hm-section hm-section--lit" id="galeria">
				<div className="hm-wrap hm-wrap--wide">
					{albums.length ? (
						<PublicProjectGallery albums={albums} />
					) : (
						<p className="hm-empty">
							Estamos actualizando nuestra galería de construcciones.
						</p>
					)}
				</div>
			</section>

			<PublicCtaBand
				heading={withDefault(settings?.ctaHeading, websiteDefaults.ctaHeading)}
				image="/site/images/hero-fachada.jpg"
				text={withDefault(settings?.ctaText, websiteDefaults.ctaText)}
				whatsAppHref={getWhatsAppLink(
					withDefault(settings?.phonePrimary, websiteDefaults.phonePrimary),
				)}
			/>
		</>
	);
}
