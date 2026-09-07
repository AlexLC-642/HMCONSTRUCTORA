try {
	const theme = localStorage.getItem("hm-theme");
	if (theme === "dark" || theme === "light") {
		document.documentElement.setAttribute("data-theme", theme);
	}
} catch {
	// El sistema conserva el tema predeterminado si el almacenamiento no está disponible.
}
