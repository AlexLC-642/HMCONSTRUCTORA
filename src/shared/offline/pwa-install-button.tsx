"use client";

import { Download, Share, X } from "lucide-react";
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

const INSTALLED_MARKER_KEY = "hm-pwa-installed";

function readInstalledMarker() {
	try {
		return window.localStorage.getItem(INSTALLED_MARKER_KEY) === "true";
	} catch {
		return false;
	}
}

function writeInstalledMarker(installed: boolean) {
	try {
		if (installed) {
			window.localStorage.setItem(INSTALLED_MARKER_KEY, "true");
		} else {
			window.localStorage.removeItem(INSTALLED_MARKER_KEY);
		}
	} catch {
		// El modo standalone sigue siendo la fuente principal cuando el
		// navegador bloquea el almacenamiento local.
	}
}

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
 * Browsers do not expose a cross-platform API that lets a normal tab query
 * whether the same PWA is already installed. Keep a local marker only after
 * the browser confirms acceptance/appinstalled, then clear it whenever a new
 * beforeinstallprompt proves that this origin is installable again.
 */
export function PwaInstallButton() {
	const [state, setState] = useState<InstallState>("checking");
	const [showIosHelp, setShowIosHelp] = useState(false);
	const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isStandaloneDisplay()) {
			writeInstalledMarker(true);
			setState("installed");
			return;
		}

		if (readInstalledMarker()) setState("installed");

		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			// Receiving this event is stronger evidence than our saved marker:
			// the browser currently considers the app eligible for installation.
			writeInstalledMarker(false);
			deferredPromptRef.current = event as BeforeInstallPromptEvent;
			setState("installable");
		};
		const onAppInstalled = () => {
			writeInstalledMarker(true);
			deferredPromptRef.current = null;
			setShowIosHelp(false);
			setState("installed");
		};

		window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
		window.addEventListener("appinstalled", onAppInstalled);

		const displayModeQuery = window.matchMedia("(display-mode: standalone)");
		const onDisplayModeChange = (event: MediaQueryListEvent) => {
			if (event.matches) {
				writeInstalledMarker(true);
				setState("installed");
			}
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
		if (choice.outcome === "accepted") {
			writeInstalledMarker(true);
			setState("installed");
		} else {
			setState("unsupported");
		}
	}

	if (state === "checking" || state === "unsupported") return null;

	if (state === "installed") return null;

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
