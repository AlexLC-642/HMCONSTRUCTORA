import { z } from "zod";
import { COMPANY_EMAIL_DOMAIN, isCompanyEmail } from "./email-domain";

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .toLowerCase()
    .refine(isCompanyEmail, {
      message: `El correo debe terminar en @${COMPANY_EMAIL_DOMAIN}`
    }),
  password: z.string().min(8)
});