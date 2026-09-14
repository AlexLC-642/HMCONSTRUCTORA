"use client";

import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import {
	browserSupportsWebAuthn,
	platformAuthenticatorIsAvailable,
	startAuthentication,
} from "@simplewebauthn/browser";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { DevicePasskeyMark } from "./device-passkey-mark";

async function errorFrom(response: Response) {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	return body?.error ?? "No se pudo completar la solicitud.";
}

export function PasskeyLogin() {
	const [available, setAvailable] = useState(false);
	const [checking, setChecking] = useState(true);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");

	useEffect(() => {
		let active = true;
		async function checkAvailability() {
			const supported =
				browserSupportsWebAuthn() &&
				(await platformAuthenticatorIsAvailable().catch(() => false));
			if (active) {
				setAvailable(supported);
				setChecking(false);
			}
		}
		void checkAvailability();
		return () => {
			active = false;
		};
	}, []);

	async function authenticate() {
		setBusy(true);
		setMessage("");
		try {
			const optionsResponse = await fetch(
				"/api/auth/passkeys/authenticate/options",
				{ method: "POST" },
			);
			if (!optionsResponse.ok)
				throw new Error(await errorFrom(optionsResponse));
			const optionsJSON =
				(await optionsResponse.json()) as PublicKeyCredentialRequestOptionsJSON;
			const credential = await startAuthentication({ optionsJSON });
			const verifyResponse = await fetch(
				"/api/auth/passkeys/authenticate/verify",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(credential),
				},
			);
			if (!verifyResponse.ok) throw new Error(await errorFrom(verifyResponse));
			const result = (await verifyResponse.json()) as { redirectTo?: string };
			window.location.assign(result.redirectTo ?? "/dashboard");
		} catch (error) {
			const cancelled =
				error instanceof Error &&
				(error.name === "NotAllowedError" ||
					error.message.includes("ceremony was sent an abort signal"));
			setMessage(
				cancelled
					? "La verificación fue cancelada."
					: error instanceof Error
						? error.message
						: "No se pudo validar el dispositivo.",
			);
			setBusy(false);
		}
	}

	if (checking)
		return (
			<div
				aria-label="Comprobando acceso del dispositivo"
				className="h-14 animate-pulse rounded-lg bg-[#eef0ec] motion-reduce:animate-none"
				role="status"
			/>
		);
	if (!available) return null;

	return (
		<div className="mt-6 border-t border-[#dde1dc] pt-5">
			<button
				className="focus-ring flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border border-[#c9cec9] bg-[#f7f8f5] px-4 text-center text-sm font-bold text-[#182023] transition hover:border-[#202629] hover:bg-white disabled:cursor-wait disabled:opacity-70"
				disabled={busy}
				onClick={authenticate}
				type="button"
			>
				<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#202629] text-white shadow-[0_9px_20px_rgba(25,31,33,0.2)]">
					{busy ? (
						<LoaderCircle
							aria-hidden="true"
							className="animate-spin motion-reduce:animate-none"
							size={19}
						/>
					) : (
						<DevicePasskeyMark size={23} />
					)}
				</span>
				<span className="text-left">
					<span className="block">
						{busy ? "Verificando…" : "Entrar con este dispositivo"}
					</span>
					{!busy ? (
						<span className="mt-0.5 block text-xs font-medium text-[#66716c]">
							Usa la huella, el PIN o el patrón del teléfono
						</span>
					) : null}
				</span>
			</button>
			{message ? (
				<p
					aria-live="polite"
					className="mt-3 rounded-lg bg-[#fff1f2] px-3 py-2 text-sm text-[#a81f2d]"
				>
					{message}
				</p>
			) : null}
		</div>
	);
}
