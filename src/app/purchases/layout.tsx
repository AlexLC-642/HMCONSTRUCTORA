import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { SystemAppShell } from "@/shared/components/system-app-shell";

export default async function PurchasesLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const user = await getCurrentUser();
	if (!user) redirect("/login");

	return <SystemAppShell user={user}>{children}</SystemAppShell>;
}
