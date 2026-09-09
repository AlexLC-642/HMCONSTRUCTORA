import { requirePermission } from "@/modules/auth/application/authorization";
import { getDashboardMetrics } from "@/modules/projects/application/dashboard";
import { DashboardWorkspace } from "@/modules/projects/ui/dashboard/dashboard-workspace";

export default async function DashboardPage() {
	const user = await requirePermission("proyectos.ver");
	const metrics = await getDashboardMetrics(user);

	return <DashboardWorkspace metrics={metrics} />;
}
