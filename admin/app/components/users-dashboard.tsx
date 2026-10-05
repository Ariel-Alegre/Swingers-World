"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "../lib/admin-api";
import { CreateLifetimeUserForm } from "./create-lifetime-user-form";

type View = "app" | "admin" | "create";
type State = "trial" | "paid" | "lifetime" | "canceling" | "past_due" | "expired" | "none";
type Filter = "all" | "trial" | "paid" | "none" | "lifetime" | "other";

function stateOf(user: AdminUser): State {
  const status = user.subscriptionStatus?.toLowerCase();
  if (user.plan?.toLowerCase() === "lifetime" && status === "lifetime") return "lifetime";
  const periodEnd = user.currentPeriodEnd ? new Date(user.currentPeriodEnd).getTime() : null;
  const ended = periodEnd !== null && Number.isFinite(periodEnd) && periodEnd < Date.now();
  if (status === "trialing") return ended ? "expired" : "trial";
  if (status === "active") return ended ? "expired" : "paid";
  if (status === "canceling" || status === "canceled") return ended ? "expired" : "canceling";
  if (status === "past_due") return "past_due";
  if (status === "expired") return "expired";
  return "none";
}

const stateLabels: Record<State, string> = {
  trial: "Prueba de 7 días",
  paid: "Plan activo",
  lifetime: "Acceso vitalicio",
  canceling: "Cancelando",
  past_due: "Pago pendiente",
  expired: "Vencido",
  none: "Sin suscripción",
};

function planLabel(plan: string | null) {
  switch (plan?.toLowerCase()) {
    case "monthly": return "Mensual";
    case "six_months":
    case "six-months": return "6 meses";
    case "annual":
    case "yearly": return "Anual";
    case "free": return "Gratis (admin)";
    case "lifetime": return "Lifetime";
    default: return plan || "—";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-number">{value}</div><div className="stat-label">{label}</div></div>;
}

export function UsersDashboard({ users, adminName }: { users: AdminUser[]; adminName: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("app");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const appUsers = useMemo(() => users.filter((user) => user.registrationSource === "app"), [users]);
  const adminUsers = useMemo(() => users.filter((user) => user.registrationSource === "admin"), [users]);
  const group = view === "admin" ? adminUsers : appUsers;

  const totals = useMemo(() => ({
    trial: appUsers.filter((user) => stateOf(user) === "trial").length,
    paid: appUsers.filter((user) => stateOf(user) === "paid").length,
    none: appUsers.filter((user) => stateOf(user) === "none").length,
    lifetime: adminUsers.filter((user) => stateOf(user) === "lifetime").length,
  }), [appUsers, adminUsers]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return group
      .filter((user) => filter === "all" || (filter === "other" ? stateOf(user) !== "lifetime" : stateOf(user) === filter))
      .filter((user) => !needle || `${user.firstName} ${user.lastName} ${user.email}`.toLocaleLowerCase().includes(needle))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [group, filter, query]);

  function selectView(next: View) {
    setView(next);
    setFilter("all");
    setQuery("");
  }

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.refresh();
  }

  function refresh() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 1000);
  }

  const filters: [Filter, string][] = view === "admin"
    ? [["all", "Todos"], ["lifetime", "Vitalicios"], ["other", "Otros"]]
    : [["all", "Todos"], ["trial", "En prueba"], ["paid", "Con plan"], ["none", "Sin plan"]];

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark">SW</div><div><strong>Swingers World</strong><span>ADMIN CONSOLE</span></div></div>
        <div className="sidebar-section">USUARIOS</div>
        <button className={view === "app" ? "sidebar-link active" : "sidebar-link"} onClick={() => selectView("app")}><span className="sidebar-icon">◉</span> Registrados en la app <span className="sidebar-count">{appUsers.length}</span></button>
        <button className={view === "admin" ? "sidebar-link active" : "sidebar-link"} onClick={() => selectView("admin")}><span className="sidebar-icon">▦</span> Creados desde el panel <span className="sidebar-count">{adminUsers.length}</span></button>
        <button className={view === "create" ? "sidebar-link active" : "sidebar-link"} onClick={() => selectView("create")}><span className="sidebar-icon">＋</span> Registrar usuario</button>
        <div className="sidebar-bottom"><span className="sidebar-avatar">{adminName.slice(0, 1).toUpperCase()}</span><div><strong>{adminName}</strong><small>Administrador</small></div></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><span>Panel <span className="breadcrumb-separator">/</span> {view === "app" ? "Usuarios de la app" : view === "admin" ? "Usuarios del panel" : "Registrar usuario"}</span><button className="signout-button" onClick={signOut}>Cerrar sesión ↗</button></header>
        <div className="content-inner">
          {view === "create" ? <CreateLifetimeUserForm onBack={() => selectView("admin")} /> : (
            <>
              <div className="page-heading">
                <div><p className="eyebrow">{view === "app" ? "REGISTROS DE LA APP" : "CUENTAS ADMINISTRADAS"}</p><h1>{view === "app" ? "Usuarios de la app" : "Creados desde el panel"}</h1><p>{view === "app" ? "Personas que se registraron por su cuenta, con su prueba o plan de pago." : "Cuentas creadas manualmente desde este sistema, separadas de los registros de la app."}</p></div>
                <div className="heading-actions"><button className="refresh-button" onClick={refresh} disabled={refreshing}>{refreshing ? "Actualizando…" : "↻ Actualizar datos"}</button><button className="primary-button" onClick={() => selectView("create")}>＋ Registrar usuario</button></div>
              </div>
              {view === "app" ? (
                <div className="stats-grid stats-grid-four">
                  <StatCard label="Registrados en la app" value={appUsers.length} icon="◉" tone="neutral" />
                  <StatCard label="En prueba gratis" value={totals.trial} icon="✦" tone="purple" />
                  <StatCard label="Plan activo" value={totals.paid} icon="↗" tone="green" />
                  <StatCard label="Sin suscripción" value={totals.none} icon="○" tone="gold" />
                </div>
              ) : (
                <div className="stats-grid stats-grid-three">
                  <StatCard label="Creados desde el panel" value={adminUsers.length} icon="▦" tone="neutral" />
                  <StatCard label="Acceso vitalicio" value={totals.lifetime} icon="∞" tone="purple" />
                  <StatCard label="Otros creados" value={adminUsers.length - totals.lifetime} icon="○" tone="gold" />
                </div>
              )}
              <section className="users-panel">
                <div className="panel-header"><div><h2>{view === "app" ? "Registros de la app" : "Cuentas creadas por el administrador"}</h2><p>{view === "app" ? "El plan y la prueba se actualizan con los eventos de pago recibidos por el servidor." : "Estas cuentas no se mezclan con las altas realizadas desde la app."}</p></div><span className="record-count">{visible.length} de {group.length}</span></div>
                <div className="table-toolbar"><div className="filters" role="group" aria-label="Filtrar usuarios">{filters.map(([key, label]) => <button key={key} className={filter === key ? "filter active" : "filter"} onClick={() => setFilter(key)}>{label}</button>)}</div><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Buscar usuarios" placeholder="Buscar por nombre o correo" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
                <div className="table-scroll">
                  <table><thead><tr><th>USUARIO</th><th>TIPO</th><th>REGISTRO</th><th>ESTADO</th><th>PLAN</th><th>PRÓXIMA FECHA / FIN</th></tr></thead><tbody>{visible.map((user) => {
                    const state = stateOf(user);
                    const name = `${user.firstName} ${user.lastName}`.trim() || "Sin nombre";
                    return <tr key={user.id}><td><div className="user-cell"><span className="user-avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong><small>{user.email}</small></span></div></td><td>{user.profileType === "couple" ? "Pareja" : user.profileType === "single" ? "Individual" : "—"}</td><td>{formatDate(user.createdAt)}</td><td><span className={`status status-${state}`}><span className="status-dot" />{stateLabels[state]}</span></td><td><span className="plan-name">{planLabel(user.plan)}</span></td><td>{state === "lifetime" ? "Sin vencimiento" : formatDate(user.currentPeriodEnd)}</td></tr>;
                  })}</tbody></table>
                  {visible.length === 0 && <div className="empty-state"><span>⌕</span><h3>No hay usuarios para mostrar</h3><p>{group.length === 0 ? "Todavía no hay usuarios en esta sección." : "Probá con otra búsqueda o filtro."}</p></div>}
                </div>
                <div className="panel-footer">Mostrando {visible.length} usuario{visible.length === 1 ? "" : "s"}<span>{view === "app" ? "La prueba se muestra cuando RevenueCat la confirma." : "Los accesos vitalicios no tienen fecha de vencimiento."}</span></div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
