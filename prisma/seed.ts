import "dotenv/config";
import { Prisma } from "@prisma/client";
import { hashPassword } from "../src/modules/auth/application/password";
import { COMPANY_EMAIL_DOMAIN } from "../src/modules/auth/domain/email-domain";
import {
	initialPermissions,
	initialRoles,
	rolePermissionPresets,
} from "../src/modules/roles/domain/permissions";
import { prisma } from "../src/shared/lib/prisma";

const adminEmail = `admin@${COMPANY_EMAIL_DOMAIN}`;
const legacyAdminEmails = [
	"admin@constructorahm.local",
	"admin@hmcontructora.com",
];

async function main() {
	for (const permission of initialPermissions) {
		await prisma.permission.upsert({
			where: { key: permission.key },
			update: permission,
			create: permission,
		});
	}

	for (const role of initialRoles) {
		await prisma.role.upsert({
			where: { key: role.key },
			update: {
				name: role.name,
				description: role.description,
			},
			create: role,
		});
	}

	const permissions = await prisma.permission.findMany();
	const permissionsByKey = new Map(
		permissions.map((permission) => [permission.key, permission.id]),
	);

	for (const roleDefinition of initialRoles) {
		const role = await prisma.role.findUniqueOrThrow({
			where: { key: roleDefinition.key },
		});
		const permissionIds = rolePermissionPresets[roleDefinition.key].map(
			(key) => {
				const permissionId = permissionsByKey.get(key);
				if (!permissionId) throw new Error(`No existe el permiso ${key}`);
				return permissionId;
			},
		);

		await prisma.$transaction([
			prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
			prisma.rolePermission.createMany({
				data: permissionIds.map((permissionId) => ({
					roleId: role.id,
					permissionId,
				})),
			}),
		]);
	}

	const superAdmin = await prisma.role.findUniqueOrThrow({
		where: { key: "superadministrador" },
	});

	const passwordHash = await hashPassword("Admin12345!");
	const existingAdmin = await prisma.user.findUnique({
		where: { email: adminEmail },
	});
	const legacyAdmins = await prisma.user.findMany({
		where: { email: { in: legacyAdminEmails } },
		orderBy: { createdAt: "asc" },
	});

	const adminUser = existingAdmin
		? await prisma.user.update({
				where: { id: existingAdmin.id },
				data: {
					name: "Administrador HM Constructora",
					passwordHash,
					status: "ACTIVE",
				},
			})
		: legacyAdmins[0]
			? await prisma.user.update({
					where: { id: legacyAdmins[0].id },
					data: {
						email: adminEmail,
						name: "Administrador HM Constructora",
						passwordHash,
						status: "ACTIVE",
					},
				})
			: await prisma.user.create({
					data: {
						email: adminEmail,
						name: "Administrador HM Constructora",
						passwordHash,
					},
				});

	await prisma.user.deleteMany({
		where: {
			email: { in: legacyAdminEmails },
			id: { not: adminUser.id },
		},
	});

	await prisma.userRole.upsert({
		where: {
			userId_roleId: {
				userId: adminUser.id,
				roleId: superAdmin.id,
			},
		},
		update: {},
		create: {
			userId: adminUser.id,
			roleId: superAdmin.id,
		},
	});

	await prisma.userRole.deleteMany({
		where: {
			userId: adminUser.id,
			role: { key: "administrador" },
		},
	});

	await prisma.userRole.deleteMany({
		where: {
			roleId: superAdmin.id,
			userId: { not: adminUser.id },
		},
	});

	const client = await prisma.client.upsert({
		where: { id: "seed-client-remodelacion" },
		update: {
			name: "Cliente de demostracion",
			contactName: "Contacto de obra",
			email: "cliente.demo@example.com",
			phone: "0000-0000",
		},
		create: {
			id: "seed-client-remodelacion",
			name: "Cliente de demostracion",
			contactName: "Contacto de obra",
			email: "cliente.demo@example.com",
			phone: "0000-0000",
		},
	});

	const project = await prisma.project.upsert({
		where: { code: "HM-REM-001" },
		update: {
			name: "Remodelacion de vivienda piloto",
			status: "ACTIVE",
			responsibleId: adminUser.id,
			updatedById: adminUser.id,
			clientId: client.id,
		},
		create: {
			internalId: "PRY-0001",
			code: "HM-REM-001",
			name: "Remodelacion de vivienda piloto",
			description: "Proyecto de demostracion para validar la gestion inicial.",
			clientId: client.id,
			location: "Guatemala",
			startDate: new Date("2026-08-01T00:00:00.000Z"),
			expectedEndDate: new Date("2026-10-15T00:00:00.000Z"),
			responsibleId: adminUser.id,
			status: "ACTIVE",
			currency: "GTQ",
			baseBudget: new Prisma.Decimal(125000),
			progressPercentage: new Prisma.Decimal(12.5),
			observations: "Datos semilla para desarrollo local.",
			createdById: adminUser.id,
			updatedById: adminUser.id,
		},
	});

	await prisma.projectMember.upsert({
		where: {
			projectId_userId: {
				projectId: project.id,
				userId: adminUser.id,
			},
		},
		update: { roleLabel: "Responsable" },
		create: {
			projectId: project.id,
			userId: adminUser.id,
			roleLabel: "Responsable",
		},
	});
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
