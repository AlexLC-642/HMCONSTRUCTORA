"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	requireAuthenticatedUser,
	requireUserAdministrator,
} from "@/modules/auth/application/authorization";
import {
	createInternalUser,
	resetInternalUserPassword,
	revokeInternalUserPasskeys,
	updateInternalUser,
} from "./service";

function values(formData: FormData, key: string) {
	return formData
		.getAll(key)
		.filter((value): value is string => typeof value === "string");
}

function value(formData: FormData, key: string) {
	const raw = formData.get(key);
	return typeof raw === "string" ? raw : "";
}

function refreshUsers() {
	revalidatePath("/users");
	redirect("/users" as Route);
}

export async function createInternalUserAction(formData: FormData) {
	const user = await requireUserAdministrator();
	await createInternalUser(
		{
			name: value(formData, "name"),
			email: value(formData, "email"),
			phone: value(formData, "phone"),
			password: value(formData, "password"),
			status: value(formData, "status"),
			roleIds: values(formData, "roleIds"),
		},
		{ userId: user.id, roles: user.roles },
	);
	refreshUsers();
}

export async function updateInternalUserAction(
	userId: string,
	formData: FormData,
) {
	const user = await requireUserAdministrator();
	await updateInternalUser(
		userId,
		{
			name: value(formData, "name"),
			email: value(formData, "email"),
			phone: value(formData, "phone"),
			status: formData.get("active") === "ACTIVE" ? "ACTIVE" : "INACTIVE",
			roleIds: values(formData, "roleIds"),
		},
		{ userId: user.id, roles: user.roles },
	);
	refreshUsers();
}

export async function resetInternalUserPasswordAction(
	userId: string,
	formData: FormData,
) {
	const user = await requireUserAdministrator();
	await resetInternalUserPassword(
		userId,
		{ password: value(formData, "password") },
		{ userId: user.id, roles: user.roles },
	);
	refreshUsers();
}

export async function revokeInternalUserPasskeysAction(
	userId: string,
	_formData: FormData,
) {
	const user = await requireUserAdministrator();
	await revokeInternalUserPasskeys(userId, {
		userId: user.id,
		roles: user.roles,
	});
	refreshUsers();
}

export async function changeOwnPasswordAction(formData: FormData) {
	const user = await requireAuthenticatedUser();
	await resetInternalUserPassword(
		user.id,
		{ password: value(formData, "password") },
		{ userId: user.id, roles: user.roles },
	);
	refreshUsers();
}
