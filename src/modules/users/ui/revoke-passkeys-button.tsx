"use client";

import { Trash2 } from "lucide-react";

export function RevokePasskeysButton() {
  return (
    <button className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e4b9bd] px-3 text-sm font-bold text-[#a81f2d] transition hover:bg-[#fff1f2]" onClick={(event) => { if (!window.confirm("¿Revocar todos los accesos de dispositivo de este usuario? Deberá entrar con contraseña y registrar nuevamente su equipo.")) event.preventDefault(); }} type="submit">
      <Trash2 aria-hidden="true" size={16} />
      Revocar accesos
    </button>
  );
}
