<?php
// asistente.php (se abre como /api/asistente) — el navegador habla con este
// archivo y él habla con Gemini. Equivale a api/_asistente.js.
define('AUTORIA', 1);
require __DIR__ . '/_comun.php';

function reply($text, $code = 200) { json_out(['reply' => $text], $code); }

solo_post();
$in = entrada_json();
$message = clean_str($in['message'] ?? '', 600);
if ($message === '') reply('', 400);

if (gemini_key() === '') reply("El asistente se está terminando de configurar. Mientras tanto, puedes hacer el diagnóstico gratis o dejarnos tus datos y te escribimos.\n[[DIAGNOSTICO]] [[LLAMADA]]");

$limit = rate_limit('chat', 8, 80, 1200);
if ($limit === 'min')    reply('Vas muy rápido. Espera unos segundos y vuelve a preguntarme.');
if ($limit === 'day')    reply("Hoy ya hemos hablado mucho. Si quieres seguir, reserva una llamada y lo vemos con calma.\n[[LLAMADA]]");
if ($limit === 'global') reply("El asistente está muy solicitado ahora mismo. Puedes hacer el diagnóstico gratis o reservar una llamada.\n[[DIAGNOSTICO]] [[LLAMADA]]");

$system = texto_js('_conocimiento.js', 'default');
if (clean_str($in['pagina'] ?? '', 20) === 'diagnostico') $system .= "\n\n# CONTEXTO\nLa persona está ahora mismo en la página del diagnóstico gratis. Si pregunta cómo usarlo, guíala paso a paso.";

$contents = [];
$history = is_array($in['history'] ?? null) ? array_slice($in['history'], -10) : [];
foreach ($history as $h) {
  if (!is_array($h)) continue;
  $text = clean_str($h['text'] ?? '', 1200);
  if ($text !== '') $contents[] = ['role' => (($h['role'] ?? '') === 'model') ? 'model' : 'user', 'parts' => [['text' => $text]]];
}
$contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

$safety = [];
foreach (['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'] as $cat) $safety[] = ['category' => $cat, 'threshold' => 'BLOCK_ONLY_HIGH'];

list($text) = gemini_call(MODELOS_CHAT, [
  'system_instruction' => ['parts' => [['text' => $system]]],
  'contents'           => $contents,
  'generationConfig'   => ['temperature' => 0.4, 'topP' => 0.9, 'maxOutputTokens' => 700],
  'safetySettings'     => $safety,
], 15000, 40000);

if ($text === '') reply("Ahora mismo no puedo responder. Puedes hacer el diagnóstico gratis o dejarnos tus datos en el formulario y te escribimos.\n[[DIAGNOSTICO]] [[LLAMADA]]");
reply(trim($text));
