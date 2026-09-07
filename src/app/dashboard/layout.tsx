import { redirect } from "next/navigation";
import { SystemAppShell } from "@/shared/components/system-app-shell";
import { getCurrentUser } from "@/modules/auth/application/current-user";

export default async function InternalRouteLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	return <SystemAppShell user={user}>{children}</SystemAppShell>;
}
