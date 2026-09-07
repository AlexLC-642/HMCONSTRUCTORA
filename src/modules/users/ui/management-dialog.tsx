"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type ManagementDialogProps = {
  children: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
  trigger: ReactNode;
  triggerClassName?: string;
  width?: "medium" | "wide";
};

export function ManagementDialog({ children, description, icon, title, trigger, triggerClassName = "focus-ring inline-flex h-10 items-center justify-center rounded-lg bg-[#202629] px-4 text-sm font-semibold text-white transition hover:bg-[#0f1315]", width = "medium" }: ManagementDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = title.replaceAll(" ", "-").toLowerCase();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const closeOnBackdrop = (event: MouseEvent) => { if (event.target === dialog) dialog.close(); };
    dialog.addEventListener("click", closeOnBackdrop);
    return () => dialog.removeEventListener("click", closeOnBackdrop);
  }, []);

  return (
    <>
      <button className={triggerClassName} onClick={() => dialogRef.current?.showModal()} type="button">{trigger}</button>
      <dialog aria-describedby={`${dialogId}-description`} aria-labelledby={`${dialogId}-title`} className={`users-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-2xl bg-[#f7f6f2] p-0 text-[#111719] shadow-[0_36px_110px_rgba(9,13,15,0.42)] backdrop:bg-[#111719]/65 backdrop:backdrop-blur-[3px] ${width === "wide" ? "max-w-4xl" : "max-w-xl"}`} ref={dialogRef}>
        <div className="relative flex items-start justify-between gap-5 overflow-hidden bg-[#202629] px-5 py-5 text-white sm:px-6">
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-52 opacity-15 [background-image:linear-gradient(135deg,transparent_44%,#fff_44%,#fff_45%,transparent_45%,transparent_55%,#fff_55%,#fff_56%,transparent_56%)] [background-size:48px_48px]" />
          <div className="flex min-w-0 gap-3">
            {icon ? <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-red)] text-white shadow-[0_10px_24px_rgba(200,32,47,0.32)]">{icon}</span> : null}
            <div className="relative"><h2 className="text-xl font-bold tracking-[-0.02em]" id={`${dialogId}-title`}>{title}</h2><p className="mt-1 text-sm leading-5 text-[#c8cfcc]" id={`${dialogId}-description`}>{description}</p></div>
          </div>
          <button aria-label="Cerrar ventana" className="focus-ring relative grid size-10 shrink-0 place-items-center rounded-lg text-[#d7ddda] transition hover:bg-white/10 hover:text-white" onClick={() => dialogRef.current?.close()} type="button"><X aria-hidden="true" size={19} /></button>
        </div>
        <div className="max-h-[calc(100dvh-8.5rem)] overflow-y-auto bg-[radial-gradient(circle_at_100%_0%,rgba(200,32,47,0.055),transparent_17rem)] p-5 sm:p-6">{children}</div>
      </dialog>
    </>
  );
}
