// /api/diagnostico — guarda el contacto (con consentimiento) y genera con IA
// el diagnóstico de marca personal a partir del perfil y las respuestas.
import { json, sameOrigin, cleanStr, isEmail, rateLimit, geminiKey, geminiCall, extractJson, storeRecord, notifyTeam, newId, MODELOS_LECTURA } from "./_comun.js";

const OBJETIVOS = { clientes: "conseguir clientes", inversores: "atraer inversores", talento: "atraer talento", autoridad: "ganar autoridad en su sector" };

const SYSTEM = `Eres el estratega de marca personal de Autoría, una agencia que convierte el conocimiento de empresarios, directivos y profesionales expertos en una marca personal en redes sociales (LinkedIn, Instagram, YouTube, TikTok u otras, según el objetivo y el público de cada persona), con vídeos contados con su propia voz. Sus formatos de vídeo son: «Ideas en 60» (vertical, 60 segundos, una idea), «La conversación» (entrevista: le preguntamos lo que preguntaría su cliente ideal) y «Lo que vi» (crónica de algo vivido y la lección que saca).

Escribes diagnósticos breves, honestos y concretos, con tono editorial y sobrio, en español neutro y tuteando. Sin jerga de marketing, sin emojis, sin exageraciones.

REGLAS OBLIGATORIAS
- Básate SOLO en los datos recibidos. No inventes logros, cifras, años de experiencia, clientes, empresas, premios ni datos que no estén. Si algo aparece como «(no aparece)», puedes señalar su ausencia como punto débil, pero nunca rellenarlo.
- No prometas seguidores, visualizaciones, clientes, ventas ni resultados garantizados.
- Los puntos fuertes deben ser reales y específicos de su perfil; si el perfil tiene pocos datos, sé prudente y habla de lo que sí se ve (por ejemplo, su cargo o su experiencia).
- El titular propuesto: dice a quién ayuda y cómo, usando solo información presente en los datos o en sus respuestas. Adáptalo a la red del perfil: en LinkedIn, el titular bajo el nombre (máximo 200 caracteres); en Instagram, TikTok, YouTube, X u otras, la bio del perfil (máximo 150 caracteres). Si no se sabe la red, escribe uno que sirva como bio en cualquiera (máximo 150 caracteres). Sin emojis ni hashtags. En el idioma del perfil (español por defecto).
- Las redes: recomienda una o dos en las que centrarse, según su objetivo y a quién quiere llegar (por ejemplo, LinkedIn para clientes de empresa, inversores o talento; Instagram, YouTube o TikTok para llegar a un público más amplio). No recomiendes estar en todas. Si su perfil es de una red, tenlo en cuenta, pero no la des por buena sin más.
- Las tres ideas de vídeo: una por formato, en este orden: «Ideas en 60», «La conversación», «Lo que vi». Deben basarse en su experiencia, su sector, su objetivo y su público. El gancho es la primera frase que diría a cámara (máximo 20 palabras), natural y concreta. Nunca inventes anécdotas, reuniones, casos ni hechos vividos. La idea «Lo que vi» se plantea SIEMPRE como propuesta para que la persona la cuente con su experiencia real: su gancho empieza por «Cuenta…» o «Recuerda…» y deja entre [corchetes] lo que debe completar (por ejemplo: «Cuenta [una reunión reciente] en la que…»).
- Nunca menciones precios, tarifas, cuotas, planes, paquetes ni condiciones comerciales. El siguiente paso siempre es una llamada con el equipo de Autoría.
- Si el país es Costa Rica, evita expresiones propias de España.
- Devuelve EXCLUSIVAMENTE un objeto JSON válido con las claves indicadas.`;

const FORMATO_SALIDA = `Devuelve este JSON:
{
  "resumen": "dos frases sobre cómo se le ve hoy en redes y qué oportunidad tiene",
  "puntos_fuertes": ["tres frases breves"],
  "puntos_debiles": ["tres frases breves"],
  "titular_propuesto": "texto",
  "titular_por_que": "una frase",
  "ideas_video": [
    { "formato": "Ideas en 60", "titulo": "título corto", "gancho": "primera frase a cámara", "por_que": "una frase" },
    { "formato": "La conversación", "titulo": "...", "gancho": "...", "por_que": "..." },
    { "formato": "Lo que vi", "titulo": "...", "gancho": "...", "por_que": "..." }
  ],
  "redes": ["una o dos redes en las que centrarse, por su nombre (LinkedIn, Instagram, YouTube, TikTok…)"],
  "redes_por_que": "dos frases sobre por qué esas redes, según su objetivo y su público",
  "ritmo_por_que": "dos frases sobre por qué le encaja el ritmo de publicación recomendado, según su objetivo, su tiempo y si se ve grabándose",
  "primer_paso": "una frase que invite a reservar una llamada con el equipo para revisar el diagnóstico y ponerlo en marcha"
}`;

export async function POST(request) {
  if (!sameOrigin(request)) return json({ ok: false, reason: "origin" }, 403);
  let input;
  try { input = await request.json(); } catch (_) { return json({ ok: false, reason: "input" }, 400); }
  if (!input || typeof input !== "object") return json({ ok: false, reason: "input" }, 400);

  const email = cleanStr(input.email, 160);
  if (!isEmail(email)) return json({ ok: false, reason: "email" });
  if (!input.consent) return json({ ok: false, reason: "consent" });

  const limit = await rateLimit(request, "diag", 4, 15, 300);
  if (limit) return json({ ok: false, reason: "rate_" + limit });

  const pi = input.perfil && typeof input.perfil === "object" ? input.perfil : {};
  const perfil = {
    nombre: cleanStr(pi.nombre, 120), titular: cleanStr(pi.titular, 300), cargo_actual: cleanStr(pi.cargo_actual, 160),
    empresa_actual: cleanStr(pi.empresa_actual, 160), sector: cleanStr(pi.sector, 120), experiencia: cleanStr(pi.experiencia, 1500),
    extracto: cleanStr(pi.extracto, 2600), red: cleanStr(pi.red, 20), origen: cleanStr(pi.origen, 20)
  };
  const ri = input.respuestas && typeof input.respuestas === "object" ? input.respuestas : {};
  const resp = {
    objetivo: cleanStr(ri.objetivo, 20), publico: cleanStr(ri.publico, 300), frecuencia: cleanStr(ri.frecuencia, 80),
    tiempo: cleanStr(ri.tiempo, 80), camara: cleanStr(ri.camara, 80)
  };
  const ci = input.calculo && typeof input.calculo === "object" ? input.calculo : {};
  const calculo = {};
  for (const k of ["tarifa", "horasVideo", "horasPost", "videos", "posts", "horasMes", "valorMes"]) calculo[k] = Number.isFinite(Number(ci[k])) ? Math.round(Number(ci[k]) * 100) / 100 : null;
  calculo.moneda = cleanStr(ci.moneda, 4);
  const ri2 = input.ritmo && typeof input.ritmo === "object" ? input.ritmo : {};
  const entero = (v, min, max, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min && n <= max ? n : def; };
  const ritmo = { videos: entero(ri2.videos, 1, 30, 6), posts: entero(ri2.posts, 0, 30, 3) };
  const ritmoTxt = ritmo.videos + " vídeos y " + ritmo.posts + " posts al mes";
  const pais = input.pais === "CR" ? "CR" : "ES";
  const nombre = cleanStr(input.nombre, 120) || perfil.nombre;

  const id = newId();
  const row = {
    id, fecha: new Date().toISOString(), tipo: "diagnostico", nombre, email,
    telefono: cleanStr(input.telefono, 30).replace(/[^0-9+\s]/g, ""),
    pais: pais === "CR" ? "Costa Rica" : "España", perfil, respuestas: resp, calculo, ritmo: ritmoTxt,
    indice: Number.isFinite(Number(input.indice)) ? Math.round(Number(input.indice)) : null,
    consentimiento: "Sí (" + new Date().toISOString() + ")"
  };
  const guardado = await storeRecord(row);
  await notifyTeam("Nuevo diagnóstico — " + (nombre || email), {
    nombre, email, pais: row.pais, objetivo: resp.objetivo, publico: resp.publico, ritmo: row.ritmo, titular: perfil.titular, cargo: perfil.cargo_actual
  });

  if (!geminiKey()) return json({ ok: true, id, guardado, resultado: null, reason: "sin_clave" });

  const datos = {
    pais: row.pais,
    perfil: Object.fromEntries(Object.entries(perfil).filter(([k]) => k !== "origen").map(([k, v]) => [k, v || "(no aparece)"])),
    objetivo: OBJETIVOS[resp.objetivo] || resp.objetivo || "(no indicado)",
    a_quien_quiere_llegar: resp.publico || "(no indicado)",
    cuanto_publica_hoy: resp.frecuencia || "(no indicado)",
    tiempo_disponible: resp.tiempo || "(no indicado)",
    se_ve_grabandose: resp.camara || "(no indicado)",
    ritmo_recomendado: ritmoTxt
  };

  const { text } = await geminiCall(MODELOS_LECTURA, {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: "Datos de la persona (JSON):\n" + JSON.stringify(datos, null, 2) + "\n\n" + FORMATO_SALIDA }] }],
    generationConfig: { temperature: 0.55, maxOutputTokens: 2000, responseMimeType: "application/json" }
  }, 25000, 52000);
  const r = text ? extractJson(text) : null;

  let res = null;
  if (r) {
    const list = (v, n, max) => (Array.isArray(v) ? v : []).map((x) => cleanStr(x, max)).filter(Boolean).slice(0, n);
    const FORMATOS = ["Ideas en 60", "La conversación", "Lo que vi"];
    const ideas = (Array.isArray(r.ideas_video) ? r.ideas_video : []).slice(0, 3).filter((i) => i && typeof i === "object").map((i, n) => ({
      formato: cleanStr(i.formato, 40) || FORMATOS[n], titulo: cleanStr(i.titulo, 140), gancho: cleanStr(i.gancho, 220), por_que: cleanStr(i.por_que, 260)
    }));
    res = {
      resumen: cleanStr(r.resumen, 500),
      puntos_fuertes: list(r.puntos_fuertes, 3, 260),
      puntos_debiles: list(r.puntos_debiles, 3, 260),
      titular_propuesto: cleanStr(r.titular_propuesto, 220),
      titular_por_que: cleanStr(r.titular_por_que, 300),
      ideas_video: ideas,
      redes: list(r.redes, 2, 30),
      redes_por_que: cleanStr(r.redes_por_que, 400),
      ritmo_por_que: cleanStr(r.ritmo_por_que, 500),
      primer_paso: cleanStr(r.primer_paso, 300)
    };
    if (!res.puntos_fuertes.length || !res.titular_propuesto || !ideas.length) res = null;
  }

  await storeRecord({ id, fecha: new Date().toISOString(), tipo: "diagnostico-resultado", resultado: res, error: res ? null : "ia" });
  return json({ ok: true, id, guardado, resultado: res, reason: res ? null : "ia" });
}
