import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "churris_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getAuthSecret() {
  const secret = process.env.APP_PASSWORD;

  if (!secret) {
    throw new Error("Falta configurar APP_PASSWORD en el entorno.");
  }

  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(payloadBase64: string, secret: string) {
  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

export function createSessionToken(userName: string) {
  const secret = getAuthSecret();
  const payload = {
    userName,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64, secret);

  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string) {
  const [payloadBase64, signature] = token.split(".");

  if (!payloadBase64 || !signature) {
    return null;
  }

  const secret = getAuthSecret();
  const expectedSignature = signPayload(payloadBase64, secret);

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  const payloadText = Buffer.from(payloadBase64, "base64url").toString("utf8");
  const payload = JSON.parse(payloadText) as { userName?: string; exp?: number };

  if (!payload.userName || typeof payload.exp !== "number") {
    return null;
  }

  if (Math.floor(Date.now() / 1000) >= payload.exp) {
    return null;
  }

  return payload.userName;
}

export function getAuthenticatedUserName(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}

export function isPasswordValid(password: string) {
  return password === getAuthSecret();
}
