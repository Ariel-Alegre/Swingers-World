export const SESSION_COOKIE = "sw_admin_session";

export function apiUrl(path: string) {
  const base = process.env.ADMIN_API_URL;
  if (!base) throw new Error("ADMIN_API_URL no está configurada.");
  return `${base.replace(/\/$/, "")}${path}`;
}

export type AdminUser = {
  id: string;
  registrationSource: "app" | "admin";
  profileType: "single" | "couple" | null;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  lastPaymentStatus: string | null;
};
