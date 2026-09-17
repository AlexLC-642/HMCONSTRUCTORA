import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	AUTH_SECRET: z.string().min(32),
	APP_URL: z.string().url().default("http://localhost:3000"),
	WASTE_REVIEW_AMOUNT_GTQ: z.coerce
		.number()
		.finite()
		.positive()
		.max(100000000)
		.default(1000),
});

export const env = envSchema.parse({
	DATABASE_URL: process.env.DATABASE_URL,
	AUTH_SECRET: process.env.AUTH_SECRET,
	APP_URL: process.env.APP_URL,
	WASTE_REVIEW_AMOUNT_GTQ: process.env.WASTE_REVIEW_AMOUNT_GTQ,
});
