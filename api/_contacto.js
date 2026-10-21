// /api/contacto — guarda las solicitudes del formulario de contacto en la
// base de datos y, si está configurado, avisa por email al equipo.
import { json, sameOrigin, cleanStr, isEmail, rateLimit, storeRecord, notifyTeam, newId } from "./_comun.js";

export async function POST(request) {
  if (!sameOrigin(request)) return json({ ok: false, reason: "origin" }, 403);
  let input = {};
  try { input = await request.json(); } catch (_) {}

  // Campo trampa para robots: si viene relleno, se responde ok sin guardar.
  if (cleanStr(input.web, 200)) return json({ ok: true });

  const nombre = cleanStr(input.nombre, 120);
  const email = cleanStr(input.email, 160);
  if (!nombre || !isEmail(email)) return json({ ok: false, reason: "datos" });
  if (!input.consent) return json({ ok: false, reason: "consent" });

  const limit = await rateLimit(request, "contacto", 4, 20, 500);
  if (limit) return json({ ok: false, reason: "rate_" + limit });

  const row = {
    id: newId(), fecha: new Date().toISOString(), tipo: "contacto", nombre, email,
    telefono: cleanStr(input.telefono, 30).replace(/[^0-9+\s]/g, ""),
    pais: cleanStr(input.pais, 40), cargo: cleanStr(input.cargo, 160), motivo: cleanStr(input.motivo, 60),
    mensaje: cleanStr(input.mensaje, 2000), consentimiento: "Sí (" + new Date().toISOString() + ")"
  };
  const guardado = await storeRecord(row);
  const avisado = await notifyTeam("Nuevo contacto — " + row.motivo + " — " + nombre, row);
  return json({ ok: guardado || avisado });
}
