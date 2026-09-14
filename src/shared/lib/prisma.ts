import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// Next.js preserves globalThis across development hot reloads. Versioning this
// key prevents a Prisma Client created from an older generated schema from
// surviving after a migration adds new fields.
const prismaGlobalKey = "__hmConstructoraPrisma_v7";
const globalForPrisma = globalThis as unknown as Record<
	typeof prismaGlobalKey,
	PrismaClient | undefined
>;

export const prisma =
	globalForPrisma[prismaGlobalKey] ??
	new PrismaClient({
		adapter: new PrismaMariaDb(buildMariaDbConfig(env.DATABASE_URL)),
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma[prismaGlobalKey] = prisma;
}

function buildMariaDbConfig(
	databaseUrl: string,
): ConstructorParameters<typeof PrismaMariaDb>[0] {
	const url = new URL(databaseUrl);

	return {
		host: url.hostname,
		port: url.port ? Number(url.port) : 3306,
		user: decodeURIComponent(url.username),
		password: decodeURIComponent(url.password),
		database: decodeURIComponent(url.pathname.replace(/^\//, "")),
		allowPublicKeyRetrieval: true,
	};
}
