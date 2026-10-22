# Cómo publicar la web de Autoría en Hostinger

El mismo repositorio sirve para Vercel y para Hostinger. En Hostinger, el asistente, el lector del perfil, el diagnóstico, el formulario y el panel funcionan con los archivos de la carpeta `php/`. Valen para cualquier plan de Hostinger: solo necesitan PHP 8.

Las direcciones son las mismas que en Vercel:

- `/api/...` — los servicios de la web.
- `/panel` — el panel de contactos.
- `/instalar` — la configuración inicial, nueva en esta versión.

---

## 1. Preparar el sitio en Hostinger

En el hPanel actual, estas opciones no están en el menú general, sino **dentro del panel de cada sitio**:

- Entra en **Sitios web** y abre el sitio: pulsa en su fila o en el botón **⋮** de la derecha. No pulses en el nombre con la flechita, porque eso abre la web. En algunas cuentas hay un botón **Panel** o **Administrar** (en inglés, *Dashboard*).
- A la izquierda aparece una barra lateral con un **buscador**. Escribe «PHP», «SSL» o «Git» y te lleva a cada opción.

**Antes de nada: dónde va Autoría.** Si en el plan ya está la web de la empresa, **no uses su carpeta**: la borrarías. Elige una de estas dos opciones:

- **Un subdominio**, por ejemplo `autoria.dominio-de-la-empresa.com`.
  1. En el panel de la web de la empresa, entra en **Dominios → Subdominios** (o busca «Subdominios») y crea `autoria`.
  2. Hostinger le da su propia carpeta, normalmente `public_html/autoria`. Apúntala: la necesitas en el paso 2.
- **Un sitio nuevo con otro dominio.**
  1. Entra en **Sitios web → Añadir sitio web**.
  2. Elige el sitio **vacío** o **PHP/HTML personalizado**. No elijas WordPress ni el creador de webs con IA.

Después:

1. **PHP:** en la barra lateral, abre **Configuración de PHP**. Debe poner **8.2 o superior**; lo normal es que ya esté en 8.3. Si ya cumple, no cambies nada: la versión se aplica a todas las webs del plan, también a la de la empresa.
2. **SSL:** abre **Seguridad → SSL** y elige el dominio o subdominio de Autoría. Si no tiene el certificado activo, pulsa **Instalar SSL**; luego activa **Forzar HTTPS**. El dominio tiene que apuntar ya a Hostinger.

**Si aun así no aparecen esas opciones:**

- **No hay «Configuración de PHP» y solo puedes editar la web con un editor visual:** el plan es del creador de webs (Website Builder u Horizons) y no admite PHP. En ese caso, la web se queda en Vercel.
- **El panel es de un servidor VPS** y no tiene «Sitios web»: la instalación es distinta. Pásame una captura.
- **No aparece «Git»:** algunos planes, como los de agencia, no lo tienen. Usa la opción B del paso 2.

## 2. Subir la web

**Opción A — desde GitHub (recomendada: cada cambio se publica solo)**

1. En el panel del sitio, abre **Avanzado → Git** o busca «Git».
2. Pulsa **Conectar con GitHub** (*Connect with GitHub*). Se abre una ventana de GitHub para instalar la aplicación de Hostinger: dale acceso solo al repositorio `caarloossc/web-autoria`.
3. Elige el repositorio `web-autoria` y la rama `main`.
4. **Directorio de despliegue:**
   - **Sitio propio:** deja `public_html`.
   - **Subdominio:** pulsa **Cambiar** y elige la carpeta del subdominio, por ejemplo `public_html/autoria`. **Nunca** el `public_html` de la web de la empresa: Hostinger sustituye los archivos de esa carpeta.
5. Pulsa **Desplegar**. A partir de ahí, cada cambio que se suba a GitHub se publica solo.

Si en vez del botón **Conectar con GitHub** ves un formulario para escribir la dirección del repositorio, es el método antiguo:

1. Borra el archivo `default.php` de la carpeta de destino: tiene que estar vacía.
2. Rellena el formulario:
   - **Repositorio:** `https://github.com/caarloossc/web-autoria.git`.
   - **Rama:** `main`.
   - **Directorio:** vacío para `public_html`, o la carpeta del subdominio.
3. Pulsa **Crear** y luego **Desplegar**.
4. Para que se actualice sola, activa **Despliegue automático** y copia la dirección del *webhook*. Pégala en GitHub, en **Settings → Webhooks → Add webhook**, con el evento *Just the push event*.

**Opción B — a mano**

1. Descarga el repositorio como ZIP desde GitHub: **Code → Download ZIP**.
2. Con el **Administrador de archivos**, súbelo a la carpeta del sitio (`public_html`, o la del subdominio) y descomprímelo.
3. El ZIP crea una carpeta `web-autoria-main`. Mueve su contenido a la carpeta del sitio, de forma que `index.html` quede directamente dentro.

## 3. Configurar (una sola vez)

1. Abre `https://tu-dominio/instalar`.
2. Pega la **clave de Gemini**, que debe tener la facturación activada (ver punto 6).
3. Elige la **contraseña del panel**: mínimo 10 caracteres.
4. Opcional: escribe un **email para avisos**, por ejemplo `admin.autoria@gmail.com`, para recibir un correo con cada contacto y diagnóstico.
5. Pulsa **Guardar y activar**.

La clave y la contraseña se guardan en el servidor, en una carpeta privada **junto a la de la web** (`autoria-privado/`), bloqueada para el navegador, y no se muestran nunca. Después, esa página ya no permite cambios. Para cambiar la clave o la contraseña, borra `autoria-privado/config.php` desde el Administrador de archivos y vuelve a entrar en `/instalar`.

## 4. Comprobar que todo funciona

1. Pregunta algo al asistente.
2. Haz un diagnóstico con tu PDF de LinkedIn.
3. Envía el formulario de contacto.
4. Entra en `https://tu-dominio/panel`: deben aparecer el diagnóstico y el contacto, y se pueden descargar en Excel.

Los contactos se guardan en `autoria-privado/contactos.jsonl`, fuera de la web. Para una copia de seguridad, descarga el Excel desde el panel o ese archivo desde el Administrador de archivos.

## 5. Antes de dejar Vercel

- **Descarga el Excel del panel de Vercel**: los contactos guardados en Upstash no pasan solos a Hostinger.
- Pásame el dominio definitivo. Así actualizo la imagen al compartir y la dirección principal de la web, y cambio en la política de privacidad los proveedores (Hostinger en lugar de Vercel y Upstash).
- Cuando la web de Hostinger funcione, puedes borrar el proyecto de Vercel y la base de datos de Upstash.

## 6. La clave de Gemini, de pago

Las condiciones de Google obligan a usar la modalidad de pago cuando la web la usan personas del Espacio Económico Europeo. Basta con activar la facturación en esa misma clave desde Google AI Studio o Google Cloud; conviene poner una alerta de gasto. Con el uso medido de esta web, el coste es de **1 a 6 € al mes aproximadamente**.

Cuando esté activada, se puede quitar de `privacidad.html` el párrafo marcado con `data-aviso-gratuito`.

## 7. Probar en tu ordenador (opcional)

Con PHP instalado, desde la carpeta de la web:

```
php -S localhost:8089 -t . tools/router-php.php
```

Los datos de prueba se guardan en `Web Autoría - privado/hostinger-pruebas`.
