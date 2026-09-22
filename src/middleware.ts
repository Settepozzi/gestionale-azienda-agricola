import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { VETERINARIO_PREFISSI, VETERINARIO_ECCEZIONI } from "@/lib/constants";
import { sezioneDaPath, parseSezioni } from "@/lib/sezioni";

const COOKIE_NAME = "sessione";

// Percorsi pubblici (non richiedono login).
const PUBLIC_PATHS = ["/login"];

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET non impostato.");
  return new TextEncoder().encode(secret);
}

type TokenInfo = { role: string; sezioni: string[] };

async function getTokenInfo(token: string | undefined): Promise<TokenInfo | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    let role = String(payload.role ?? "OPERATORE");
    if (role === "VETERINARIO") role = "VETERINARIO_SUINI"; // compatibilità
    let csv =
      (payload.sezioni as string | undefined) ??
      (role === "ADMIN" ? "SUINI,AVICOLI,BIOGAS,FOTOVOLTAICO,AGRITURISMO" : "SUINI");
    // Il ruolo veterinario vincola la sezione, qualunque cosa dica il token
    if (role === "VETERINARIO_SUINI") csv = "SUINI";
    if (role === "VETERINARIO_AVICOLI") csv = "AVICOLI";
    return { role, sezioni: parseSezioni(csv) };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Battito del cron Vercel (tiene sveglio Supabase): sempre libero, nessun dato
  if (pathname === "/api/keepalive") return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const info = await getTokenInfo(token);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const vaiA = (dest: string) => {
    const url = req.nextUrl.clone();
    url.pathname = dest;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Non autenticato su pagina protetta → login
  if (!info && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("da", pathname);
    return NextResponse.redirect(url);
  }

  // Autenticato sulla pagina di login → home
  if (info && isPublic) return vaiA("/");

  if (info) {
    // Gestione utenti: solo ADMIN
    if (pathname.startsWith("/utenti") && info.role !== "ADMIN") {
      return vaiA("/sezioni");
    }

    // Percorsi di piattaforma sempre consentiti agli autenticati
    if (pathname.startsWith("/sezioni") || pathname.startsWith("/utenti")) {
      return NextResponse.next();
    }

    // Controllo di sezione: il percorso appartiene a una sezione abilitata?
    const sezione = sezioneDaPath(pathname);
    if (sezione && !info.sezioni.includes(sezione.id)) {
      return vaiA("/sezioni");
    }

    // Il Veterinario Suini, dentro Suini, vede solo dashboard e riepiloghi (sola lettura)
    if (info.role === "VETERINARIO_SUINI" && sezione?.id === "SUINI" && pathname !== "/") {
      const permesso =
        VETERINARIO_PREFISSI.some((p) => pathname.startsWith(p)) &&
        !VETERINARIO_ECCEZIONI.some((p) => pathname.startsWith(p));
      if (!permesso) return vaiA("/");
    }
  }

  return NextResponse.next();
}

export const config = {
  // Applica a tutte le rotte tranne asset statici e API interne di Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
