// /api/panel (se abre como /panel) — panel privado con los contactos y
// diagnósticos recibidos. Contraseña en la variable de entorno PANEL_PASSWORD.
import crypto from "node:crypto";
import { rateLimit, readRecords, hasDb } from "./_comun.js";

const PASS = process.env.PANEL_PASSWORD || "";
const COOKIE = "autoria_panel";
const SECRET = crypto.createHash("sha256").update("autoria-panel:" + PASS).digest();
const TTL = 8 * 3600 * 1000;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const sign = (v) => crypto.createHmac("sha256", SECRET).update(v).digest("hex");
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function isLogged(request) {
  if (!PASS) return false;
  const m = (request.headers.get("cookie") || "").match(new RegExp(COOKIE + "=([0-9]+)\\.([a-f0-9]+)"));
  return !!m && Number(m[1]) > Date.now() && safeEq(sign(m[1]), m[2]);
}
function cookie(request, value, maxAge) {
  const secure = (request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "")) === "https" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
const HEAD = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Frame-Options": "DENY" };
const page = (body, status = 200, extra = {}) => new Response(body, { status, headers: { ...HEAD, ...extra } });
const redirect = (to, setCookie) => new Response(null, { status: 303, headers: { Location: to, "Cache-Control": "no-store", ...(setCookie ? { "Set-Cookie": setCookie } : {}) } });

const STYLE = `
  :root { --paper:#F5F2EB; --paper2:#ECE7DC; --ink:#15161C; --mute:#67655F; --line:rgba(21,22,28,.14); --accent:#E9441F; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--paper); color: var(--ink); line-height: 1.5; }
  .wrap { width: min(100% - 2rem, 1200px); margin: 0 auto; padding: 2rem 0 4rem; }
  h1 { font-family: Georgia, serif; font-weight: 400; font-size: 2rem; letter-spacing: -.02em; }
  h1 span { color: var(--accent); }
  .bar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid var(--ink); margin-bottom: 1.4rem; }
  .btn { display: inline-block; padding: .6rem 1rem; border: 1px solid var(--ink); border-radius: 3px; color: var(--ink); text-decoration: none; font-weight: 600; font-size: .9rem; background: none; cursor: pointer; font-family: inherit; }
  .btn.primary { background: var(--accent); border-color: var(--accent); }
  .login { max-width: 380px; margin: 12vh auto; display: grid; gap: 1rem; }
  input { padding: .8rem; border: 1px solid rgba(21,22,28,.3); border-radius: 3px; font: inherit; background: #fff; }
  .err { color: #B9330F; font-size: .9rem; }
  .meta { color: var(--mute); font-size: .9rem; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 1rem 1.1rem; margin-bottom: .8rem; }
  .card summary { cursor: pointer; display: grid; grid-template-columns: 9rem 7rem 1fr auto; gap: .8rem; align-items: baseline; list-style: none; }
  .card summary::-webkit-details-marker { display: none; }
  .tag { font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; padding: .2rem .45rem; border-radius: 2px; background: var(--paper2); }
  .tag.d { background: var(--accent); }
  .who strong { display: block; }
  .detail { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--line); display: grid; gap: .3rem; font-size: .92rem; }
  .detail dt { font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--mute); }
  .detail dd { margin: 0 0 .6rem; white-space: pre-wrap; }
  .empty { padding: 3rem 0; text-align: center; color: var(--mute); }
  .warn { padding: .9rem 1rem; background: var(--paper2); border-left: 3px solid var(--accent); margin-bottom: 1.2rem; font-size: .92rem; }
  @media (max-width: 720px) { .card summary { grid-template-columns: 1fr; } }`;

const layout = (inner) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Panel · Autoría</title><style>${STYLE}</style></head><body><div class="wrap">${inner}</div></body></html>`;

function loginPage(error) {
  return layout(`<form class="login" method="post" action="/panel" autocomplete="off">
    <h1>Autoría<span>.</span> Panel</h1>
    <p class="meta">Contactos y diagnósticos recibidos desde la web.</p>
    ${PASS ? "" : '<p class="err">El panel aún no tiene contraseña. Añade la variable PANEL_PASSWORD en Vercel.</p>'}
    <label for="clave" class="meta">Contraseña</label>
    <input id="clave" name="clave" type="password" required autofocus>
    <button class="btn primary" type="submit">Entrar</button>
    ${error ? `<p class="err">${esc(error)}</p>` : ""}
  </form>`);
}

async function grouped() {
  const recs = await readRecords();
  const byId = new Map(), results = new Map();
  for (const r of recs) {
    if (r.tipo === "diagnostico-resultado") { if (!results.has(r.id)) results.set(r.id, r.resultado || null); continue; }
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  return Array.from(byId.values()).map((r) => (results.has(r.id) ? { ...r, resultado: results.get(r.id) } : r));
}

function fecha(iso) {
  try { return new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch (_) { return iso || ""; }
}

function listPage(rows) {
  const items = rows.map((r) => {
    const isD = r.tipo === "diagnostico";
    const p = r.perfil || {}, q = r.respuestas || {}, c = r.calculo || {}, res = r.resultado;
    let det = "";
    if (isD) {
      det += `<dt>País · índice orientativo</dt><dd>${esc((r.pais || "") + " · " + (r.indice ?? "—") + "/100")}</dd>`;
      det += `<dt>Titular actual</dt><dd>${esc(p.titular || "—")}</dd>`;
      det += `<dt>Cargo · empresa · sector</dt><dd>${esc([p.cargo_actual, p.empresa_actual, p.sector].filter(Boolean).join(" · ") || "—")}</dd>`;
      det += `<dt>Objetivo · público</dt><dd>${esc((q.objetivo || "—") + " · " + (q.publico || "—"))}</dd>`;
      det += `<dt>Publica hoy · tiempo · cámara</dt><dd>${esc((q.frecuencia || "—") + " · " + (q.tiempo || "—") + " · " + (q.camara || "—"))}</dd>`;
      det += `<dt>Calculadora</dt><dd>${esc((c.horasMes ?? "—") + " h/mes · " + (c.valorMes ?? "—") + " " + (c.moneda || "") + " (tarifa " + (c.tarifa ?? "—") + "/h) frente a cuota " + (c.cuota ?? "—"))}</dd>`;
      if (res) {
        det += `<dt>Resumen</dt><dd>${esc(res.resumen)}</dd><dt>Titular propuesto</dt><dd>${esc(res.titular_propuesto)}</dd>`;
        det += `<dt>Ideas de vídeo</dt><dd>${(res.ideas_video || []).map((i) => esc("«" + i.formato + "» " + i.titulo + " — " + i.gancho)).join("\n")}</dd>`;
      } else det += `<dt>Diagnóstico IA</dt><dd>No se generó. Conviene escribirle personalmente.</dd>`;
    } else {
      det += `<dt>País · cargo</dt><dd>${esc((r.pais || "—") + " · " + (r.cargo || "—"))}</dd><dt>Mensaje</dt><dd>${esc(r.mensaje || "—")}</dd>`;
    }
    det += `<dt>Consentimiento</dt><dd>${esc(r.consentimiento || "—")}</dd>`;
    return `<details class="card"><summary>
      <span class="meta">${esc(fecha(r.fecha))}</span>
      <span><span class="tag ${isD ? "d" : ""}">${isD ? "Diagnóstico" : "Contacto"}</span></span>
      <span class="who"><strong>${esc(r.nombre || "—")}</strong><span class="meta">${esc(r.email || "")}${r.telefono ? " · " + esc(r.telefono) : ""}</span></span>
      <span class="meta">${esc(isD ? "Plan " + (r.plan || "") : (r.motivo || ""))}</span>
    </summary><dl class="detail">${det}</dl></details>`;
  }).join("");
  return layout(`<div class="bar"><div><h1>Autoría<span>.</span> Panel</h1><p class="meta">${rows.length} registros · los más recientes primero</p></div>
    <div><a class="btn" href="/panel?csv=1">Descargar Excel (CSV)</a> <a class="btn" href="/panel?salir=1">Salir</a></div></div>
    ${hasDb() ? "" : '<p class="warn">La base de datos no está conectada: los contactos no se están guardando. Conecta Upstash desde la pestaña «Storage» de tu proyecto en Vercel.</p>'}
    ${rows.length ? items : '<p class="empty">Todavía no ha llegado ningún contacto.</p>'}`);
}

function csv(rows) {
  const cell = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const head = ["fecha", "tipo", "nombre", "email", "telefono", "pais", "motivo/objetivo", "cargo", "plan", "indice", "mensaje/publico", "titular propuesto"];
  const lines = rows.map((r) => [
    r.fecha, r.tipo, r.nombre, r.email, r.telefono, r.pais, r.motivo || (r.respuestas || {}).objetivo,
    r.cargo || (r.perfil || {}).cargo_actual, r.plan, r.indice, r.mensaje || (r.respuestas || {}).publico, (r.resultado || {}).titular_propuesto
  ].map(cell).join(";"));
  return "﻿" + [head.map(cell).join(";")].concat(lines).join("\r\n");
}

export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.has("salir")) return redirect("/panel", cookie(request, "", 0));
  if (!isLogged(request)) return page(loginPage(""));
  const rows = await grouped();
  if (url.searchParams.has("csv")) {
    return new Response(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="autoria-contactos-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  }
  return page(listPage(rows));
}

export async function POST(request) {
  if (await rateLimit(request, "login", 5, 30, 300)) return page(loginPage("Demasiados intentos. Espera unos minutos."), 429);
  let clave = "";
  try { clave = String((await request.formData()).get("clave") || ""); } catch (_) {}
  if (!PASS || !safeEq(crypto.createHash("sha256").update(clave).digest("hex"), crypto.createHash("sha256").update(PASS).digest("hex"))) {
    return page(loginPage("Contraseña incorrecta."), 401);
  }
  const exp = String(Date.now() + TTL);
  return redirect("/panel", cookie(request, exp + "." + sign(exp), TTL / 1000));
}
