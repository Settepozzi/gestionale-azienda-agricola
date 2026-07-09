import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Evita che Next scelga come "root" una cartella superiore per via di altri
  // lockfile presenti nel profilo utente.
  outputFileTracingRoot: __dirname,
  // pdf-parse va caricato da node_modules a runtime (no bundling).
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
