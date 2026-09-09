"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { requireProjectPermission } from "@/modules/auth/application/authorization";
import { createPortalShare, revokePortalShares } from "./service";

export async function createPortalShareAction(projectId: string) {
	const user = await requireProjectPermission(projectId, "portal.gestionar");
	await createPortalShare(projectId, user.id);
	redirect(`/projects/${projectId}/sharing` as Route);
}

export async function revokePortalShareAction(projectId: string) {
	const user = await requireProjectPermission(projectId, "portal.gestionar");
	await revokePortalShares(projectId, user.id);
	redirect(`/projects/${projectId}/sharing` as Route);
}
