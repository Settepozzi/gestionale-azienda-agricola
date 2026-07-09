import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "sessione";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 giorni

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
  sezioni: string; // CSV: "SUINI,BIOGAS,…"
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET non impostato nelle variabili d'ambiente.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    // Compatibilità: il vecchio ruolo VETERINARIO diventa VETERINARIO_SUINI
    let role = payload.role as string;
    if (role === "VETERINARIO") role = "VETERINARIO_SUINI";
    // I ruoli veterinario hanno la sezione fissa, qualunque cosa dica il token
    let sezioni =
      (payload.sezioni as string | undefined) ??
      (role === "ADMIN" ? "SUINI,AVICOLI,BIOGAS,FOTOVOLTAICO,AGRITURISMO" : "SUINI");
    if (role === "VETERINARIO_SUINI") sezioni = "SUINI";
    if (role === "VETERINARIO_AVICOLI") sezioni = "AVICOLI";
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role,
      sezioni,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export { COOKIE_NAME };
