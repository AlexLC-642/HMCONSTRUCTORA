import { redirect } from "next/navigation";
import { defaultAuthenticatedRoute } from "@/modules/auth/application/authenticated-route";
import { requireAuthenticatedUser } from "@/modules/auth/application/authorization";
import { getDashboardMetrics } from "@/modules/projects/application/dashboard";
import { DashboardWorkspace } from "@/modules/projects/ui/dashboard/dashboard-workspace";
import { hasPermission } from "@/shared/permissions/has-permission";

export default async function DashboardPage() {
	const user = await requireAuthenticatedUser();
	if (!hasPermission(user.permissions, "proyectos.ver")) {
		redirect(defaultAuthenticatedRoute(user.permissions));
	}
	const metrics = await getDashboardMetrics(user);

	return <DashboardWorkspace metrics={metrics} />;
}
