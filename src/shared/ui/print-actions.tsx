"use client";

import { Download, Undo2 } from "lucide-react";

type PrintActionsProps = {
  backHref: string;
};

export function PrintActions({ backHref }: PrintActionsProps) {
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[1120px] justify-end gap-2 px-8 pt-6">
      <a className="focus-ring inline-flex items-center gap-2 rounded-md border border-[#cfd4ce] bg-white px-4 py-2 text-sm font-medium text-[#111719]" href={backHref}>
        <Undo2 aria-hidden="true" size={18} />
        Regresar
      </a>
      <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white" type="button" onClick={() => window.print()}>
        <Download aria-hidden="true" size={18} />
        Descargar PDF
      </button>
    </div>
  );
}
