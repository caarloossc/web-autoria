/* =============================================================
   AUTORÍA — datos de marca y ajustes editables
   -------------------------------------------------------------
   Este es el ÚNICO archivo que hace falta tocar para rellenar los
   huecos (WhatsApp, email, LinkedIn, enlace de reservas) y para
   ajustar las suposiciones de la calculadora del diagnóstico.
   Lo que dejes vacío ("") se muestra como «pendiente» en la web.
   ============================================================= */
(function () {
  "use strict";

  window.__BRAND__ = {
    name: "Autoría",

    /* ---------- Contacto (huecos por rellenar) ---------- */
    contacto: {
      whatsapp: "",          // solo dígitos con prefijo de país, p. ej. "34600000000"
      whatsappTexto: "",     // cómo se muestra, p. ej. "+34 600 000 000"
      email: "",             // p. ej. "hola@autoria.es"
      linkedin: "",          // URL completa de la página de LinkedIn de Autoría
      reservaUrl: ""         // enlace de agenda (Calendly, Cal.com…). Vacío = lleva al formulario
    },

    /* ---------- Ritmos de publicación que recomienda el diagnóstico ----------
       Según las respuestas, el diagnóstico propone uno de estos tres ritmos
       (sin precios: las condiciones se explican en la llamada). */
    ritmos: {
      esencial:    { videos: 4, posts: 2 },
      recomendado: { videos: 6, posts: 3 },
      completo:    { videos: 8, posts: 4 }
    },

    /* ---------- Suposiciones de la calculadora ----------
       Horas que le costaría a una persona hacerlo por su cuenta.
       Se muestran y se pueden editar en el diagnóstico; aquí se
       fijan los valores por defecto. */
    calculadora: {
      horasPorVideo: 4,      // idea y guion, grabación y repeticiones, edición, subtítulos, rótulos y publicación
      horasPorPost: 1.5,     // redacción, revisión, imagen y publicación
      tarifaPorDefecto: 100  // €/h o USD/h con la que arranca el control
    }
  };
})();
