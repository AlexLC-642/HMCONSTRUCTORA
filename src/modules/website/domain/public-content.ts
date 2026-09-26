import type {
	WebsiteProjectPhoto,
	WebsiteService,
	WebsiteSettings,
} from "@prisma/client";
export type PublicWebsiteContent = {
	settings: WebsiteSettings | null;
	services: WebsiteService[];
	photos: Omit<WebsiteProjectPhoto, "imageData" | "imageMimeType">[];
};
