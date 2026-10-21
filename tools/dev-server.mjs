// dev-server.mjs — servidor de pruebas en local que imita a Vercel:
// sirve la web estática y ejecuta las funciones de /api con el mismo código.
// Uso: node tools/dev-server.mjs [puerto]. No se publica (está en .vercelignore).
// Las claves se leen de «Web Autoría - privado/.env.local» (fuera de la web).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || process.env.PORT || 8088);
const ENV_FILE = path.join(ROOT, "..", "Web Autoría - privado", ".env.local");

if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".mp4": "video/mp4", ".ico": "image/x-icon"
};

async function runFunction(name, req, res) {
  // Igual que en Vercel: todo pasa por api/index.js (ver «rewrites» en vercel.json).
  const mod = await import(pathToFileURL(path.join(ROOT, "api", "index.js")).href);
  const u = new URL(req.url, "http://" + req.headers.host);
  u.searchParams.set("ruta", name);
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const request = new Request(u, { method: req.method, headers: req.headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: "half" });
  const response = await mod.default.fetch(request);
  const headers = {};
  response.headers.forEach((v, k) => { if (k !== "set-cookie") headers[k] = v; });
  const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://x");
    if (pathname === "/panel") return await runFunction("panel", req, res);
    if (pathname.startsWith("/api/")) return await runFunction(pathname.slice(5).replace(/\/$/, ""), req, res);
    let rel = decodeURIComponent(pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.normalize(path.join(ROOT, rel));
    const blocked = /[\\/](tools|\.claude)[\\/]|[\\/]api[\\/]|package\.json$|vercel\.json$/.test(file.slice(ROOT.length));
    if (!file.startsWith(ROOT) || blocked || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500).end("Error");
  }
}).listen(PORT, () => console.log("Autoría en local: http://localhost:" + PORT + (process.env.GEMINI_API_KEY ? " (IA activa)" : " (sin clave de IA)")));
