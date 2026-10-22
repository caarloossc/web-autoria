# Cómo publicar la web de Autoría en Hostinger

El mismo repositorio sirve para Vercel y para Hostinger. En Hostinger, el asistente, el lector del perfil, el diagnóstico, el formulario y el panel funcionan con los archivos de la carpeta `php/`. Valen para cualquier plan de Hostinger: solo necesitan PHP 8.

Las direcciones son las mismas que en Vercel:

- `/api/...` — los servicios de la web.
- `/panel` — el panel de contactos.
- `/instalar` — la configuración inicial, nueva en esta versión.

---

## 1. Preparar el sitio en Hostinger

**Dónde va Autoría.** Usa un sitio **PHP/HTML** propio. Para crearlo, entra en **Sitios web → Crear sitio web** y elige un sitio vacío PHP/HTML; no elijas WordPress ni el Creador con IA. Hostinger le da un dominio temporal (`…hostingersite.com`) hasta que conectéis uno propio.

**No uses la carpeta de la web de la empresa**, porque la borrarías. Si preferís un subdominio de la empresa, como `autoria.eryoncompany.com`, créalo en el menú del sitio de la empresa, en **Dominios**. Hostinger le da su propia carpeta, normalmente `public_html/autoria`; apúntala, porque la necesitas en el paso 2.

**Cómo entrar en el sitio.** El menú de la izquierda de hPanel (Inicio, Agente, Sitios web…) es el general y no tiene estas opciones. Hay que entrar en el sitio:

1. En **Sitios web**, pasa el ratón por la fila del sitio y pulsa **Administrar sitio web**.
2. El menú de la izquierda cambia al del sitio: Panel, Plan de hosting, Rendimiento, Análisis, Seguridad, Dominios, Sitio web, Archivos, Bases de datos y **Avanzado**. Arriba tiene un **buscador**.

**Qué comprobar:**

1. **PHP:** en **Avanzado → Configuración de PHP**, pestaña **Versión PHP**, tiene que estar marcada la **8.2 o superior**. Lo normal es que ya esté en la **8.3**, y entonces no hay que tocar nada.
2. **SSL:** no hace falta tocar nada. Con el dominio temporal ya viene activado: la web abre con `https://` y redirige sola. Cuando conectéis un dominio propio con **Conectar dominio**, Hostinger pone el certificado. Comprueba que la web abre con `https://`.

**Si no aparece «Configuración de PHP» en Avanzado,** el sitio es del Creador con IA y no admite PHP: crea uno PHP/HTML como se explica arriba.

## 2. Subir la web

**Opción A — desde GitHub (recomendada: cada cambio se publica solo)**

1. En el menú del sitio, abre **Avanzado → GIT**.
2. Pulsa **Continúa con GitHub**. Se abre una ventana de GitHub para instalar la aplicación de Hostinger. Elige **Only select repositories** y marca solo `caarloossc/web-autoria`.
3. De vuelta en Hostinger, elige el repositorio `web-autoria` y la rama `main`.
4. **Directorio de despliegue:**
   - **Sitio propio:** deja `public_html`.
   - **Subdominio:** pulsa **Cambiar** y elige la carpeta del subdominio, por ejemplo `public_html/autoria`. **Nunca** elijas el `public_html` de la web de la empresa: Hostinger sustituye los archivos de esa carpeta.
5. Pulsa **Desplegar**. A partir de ahí, cada cambio que se suba a GitHub se publica solo.

Si en vez del botón **Continúa con GitHub** ves un formulario para escribir la dirección del repositorio, es el método antiguo:

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
