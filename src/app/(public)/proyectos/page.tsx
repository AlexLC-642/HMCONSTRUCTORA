import type { Metadata } from "next";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { PublicArchitecturalBackdrop } from "@/modules/website/ui/public-architectural-backdrop";
import { PublicHeroRail } from "@/modules/website/ui/public-hero-rail";
import { PublicProjectGallery } from "@/modules/website/ui/public-project-gallery";

export const metadata: Metadata = {
	title: "Construcciones y remodelaciones",
	description:
		"Galería de proyectos y remodelaciones ejecutados por HM Constructora.",
};

export default async function ProyectosPage() {
	const { photos, settings } = await getPublicWebsiteContent();
	const projects = photos.map((photo) => ({
		id: photo.id,
		image: photo.imageUrl,
		title: photo.title,
		alt: photo.altText ?? photo.title,
	}));
	const albums = Array.from(
		projects
			.reduce(
				(grouped, project) => {
					const key = project.title.trim().toLocaleLowerCase("es-GT");
					const album = grouped.get(key);
					const photo = {
						id: project.id,
						image: project.image,
						alt: project.alt,
					};
					if (album) album.photos.push(photo);
					else
						grouped.set(key, {
							id: project.id,
							title: project.title,
							photos: [photo],
						});
					return grouped;
				},
				new Map<
					string,
					{
						id: string;
						title: string;
						photos: Array<{ id: string; image: string; alt: string }>;
					}
				>(),
			)
			.values(),
	);

	return (
		<>
			<section className="public-page-hero">
				<PublicArchitecturalBackdrop
					position="center 58%"
					src="/site/images/proyecto3.jpg"
				/>
				<div className="public-page-hero__inner">
					<p className="public-eyebrow">
						{withDefault(
							settings?.projectsEyebrow,
							websiteDefaults.projectsEyebrow,
						)}
					</p>
					<h1>
						{withDefault(
							settings?.projectsHeading,
							websiteDefaults.projectsHeading,
						)}
					</h1>
					<p className="public-page-hero__lede">
						{withDefault(
							settings?.projectsSubheading,
							websiteDefaults.projectsSubheading,
						)}
					</p>
				</div>
				<PublicHeroRail />
			</section>

			<section className="public-projects-showcase">
				<div className="public-section public-section--projects">
					<PublicProjectGallery albums={albums} />
				</div>
			</section>
		</>
	);
}
