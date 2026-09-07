"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { createInitialSchedule, saveSchedule } from "./service";

function readPayload(formData: FormData) {
  const payload = formData.get("payload");
  if (typeof payload !== "string") {
    throw new Error("No se recibio informacion del cronograma.");
  }
  return JSON.parse(payload);
}

export async function createInitialScheduleAction(projectId: string, formData: FormData) {
  const user = await requirePermission("cronograma.editar");
  await createInitialSchedule(projectId, readPayload(formData), { userId: user.id });
  revalidatePath(`/projects/${projectId}/schedule`);
  redirect(`/projects/${projectId}/schedule` as Route);
}

export async function saveScheduleAction(projectId: string, scheduleId: string, formData: FormData) {
  const user = await requirePermission("cronograma.editar");
  await saveSchedule(projectId, scheduleId, readPayload(formData), { userId: user.id });
  revalidatePath(`/projects/${projectId}/schedule`);
  redirect(`/projects/${projectId}/schedule` as Route);
}

