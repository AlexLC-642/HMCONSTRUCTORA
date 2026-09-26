import type { Metadata } from "next";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import {
	websiteDefaults,
	withDefault,
} from "@/modules/website/domain/defaults";
import { PublicSiteFrame } from "@/modules/website/ui/public-site-frame";
export async function generateMetadata(): Promise<Metadata> {
	const { settings } = await getPublicWebsiteContent();
	return {
		title: {
			default: withDefault(settings?.seoTitle, websiteDefaults.seoTitle),
			template: "%s | HM Constructora",
		},
		description: withDefault(
			settings?.seoDescription,
			websiteDefaults.seoDescription,
		),
	};
}

export default async function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { settings } = await getPublicWebsiteContent();
	return <PublicSiteFrame settings={settings}>{children}</PublicSiteFrame>;
}
