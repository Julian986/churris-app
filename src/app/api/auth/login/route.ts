import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  isPasswordValid,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userName?: string; password?: string };
    const userName = (body.userName ?? "").trim();
    const password = body.password ?? "";

    if (userName.length < 2 || password.length === 0) {
      return NextResponse.json({ message: "Usuario o contrasena invalida." }, { status: 400 });
    }

    if (!isPasswordValid(password)) {
      return NextResponse.json({ message: "Contrasena incorrecta." }, { status: 401 });
    }

    const token = createSessionToken(userName);
    const response = NextResponse.json({ userName });

    response.cookies.set({
      name: getSessionCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getSessionMaxAgeSeconds(),
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ message: "No se pudo iniciar sesion." }, { status: 500 });
  }
}
