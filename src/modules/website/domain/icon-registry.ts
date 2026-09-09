import {
	Building2,
	Compass,
	Eye,
	FileText,
	Hammer,
	HardHat,
	Lightbulb,
	Map as MapIcon,
	MonitorSmartphone,
	Wrench,
	type LucideIcon,
} from "lucide-react";

const websiteServiceIcons: Record<string, LucideIcon> = {
	HardHat,
	Compass,
	Map: MapIcon,
	FileText,
	Building2,
	MonitorSmartphone,
	Wrench,
	Eye,
	Lightbulb,
	Hammer,
};

export const websiteServiceIconOptions = Object.keys(websiteServiceIcons);

export const websiteServiceIconLabels: Record<string, string> = {
	HardHat: "Casco de construcción",
	Compass: "Diseño y arquitectura",
	Map: "Planificación urbana",
	FileText: "Planos y documentos",
	Building2: "Edificación",
	MonitorSmartphone: "Diseño 3D y renders",
	Wrench: "Remodelación y mantenimiento",
	Eye: "Supervisión e inspección",
	Lightbulb: "Instalaciones eléctricas",
	Hammer: "Trabajo especializado",
};

export function resolveWebsiteServiceIcon(
	icon: string | null | undefined,
): LucideIcon {
	return (icon && websiteServiceIcons[icon]) || HardHat;
}
