"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	addWebsitePhotoFromEvidence,
	addWebsitePhotoFromUpload,
	deleteWebsitePhoto,
	deleteWebsiteService,
	moveWebsitePhoto,
	moveWebsiteService,
	setWebsitePhotoActive,
	submitWebsiteInquiry,
	updateWebsiteInquiryStatus,
	updateWebsiteSettings,
	upsertWebsiteService,
	WebsiteInquiryRateLimitError,
} from "./service";

function value(formData: FormData, key: string) {
	const raw = formData.get(key);
	return typeof raw === "string" ? raw : "";
}

function refresh(tab?: string) {
	revalidatePath("/website");
	revalidatePath("/");
	revalidatePath("/servicios");
	revalidatePath("/proyectos");
	revalidatePath("/contacto");
	redirect(`/website${tab ? `?tab=${tab}` : ""}` as Route);
}

async function requestIp() {
	const headerList = await headers();
	const forwardedFor = headerList.get("x-forwarded-for");
	if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
	return headerList.get("x-real-ip");
}

export async function submitWebsiteInquiryAction(formData: FormData) {
	// "spam" is never surfaced in the redirect: a bot that can compare its own
	// outcome against a real submission's would learn to evade the time-trap.
	let outcome: "ok" | "validation" | "rate_limit" | "server" = "server";

	try {
		const ipAddress = await requestIp();
		const userAgent = (await headers()).get("user-agent");
		await submitWebsiteInquiry(
			{
				name: value(formData, "name"),
				phone: value(formData, "phone"),
				email: value(formData, "email"),
				message: value(formData, "message"),
				website: value(formData, "website"),
				startedAt: value(formData, "startedAt"),
			},
			{ ipAddress, userAgent },
		);
		outcome = "ok";
	} catch (error) {
		if (error instanceof WebsiteInquiryRateLimitError) {
			outcome = "rate_limit";
		} else if (error instanceof z.ZodError) {
			outcome = "validation";
		} else {
			console.error("No se pudo guardar la solicitud del sitio web", error);
			outcome = "server";
		}
	}

	redirect(`/contacto?enviado=${outcome}`);
}

// ---------------------------------------------------------------------------
// Admin actions (/website) -- every one requires sitio.editar
// ---------------------------------------------------------------------------

export async function updateWebsiteSettingsAction(formData: FormData) {
	const user = await requirePermission("sitio.editar");
	await updateWebsiteSettings(
		{
			heroEyebrow: value(formData, "heroEyebrow"),
			heroHeading: value(formData, "heroHeading"),
			heroSubheading: value(formData, "heroSubheading"),
			heroImageUrl: value(formData, "heroImageUrl"),
			homeServicesEyebrow: value(formData, "homeServicesEyebrow"),
			homeServicesHeading: value(formData, "homeServicesHeading"),
			ctaHeading: value(formData, "ctaHeading"),
			ctaText: value(formData, "ctaText"),
			aboutHeading: value(formData, "aboutHeading"),
			aboutText: value(formData, "aboutText"),
			missionText: value(formData, "missionText"),
			visionText: value(formData, "visionText"),
			phonePrimary: value(formData, "phonePrimary"),
			phoneSecondary: value(formData, "phoneSecondary"),
			email: value(formData, "email"),
			address: value(formData, "address"),
			hoursWeekdays: value(formData, "hoursWeekdays"),
			hoursSaturday: value(formData, "hoursSaturday"),
			facebookUrl: value(formData, "facebookUrl"),
			instagramUrl: value(formData, "instagramUrl"),
			servicesEyebrow: value(formData, "servicesEyebrow"),
			servicesHeading: value(formData, "servicesHeading"),
			projectsEyebrow: value(formData, "projectsEyebrow"),
			projectsHeading: value(formData, "projectsHeading"),
			projectsSubheading: value(formData, "projectsSubheading"),
			contactEyebrow: value(formData, "contactEyebrow"),
			contactHeading: value(formData, "contactHeading"),
			contactSubheading: value(formData, "contactSubheading"),
			seoTitle: value(formData, "seoTitle"),
			seoDescription: value(formData, "seoDescription"),
			published: formData.get("published") === "on",
		},
		{ userId: user.id },
	);
	refresh("inicio");
}

export async function upsertWebsiteServiceAction(formData: FormData) {
	const user = await requirePermission("sitio.editar");
	const id = value(formData, "id");
	await upsertWebsiteService(
		{
			id: id || undefined,
			title: value(formData, "title"),
			description: value(formData, "description"),
			icon: value(formData, "icon"),
			active: formData.get("active") === "on",
		},
		{ userId: user.id },
	);
	refresh("servicios");
}

export async function deleteWebsiteServiceAction(formData: FormData) {
	const user = await requirePermission("sitio.editar");
	await deleteWebsiteService(value(formData, "id"), { userId: user.id });
	refresh("servicios");
}

export async function moveWebsiteServiceAction(formData: FormData) {
	await requirePermission("sitio.editar");
	const direction = value(formData, "direction");
	await moveWebsiteService(
		value(formData, "id"),
		direction === "up" ? "up" : "down",
	);
	refresh("servicios");
}

export async function addWebsitePhotoFromUploadAction(formData: FormData) {
	const user = await requirePermission("sitio.editar");
	const files = formData
		.getAll("images")
		.filter((entry): entry is File => entry instanceof File && entry.size > 0);
	if (files.length === 0) {
		throw new Error("Selecciona al menos una imagen para subir.");
	}
	for (const file of files) {
		await addWebsitePhotoFromUpload(
			{ title: value(formData, "title"), altText: value(formData, "altText") },
			file,
			{ userId: user.id },
		);
	}
	refresh("galeria");
}

export async function addWebsitePhotoFromEvidenceAction(formData: FormData) {
	const user = await requirePermission("sitio.editar");
	await addWebsitePhotoFromEvidence(
		{
			dailyReportMediaId: value(formData, "dailyReportMediaId"),
			title: value(formData, "title"),
			altText: value(formData, "altText"),
		},
		{ userId: user.id },
	);
	refresh("galeria");
}

export async function setWebsitePhotoActiveAction(formData: FormData) {
	const user = await requirePermission("sitio.editar");
	await setWebsitePhotoActive(
		value(formData, "id"),
		formData.get("active") === "on",
		{ userId: user.id },
	);
	refresh("galeria");
}

export async function deleteWebsitePhotoAction(formData: FormData) {
	const user = await requirePermission("sitio.editar");
	await deleteWebsitePhoto(value(formData, "id"), { userId: user.id });
	refresh("galeria");
}

export async function moveWebsitePhotoAction(formData: FormData) {
	await requirePermission("sitio.editar");
	const direction = value(formData, "direction");
	await moveWebsitePhoto(
		value(formData, "id"),
		direction === "up" ? "up" : "down",
	);
	refresh("galeria");
}

export async function updateWebsiteInquiryStatusAction(formData: FormData) {
	const user = await requirePermission("sitio.editar");
	await updateWebsiteInquiryStatus(
		{
			id: value(formData, "id"),
			status: value(formData, "status"),
			notes: value(formData, "notes"),
		},
		{ userId: user.id },
	);
	refresh("solicitudes");
}
