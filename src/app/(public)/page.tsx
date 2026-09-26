import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import { PublicHomeContent } from "@/modules/website/ui/public-home-content";

export default async function PublicHomePage() {
	return <PublicHomeContent {...(await getPublicWebsiteContent())} />;
}
