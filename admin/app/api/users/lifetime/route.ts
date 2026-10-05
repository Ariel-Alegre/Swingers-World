import { NextRequest, NextResponse } from "next/server";
import { apiUrl, SESSION_COOKIE } from "../../../lib/admin-api";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Origen no permitido." }, { status: 403 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Iniciá sesión como administrador." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  }

  const { firstName, lastName, email, password, profileType, gender, partnerFirstName, partnerLastName, coupleType, termsAccepted } = body as Record<string, unknown>;
  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof termsAccepted !== "boolean" ||
    (profileType !== "single" && profileType !== "couple") ||
    (profileType === "single" && gender !== "Male" && gender !== "Female") ||
    (profileType === "couple" && (
      typeof partnerFirstName !== "string" || !partnerFirstName.trim() ||
      typeof partnerLastName !== "string" || !partnerLastName.trim() ||
      !["woman_man", "two_women", "two_men", "other"].includes(String(coupleType))
    ))
  ) {
    return NextResponse.json({ message: "Completá todos los datos requeridos." }, { status: 400 });
  }

  try {
    const response = await fetch(apiUrl("/api/admin/users/lifetime"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ firstName, lastName, email, password, profileType, gender, partnerFirstName, partnerLastName, coupleType, termsAccepted }),
      cache: "no-store",
    });
    const data = (await response.json()) as { message?: string; user?: { id?: string; email?: string } };

    if (!response.ok) {
      const message = response.status === 409
        ? "Ya existe un usuario con ese correo."
        : response.status === 401 || response.status === 403
          ? "Tu sesión venció. Volvé a iniciar sesión."
          : response.status === 400
            ? data.message || "Revisá los datos ingresados."
            : "No se pudo crear el usuario.";
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json({ id: data.user?.id, email: data.user?.email }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "No se pudo conectar con el servidor." }, { status: 502 });
  }
}
