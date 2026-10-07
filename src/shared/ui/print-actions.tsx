"use client";

import { Download, Undo2 } from "lucide-react";
import { useEffect } from "react";

type PrintActionsProps = {
  backHref: string;
};

/**
 * En un teléfono la hoja (tamaño carta) no cabe y obligaba a desplazarse de
 * lado. Como un visor de PDF, se reduce para que quepa completa en el ancho de
 * la pantalla (se puede ampliar con los dedos). Solo en pantalla: al imprimir
 * el CSS de print restablece el tamaño real.
 */
function useFitDocumentToScreen() {
  useEffect(() => {
    const sheet = document.querySelector<HTMLElement>(".print-surface");
    if (!sheet) return;
    const fitSheet = () => {
      sheet.style.zoom = "";
      const viewport = document.documentElement.clientWidth;
      // Se reduce hasta que la hoja (con su margen en la página) quepa entera.
      for (let attempt = 0; attempt < 3; attempt++) {
        const overflow = document.documentElement.scrollWidth - viewport;
        if (overflow <= 0) break;
        const current = Number(sheet.style.zoom) || 1;
        const pageWidth = document.documentElement.scrollWidth;
        sheet.style.zoom = String(current * ((viewport - 4) / pageWidth));
      }
    };
    fitSheet();
    window.addEventListener("resize", fitSheet);
    return () => window.removeEventListener("resize", fitSheet);
  }, []);
}

export function PrintActions({ backHref }: PrintActionsProps) {
  useFitDocumentToScreen();
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[1120px] flex-wrap justify-end gap-2 px-4 pt-6 sm:px-8">
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
