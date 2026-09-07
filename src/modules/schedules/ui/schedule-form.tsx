"use client";

import { Link2, Plus, Save, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { scheduleActivityStatusLabels, type ScheduleInput } from "../domain/validation";

type Activity = ScheduleInput["activities"][number];
type ScheduleStatus = Activity["status"];

type ScheduleFormProps = {
  initialValue: ScheduleInput;
  readOnly: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

const statusOptions = Object.entries(scheduleActivityStatusLabels) as Array<[ScheduleStatus, string]>;
const statusMeta: Record<ScheduleStatus, { label: string; pill: string; bar: string; dot: string; ring: string }> = {
  PENDING: {
    label: "Pendiente",
    pill: "border-[#e4d5a3] bg-[#fff8e1] text-[#7a5300]",
    bar: "bg-[#f2a900]",
    dot: "bg-[#f2a900]",
    ring: "ring-amber-100"
  },
  IN_PROGRESS: {
    label: "En proceso",
    pill: "border-[#a8dcc7] bg-[#e8f7ef] text-[#17664b]",
    bar: "bg-[var(--success)]",
    dot: "bg-[var(--success)]",
    ring: "ring-emerald-100"
  },
  BLOCKED: {
    label: "Bloqueada",
    pill: "border-[#f0b4ad] bg-[#fff0ee] text-[var(--danger)]",
    bar: "bg-[var(--danger)]",
    dot: "bg-[var(--danger)]",
    ring: "ring-red-100"
  },
  COMPLETED: {
    label: "Completada",
    pill: "border-[#b8cdfd] bg-[#edf4ff] text-[#1d4ed8]",
    bar: "bg-[#2563eb]",
    dot: "bg-[#2563eb]",
    ring: "ring-blue-100"
  }
};

const inputClass = "focus-ring h-11 w-full rounded-md border border-[#cfd5ce] bg-white px-3 text-sm text-[#111719] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-[#aeb8b1] disabled:bg-[#f2f3ef] disabled:text-[#66706b]";
const labelClass = "text-[11px] font-bold uppercase tracking-[0.08em] text-[#58635f]";
const surfaceClass = "rounded-2xl border border-[#cfd5ce] bg-white shadow-[0_18px_48px_rgba(37,48,51,0.10),0_1px_0_rgba(255,255,255,0.9)]";
const dayFormatter = new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "short", timeZone: "UTC" });
const weekdayFormatter = new Intl.DateTimeFormat("es-GT", { weekday: "short", timeZone: "UTC" });
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
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

function emptyActivity(position: number): Activity {
  const start = addDays(new Date(), position - 1);
  return {
    id: crypto.randomUUID(),
    code: String(position),
    description: "",
    labor: "",
    budgetSectionCode: "",
    budgetSectionName: "",
    status: "PENDING",
    plannedStart: formatDate(start),
    plannedEnd: formatDate(start),
    actualStart: "",
    actualEnd: "",
    progress: "0",
    position,
    notes: "",
    dependsOnCodes: [],
    assigneeLabels: []
  };
}

function progressTone(progress: number) {
  if (progress >= 100) return "text-[#1d4ed8]";
  if (progress >= 50) return "text-[var(--success)]";
  if (progress > 0) return "text-[#b76e00]";
  return "text-[#66706b]";
}

export function ScheduleForm({ initialValue, readOnly, action }: ScheduleFormProps) {
  const [value, setValue] = useState<ScheduleInput>(initialValue);
  const canSave = value.title.trim().length > 0 && value.activities.length > 0 && value.activities.every((activity) =>
    activity.code.trim().length > 0 && activity.description.trim().length > 0 && activity.plannedStart.length > 0 && activity.plannedEnd.length > 0
  );

  const timeline = useMemo(() => {
    if (value.activities.length === 0) return null;
    const starts = value.activities.map((activity) => toDate(activity.plannedStart).getTime());
    const ends = value.activities.map((activity) => toDate(activity.plannedEnd).getTime());
    const start = new Date(Math.min(...starts));
    const end = new Date(Math.max(...ends));
    const totalDays = daysBetween(start, end);
    const days = Array.from({ length: totalDays }, (_, index) => addDays(start, index));
    return { start, end, totalDays, days, weeks: groupDaysByWeek(days) };
  }, [value.activities]);

  const summary = useMemo(() => {
    const total = value.activities.length;
    const completed = value.activities.filter((activity) => activity.status === "COMPLETED").length;
    const blocked = value.activities.filter((activity) => activity.status === "BLOCKED").length;
    const inProgress = value.activities.filter((activity) => activity.status === "IN_PROGRESS").length;
    const averageProgress = total > 0
      ? value.activities.reduce((sum, activity) => sum + (Number(activity.progress) || 0), 0) / total
      : 0;
    return { total, completed, blocked, inProgress, averageProgress };
  }, [value.activities]);

  function updateActivity(index: number, patch: Partial<Activity>) {
    setValue((current) => ({
      ...current,
      activities: current.activities.map((activity, activityIndex) =>
        activityIndex === index ? { ...activity, ...patch } : activity
      )
    }));
  }

  function updateStatus(index: number, status: ScheduleStatus) {
    const patch: Partial<Activity> = { status };
    if (status === "COMPLETED") patch.progress = "100";
    if (status === "PENDING") patch.progress = "0";
    if (status === "IN_PROGRESS" && Number(value.activities[index].progress) === 0) patch.progress = "1";
    updateActivity(index, patch);
  }

  function removeActivity(index: number) {
    setValue((current) => ({
      ...current,
      activities: current.activities.filter((_, activityIndex) => activityIndex !== index)
    }));
  }

  return (
    <form action={action} className="space-y-6">
      <input name="payload" type="hidden" value={JSON.stringify(value)} />

      <section className={`${surfaceClass} overflow-hidden`}>
        <div className="border-b border-[#d9ded8] bg-[#fbfaf6] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.01em]">Datos del cronograma</h2>
              <p className="mt-1 text-sm text-[#5a6661]">Base editable de fechas, frentes y dependencias.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[360px]">
              <div className="rounded-md bg-white px-3 py-2 shadow-sm"><strong className="block text-base">{summary.total}</strong>Actividades</div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm"><strong className="block text-base">{summary.completed}</strong>Cerradas</div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm"><strong className="block text-base">{summary.averageProgress.toFixed(1)}%</strong>Promedio</div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr]">
          <label className="grid gap-1.5">
            <span className={labelClass}>Titulo</span>
            <input disabled={readOnly} required className={inputClass} value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelClass}>Referencia</span>
            <input disabled={readOnly} className={inputClass} value={value.sourceReference ?? ""} onChange={(event) => setValue({ ...value, sourceReference: event.target.value })} />
          </label>
          <label className="grid gap-1.5 lg:col-span-2">
            <span className={labelClass}>Notas</span>
            <textarea disabled={readOnly} className={`${inputClass} min-h-24 py-3 leading-6`} value={value.notes ?? ""} onChange={(event) => setValue({ ...value, notes: event.target.value })} />
          </label>
        </div>
      </section>

      <section className={`${surfaceClass} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9ded8] bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.01em]">Actividades del plan</h2>
            <p className="mt-1 text-sm text-[#5a6661]">Edita fechas, responsables, avance y dependencias sin duplicar informacion.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(([key, label]) => (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta[key].pill}`} key={key}>
                <span className={`size-2 rounded-full ${statusMeta[key].dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#dde2dc]">
          {value.activities.length === 0 ? <div className="px-5 py-10 text-center"><p className="font-semibold">Aún no hay actividades</p><p className="mt-1 text-sm text-[#66706b]">Agrega la primera actividad para comenzar.</p></div> : null}
          {value.activities.map((activity, index) => {
            const progress = Math.max(0, Math.min(100, Number(activity.progress) || 0));
            const duration = daysBetween(toDate(activity.plannedStart), toDate(activity.plannedEnd));
            return (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-4 px-5 py-4 transition hover:bg-[#fbfaf6] xl:grid-cols-[88px_minmax(280px,1.2fr)_minmax(420px,2fr)]"
                initial={{ opacity: 0, y: 10 }}
                key={activity.id}
                transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-start gap-3 xl:block">
                  <input disabled={readOnly} required aria-label={`Codigo de actividad ${index + 1}`} className={`${inputClass} h-10 w-16 text-center font-semibold tabular-nums`} value={activity.code} onChange={(event) => updateActivity(index, { code: event.target.value })} />
                  <div className="mt-0 text-xs text-[#66706b] xl:mt-3">
                    <span className="block font-semibold text-[#253033]">{duration} dias</span>
                    <span>Plan</span>
                  </div>
                </div>

                <div className="min-w-0 space-y-3">
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Descripcion</span>
                    <textarea disabled={readOnly} required rows={2} className={`${inputClass} h-auto min-h-20 py-3 leading-6`} value={activity.description} onChange={(event) => updateActivity(index, { description: event.target.value })} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                    <label className="grid gap-1.5">
                      <span className={labelClass}>Mano de obra</span>
                      <input disabled={readOnly} className={inputClass} value={activity.labor ?? ""} onChange={(event) => updateActivity(index, { labor: event.target.value, assigneeLabels: event.target.value ? [event.target.value] : [] })} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className={labelClass}>Depende de (códigos)</span>
                      <input disabled={readOnly} className={inputClass} placeholder="Ej. 1, 2" value={activity.dependsOnCodes.join(", ")} onChange={(event) => updateActivity(index, { dependsOnCodes: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
                    </label>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px]">
                    <label className="grid gap-1.5">
                      <span className={labelClass}>Inicio plan</span>
                      <input disabled={readOnly} required className={inputClass} type="date" value={activity.plannedStart} onChange={(event) => updateActivity(index, { plannedStart: event.target.value })} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className={labelClass}>Fin plan</span>
                      <input disabled={readOnly} required className={inputClass} type="date" value={activity.plannedEnd} onChange={(event) => updateActivity(index, { plannedEnd: event.target.value })} />
                    </label>
                    <div className="grid gap-1.5">
                      <span className={labelClass}>Estado</span>
                      {activity.status === "BLOCKED" && !readOnly ? (
                        <select className={`${inputClass} border ${statusMeta[activity.status].pill}`} value={activity.status} onChange={(event) => updateStatus(index, event.target.value as ScheduleStatus)}>
                          {statusOptions.map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                        </select>
                      ) : (
                        <div className={`flex h-11 items-center rounded-md border px-3 text-sm font-semibold ${statusMeta[activity.status].pill}`}>{statusMeta[activity.status].label}</div>
                      )}
                    </div>
                  </div>

                  <div className={`rounded-xl border bg-white p-3 ring-4 ${statusMeta[activity.status].ring}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className={labelClass}>Avance real</span>
                        <p className="mt-1 text-xs text-[#66706b]">Calculado desde informes diarios aprobados.</p>
                      </div>
                      <span className={`text-lg font-bold tabular-nums ${progressTone(progress)}`}>{progress.toFixed(progress % 1 === 0 ? 0 : 1)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7ebe5]">
                      <div className={`h-full rounded-full ${statusMeta[activity.status].bar}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {!readOnly ? (
                    <div className="flex justify-end">
                      <button className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-[#d9ded8] bg-white px-3 text-sm font-semibold text-[#46504c] transition hover:border-[#f0b4ad] hover:bg-[#fff0ee] hover:text-[var(--danger)]" type="button" onClick={() => removeActivity(index)}>
                        <Trash2 aria-hidden="true" size={16} />
                        Eliminar
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <button className="focus-ring inline-flex h-12 items-center gap-2 rounded-md border border-[#cfd5ce] bg-white px-5 text-sm font-semibold text-[#253033] shadow-[0_10px_24px_rgba(37,48,51,0.08)] transition hover:-translate-y-0.5 hover:bg-[#fbfaf6]" type="button" onClick={() => setValue({ ...value, activities: [...value.activities, emptyActivity(value.activities.length + 1)] })}>
            <Plus aria-hidden="true" size={18} />
            Agregar actividad
          </button>
          <button className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-[var(--brand-red)] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(200,32,47,0.24)] transition hover:-translate-y-0.5 hover:bg-[#b91f2b] disabled:cursor-not-allowed disabled:opacity-45" disabled={!canSave} type="submit">
            <Save aria-hidden="true" size={18} />
            Guardar cronograma
          </button>
        </div>
      ) : null}

      {timeline ? <section className={`${surfaceClass} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9ded8] bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.01em]">Vista Gantt</h2>
            <p className="mt-1 text-sm text-[#5a6661]">{dayFormatter.format(timeline.start)} - {dayFormatter.format(timeline.end)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-[420px]">
            <div className="rounded-md bg-[#fbfaf6] px-3 py-2"><strong>{summary.inProgress}</strong> en proceso</div>
            <div className="rounded-md bg-[#fbfaf6] px-3 py-2"><strong>{summary.blocked}</strong> bloqueadas</div>
            <div className="rounded-md bg-[#fbfaf6] px-3 py-2"><strong>{summary.averageProgress.toFixed(1)}%</strong> promedio</div>
          </div>
        </div>
        <div className="overflow-x-auto p-5">
          <div className="min-w-[1320px] space-y-4">
            <div className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[#46504c]" style={{ gridTemplateColumns: `430px repeat(${timeline.totalDays}, minmax(34px, 1fr))` }}>
              <div />
              {timeline.weeks.map((week, index) => (
                <div className="rounded-md border border-[#d9ded8] bg-[#eef3ef] py-1 text-center" key={week.key} style={{ gridColumn: `${index === 0 ? 2 : timeline.weeks.slice(0, index).reduce((sum, item) => sum + item.days.length, 2)} / span ${week.days.length}` }}>
                  Semana {week.label}
                </div>
              ))}
            </div>
            <div className="grid gap-1 text-[11px] text-[#66706b]" style={{ gridTemplateColumns: `430px repeat(${timeline.totalDays}, minmax(34px, 1fr))` }}>
              <div />
              {timeline.days.map((day) => (
                <div className="rounded bg-[#fbfaf6] py-1 text-center" key={day.toISOString()}>
                  <span className="block font-semibold text-[#253033]">{day.getUTCDate()}</span>
                  <span className="uppercase">{weekdayFormatter.format(day).slice(0, 1)}</span>
                </div>
              ))}
            </div>
            {value.activities.map((activity, index) => {
              const startOffset = daysBetween(timeline.start, toDate(activity.plannedStart)) - 1;
              const duration = daysBetween(toDate(activity.plannedStart), toDate(activity.plannedEnd));
              const progress = Math.max(0, Math.min(100, Number(activity.progress) || 0));
              return (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="grid items-center gap-1"
                  initial={{ opacity: 0, y: 8 }}
                  key={`gantt-${activity.id}`}
                  transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  style={{ gridTemplateColumns: `430px repeat(${timeline.totalDays}, minmax(34px, 1fr))` }}
                >
                  <div className="min-w-0 rounded-lg border border-[#d9ded8] bg-[#fbfaf6] px-3 py-2">
                    <div className="truncate text-sm font-semibold leading-snug text-[#111719]">{activity.code}. {activity.description}</div>
                    <div className="mt-1 flex items-center gap-1 truncate text-xs text-[#66706b]">
                      <Link2 aria-hidden="true" size={12} />
                      {activity.budgetSectionCode ? `Renglon ${activity.budgetSectionCode} - ${activity.budgetSectionName || "Presupuesto"}` : "Pendiente de relacionar"}
                    </div>
                  </div>
                  <div className="relative h-11 overflow-hidden rounded-lg border border-[#cfd8d2] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" style={{ gridColumn: `${startOffset + 2} / span ${duration}` }}>
                    <div className={`h-full rounded-lg ${statusMeta[activity.status].bar}`} style={{ width: `${activity.status === "PENDING" ? 0 : progress}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#17201b]">{activity.status === "PENDING" ? "" : `${progress.toFixed(0)}%`}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section> : null}
    </form>
  );
}
