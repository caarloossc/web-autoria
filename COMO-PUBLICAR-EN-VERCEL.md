# Cómo publicar la web de Autoría en Vercel

La web es estática, salvo una función de Vercel que está en la carpeta `api/`. Esa función se encarga de:

- el asistente de chat;
- el lector del perfil de LinkedIn;
- el diagnóstico;
- el formulario de contacto;
- el panel de contactos.

No hace falta compilar nada.

> ⚠️ **Plan de Vercel.** El plan gratuito (Hobby) solo admite uso personal y no comercial. Autoría es una web de empresa, así que corresponde el plan **Pro**.

---

## 1. Subir el proyecto

**Opción A — con GitHub (recomendada)**

1. Crea un repositorio en GitHub. Puede ser privado.
2. Sube **el contenido** de la carpeta `Web Autoría`:
   - Debe incluir `index.html`, `api/`, `assets/`, `lib/`, `vercel.json`, `package.json`, etc.
   - No incluyas la carpeta `Web Autoría - privado`: contiene contraseñas.
3. En Vercel, entra en **Add New → Project** e importa ese repositorio:
   - **Framework Preset:** `Other`.
   - **Build Command:** vacío.
   - **Output Directory:** vacío.
   - Pulsa **Deploy**.

**Opción B — desde el ordenador con la herramienta de Vercel**

En la carpeta `Web Autoría`, ejecuta `npx vercel` y sigue las preguntas. Para publicar la versión definitiva, usa `npx vercel --prod`.

## 2. Conectar la base de datos de contactos (gratis, un clic)

Sin este paso, los formularios y el diagnóstico no guardan los contactos.

1. En tu proyecto de Vercel, abre **Storage → Create Database** (o **Browse Marketplace**).
2. Elige **Upstash → Upstash for Redis**, con el plan gratuito.
3. Elige la región **Frankfurt (eu-central-1)**: está en Europa, igual que las funciones.
4. Pulsa **Connect** al proyecto. Vercel crea solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.

## 3. Variables de entorno

Se añaden en **Settings → Environment Variables**, marcando *Production* y *Preview*.

| Variable | ¿Obligatoria? | Valor |
|---|---|---|
| `GEMINI_API_KEY` | Sí | Tu clave de Google AI Studio (empieza por `AIza` o por `AQ.`). |
| `PANEL_PASSWORD` | Sí | La contraseña del panel. Está en `Web Autoría - privado/acceso-panel.txt` (o elige otra). |
| `RESEND_API_KEY` | Opcional | Para recibir un email con cada contacto (cuenta gratuita en resend.com). |
| `AVISO_EMAIL` | Opcional | El email que recibe esos avisos. |
| `AVISO_REMITENTE` | Opcional | Remitente verificado en Resend, p. ej. `Autoría <avisos@tudominio.com>`. |

**Sobre los avisos por email:** sin dominio verificado en Resend, los avisos solo pueden enviarse al email con el que creaste la cuenta de Resend.

**Importante:** después de añadir o cambiar variables, ve a **Deployments → ⋯ → Redeploy**. Si no, la web no las verá.

## 4. Comprobar que todo funciona

1. Abre la web y pregunta algo al asistente (abajo a la derecha).
2. Haz un diagnóstico con tu propio PDF de LinkedIn.
3. Envía el formulario de contacto.
4. Entra en `tudominio/panel` con la contraseña. Deben aparecer el diagnóstico y el contacto, y se pueden descargar en Excel.

## 5. Imagen al compartir en LinkedIn y WhatsApp

Ya está configurada con la dirección `https://web-autoria.vercel.app`. Si más adelante conectas un dominio propio, cambia esa dirección en las etiquetas `og:image`, `og:url` y `canonical` de `index.html` y `diagnostico.html` (o pídemelo).

## 6. Huecos por rellenar

- **Contacto:** WhatsApp, email, LinkedIn y enlace de agenda, en `lib/manifest.js`. Es un único archivo, comentado.
- **Fotos del equipo y vídeo del caso real:** en `index.html` (buscar `HUECO`).
- **Testimonios:** están marcados como «Ejemplo». Sustitúyelos por reales en `index.html`.
- **Datos legales:** NIF, domicilio, registro, email y plazo de conservación, en `aviso-legal.html` y `privacidad.html`. Conviene que lo revise una asesoría.
- **Suposiciones de la calculadora** (horas por vídeo y por post): en `lib/manifest.js`.
- **Lo que sabe el asistente:** en `api/_conocimiento.js`.

## 7. La clave de Google: gratuita o de pago

Con la clave gratuita, Google puede usar lo que se le envía para mejorar sus productos. Antes de que clientes reales suban sus perfiles, activa la facturación en esa misma clave desde Google AI Studio; el coste es de céntimos al mes.

Cuando lo hayas hecho, borra en `privacidad.html` el párrafo que avisa de ello (el que tiene `data-aviso-gratuito`).

## 8. Probar en tu ordenador (opcional)

Con Node instalado:

1. En la carpeta `Web Autoría`, ejecuta `node tools/dev-server.mjs`.
2. Abre http://localhost:8088.

Las claves se leen de `Web Autoría - privado/.env.local`.
