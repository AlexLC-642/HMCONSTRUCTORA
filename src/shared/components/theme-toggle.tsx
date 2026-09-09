"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hm-theme";

function currentTheme(): "light" | "dark" {
	if (typeof document === "undefined") return "light";
	return document.documentElement.getAttribute("data-theme") === "dark"
		? "dark"
		: "light";
}

export function ThemeToggle() {
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		let resolved = currentTheme();
		try {
			const stored = window.localStorage.getItem(STORAGE_KEY);
			if (stored === "dark" || stored === "light") resolved = stored;
		} catch {
			// Conserva el tema enviado por el servidor.
		}
		document.documentElement.setAttribute("data-theme", resolved);
		document.cookie = `${STORAGE_KEY}=${resolved}; Path=/; Max-Age=31536000; SameSite=Lax`;
		setTheme(resolved);
	}, []);

	function toggle() {
		const next = theme === "dark" ? "light" : "dark";
		document.documentElement.setAttribute("data-theme", next);
		document.cookie = `${STORAGE_KEY}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
		try {
			window.localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// El tema seguira aplicado en esta pestana aunque no se pueda guardar.
		}
		setTheme(next);
	}

	return (
		<button
			aria-label={
				theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
			}
			aria-pressed={theme === "dark"}
			className="app-shell-bell focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[#f9faf8] text-[var(--foreground)] transition hover:bg-[#f3f5f1]"
			onClick={toggle}
			type="button"
		>
			{theme === "dark" ? (
				<Moon aria-hidden="true" size={18} />
			) : (
				<Sun aria-hidden="true" size={18} />
			)}
		</button>
	);
}
