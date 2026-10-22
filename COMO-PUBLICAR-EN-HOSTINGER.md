# Cómo publicar la web de Autoría en Hostinger

El mismo repositorio sirve para Vercel y para Hostinger. En Hostinger, el asistente, el lector del perfil, el diagnóstico, el formulario y el panel funcionan con los archivos de la carpeta `php/`. Valen para cualquier plan de Hostinger: solo necesitan PHP 8.

Las direcciones son las mismas que en Vercel:

- `/api/...` — los servicios de la web.
- `/panel` — el panel de contactos.
- `/instalar` — la configuración inicial, nueva en esta versión.

---

## 1. Preparar el sitio en Hostinger

1. En **hPanel → Sitios web**, crea o elige el sitio con el dominio o subdominio que vaya a usar Autoría.
2. Comprueba la versión de PHP en **Avanzado → Configuración de PHP**: debe ser la **8.2 o superior**.
3. Activa el certificado en **Seguridad → SSL** y la opción **Forzar HTTPS**.

## 2. Subir la web

**Opción A — desde GitHub (recomendada: cada cambio se publica solo)**

1. Vacía la carpeta `public_html` del sitio. Hostinger pone un archivo `default.php` que hay que borrar.
2. En **hPanel → Avanzado → Git**, crea un repositorio:
   - **Repositorio:** `https://github.com/caarloossc/web-autoria.git`. Si el repositorio es privado, usa `git@github.com:caarloossc/web-autoria.git` y añade en GitHub la clave SSH que muestra Hostinger: **Settings → Deploy keys**.
   - **Rama:** `main`.
   - **Directorio:** vacío, para que se instale directamente en `public_html`.
3. Pulsa **Crear** y luego **Desplegar**.
4. Para que se actualice sola con cada cambio:
   - En la misma pantalla, activa **Despliegue automático** y copia la dirección del *webhook*.
   - En GitHub, entra en **Settings → Webhooks → Add webhook**.
   - Pega esa dirección, elige *Content type* `application/json` y el evento *Just the push event*.

**Opción B — a mano**

1. Descarga el repositorio como ZIP desde GitHub: **Code → Download ZIP**.
2. Súbelo con el **Administrador de archivos** a `public_html` y descomprímelo.
3. Mueve el contenido de la carpeta descomprimida a `public_html`, de forma que `index.html` quede directamente dentro de `public_html`.

## 3. Configurar (una sola vez)

1. Abre `https://tu-dominio/instalar`.
2. Pega la **clave de Gemini**, que debe tener la facturación activada (ver punto 6).
3. Elige la **contraseña del panel**: mínimo 10 caracteres.
4. Opcional: escribe un **email para avisos**, por ejemplo `admin.autoria@gmail.com`, para recibir un correo con cada contacto y diagnóstico.
5. Pulsa **Guardar y activar**.

La clave y la contraseña se guardan en el servidor, en una carpeta privada **fuera de `public_html`** (`autoria-privado/`), y no se muestran nunca. Después, esa página ya no permite cambios. Para cambiar la clave o la contraseña, borra `autoria-privado/config.php` desde el Administrador de archivos y vuelve a entrar en `/instalar`.

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
