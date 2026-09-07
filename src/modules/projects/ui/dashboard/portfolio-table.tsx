"use client";

import {
  getCoreRowModel,
  useLegacyTable,
  type LegacyColumnDef
} from "@tanstack/react-table/legacy";
import { flexRender } from "@tanstack/react-table";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { moneyCompact, percent, pp } from "@/shared/ui/charts/format";
import type { DashboardProjectRow } from "./types";

function riskClass(risk: string) {
  if (risk === "Riesgo") return "border-[#efb4ad] bg-[#fff1ef] text-[#9f1f17]";
  if (risk === "Atencion") return "border-[#efd18a] bg-[#fff8e8] text-[#8a5700]";
  return "border-[#b4ddca] bg-[#edf9f2] text-[#14684b]";
}

function progressBar(value: number, tone = "bg-[var(--success)]") {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 min-w-[7rem] flex-1 overflow-hidden rounded-full bg-[#e4e8e1]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-14 text-right font-semibold tabular-nums">{percent(value)}</span>
    </div>
  );
}

export function PortfolioTable({ projects, onSelect }: { projects: DashboardProjectRow[]; onSelect: (project: DashboardProjectRow) => void }) {
  const [sortKey, setSortKey] = useState<"code" | "clientName" | "realProgress" | "plannedProgress" | "gap" | "budgetTotal" | "spent" | "balance" | "daysRemaining" | "risk" | "status">("risk");
  const [sortDesc, setSortDesc] = useState(false);

  const rows = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aValue = sortKey === "gap" ? a.realProgress - a.plannedProgress : a[sortKey];
      const bValue = sortKey === "gap" ? b.realProgress - b.plannedProgress : b[sortKey];
      const modifier = sortDesc ? -1 : 1;
      if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * modifier;
      return String(aValue ?? "").localeCompare(String(bValue ?? "")) * modifier;
    });
  }, [projects, sortDesc, sortKey]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDesc((value) => !value);
      return;
    }
    setSortKey(key);
    setSortDesc(false);
  };

  const columns = useMemo<LegacyColumnDef<DashboardProjectRow>[]>(() => [
    {
      accessorKey: "code",
      header: "Proyecto",
      cell: ({ row }) => (
        <div>
          <button className="font-semibold text-[var(--foreground)] underline-offset-4 hover:underline" onClick={() => onSelect(row.original)} type="button">
            {row.original.code}
          </button>
          <p className="max-w-[18rem] truncate text-sm text-[var(--muted)]">{row.original.name}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.clientName}</p>
        </div>
      )
    },
    {
      accessorKey: "clientName",
      header: "Cliente",
      cell: ({ row }) => <span className="text-[var(--muted)]">{row.original.clientName}</span>
    },
    {
      accessorKey: "realProgress",
      header: "Avance",
      cell: ({ row }) => progressBar(row.original.realProgress)
    },
    {
      accessorKey: "plannedProgress",
      header: "Plan",
      cell: ({ row }) => progressBar(row.original.plannedProgress, "bg-[var(--info)]")
    },
    {
      id: "gap",
      header: "Brecha",
      accessorFn: (row: DashboardProjectRow) => row.realProgress - row.plannedProgress,
      cell: ({ row }) => {
        const gap = row.original.realProgress - row.original.plannedProgress;
        return <span className={gap < -5 ? "font-semibold tabular-nums text-[var(--danger)]" : "font-semibold tabular-nums text-[var(--success)]"}>{pp(gap)}</span>;
      }
    },
    {
      accessorKey: "budgetTotal",
      header: "Presupuesto",
      cell: ({ row }) => <span className="tabular-nums">{moneyCompact(row.original.budgetTotal)}</span>
    },
    {
      accessorKey: "spent",
      header: "Ejecutado",
      cell: ({ row }) => <span className="tabular-nums">{moneyCompact(row.original.spent)}</span>
    },
    {
      accessorKey: "balance",
      header: "Saldo",
      cell: ({ row }) => <span className={row.original.balance < 0 ? "font-semibold tabular-nums text-[var(--danger)]" : "font-semibold tabular-nums text-[var(--success)]"}>{moneyCompact(row.original.balance)}</span>
    },
    {
      accessorKey: "daysRemaining",
      header: "Dias",
      cell: ({ row }) => row.original.daysRemaining === null ? "-" : <span className={row.original.daysRemaining < 0 ? "font-semibold text-[var(--danger)]" : "tabular-nums"}>{row.original.daysRemaining}</span>
    },
    {
      accessorKey: "risk",
      header: "Riesgo",
      cell: ({ row }) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskClass(row.original.risk)}`}>{row.original.risk}</span>
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <span className="text-[var(--muted)]">{row.original.status === "ACTIVE" ? "Activo" : row.original.status}</span>
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <button aria-label={`Ver ${row.original.code}`} className="focus-ring rounded-full border border-[var(--border)] p-2 hover:bg-[#f6f3ef]" onClick={() => onSelect(row.original)} type="button">
          <ChevronRight size={16} />
        </button>
      )
    }
  ], [onSelect]);

  const table = useLegacyTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr className="border-b border-[var(--border)] bg-[#f4f3ef] text-left text-xs uppercase tracking-[0.04em] text-[var(--muted)]" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th className="px-4 py-3 font-semibold" key={header.id}>
                  {header.isPlaceholder ? null : (
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        const id = header.column.id;
                        if (["code", "clientName", "realProgress", "plannedProgress", "gap", "budgetTotal", "spent", "balance", "daysRemaining", "risk", "status"].includes(id)) {
                          toggleSort(id as typeof sortKey);
                        }
                      }}
                      type="button"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ArrowUpDown size={13} />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr className="border-b border-[var(--border)] bg-white/80 transition hover:bg-[#fff8f2]" key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td className="px-4 py-3 align-middle" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-12 text-center text-[var(--muted)]" colSpan={columns.length}>Sin proyectos con los filtros actuales.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
