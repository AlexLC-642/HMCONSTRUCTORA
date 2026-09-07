"use client";

import { FileVideo, Image as ImageIcon, Plus, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type ActivityOption = {
  value: string;
  label: string;
};

type EvidenceUploadFieldsProps = {
  rows: number;
  activityOptions: ActivityOption[];
};

type Preview = {
  url: string;
  name: string;
  type: string;
  size: string;
};

type Slot = {
  id: string;
};

const inputClass = "focus-ring h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";
const labelClass = "grid gap-1 text-sm";
const labelTextClass = "text-[11px] font-semibold uppercase text-[var(--muted)]";

function fileSizeLabel(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function EvidenceUploadFields({ rows, activityOptions }: EvidenceUploadFieldsProps) {
  const initialSlots = useMemo(() => Array.from({ length: rows }, (_, index) => ({ id: `evidence-slot-${index + 1}` })), [rows]);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [previews, setPreviews] = useState<Record<string, Preview | null>>({});
  const previewUrlsRef = useRef<Record<string, string | null>>({});
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(previewUrlsRef.current)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, []);

  function setPreview(slotId: string, file: File | null) {
    const oldUrl = previewUrlsRef.current[slotId];
    if (oldUrl) URL.revokeObjectURL(oldUrl);

    const next = { ...previews };
    if (!file) {
      previewUrlsRef.current[slotId] = null;
      next[slotId] = null;
      setPreviews(next);
      return;
    }

    const url = URL.createObjectURL(file);
    previewUrlsRef.current[slotId] = url;
    next[slotId] = { url, name: file.name, type: file.type, size: fileSizeLabel(file.size) };
    setPreviews(next);
  }

  function clearPreview(index: number, slotId: string) {
    const input = inputRefs.current[index];
    if (input) input.value = "";
    setPreview(slotId, null);
  }

  function addSlot() {
    setSlots((current) => [...current, { id: `evidence-slot-${Date.now()}-${current.length}` }]);
  }

  function removeSlot(index: number, slotId: string) {
    clearPreview(index, slotId);
    setSlots((current) => current.length > 1 ? current.filter((slot) => slot.id !== slotId) : current);
  }

  return (
    <div className="grid gap-4 p-5">
      <input name="mediaCount" type="hidden" value={slots.length} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[#fbfaf6] px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{slots.length} evidencias preparadas</p>
          <p className="text-xs text-[var(--muted)]">Agrega fotos o videos; se incluiran en el informe y en la vista PDF.</p>
        </div>
        <button className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" type="button" onClick={addSlot}>
          <Plus aria-hidden="true" size={16} />
          Agregar evidencia
        </button>
      </div>

      {slots.map(({ id }, index) => {
        const preview = previews[id];
        const isVideo = preview?.type.startsWith("video/");

        return (
          <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_34px_rgba(31,42,45,0.07)] lg:grid-cols-[14rem_1fr]" key={id}>
            <div className="overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-white">
              {preview ? (
                <div>
                  <div className="relative aspect-[4/3] bg-[#eef0ed]">
                    {isVideo ? (
                      <video className="h-full w-full object-cover" controls muted src={preview.url} />
                    ) : (
                      <Image alt={`Vista previa de ${preview.name}`} className="object-cover" fill sizes="14rem" src={preview.url} unoptimized />
                    )}
                    <button
                      aria-label="Quitar evidencia"
                      className="focus-ring absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/95 text-[#30383a] shadow-sm"
                      onClick={() => clearPreview(index, id)}
                      type="button"
                    >
                      <X aria-hidden="true" size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)]">
                    {isVideo ? <FileVideo aria-hidden="true" size={15} /> : <ImageIcon aria-hidden="true" size={15} />}
                    <span className="min-w-0 flex-1 truncate">{preview.name}</span>
                    <span>{preview.size}</span>
                  </div>
                </div>
              ) : (
                <div className="grid aspect-[4/3] place-items-center px-4 text-center">
                  <div>
                    <UploadCloud aria-hidden="true" className="mx-auto text-[var(--muted)]" size={28} />
                    <p className="mt-2 text-sm font-semibold">Sin evidencia</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Foto o video de campo</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid content-start gap-3 md:grid-cols-12">
              <div className="flex items-center justify-between gap-3 md:col-span-12">
                <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">Evidencia {index + 1}</span>
                <button
                  className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:border-[#f1b6ba] hover:bg-[#fff1f1] hover:text-[var(--brand-red)]"
                  type="button"
                  onClick={() => removeSlot(index, id)}
                >
                  <X aria-hidden="true" size={14} />
                  Quitar
                </button>
              </div>
              <label className={`${labelClass} md:col-span-5`}>
                <span className={labelTextClass}>Archivo</span>
                <input
                  className="focus-ring w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  name={`media.${index}.file`}
                  type="file"
                  accept="image/*,video/*"
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  onChange={(event) => setPreview(id, event.target.files?.[0] ?? null)}
                />
              </label>
              <label className={`${labelClass} md:col-span-3`}>
                <span className={labelTextClass}>Momento</span>
                <select className={inputClass} name={`media.${index}.mediaType`} defaultValue="DURING">
                  <option value="BEFORE">Antes</option>
                  <option value="DURING">Durante</option>
                  <option value="AFTER">Despues</option>
                  <option value="OTHER">Otro</option>
                </select>
              </label>
              <label className={`${labelClass} md:col-span-4`}>
                <span className={labelTextClass}>Actividad</span>
                <select className={inputClass} name={`media.${index}.activityRef`} defaultValue="">
                  <option value="">General</option>
                  {activityOptions.map((activity) => (
                    <option key={activity.value} value={activity.value}>
                      {activity.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${labelClass} md:col-span-5`}>
                <span className={labelTextClass}>Titulo</span>
                <input className={inputClass} name={`media.${index}.title`} placeholder="Ej. Muro eje A-B" />
              </label>
              <label className={`${labelClass} md:col-span-7`}>
                <span className={labelTextClass}>Descripcion</span>
                <input className={inputClass} name={`media.${index}.description`} placeholder="Detalle breve de la evidencia." />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
