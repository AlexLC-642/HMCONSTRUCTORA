import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { DevicePasskeyMark } from "@/modules/auth/ui/device-passkey-mark";
import { PasskeyManager } from "@/modules/auth/ui/passkey-manager";
import { prisma } from "@/shared/lib/prisma";

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const passkeys = await prisma.userPasskey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, lastUsedAt: true, backedUp: true }
  });

  return (
    <main className="mx-auto max-w-[1080px] space-y-5 px-1 pb-10">
      <Link className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-[#cfd4ce] bg-white px-3 text-sm font-bold text-[#35413c] shadow-[0_8px_20px_rgba(25,31,33,0.06)] transition hover:border-[#202629] hover:bg-[#f7f8f5]" href={"/users" as Route}>
        <ArrowLeft aria-hidden="true" size={17} /> Volver a usuarios
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-white px-5 py-7 shadow-[0_18px_48px_rgba(25,31,33,0.1)] sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-28 bg-[#f8e8e9] [clip-path:polygon(58%_0,100%_0,100%_100%,0_100%)] sm:w-48" />
        <div className="relative flex items-start gap-4 pr-8 sm:items-center sm:gap-5">
          <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-[#202629] text-white shadow-[0_12px_28px_rgba(25,31,33,0.2)]"><DevicePasskeyMark size={29} /></span>
          <div><h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Huella o patrón</h1><p className="mt-1.5 max-w-xl text-sm leading-6 text-[#5f6b66] sm:text-base">Activa este equipo para entrar de forma rápida y segura.</p></div>
        </div>
      </header>

      <PasskeyManager initialPasskeys={passkeys.map((passkey) => ({ ...passkey, createdAt: passkey.createdAt.toISOString(), lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null }))} />
    </main>
  );
}
