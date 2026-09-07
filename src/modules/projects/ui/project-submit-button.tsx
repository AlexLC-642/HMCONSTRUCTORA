"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useFormStatus } from "react-dom";

export function ProjectSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-red)] px-6 text-sm font-bold text-white shadow-[0_16px_34px_rgba(200,32,47,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ae1c29] disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none" disabled={pending} type="submit">
      {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={18} /> : <Plus aria-hidden="true" size={18} />}
      {pending ? "Guardando proyecto…" : label}
    </button>
  );
}
