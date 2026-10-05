import { NextRequest, NextResponse } from "next/server";
import { apiUrl, SESSION_COOKIE } from "../../lib/admin-api";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ message: "Origen no permitido." }, { status: 403 });
  }

  let credentials: { email?: unknown; password?: unknown };
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  }

  if (
    !credentials ||
    typeof credentials !== "object" ||
    typeof credentials.email !== "string" ||
    typeof credentials.password !== "string" ||
    !credentials.email.trim() ||
    !credentials.password
  ) {
    return NextResponse.json({ message: "Ingresá tu correo y contraseña." }, { status: 400 });
  }

  try {
    const response = await fetch(apiUrl("/api/admins/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email.trim(), password: credentials.password }),
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 400) {
      return NextResponse.json({ message: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    if (!response.ok) throw new Error("Login failed");

    const data = (await response.json()) as { token?: string; role?: string };
    if (!data.token || data.role !== "admin") {
      return NextResponse.json({ message: "Acceso no autorizado." }, { status: 403 });
    }

    const result = NextResponse.json({ ok: true });
    result.cookies.set(SESSION_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return result;
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor. Intentá de nuevo." },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ message: "Origen no permitido." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
