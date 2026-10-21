// api/index.js — única función de Vercel. Recibe /api/<ruta> y /panel
// (ver «rewrites» en vercel.json) y reparte cada petición a su módulo.
// Los módulos empiezan por «_» para que Vercel no los publique por separado.
import * as asistente from "./_asistente.js";
import * as lector from "./_lector-perfil.js";
import * as diagnostico from "./_diagnostico.js";
import * as contacto from "./_contacto.js";
import * as panel from "./_panel.js";
import { json } from "./_comun.js";

const RUTAS = { asistente, "lector-perfil": lector, diagnostico, contacto, panel };

function ruta(request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("ruta");
  if (q) return q.replace(/\/+$/, "");
  if (url.pathname.replace(/\/+$/, "") === "/panel") return "panel";
  const m = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/);
  return m ? m[1] : "";
}

export default {
  async fetch(request) {
    const mod = RUTAS[ruta(request)];
    if (!mod) return json({ ok: false, reason: "no_existe" }, 404);
    const handler = mod[request.method];
    if (!handler) return json({ ok: false, reason: "metodo" }, 405);
    try { return await handler(request); }
    catch (e) {
      console.error("[autoria]", e);
      return json({ ok: false, reason: "error" }, 500);
    }
  }
};
