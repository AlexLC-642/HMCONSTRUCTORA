/**
 * Datos ficticios (pero realistas) para generar las capturas del Manual del
 * Usuario. Es independiente de prisma/seed.ts y debe correrse DESPUÉS de él:
 *
 *   npm run prisma:seed
 *   npx tsx prisma/seed-manual.ts
 *
 * Todo se crea a través de los servicios reales de cada módulo (no con
 * inserts directos), para que numeraciones, totales del presupuesto, stock,
 * validaciones y bitácora salgan exactamente como en el uso normal. Lo único
 * que se escribe directo son las fechas de creación (createdAt y similares),
 * para que el historial se vea repartido en el tiempo y no todo "de hoy".
 *
 * Es aditivo: no borra nada. Si detecta que ya se ejecutó, se detiene.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import {
	approveBudgetVersion,
	createInitialBudget,
} from "../src/modules/budgets/application/service";
import { createPortalShare } from "../src/modules/client-portal/application/service";
import {
	createProjectDocument,
	ensureDocumentCategories,
} from "../src/modules/documents/application/service";
import {
	createClientPayment,
	createExpense,
	createPurchaseInvoice,
	recordSupplierPayment,
} from "../src/modules/finances/application/service";
import {
	createInventoryMaterial,
	createWarehouse,
	recordStockMovement,
} from "../src/modules/inventory/application/service";
import { saveDailyReportMediaFiles } from "../src/modules/progress/application/media";
import {
	approveDailyReport,
	publishDailyReport,
	saveDailyReport,
	submitDailyReport,
} from "../src/modules/progress/application/service";
import { createProject } from "../src/modules/projects/application/service";
import {
	cancelPurchaseOrder,
	createPurchaseOrder,
	issuePurchaseOrder,
	receivePurchaseOrder,
	saveSupplier,
} from "../src/modules/purchases/application/service";
import {
	approveRequisition,
	createRequisition,
	deliverRequisition,
	fulfillRequisitionFromStock,
	rejectRequisition,
} from "../src/modules/requisitions/application/service";
import { saveSchedule } from "../src/modules/schedules/application/service";
import { createInternalUser } from "../src/modules/users/application/service";
import {
	submitWebsiteInquiry,
	updateWebsiteInquiryStatus,
} from "../src/modules/website/application/service";
import { prisma } from "../src/shared/lib/prisma";

const TODAY = "2026-10-17";
const MANUAL_PASSWORD = process.env.MANUAL_USERS_PASSWORD ?? "ObraHM2026!";
const imagesDir = path.join(process.cwd(), "public", "site", "images");

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function d(value: string) {
	return new Date(`${value}T00:00:00.000Z`);
}

/** Fecha con hora local de Guatemala (UTC-6) para que los listados ordenen bien. */
function at(value: string, hour = 9) {
	return new Date(`${value}T${String(hour + 6).padStart(2, "0")}:00:00.000Z`);
}

function addDays(value: string, days: number) {
	const date = d(value);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function log(message: string) {
	console.info(`• ${message}`);
}

function escapePdf(text: string) {
	return text
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[()\\]/g, (char) => `\\${char}`);
}

/** PDF de una página, válido, con título y líneas de texto (sin dependencias). */
function makePdf(title: string, lines: string[]) {
	const textOps = [
		"BT /F2 16 Tf 56 780 Td",
		`(${escapePdf("HM CONSTRUCTORA")}) Tj`,
		"0 -26 Td /F2 13 Tf",
		`(${escapePdf(title)}) Tj`,
		"/F1 10 Tf",
		...lines.flatMap((line) => ["0 -18 Td", `(${escapePdf(line)}) Tj`]),
		"ET",
		"0.6 w 56 740 m 540 740 l S",
	].join("\n");
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
		`<< /Length ${Buffer.byteLength(textOps)} >>\nstream\n${textOps}\nendstream`,
	];
	let body = "%PDF-1.4\n";
	const offsets: number[] = [];
	objects.forEach((object, index) => {
		offsets.push(Buffer.byteLength(body));
		body += `${index + 1} 0 obj\n${object}\nendobj\n`;
	});
	const xrefOffset = Buffer.byteLength(body);
	body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (const offset of offsets) {
		body += `${String(offset).padStart(10, "0")} 00000 n \n`;
	}
	body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
	return Buffer.from(body, "latin1");
}

function pdfFile(name: string, title: string, lines: string[]) {
	return new File([makePdf(title, lines)], name, { type: "application/pdf" });
}

async function imageFile(source: string, name: string) {
	const buffer = await readFile(path.join(imagesDir, source));
	return new File([buffer], name, { type: "image/jpeg" });
}

// ---------------------------------------------------------------------------
// Presupuestos (renglones y partidas)
// ---------------------------------------------------------------------------

type Line = {
	type: "MATERIAL" | "LABOR" | "OTHER";
	description: string;
	quantity: string;
	unit: string;
	unitPrice: string;
};

const M = (
	description: string,
	quantity: number,
	unit: string,
	unitPrice: number,
): Line => ({
	type: "MATERIAL",
	description,
	quantity: String(quantity),
	unit,
	unitPrice: String(unitPrice),
});
const L = (
	description: string,
	quantity: number,
	unit: string,
	unitPrice: number,
): Line => ({
	type: "LABOR",
	description,
	quantity: String(quantity),
	unit,
	unitPrice: String(unitPrice),
});
const O = (
	description: string,
	quantity: number,
	unit: string,
	unitPrice: number,
): Line => ({
	type: "OTHER",
	description,
	quantity: String(quantity),
	unit,
	unitPrice: String(unitPrice),
});

type SectionPlan = {
	name: string;
	category: string;
	lines: Line[];
	plannedStart: string;
	plannedEnd: string;
	labor: string;
	assignee: string;
	/** Avance (%) que debe quedar aprobado por los informes diarios. */
	target: number;
};

type ProjectPlan = {
	key: string;
	name: string;
	description: string;
	location: string;
	client: { name: string; contactName: string; email: string; phone: string };
	startDate: string;
	expectedEndDate: string;
	siteManagerCost: number;
	notes: string;
	sections: SectionPlan[];
	reportDates: string[];
	siteManager: string;
	reportLocation: string;
};

const CEMENTO = "Cemento UGC 4000 PSI";
const HIERRO_38 = 'Hierro corrugado 3/8" grado 40';
const HIERRO_14 = 'Hierro corrugado 1/4" grado 40';
const ARENA = "Arena lavada para concreto";
const PIEDRIN = 'Piedrín 1/2"';
const ALAMBRE = "Alambre de amarre";
const BLOCK = "Block de concreto 15x20x40";
const PVC_12 = 'Tubo PVC 1/2" 315 PSI';
const PINTURA = "Pintura látex interior";
const PEGAMIX = "Pegamix para cerámica";

function weekly(from: string, to: string, stepDays = 7) {
	const dates: string[] = [];
	for (
		let current = from;
		current <= to;
		current = addDays(current, stepDays)
	) {
		dates.push(current);
	}
	return dates;
}

const projects: ProjectPlan[] = [
	{
		key: "alamos",
		name: "Construcción de vivienda unifamiliar Residencial Los Álamos",
		description:
			"Vivienda de dos niveles, 180 m² de construcción: sala, comedor, cocina, 3 dormitorios, 2.5 baños y garaje para dos vehículos.",
		location: "Residencial Los Álamos, lote 14, San Cristóbal, Mixco",
		client: {
			name: "Familia Herrera Ochoa",
			contactName: "Ricardo Herrera",
			email: "ricardo.herrera@correo-ejemplo.com",
			phone: "55123478",
		},
		startDate: "2026-07-06",
		expectedEndDate: "2026-12-18",
		siteManagerCost: 18000,
		notes: "Presupuesto según planos arquitectónicos aprobados, revisión B.",
		siteManager: "Luis Fernando Ajú",
		reportLocation: "Lote 14, Residencial Los Álamos",
		reportDates: weekly("2026-07-10", "2026-10-16"),
		sections: [
			{
				name: "Trabajos preliminares",
				category: "Preliminares",
				plannedStart: "2026-07-06",
				plannedEnd: "2026-07-17",
				labor: "Cuadrilla de albañilería",
				assignee: "Luis Fernando Ajú",
				target: 100,
				lines: [
					M("Madera rústica para trazo", 120, "pie tablar", 6.5),
					M("Cal hidratada", 10, "saco", 45),
					L("Limpieza y chapeo del terreno", 220, "m²", 6),
					L("Trazo y nivelación", 180, "m²", 8),
					O("Bodega y servicios provisionales", 1, "global", 6500),
				],
			},
			{
				name: "Cimentación",
				category: "Obra gris",
				plannedStart: "2026-07-20",
				plannedEnd: "2026-08-21",
				labor: "Cuadrilla de albañilería",
				assignee: "Luis Fernando Ajú",
				target: 100,
				lines: [
					M(CEMENTO, 85, "saco", 82),
					M(HIERRO_38, 160, "unidad", 38),
					M(HIERRO_14, 120, "unidad", 18),
					M(ARENA, 8, "m³", 210),
					M(PIEDRIN, 7, "m³", 320),
					M(ALAMBRE, 60, "lb", 8.5),
					L("Excavación de zapatas y cimiento corrido", 42, "m³", 95),
					L("Armado y fundición de zapatas", 1, "global", 18500),
				],
			},
			{
				name: "Levantado de muros",
				category: "Obra gris",
				plannedStart: "2026-08-17",
				plannedEnd: "2026-10-09",
				labor: "Cuadrilla de albañilería",
				assignee: "Luis Fernando Ajú",
				target: 85,
				lines: [
					M(BLOCK, 2600, "unidad", 5.25),
					M(CEMENTO, 70, "saco", 82),
					M(HIERRO_38, 140, "unidad", 38),
					M(ARENA, 10, "m³", 210),
					L("Levantado de block", 310, "m²", 65),
					L("Columnas y soleras", 1, "global", 24000),
				],
			},
			{
				name: "Losa de entrepiso y techo",
				category: "Estructura",
				plannedStart: "2026-09-21",
				plannedEnd: "2026-10-30",
				labor: "Cuadrilla de estructura",
				assignee: "Ing. Carlos Méndez",
				target: 40,
				lines: [
					M("Vigueta y bovedilla", 95, "m²", 285),
					M(CEMENTO, 110, "saco", 82),
					M(PIEDRIN, 12, "m³", 320),
					L("Armado y fundición de losa", 95, "m²", 120),
					O("Alquiler de puntales y formaleta", 1, "global", 9500),
				],
			},
			{
				name: "Instalaciones hidrosanitarias",
				category: "Instalaciones",
				plannedStart: "2026-09-07",
				plannedEnd: "2026-11-13",
				labor: "Fontanero",
				assignee: "Subcontrato de fontanería",
				target: 30,
				lines: [
					M(PVC_12, 45, "unidad", 28),
					M('Tubo PVC 4" para drenaje', 18, "unidad", 165),
					M("Accesorios hidráulicos", 1, "lote", 4800),
					L("Instalación hidrosanitaria", 1, "global", 16500),
				],
			},
			{
				name: "Instalaciones eléctricas",
				category: "Instalaciones",
				plannedStart: "2026-09-28",
				plannedEnd: "2026-11-20",
				labor: "Electricista",
				assignee: "Subcontrato eléctrico",
				target: 15,
				lines: [
					M("Cable THHN calibre 12", 6, "rollo", 680),
					M('Poliducto 3/4"', 8, "rollo", 210),
					M("Tablero de 12 polos con flipones", 1, "unidad", 2350),
					L("Instalación eléctrica", 1, "global", 14800),
				],
			},
			{
				name: "Acabados",
				category: "Acabados",
				plannedStart: "2026-11-02",
				plannedEnd: "2026-12-18",
				labor: "Cuadrilla de acabados",
				assignee: "Luis Fernando Ajú",
				target: 0,
				lines: [
					M("Cerámica de piso 45x45 cm", 165, "m²", 95),
					M(PINTURA, 28, "galón", 145),
					M(PEGAMIX, 70, "saco", 58),
					L("Repello y cernido", 520, "m²", 38),
					L("Colocación de piso", 165, "m²", 55),
					L("Pintura de muros", 520, "m²", 14),
				],
			},
		],
	},
	{
		key: "torre",
		name: "Remodelación de oficinas Edificio Torre Reforma, nivel 8",
		description:
			"Readecuación de 260 m² de oficinas: nuevas divisiones en tablayeso, cielo falso, iluminación LED, red de datos, porcelanato y baños.",
		location: "Avenida Reforma 9-55, zona 10, Guatemala",
		client: {
			name: "Grupo Financiero Altamira, S.A.",
			contactName: "Licda. Gabriela Solís",
			email: "gsolis@altamira-ejemplo.com.gt",
			phone: "23856100",
		},
		startDate: "2026-08-17",
		expectedEndDate: "2026-11-27",
		siteManagerCost: 12000,
		notes: "Trabajo nocturno y fines de semana por reglamento del edificio.",
		siteManager: "Ing. Carlos Méndez",
		reportLocation: "Nivel 8, Torre Reforma",
		reportDates: weekly("2026-08-21", "2026-10-16"),
		sections: [
			{
				name: "Demoliciones y desmontajes",
				category: "Preliminares",
				plannedStart: "2026-08-17",
				plannedEnd: "2026-08-28",
				labor: "Cuadrilla de demolición",
				assignee: "Ing. Carlos Méndez",
				target: 100,
				lines: [
					L("Desmontaje de cielo falso existente", 240, "m²", 12),
					L("Demolición de muros de tabique", 65, "m²", 45),
					O("Retiro de ripio en camión", 6, "unidad", 850),
				],
			},
			{
				name: "Muros de tablayeso",
				category: "Obra seca",
				plannedStart: "2026-08-31",
				plannedEnd: "2026-10-09",
				labor: "Cuadrilla de tablayeso",
				assignee: "Ing. Carlos Méndez",
				target: 70,
				lines: [
					M('Panel de tablayeso 1/2"', 140, "plancha", 78),
					M(
						"Perfil metálico para tablayeso (poste y canal)",
						260,
						"unidad",
						32,
					),
					M("Masilla y cinta para juntas", 1, "lote", 3200),
					L("Instalación de tablayeso", 180, "m²", 70),
				],
			},
			{
				name: "Cielo falso",
				category: "Obra seca",
				plannedStart: "2026-09-21",
				plannedEnd: "2026-10-23",
				labor: "Cuadrilla de tablayeso",
				assignee: "Ing. Carlos Méndez",
				target: 45,
				lines: [
					M("Cielo falso de fibra mineral 2x2", 240, "m²", 88),
					L("Instalación de cielo falso", 240, "m²", 35),
				],
			},
			{
				name: "Instalaciones eléctricas y de datos",
				category: "Instalaciones",
				plannedStart: "2026-09-07",
				plannedEnd: "2026-11-06",
				labor: "Electricista",
				assignee: "Subcontrato eléctrico",
				target: 50,
				lines: [
					M("Cable THHN calibre 12", 8, "rollo", 680),
					M("Lámpara LED de panel 2x2", 48, "unidad", 340),
					M("Cable UTP categoría 6", 4, "rollo", 1450),
					L("Instalación eléctrica y de datos", 1, "global", 26000),
				],
			},
			{
				name: "Pisos de porcelanato",
				category: "Acabados",
				plannedStart: "2026-10-05",
				plannedEnd: "2026-11-13",
				labor: "Cuadrilla de acabados",
				assignee: "Ing. Carlos Méndez",
				target: 20,
				lines: [
					M("Porcelanato 60x60 cm", 260, "m²", 165),
					M(PEGAMIX, 120, "saco", 58),
					L("Colocación de porcelanato", 260, "m²", 60),
				],
			},
			{
				name: "Pintura y acabados",
				category: "Acabados",
				plannedStart: "2026-11-02",
				plannedEnd: "2026-11-27",
				labor: "Cuadrilla de acabados",
				assignee: "Ing. Carlos Méndez",
				target: 0,
				lines: [
					M(PINTURA, 35, "galón", 145),
					L("Pintura de muros", 620, "m²", 14),
				],
			},
			{
				name: "Baños",
				category: "Instalaciones",
				plannedStart: "2026-09-28",
				plannedEnd: "2026-11-20",
				labor: "Fontanero",
				assignee: "Subcontrato de fontanería",
				target: 25,
				lines: [
					M("Inodoro con fluxómetro", 6, "unidad", 2850),
					M("Lavamanos de sobreponer", 6, "unidad", 950),
					L("Instalación de artefactos sanitarios", 1, "global", 9800),
				],
			},
		],
	},
	{
		key: "bodega",
		name: "Ampliación de bodega industrial Villa Nueva",
		description:
			"Ampliación de 900 m² de nave industrial con estructura metálica, cubierta de lámina troquelada y piso de concreto de 4000 PSI.",
		location: "Km 17.5 carretera al Pacífico, Villa Nueva",
		client: {
			name: "Logística Centroamericana, S.A.",
			contactName: "Ing. Pablo Recinos",
			email: "precinos@logicentro-ejemplo.com",
			phone: "66309215",
		},
		startDate: "2026-09-28",
		expectedEndDate: "2027-02-26",
		siteManagerCost: 24000,
		notes: "Incluye estudio de suelos entregado por el cliente.",
		siteManager: "Luis Fernando Ajú",
		reportLocation: "Km 17.5, Villa Nueva",
		reportDates: ["2026-10-02", "2026-10-09", "2026-10-16"],
		sections: [
			{
				name: "Preliminares y movimiento de tierras",
				category: "Preliminares",
				plannedStart: "2026-09-28",
				plannedEnd: "2026-10-16",
				labor: "Operador de maquinaria",
				assignee: "Luis Fernando Ajú",
				target: 100,
				lines: [
					L("Limpieza del terreno", 1200, "m²", 5),
					O("Corte y relleno con maquinaria", 650, "m³", 85),
					O("Compactación con equipo", 900, "m²", 18),
				],
			},
			{
				name: "Cimentación y zapatas",
				category: "Obra gris",
				plannedStart: "2026-10-12",
				plannedEnd: "2026-11-20",
				labor: "Cuadrilla de albañilería",
				assignee: "Luis Fernando Ajú",
				target: 20,
				lines: [
					M(CEMENTO, 260, "saco", 82),
					M('Hierro corrugado 1/2" grado 60', 380, "unidad", 72),
					M(PIEDRIN, 30, "m³", 320),
					M(ARENA, 22, "m³", 210),
					L("Zapatas y pedestales", 1, "global", 52000),
				],
			},
			{
				name: "Estructura metálica",
				category: "Estructura",
				plannedStart: "2026-11-16",
				plannedEnd: "2027-01-08",
				labor: "Cuadrilla de soldadura",
				assignee: "Subcontrato de estructura",
				target: 0,
				lines: [
					M("Columna de acero W8x18", 18, "unidad", 6400),
					M('Costanera tipo C de 6"', 160, "unidad", 310),
					L("Montaje de estructura", 1, "global", 68000),
				],
			},
			{
				name: "Cubierta de lámina",
				category: "Estructura",
				plannedStart: "2027-01-04",
				plannedEnd: "2027-01-29",
				labor: "Cuadrilla de soldadura",
				assignee: "Subcontrato de estructura",
				target: 0,
				lines: [
					M("Lámina troquelada calibre 26", 850, "m²", 92),
					L("Instalación de cubierta", 850, "m²", 22),
				],
			},
			{
				name: "Piso industrial",
				category: "Obra gris",
				plannedStart: "2027-01-25",
				plannedEnd: "2027-02-19",
				labor: "Cuadrilla de albañilería",
				assignee: "Luis Fernando Ajú",
				target: 0,
				lines: [
					M("Concreto premezclado 4000 PSI", 110, "m³", 1180),
					L("Fundición y acabado de piso", 900, "m²", 48),
				],
			},
			{
				name: "Instalaciones eléctricas",
				category: "Instalaciones",
				plannedStart: "2027-01-18",
				plannedEnd: "2027-02-26",
				labor: "Electricista",
				assignee: "Subcontrato eléctrico",
				target: 0,
				lines: [
					M("Luminaria industrial LED 150 W", 30, "unidad", 1250),
					L("Instalación eléctrica industrial", 1, "global", 38000),
				],
			},
		],
	},
	{
		key: "vista",
		name: "Remodelación de cocina y baños Casa Vista Hermosa",
		description:
			"Remodelación completa de cocina (gabinetes, cubierta de granito) y dos baños, con nuevas instalaciones hidráulicas y eléctricas.",
		location: "Vista Hermosa II, zona 15, Guatemala",
		client: {
			name: "Ana Lucía Morales de Paz",
			contactName: "Ana Lucía Morales",
			email: "analucia.morales@correo-ejemplo.com",
			phone: "42187730",
		},
		startDate: "2026-05-04",
		expectedEndDate: "2026-07-24",
		siteManagerCost: 6000,
		notes: "Cliente aprobó gabinetes en melamina color roble.",
		siteManager: "Luis Fernando Ajú",
		reportLocation: "Vista Hermosa II, zona 15",
		reportDates: weekly("2026-05-08", "2026-07-24"),
		sections: [
			{
				name: "Demolición y retiro",
				category: "Preliminares",
				plannedStart: "2026-05-04",
				plannedEnd: "2026-05-15",
				labor: "Cuadrilla de demolición",
				assignee: "Luis Fernando Ajú",
				target: 100,
				lines: [
					L("Demolición de azulejo y gabinetes", 1, "global", 6500),
					O("Retiro de ripio en camión", 3, "unidad", 850),
				],
			},
			{
				name: "Instalaciones hidráulicas y eléctricas",
				category: "Instalaciones",
				plannedStart: "2026-05-18",
				plannedEnd: "2026-06-05",
				labor: "Fontanero",
				assignee: "Subcontrato de fontanería",
				target: 100,
				lines: [
					M("Tubería y accesorios", 1, "lote", 5200),
					L("Instalaciones hidráulicas y eléctricas", 1, "global", 9500),
				],
			},
			{
				name: "Gabinetes y cubierta",
				category: "Carpintería",
				plannedStart: "2026-06-08",
				plannedEnd: "2026-07-03",
				labor: "Carpintero",
				assignee: "Subcontrato de carpintería",
				target: 100,
				lines: [
					O("Gabinetes de cocina en melamina", 1, "global", 28500),
					M("Cubierta de granito", 6.5, "m²", 1650),
				],
			},
			{
				name: "Enchapes",
				category: "Acabados",
				plannedStart: "2026-06-15",
				plannedEnd: "2026-07-10",
				labor: "Cuadrilla de acabados",
				assignee: "Luis Fernando Ajú",
				target: 100,
				lines: [
					M("Azulejo para baño", 38, "m²", 120),
					M("Porcelanato para cocina", 22, "m²", 165),
					L("Colocación de enchapes", 60, "m²", 65),
				],
			},
			{
				name: "Pintura y limpieza final",
				category: "Acabados",
				plannedStart: "2026-07-06",
				plannedEnd: "2026-07-24",
				labor: "Cuadrilla de acabados",
				assignee: "Luis Fernando Ajú",
				target: 100,
				lines: [
					M(PINTURA, 8, "galón", 145),
					L("Pintura y limpieza final", 1, "global", 4800),
				],
			},
		],
	},
];

const weatherOptions = [
	"Soleado",
	"Nublado",
	"Lluvia por la tarde",
	"Parcialmente nublado",
	"Soleado",
];

function workDescription(section: SectionPlan, progress: number) {
	if (progress >= 100)
		return `Se concluyen los trabajos de ${section.name.toLowerCase()} y se limpia el área.`;
	const first =
		section.lines[0]?.description.toLowerCase() ?? section.name.toLowerCase();
	return `Avance en ${section.name.toLowerCase()}: ${first} y trabajos complementarios.`;
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

async function main() {
	const alreadySeeded = await prisma.project.findFirst({
		where: { name: projects[0].name },
		select: { id: true },
	});
	if (alreadySeeded) {
		console.info("Los datos del manual ya existen. No se hizo ningún cambio.");
		return;
	}

	const admin = await prisma.user.findFirst({
		where: { roles: { some: { role: { key: "superadministrador" } } } },
	});
	if (!admin) throw new Error("Corre primero `npm run prisma:seed`.");
	const adminCtx = { userId: admin.id };
	await ensureDocumentCategories();

	// ---------------------------------------------------------------- Usuarios
	const roles = await prisma.role.findMany();
	const roleId = (key: string) => {
		const role = roles.find((item) => item.key === key);
		if (!role) throw new Error(`No existe el rol ${key}`);
		return role.id;
	};
	const userDefs = [
		[
			"Ing. Carlos Méndez",
			"cmendez",
			"55018822",
			"gerente_proyecto",
			"ACTIVE",
			"2026-04-06",
		],
		[
			"Luis Fernando Ajú",
			"lfaju",
			"47720931",
			"supervisor_obra",
			"ACTIVE",
			"2026-04-13",
		],
		[
			"María José Castillo",
			"mjcastillo",
			"51449087",
			"contabilidad",
			"ACTIVE",
			"2026-04-06",
		],
		[
			"Andrea Morales",
			"amorales",
			"30128844",
			"compras",
			"ACTIVE",
			"2026-04-20",
		],
		["Jorge Pérez", "jperez", "58876102", "bodega", "ACTIVE", "2026-04-20"],
		[
			"Sofía Ramírez",
			"sramirez",
			"42230917",
			"usuario_consulta",
			"ACTIVE",
			"2026-06-01",
		],
		[
			"Marvin Xitumul",
			"mxitumul",
			"33901276",
			"contratista_interno",
			"INACTIVE",
			"2026-05-11",
		],
	] as const;
	const users: Record<string, string> = {};
	for (const [name, alias, phone, role, status, createdAt] of userDefs) {
		const user = await createInternalUser(
			{
				name,
				email: alias,
				phone,
				password: MANUAL_PASSWORD,
				status,
				roleIds: [roleId(role)],
			},
			{ userId: admin.id, roles: ["superadministrador"] },
		);
		await prisma.user.update({
			where: { id: user.id },
			data: { createdAt: at(createdAt) },
		});
		users[alias] = user.id;
	}
	const gerente = { userId: users.cmendez };
	const supervisor = { userId: users.lfaju };
	const conta = { userId: users.mjcastillo };
	const compras = { userId: users.amorales };
	const bodega = { userId: users.jperez };
	log("Usuarios con distintos roles");

	// -------------------------------------------- Proyectos, presupuesto y cronograma
	type CreatedProject = {
		plan: ProjectPlan;
		id: string;
		lineIdByDescription: Map<string, string>;
		sectionIdByName: Map<string, string>;
		grandTotal: Prisma.Decimal;
	};
	const created: Record<string, CreatedProject> = {};

	for (const plan of projects) {
		const project = await createProject(
			{
				name: plan.name,
				description: plan.description,
				clientName: plan.client.name,
				clientContactName: plan.client.contactName,
				clientEmail: plan.client.email,
				clientPhone: plan.client.phone,
				location: plan.location,
				startDate: plan.startDate,
				expectedEndDate: plan.expectedEndDate,
				responsibleId: users.cmendez,
				status: "PLANNING",
				currency: "GTQ",
				baseBudget: 0,
				memberIds: [users.cmendez, users.lfaju, users.mjcastillo],
				portalEnabled: true,
				observations: plan.notes,
			},
			adminCtx,
		);
		await prisma.project.update({
			where: { id: project.id },
			data: { createdAt: at(addDays(plan.startDate, -21)) },
		});

		const budget = await createInitialBudget(
			project.id,
			{
				title: "Presupuesto de obra",
				notes: plan.notes,
				executorName: "HM Constructora",
				siteManagerCost: String(plan.siteManagerCost),
				contingencyPercentage: "5",
				administrationPercentage: "12",
				profitPercentage: "10",
				vatPercentage: "12",
				financingPercentage: "0",
				sections: plan.sections.map((section, index) => ({
					code: String(index + 1),
					name: section.name,
					category: section.category,
					position: index + 1,
					lineItems: section.lines.map((line, lineIndex) => ({
						...line,
						position: lineIndex + 1,
						days: "",
					})),
				})),
			},
			gerente,
		);
		const version = budget.versions[0];
		await approveBudgetVersion(project.id, version.id, adminCtx);
		await prisma.budgetVersion.update({
			where: { id: version.id },
			data: { approvedAt: at(addDays(plan.startDate, -10), 11) },
		});

		// Ajusta el cronograma generado: fechas reales de programación,
		// dependencias, cuadrillas y responsables (el avance lo dan los informes).
		const schedule = await prisma.schedule.findFirstOrThrow({
			where: { projectId: project.id },
			include: { activities: { orderBy: { position: "asc" } } },
		});
		await saveSchedule(
			project.id,
			schedule.id,
			{
				title: schedule.title,
				sourceReference: schedule.sourceReference ?? "",
				notes: "Programación de obra acordada con el cliente.",
				activities: schedule.activities.map((activity, index) => {
					const section = plan.sections[index];
					return {
						id: activity.id,
						code: activity.code,
						description: activity.description,
						labor: section.labor,
						budgetSectionCode: activity.budgetSectionCode ?? "",
						budgetSectionName: activity.budgetSectionName ?? "",
						status: "PENDING",
						plannedStart: section.plannedStart,
						plannedEnd: section.plannedEnd,
						progress: "0",
						position: activity.position,
						notes: activity.notes ?? "",
						dependsOnCodes:
							index > 0 ? [schedule.activities[index - 1].code] : [],
						assigneeLabels: [section.assignee],
					};
				}),
			},
			gerente,
		);

		const approved = await prisma.budgetVersion.findUniqueOrThrow({
			where: { id: version.id },
			include: { sections: { include: { lineItems: true } } },
		});
		const lineIdByDescription = new Map<string, string>();
		const sectionIdByName = new Map<string, string>();
		for (const section of approved.sections) {
			sectionIdByName.set(section.name, section.id);
			for (const line of section.lineItems) {
				if (!lineIdByDescription.has(line.description))
					lineIdByDescription.set(line.description, line.id);
			}
		}
		created[plan.key] = {
			plan,
			id: project.id,
			lineIdByDescription,
			sectionIdByName,
			grandTotal: approved.grandTotal,
		};
	}
	log("4 proyectos con presupuesto aprobado y cronograma");

	const P = (key: string) => created[key];
	const line = (key: string, description: string) => {
		const id = P(key).lineIdByDescription.get(description);
		if (!id)
			throw new Error(`No se encontró la partida "${description}" en ${key}`);
		return id;
	};

	// --------------------------------------------------------------- Inventario
	const central = await createWarehouse(
		{
			name: "Bodega Central zona 12",
			location: "Calzada Atanasio Tzul 22-00, zona 12",
			notes: "Bodega principal de HM Constructora.",
		},
		bodega,
	);
	const villaNueva = await createWarehouse(
		{
			name: "Bodega de obra Villa Nueva",
			location: "Km 17.5 carretera al Pacífico",
			notes: "Bodega temporal para la ampliación industrial.",
		},
		bodega,
	);

	const materialDefs = [
		{
			name: CEMENTO,
			unit: "saco",
			unitCost: 82,
			minimumStock: 60,
			brand: "Cementos Progreso",
		},
		{
			name: HIERRO_38,
			unit: "unidad",
			unitCost: 38,
			minimumStock: 80,
			specification: "Varilla de 6 m",
		},
		{
			name: HIERRO_14,
			unit: "unidad",
			unitCost: 18,
			minimumStock: 60,
			specification: "Varilla de 6 m",
		},
		{ name: ARENA, unit: "m³", unitCost: 210, minimumStock: 5 },
		{ name: PIEDRIN, unit: "m³", unitCost: 320, minimumStock: 5 },
		{ name: ALAMBRE, unit: "lb", unitCost: 8.5, minimumStock: 40 },
		{ name: BLOCK, unit: "unidad", unitCost: 5.25, minimumStock: 500 },
		{ name: PVC_12, unit: "unidad", unitCost: 28, minimumStock: 30 },
		{
			name: PINTURA,
			unit: "galón",
			unitCost: 145,
			minimumStock: 10,
			brand: "Pinturas Sur",
		},
		{ name: PEGAMIX, unit: "saco", unitCost: 58, minimumStock: 20 },
		{
			name: "Carretilla de mano",
			unit: "unidad",
			unitCost: 650,
			minimumStock: 2,
			resourceType: "TOOL" as const,
			brand: "Truper",
		},
		{
			name: 'Pulidora angular 4 1/2"',
			unit: "unidad",
			unitCost: 950,
			minimumStock: 1,
			resourceType: "TOOL" as const,
			brand: "DeWalt",
			model: "DWE4120",
			trackIndividually: true,
		},
		{
			name: 'Nivel de aluminio 24"',
			unit: "unidad",
			unitCost: 175,
			minimumStock: 2,
			resourceType: "TOOL" as const,
			brand: "Stanley",
		},
		{
			name: "Pala cuadrada",
			unit: "unidad",
			unitCost: 85,
			minimumStock: 6,
			resourceType: "TOOL" as const,
			brand: "Truper",
		},
		{
			name: "Mezcladora de concreto de 1 saco",
			unit: "unidad",
			unitCost: 14500,
			resourceType: "EQUIPMENT" as const,
			brand: "Mipsa",
			model: "MC-1S",
			trackIndividually: true,
		},
		{
			name: "Vibrador para concreto",
			unit: "unidad",
			unitCost: 6800,
			resourceType: "EQUIPMENT" as const,
			brand: "Wacker Neuson",
			trackIndividually: true,
		},
		{
			name: "Andamio tubular (cuerpo)",
			unit: "unidad",
			unitCost: 1200,
			minimumStock: 10,
			resourceType: "EQUIPMENT" as const,
		},
	];
	const material: Record<string, string> = {};
	for (const def of materialDefs) {
		const created = await createInventoryMaterial(def, bodega);
		material[def.name] = created.id;
	}
	log("Catálogo de materiales, herramienta y maquinaria");

	// --------------------------------------------------------------- Proveedores
	const supplierDefs = [
		{
			businessName: "Cementos y Agregados del Sur, S.A.",
			tradeName: "AgreSur",
			taxId: "4587123-5",
			contactName: "Óscar Barrios",
			email: "ventas@agresur-ejemplo.com.gt",
			phone: "24785500",
			address: "Calzada Aguilar Batres 34-70, zona 11",
		},
		{
			businessName: "Ferretería El Constructor Chapín, S.A.",
			tradeName: "El Constructor Chapín",
			taxId: "6612098-2",
			contactName: "Rosa Cifuentes",
			email: "pedidos@constructorchapin-ejemplo.com",
			phone: "22301845",
			address: "6a. avenida 12-40, zona 1",
		},
		{
			businessName: "Maquinaria y Equipos de Guatemala, S.A.",
			tradeName: "MaqGuate",
			taxId: "3398410-K",
			contactName: "Ing. Héctor Lima",
			email: "info@maqguate-ejemplo.com",
			phone: "24409090",
			address: "Km 14.5 carretera a El Salvador",
		},
		{
			businessName: "Distribuidora de Tablayeso y Acabados, S.A.",
			tradeName: "Distablayeso",
			taxId: "8870451-3",
			contactName: "Karla Monzón",
			email: "kmonzon@distablayeso-ejemplo.com",
			phone: "23677412",
			address: "Boulevard Los Próceres 18-20, zona 10",
		},
		{
			businessName: "Iluminación y Electricidad Total, S.A.",
			tradeName: "ElectroTotal",
			taxId: "2290874-6",
			contactName: "Diego Alvarado",
			email: "ventas@electrototal-ejemplo.com",
			phone: "24221010",
			address: "Avenida Petapa 45-12, zona 12",
		},
	];
	const supplier: Record<string, string> = {};
	for (const def of supplierDefs) {
		const created = await saveSupplier(def, compras);
		supplier[def.tradeName] = created.id;
	}
	log("Proveedores");

	// ----------------------------------------------- Compras de la compañía (bodega)
	async function backdateOrder(
		orderId: string,
		issueDate: string,
		receivedDate?: string,
	) {
		await prisma.purchaseOrder.update({
			where: { id: orderId },
			data: {
				createdAt: at(issueDate, 8),
				issuedAt: at(issueDate, 10),
				...(receivedDate ? { receivedAt: at(receivedDate, 14) } : {}),
			},
		});
	}
	async function backdateMovements(
		where: Prisma.StockMovementWhereInput,
		date: string,
		hour = 14,
	) {
		await prisma.stockMovement.updateMany({
			where,
			data: { createdAt: at(date, hour) },
		});
	}
	async function receiveAll(
		orderId: string,
		date: string,
		reference: string,
		partial?: Record<string, number>,
	) {
		const order = await prisma.purchaseOrder.findUniqueOrThrow({
			where: { id: orderId },
			include: { items: true },
		});
		// En entregas de hasta 4 renglones: cada renglón son ~9 consultas dentro
		// de la transacción y una orden grande excede el límite de 5 s de Prisma.
		for (
			let start = 0, trip = 1;
			start < order.items.length;
			start += 4, trip += 1
		) {
			const batch = order.items.slice(start, start + 4);
			const tripReference =
				order.items.length > 4 ? `${reference}-${trip}` : reference;
			await receivePurchaseOrder(
				{
					purchaseOrderId: orderId,
					receivedDate: date,
					reference: tripReference,
					notes: `Recepción de ${order.number}`,
					items: batch.map((item) => ({
						purchaseOrderItemId: item.id,
						quantity:
							partial?.[item.materialId ?? ""] ?? item.quantity.toNumber(),
					})),
				},
				bodega,
			);
			await backdateMovements({ reference: tripReference }, date);
		}
		return order;
	}

	// Materiales de obra gris para bodega central.
	const stockItems: Array<[string, number, number]> = [
		[CEMENTO, 450, 81],
		[HIERRO_38, 420, 37.5],
		[HIERRO_14, 240, 17.75],
		[ARENA, 26, 205],
		[PIEDRIN, 22, 315],
		[ALAMBRE, 150, 8.25],
		[BLOCK, 3200, 5.15],
		[PVC_12, 60, 27.5],
		[PINTURA, 40, 142],
		[PEGAMIX, 100, 57],
	];
	const poMaterial = await createPurchaseOrder(
		{
			supplierId: supplier.AgreSur,
			warehouseId: central.id,
			issueDate: "2026-07-01",
			expectedDate: "2026-07-03",
			paymentType: "ON_DELIVERY",
			paymentDueDate: "",
			taxPercentage: 0,
			notes:
				"Abastecimiento de obra gris para los proyectos del segundo semestre. Precios con IVA incluido.",
			items: stockItems.map(([name, quantity, unitCost]) => ({
				materialId: material[name],
				quantity,
				unitCost,
			})),
		},
		compras,
	);
	await issuePurchaseOrder(poMaterial.id, compras);
	await receiveAll(poMaterial.id, "2026-07-03", "Envío AgreSur 18842");
	await backdateOrder(poMaterial.id, "2026-07-01", "2026-07-03");

	// Herramienta: recepción parcial (faltan pulidoras).
	const poTools = await createPurchaseOrder(
		{
			supplierId: supplier["El Constructor Chapín"],
			warehouseId: central.id,
			issueDate: "2026-07-02",
			expectedDate: "2026-07-08",
			paymentType: "IMMEDIATE",
			paymentDueDate: "",
			taxPercentage: 0,
			notes: "Herramienta para las cuadrillas nuevas.",
			items: [
				{
					materialId: material["Carretilla de mano"],
					quantity: 6,
					unitCost: 640,
				},
				{
					materialId: material['Pulidora angular 4 1/2"'],
					quantity: 4,
					unitCost: 945,
				},
				{
					materialId: material['Nivel de aluminio 24"'],
					quantity: 6,
					unitCost: 172,
				},
				{ materialId: material["Pala cuadrada"], quantity: 12, unitCost: 82 },
			],
		},
		compras,
	);
	await issuePurchaseOrder(poTools.id, compras);
	await receiveAll(poTools.id, "2026-07-08", "Envío ECCH-5531", {
		[material['Pulidora angular 4 1/2"']]: 2,
	});
	await backdateOrder(poTools.id, "2026-07-02");

	// Maquinaria.
	const poMachinery = await createPurchaseOrder(
		{
			supplierId: supplier.MaqGuate,
			warehouseId: central.id,
			issueDate: "2026-07-06",
			expectedDate: "2026-07-13",
			paymentType: "ON_DELIVERY",
			paymentDueDate: "",
			taxPercentage: 0,
			notes: "Equipo propio para reducir alquileres.",
			items: [
				{
					materialId: material["Mezcladora de concreto de 1 saco"],
					quantity: 1,
					unitCost: 14350,
				},
				{
					materialId: material["Vibrador para concreto"],
					quantity: 2,
					unitCost: 6750,
				},
				{
					materialId: material["Andamio tubular (cuerpo)"],
					quantity: 20,
					unitCost: 1180,
				},
			],
		},
		compras,
	);
	await issuePurchaseOrder(poMachinery.id, compras);
	await receiveAll(poMachinery.id, "2026-07-13", "Guía MQG-0912");
	await backdateOrder(poMachinery.id, "2026-07-06", "2026-07-13");

	// Orden anulada (queda en la pestaña Anuladas).
	const poCanceled = await createPurchaseOrder(
		{
			supplierId: supplier["El Constructor Chapín"],
			warehouseId: central.id,
			issueDate: "2026-09-14",
			expectedDate: "2026-09-18",
			paymentType: "IMMEDIATE",
			paymentDueDate: "",
			taxPercentage: 0,
			items: [{ materialId: material[PINTURA], quantity: 30, unitCost: 149 }],
		},
		compras,
	);
	await cancelPurchaseOrder(
		poCanceled.id,
		compras,
		"El proveedor no tenía existencia del color solicitado; se compró a otro distribuidor.",
	);
	await prisma.purchaseOrder.update({
		where: { id: poCanceled.id },
		data: { createdAt: at("2026-09-14") },
	});

	// Facturas de las compras de bodega (gasto de la compañía) y su pago.
	const invoiceMaterial = await createPurchaseInvoice(
		{
			projectId: "",
			purchaseOrderId: poMaterial.id,
			expenseDate: "2026-07-03",
			documentNumber: "FACE-63A1-4410",
			subtotal: poMaterial.total.toNumber(),
		},
		pdfFile("factura-agresur-4410.pdf", "Factura FACE-63A1-4410 - AgreSur", [
			"Cementos y Agregados del Sur, S.A. - NIT 4587123-5",
			`Orden de compra ${poMaterial.number}`,
			`Total: Q ${poMaterial.total.toFixed(2)}`,
		]),
		conta,
	);
	await recordSupplierPayment(
		{
			financialExpenseId: invoiceMaterial.id,
			paymentDate: "2026-07-03",
			amount: invoiceMaterial.subtotal.toNumber(),
			method: "Transferencia",
			reference: "BI-TRF-778120",
		},
		conta,
	);
	const invoiceMachinery = await createPurchaseInvoice(
		{
			projectId: "",
			purchaseOrderId: poMachinery.id,
			expenseDate: "2026-07-13",
			documentNumber: "FACE-91B2-0087",
			subtotal: poMachinery.total.toNumber(),
		},
		pdfFile("factura-maqguate-0087.pdf", "Factura FACE-91B2-0087 - MaqGuate", [
			"Maquinaria y Equipos de Guatemala, S.A. - NIT 3398410-K",
			`Orden de compra ${poMachinery.number}`,
			`Total: Q ${poMachinery.total.toFixed(2)}`,
		]),
		conta,
	);
	await recordSupplierPayment(
		{
			financialExpenseId: invoiceMachinery.id,
			paymentDate: "2026-07-15",
			amount: 25000,
			method: "Cheque",
			reference: "Cheque 004512",
			notes: "Primer pago; saldo a 30 días.",
		},
		conta,
	);
	log("Compras de bodega: material, herramienta, maquinaria y una anulada");

	// ---------------------------------------------------------- Requerimientos
	async function backdateRequisition(
		id: string,
		requested: string,
		approved?: string,
	) {
		await prisma.requisition.update({
			where: { id },
			data: {
				requestedDate: at(requested, 8),
				createdAt: at(requested, 8),
				...(approved ? { approvedAt: at(approved, 11) } : {}),
			},
		});
	}

	// R1 Los Álamos - cimentación, atendido desde bodega.
	const r1 = await createRequisition(
		{
			destinationType: "PROJECT",
			projectId: P("alamos").id,
			warehouseId: central.id,
			title: "Material para cimentación y zapatas",
			priority: "HIGH",
			neededDate: "2026-07-20",
			notes: "Entregar en obra antes del inicio de excavación.",
			items: [
				{
					materialId: material[CEMENTO],
					description: CEMENTO,
					quantity: 90,
					budgetLineItemId: line("alamos", CEMENTO),
				},
				{
					materialId: material[HIERRO_38],
					description: HIERRO_38,
					quantity: 160,
					budgetLineItemId: line("alamos", HIERRO_38),
				},
				{
					materialId: material[HIERRO_14],
					description: HIERRO_14,
					quantity: 120,
					budgetLineItemId: line("alamos", HIERRO_14),
				},
				{
					materialId: material[ARENA],
					description: ARENA,
					quantity: 8,
					budgetLineItemId: line("alamos", ARENA),
				},
				{
					materialId: material[PIEDRIN],
					description: PIEDRIN,
					quantity: 7,
					budgetLineItemId: line("alamos", PIEDRIN),
				},
				{
					materialId: material[ALAMBRE],
					description: ALAMBRE,
					quantity: 50,
					budgetLineItemId: line("alamos", ALAMBRE),
				},
			],
		},
		supervisor,
	);
	await approveRequisition(r1.id, gerente);
	await fulfillRequisitionFromStock(r1.id, bodega);
	await backdateRequisition(r1.id, "2026-07-14", "2026-07-15");
	await backdateMovements({ reference: `Entrega ${r1.number}` }, "2026-07-16");

	// R2 Los Álamos - muros.
	const r2 = await createRequisition(
		{
			destinationType: "PROJECT",
			projectId: P("alamos").id,
			warehouseId: central.id,
			title: "Block y cemento para levantado de muros",
			priority: "NORMAL",
			neededDate: "2026-08-17",
			items: [
				{
					materialId: material[BLOCK],
					description: BLOCK,
					quantity: 1800,
					budgetLineItemId: line("alamos", BLOCK),
				},
				{
					materialId: material[CEMENTO],
					description: CEMENTO,
					quantity: 60,
					budgetLineItemId: line("alamos", CEMENTO),
				},
				{
					materialId: material[ARENA],
					description: ARENA,
					quantity: 6,
					budgetLineItemId: line("alamos", ARENA),
				},
			],
		},
		supervisor,
	);
	await approveRequisition(r2.id, gerente);
	await fulfillRequisitionFromStock(r2.id, bodega);
	await backdateRequisition(r2.id, "2026-08-10", "2026-08-11");
	await backdateMovements({ reference: `Entrega ${r2.number}` }, "2026-08-13");

	// R3 Torre Reforma - tablayeso: no hay existencia, va a compra a crédito.
	const r3 = await createRequisition(
		{
			destinationType: "PROJECT",
			projectId: P("torre").id,
			warehouseId: central.id,
			title: "Tablayeso y perfilería para divisiones del nivel 8",
			priority: "HIGH",
			neededDate: "2026-08-31",
			items: [
				{
					description: 'Panel de tablayeso 1/2"',
					quantity: 140,
					unit: "plancha",
					estimatedCost: 78,
					catalogNewMaterial: true,
					budgetLineItemId: line("torre", 'Panel de tablayeso 1/2"'),
				},
				{
					description: "Perfil metálico para tablayeso (poste y canal)",
					quantity: 260,
					unit: "unidad",
					estimatedCost: 32,
					catalogNewMaterial: true,
					budgetLineItemId: line(
						"torre",
						"Perfil metálico para tablayeso (poste y canal)",
					),
				},
				{
					description: "Masilla y cinta para juntas",
					quantity: 1,
					unit: "lote",
					estimatedCost: 3200,
					catalogNewMaterial: true,
					budgetLineItemId: line("torre", "Masilla y cinta para juntas"),
				},
			],
		},
		gerente,
	);
	await approveRequisition(r3.id, adminCtx);
	const r3Items = await prisma.requisitionItem.findMany({
		where: { requisitionId: r3.id },
	});
	const poTablayeso = await createPurchaseOrder(
		{
			requisitionId: r3.id,
			supplierId: supplier.Distablayeso,
			issueDate: "2026-08-24",
			expectedDate: "2026-08-28",
			paymentType: "CREDIT",
			paymentDueDate: "2026-09-23",
			taxPercentage: 0,
			notes: "Entrega en el sótano del edificio, horario de 18:00 a 22:00.",
			items: r3Items.map((item) => ({
				requisitionItemId: item.id,
				unitCost: item.description.startsWith("Panel")
					? 76.5
					: item.description.startsWith("Perfil")
						? 31
						: 3150,
			})),
		},
		compras,
	);
	await issuePurchaseOrder(poTablayeso.id, compras);
	await receiveAll(poTablayeso.id, "2026-08-28", "Envío DTA-22710");
	await backdateOrder(poTablayeso.id, "2026-08-24", "2026-08-28");
	await deliverRequisition(r3.id, bodega);
	await backdateRequisition(r3.id, "2026-08-20", "2026-08-21");
	await backdateMovements({ reference: `Entrega ${r3.number}` }, "2026-08-29");
	const invoiceTablayeso = await createPurchaseInvoice(
		{
			projectId: P("torre").id,
			purchaseOrderId: poTablayeso.id,
			expenseDate: "2026-08-28",
			documentNumber: "FACE-2C77-1185",
			subtotal: poTablayeso.total.toNumber(),
		},
		pdfFile(
			"factura-distablayeso-1185.pdf",
			"Factura FACE-2C77-1185 - Distablayeso",
			[
				"Distribuidora de Tablayeso y Acabados, S.A. - NIT 8870451-3",
				`Orden de compra ${poTablayeso.number} - crédito a 30 días`,
				`Total: Q ${poTablayeso.total.toFixed(2)}`,
			],
		),
		conta,
	);
	await recordSupplierPayment(
		{
			financialExpenseId: invoiceTablayeso.id,
			paymentDate: "2026-09-21",
			amount: 10000,
			method: "Transferencia",
			reference: "BI-TRF-801455",
			notes: "Abono parcial a la factura.",
		},
		conta,
	);

	// R4 Torre Reforma - iluminación: comprada, pendiente de recibir.
	const r4 = await createRequisition(
		{
			destinationType: "PROJECT",
			projectId: P("torre").id,
			warehouseId: central.id,
			title: "Lámparas LED y cable UTP para oficinas",
			priority: "NORMAL",
			neededDate: "2026-10-26",
			items: [
				{
					description: "Lámpara LED de panel 2x2",
					quantity: 48,
					unit: "unidad",
					estimatedCost: 340,
					catalogNewMaterial: true,
					budgetLineItemId: line("torre", "Lámpara LED de panel 2x2"),
				},
				{
					description: "Cable UTP categoría 6",
					quantity: 4,
					unit: "rollo",
					estimatedCost: 1450,
					catalogNewMaterial: true,
					budgetLineItemId: line("torre", "Cable UTP categoría 6"),
				},
			],
		},
		gerente,
	);
	await approveRequisition(r4.id, adminCtx);
	const r4Items = await prisma.requisitionItem.findMany({
		where: { requisitionId: r4.id },
	});
	const poLed = await createPurchaseOrder(
		{
			requisitionId: r4.id,
			supplierId: supplier.ElectroTotal,
			issueDate: "2026-10-12",
			expectedDate: "2026-10-22",
			paymentType: "CREDIT",
			paymentDueDate: "2026-11-11",
			taxPercentage: 0,
			items: r4Items.map((item) => ({
				requisitionItemId: item.id,
				unitCost: item.description.startsWith("Lámpara") ? 335 : 1425,
			})),
		},
		compras,
	);
	await issuePurchaseOrder(poLed.id, compras);
	await backdateOrder(poLed.id, "2026-10-12");
	await backdateRequisition(r4.id, "2026-10-07", "2026-10-09");

	// R5 Los Álamos - tubería: pendiente de autorización, urgente.
	const r5 = await createRequisition(
		{
			destinationType: "PROJECT",
			projectId: P("alamos").id,
			warehouseId: central.id,
			title: "Tubería PVC para instalaciones del segundo nivel",
			priority: "URGENT",
			neededDate: "2026-10-21",
			notes: "La cuadrilla de fontanería inicia el lunes.",
			items: [
				{
					materialId: material[PVC_12],
					description: PVC_12,
					quantity: 40,
					budgetLineItemId: line("alamos", PVC_12),
				},
			],
		},
		supervisor,
	);
	await backdateRequisition(r5.id, "2026-10-15");

	// R6 Villa Nueva - herramienta para la cuadrilla, atendida desde bodega.
	const r6 = await createRequisition(
		{
			destinationType: "PROJECT",
			projectId: P("bodega").id,
			warehouseId: central.id,
			title: "Herramienta para cuadrilla de cimentación",
			priority: "NORMAL",
			neededDate: "2026-10-12",
			items: [
				{
					resourceType: "TOOL",
					materialId: material["Carretilla de mano"],
					description: "Carretilla de mano",
					quantity: 2,
					outsideBudget: true,
					outsideBudgetReason:
						"Herramienta propia de la empresa asignada temporalmente a la obra.",
				},
				{
					resourceType: "TOOL",
					materialId: material["Pala cuadrada"],
					description: "Pala cuadrada",
					quantity: 6,
					outsideBudget: true,
					outsideBudgetReason:
						"Herramienta propia de la empresa asignada temporalmente a la obra.",
				},
			],
		},
		supervisor,
	);
	await approveRequisition(r6.id, gerente);
	await fulfillRequisitionFromStock(r6.id, bodega);
	await backdateRequisition(r6.id, "2026-10-06", "2026-10-07");
	await backdateMovements({ reference: `Entrega ${r6.number}` }, "2026-10-08");

	// R7 Villa Nueva - fuera de presupuesto, autorizado y esperando compra.
	const r7 = await createRequisition(
		{
			destinationType: "PROJECT",
			projectId: P("bodega").id,
			warehouseId: villaNueva.id,
			title: "Malla electrosoldada para refuerzo de piso",
			priority: "HIGH",
			neededDate: "2026-11-09",
			items: [
				{
					description: "Malla electrosoldada 6x6 calibre 6",
					quantity: 60,
					unit: "unidad",
					estimatedCost: 385,
					outsideBudget: true,
					outsideBudgetReason:
						"El estudio de suelos recomendó reforzar el piso industrial; no estaba en el presupuesto original.",
				},
			],
		},
		gerente,
	);
	await approveRequisition(r7.id, adminCtx);
	await backdateRequisition(r7.id, "2026-10-13", "2026-10-14");

	// R8 Torre Reforma - rechazado.
	const r8 = await createRequisition(
		{
			destinationType: "PROJECT",
			projectId: P("torre").id,
			warehouseId: central.id,
			title: "Pintura epóxica para cuarto de servidores",
			priority: "LOW",
			neededDate: "2026-11-02",
			items: [
				{
					description: "Pintura epóxica gris",
					quantity: 6,
					unit: "galón",
					estimatedCost: 420,
					outsideBudget: true,
					outsideBudgetReason:
						"Solicitado por el cliente para el cuarto de servidores.",
				},
			],
		},
		supervisor,
	);
	await rejectRequisition(r8.id, gerente);
	await backdateRequisition(r8.id, "2026-10-05");

	// R9 Bodega central - reposición de cemento (para bodega, sin proyecto).
	const r9 = await createRequisition(
		{
			destinationType: "WAREHOUSE",
			warehouseId: central.id,
			title: "Reposición de cemento en bodega central",
			priority: "NORMAL",
			neededDate: "2026-10-23",
			items: [
				{ materialId: material[CEMENTO], description: CEMENTO, quantity: 200 },
			],
		},
		bodega,
	);
	await backdateRequisition(r9.id, "2026-10-16");
	log("Requerimientos en distintos estados");

	// ------------------------------------------- Movimientos manuales de inventario
	const toolLoan = await recordStockMovement(
		{
			materialId: material['Pulidora angular 4 1/2"'],
			warehouseId: central.id,
			projectId: P("alamos").id,
			type: "OUT",
			quantity: 1,
			reference: "Préstamo HER-014",
			responsibleName: "Luis Fernando Ajú",
			expectedReturnDate: "2026-10-30",
			notes: "Corte de block y hierro.",
		},
		bodega,
	);
	await prisma.stockMovement.update({
		where: { id: toolLoan.id },
		data: { createdAt: at("2026-08-18", 7) },
	});
	const mixerLoan = await recordStockMovement(
		{
			materialId: material["Mezcladora de concreto de 1 saco"],
			warehouseId: central.id,
			projectId: P("alamos").id,
			type: "OUT",
			quantity: 1,
			reference: "Préstamo EQ-003",
			responsibleName: "Luis Fernando Ajú",
			expectedReturnDate: "2026-11-27",
			notes: "Fundición de losa y soleras.",
		},
		bodega,
	);
	await prisma.stockMovement.update({
		where: { id: mixerLoan.id },
		data: { createdAt: at("2026-07-20", 7) },
	});
	const vibratorLoan = await recordStockMovement(
		{
			materialId: material["Vibrador para concreto"],
			warehouseId: central.id,
			projectId: P("bodega").id,
			type: "OUT",
			quantity: 1,
			reference: "Préstamo EQ-004",
			responsibleName: "Luis Fernando Ajú",
			expectedReturnDate: "2026-11-20",
			notes: "Fundición de zapatas.",
		},
		bodega,
	);
	await prisma.stockMovement.update({
		where: { id: vibratorLoan.id },
		data: { createdAt: at("2026-10-12", 7) },
	});
	const transfer = await recordStockMovement(
		{
			materialId: material[CEMENTO],
			warehouseId: central.id,
			destinationWarehouseId: villaNueva.id,
			type: "TRANSFER",
			quantity: 40,
			reference: "Traslado TR-0007",
			notes: "Cemento para zapatas de la ampliación.",
		},
		bodega,
	);
	await backdateMovements(
		{ transferGroupId: transfer.transferGroupId },
		"2026-10-09",
		9,
	);
	const waste = await recordStockMovement(
		{
			materialId: material[BLOCK],
			warehouseId: central.id,
			type: "WASTE",
			quantity: 35,
			wasteReason: "BREAKAGE",
			notes: "Block quebrado durante la descarga del camión.",
			reference: "Merma M-0003",
		},
		bodega,
	);
	await prisma.stockMovement.update({
		where: { id: waste.id },
		data: { createdAt: at("2026-07-04", 10) },
	});
	const adjustment = await recordStockMovement(
		{
			materialId: material[ALAMBRE],
			warehouseId: central.id,
			type: "ADJUSTMENT",
			physicalStock: 96,
			reference: "Conteo físico septiembre",
			notes: "Diferencia encontrada en el conteo mensual.",
		},
		bodega,
	);
	await prisma.stockMovement.update({
		where: { id: adjustment.id },
		data: { createdAt: at("2026-09-30", 16) },
	});
	const toolReturn = await recordStockMovement(
		{
			materialId: material["Carretilla de mano"],
			warehouseId: central.id,
			projectId: P("bodega").id,
			type: "RETURN",
			quantity: 1,
			reference: "Devolución HER-021",
			notes: "Carretilla con llanta dañada, regresa para reparación.",
		},
		bodega,
	);
	await prisma.stockMovement.update({
		where: { id: toolReturn.id },
		data: { createdAt: at("2026-10-15", 16) },
	});
	log("Préstamos, traslado, merma, ajuste y devolución");

	// ------------------------------------------------------- Avances diarios
	const evidencePhotos = [
		"proyecto1.jpg",
		"proyecto2.jpg",
		"proyecto3.jpg",
		"proyecto4.jpg",
		"blog1.jpg",
		"blog3.jpg",
		"Rd3.jpg",
		"Rd4.jpg",
		"Rd5.jpg",
		"blog2.jpg",
	];
	let photoIndex = 0;
	const reportStats: string[] = [];

	for (const plan of projects) {
		const project = P(plan.key);
		const activities = await prisma.scheduleActivity.findMany({
			where: { schedule: { projectId: project.id } },
			orderBy: { position: "asc" },
		});
		// Reparto del avance meta de cada actividad entre los informes que caen
		// dentro de su programación (y antes de hoy).
		const increments = new Map<string, number[]>();
		plan.sections.forEach((section, index) => {
			const activity = activities[index];
			const dates = plan.reportDates.filter(
				(date) =>
					date >= section.plannedStart &&
					date <= TODAY &&
					date <= addDays(section.plannedEnd, 7),
			);
			const values = plan.reportDates.map(() => 0);
			if (section.target > 0) {
				const usable =
					dates.length > 0
						? dates
						: [
								plan.reportDates.find((date) => date >= section.plannedStart) ??
									plan.reportDates.at(-1) ??
									TODAY,
							];
				const share = Math.floor((section.target / usable.length) * 100) / 100;
				usable.forEach((date, position) => {
					const value =
						position === usable.length - 1
							? Number(
									(section.target - share * (usable.length - 1)).toFixed(2),
								)
							: share;
					values[plan.reportDates.indexOf(date)] = value;
				});
			}
			increments.set(activity.id, values);
		});

		const lastIndex = plan.reportDates.length - 1;
		const isFinished = plan.key === "vista";
		let reportCount = 0;

		for (const [dateIndex, reportDate] of plan.reportDates.entries()) {
			const current = await prisma.scheduleActivity.findMany({
				where: { schedule: { projectId: project.id } },
				orderBy: { position: "asc" },
			});
			const worked = current.filter(
				(activity) => (increments.get(activity.id)?.[dateIndex] ?? 0) > 0,
			);
			if (worked.length === 0) continue;
			reportCount += 1;

			const reportActivities = worked.map((activity, position) => {
				const today = increments.get(activity.id)?.[dateIndex] ?? 0;
				const previous = activity.progress.toNumber();
				const next = Math.min(100, Number((previous + today).toFixed(2)));
				const section = plan.sections[activity.position - 1];
				return {
					scheduleActivityId: activity.id,
					activityCode: activity.code,
					activityName: activity.description,
					budgetSectionCode: activity.budgetSectionCode ?? "",
					budgetSectionName: activity.budgetSectionName ?? "",
					workDescription: workDescription(section, next),
					unit: "%",
					contractedQuantity: "100",
					previousQuantity: previous.toFixed(2),
					todayQuantity: (next - previous).toFixed(2),
					previousProgress: previous.toFixed(2),
					status:
						next >= 100 ? ("COMPLETED" as const) : ("IN_PROGRESS" as const),
					issues:
						dateIndex === 3 && plan.key === "alamos"
							? "Lluvia intensa detuvo la fundición dos horas."
							: "",
					position: position + 1,
				};
			});

			const materialEntries: Array<Record<string, string | number>> = [];
			if (plan.key === "alamos" && reportDate >= "2026-07-24") {
				const blockPhase = reportDate >= "2026-08-21";
				materialEntries.push({
					materialId: material[CEMENTO],
					warehouseId: central.id,
					materialName: CEMENTO,
					warehouse: central.name,
					quantityUsed: blockPhase ? "8" : "10",
					unit: "saco",
					wasteQuantity: "0",
					returnedQuantity: "0",
					activityCode: blockPhase ? "3" : "2",
					notes: "",
					position: 1,
				});
				if (blockPhase) {
					materialEntries.push({
						materialId: material[BLOCK],
						warehouseId: central.id,
						materialName: BLOCK,
						warehouse: central.name,
						quantityUsed: "180",
						unit: "unidad",
						wasteQuantity: reportDate === "2026-09-04" ? "12" : "0",
						returnedQuantity: "0",
						activityCode: "3",
						notes:
							reportDate === "2026-09-04"
								? "Block quebrado al cortar para instalaciones."
								: "",
						position: 2,
					});
				} else {
					materialEntries.push({
						materialId: material[HIERRO_38],
						warehouseId: central.id,
						materialName: HIERRO_38,
						warehouse: central.name,
						quantityUsed: "40",
						unit: "unidad",
						wasteQuantity: "0",
						returnedQuantity: "0",
						activityCode: "2",
						notes: "",
						position: 2,
					});
				}
			}

			const crew =
				plan.key === "torre"
					? [
							{
								workerLabel: "Encargado de obra",
								role: "Maestro de obra",
								people: "1",
								hours: "8",
								rate: "31.25",
								notes: "",
								position: 1,
							},
							{
								workerLabel: "Cuadrilla de tablayeso",
								role: "Tablayesero",
								people: "4",
								hours: "8",
								rate: "22.50",
								notes: "Turno nocturno",
								position: 2,
							},
							{
								workerLabel: "Ayudantes",
								role: "Ayudante",
								people: "3",
								hours: "8",
								rate: "12.50",
								notes: "",
								position: 3,
							},
						]
					: [
							{
								workerLabel: "Encargado de obra",
								role: "Maestro de obra",
								people: "1",
								hours: "8",
								rate: "31.25",
								notes: "",
								position: 1,
							},
							{
								workerLabel: "Albañiles",
								role: "Albañil",
								people: plan.key === "bodega" ? "5" : "3",
								hours: "8",
								rate: "18.75",
								notes: "",
								position: 2,
							},
							{
								workerLabel: "Ayudantes",
								role: "Ayudante",
								people: plan.key === "bodega" ? "6" : "4",
								hours: "8",
								rate: "12.50",
								notes: "",
								position: 3,
							},
						];

			const reportNumber = `INF-${reportDate.replaceAll("-", "")}-${String(reportCount).padStart(2, "0")}`;
			const report = await saveDailyReport(
				project.id,
				{
					reportNumber,
					reportDate,
					siteManager: plan.siteManager,
					location: plan.reportLocation,
					workShift: plan.key === "torre" ? "Nocturna" : "Diurna",
					startTime: plan.key === "torre" ? "18:00" : "07:00",
					endTime: plan.key === "torre" ? "02:00" : "16:00",
					weather: weatherOptions[dateIndex % weatherOptions.length],
					generalObservations:
						dateIndex === lastIndex && !isFinished
							? "Se coordina con el cliente la visita de supervisión de la próxima semana."
							: "Jornada sin incidentes de seguridad. Personal con equipo de protección completo.",
					activities: reportActivities,
					laborEntries: crew,
					materialEntries,
				},
				supervisor,
			);

			// Evidencias fotográficas en algunos informes.
			if (dateIndex % 2 === 0 || dateIndex === lastIndex) {
				const formData = new FormData();
				const count = plan.key === "alamos" && dateIndex === lastIndex ? 3 : 2;
				formData.set("mediaCount", String(count));
				for (let index = 0; index < count; index++) {
					const source = evidencePhotos[photoIndex % evidencePhotos.length];
					photoIndex += 1;
					formData.set(
						`media.${index}.file`,
						await imageFile(source, `avance-${reportDate}-${index + 1}.jpg`),
					);
					formData.set(
						`media.${index}.mediaType`,
						index === 0 ? "DURING" : "AFTER",
					);
					formData.set(
						`media.${index}.title`,
						`${reportActivities[0].activityName} - ${reportDate}`,
					);
					formData.set(
						`media.${index}.description`,
						"Registro fotográfico de la jornada.",
					);
					formData.set(
						`media.${index}.activityCode`,
						reportActivities[Math.min(index, reportActivities.length - 1)]
							.activityCode,
					);
				}
				await saveDailyReportMediaFiles(report.id, formData, supervisor);
			}

			const reportTime = at(reportDate, 17);
			const keepSubmitted = dateIndex === lastIndex && !isFinished;
			await submitDailyReport(project.id, report.id, supervisor);
			if (!keepSubmitted) {
				await approveDailyReport(project.id, report.id, gerente);
				// Los informes aprobados se publican al portal del cliente.
				if (plan.key !== "bodega" || dateIndex === 0)
					await publishDailyReport(project.id, report.id, gerente);
			}
			await prisma.dailyReport.update({
				where: { id: report.id },
				data: {
					createdAt: reportTime,
					submittedAt: reportTime,
					...(keepSubmitted
						? {}
						: {
								approvedAt: at(addDays(reportDate, 1), 10),
								publishedAt: at(addDays(reportDate, 1), 11),
							}),
				},
			});
			await prisma.dailyReportMedia.updateMany({
				where: { dailyReportId: report.id },
				data: { createdAt: reportTime },
			});
		}

		// Un borrador del día en curso para Los Álamos.
		if (plan.key === "alamos") {
			const current = await prisma.scheduleActivity.findFirstOrThrow({
				where: { schedule: { projectId: project.id }, position: 4 },
			});
			await saveDailyReport(
				project.id,
				{
					reportNumber: `INF-${TODAY.replaceAll("-", "")}-${String(reportCount + 1).padStart(2, "0")}`,
					reportDate: TODAY,
					siteManager: plan.siteManager,
					location: plan.reportLocation,
					workShift: "Diurna",
					startTime: "07:00",
					endTime: "12:00",
					weather: "Soleado",
					generalObservations: "Medio día de trabajo (sábado).",
					activities: [
						{
							scheduleActivityId: current.id,
							activityCode: current.code,
							activityName: current.description,
							budgetSectionCode: current.budgetSectionCode ?? "",
							budgetSectionName: current.budgetSectionName ?? "",
							workDescription:
								"Armado de vigueta y colocación de bovedilla en el área de dormitorios.",
							unit: "%",
							contractedQuantity: "100",
							previousQuantity: current.progress.toFixed(2),
							todayQuantity: "3",
							previousProgress: current.progress.toFixed(2),
							status: "IN_PROGRESS",
							issues: "",
							position: 1,
						},
					],
					laborEntries: [
						{
							workerLabel: "Albañiles",
							role: "Albañil",
							people: "3",
							hours: "5",
							rate: "18.75",
							notes: "",
							position: 1,
						},
					],
					materialEntries: [],
				},
				supervisor,
			);
			reportCount += 1;
		}

		const refreshed = await prisma.project.findUniqueOrThrow({
			where: { id: project.id },
			select: { progressPercentage: true, status: true },
		});
		reportStats.push(
			`${plan.key}: ${reportCount} informes, avance ${refreshed.progressPercentage.toString()}%, estado ${refreshed.status}`,
		);
	}
	log(`Avances diarios — ${reportStats.join(" | ")}`);

	// --------------------------------------------------------------- Finanzas
	async function payment(
		key: string,
		paymentDate: string,
		amount: number,
		concept: string,
		method: string,
		reference: string,
	) {
		const created = await createClientPayment(
			{
				projectId: P(key).id,
				paymentDate,
				amount,
				concept,
				method,
				reference,
				observations: "",
			},
			conta,
		);
		await prisma.clientPayment.update({
			where: { id: created.id },
			data: { createdAt: at(paymentDate, 12) },
		});
	}
	const pct = (key: string, value: number) =>
		Math.round(P(key).grandTotal.toNumber() * value * 100) / 100;

	await payment(
		"alamos",
		"2026-07-01",
		pct("alamos", 0.3),
		"Anticipo 30 % según contrato",
		"Transferencia",
		"BAM-TRF-552014",
	);
	await payment(
		"alamos",
		"2026-08-14",
		pct("alamos", 0.2),
		"Segundo pago: cimentación concluida",
		"Cheque",
		"Cheque BI 0018874",
	);
	await payment(
		"alamos",
		"2026-09-25",
		pct("alamos", 0.15),
		"Tercer pago: avance de muros",
		"Transferencia",
		"BAM-TRF-603391",
	);
	await payment(
		"torre",
		"2026-08-14",
		pct("torre", 0.4),
		"Anticipo 40 %",
		"Transferencia",
		"BI-TRF-790012",
	);
	await payment(
		"torre",
		"2026-10-02",
		pct("torre", 0.2),
		"Pago por avance de tablayeso",
		"Transferencia",
		"BI-TRF-822145",
	);
	await payment(
		"bodega",
		"2026-09-25",
		pct("bodega", 0.25),
		"Anticipo 25 %",
		"Transferencia",
		"G&T-TRF-110394",
	);
	await payment(
		"vista",
		"2026-04-28",
		pct("vista", 0.5),
		"Anticipo 50 %",
		"Depósito",
		"Boleta 3348821",
	);
	await payment(
		"vista",
		"2026-06-12",
		pct("vista", 0.3),
		"Segundo pago",
		"Transferencia",
		"BI-TRF-701288",
	);
	await payment(
		"vista",
		"2026-07-28",
		Math.round(
			(P("vista").grandTotal.toNumber() -
				pct("vista", 0.5) -
				pct("vista", 0.3)) *
				100,
		) / 100,
		"Liquidación final",
		"Cheque",
		"Cheque BAM 0007712",
	);

	type ExpenseDef = {
		key: string;
		date: string;
		description: string;
		type: string;
		subtotal: number;
		vendor?: string;
		section?: string;
		quantity?: number;
		unit?: string;
		method?: string;
		receipt?: { number: string; type: "FACTURA" | "RECIBO" };
	};
	const expenses: ExpenseDef[] = [
		{
			key: "alamos",
			date: "2026-07-17",
			description: "Planilla de mano de obra, semanas 1 y 2",
			type: "Mano de obra",
			subtotal: 9850,
			section: "1",
			quantity: 2,
			unit: "semana",
			method: "Efectivo",
		},
		{
			key: "alamos",
			date: "2026-07-31",
			description: "Planilla de mano de obra, semanas 3 y 4",
			type: "Mano de obra",
			subtotal: 11200,
			section: "2",
			quantity: 2,
			unit: "semana",
			method: "Efectivo",
		},
		{
			key: "alamos",
			date: "2026-08-14",
			description: "Planilla de mano de obra, semanas 5 y 6",
			type: "Mano de obra",
			subtotal: 11200,
			section: "2",
			quantity: 2,
			unit: "semana",
			method: "Efectivo",
		},
		{
			key: "alamos",
			date: "2026-08-28",
			description: "Planilla de mano de obra, semanas 7 y 8",
			type: "Mano de obra",
			subtotal: 12450,
			section: "3",
			quantity: 2,
			unit: "semana",
			method: "Efectivo",
		},
		{
			key: "alamos",
			date: "2026-09-11",
			description: "Planilla de mano de obra, semanas 9 y 10",
			type: "Mano de obra",
			subtotal: 12450,
			section: "3",
			quantity: 2,
			unit: "semana",
			method: "Efectivo",
		},
		{
			key: "alamos",
			date: "2026-07-06",
			description: "Alquiler de sanitario portátil (julio a diciembre)",
			type: "Servicio",
			subtotal: 3600,
			vendor: "Sanitarios Express",
			section: "1",
			quantity: 6,
			unit: "mes",
			method: "Transferencia",
		},
		{
			key: "alamos",
			date: "2026-09-22",
			description: "Clavos y madera para formaleta de losa",
			type: "Material",
			subtotal: 1840,
			vendor: "Ferretería La Económica",
			section: "4",
			quantity: 1,
			unit: "global",
			method: "Efectivo",
			receipt: { number: "A-4587", type: "FACTURA" },
		},
		{
			key: "alamos",
			date: "2026-08-31",
			description: "Supervisión de obra, agosto",
			type: "Supervisión",
			subtotal: 4500,
			section: "3",
			method: "Transferencia",
		},
		{
			key: "torre",
			date: "2026-08-28",
			description: "Planilla nocturna, semanas 1 y 2",
			type: "Mano de obra",
			subtotal: 13800,
			section: "1",
			quantity: 2,
			unit: "semana",
			method: "Transferencia",
		},
		{
			key: "torre",
			date: "2026-09-11",
			description: "Planilla nocturna, semanas 3 y 4",
			type: "Mano de obra",
			subtotal: 14600,
			section: "2",
			quantity: 2,
			unit: "semana",
			method: "Transferencia",
		},
		{
			key: "torre",
			date: "2026-09-25",
			description: "Planilla nocturna, semanas 5 y 6",
			type: "Mano de obra",
			subtotal: 14600,
			section: "2",
			quantity: 2,
			unit: "semana",
			method: "Transferencia",
		},
		{
			key: "torre",
			date: "2026-08-21",
			description: "Fletes de retiro de ripio (6 viajes)",
			type: "Servicio",
			subtotal: 5100,
			vendor: "Transportes Rápidos Mixco",
			section: "1",
			quantity: 6,
			unit: "viaje",
			method: "Efectivo",
			receipt: { number: "R-0921", type: "RECIBO" },
		},
		{
			key: "torre",
			date: "2026-10-06",
			description: "Trabajo adicional: punto de red para sala de juntas",
			type: "Trabajo adicional",
			subtotal: 2750,
			section: "4",
			method: "Transferencia",
		},
		{
			key: "bodega",
			date: "2026-10-02",
			description: "Alquiler de retroexcavadora (40 horas)",
			type: "Servicio",
			subtotal: 18400,
			vendor: "Maquinaria Pesada Escuintla",
			section: "1",
			quantity: 40,
			unit: "hora",
			method: "Transferencia",
			receipt: { number: "B-11820", type: "FACTURA" },
		},
		{
			key: "bodega",
			date: "2026-10-09",
			description: "Planilla de mano de obra, semanas 1 y 2",
			type: "Mano de obra",
			subtotal: 16900,
			section: "1",
			quantity: 2,
			unit: "semana",
			method: "Efectivo",
		},
		{
			key: "vista",
			date: "2026-05-15",
			description: "Planilla de mano de obra, mayo",
			type: "Mano de obra",
			subtotal: 9800,
			section: "1",
			method: "Efectivo",
		},
		{
			key: "vista",
			date: "2026-06-30",
			description: "Planilla de mano de obra, junio",
			type: "Mano de obra",
			subtotal: 12600,
			section: "4",
			method: "Efectivo",
		},
		{
			key: "vista",
			date: "2026-06-22",
			description: "Gabinetes de cocina en melamina (subcontrato)",
			type: "Servicio",
			subtotal: 27800,
			vendor: "Carpintería Hermanos Sic",
			section: "3",
			method: "Transferencia",
			receipt: { number: "FACE-11F0-0042", type: "FACTURA" },
		},
		{
			key: "vista",
			date: "2026-06-02",
			description: "Tubería, accesorios y cajas eléctricas",
			type: "Material",
			subtotal: 4960,
			vendor: "Ferretería El Constructor Chapín",
			section: "2",
			method: "Tarjeta",
			receipt: { number: "FACE-6612-7781", type: "FACTURA" },
		},
	];
	const financeUsers = [conta, gerente, adminCtx];
	for (const [index, expense] of expenses.entries()) {
		const actor = financeUsers[index % financeUsers.length];
		const receipt = expense.receipt
			? pdfFile(
					`comprobante-${expense.receipt.number}.pdf`,
					`${expense.receipt.type === "FACTURA" ? "Factura" : "Recibo"} ${expense.receipt.number}`,
					[
						`Proveedor: ${expense.vendor ?? "-"}`,
						`Concepto: ${expense.description}`,
						`Total: Q ${expense.subtotal.toFixed(2)}`,
					],
				)
			: undefined;
		const created = await createExpense(
			{
				projectId: P(expense.key).id,
				expenseDate: expense.date,
				description: expense.description,
				vendor: expense.vendor,
				quantity: expense.quantity ?? 1,
				unit: expense.unit ?? "global",
				subtotal: expense.subtotal,
				type: expense.type,
				budgetSectionNo: expense.section,
				documentNumber: expense.receipt?.number,
				documentType: expense.receipt?.type,
				paymentMethod: expense.method,
			},
			actor,
			receipt,
		);
		await prisma.financialExpense.update({
			where: { id: created.id },
			data: { createdAt: at(expense.date, 15) },
		});
	}
	log("Abonos del cliente, gastos del proyecto y pagos a proveedores");

	// -------------------------------------------------------------- Documentos
	const categories = await prisma.documentCategory.findMany({
		where: { active: true },
	});
	const categoryId = (key: string) => {
		const category = categories.find((item) => item.key === key);
		if (!category) throw new Error(`No existe la categoría ${key}`);
		return category.id;
	};
	type DocDef = {
		title: string;
		category: string;
		description: string;
		tags: string;
		portal: boolean;
		file: () => Promise<File> | File;
		date: string;
	};
	const docsFor = (key: string): DocDef[] => {
		const plan = P(key).plan;
		return [
			{
				title: "Contrato de obra firmado",
				category: "contratos",
				description: `Contrato entre HM Constructora y ${plan.client.name}.`,
				tags: "contrato, legal",
				portal: true,
				date: addDays(plan.startDate, -14),
				file: () =>
					pdfFile(`contrato-${key}.pdf`, "Contrato de obra", [
						plan.name,
						`Cliente: ${plan.client.name}`,
						`Ubicación: ${plan.location}`,
						`Plazo: ${plan.startDate} al ${plan.expectedEndDate}`,
						"Forma de pago según avance de obra.",
					]),
			},
			{
				title: "Planos arquitectónicos",
				category: "planos",
				description: "Juego de planos aprobado por el cliente, revisión B.",
				tags: "planos, arquitectura",
				portal: true,
				date: addDays(plan.startDate, -20),
				file: () =>
					pdfFile(`planos-${key}.pdf`, "Planos arquitectónicos - Rev. B", [
						"Planta de distribución",
						"Elevaciones y secciones",
						"Planta de techos",
						"Detalles constructivos",
					]),
			},
			{
				title: "Licencia de construcción municipal",
				category: "permisos",
				description: "Licencia emitida por la municipalidad.",
				tags: "licencia, municipalidad",
				portal: false,
				date: addDays(plan.startDate, -7),
				file: () =>
					pdfFile(`licencia-${key}.pdf`, "Licencia de construcción", [
						`Proyecto: ${plan.name}`,
						"Vigencia: 12 meses",
						"Expediente No. 2026-04518",
					]),
			},
			{
				title: "Fotografía general de la obra",
				category: "evidencias",
				description: "Vista general tomada en la última visita de supervisión.",
				tags: "fotos",
				portal: true,
				date: addDays(plan.reportDates.at(-1) ?? TODAY, 0),
				file: () => {
					photoIndex += 1;
					return imageFile(
						evidencePhotos[photoIndex % evidencePhotos.length],
						`vista-general-${key}.jpg`,
					);
				},
			},
		];
	};
	const docActors = [gerente, supervisor, adminCtx, { userId: users.sramirez }];
	let docIndex = 0;
	for (const key of ["alamos", "torre", "bodega", "vista"]) {
		for (const doc of docsFor(key)) {
			const formData = new FormData();
			formData.set("file", await doc.file());
			formData.set("categoryId", categoryId(doc.category));
			formData.set("title", doc.title);
			formData.set("description", doc.description);
			formData.set("tags", doc.tags);
			if (doc.portal) formData.set("portalVisible", "on");
			const actor = docActors[docIndex % docActors.length];
			docIndex += 1;
			const created = await createProjectDocument(P(key).id, formData, actor);
			await prisma.projectDocument.update({
				where: { id: created.id },
				data: { createdAt: at(doc.date, 10), approvedAt: at(doc.date, 10) },
			});
			await prisma.documentVersion.updateMany({
				where: { documentId: created.id },
				data: { createdAt: at(doc.date, 10) },
			});
		}
	}
	log("Documentos por proyecto (contratos, planos, licencias, fotos)");

	// ------------------------------------------------- Portal del cliente
	for (const key of ["alamos", "torre", "vista"]) {
		await createPortalShare(P(key).id, gerente.userId);
	}
	log("Enlaces de portal para 3 proyectos");

	// ---------------------------------------------- Solicitudes del sitio web
	const inquiries = [
		{
			name: "Mónica Estrada",
			phone: "55889012",
			email: "monica.estrada@correo-ejemplo.com",
			message:
				"Buenas tardes, quisiera cotizar la construcción de un segundo nivel en mi casa en zona 7, aproximadamente 90 m².",
			status: "IN_PROGRESS" as const,
			notes: "Visita técnica programada para el martes 20 de octubre.",
		},
		{
			name: "Restaurante El Fogón",
			phone: "24470088",
			email: "gerencia@elfogon-ejemplo.com",
			message:
				"Necesitamos remodelar la cocina industrial de nuestro restaurante en Antigua Guatemala. ¿Pueden enviarnos información?",
			status: "NEW" as const,
		},
		{
			name: "Javier Cabrera",
			phone: "41237765",
			email: "jcabrera@correo-ejemplo.com",
			message:
				"Me interesa impermeabilizar la terraza de mi casa y cambiar el piso. ¿Hacen trabajos pequeños?",
			status: "CLOSED" as const,
			notes: "Se envió cotización. El cliente decidió posponer el trabajo.",
		},
		{
			name: "Colegio Santa Ana",
			phone: "22510930",
			email: "administracion@colegiosantaana-ejemplo.edu.gt",
			message:
				"Solicitamos cotización para la construcción de cuatro aulas y un módulo de baños.",
			status: "NEW" as const,
		},
	];
	for (const [index, inquiry] of inquiries.entries()) {
		const { inquiry: created } = await submitWebsiteInquiry(
			{
				name: inquiry.name,
				phone: inquiry.phone,
				email: inquiry.email,
				message: inquiry.message,
				website: "",
				startedAt: Date.now() - 120000,
			},
			{ ipAddress: null, userAgent: "seed-manual" },
		);
		if (inquiry.status !== "NEW") {
			await updateWebsiteInquiryStatus(
				{ id: created.id, status: inquiry.status, notes: inquiry.notes },
				gerente,
			);
		}
		await prisma.websiteInquiry.update({
			where: { id: created.id },
			data: { createdAt: at(addDays(TODAY, -(index * 3 + 1)), 10 + index) },
		});
	}
	log("Solicitudes del formulario de contacto");

	console.info("\nDatos del manual listos.");
	console.info(`Usuarios creados con la contraseña: ${MANUAL_PASSWORD}`);
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
