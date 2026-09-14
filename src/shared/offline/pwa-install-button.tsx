"use client";

import { Check, Download, Share, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState =
	| "checking"
	| "installed"
	| "installable"
	| "ios-manual"
	| "unsupported";

function isStandaloneDisplay() {
	if (typeof window === "undefined") return false;
	const navigatorWithStandalone = window.navigator as Navigator & {
		standalone?: boolean;
	};
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		navigatorWithStandalone.standalone === true
	);
}

function isIosDevice() {
	if (typeof navigator === "undefined") return false;
	return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Native install UI (the browser's own "Instalar" affordance) only exists on
 * Chromium engines via beforeinstallprompt - Firefox never fires it, and iOS
 * Safari never fires it either but does support a manual "Agregar a
 * pantalla de inicio" flow. This gives every visitor an in-app answer:
 * a real install button where the platform supports it, instructions where
 * only a manual path exists, and nothing where installing genuinely isn't
 * possible - never a button that silently does nothing.
 *
 * "Already installed" is read live from display-mode/navigator.standalone
 * and the appinstalled event, never a localStorage flag - so uninstalling
 * and reinstalling later just works instead of getting stuck on stale state.
 */
export function PwaInstallButton() {
	const [state, setState] = useState<InstallState>("checking");
	const [showIosHelp, setShowIosHelp] = useState(false);
	const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isStandaloneDisplay()) {
			setState("installed");
			return;
		}

		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			deferredPromptRef.current = event as BeforeInstallPromptEvent;
			setState("installable");
		};
		const onAppInstalled = () => {
			deferredPromptRef.current = null;
			setShowIosHelp(false);
			setState("installed");
		};

		window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
		window.addEventListener("appinstalled", onAppInstalled);

		const displayModeQuery = window.matchMedia("(display-mode: standalone)");
		const onDisplayModeChange = (event: MediaQueryListEvent) => {
			if (event.matches) setState("installed");
		};
		displayModeQuery.addEventListener("change", onDisplayModeChange);

		// beforeinstallprompt can take a moment to arrive (or never will, on
		// engines that don't support it) - give it a window before deciding
		// there's nothing to offer, so we don't flash straight to "unsupported".
		const fallbackTimer = window.setTimeout(() => {
			setState((current) =>
				current === "checking"
					? isIosDevice()
						? "ios-manual"
						: "unsupported"
					: current,
			);
		}, 1800);

		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
			window.removeEventListener("appinstalled", onAppInstalled);
			displayModeQuery.removeEventListener("change", onDisplayModeChange);
			window.clearTimeout(fallbackTimer);
		};
	}, []);

	useEffect(() => {
		if (!showIosHelp) return;
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setShowIosHelp(false);
		}
		function onClickOutside(event: MouseEvent) {
			if (!popoverRef.current?.contains(event.target as Node)) {
				setShowIosHelp(false);
			}
		}
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("mousedown", onClickOutside);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("mousedown", onClickOutside);
		};
	}, [showIosHelp]);

	async function handleInstall() {
		const deferredPrompt = deferredPromptRef.current;
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		const choice = await deferredPrompt.userChoice;
		deferredPromptRef.current = null;
		// A "dismissed" choice doesn't mean unsupported - the browser may offer
		// the prompt again later - so fall back to hiding the button rather
		// than claiming a state we can't actually confirm.
		setState(choice.outcome === "accepted" ? "installed" : "unsupported");
	}

	if (state === "checking" || state === "unsupported") return null;

	if (state === "installed") {
		return (
			<span
				className="pwa-install-badge inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] px-3 text-xs font-semibold text-[var(--success)]"
				title="Esta aplicación ya está instalada en este dispositivo"
			>
				<Check aria-hidden="true" size={14} />
				<span className="hidden sm:inline">Ya instalada</span>
			</span>
		);
	}

	if (state === "ios-manual") {
		return (
			<div className="relative" ref={popoverRef}>
				<button
					aria-expanded={showIosHelp}
					aria-label="Cómo instalar la aplicación"
					className="app-shell-bell focus-ring relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface))]"
					onClick={() => setShowIosHelp((value) => !value)}
					type="button"
				>
					<Download aria-hidden="true" size={15} />
					<span className="hidden sm:inline">Instalar</span>
				</button>
				{showIosHelp ? (
					<div className="pwa-install-popover" role="dialog">
						<div className="flex items-start justify-between gap-3">
							<p className="pwa-install-popover__title">
								Instalar en este iPhone/iPad
							</p>
							<button
								aria-label="Cerrar"
								className="focus-ring"
								onClick={() => setShowIosHelp(false)}
								type="button"
							>
								<X aria-hidden="true" size={15} />
							</button>
						</div>
						<ol>
							<li>
								Toca <Share aria-hidden="true" size={13} /> "Compartir" en la
								barra de Safari.
							</li>
							<li>Elige "Agregar a inicio".</li>
							<li>Confirma con "Agregar".</li>
						</ol>
					</div>
				) : null}
			</div>
		);
	}

	return (
		<button
			className="app-shell-bell focus-ring relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface))]"
			onClick={handleInstall}
			type="button"
		>
			<Download aria-hidden="true" size={15} />
			<span className="hidden sm:inline">Instalar app</span>
		</button>
	);
}
