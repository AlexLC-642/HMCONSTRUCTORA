import { prisma } from "@/shared/lib/prisma";

export async function getUsersWorkspace() {
	const [users, roles, permissions] = await Promise.all([
		prisma.user.findMany({
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				status: true,
				roles: { include: { role: true }, orderBy: { role: { name: "asc" } } },
				passkeys: {
					orderBy: { lastUsedAt: "desc" },
					select: { id: true, createdAt: true, lastUsedAt: true },
				},
			},
			orderBy: [{ status: "asc" }, { name: "asc" }],
		}),
		prisma.role.findMany({
			include: {
				permissions: {
					include: { permission: true },
					orderBy: { permission: { key: "asc" } },
				},
				_count: { select: { users: true } },
			},
			orderBy: { name: "asc" },
		}),
		prisma.permission.findMany({ orderBy: { key: "asc" } }),
	]);

	return { users, roles, permissions };
}

export async function getOwnUserWorkspace(userId: string) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			phone: true,
			status: true,
			roles: { include: { role: true }, orderBy: { role: { name: "asc" } } },
			passkeys: {
				orderBy: { lastUsedAt: "desc" },
				select: { id: true, createdAt: true, lastUsedAt: true },
			},
		},
	});

	return { users: [user], roles: [], permissions: [] };
}
