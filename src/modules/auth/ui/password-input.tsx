"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";

export function PasswordInput() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="login-input-row flex h-12 overflow-hidden rounded-md border border-[#cfd3cf] bg-white">
      <span className="grid w-12 shrink-0 place-items-center border-r border-[#dfe2df] bg-[#f7f6f1] text-[#68716d]">
        <LockKeyhole aria-hidden="true" size={18} />
      </span>
      <input className="min-w-0 flex-1 px-3 text-base outline-none" id="login-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required />
      <button aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} className="focus-ring grid w-12 shrink-0 place-items-center border-l border-[#dfe2df] bg-[#f7f6f1] text-[#59645f] transition hover:bg-[#ecefea] hover:text-[#151b1d]" onClick={() => setVisible((current) => !current)} type="button">
        {visible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
      </button>
    </div>
  );
}
