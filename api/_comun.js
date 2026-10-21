// comun.js — utilidades compartidas por las funciones de Autoría en Vercel
// (asistente, lector de perfil, diagnóstico, contacto y panel).
// La clave de la IA y el acceso a la base de datos viven en las variables de
// entorno de Vercel: nunca llegan al navegador.
import crypto from "node:crypto";

// Modelos de Gemini en orden de preferencia (si uno falla o está saturado, se prueba el siguiente).
// Se pueden cambiar sin tocar código con las variables GEMINI_MODELOS_CHAT y GEMINI_MODELOS_LECTURA.
export const MODELOS_CHAT = (process.env.GEMINI_MODELOS_CHAT || "gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.5-flash").split(",").map((s) => s.trim()).filter(Boolean);
export const MODELOS_LECTURA = (process.env.GEMINI_MODELOS_LECTURA || "gemini-3.5-flash,gemini-flash-lite-latest,gemini-3.5-flash-lite").split(",").map((s) => s.trim()).filter(Boolean);

/* ---------- respuestas ---------- */
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra }
  });
}

// Solo peticiones desde la propia web (evita que otras webs gasten la cuota).
export function sameOrigin(request) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase().replace(/:\d+$/, "");
  const src = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!src) return true;
  try { return new URL(src).hostname.toLowerCase() === host; } catch (_) { return false; }
}

export function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for") || "";
  return (xff.split(",")[0] || request.headers.get("x-real-ip") || "0.0.0.0").trim();
}
const ipHash = (ip) => crypto.createHash("sha256").update("autoria:" + ip).digest("hex").slice(0, 24);

/* ---------- textos ---------- */
export function cleanStr(v, max = 300) {
  if (v == null || typeof v === "object") return "";
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
export function strOrNull(v, max = 300) {
  const s = cleanStr(v, max);
  return s === "" || s.toLowerCase() === "null" ? null : s;
}
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 160;
export function newId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return String(d.getUTCFullYear()).slice(2) + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "-" + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + "-" + crypto.randomBytes(3).toString("hex");
}

/* ---------- base de datos (Upstash Redis vía REST) ----------
   Variables que crea Vercel al conectar Upstash: KV_REST_API_URL y
   KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN).
   Sin base de datos se usa memoria (solo para pruebas en local). */
const DB_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const DB_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const hasDb = () => !!(DB_URL && DB_TOKEN);
const mem = globalThis.__autoriaMem || (globalThis.__autoriaMem = { lists: new Map(), counters: new Map() });

async function redis(commands) {
  const r = await fetch(DB_URL.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + DB_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error("redis http " + r.status);
  const out = await r.json();
  return out.map((x) => (x && "result" in x ? x.result : null));
}

const LISTA = "autoria:registros";

export async function storeRecord(row) {
  const line = JSON.stringify(row);
  if (hasDb()) {
    try { await redis([["LPUSH", LISTA, line]]); return true; }
    catch (e) { console.error("[autoria-db]", e.message); }
  } else {
    const l = mem.lists.get(LISTA) || [];
    l.unshift(line); mem.lists.set(LISTA, l.slice(0, 2000));
    if (process.env.VERCEL) console.log("[autoria-registro-sin-base-de-datos]", line);
    return !process.env.VERCEL;
  }
  console.log("[autoria-registro-no-guardado]", line);
  return false;
}

export async function readRecords(limit = 2000) {
  let lines = [];
  if (hasDb()) {
    try { lines = (await redis([["LRANGE", LISTA, "0", String(limit - 1)]]))[0] || []; }
    catch (e) { console.error("[autoria-db]", e.message); }
  } else lines = (mem.lists.get(LISTA) || []).slice(0, limit);
  return lines.map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
}

/* ---------- límites de uso ----------
   Por IP (minuto y día) y un tope global diario que protege la cuota
   gratuita de la IA. Devuelve null si se puede seguir, o "min" | "day" | "global". */
export async function rateLimit(request, bucket, perMin, perDay, globalDay) {
  const h = ipHash(clientIp(request));
  const now = Date.now();
  const minute = Math.floor(now / 60000), day = new Date(now).toISOString().slice(0, 10);
  const kMin = `rl:${bucket}:m:${h}:${minute}`, kDay = `rl:${bucket}:d:${h}:${day}`, kGlob = `rl:${bucket}:g:${day}`;
  let c;
  if (hasDb()) {
    try {
      c = await redis([["INCR", kMin], ["EXPIRE", kMin, "70"], ["INCR", kDay], ["EXPIRE", kDay, "90000"], ["INCR", kGlob], ["EXPIRE", kGlob, "90000"]]);
      c = [c[0], c[2], c[4]];
    } catch (e) { console.error("[autoria-rl]", e.message); return null; }
  } else {
    const inc = (k, ttl) => {
      const cur = mem.counters.get(k);
      const v = cur && cur.exp > now ? cur.v + 1 : 1;
      mem.counters.set(k, { v, exp: cur && cur.exp > now ? cur.exp : now + ttl * 1000 });
      return v;
    };
    c = [inc(kMin, 70), inc(kDay, 90000), inc(kGlob, 90000)];
  }
  if (c[0] > perMin) return "min";
  if (c[1] > perDay) return "day";
  if (c[2] > globalDay) return "global";
  return null;
}

/* ---------- Google Gemini ---------- */
export const geminiKey = () => {
  const k = (process.env.GEMINI_API_KEY || "").trim();
  return /^[A-Za-z0-9._-]{20,}$/.test(k) ? k : "";
};

// Llama a Gemini probando los modelos en orden. Pide el mínimo «razonamiento»
// (respuestas rápidas); si un modelo no admite ese ajuste, repite sin él.
// timeoutMs es el tiempo máximo por modelo; deadlineMs, el total.
export async function geminiCall(models, payload, timeoutMs = 25000, deadlineMs = 52000) {
  const key = geminiKey();
  if (!key) return { text: "", error: "sin_clave" };
  const start = Date.now();
  let lastErr = "";
  for (const model of models) {
    for (const thinking of [true, false]) {
      const left = deadlineMs - (Date.now() - start);
      if (left < 3000) break;
      const body = JSON.parse(JSON.stringify(payload));
      body.generationConfig = body.generationConfig || {};
      delete body.generationConfig.thinkingConfig;
      if (thinking) body.generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
      try {
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(timeoutMs, left))
        });
        const raw = await r.text();
        if (!r.ok) {
          lastErr = `${model} http ${r.status} ${raw.slice(0, 200)}`;
          if (thinking && r.status === 400) continue;   // no admite el ajuste: repetir sin él
          break;                                        // saturado, retirado, etc.: siguiente modelo
        }
        const data = JSON.parse(raw);
        const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
        const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join("");
        if (text.trim()) return { text, error: "", model };
        lastErr = `${model} vacío (${(data.promptFeedback && data.promptFeedback.blockReason) || (data.candidates && data.candidates[0] && data.candidates[0].finishReason) || "?"})`;
        break;
      } catch (e) { lastErr = `${model} ${e.message}`; break; }
    }
  }
  console.error("[autoria-ia]", lastErr);
  return { text: "", error: lastErr || "ia" };
}

export function extractJson(s) {
  s = String(s || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try { const d = JSON.parse(s.slice(a, b + 1)); return d && typeof d === "object" ? d : null; } catch (_) { return null; }
}

/* ---------- aviso por email al equipo (opcional, con Resend) ---------- */
export async function notifyTeam(asunto, row) {
  const key = process.env.RESEND_API_KEY, to = process.env.AVISO_EMAIL;
  if (!key || !to) return false;
  const texto = Object.entries(row).map(([k, v]) => k.padEnd(16) + ": " + (v == null || v === "" ? "—" : (typeof v === "object" ? JSON.stringify(v, null, 2) : v))).join("\n");
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.AVISO_REMITENTE || "Autoría <onboarding@resend.dev>", to: to.split(",").map((s) => s.trim()), subject: asunto, text: texto }),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) console.error("[autoria-aviso] http", r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error("[autoria-aviso]", e.message); return false; }
}
