<?php
// contacto.php (se abre como /api/contacto) — guarda las solicitudes del
// formulario y, si está configurado, avisa por email. Equivale a api/_contacto.js.
define('AUTORIA', 1);
require __DIR__ . '/_comun.php';

solo_post();
$in = entrada_json();

// Campo trampa para robots: si viene relleno, se responde ok sin guardar.
if (clean_str($in['web'] ?? '', 200) !== '') json_out(['ok' => true]);

$nombre = clean_str($in['nombre'] ?? '', 120);
$email = clean_str($in['email'] ?? '', 160);
if ($nombre === '' || !es_email($email)) json_out(['ok' => false, 'reason' => 'datos']);
if (empty($in['consent'])) json_out(['ok' => false, 'reason' => 'consent']);

$limit = rate_limit('contacto', 4, 20, 500);
if ($limit !== null) json_out(['ok' => false, 'reason' => 'rate_' . $limit]);

$row = [
  'id' => nuevo_id(), 'fecha' => ahora(), 'tipo' => 'contacto', 'nombre' => $nombre, 'email' => $email,
  'telefono' => preg_replace('/[^0-9+\s]/', '', clean_str($in['telefono'] ?? '', 30)),
  'pais' => clean_str($in['pais'] ?? '', 40), 'cargo' => clean_str($in['cargo'] ?? '', 160), 'motivo' => clean_str($in['motivo'] ?? '', 60),
  'mensaje' => clean_str($in['mensaje'] ?? '', 2000), 'consentimiento' => 'Sí (' . ahora() . ')',
];
$guardado = store_record($row);
$avisado = notify_team('Nuevo contacto — ' . $row['motivo'] . ' — ' . $nombre, $row);
json_out(['ok' => $guardado || $avisado]);
