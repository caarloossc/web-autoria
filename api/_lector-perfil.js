// /api/lector-perfil — lee con IA las capturas del perfil en cualquier red social
// (o el PDF de LinkedIn) y devuelve los datos en JSON. Lo que no aparece en el
// documento vuelve vacío: nunca se inventa. El documento no se guarda.
import { json, sameOrigin, rateLimit, geminiKey, geminiCall, extractJson, strOrNull, MODELOS_LECTURA } from "./_comun.js";

const fail = (reason, status = 200) => json({ ok: false, reason }, status);
const REDES = ["LinkedIn", "Instagram", "TikTok", "YouTube", "X", "Facebook", "Otra"];
const MAX_TOTAL = 4 * 1024 * 1024; // Vercel admite hasta 4,5 MB por petición

// Tipo real del archivo según sus primeros bytes.
function sniff(buf) {
  const s = (a, b) => buf.subarray(a, b).toString("latin1");
  if (s(0, 5) === "%PDF-") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && s(1, 4) === "PNG") return "image/png";
  if (s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return "image/webp";
  if (s(4, 8) === "ftyp" && /heic|heix|mif1|msf1|heif/.test(s(8, 12))) return "image/heic";
  return "";
}

const INSTR = `Eres un extractor de datos de perfiles profesionales en redes sociales (LinkedIn, Instagram, TikTok, YouTube, X, Facebook u otras). Recibes el PDF que LinkedIn genera desde un perfil («Guardar en PDF») o una o varias capturas de pantalla de un perfil de cualquier red. Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, con EXACTAMENTE estas claves:

{
  "es_perfil": true o false,
  "red": "LinkedIn" | "Instagram" | "TikTok" | "YouTube" | "X" | "Facebook" | "Otra" | null,
  "nombre": string o null,
  "titular": string o null,
  "cargo_actual": string o null,
  "empresa_actual": string o null,
  "sector": string o null,
  "ubicacion": string o null,
  "anos_experiencia": number o null,
  "experiencia": [ { "cargo": string, "empresa": string o null, "periodo": string o null } ],
  "extracto": string o null,
  "aptitudes": [ string ]
}

Reglas estrictas:
- Copia los textos tal y como aparecen en el documento, en su idioma original. No los reescribas, no los resumas, no los mejores ni corrijas.
- Si un dato NO aparece de forma explícita en el documento, pon null (o [] en las listas). No lo deduzcas, no lo supongas, no lo inventes.
- "red": la red social a la que pertenece el perfil, según su aspecto o lo que se lea en él. El PDF de «Guardar en PDF» es de LinkedIn. Si no se puede saber con seguridad, null.
- "titular": en LinkedIn, la línea descriptiva que aparece bajo el nombre; en otras redes, la bio o descripción corta del perfil.
- "cargo_actual" y "empresa_actual": los del puesto más reciente que figure como actual, o los que el perfil indique expresamente. Si no aparecen de forma explícita, null.
- "sector": solo si el documento indica expresamente un sector o industria. Si no lo indica, null.
- "extracto": el texto completo de la sección «Extracto» o «Acerca de», o la descripción larga del perfil o del canal (máximo 2000 caracteres). Si no existe, null.
- "experiencia": hasta 8 puestos, del más reciente al más antiguo, con el periodo tal y como aparece.
- "anos_experiencia": solo si el propio documento indica duraciones o fechas suficientes para calcularlo con seguridad; si no, null.
- "aptitudes": hasta 10, solo si aparecen en una sección de aptitudes.
- No copies cifras de seguidores, visualizaciones ni publicaciones.
- "es_perfil": false si el documento no parece el perfil de una persona o profesional en una red social.`;

export async function POST(request) {
  if (!sameOrigin(request)) return fail("origin", 403);
  let form;
  try { form = await request.formData(); } catch (_) { return fail("subida"); }
  if (!form.get("consent")) return fail("consent");
  if (!geminiKey()) return fail("sin_clave");

  const files = form.getAll("archivo[]").filter((f) => f && typeof f.arrayBuffer === "function").slice(0, 3);
  if (!files.length) return fail("sin_archivo");

  let total = 0;
  const parts = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    total += buf.length;
    if (!buf.length) return fail("lectura");
    if (total > MAX_TOTAL) return fail("tamano");
    const mime = sniff(buf);
    if (!mime) return fail("tipo");
    parts.push({ inline_data: { mime_type: mime, data: buf.toString("base64") } });
  }

  const limit = await rateLimit(request, "lector", 5, 25, 300);
  if (limit) return fail("rate_" + limit);

  parts.push({ text: INSTR });
  const { text } = await geminiCall(MODELOS_LECTURA, {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0, maxOutputTokens: 2500, responseMimeType: "application/json" }
  }, 25000, 52000);
  if (!text) return fail("ia");
  const p = extractJson(text);
  if (!p) return fail("ia");

  const experiencia = (Array.isArray(p.experiencia) ? p.experiencia : []).slice(0, 8)
    .filter((e) => e && typeof e === "object" && strOrNull(e.cargo, 160))
    .map((e) => ({ cargo: strOrNull(e.cargo, 160), empresa: strOrNull(e.empresa, 160), periodo: strOrNull(e.periodo, 80) }));
  const aptitudes = (Array.isArray(p.aptitudes) ? p.aptitudes : []).slice(0, 10).map((a) => strOrNull(a, 60)).filter(Boolean);
  const anos = Number(p.anos_experiencia);

  return json({ ok: true, data: {
    es_perfil: p.es_perfil !== false,
    red: REDES.includes(p.red) ? p.red : null,
    nombre: strOrNull(p.nombre, 120),
    titular: strOrNull(p.titular, 300),
    cargo_actual: strOrNull(p.cargo_actual, 160),
    empresa_actual: strOrNull(p.empresa_actual, 160),
    sector: strOrNull(p.sector, 120),
    ubicacion: strOrNull(p.ubicacion, 120),
    anos_experiencia: Number.isFinite(anos) && anos > 0 && anos < 70 ? anos : null,
    experiencia,
    extracto: strOrNull(p.extracto, 2600),
    aptitudes
  } });
}
