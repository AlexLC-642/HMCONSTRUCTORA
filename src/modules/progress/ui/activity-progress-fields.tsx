"use client";

import { AlertTriangle, CheckCircle2, CircleDot, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

type StatusOption = {
  value: string;
  label: string;
};

type ActivityProgressFieldsProps = {
  index: number;
  workDescription: string;
  unit: string;
  contractedQuantity: string;
  previousQuantity: string;
  todayQuantity: string;
  previousProgress: string;
  status: string;
  issues: string;
  statusOptions: StatusOption[];
};

const inputClass = "focus-ring h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";
const numberInputClass = `${inputClass} text-right tabular-nums`;
const textareaClass = "focus-ring min-h-[4.25rem] w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";
const labelClass = "grid gap-1 text-sm";
const labelTextClass = "text-[11px] font-semibold uppercase text-[var(--muted)]";

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function parseProgress(value: string) {
  return clampProgress(Number(value || 0));
}

function parseQuantity(value: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function toneForProgress(nextProgress: number, previousProgress: number, status: string) {
  if (status === "BLOCKED") {
    return {
      icon: AlertTriangle,
      label: "Revisar incidencia",
      accent: "text-red-700",
      border: "border-red-200",
      bg: "bg-red-50",
      bar: "bg-red-600"
    };
  }

  if (nextProgress >= 100) {
    return {
      icon: CheckCircle2,
      label: "Quedara completada",
      accent: "text-blue-700",
      border: "border-blue-200",
      bg: "bg-blue-50",
      bar: "bg-blue-600"
    };
  }

  if (nextProgress > previousProgress) {
    return {
      icon: TrendingUp,
      label: "Avance registrado",
      accent: "text-emerald-700",
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      bar: "bg-emerald-600"
    };
  }

  return {
    icon: CircleDot,
    label: "Sin avance nuevo",
    accent: "text-slate-700",
    border: "border-slate-200",
    bg: "bg-slate-50",
    bar: "bg-slate-400"
  };
}

function statusSelectTone(status: string) {
  if (status === "COMPLETED") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "IN_PROGRESS") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "BLOCKED") return "border-red-200 bg-red-50 text-red-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function ActivityProgressFields({
  index,
  workDescription,
  unit,
  contractedQuantity,
  previousQuantity,
  todayQuantity,
  previousProgress,
  status,
  issues,
  statusOptions
}: ActivityProgressFieldsProps) {
  const [todayValue, setTodayValue] = useState(todayQuantity);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [hasIssue, setHasIssue] = useState(Boolean(issues));
  const previous = useMemo(() => parseProgress(previousProgress), [previousProgress]);
  const contracted = useMemo(() => parseQuantity(contractedQuantity), [contractedQuantity]);
  const previousExecuted = useMemo(() => parseQuantity(previousQuantity), [previousQuantity]);
  const todayExecuted = useMemo(() => parseQuantity(todayValue), [todayValue]);
  const accumulatedExecuted = useMemo(() => previousExecuted + todayExecuted, [previousExecuted, todayExecuted]);
  const today = useMemo(() => {
    if (contracted <= 0) return parseProgress(todayValue);
    return clampProgress((todayExecuted / contracted) * 100);
  }, [contracted, todayExecuted, todayValue]);
  const nextProgress = useMemo(() => {
    if (contracted <= 0) return clampProgress(previous + today);
    return clampProgress((accumulatedExecuted / contracted) * 100);
  }, [accumulatedExecuted, contracted, previous, today]);
  const remainingBeforeToday = Math.max(0, contracted - previousExecuted);
  const exceedsContract = contracted > 0 && todayExecuted > remainingBeforeToday;
  const remaining = Math.max(0, contracted - accumulatedExecuted);
  const tone = exceedsContract
    ? {
        icon: AlertTriangle,
        label: "Cantidad por corregir",
        accent: "text-red-700",
        border: "border-red-200",
        bg: "bg-red-50",
        bar: "bg-red-600"
      }
    : toneForProgress(nextProgress, previous, selectedStatus);
  const ToneIcon = tone.icon;
  const unitLabel = unit || "%";
  const wasAlreadyComplete = previous >= 100 || (contracted > 0 && previousExecuted >= contracted);
  const statusTone = statusSelectTone(selectedStatus);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(18rem,1.2fr)_minmax(17rem,0.8fr)]">
      <label className={labelClass}>
        <span className={labelTextClass}>Trabajo realizado</span>
        <textarea
          className={`${textareaClass} min-h-[5.75rem]`}
          name={`activities.${index}.workDescription`}
          defaultValue={workDescription}
          placeholder="Ej. Se levanto el muro del eje A-B y quedo listo para repello."
          required
        />
      </label>

      <motion.div
        animate={{ y: 0, opacity: 1 }}
        className={`rounded-xl border ${tone.border} ${tone.bg} p-3`}
        initial={{ y: 6, opacity: 0.86 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`grid size-8 place-items-center rounded-lg bg-white ${tone.accent}`}>
              <ToneIcon aria-hidden="true" size={17} />
            </span>
            <div>
              <p className={`text-sm font-semibold ${tone.accent}`}>{tone.label}</p>
              <p className="text-xs text-[var(--muted)]">Acumulado al guardar</p>
            </div>
          </div>
          <strong className={`text-xl tabular-nums ${tone.accent}`}>{nextProgress.toFixed(1)}%</strong>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/80">
          <div className="h-full rounded-full bg-[#d9ddd7]" style={{ width: `${previous}%` }} />
          <div className={`-mt-2.5 h-full rounded-full ${tone.bar}`} style={{ width: `${nextProgress}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
          <span>Anterior {previous.toFixed(1)}%</span>
          <span>Hoy +{today.toFixed(1)}%</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <span className="rounded-lg bg-white/80 px-2 py-1"><b>{previousExecuted.toFixed(2)}</b> prev.</span>
          <span className="rounded-lg bg-white/80 px-2 py-1"><b>{accumulatedExecuted.toFixed(2)}</b> acum.</span>
          <span className="rounded-lg bg-white/80 px-2 py-1"><b>{remaining.toFixed(2)}</b> faltan</span>
        </div>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.75fr)] lg:col-span-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Avance ejecutado hoy (%)</span>
          <input
            aria-invalid={exceedsContract}
            className={`${numberInputClass} ${exceedsContract ? "border-red-400 bg-red-50 text-red-800" : ""}`}
            disabled={wasAlreadyComplete}
            name={`activities.${index}.todayQuantity`}
            value={todayValue}
            onChange={(event) => setTodayValue(event.target.value)}
            inputMode="decimal"
            min="0"
            max={contracted > 0 ? remainingBeforeToday : undefined}
            placeholder="0.00"
            step="0.01"
            type="number"
          />
          <input name={`activities.${index}.unit`} type="hidden" value={unitLabel} />
          <span className={`text-xs ${exceedsContract ? "font-medium text-red-700" : "text-[var(--muted)]"}`}>
            {wasAlreadyComplete
              ? "La actividad ya estaba completada antes de esta jornada."
              : exceedsContract
                ? `El avance supera el 100%. Puedes registrar como máximo ${remainingBeforeToday.toFixed(2)}% hoy y corregir el valor aquí mismo.`
				: "Escribe el porcentaje avanzado durante esta jornada, no la cantidad de materiales o trabajadores."}
          </span>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Estado</span>
          <select
            className={`focus-ring h-11 w-full rounded-lg border px-3 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition ${statusTone}`}
            name={`activities.${index}.status`}
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Incidencia</p>
            <p className="text-xs text-[var(--muted)]">Solo se registra si hubo atraso, bloqueo, cambio o problema de calidad.</p>
          </div>
          <div className="flex rounded-lg border border-[var(--border)] bg-[#f4f5f2] p-1">
            <button className={`focus-ring rounded-md px-3 py-1.5 text-xs font-semibold ${!hasIssue ? "bg-white shadow-sm" : "text-[var(--muted)]"}`} type="button" onClick={() => setHasIssue(false)}>
              No
            </button>
            <button className={`focus-ring rounded-md px-3 py-1.5 text-xs font-semibold ${hasIssue ? "bg-white text-[var(--danger)] shadow-sm" : "text-[var(--muted)]"}`} type="button" onClick={() => setHasIssue(true)}>
              Si
            </button>
          </div>
        </div>
        {hasIssue ? (
          <motion.label className={`${labelClass} mt-3 block`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <span className={labelTextClass}>Detalle de incidencia</span>
            <textarea className={`${textareaClass} min-h-[3.25rem]`} name={`activities.${index}.issues`} defaultValue={issues} placeholder="Describe el problema, causa y accion tomada." />
          </motion.label>
        ) : (
          <input name={`activities.${index}.issues`} type="hidden" value="" />
        )}
      </div>
    </div>
  );
}
