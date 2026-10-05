"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ sessionExpired = false }: { sessionExpired?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(sessionExpired ? "Tu sesión venció. Iniciá sesión de nuevo." : "");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(result.message || "No se pudo iniciar sesión.");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-glow" />
      <div className="login-card">
        <div className="brand-mark">SW</div>
        <p className="eyebrow">SWINGERS WORLD · ADMIN</p>
        <h1>Tu comunidad, en un solo lugar.</h1>
        <p className="login-intro">Ingresá para ver los registros y el estado de las suscripciones.</p>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="email">Correo de administrador</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="admin@ejemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar al panel"} <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>
      <p className="login-footer">Acceso exclusivo para administradores</p>
    </main>
  );
}
