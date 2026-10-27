/**
 * Capturas de pantalla para el Manual del Usuario.
 *
 * Requiere el sistema corriendo (`npm run dev`) con los datos de
 * prisma/seed-manual.ts. Uso:
 *
 *   npx tsx scripts/capturas-manual.ts
 *
 * Variables opcionales: MANUAL_BASE_URL (http://localhost:3000),
 * MANUAL_ADMIN_USER (admin), MANUAL_ADMIN_PASSWORD.
 *
 * Además de cada pantalla, abre los formularios de cada módulo y los muestra
 * vacíos y llenados con un ejemplo. NUNCA los envía: ningún paso hace clic en
 * Guardar/Crear/Registrar dentro de un formulario, así que la base no cambia.
 *
 * Guarda las imágenes numeradas en docs/manual/capturas/ y un resumen en
 * docs/manual/capturas/resultado.json con las pantallas que fallaron o
 * salieron vacías.
 */
import "dotenv/config";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	type Browser,
	type BrowserContext,
	chromium,
	type Locator,
	type Page,
} from "playwright";
import { prisma } from "../src/shared/lib/prisma";

const BASE_URL = process.env.MANUAL_BASE_URL ?? "http://localhost:3000";
const ADMIN_USER = process.env.MANUAL_ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.MANUAL_ADMIN_PASSWORD ?? "ManualHM2026!";
const OUTPUT_DIR = path.join(process.cwd(), "docs", "manual", "capturas");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const MAX_EXPANDED_HEIGHT = 6000;

/** Acciones para preparar un formulario antes de la captura (nunca envían). */
type Step =
	/** Clic en un botón, enlace, opción o etiqueta visible que contenga el texto. */
	| { click: string; pick?: "first" | "last" }
	/** Clic en el botón cuyo nombre es exactamente este texto. */
	| { button: string }
	/** Escribe en el campo de la etiqueta que contenga el texto. */
	| { label: string; value: string; nth?: number }
	/** Elige en el select de la etiqueta la opción que contenga el texto. */
	| { labelSelect: string; option: string; nth?: number }
	/** Escribe en el campo del selector CSS (último visible). */
	| { fill: string; value: string }
	/** Elige en el select del selector CSS la opción que contenga el texto. */
	| { select: string; option: string }
	/** Despliega las secciones plegadas ("Más detalles") del formulario. */
	| { openDetails: true }
	/** Escribe valores en orden en los campos visibles del selector CSS. */
	| { fillEach: string; values: string[] }
	/** Adjunta un archivo de ejemplo al input del selector CSS. */
	| { file: string; name: string; mimeType: string };

type Shot = {
	name: string;
	url: string;
	/** Texto que debe aparecer para considerar que la pantalla cargó. */
	expect?: string;
	mobile?: boolean;
	session?: boolean;
	steps?: Step[];
	/** Captura la página completa (vistas de impresión / PDF, formularios largos). */
	fullPage?: boolean;
	/** Agranda la ventana hasta que el diálogo abierto se vea completo. */
	expand?: boolean;
};

type Result = {
	file: string;
	url: string;
	status: "ok" | "vacía" | "falló";
	detail?: string;
};

const HIDE_DEV_UI = `
nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }
*, *::before, *::after { caret-color: transparent !important; }
`;

const SAMPLE_PDF = Buffer.from(
	"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

async function resolveIds() {
	const project = await prisma.project.findFirstOrThrow({
		where: {
			name: "Construcción de vivienda unifamiliar Residencial Los Álamos",
		},
		select: { id: true },
	});
	const report = await prisma.dailyReport.findFirstOrThrow({
		where: {
			projectId: project.id,
			status: "PUBLISHED",
			mediaEntries: { some: {} },
		},
		orderBy: { reportDate: "desc" },
		select: { id: true },
	});
	const share = await prisma.portalShare.findFirstOrThrow({
		where: { projectId: project.id, revokedAt: null, token: { not: null } },
		orderBy: { createdAt: "desc" },
		select: { token: true },
	});
	return {
		projectId: project.id,
		reportId: report.id,
		portalToken: share.token as string,
	};
}

async function login(context: BrowserContext) {
	const page = await context.newPage();
	await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
	await page.fill('input[name="email"]', ADMIN_USER);
	await page.fill('input[name="password"]', ADMIN_PASSWORD);
	await Promise.all([
		page.waitForURL((url) => !url.pathname.startsWith("/login"), {
			timeout: 60000,
		}),
		page.click('button[type="submit"]'),
	]);
	await page.close();
}

async function settle(page: Page) {
	await page.addStyleTag({ content: HIDE_DEV_UI }).catch(() => {});
	await page
		.waitForLoadState("networkidle", { timeout: 15000 })
		.catch(() => {});
	// Las fuentes y las gráficas (ECharts) terminan de pintar un poco después.
	await page.evaluate(() => document.fonts?.ready).catch(() => {});
	await page.waitForTimeout(1500);
}

function labelled(page: Page, text: string, nth?: number): Locator {
	const field = page
		.locator("label:visible", { hasText: text })
		.locator("input:not([type=hidden]), select, textarea");
	return nth === undefined ? field.last() : field.nth(nth);
}

async function chooseOption(select: Locator, text: string) {
	const value = await select.evaluate((element, wanted) => {
		const options = Array.from((element as HTMLSelectElement).options);
		const match = options.find((option) =>
			option.text.toLowerCase().includes(wanted.toLowerCase()),
		);
		return match?.value ?? null;
	}, text);
	if (value === null) throw new Error(`No existe la opción "${text}"`);
	await select.selectOption(value);
}

async function runStep(page: Page, step: Step) {
	if ("click" in step) {
		const target = page.locator(
			":is(button, a, label, [role=option], [role=menuitem], li):visible",
			{ hasText: step.click },
		);
		await (step.pick === "first" ? target.first() : target.last()).click({
			timeout: 15000,
		});
	} else if ("button" in step) {
		await page
			.getByRole("button", { name: step.button, exact: true })
			.last()
			.click({ timeout: 15000 });
	} else if ("label" in step) {
		await labelled(page, step.label, step.nth).fill(step.value);
	} else if ("labelSelect" in step) {
		await chooseOption(labelled(page, step.labelSelect, step.nth), step.option);
	} else if ("fill" in step) {
		await page.locator(`${step.fill} >> visible=true`).last().fill(step.value);
	} else if ("select" in step) {
		await chooseOption(
			page.locator(`${step.select} >> visible=true`).last(),
			step.option,
		);
	} else if ("openDetails" in step) {
		await page.evaluate(() => {
			for (const details of Array.from(document.querySelectorAll("details"))) {
				details.open = true;
			}
		});
	} else if ("fillEach" in step) {
		const fields = page.locator(`${step.fillEach} >> visible=true`);
		for (const [index, value] of step.values.entries()) {
			await fields.nth(index).fill(value);
		}
	} else if ("file" in step) {
		await page.locator(step.file).last().setInputFiles({
			name: step.name,
			mimeType: step.mimeType,
			buffer: SAMPLE_PDF,
		});
	}
	await page.waitForTimeout(450);
}

/**
 * Los diálogos tienen su propio scroll: se agranda la ventana lo que le falta
 * al contenedor con scroll dentro de un elemento fijo (el diálogo) para que
 * el formulario completo quede en una sola imagen.
 */
/**
 * Si hubo que "despegar" el diálogo, devuelve su posición en la página para
 * recortar la captura a su alrededor.
 */
async function expandToDialog(
	page: Page,
	width: number,
): Promise<{ top: number; height: number } | null> {
	// El diálogo suele medir un % de la ventana: al agrandarla crece y puede
	// seguir faltando espacio, por eso se repite hasta que todo quepa.
	let previous = Number.POSITIVE_INFINITY;
	for (let pass = 0; pass < 6; pass++) {
		const missing = await missingDialogHeight(page);
		if (missing <= 2) return null;
		// Si agrandar la ventana no reduce lo que falta, el diálogo tiene una
		// altura máxima fija: se pasa al plan B.
		if (missing >= previous - 2) break;
		previous = missing;
		const current = page.viewportSize()?.height ?? DESKTOP.height;
		const height = Math.min(current + missing + 48, MAX_EXPANDED_HEIGHT);
		if (height <= current) break;
		await page.setViewportSize({ width, height });
		await page.waitForTimeout(700);
	}
	await page.setViewportSize({ width, height: DESKTOP.height });
	await page.waitForTimeout(500);
	return (await unclampDialog(page)) ?? { top: 0, height: 0 };
}

/** Quita la altura máxima del diálogo y lo deja fluir para capturarlo entero. */
async function unclampDialog(page: Page) {
	await page.evaluate(() => {
		for (const element of Array.from(document.querySelectorAll("*"))) {
			const node = element as HTMLElement;
			if (!/(auto|scroll)/.test(getComputedStyle(node).overflowY)) continue;
			if (node.scrollHeight - node.clientHeight <= 2) continue;
			let overlay: HTMLElement | null = null;
			for (
				let parent: HTMLElement | null = node;
				parent;
				parent = parent.parentElement
			) {
				if (getComputedStyle(parent).position === "fixed") {
					overlay = parent;
					break;
				}
			}
			if (!overlay) continue;
			for (
				let parent: HTMLElement | null = node;
				parent && parent !== overlay;
				parent = parent.parentElement
			) {
				parent.style.setProperty("max-height", "none", "important");
				parent.style.setProperty("height", "auto", "important");
				parent.style.setProperty("overflow", "visible", "important");
			}
			overlay.style.setProperty("position", "absolute", "important");
			overlay.style.setProperty("height", "auto", "important");
			overlay.style.setProperty("min-height", "100%", "important");
			overlay.style.setProperty("overflow", "visible", "important");
			overlay.style.setProperty("padding-top", "32px", "important");
			overlay.style.setProperty("padding-bottom", "32px", "important");
			let panel: HTMLElement = node;
			while (panel.parentElement && panel.parentElement !== overlay) {
				panel = panel.parentElement;
			}
			panel.dataset.manualPanel = "true";
		}
		window.scrollTo(0, 0);
	});
	await page.waitForTimeout(500);
	return page.evaluate(() => {
		const panel = document.querySelector<HTMLElement>("[data-manual-panel]");
		if (!panel) return null;
		const box = panel.getBoundingClientRect();
		return { top: box.top + window.scrollY, height: box.height };
	});
}

async function missingDialogHeight(page: Page) {
	return page.evaluate(() => {
		let max = 0;
		for (const element of Array.from(document.querySelectorAll("*"))) {
			const node = element as HTMLElement;
			if (!/(auto|scroll)/.test(getComputedStyle(node).overflowY)) continue;
			const box = node.getBoundingClientRect();
			if (box.width < 200 || box.height < 80) continue;
			let fixed = false;
			for (
				let parent: HTMLElement | null = node;
				parent;
				parent = parent.parentElement
			) {
				if (getComputedStyle(parent).position === "fixed") {
					fixed = true;
					break;
				}
			}
			if (!fixed) continue;
			max = Math.max(max, node.scrollHeight - node.clientHeight);
		}
		return max;
	});
}

/** El indicador de desarrollo de Next.js vive en un shadow DOM que se monta tarde. */
async function hideDevIndicator(page: Page) {
	await page
		.evaluate(() => {
			for (const host of Array.from(
				document.querySelectorAll("nextjs-portal"),
			)) {
				(host as HTMLElement).style.setProperty("display", "none", "important");
				const root = host.shadowRoot;
				if (root && !root.querySelector("style[data-manual]")) {
					const style = document.createElement("style");
					style.dataset.manual = "true";
					style.textContent = "* { display: none !important; }";
					root.appendChild(style);
				}
			}
		})
		.catch(() => {});
}

async function capture(page: Page, shot: Shot, file: string): Promise<Result> {
	const url = `${BASE_URL}${shot.url}`;
	try {
		const response = await page.goto(url, {
			waitUntil: "load",
			timeout: 120000,
		});
		await settle(page);
		for (const step of shot.steps ?? []) await runStep(page, step);
		if (shot.steps?.length) await page.waitForTimeout(700);
		const unclamped = shot.expand
			? await expandToDialog(page, (page.viewportSize() ?? DESKTOP).width)
			: null;

		const finalPath = new URL(page.url()).pathname;
		const bodyText = (
			await page
				.locator("body")
				.innerText()
				.catch(() => "")
		).trim();
		const nextError = await page
			.locator(
				"text=/Unhandled Runtime Error|Application error|This page could not be found|Internal Server Error/i",
			)
			.count();

		await hideDevIndicator(page);
		await page.screenshot({
			path: path.join(OUTPUT_DIR, file),
			fullPage: (shot.fullPage ?? false) || Boolean(unclamped),
			...(unclamped && unclamped.height > 0
				? {
						clip: {
							x: 0,
							y: Math.max(0, unclamped.top - 40),
							width: page.viewportSize()?.width ?? DESKTOP.width,
							height: unclamped.height + 80,
						},
					}
				: {}),
		});

		const status = response?.status() ?? 0;
		if (status >= 400)
			return { file, url: shot.url, status: "falló", detail: `HTTP ${status}` };
		if (nextError > 0)
			return {
				file,
				url: shot.url,
				status: "falló",
				detail: "La página muestra un error de Next.js",
			};
		if (
			shot.session !== false &&
			finalPath.startsWith("/login") &&
			!shot.url.startsWith("/login")
		) {
			return {
				file,
				url: shot.url,
				status: "falló",
				detail: "Redirigió al login (sin permiso o sin sesión)",
			};
		}
		if (bodyText.length < 80)
			return {
				file,
				url: shot.url,
				status: "vacía",
				detail: `Solo ${bodyText.length} caracteres de texto`,
			};
		if (
			shot.expect &&
			!bodyText.toLowerCase().includes(shot.expect.toLowerCase())
		) {
			return {
				file,
				url: shot.url,
				status: "vacía",
				detail: `No aparece el texto esperado "${shot.expect}"`,
			};
		}
		return { file, url: shot.url, status: "ok" };
	} catch (error) {
		await page
			.screenshot({ path: path.join(OUTPUT_DIR, file) })
			.catch(() => {});
		return {
			file,
			url: shot.url,
			status: "falló",
			detail:
				error instanceof Error ? error.message.split("\n")[0] : String(error),
		};
	}
}

function slug(value: string) {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function buildShots(projectId: string, reportId: string, portalToken: string) {
	const p = `/projects/${projectId}`;
	const fin = `/finances?projectId=${projectId}`;
	const pdf = (name: string) =>
		({ file: "input[type=file]", name, mimeType: "application/pdf" }) as const;

	// Formularios reutilizados en varias capturas (vacío → paso a paso → lleno).
	const directPurchaseStart: Step[] = [
		{ click: "Compra directa", pick: "first" },
	];
	const directPurchaseHeader: Step[] = [
		...directPurchaseStart,
		{ fill: "input[name=expectedDate]", value: "2026-10-22" },
		{ click: "Elegir proveedor" },
		{ click: "Cementos y Agregados del Sur" },
		{ click: "Elegir bodega" },
		{ click: "Bodega Central Zona 12" },
	];
	const directPurchasePicker: Step[] = [
		...directPurchaseHeader,
		{ click: "Agregar artículos" },
		{ click: "Cemento UGC 4000 PSI" },
		{ click: "Block de Concreto 15X20X40" },
		{ click: "Arena Lavada para Concreto" },
	];
	const expenseBase: Step[] = [
		{ click: "Gasto del proyecto", pick: "first" },
		{
			fill: "input[name=description]",
			value: "Planilla de mano de obra, semanas 11 y 12",
		},
		{ fill: "input[name=subtotal]", value: "12450" },
		{ fill: "input[name=expenseDate]", value: "2026-10-16" },
		{ openDetails: true },
		{ fill: "input[name=quantity]", value: "2" },
		{ fill: "input[name=unit]", value: "semana" },
		{ fill: "input[name=phase]", value: "Obra gris" },
	];

	const shots: Shot[] = [
		// ------------------------------------------------------------ Acceso
		{
			name: "Inicio de sesión",
			url: "/login",
			session: false,
			expect: "Entrar al sistema",
		},
		{
			name: "Inicio de sesión - datos escritos",
			url: "/login",
			session: false,
			steps: [
				{ fill: 'input[name="email"]', value: "lfaju" },
				{ fill: 'input[name="password"]', value: "ContraseñaEjemplo1!" },
			],
		},
		{ name: "Panel principal", url: "/dashboard" },

		// --------------------------------------------------------- Proyectos
		{ name: "Proyectos - lista", url: "/projects", expect: "Los Álamos" },
		{
			name: "Proyectos - nuevo (formulario vacío)",
			url: "/projects/new",
			fullPage: true,
		},
		{
			name: "Proyectos - nuevo (formulario lleno)",
			url: "/projects/new",
			fullPage: true,
			steps: [
				{
					fill: "input[name=name]",
					value: "Construcción de local comercial Plaza San Lucas",
				},
				{
					fill: "textarea[name=description]",
					value: "Local de 120 m² en un nivel con mezanine, baño y bodega.",
				},
				{
					fill: "input[name=location]",
					value: "San Lucas Sacatepéquez, km 29.5 carretera Interamericana",
				},
				{ fill: "input[name=startDate]", value: "2026-11-02" },
				{ fill: "input[name=expectedEndDate]", value: "2027-03-26" },
				{ select: "select[name=responsibleId]", option: "Carlos Méndez" },
				{ click: "Luis Fernando Ajú" },
				{ click: "María José Castillo" },
			],
		},
		{ name: "Proyecto - detalle", url: p, expect: "Los Álamos" },
		{
			name: "Proyecto - información (formulario)",
			url: `${p}/information`,
			fullPage: true,
		},
		{
			name: "Proyecto - presupuesto",
			url: `${p}/budget`,
			expect: "Presupuesto vigente",
		},
		{
			name: "Proyecto - presupuesto completo",
			url: `${p}/budget`,
			fullPage: true,
		},
		{
			name: "Proyecto - presupuesto PDF",
			url: `${p}/budget/print`,
			fullPage: true,
		},
		{
			name: "Proyecto - cronograma",
			url: `${p}/schedule`,
			expect: "Cimentación",
		},
		{
			name: "Proyecto - cronograma completo",
			url: `${p}/schedule`,
			fullPage: true,
		},
		{
			name: "Proyecto - cronograma PDF",
			url: `${p}/schedule/print`,
			fullPage: true,
		},

		// Avance diario
		{ name: "Avance diario - resumen", url: `${p}/progress` },
		{
			name: "Avance diario - paso 1 jornada",
			url: `${p}/progress?tab=registro`,
			fullPage: true,
		},
		{
			name: "Avance diario - paso 2 actividades",
			url: `${p}/progress?tab=registro`,
			fullPage: true,
			steps: [{ click: "Actividades" }],
		},
		{
			name: "Avance diario - paso 3 personal y materiales",
			url: `${p}/progress?tab=registro`,
			fullPage: true,
			steps: [{ click: "Recursos" }],
		},
		{
			name: "Avance diario - paso 4 evidencia",
			url: `${p}/progress?tab=registro`,
			fullPage: true,
			steps: [{ click: "Evidencia" }],
		},
		{ name: "Avance diario - historial", url: `${p}/progress?tab=historial` },
		{ name: "Avance diario - evidencias", url: `${p}/progress?tab=evidencias` },
		{ name: "Avance diario - PDF", url: `${p}/progress/print`, fullPage: true },
		{
			name: "Informe diario - detalle",
			url: `${p}/progress/reports/${reportId}`,
			fullPage: true,
		},
		{
			name: "Informe diario - PDF",
			url: `${p}/progress/reports/${reportId}/print`,
			fullPage: true,
		},

		{ name: "Proyecto - recursos", url: `${p}/resources` },
		{ name: "Proyecto - finanzas", url: `${p}/finance` },
		{
			name: "Proyecto - documentos",
			url: `${p}/documents`,
			expect: "Contrato",
		},
		{
			name: "Proyecto - subir documento (vacío)",
			url: `${p}/documents`,
			expand: true,
			steps: [{ click: "Subir documento", pick: "first" }],
		},
		{
			name: "Proyecto - subir documento (lleno)",
			url: `${p}/documents`,
			expand: true,
			steps: [
				{ click: "Subir documento", pick: "first" },
				pdf("orden-de-cambio-01.pdf"),
				{
					fill: "input[name=title]",
					value: "Orden de cambio 01 - ampliación de garaje",
				},
				{ click: "Contratos y acuerdos" },
				{ openDetails: true },
				{
					fill: "textarea[name=description]",
					value: "Orden de cambio firmada por el cliente el 15 de octubre.",
				},
				{ fill: "input[name=tags]", value: "orden de cambio, contrato" },
			],
		},
		{ name: "Proyecto - compartir portal", url: `${p}/sharing` },

		// -------------------------------------------------------- Inventario
		{ name: "Inventario - existencias", url: "/inventory" },
		{ name: "Inventario - movimientos", url: "/inventory?view=movement" },
		{
			name: "Inventario - registrar movimiento (vacío)",
			url: "/inventory?view=movement",
			expand: true,
			steps: [{ click: "Registrar movimiento", pick: "first" }],
		},
		{
			name: "Inventario - entrada a bodega (lleno)",
			url: "/inventory?view=movement",
			expand: true,
			steps: [
				{ click: "Registrar movimiento", pick: "first" },
				{ select: "select[name=type]", option: "Entrada" },
				{ select: "select[name=materialId]", option: "Cemento UGC" },
				{ select: "select[name=warehouseId]", option: "Bodega Central" },
				{ fill: "input[name=quantity]", value: "100" },
				{ fill: "input[name=unitCost]", value: "81" },
				{ fill: "input[name=reference]", value: "Envío AgreSur 19011" },
				{
					fill: "textarea[name=notes]",
					value: "Reposición de cemento para el mes de noviembre.",
				},
			],
		},
		{
			name: "Inventario - salida a proyecto (lleno)",
			url: "/inventory?view=movement",
			expand: true,
			steps: [
				{ click: "Registrar movimiento", pick: "first" },
				{ select: "select[name=type]", option: "Salida" },
				{ select: "select[name=materialId]", option: "Nivel de Aluminio" },
				{ select: "select[name=warehouseId]", option: "Bodega Central" },
				{ fill: "input[name=quantity]", value: "1" },
				{ select: "select[name=projectId]", option: "Los Álamos" },
				{ label: "Responsable", value: "Luis Fernando Ajú" },
				{ label: "Devolución esperada", value: "2026-11-06" },
				{ fill: "input[name=reference]", value: "Préstamo HER-022" },
				{
					fill: "textarea[name=notes]",
					value: "Nivelación de soleras del segundo nivel.",
				},
			],
		},
		{
			name: "Inventario - traslado entre bodegas (lleno)",
			url: "/inventory?view=movement",
			expand: true,
			steps: [
				{ click: "Registrar movimiento", pick: "first" },
				{ select: "select[name=type]", option: "Traslado" },
				{ select: "select[name=materialId]", option: "Block de Concreto" },
				{ select: "select[name=warehouseId]", option: "Bodega Central" },
				{
					select: "select[name=destinationWarehouseId]",
					option: "Villa Nueva",
				},
				{ fill: "input[name=quantity]", value: "300" },
				{ fill: "input[name=reference]", value: "Traslado TR-0008" },
			],
		},
		{
			name: "Inventario - desperdicio (lleno)",
			url: "/inventory?view=movement",
			expand: true,
			steps: [
				{ click: "Registrar movimiento", pick: "first" },
				{ select: "select[name=type]", option: "Desperdicio" },
				{ select: "select[name=materialId]", option: "Cemento UGC" },
				{ select: "select[name=warehouseId]", option: "Bodega Central" },
				{ fill: "input[name=quantity]", value: "3" },
				{ select: "select[name=wasteReason]", option: "Daño" },
				{
					fill: "textarea[name=notes]",
					value: "Sacos mojados por goteras en el techo de la bodega.",
				},
			],
		},
		{
			name: "Inventario - ajuste por conteo (lleno)",
			url: "/inventory?view=movement",
			expand: true,
			steps: [
				{ click: "Registrar movimiento", pick: "first" },
				{ select: "select[name=type]", option: "Ajuste" },
				{ select: "select[name=materialId]", option: "Pala Cuadrada" },
				{ select: "select[name=warehouseId]", option: "Bodega Central" },
				{ fill: "input[name=physicalStock]", value: "5" },
				{ fill: "input[name=reference]", value: "Conteo físico octubre" },
				{
					fill: "textarea[name=notes]",
					value: "Una pala no apareció en el conteo mensual.",
				},
			],
		},
		{ name: "Inventario - catálogo", url: "/inventory?view=catalog" },
		{
			name: "Inventario - nuevo recurso (lleno)",
			url: "/inventory?view=catalog",
			expand: true,
			steps: [
				{ click: "Nuevo recurso", pick: "first" },
				{ click: "Herramienta" },
				{ fill: "input[name=name]", value: "Rotomartillo SDS Plus" },
				{
					fill: "input[name=specification]",
					value: "800 W, con maletín y brocas",
				},
				{ fill: "input[name=brand]", value: "Bosch" },
				{ fill: "input[name=unit]", value: "unidad" },
				{ fill: "input[name=unitCost]", value: "1850" },
				{ fill: "input[name=minimumStock]", value: "1" },
			],
		},
		{
			name: "Inventario - nueva bodega",
			url: "/inventory?view=catalog",
			expand: true,
			steps: [{ click: "Nueva bodega", pick: "first" }],
		},

		// --------------------------------------------------- Requerimientos
		{ name: "Requerimientos - lista", url: "/requisitions" },
		{
			name: "Requerimientos - nueva solicitud (vacía)",
			url: "/requisitions?new=1",
			expand: true,
			fullPage: true,
		},
		{
			name: "Requerimientos - nueva solicitud (llena)",
			url: "/requisitions?new=1",
			expand: true,
			fullPage: true,
			steps: [
				{ labelSelect: "Proyecto de destino", option: "Los Álamos" },
				{ labelSelect: "Bodega de recepción", option: "Bodega Central" },
				{
					label: "Motivo o frente de trabajo",
					value: "Block para muros del segundo nivel",
				},
				{ labelSelect: "Prioridad", option: "Alta" },
				{ label: "Necesario para", value: "2026-10-26" },
				{ labelSelect: "Recurso del catálogo", option: "Block de Concreto" },
				{ label: "Cantidad", value: "800" },
				{ labelSelect: "Control presupuestario", option: "Block de concreto" },
				{
					labelSelect: "Actividad del cronograma",
					option: "Levantado de muros",
				},
				{ label: "Nota del renglón", value: "Entregar en dos viajes" },
			],
		},
		{
			name: "Requerimientos - vincular recurso al catálogo",
			url: "/requisitions",
			expand: true,
			steps: [{ click: "Vincular recurso" }],
		},

		// ---------------------------------------------------------- Compras
		{ name: "Compras - órdenes", url: "/purchases" },
		{ name: "Compras - por comprar", url: "/purchases?view=requisitions" },
		{
			name: "Compras - comprar requerimiento (lleno)",
			url: "/purchases?view=requisitions",
			expand: true,
			steps: [
				{ click: "Iniciar compra" },
				{ fill: "input[name=expectedDate]", value: "2026-10-30" },
				{ click: "Elegir proveedor" },
				{ click: "Ferretería El Constructor Chapín" },
				{ label: "Costo unitario", value: "379" },
				{
					fill: "textarea[name=notes]",
					value: "Entregar en la obra de Villa Nueva.",
				},
			],
		},
		{
			name: "Compras - compra directa (vacía)",
			url: "/purchases",
			expand: true,
			steps: directPurchaseStart,
		},
		{
			name: "Compras - compra directa elegir proveedor",
			url: "/purchases",
			steps: [...directPurchaseStart, { click: "Elegir proveedor" }],
		},
		{
			name: "Compras - compra directa elegir artículos",
			url: "/purchases",
			steps: directPurchasePicker,
		},
		{
			name: "Compras - compra directa (llena)",
			url: "/purchases",
			expand: true,
			steps: [
				...directPurchasePicker,
				{ button: "Agregar" },
				{
					fillEach: "input[type=number]:not([name])",
					values: ["200", "81", "1500", "5.15", "10", "205"],
				},
				{
					fill: "textarea[name=notes]",
					value: "Entrega en Bodega Central, de 7:00 a 15:00.",
				},
			],
		},
		{
			name: "Compras - registrar recepción (lleno)",
			url: "/purchases",
			expand: true,
			steps: [
				{ click: "Registrar recepción" },
				{ fill: "input[name=receivedDate]", value: "2026-10-22" },
				{ fill: "input[name=reference]", value: "Envío ET-4471" },
				{ label: "Esta entrega", value: "4", nth: 0 },
				{ label: "Esta entrega", value: "48", nth: 1 },
				{
					fill: "textarea[name=notes]",
					value: "Llegó completo y en buen estado.",
				},
			],
		},
		{
			name: "Compras - registrar factura (lleno)",
			url: "/purchases",
			expand: true,
			steps: [
				{ click: "Registrar factura" },
				{ fill: "input[name=documentNumber]", value: "FACE-7A10-3321" },
				{ fill: "input[name=expenseDate]", value: "2026-10-22" },
				{ fill: "input[name=subtotal]", value: "21780" },
				pdf("factura-electrototal-3321.pdf"),
			],
		},
		{
			name: "Compras - anular orden",
			url: "/purchases",
			expand: true,
			steps: [{ click: "Anular orden" }],
		},
		{ name: "Compras - facturas", url: "/purchases?view=invoices" },
		{ name: "Compras - anuladas", url: "/purchases?view=canceled" },
		{ name: "Compras - proveedores", url: "/purchases?view=suppliers" },
		{
			name: "Compras - nuevo proveedor (lleno)",
			url: "/purchases?view=suppliers",
			expand: true,
			steps: [
				{ click: "Nuevo proveedor" },
				{
					fill: "input[name=businessName]",
					value: "Pinturas y Recubrimientos del Norte, S.A.",
				},
				{ fill: "input[name=taxId]", value: "7781205-4" },
				{ fill: "input[name=contactName]", value: "Silvia Ortiz" },
				{
					fill: "input[name=email]",
					value: "ventas@pinturasnorte-ejemplo.com",
				},
				{ fill: "input[name=phone]", value: "24418870" },
				{
					fill: "textarea[name=address]",
					value: "Avenida Bolívar 32-15, zona 3",
				},
			],
		},
		{
			name: "Compras - reporte",
			url: "/purchases/report?from=2026-07-01&to=2026-10-17",
			fullPage: true,
		},

		// ---------------------------------------------------------- Finanzas
		{ name: "Finanzas - resumen", url: fin },
		{ name: "Finanzas - gastos", url: `${fin}&tab=gastos` },
		{ name: "Finanzas - cuentas por pagar", url: `${fin}&tab=proveedores` },
		{ name: "Finanzas - abonos del cliente", url: `${fin}&tab=abonos` },
		{
			name: "Finanzas - gasto del proyecto (vacío)",
			url: fin,
			expand: true,
			steps: [{ click: "Gasto del proyecto", pick: "first" }],
		},
		{
			name: "Finanzas - gasto elegir tipo",
			url: fin,
			steps: [...expenseBase, { click: "Elegir tipo" }],
		},
		{
			name: "Finanzas - gasto del proyecto (lleno)",
			url: fin,
			expand: true,
			steps: [
				...expenseBase,
				{ click: "Elegir tipo" },
				{ click: "Mano de obra" },
				{ click: "Elegir medio" },
				{ click: "Efectivo" },
				{ click: "Sin renglón" },
				{ click: "Levantado de muros" },
			],
		},
		{
			name: "Finanzas - gasto material comprado en obra (lleno)",
			url: fin,
			expand: true,
			steps: [
				{ click: "Gasto del proyecto", pick: "first" },
				{
					fill: "input[name=description]",
					value: "Clavos y alambre para formaleta",
				},
				{ fill: "input[name=subtotal]", value: "640" },
				{ fill: "input[name=expenseDate]", value: "2026-10-16" },
				{ click: "Elegir tipo" },
				{ click: "Material comprado en obra" },
				{ openDetails: true },
				{ fill: "input[name=vendor]", value: "Ferretería La Económica" },
				{ fill: "input[name=documentNumber]", value: "A-4699" },
				pdf("factura-A-4699.pdf"),
			],
		},
		{
			name: "Finanzas - abono del cliente (vacío)",
			url: fin,
			expand: true,
			steps: [{ click: "Abono del cliente", pick: "first" }],
		},
		{
			name: "Finanzas - abono del cliente (lleno)",
			url: fin,
			expand: true,
			steps: [
				{ click: "Abono del cliente", pick: "first" },
				{ fill: "input[name=amount]", value: "45000" },
				{ fill: "input[name=paymentDate]", value: "2026-10-16" },
				{ openDetails: true },
				{ fill: "input[name=reference]", value: "BAM-TRF-640118" },
				{ fill: "input[name=concept]", value: "Cuarto pago: avance de losa" },
				{
					fill: "textarea[name=observations]",
					value: "Transferencia recibida del Sr. Ricardo Herrera.",
				},
			],
		},
		{
			name: "Finanzas - abono elegir renglón",
			url: fin,
			steps: [
				{ click: "Abono del cliente", pick: "first" },
				{ click: "Abono general" },
			],
		},
		{
			name: "Finanzas - pago a proveedor (lleno)",
			url: `${fin}&tab=proveedores`,
			expand: true,
			steps: [
				{ click: "Registrar pago", pick: "first" },
				{ fill: "input[name=amount]", value: "2000" },
				{ fill: "input[name=paymentDate]", value: "2026-10-16" },
				{ select: "select[name=method]", option: "Transferencia" },
				{ fill: "input[name=reference]", value: "BI-TRF-833902" },
				{ fill: "textarea[name=notes]", value: "Abono parcial a la planilla." },
			],
		},
		{
			name: "Finanzas - adjuntar comprobante",
			url: `${fin}&tab=gastos`,
			expand: true,
			steps: [{ click: "Adjuntar comprobante", pick: "first" }],
		},
		{
			name: "Finanzas - estado de cuenta PDF",
			url: `/finances/print?projectId=${projectId}`,
			fullPage: true,
		},

		// ----------------------------------------------- Documentos y reportes
		{ name: "Documentos - por proyecto", url: "/documents" },
		{ name: "Documentos - recientes", url: "/documents?tab=recientes" },
		{ name: "Documentos - todos", url: "/documents?tab=todos" },
		{ name: "Reportes - avance diario", url: "/reports" },
		{ name: "Reportes - informes cargados", url: "/reports?tab=reportes" },

		// ---------------------------------------------------- Administración
		{ name: "Usuarios - lista", url: "/users", expect: "Carlos" },
		{
			name: "Usuarios - nuevo usuario (lleno)",
			url: "/users",
			expand: true,
			steps: [
				{ click: "Nuevo usuario", pick: "first" },
				{ fill: "input[name=name]", value: "Pedro Gómez Tzul" },
				{ fill: "input[name=email]", value: "pgomez" },
				{ fill: "input[name=phone]", value: "50128890" },
				{ click: "Supervisor o encargado de obra" },
				{ fill: "input[name=password]", value: "ObraHM2026!" },
			],
		},
		{
			name: "Usuarios - administrar usuario",
			url: "/users",
			expand: true,
			steps: [{ click: "Administrar" }],
		},
		{ name: "Seguridad de la cuenta", url: "/account/security" },
		{ name: "Sitio web - inicio", url: "/website" },
		{
			name: "Sitio web - servicios",
			url: "/website?tab=servicios",
			fullPage: true,
		},
		{
			name: "Sitio web - galería",
			url: "/website?tab=galeria",
			fullPage: true,
		},
		{
			name: "Sitio web - solicitudes",
			url: "/website?tab=solicitudes",
			fullPage: true,
		},

		// -------------------------------------------------- Portal del cliente
		{
			name: "Portal del cliente - resumen",
			url: `/portal/${portalToken}`,
			session: false,
			expect: "Los Álamos",
		},
		{
			name: "Portal del cliente - presupuesto",
			url: `/portal/${portalToken}?tab=budget`,
			session: false,
		},
		{
			name: "Portal del cliente - cronograma",
			url: `/portal/${portalToken}?tab=schedule`,
			session: false,
		},
		{
			name: "Portal del cliente - avance diario",
			url: `/portal/${portalToken}?tab=progress`,
			session: false,
		},
		{
			name: "Portal del cliente - documentos",
			url: `/portal/${portalToken}?tab=documents`,
			session: false,
		},

		// ------------------------------------------------------ Sitio público
		{ name: "Sitio público - inicio", url: "/", session: false },
		{ name: "Sitio público - servicios", url: "/servicios", session: false },
		{ name: "Sitio público - proyectos", url: "/proyectos", session: false },
		{ name: "Sitio público - contacto", url: "/contacto", session: false },
		{
			name: "Sitio público - formulario de contacto",
			url: "/contacto",
			session: false,
			fullPage: true,
		},

		// -------------------------------------------------------------- Móvil
		{
			name: "Móvil - inicio de sesión",
			url: "/login",
			session: false,
			mobile: true,
		},
		{ name: "Móvil - panel principal", url: "/dashboard", mobile: true },
		{ name: "Móvil - avance diario", url: `${p}/progress`, mobile: true },
		{
			name: "Móvil - registrar jornada",
			url: `${p}/progress?tab=registro`,
			mobile: true,
		},
		{
			name: "Móvil - portal del cliente",
			url: `/portal/${portalToken}`,
			session: false,
			mobile: true,
		},
		{ name: "Móvil - sitio público", url: "/", session: false, mobile: true },
	];
	return shots;
}

async function main() {
	const { projectId, reportId, portalToken } = await resolveIds();
	const shots = buildShots(projectId, reportId, portalToken);
	// Para repetir solo algunas capturas: MANUAL_ONLY="compras,finanzas".
	const only = process.env.MANUAL_ONLY?.split(",").map((value) => slug(value));

	if (!only) await rm(OUTPUT_DIR, { recursive: true, force: true });
	await mkdir(OUTPUT_DIR, { recursive: true });

	const browser: Browser = await chromium.launch();
	const contextOptions = (mobile: boolean) => ({
		viewport: mobile ? MOBILE : DESKTOP,
		deviceScaleFactor: 1,
		isMobile: mobile,
		hasTouch: mobile,
		locale: "es-GT",
		timezoneId: "America/Guatemala",
		reducedMotion: "reduce" as const,
		serviceWorkers: "block" as const,
	});
	const contexts = {
		desktopGuest: await browser.newContext(contextOptions(false)),
		desktopUser: await browser.newContext(contextOptions(false)),
		mobileGuest: await browser.newContext(contextOptions(true)),
		mobileUser: await browser.newContext(contextOptions(true)),
	};
	await login(contexts.desktopUser);
	await login(contexts.mobileUser);

	const results: Result[] = [];
	for (const [index, shot] of shots.entries()) {
		const file = `${String(index + 1).padStart(3, "0")}-${slug(shot.name)}.png`;
		if (only && !only.some((value) => file.includes(value))) continue;
		const context = shot.mobile
			? shot.session === false
				? contexts.mobileGuest
				: contexts.mobileUser
			: shot.session === false
				? contexts.desktopGuest
				: contexts.desktopUser;
		const page = await context.newPage();
		const result = await capture(page, shot, file);
		await page.close();
		results.push(result);
		console.info(
			`${result.status === "ok" ? "✔" : "✘"} ${file}${result.detail ? ` — ${result.status}: ${result.detail}` : ""}`,
		);
	}

	await browser.close();
	await writeFile(
		path.join(OUTPUT_DIR, only ? "resultado-parcial.json" : "resultado.json"),
		`${JSON.stringify(results, null, 2)}\n`,
	);
	const problems = results.filter((result) => result.status !== "ok");
	console.info(
		`\n${results.length} capturas, ${problems.length} con problemas.`,
	);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
