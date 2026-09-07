import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { getDailyReportById } from "@/modules/progress/application/queries";
import { DailyReportPrintDocument } from "@/modules/progress/ui/daily-report-print-document";
import { PrintActions } from "@/shared/ui/print-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DailyReportPrintPage({
  params
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  await requirePermission("avance.crear");
  const { id, reportId } = await params;
  const report = await getDailyReportById(id, reportId);

  if (!report) notFound();

  return (
    <>
      <PrintActions backHref={`/projects/${id}/progress/reports/${reportId}`} />
      <DailyReportPrintDocument report={report} />
    </>
  );
}
