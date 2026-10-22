<?php
// diagnostico.php (se abre como /api/diagnostico) — guarda el contacto (con
// consentimiento) y genera con IA el diagnóstico de marca personal.
// Equivale a api/_diagnostico.js (usa sus mismas indicaciones para la IA).
define('AUTORIA', 1);
require __DIR__ . '/_comun.php';

$OBJETIVOS = ['clientes' => 'conseguir clientes', 'inversores' => 'atraer inversores', 'talento' => 'atraer talento', 'autoridad' => 'ganar autoridad en su sector'];

solo_post();
$in = entrada_json();
if (!$in) json_out(['ok' => false, 'reason' => 'input'], 400);

$email = clean_str($in['email'] ?? '', 160);
if (!es_email($email)) json_out(['ok' => false, 'reason' => 'email']);
if (empty($in['consent'])) json_out(['ok' => false, 'reason' => 'consent']);

$limit = rate_limit('diag', 4, 15, 300);
if ($limit !== null) json_out(['ok' => false, 'reason' => 'rate_' . $limit]);

$pi = is_array($in['perfil'] ?? null) ? $in['perfil'] : [];
$perfil = [
  'nombre' => clean_str($pi['nombre'] ?? '', 120), 'titular' => clean_str($pi['titular'] ?? '', 300), 'cargo_actual' => clean_str($pi['cargo_actual'] ?? '', 160),
  'empresa_actual' => clean_str($pi['empresa_actual'] ?? '', 160), 'sector' => clean_str($pi['sector'] ?? '', 120), 'experiencia' => clean_str($pi['experiencia'] ?? '', 1500),
  'extracto' => clean_str($pi['extracto'] ?? '', 2600), 'red' => clean_str($pi['red'] ?? '', 20), 'origen' => clean_str($pi['origen'] ?? '', 20),
];
$ri = is_array($in['respuestas'] ?? null) ? $in['respuestas'] : [];
$resp = [
  'objetivo' => clean_str($ri['objetivo'] ?? '', 20), 'publico' => clean_str($ri['publico'] ?? '', 300), 'frecuencia' => clean_str($ri['frecuencia'] ?? '', 80),
  'tiempo' => clean_str($ri['tiempo'] ?? '', 80), 'camara' => clean_str($ri['camara'] ?? '', 80),
];
$ci = is_array($in['calculo'] ?? null) ? $in['calculo'] : [];
$calculo = [];
foreach (['horasVideo', 'horasPost', 'videos', 'posts', 'horasMes', 'jornadas'] as $k) $calculo[$k] = is_numeric($ci[$k] ?? null) ? round((float) $ci[$k], 2) : null;
$rr = is_array($in['ritmo'] ?? null) ? $in['ritmo'] : [];
$entero = function ($v, $min, $max, $def) { $n = is_numeric($v) ? (int) round((float) $v) : null; return ($n !== null && $n >= $min && $n <= $max) ? $n : $def; };
$ritmo = ['videos' => $entero($rr['videos'] ?? null, 1, 30, 6), 'posts' => $entero($rr['posts'] ?? null, 0, 30, 3)];
$ritmoTxt = $ritmo['videos'] . ' vídeos y ' . $ritmo['posts'] . ' posts al mes';
$pais = (($in['pais'] ?? '') === 'CR') ? 'CR' : 'ES';
$nombre = clean_str($in['nombre'] ?? '', 120);
if ($nombre === '') $nombre = $perfil['nombre'];

$id = nuevo_id();
$row = [
  'id' => $id, 'fecha' => ahora(), 'tipo' => 'diagnostico', 'nombre' => $nombre, 'email' => $email,
  'telefono' => preg_replace('/[^0-9+\s]/', '', clean_str($in['telefono'] ?? '', 30)),
  'pais' => $pais === 'CR' ? 'Costa Rica' : 'España', 'perfil' => $perfil, 'respuestas' => $resp, 'calculo' => $calculo, 'ritmo' => $ritmoTxt,
  'indice' => is_numeric($in['indice'] ?? null) ? (int) round((float) $in['indice']) : null,
  'consentimiento' => 'Sí (' . ahora() . ')',
];
$guardado = store_record($row);
notify_team('Nuevo diagnóstico — ' . ($nombre ?: $email), [
  'nombre' => $nombre, 'email' => $email, 'pais' => $row['pais'], 'objetivo' => $resp['objetivo'], 'publico' => $resp['publico'],
  'ritmo' => $ritmoTxt, 'titular' => $perfil['titular'], 'cargo' => $perfil['cargo_actual'],
]);

if (gemini_key() === '') json_out(['ok' => true, 'id' => $id, 'guardado' => $guardado, 'resultado' => null, 'reason' => 'sin_clave']);

$perfilIA = [];
foreach ($perfil as $k => $v) { if ($k !== 'origen') $perfilIA[$k] = $v !== '' ? $v : '(no aparece)'; }
$datos = [
  'pais' => $row['pais'],
  'perfil' => $perfilIA,
  'objetivo' => $OBJETIVOS[$resp['objetivo']] ?? ($resp['objetivo'] ?: '(no indicado)'),
  'a_quien_quiere_llegar' => $resp['publico'] ?: '(no indicado)',
  'cuanto_publica_hoy' => $resp['frecuencia'] ?: '(no indicado)',
  'tiempo_disponible' => $resp['tiempo'] ?: '(no indicado)',
  'se_ve_grabandose' => $resp['camara'] ?: '(no indicado)',
  'ritmo_recomendado' => $ritmoTxt,
];

list($text) = gemini_call(MODELOS_LECTURA, [
  'system_instruction' => ['parts' => [['text' => texto_js('_diagnostico.js', 'SYSTEM')]]],
  'contents' => [['role' => 'user', 'parts' => [['text' => "Datos de la persona (JSON):\n" . json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n\n" . texto_js('_diagnostico.js', 'FORMATO_SALIDA')]]]],
  'generationConfig' => ['temperature' => 0.55, 'maxOutputTokens' => 2000, 'responseMimeType' => 'application/json'],
], 25000, 52000);
$r = $text !== '' ? extract_json($text) : null;

$res = null;
if ($r) {
  $list = function ($v, $n, $max) { $o = []; foreach ((is_array($v) ? $v : []) as $x) { $s = clean_str($x, $max); if ($s !== '') $o[] = $s; if (count($o) >= $n) break; } return $o; };
  $ideas = [];
  $formatos = ['Ideas en 60', 'La conversación', 'Lo que vi'];
  foreach (array_slice(is_array($r['ideas_video'] ?? null) ? $r['ideas_video'] : [], 0, 3) as $i) {
    if (!is_array($i)) continue;
    $ideas[] = ['formato' => clean_str($i['formato'] ?? '', 40) ?: $formatos[count($ideas)], 'titulo' => clean_str($i['titulo'] ?? '', 140), 'gancho' => clean_str($i['gancho'] ?? '', 220), 'por_que' => clean_str($i['por_que'] ?? '', 260)];
  }
  $res = [
    'resumen' => clean_str($r['resumen'] ?? '', 500),
    'puntos_fuertes' => $list($r['puntos_fuertes'] ?? [], 3, 260),
    'puntos_debiles' => $list($r['puntos_debiles'] ?? [], 3, 260),
    'titular_propuesto' => clean_str($r['titular_propuesto'] ?? '', 220),
    'titular_por_que' => clean_str($r['titular_por_que'] ?? '', 300),
    'ideas_video' => $ideas,
    'redes' => $list($r['redes'] ?? [], 2, 30),
    'redes_por_que' => clean_str($r['redes_por_que'] ?? '', 400),
    'ritmo_por_que' => clean_str($r['ritmo_por_que'] ?? '', 500),
    'primer_paso' => clean_str($r['primer_paso'] ?? '', 300),
  ];
  if (!$res['puntos_fuertes'] || $res['titular_propuesto'] === '' || !$ideas) $res = null;
}

store_record(['id' => $id, 'fecha' => ahora(), 'tipo' => 'diagnostico-resultado', 'resultado' => $res, 'error' => $res ? null : 'ia']);
json_out(['ok' => true, 'id' => $id, 'guardado' => $guardado, 'resultado' => $res, 'reason' => $res ? null : 'ia']);
