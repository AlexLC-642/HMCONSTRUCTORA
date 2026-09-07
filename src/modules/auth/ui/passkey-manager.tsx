"use client";

import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startRegistration } from "@simplewebauthn/browser";
import { Check, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DevicePasskeyMark } from "./device-passkey-mark";

type PasskeyItem = { id: string; createdAt: string; lastUsedAt: string | null; backedUp: boolean };

async function errorFrom(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "No se pudo completar la solicitud.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function PasskeyManager({ initialPasskeys }: { initialPasskeys: PasskeyItem[] }) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function check() {
      const supported = browserSupportsWebAuthn() && await platformAuthenticatorIsAvailable().catch(() => false);
      if (active) setAvailable(supported);
    }
    void check();
    return () => { active = false; };
  }, []);

  async function register() {
    setBusy(true);
    setMessage(null);
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/register/options", { method: "POST" });
      if (!optionsResponse.ok) throw new Error(await errorFrom(optionsResponse));
      const optionsJSON = await optionsResponse.json() as PublicKeyCredentialCreationOptionsJSON;
      const credential = await startRegistration({ optionsJSON });
      const verifyResponse = await fetch("/api/auth/passkeys/register/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credential) });
      if (!verifyResponse.ok) throw new Error(await errorFrom(verifyResponse));
      setMessage({ tone: "success", text: "Acceso activado en este equipo." });
      window.location.reload();
    } catch (error) {
      const cancelled = error instanceof Error && error.name === "NotAllowedError";
      setMessage({ tone: "error", text: cancelled ? "La configuración fue cancelada." : error instanceof Error ? error.message : "No se pudo activar el acceso." });
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("¿Quitar este equipo? Podrás seguir entrando con tu contraseña.")) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/auth/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage({ tone: "error", text: await errorFrom(response) });
      setBusy(false);
      return;
    }
    setPasskeys((current) => current.filter((passkey) => passkey.id !== id));
    setMessage({ tone: "success", text: "Equipo eliminado." });
    setBusy(false);
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(25,31,33,0.11)]">
      <div className="grid gap-6 bg-[#202629] px-5 py-6 text-white sm:px-7 sm:py-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-[#202629] shadow-[0_10px_24px_rgba(0,0,0,0.2)]"><DevicePasskeyMark size={27} /></span>
          <div><h2 className="text-xl font-bold text-white">Activar en este equipo</h2><p className="mt-1 max-w-xl text-sm leading-6 text-[#d3dad6]">Usa la huella, el rostro, el PIN o el patrón configurado en tu dispositivo.</p></div>
        </div>

        {available === false ? <p className="max-w-sm rounded-xl bg-white/8 px-4 py-3 text-sm leading-5 text-[#e0e5e2]">Este equipo no admite esta opción. Puedes continuar con tu contraseña.</p> : <button className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-red)] px-5 text-sm font-bold !text-white shadow-[0_14px_30px_rgba(200,32,47,0.3)] transition hover:bg-[#ae1c29] disabled:cursor-wait disabled:opacity-70 lg:w-auto" disabled={busy || available !== true} onClick={register} type="button">{busy ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={18} /> : <Check aria-hidden="true" size={18} />}{busy ? "Activando…" : available === null ? "Comprobando…" : "Activar acceso"}</button>}
      </div>

      {message ? <p aria-live="polite" className={`mx-5 mt-5 rounded-xl px-4 py-3 text-sm font-medium sm:mx-7 ${message.tone === "success" ? "bg-[#e8f5ee] text-[#176c4b]" : "bg-[#fff0f1] text-[#a81f2d]"}`}>{message.text}</p> : null}

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold">Equipos vinculados</h2><p className="mt-1 text-sm text-[#65706b]">Quita cualquier equipo que ya no utilices.</p></div><span className="rounded-full bg-[#eef1ed] px-3 py-1 text-xs font-bold text-[#4f5a55]">{passkeys.length}</span></div>

        {passkeys.length === 0 ? <div className="py-10 text-center"><DevicePasskeyMark className="mx-auto text-[#8a948f]" size={39} /><p className="mt-3 font-bold">Ningún equipo vinculado</p><p className="mt-1 text-sm text-[#65706b]">Activa este equipo para comenzar.</p></div> : <div className="mt-5 divide-y divide-[#e3e6e1] border-y border-[#e3e6e1]">{passkeys.map((passkey, index) => <article className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between" key={passkey.id}><div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e8f4ee] text-[#176c4b]"><DevicePasskeyMark size={24} /></span><div><p className="font-bold">Equipo {index + 1}</p><p className="mt-1 text-xs leading-5 text-[#65706b]">Agregado {formatDate(passkey.createdAt)}{passkey.lastUsedAt ? ` · Último uso ${formatDate(passkey.lastUsedAt)}` : ""}</p></div></div><button aria-label={`Quitar equipo ${index + 1}`} className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e2b9bd] px-3 text-sm font-bold text-[#a81f2d] transition hover:bg-[#fff1f2]" disabled={busy} onClick={() => void remove(passkey.id)} type="button"><Trash2 aria-hidden="true" size={16} /> Quitar</button></article>)}</div>}
      </div>
    </section>
  );
}
