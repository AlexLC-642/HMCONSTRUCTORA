import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { getLatestDailyReportId } from "@/modules/progress/application/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LatestDailyReportPrintRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("avance.crear");
  const { id } = await params;
  const latestReport = await getLatestDailyReportId(id);

  if (!latestReport) notFound();

  redirect(`/projects/${id}/progress/reports/${latestReport.id}/print` as Route);
}
