import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { getSystemNotifications } from "@/modules/notifications/application/queries";
import { AppShell } from "./app-shell";

export async function SystemAppShell({
	user,
	children,
}: {
	user: AuthenticatedUser;
	children: React.ReactNode;
}) {
	const notifications = await getSystemNotifications(user);
	return (
		<AppShell user={user} initialNotifications={notifications}>
			{children}
		</AppShell>
	);
}
