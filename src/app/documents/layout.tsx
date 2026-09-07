import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { SystemAppShell } from "@/shared/components/system-app-shell";

export default async function DocumentsLayout({
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
			<div className="documents-workspace">{children}</div>
		</SystemAppShell>
	);
}
