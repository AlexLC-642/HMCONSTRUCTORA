"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { approveBudgetVersion, createEditableBudgetDraft, createInitialBudget, saveBudgetVersion } from "./service";

function readPayload(formData: FormData) {
  const payload = formData.get("payload");

  if (typeof payload !== "string") {
    throw new Error("No se recibio informacion del presupuesto.");
  }

  return JSON.parse(payload);
}

export async function createInitialBudgetAction(projectId: string, formData: FormData) {
  const user = await requirePermission("presupuesto.editar");
  await createInitialBudget(projectId, readPayload(formData), { userId: user.id });
  revalidatePath(`/projects/${projectId}/budget`);
  redirect(`/projects/${projectId}/budget` as Route);
}

export async function saveBudgetVersionAction(projectId: string, versionId: string, formData: FormData) {
  const user = await requirePermission("presupuesto.editar");
  await saveBudgetVersion(projectId, versionId, readPayload(formData), { userId: user.id });
  revalidatePath(`/projects/${projectId}/budget`);
  redirect(`/projects/${projectId}/budget` as Route);
}

export async function approveBudgetVersionAction(projectId: string, versionId: string) {
  const user = await requirePermission("presupuesto.aprobar");
  await approveBudgetVersion(projectId, versionId, { userId: user.id });
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}/schedule`);
  redirect(`/projects/${projectId}/schedule` as Route);
}

export async function createEditableBudgetDraftAction(projectId: string, versionId: string) {
  const user = await requirePermission("presupuesto.editar");
  await createEditableBudgetDraft(projectId, versionId, { userId: user.id });
  revalidatePath(`/projects/${projectId}/budget`);
  redirect(`/projects/${projectId}/budget` as Route);
}
