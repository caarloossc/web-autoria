<?php
// lector-perfil.php (se abre como /api/lector-perfil) — lee con IA las capturas
// del perfil en cualquier red social (o el PDF de LinkedIn) y devuelve los datos.
// Lo que no aparece en el documento vuelve vacío: nunca se inventa. El documento
// no se guarda.
// Equivale a api/_lector-perfil.js.
define('AUTORIA', 1);
require __DIR__ . '/_comun.php';

function fail($reason, $code = 200) { json_out(['ok' => false, 'reason' => $reason], $code); }

// Tipo real del archivo según sus primeros bytes.
function sniff($b) {
  if (substr($b, 0, 5) === '%PDF-') return 'application/pdf';
  if (substr($b, 0, 3) === "\xFF\xD8\xFF") return 'image/jpeg';
  if (substr($b, 0, 4) === "\x89PNG") return 'image/png';
  if (substr($b, 0, 4) === 'RIFF' && substr($b, 8, 4) === 'WEBP') return 'image/webp';
  if (substr($b, 4, 4) === 'ftyp' && preg_match('/heic|heix|mif1|msf1|heif/', substr($b, 8, 4))) return 'image/heic';
  return '';
}

solo_post();
if (empty($_POST['consent'])) fail('consent');
if (gemini_key() === '') fail('sin_clave');

$files = [];
if (!empty($_FILES['archivo']['name']) && is_array($_FILES['archivo']['name'])) {
  $n = min(3, count($_FILES['archivo']['name']));
  for ($i = 0; $i < $n; $i++) $files[] = ['tmp' => $_FILES['archivo']['tmp_name'][$i] ?? '', 'error' => $_FILES['archivo']['error'][$i] ?? 1];
}
if (!$files) fail('sin_archivo');

$MAX_TOTAL = 4 * 1024 * 1024;
$total = 0; $parts = [];
foreach ($files as $f) {
  if ($f['error'] !== 0 || !is_uploaded_file($f['tmp'])) fail('subida');
  $bytes = (string) @file_get_contents($f['tmp']);
  if ($bytes === '') fail('lectura');
  $total += strlen($bytes);
  if ($total > $MAX_TOTAL) fail('tamano');
  $mime = sniff($bytes);
  if ($mime === '') fail('tipo');
  $parts[] = ['inline_data' => ['mime_type' => $mime, 'data' => base64_encode($bytes)]];
}

$limit = rate_limit('lector', 5, 25, 300);
if ($limit !== null) fail('rate_' . $limit);

$parts[] = ['text' => texto_js('_lector-perfil.js', 'INSTR')];
list($text) = gemini_call(MODELOS_LECTURA, [
  'contents' => [['role' => 'user', 'parts' => $parts]],
  'generationConfig' => ['temperature' => 0, 'maxOutputTokens' => 2500, 'responseMimeType' => 'application/json'],
], 25000, 52000);
if ($text === '') fail('ia');
$p = extract_json($text);
if (!$p) fail('ia');

$exp = [];
foreach (array_slice(is_array($p['experiencia'] ?? null) ? $p['experiencia'] : [], 0, 8) as $e) {
  if (!is_array($e) || str_or_null($e['cargo'] ?? null, 160) === null) continue;
  $exp[] = ['cargo' => str_or_null($e['cargo'], 160), 'empresa' => str_or_null($e['empresa'] ?? null, 160), 'periodo' => str_or_null($e['periodo'] ?? null, 80)];
}
$apt = [];
foreach (array_slice(is_array($p['aptitudes'] ?? null) ? $p['aptitudes'] : [], 0, 10) as $a) { $a = str_or_null($a, 60); if ($a !== null) $apt[] = $a; }
$anos = $p['anos_experiencia'] ?? null;

$redes = ['LinkedIn', 'Instagram', 'TikTok', 'YouTube', 'X', 'Facebook', 'Otra'];

json_out(['ok' => true, 'data' => [
  'es_perfil'        => ($p['es_perfil'] ?? true) !== false,
  'red'              => in_array($p['red'] ?? null, $redes, true) ? $p['red'] : null,
  'nombre'           => str_or_null($p['nombre'] ?? null, 120),
  'titular'          => str_or_null($p['titular'] ?? null, 300),
  'cargo_actual'     => str_or_null($p['cargo_actual'] ?? null, 160),
  'empresa_actual'   => str_or_null($p['empresa_actual'] ?? null, 160),
  'sector'           => str_or_null($p['sector'] ?? null, 120),
  'ubicacion'        => str_or_null($p['ubicacion'] ?? null, 120),
  'anos_experiencia' => (is_numeric($anos) && $anos > 0 && $anos < 70) ? (float) $anos : null,
  'experiencia'      => $exp,
  'extracto'         => str_or_null($p['extracto'] ?? null, 2600),
  'aptitudes'        => $apt,
]]);
