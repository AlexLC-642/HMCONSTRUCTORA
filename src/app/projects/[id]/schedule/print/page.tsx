import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { daysBetweenInclusive } from "@/modules/schedules/application/dates";
import { getProjectSchedule } from "@/modules/schedules/application/queries";
import { scheduleActivityStatusLabels, type scheduleActivityStatuses } from "@/modules/schedules/domain/validation";
import { PrintActions } from "@/shared/ui/print-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const dayFormatter = new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "short", timeZone: "UTC" });
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function offset(start: Date, value: Date) {
  return Math.max(0, Math.round((value.getTime() - start.getTime()) / MS_PER_DAY));
}

function weekKey(startOfTimeline: Date, value: Date) {
  const diffDays = Math.floor((value.getTime() - startOfTimeline.getTime()) / MS_PER_DAY);
  return `${startOfTimeline.toISOString().slice(0, 10)}-${Math.floor(diffDays / 7)}`;
}

function weekLabel(days: Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  return `${dayFormatter.format(first)} - ${dayFormatter.format(last)}`;
}

function groupDaysByWeek(days: Date[]) {
  if (days.length === 0) return [];

  return days.reduce<Array<{ key: string; label: string; days: Date[] }>>((groups, day) => {
    const startOfTimeline = days[0];
    const key = weekKey(startOfTimeline, day);
    const current = groups.at(-1);

    if (!current || current.key !== key) {
      groups.push({ key, label: weekLabel([day]), days: [day] });
      return groups;
    }

    current.days.push(day);
    current.label = weekLabel(current.days);
    return groups;
  }, []);
}

function printScale(totalDays: number) {
  const estimatedWidth = 560 + totalDays * 24;
  return Math.min(1, Math.max(0.48, 1000 / estimatedWidth));
}

function printFontSize(totalDays: number) {
  if (totalDays > 45) return 5.6;
  if (totalDays > 32) return 6.4;
  if (totalDays > 20) return 7.2;
  return 8.2;
}

export default async function SchedulePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("cronograma.ver");
  const { id } = await params;
  const schedule = await getProjectSchedule(id);

  if (!schedule?.startDate || !schedule.endDate) notFound();

  const scheduleStart = schedule.startDate;
  const scheduleEnd = schedule.endDate;
  const totalDays = daysBetweenInclusive(scheduleStart, scheduleEnd);
  const days = Array.from({ length: totalDays }, (_, index) => addDays(scheduleStart, index));
  const weeks = groupDaysByWeek(days);
  const scale = printScale(totalDays);
  const fontSize = printFontSize(totalDays);

  return (
    <>
      <PrintActions backHref={`/projects/${id}/schedule`} />
      <main className="print-surface mx-auto max-w-[1280px] bg-white p-8 text-[#111] print:w-full print:max-w-none print:p-0">
        <style>{`@page { size: letter landscape; margin: 0.25in; } @media print { html, body { width: 100%; background: white; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } .schedule-print-page { width: calc(100% / var(--schedule-print-scale)); transform: scale(var(--schedule-print-scale)); transform-origin: top left; } .schedule-print-header { margin-bottom: 12px !important; } .schedule-print-header h1 { font-size: 15px !important; line-height: 1.1 !important; } .schedule-print-header h2 { font-size: 13px !important; margin-top: 10px !important; } .schedule-print-header p { font-size: 8px !important; line-height: 1.1 !important; } .schedule-print-wrap { overflow: visible !important; width: 100% !important; } .schedule-print-table { width: 100% !important; min-width: 0 !important; table-layout: fixed; border-collapse: collapse; font-size: var(--schedule-print-font-size); } .schedule-print-table th, .schedule-print-table td { padding: 2px 3px !important; line-height: 1.1; overflow: hidden; vertical-align: middle; } .schedule-print-table .col-no { width: 4%; } .schedule-print-table .col-description { width: 31%; } .schedule-print-table .col-labor { width: 12%; } .schedule-print-table .col-status { width: 9%; } .schedule-print-table .day-cell { width: auto; min-width: 0; padding-left: 0 !important; padding-right: 0 !important; text-align: center; } .schedule-print-note { font-size: 8px !important; margin-top: 12px !important; } section { page-break-inside: avoid; } }`}</style>
        <div
          className="schedule-print-page"
          style={{
            "--schedule-print-scale": scale,
            "--schedule-print-font-size": `${fontSize}px`
          } as React.CSSProperties}
        >
          <header className="schedule-print-header mb-6 text-center">
            <p className="text-xs font-semibold uppercase">{schedule.project.code}</p>
            <h1 className="text-xl font-bold uppercase">{schedule.project.name}</h1>
            <p className="text-sm uppercase">{schedule.project.location ?? ""}</p>
            <h2 className="mt-4 text-lg font-bold uppercase">Cronograma</h2>
          </header>

          <section className="schedule-print-wrap overflow-x-auto">
            <table className="schedule-print-table w-full min-w-[1100px] border-collapse text-[11px]">
              <colgroup>
                <col className="col-no" />
                <col className="col-description" />
                <col className="col-labor" />
                <col className="col-status" />
                {days.map((day) => <col className="day-cell" key={`col-${day.toISOString()}`} />)}
              </colgroup>
              <thead>
                <tr className="bg-[#e7ece8]">
                  <th className="border border-[#777] px-2 py-1" colSpan={4}></th>
                  {weeks.map((week) => <th className="border border-[#777] px-1 py-1 text-center uppercase" colSpan={week.days.length} key={week.key}>Semana {week.label}</th>)}
                </tr>
                <tr className="bg-[#f4f7f4]">
                  <th className="col-no border border-[#777] px-2 py-1">No.</th>
                  <th className="col-description border border-[#777] px-2 py-1 text-left">DESCRIPCION</th>
                  <th className="col-labor border border-[#777] px-2 py-1">MANO DE OBRA</th>
                  <th className="col-status border border-[#777] px-2 py-1">ESTADO</th>
                  {days.map((day) => <th className="day-cell border border-[#777] px-1 py-1" key={day.toISOString()}>{day.getUTCDate()}</th>)}
                </tr>
              </thead>
              <tbody>
                {schedule.activities.map((activity) => {
                  const startOffset = offset(scheduleStart, activity.plannedStart);
                  const duration = daysBetweenInclusive(activity.plannedStart, activity.plannedEnd);
                  return (
                    <tr key={activity.id}>
                      <td className="border border-[#777] px-2 py-1 text-center">{activity.code}</td>
                      <td className="border border-[#777] px-2 py-1">{activity.description}</td>
                      <td className="border border-[#777] px-2 py-1 text-center">{activity.labor ?? ""}</td>
                      <td className="border border-[#777] px-2 py-1 text-center">{scheduleActivityStatusLabels[activity.status as (typeof scheduleActivityStatuses)[number]]}</td>
                      {days.map((day, index) => {
                        const active = index >= startOffset && index < startOffset + duration;
                        const progressDays = Math.ceil(duration * Math.min(100, Math.max(0, activity.progress.toNumber())) / 100);
                        const advanced = active && index < startOffset + progressDays;
                        const fillClass = advanced
                          ? activity.status === "COMPLETED"
                            ? "bg-[#2563eb]"
                            : activity.status === "IN_PROGRESS"
                              ? "bg-[#1f6b4f]"
                              : activity.status === "BLOCKED"
                                ? "bg-[#c4312f]"
                                : "bg-[#e2e8e4]"
                          : "";
                        return <td className={`day-cell border border-[#777] px-1 py-1 ${fillClass}`} key={`${activity.id}-${day.toISOString()}`}>&nbsp;</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <p className="schedule-print-note mt-6 text-xs uppercase">Nota: {schedule.notes}</p>
        </div>
      </main>
    </>
  );
}