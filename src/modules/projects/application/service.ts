import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { ProjectStatus } from "@prisma/client";
import {
	parseDateInput,
	projectFormSchema,
	type ProjectFormInput,
} from "../domain/validation";

type ProjectMutationContext = {
	userId: string;
};

type ProjectWriteInput = ReturnType<typeof projectDataFromInput>;

function clientDataFromInput(input: ProjectFormInput) {
	if (!input.clientName) {
		return undefined;
	}

	return {
		name: input.clientName,
		contactName: input.clientContactName,
		email: input.clientEmail,
		phone: input.clientPhone,
	};
}

function nextSequentialCode(values: string[]) {
	const maxValue = values.reduce((current, value) => {
		const numericValue = Number(String(value).replace(/\D/g, ""));
		if (!Number.isFinite(numericValue) || numericValue <= 0) {
			return current;
		}

		return Math.max(current, numericValue);
	}, 0);

	return String(maxValue + 1).padStart(4, "0");
}

async function generateProjectIdentifiers(tx: Prisma.TransactionClient) {
	const projects = await tx.project.findMany({
		select: { internalId: true, code: true },
	});

	return {
		internalId: nextSequentialCode(
			projects.map((project) => project.internalId),
		),
		code: nextSequentialCode(projects.map((project) => project.code)),
	};
}

function projectDataFromInput(input: ProjectFormInput) {
	return {
		internalId: input.internalId ?? "",
		code: input.code ?? "",
		name: input.name,
		description: input.description,
		location: input.location,
		startDate: parseDateInput(input.startDate),
		expectedEndDate: parseDateInput(input.expectedEndDate),
		responsibleId: input.responsibleId,
		status: input.status ?? "DRAFT",
		currency: input.currency,
		baseBudget: new Prisma.Decimal(input.baseBudget),
		progressPercentage: new Prisma.Decimal(input.progressPercentage),
		observations: input.observations,
		portalEnabled: input.portalEnabled,
	};
}

function editableProjectData(data: ProjectWriteInput) {
	return {
		name: data.name,
		description: data.description,
		location: data.location,
		startDate: data.startDate,
		expectedEndDate: data.expectedEndDate,
		responsibleId: data.responsibleId,
		status: data.status,
		currency: data.currency,
		baseBudget: data.baseBudget,
		observations: data.observations,
		portalEnabled: data.portalEnabled,
	};
}

export async function createProject(
	rawInput: unknown,
	context: ProjectMutationContext,
) {
	const input = projectFormSchema.parse(rawInput);
	const clientData = clientDataFromInput(input);

	const project = await prisma.$transaction(async (tx) => {
		const identifiers = await generateProjectIdentifiers(tx);
		const projectData = projectDataFromInput(input);
		const client = clientData
			? await tx.client.create({ data: clientData })
			: null;
		const memberIds = Array.from(
			new Set(
				(input.memberIds ?? []).filter(
					(userId) => typeof userId === "string" && userId.trim().length > 0,
				),
			),
		);

		const createdProject = await tx.project.create({
			data: {
				...projectData,
				internalId: projectData.internalId || identifiers.internalId,
				code: projectData.code || identifiers.code,
				progressPercentage: new Prisma.Decimal(0),
				clientId: client?.id,
				createdById: context.userId,
				updatedById: context.userId,
				members: {
					create: memberIds.map((userId) => ({ userId })),
				},
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "Project",
				entityId: createdProject.id,
				metadata: {
					code: createdProject.code,
					status: createdProject.status,
				},
			},
		});

		return createdProject;
	});

	return project;
}

export async function updateProjectLifecycle(
	id: string,
	status: ProjectStatus,
	context: ProjectMutationContext,
) {
	const project = await prisma.$transaction(async (tx) => {
		const existing = await tx.project.findUniqueOrThrow({
			where: { id },
			select: { id: true, code: true, status: true, actualEndDate: true },
		});

		const updatedProject = await tx.project.update({
			where: { id },
			data: {
				status,
				actualEndDate:
					status === "COMPLETED"
						? (existing.actualEndDate ?? new Date())
						: status === "ACTIVE"
							? null
							: existing.actualEndDate,
				updatedById: context.userId,
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "Project",
				entityId: updatedProject.id,
				metadata: {
					code: existing.code,
					previousStatus: existing.status,
					status: updatedProject.status,
					lifecycleChange: true,
				},
			},
		});

		return updatedProject;
	});

	return project;
}

export async function updateProject(
	id: string,
	rawInput: unknown,
	context: ProjectMutationContext,
) {
	const input = projectFormSchema.parse(rawInput);
	const clientData = clientDataFromInput(input);

	const project = await prisma.$transaction(async (tx) => {
		const existing = await tx.project.findUniqueOrThrow({
			where: { id },
			include: { client: true },
		});

		const client = clientData
			? existing.clientId
				? await tx.client.update({
						where: { id: existing.clientId },
						data: clientData,
					})
				: await tx.client.create({ data: clientData })
			: null;

		await tx.projectMember.deleteMany({ where: { projectId: id } });

		const updatedProject = await tx.project.update({
			where: { id },
			data: {
				...editableProjectData(projectDataFromInput(input)),
				internalId: existing.internalId,
				code: existing.code,
				progressPercentage: existing.progressPercentage,
				clientId: client?.id,
				updatedById: context.userId,
				members: {
					create: input.memberIds.map((userId) => ({ userId })),
				},
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "Project",
				entityId: updatedProject.id,
				metadata: {
					code: updatedProject.code,
					previousStatus: existing.status,
					status: updatedProject.status,
				},
			},
		});

		return updatedProject;
	});

	return project;
}
