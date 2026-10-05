import { cookies } from "next/headers";
import Link from "next/link";
import { LoginForm } from "./components/login-form";
import { UsersDashboard } from "./components/users-dashboard";
import { apiUrl, SESSION_COOKIE, type AdminUser } from "./lib/admin-api";

export const dynamic = "force-dynamic";

async function loadDashboard(token: string): Promise<
  | { kind: "ok"; users: AdminUser[]; adminName: string }
  | { kind: "expired" }
  | { kind: "error" }
> {
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const meResponse = await fetch(apiUrl("/api/admin/me"), { headers, cache: "no-store" });
    if (meResponse.status === 401 || meResponse.status === 403) return { kind: "expired" };
    if (!meResponse.ok) throw new Error("No se pudo verificar la sesión.");

    const usersResponse = await fetch(apiUrl("/api/admin/users"), { headers, cache: "no-store" });
    if (usersResponse.status === 401 || usersResponse.status === 403) return { kind: "expired" };
    if (!usersResponse.ok) throw new Error("No se pudo obtener la lista de usuarios.");

    const admin = (await meResponse.json()) as { name?: string };
    const rawUsers: unknown = await usersResponse.json();
    if (!Array.isArray(rawUsers)) throw new Error("La respuesta de usuarios no es válida.");

    // Only these fields cross the server/client boundary. The backend response
    // includes additional profile and billing fields this screen must not expose.
    const users: AdminUser[] = rawUsers
      .filter((user) => user && typeof user === "object" && user.role !== "admin")
      .map((user) => ({
        id: String(user.id ?? ""),
        profileType: user.Profile?.profileType === "couple" ? "couple" as const : user.Profile?.profileType === "single" ? "single" as const : null,
        registrationSource: user.registrationSource === "admin"
          ? "admin" as const
          : user.registrationSource === "self"
            ? "app" as const
            : ((user.plan === "free" && user.subscriptionStatus === "free") ||
                (user.plan === "lifetime" && user.subscriptionStatus === "lifetime"))
              ? "admin" as const
              : "app" as const,
        firstName: String(user.firstName ?? ""),
        lastName: String(user.lastName ?? ""),
        email: String(user.email ?? ""),
        createdAt: String(user.createdAt ?? ""),
        plan: user.plan ? String(user.plan) : null,
        subscriptionStatus: user.subscriptionStatus ? String(user.subscriptionStatus) : null,
        currentPeriodEnd: user.currentPeriodEnd ? String(user.currentPeriodEnd) : null,
        lastPaymentStatus: user.lastPaymentStatus ? String(user.lastPaymentStatus) : null,
      }));

    return { kind: "ok", users, adminName: admin.name ?? "Admin" };
  } catch {
    return { kind: "error" };
  }
}

export default async function Home() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return <LoginForm />;

  const result = await loadDashboard(token);
  if (result.kind === "expired") return <LoginForm sessionExpired />;
  if (result.kind === "error") {
    return (
      <div className="error-page">
        <div className="brand-mark">SW</div>
        <h1>No pudimos cargar el panel</h1>
        <p>Revisá la conexión con el servidor y volvé a intentarlo.</p>
        <Link className="primary-button" href="/">Reintentar</Link>
      </div>
    );
  }
  return <UsersDashboard users={result.users} adminName={result.adminName} />;
}
