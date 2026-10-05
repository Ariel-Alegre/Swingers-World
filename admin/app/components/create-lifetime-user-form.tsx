"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CreateLifetimeUserForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileType, setProfileType] = useState<"single" | "couple" | "">("");
  const [gender, setGender] = useState("");
  const [partnerFirstName, setPartnerFirstName] = useState("");
  const [partnerLastName, setPartnerLastName] = useState("");
  const [coupleType, setCoupleType] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreatedEmail("");
    setLoading(true);
    try {
      const response = await fetch("/api/users/lifetime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, profileType, gender: profileType === "single" ? gender : null, partnerFirstName: profileType === "couple" ? partnerFirstName : null, partnerLastName: profileType === "couple" ? partnerLastName : null, coupleType: profileType === "couple" ? coupleType : null, termsAccepted }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(result.message || "No se pudo crear el usuario.");
        return;
      }

      setCreatedEmail(email.trim().toLowerCase());
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setProfileType("");
      setGender("");
      setPartnerFirstName("");
      setPartnerLastName("");
      setCoupleType("");
      setTermsAccepted(false);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-user-page">
      <button className="back-link" type="button" onClick={onBack}>← Volver a usuarios</button>
      <div className="create-user-heading">
        <p className="eyebrow">GESTIÓN DE USUARIOS</p>
        <h1>Registrar usuario</h1>
        <p>Creá una cuenta con acceso vitalicio a la app, sin prueba ni cobro recurrente.</p>
      </div>
      <div className="create-user-layout">
        <form className="create-user-card" onSubmit={submit}>
          <h2>Datos de acceso</h2>
          <p>El usuario podrá iniciar sesión con este correo y la contraseña que definas.</p>
          <div className="form-two-columns">
            <label>Nombre<input required maxLength={80} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Nombre" /></label>
            <label>Apellido<input required maxLength={80} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Apellido" /></label>
          </div>
          <label>Tipo de perfil<select required value={profileType} onChange={(event) => setProfileType(event.target.value as "single" | "couple" | "")}><option value="">Seleccioná una opción</option><option value="single">Individual</option><option value="couple">Pareja</option></select></label>
          {profileType === "single" && <label>Género<select required value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Seleccioná una opción</option><option value="Male">Hombre</option><option value="Female">Mujer</option></select></label>}
          {profileType === "couple" && <>
            <div className="form-two-columns">
              <label>Nombre de la otra persona<input required maxLength={80} value={partnerFirstName} onChange={(event) => setPartnerFirstName(event.target.value)} placeholder="Nombre" /></label>
              <label>Apellido de la otra persona<input required maxLength={80} value={partnerLastName} onChange={(event) => setPartnerLastName(event.target.value)} placeholder="Apellido" /></label>
            </div>
            <label>Composición de la pareja<select required value={coupleType} onChange={(event) => setCoupleType(event.target.value)}><option value="">Seleccioná una opción</option><option value="woman_man">Mujer y hombre</option><option value="two_women">Dos mujeres</option><option value="two_men">Dos hombres</option><option value="other">Otra</option></select></label>
          </>}
          <label>Correo electrónico<input required type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="usuario@ejemplo.com" /></label>
          <label>Contraseña inicial<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 12 caracteres" /></label>
          <p className="form-hint">No se enviará ningún correo. Compartí las credenciales con el usuario por un canal seguro.</p>
          <label className="consent-label"><input required type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>{profileType === "couple" ? "Confirmo que ambas personas son mayores de 18 años y aceptaron los términos y la política de privacidad." : "Confirmo que el usuario es mayor de 18 años y aceptó los términos y la política de privacidad."}</span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {createdEmail && <div className="form-success" role="status"><strong>Usuario creado correctamente.</strong><span>{createdEmail} ya tiene acceso vitalicio. No se envió ningún correo.</span></div>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Creando usuario…" : "Crear con acceso vitalicio"}</button>
        </form>
        <div className="access-info-card">
          <span className="access-info-icon">✦</span>
          <h2>Acceso lifetime</h2>
          <p>Este usuario podrá usar la app sin comprar un plan en Google Play ni pasar por la prueba de 7 días.</p>
          <div className="access-info-row"><span>Duración</span><strong>Sin vencimiento</strong></div>
          <div className="access-info-row"><span>Cobro</span><strong>Ninguno</strong></div>
          <div className="access-info-row"><span>Correo automático</span><strong>No se envía</strong></div>
        </div>
      </div>
    </div>
  );
}
