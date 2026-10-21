// /api/asistente — el navegador habla con esta función; ella habla con Gemini.
import { json, sameOrigin, cleanStr, rateLimit, geminiKey, geminiCall, MODELOS_CHAT } from "./_comun.js";
import CONOCIMIENTO from "./_conocimiento.js";

const reply = (text, status = 200) => json({ reply: text }, status);

export async function POST(request) {
  if (!sameOrigin(request)) return json({ reply: "" }, 403);
  let input = {};
  try { input = await request.json(); } catch (_) {}
  const message = cleanStr(input.message, 600);
  if (!message) return reply("", 400);

  if (!geminiKey()) return reply("El asistente se está terminando de configurar. Mientras tanto, puedes hacer el diagnóstico gratis o dejarnos tus datos y te escribimos.\n[[DIAGNOSTICO]] [[LLAMADA]]");

  const limit = await rateLimit(request, "chat", 8, 80, 1200);
  if (limit === "min") return reply("Vas muy rápido. Espera unos segundos y vuelve a preguntarme.");
  if (limit === "day") return reply("Hoy ya hemos hablado mucho. Si quieres seguir, reserva una llamada y lo vemos con calma.\n[[LLAMADA]]");
  if (limit === "global") return reply("El asistente está muy solicitado ahora mismo. Puedes hacer el diagnóstico gratis o reservar una llamada.\n[[DIAGNOSTICO]] [[LLAMADA]]");

  let system = CONOCIMIENTO;
  if (cleanStr(input.pagina, 20) === "diagnostico") system += "\n\n# CONTEXTO\nLa persona está ahora mismo en la página del diagnóstico gratis. Si pregunta cómo usarlo, guíala paso a paso.";

  const contents = [];
  const history = Array.isArray(input.history) ? input.history.slice(-10) : [];
  for (const h of history) {
    if (!h || typeof h !== "object") continue;
    const text = cleanStr(h.text, 1200);
    if (text) contents.push({ role: h.role === "model" ? "model" : "user", parts: [{ text }] });
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  const { text } = await geminiCall(MODELOS_CHAT, {
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 700 },
    safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" }))
  }, 15000, 40000);

  if (!text) return reply("Ahora mismo no puedo responder. Puedes hacer el diagnóstico gratis o dejarnos tus datos en el formulario y te escribimos.\n[[DIAGNOSTICO]] [[LLAMADA]]");
  return reply(text.trim());
}
