"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyPortalLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--brand-red)] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(211,33,53,0.20)] transition hover:-translate-y-0.5 hover:bg-[#b91f2b]" type="button" onClick={copyLink}>
      {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
      {copied ? "Copiado" : "Copiar enlace"}
    </button>
  );
}
