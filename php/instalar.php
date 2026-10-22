<?php
// instalar.php (se abre como /instalar) — configuración inicial en Hostinger,
// una sola vez y desde el navegador: clave de la IA (Gemini), contraseña del
// panel y, si se quiere, un email que reciba aviso de cada contacto.
// Todo se guarda fuera de la carpeta pública y nunca se muestra.
// Una vez configurado, esta página ya no permite cambios: para empezar de cero,
// borra el archivo autoria-privado/config.php desde el Administrador de archivos.
define('AUTORIA', 1);
require __DIR__ . '/_comun.php';

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');
$e = function ($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); };

function validar_gemini($key) {
  if (!function_exists('curl_init')) return false;
  $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1');
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['x-goog-api-key: ' . $key]]);
  $r = curl_exec($ch); $c = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  return $r !== false && $c === 200;
}

$cfg = config();
$configurado = gemini_key() !== '' && ($cfg['panel_hash'] ?? '') !== '';
$dir = dir_privado();
$fuera = $dir !== '' && strpos($dir, raiz_web()) !== 0;
$msg = ''; $tono = '';

if (!$configurado && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  if (!misma_web() || rate_limit('instalar', 5, 20, 100) !== null) { $msg = 'Demasiados intentos. Espera unos minutos.'; $tono = 'warn'; }
  else {
    $key = trim((string) ($_POST['gemini'] ?? ''));
    $p1 = (string) ($_POST['clave'] ?? ''); $p2 = (string) ($_POST['clave2'] ?? '');
    $aviso = trim((string) ($_POST['aviso'] ?? ''));
    if (!preg_match('/^[A-Za-z0-9._-]{20,}$/', $key)) { $msg = 'La clave de Gemini no tiene el formato esperado (empieza por «AIza» o «AQ.»).'; $tono = 'warn'; }
    elseif (mb_strlen($p1) < 10) { $msg = 'La contraseña del panel debe tener al menos 10 caracteres.'; $tono = 'warn'; }
    elseif ($p1 !== $p2) { $msg = 'Las dos contraseñas no coinciden.'; $tono = 'warn'; }
    elseif ($aviso !== '' && !filter_var($aviso, FILTER_VALIDATE_EMAIL)) { $msg = 'El email de avisos no es válido.'; $tono = 'warn'; }
    elseif ($dir === '') { $msg = 'No se ha podido crear la carpeta privada en el servidor. Revisa los permisos del hosting.'; $tono = 'warn'; }
    elseif (!validar_gemini($key)) { $msg = 'Google no ha aceptado la clave de Gemini. Revisa que esté bien copiada y activa.'; $tono = 'warn'; }
    elseif (guardar_config(['gemini_api_key' => $key, 'panel_hash' => password_hash($p1, PASSWORD_DEFAULT), 'aviso_email' => $aviso])) { $configurado = true; $msg = '¡Listo! El asistente, el diagnóstico y el panel ya están activos.'; $tono = 'ok'; }
    else { $msg = 'No se ha podido guardar la configuración (permisos del servidor).'; $tono = 'warn'; }
  }
}
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Instalación · Autoría</title>
<style>
  :root { --paper:#F5F2EB; --paper2:#ECE7DC; --ink:#15161C; --mute:#67655F; --accent:#E9441F; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--paper); color: var(--ink); line-height: 1.55; display: grid; place-items: center; min-height: 100vh; padding: 24px; }
  .box { width: 100%; max-width: 520px; background: #fff; border: 1px solid rgba(21,22,28,.15); border-radius: 6px; padding: 30px; }
  h1 { font-family: Georgia, serif; font-weight: 400; font-size: 1.9rem; letter-spacing: -.02em; margin-bottom: .4rem; }
  h1 span { color: var(--accent); }
  .sub { color: var(--mute); margin-bottom: 1.4rem; font-size: .95rem; }
  label { display: block; font-size: .72rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--mute); margin: 1rem 0 .35rem; }
  label small { text-transform: none; letter-spacing: 0; font-weight: 500; }
  input { width: 100%; padding: .8rem; border: 1px solid rgba(21,22,28,.3); border-radius: 3px; font: inherit; }
  .hint { font-size: .82rem; color: var(--mute); margin-top: .3rem; }
  .hint a { color: var(--ink); }
  button { margin-top: 1.4rem; width: 100%; padding: .9rem; border: 0; border-radius: 3px; background: var(--accent); color: var(--ink); font: inherit; font-weight: 700; cursor: pointer; }
  .msg { margin-top: 1rem; padding: .8rem 1rem; border-radius: 4px; font-size: .92rem; }
  .ok { background: #e7f3ea; } .warn { background: #fbe9e4; }
  ul { margin: .6rem 0 0 1.1rem; font-size: .92rem; }
  .foot { margin-top: 1.4rem; font-size: .8rem; color: var(--mute); }
</style>
</head>
<body><main class="box">
  <h1>Autoría<span>.</span> Instalación</h1>
<?php if ($configurado): ?>
  <p class="sub">La web ya está configurada.</p>
  <?php if ($msg): ?><p class="msg <?php echo $tono; ?>"><?php echo $e($msg); ?></p><?php endif; ?>
  <ul>
    <li>Asistente y diagnóstico: <strong>activos</strong>.</li>
    <li>Panel de contactos: <a href="/panel">/panel</a>.</li>
    <li>Avisos por email: <?php echo ($cfg['aviso_email'] ?? '') || ($_POST['aviso'] ?? '') ? 'activados' : 'no configurados'; ?>.</li>
    <li>Datos guardados <?php echo $fuera ? 'fuera de la carpeta pública' : 'en una carpeta protegida de la web'; ?>.</li>
  </ul>
  <p class="foot">Por seguridad, esta página ya no permite cambios. Para cambiar la clave o la contraseña, borra el archivo <code>autoria-privado/config.php</code> desde el Administrador de archivos de Hostinger y vuelve a entrar aquí.</p>
<?php else: ?>
  <p class="sub">Configura la web una sola vez. Los datos se guardan en el servidor, fuera de la parte pública, y no se muestran nunca.</p>
  <form method="post" autocomplete="off">
    <label for="gemini">Clave de Gemini</label>
    <input id="gemini" name="gemini" type="password" required>
    <p class="hint">Desde <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>, con la facturación activada.</p>
    <label for="clave">Contraseña del panel <small>(mín. 10 caracteres)</small></label>
    <input id="clave" name="clave" type="password" minlength="10" required>
    <label for="clave2">Repite la contraseña</label>
    <input id="clave2" name="clave2" type="password" minlength="10" required>
    <label for="aviso">Email para avisos <small>(opcional)</small></label>
    <input id="aviso" name="aviso" type="email" placeholder="admin.autoria@gmail.com">
    <p class="hint">Si lo rellenas, recibirás un email con cada contacto y diagnóstico.</p>
    <button type="submit">Guardar y activar</button>
  </form>
  <?php if ($msg): ?><p class="msg <?php echo $tono; ?>"><?php echo $e($msg); ?></p><?php endif; ?>
  <?php if (!$fuera): ?><p class="foot">Nota: los datos se guardarán en una carpeta protegida dentro de la web porque no se ha podido usar una fuera de ella.</p><?php endif; ?>
<?php endif; ?>
</main></body>
</html>
