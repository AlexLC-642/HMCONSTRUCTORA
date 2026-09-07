export const COMPANY_EMAIL_DOMAIN = "hmconstructora.com";

export function isCompanyEmail(email: string) {
  return email.toLowerCase().endsWith(`@${COMPANY_EMAIL_DOMAIN}`);
}