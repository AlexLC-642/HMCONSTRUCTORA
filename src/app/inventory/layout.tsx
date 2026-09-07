import { redirect } from "next/navigation";
import { SystemAppShell } from "@/shared/components/system-app-shell";
import { getCurrentUser } from "@/modules/auth/application/current-user";

export default async function InventoryLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	return (
		<SystemAppShell user={user}>
			<div className="inventory-workspace">{children}</div>
		</SystemAppShell>
	);
}
