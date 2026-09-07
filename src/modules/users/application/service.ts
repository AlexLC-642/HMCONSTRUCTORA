import { Prisma } from "@prisma/client";
import { recordAuditLog } from "@/modules/audit/application/audit";
import { hashPassword } from "@/modules/auth/application/password";
import { prisma } from "@/shared/lib/prisma";
import {
	createUserSchema,
	resetPasswordSchema,
	updateUserSchema,
} from "../domain/validation";

type ActorContext = { userId: string; roles: readonly string[] };

const protectedRoleKeys = new Set(["administrador", "superadministrador"]);

function isSuperAdministrator(context: ActorContext) {
	return context.roles.includes("superadministrador");
}

function hasProtectedRole(roleKeys: ReadonlySet<string>) {
	return Array.from(roleKeys).some((key) => protectedRoleKeys.has(key));
}

function assertCanAssignRoles(
	context: ActorContext,
	requestedRoleKeys: ReadonlySet<string>,
) {
	if (!isSuperAdministrator(context) && hasProtectedRole(requestedRoleKeys)) {
		throw new Error(
			"Solo el superadministrador puede asignar roles administrativos.",
		);
	}
}

function assertCanManageProtectedAccount(
	context: ActorContext,
	targetUserId: string,
	targetRoleKeys: ReadonlySet<string>,
	allowSelf = false,
) {
	if (
		!isSuperAdministrator(context) &&
		hasProtectedRole(targetRoleKeys) &&
		(!allowSelf || context.userId !== targetUserId)
	) {
		throw new Error(
			"Solo el superadministrador puede administrar esta cuenta.",
		);
	}
}

function uniqueRoleIds(roleIds: string[]) {
	return Array.from(new Set(roleIds));
}

function assertAllRolesExist(
	requestedIds: string[],
	foundRoles: Array<{ id: string }>,
) {
	if (foundRoles.length !== requestedIds.length) {
		throw new Error("Uno de los roles seleccionados ya no está disponible.");
	}
}

export async function createInternalUser(
	rawInput: unknown,
	context: ActorContext,
) {
	const input = createUserSchema.parse(rawInput);
	const requestedRoleIds = uniqueRoleIds(input.roleIds);
	const requestedRoles = await prisma.role.findMany({
		where: { id: { in: requestedRoleIds } },
		select: { id: true, key: true },
	});
	assertAllRolesExist(requestedRoleIds, requestedRoles);
	const requestedRoleKeys = new Set(requestedRoles.map((role) => role.key));
	assertCanAssignRoles(context, requestedRoleKeys);

	if (requestedRoleKeys.has("superadministrador")) {
		const superAdministratorCount = await prisma.userRole.count({
			where: { role: { key: "superadministrador" } },
		});
		if (superAdministratorCount > 0) {
			throw new Error("El sistema sólo puede tener un superadministrador.");
		}
	}

	const status = requestedRoleKeys.has("superadministrador")
		? "ACTIVE"
		: input.status;

	const passwordHash = await hashPassword(input.password);

	try {
		const user = await prisma.user.create({
			data: {
				name: input.name,
				email: input.email,
				phone: input.phone,
				passwordHash,
				status,
				roles: {
					create: requestedRoles.map((role) => ({ roleId: role.id })),
				},
			},
		});

		await recordAuditLog({
			userId: context.userId,
			action: "CREATE",
			entityType: "User",
			entityId: user.id,
			metadata: { email: user.email, roles: input.roleIds },
		});

		return user;
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new Error("Ya existe un usuario con ese correo.");
		}
		throw error;
	}
}

export async function revokeInternalUserPasskeys(
	userId: string,
	context: ActorContext,
) {
	const target = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			roles: { select: { role: { select: { key: true } } } },
		},
	});
	assertCanManageProtectedAccount(
		context,
		userId,
		new Set(target.roles.map(({ role }) => role.key)),
		true,
	);
	const result = await prisma.userPasskey.deleteMany({ where: { userId } });

	await recordAuditLog({
		userId: context.userId,
		action: "DELETE",
		entityType: "UserPasskey",
		entityId: target.id,
		metadata: { targetUserId: target.id, revokedCredentials: result.count },
	});

	return result;
}

export async function updateInternalUser(
	userId: string,
	rawInput: unknown,
	context: ActorContext,
) {
	const input = updateUserSchema.parse(rawInput);

	try {
		return await prisma.$transaction(async (tx) => {
			const currentUser = await tx.user.findUniqueOrThrow({
				where: { id: userId },
				include: { roles: { include: { role: true } } },
			});
			const currentRoleKeys = new Set(
				currentUser.roles.map(({ role }) => role.key),
			);
			assertCanManageProtectedAccount(context, userId, currentRoleKeys);
			const requestedRoleIds = uniqueRoleIds(input.roleIds);
			const requestedRoles = await tx.role.findMany({
				where: { id: { in: requestedRoleIds } },
				select: { id: true, key: true },
			});
			assertAllRolesExist(requestedRoleIds, requestedRoles);
			const requestedRoleKeys = new Set(requestedRoles.map((role) => role.key));
			assertCanAssignRoles(context, requestedRoleKeys);

			if (
				currentRoleKeys.has("superadministrador") &&
				(!requestedRoleKeys.has("superadministrador") ||
					input.status !== "ACTIVE")
			) {
				throw new Error(
					"El superadministrador único no puede deshabilitarse ni perder su rol.",
				);
			}

			if (
				requestedRoleKeys.has("superadministrador") &&
				!currentRoleKeys.has("superadministrador")
			) {
				const superAdministratorCount = await tx.userRole.count({
					where: { role: { key: "superadministrador" } },
				});
				if (superAdministratorCount > 0) {
					throw new Error("El sistema sólo puede tener un superadministrador.");
				}
			}

			await tx.userRole.deleteMany({ where: { userId } });
			const updated = await tx.user.update({
				where: { id: userId },
				data: {
					name: input.name,
					email: input.email,
					phone: input.phone,
					status: input.status,
					roles: {
						create: requestedRoles.map((role) => ({ roleId: role.id })),
					},
				},
			});

			await tx.auditLog.create({
				data: {
					userId: context.userId,
					action: "UPDATE",
					entityType: "User",
					entityId: updated.id,
					metadata: {
						previousEmail: currentUser.email,
						email: updated.email,
						status: updated.status,
						roles: input.roleIds,
					},
				},
			});

			return updated;
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new Error("Ya existe un usuario con ese correo.");
		}
		throw error;
	}
}

export async function resetInternalUserPassword(
	userId: string,
	rawInput: unknown,
	context: ActorContext,
) {
	const input = resetPasswordSchema.parse(rawInput);
	const target = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			roles: { select: { role: { select: { key: true } } } },
		},
	});
	assertCanManageProtectedAccount(
		context,
		userId,
		new Set(target.roles.map(({ role }) => role.key)),
		true,
	);
	const passwordHash = await hashPassword(input.password);

	const user = await prisma.user.update({
		where: { id: userId },
		data: { passwordHash },
	});

	await recordAuditLog({
		userId: context.userId,
		action: "UPDATE",
		entityType: "UserPassword",
		entityId: user.id,
		metadata: { email: user.email },
	});

	return user;
}
