import { cookies } from "next/headers";
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
	const [notifications, cookieStore] = await Promise.all([
		getSystemNotifications(user),
		cookies(),
	]);
	const sidebarCookieKey = `hm-sidebar-collapsed-${user.id}`;
	const initialSidebarCollapsed =
		cookieStore.get(sidebarCookieKey)?.value === "true";

	return (
		<AppShell
			user={user}
			initialNotifications={notifications}
			initialSidebarCollapsed={initialSidebarCollapsed}
		>
			{children}
		</AppShell>
	);
}
