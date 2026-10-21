/* =============================================================
   AUTORÍA — diagnóstico de marca personal (solo diagnostico.html)
   Flujo: perfil → 4 preguntas → calculadora → email → informe.
   ============================================================= */
(function () {
  "use strict";

  const A = window.__AUTORIA__ || {};
  const data = window.__BRAND__ || {};
  const $ = A.$ || ((s, c) => (c || document).querySelector(s));
  const $$ = A.$$ || ((s, c) => Array.from((c || document).querySelectorAll(s)));
  const esc = A.escHTML || ((s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]));
  const nf = (n, d) => Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: 0 });

  const STEPS = ["intro", "perfil", "objetivo", "publico", "frecuencia", "tiempo", "calculo", "email", "informe"];
  const OBJ = { clientes: "Clientes", inversores: "Inversores", talento: "Talento", autoridad: "Autoridad en tu sector" };
  const cfg = data.calculadora || {};
  const S = {
    step: "intro",
    perfil: { nombre: "", titular: "", cargo_actual: "", empresa_actual: "", sector: "", experiencia: "", extracto: "", origen: "" },
    respuestas: { objetivo: "", publico: "", frecuencia: "", tiempo: "", camara: "" },
    pais: (A.detectCountry ? A.detectCountry() : "ES"),
    ritmo: "recomendado", ritmoReco: { videos: 6, posts: 3 }, videos: 6, posts: 3, ritmoTocado: false,
    tarifa: cfg.tarifaPorDefecto || 100,
    hv: cfg.horasPorVideo || 4,
    hp: cfg.horasPorPost || 1.5,
    staged: [],
    uploading: false
  };

  /* ---------- navegación entre pasos ---------- */
  function goTo(name, push) {
    const target = $('[data-step="' + name + '"]');
    if (!target) return;
    $$(".dg-step").forEach((s) => s.classList.remove("is-active"));
    target.classList.add("is-active");
    S.step = name;
    const idx = STEPS.indexOf(name);
    $$("[data-progressbar] span").forEach((sp, i) => {
      sp.classList.toggle("is-done", i + 1 < idx);
      sp.classList.toggle("is-current", i + 1 === idx);
    });
    if (push !== false) { try { history.pushState({ step: name }, "", "#" + name); } catch (_) {} }
    window.scrollTo({ top: 0, behavior: "auto" });
    const h = $("h1, h2", target);
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    if (name === "calculo") enterCalc();
    if (name === "email") { const n = $("#g-nombre"); if (n && !n.value) n.value = S.perfil.nombre || ""; }
  }
  function next() { const i = STEPS.indexOf(S.step); if (i < STEPS.length - 1) goTo(STEPS[i + 1]); }
  function prev() { const i = STEPS.indexOf(S.step); if (i > 0) goTo(STEPS[i - 1]); }
  window.addEventListener("popstate", (e) => {
    const st = (e.state && e.state.step) || "intro";
    if (S.step === "informe") { history.pushState({ step: "informe" }, "", "#informe"); return; }
    goTo(st, false);
  });

  function stepError(step, msg) {
    let p = $(".dg-step-error", step);
    if (!p) { p = document.createElement("p"); p.className = "form-status is-error dg-step-error"; p.setAttribute("role", "alert"); $(".dg-nav", step).before(p); }
    p.textContent = msg || "";
  }

  function validate(req) {
    const step = $('[data-step="' + S.step + '"]');
    if (req === "perfil") {
      readProfile();
      const p = S.perfil;
      if (!p.titular && !p.cargo_actual && !p.extracto) { stepError(step, "Rellena al menos tu titular o tu cargo para que el diagnóstico tenga sentido."); return false; }
    }
    if (req === "objetivo" && !S.respuestas.objetivo) { stepError(step, "Elige una opción para continuar."); return false; }
    if (req === "publico") {
      S.respuestas.publico = $("[data-publico]").value.trim();
      if (S.respuestas.publico.length < 3) { stepError(step, "Cuéntanos a quién quieres llegar (aunque sea en pocas palabras)."); $("[data-publico]").focus(); return false; }
    }
    if (req === "frecuencia" && !S.respuestas.frecuencia) { stepError(step, "Elige una opción para continuar."); return false; }
    if (req === "tiempo" && (!S.respuestas.tiempo || !S.respuestas.camara)) { stepError(step, "Responde a las dos preguntas para continuar."); return false; }
    stepError(step, "");
    return true;
  }

  function bindNav() {
    $$("[data-next]").forEach((b) => b.addEventListener("click", () => { if (!b.dataset.require || validate(b.dataset.require)) next(); }));
    $$("[data-prev]").forEach((b) => b.addEventListener("click", prev));
    $$('input[type="radio"]').forEach((r) => r.addEventListener("change", () => {
      S.respuestas[r.name] = r.value;
      const step = r.closest(".dg-step");
      stepError(step, "");
      if (r.hasAttribute("data-auto")) setTimeout(() => { if (S.step === step.dataset.step) next(); }, 380);
      if (step.dataset.step === "tiempo" && S.respuestas.tiempo && S.respuestas.camara) setTimeout(() => { if (S.step === "tiempo") next(); }, 450);
    }));
    $("[data-chips]").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const ta = $("[data-publico]");
      ta.value = ta.value.trim() ? ta.value.trim().replace(/[.,;]$/, "") + ", " + b.textContent.toLowerCase() : b.textContent;
      ta.focus();
    });
  }

  /* ---------- paso 1: perfil ---------- */
  const FIELDS = ["nombre", "titular", "cargo_actual", "empresa_actual", "sector", "experiencia", "extracto"];
  function fieldEl(k) { return $('[data-fields] [name="' + k + '"]'); }
  function readProfile() { FIELDS.forEach((k) => { const el = fieldEl(k); if (el) S.perfil[k] = el.value.trim(); }); }
  function showFields(noteText, warn) {
    const box = $("[data-fields]");
    box.hidden = false;
    $("[data-require='perfil']").hidden = false;
    const note = $("[data-extract-note]");
    note.textContent = noteText || "";
    note.hidden = !noteText;
    note.classList.toggle("is-warn", !!warn);
  }
  function fillProfile(d) {
    const exp = (d.experiencia || []).map((e) => e.cargo + (e.empresa ? " — " + e.empresa : "") + (e.periodo ? " (" + e.periodo + ")" : "")).join("\n");
    const values = {
      nombre: d.nombre, titular: d.titular, cargo_actual: d.cargo_actual, empresa_actual: d.empresa_actual,
      sector: d.sector, experiencia: exp + ((d.aptitudes && d.aptitudes.length) ? (exp ? "\n" : "") + "Aptitudes: " + d.aptitudes.join(", ") : ""),
      extracto: d.extracto
    };
    FIELDS.forEach((k) => {
      const el = fieldEl(k); if (!el) return;
      const v = values[k] || "";
      el.value = v;
      const f = el.closest(".field");
      f.classList.toggle("is-empty", !v);
      $(".field-note", f).textContent = v ? "" : "No aparece en tu perfil. Puedes completarlo.";
    });
  }
  FIELDS.forEach((k) => {
    const el = fieldEl(k);
    if (el) el.addEventListener("input", () => { const f = el.closest(".field"); if (el.value.trim()) { f.classList.remove("is-empty"); $(".field-note", f).textContent = ""; } });
  });

  function compressImage(file) {
    return new Promise((resolve) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { resolve(file); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1280 / img.width, 2800 / img.height);
        if (k >= 1 && file.size < 1.2 * 1024 * 1024) { URL.revokeObjectURL(url); resolve(file); return; }
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => resolve(b ? new File([b], (file.name || "captura").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function uploadError(msg) { $("[data-upload-error]").textContent = msg || ""; }

  function stage(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const pdf = files.find((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    let chosen = pdf ? [pdf] : files.filter((f) => /^image\//.test(f.type)).slice(0, 3);
    if (!chosen.length) { uploadError("Ese formato no lo podemos leer. Sube un PDF o una imagen (JPG o PNG)."); return; }
    if (pdf && pdf.size > 4 * 1024 * 1024) { uploadError("El PDF pesa demasiado (máximo 4 MB). El que genera LinkedIn suele ocupar mucho menos."); return; }
    S.staged = chosen;
    $("[data-files]").innerHTML = chosen.map((f) => '<span class="dz-file"><span>' + esc(f.name || "captura") + "</span></span>").join("");
    uploadError("");
    const consent = $("[data-upload-consent] input");
    if (!consent.checked) {
      $("[data-upload-consent]").classList.add("is-invalid");
      uploadError("Marca la casilla de la política de privacidad para que podamos leer tu perfil.");
      return;
    }
    upload();
  }

  const READING = ["Leyendo tu perfil…", "Buscando tu titular y tu cargo…", "Repasando tu experiencia…", "Copiando tu extracto tal cual…"];
  async function upload() {
    if (S.uploading || !S.staged.length) return;
    S.uploading = true;
    const reading = $("[data-reading]"), rt = $("[data-reading-text]");
    reading.classList.add("is-on");
    $("[data-dropzone]").style.opacity = ".5";
    let k = 0; rt.textContent = READING[0];
    const iv = setInterval(() => { k = (k + 1) % READING.length; rt.textContent = READING[k]; }, 2200);
    let res = null;
    try {
      const fd = new FormData();
      fd.append("consent", "1");
      const files = await Promise.all(S.staged.map(compressImage));
      let total = 0;
      files.forEach((f) => { total += f.size; fd.append("archivo[]", f, f.name || "perfil"); });
      if (total > 4 * 1024 * 1024) throw new Error("tamano");
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 75000);
      const r = await fetch("api/lector-perfil", { method: "POST", body: fd, signal: ctrl.signal });
      clearTimeout(to);
      res = await r.json();
    } catch (e) { res = { ok: false, reason: e && e.message === "tamano" ? "tamano" : "red" }; }
    clearInterval(iv);
    reading.classList.remove("is-on");
    $("[data-dropzone]").style.opacity = "";
    S.uploading = false;

    if (res && res.ok && res.data) {
      const d = res.data;
      S.perfil.origen = S.staged[0] && /pdf/i.test(S.staged[0].type) ? "pdf" : "captura";
      fillProfile(d);
      const empties = FIELDS.filter((f) => !fieldEl(f).value).length;
      if (d.es_perfil === false) showFields("No parece un perfil de LinkedIn. Revisa el archivo o completa los datos a mano.", true);
      else showFields("Hemos leído tu perfil. Revisa los datos y corrige lo que haga falta" + (empties ? "; lo que no aparecía se ha quedado en blanco." : "."), false);
      $("[data-fields]").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const reason = (res && res.reason) || "";
    const MSG = {
      sin_clave: "El lector todavía se está configurando. Puedes completar los datos a mano.",
      tipo: "Ese formato no lo podemos leer. Sube un PDF o una imagen (JPG o PNG).",
      tamano: "Los archivos pesan demasiado (máximo 4 MB en total). Prueba con menos capturas.",
      consent: "Marca la casilla de la política de privacidad para continuar.",
      red: "No hemos podido conectar para leer el documento. Puedes completar los datos a mano."
    };
    uploadError(MSG[reason] || (/^rate_/.test(reason) ? "Has hecho varios intentos seguidos. Espera un momento o completa los datos a mano." : "No hemos podido leer el documento. Prueba con otro archivo o completa los datos a mano."));
    S.perfil.origen = "manual";
    fillProfile({});
    showFields("Completa tus datos tal y como aparecen en tu perfil.", true);
  }

  function bindUpload() {
    const dz = $("[data-dropzone]"), input = $("[data-file]");
    input.addEventListener("change", () => { stage(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("is-over"); }));
    dz.addEventListener("drop", (e) => { if (e.dataTransfer) stage(e.dataTransfer.files); });
    const consent = $("[data-upload-consent] input");
    consent.addEventListener("change", () => {
      $("[data-upload-consent]").classList.remove("is-invalid");
      if (consent.checked) { uploadError(""); if (S.staged.length && !S.uploading && $("[data-fields]").hidden) upload(); }
    });
    $("[data-manual]").addEventListener("click", () => {
      S.perfil.origen = "manual";
      if ($("[data-fields]").hidden) { fillProfile({}); FIELDS.forEach((k) => { const f = fieldEl(k).closest(".field"); f.classList.remove("is-empty"); $(".field-note", f).textContent = ""; }); }
      showFields("Copia los datos tal y como aparecen en tu perfil de LinkedIn.", false);
      fieldEl("nombre").focus();
    });
  }

  /* ---------- recomendación e índice ---------- */
  function recommend() {
    const r = S.respuestas;
    let s = 0;
    if (/Menos de 1/.test(r.tiempo)) s -= 1;
    if (/De 2 a 4|Más de 4/.test(r.tiempo)) s += 1;
    if (r.objetivo === "inversores" || r.objetivo === "autoridad") s += 1;
    if (/Varias veces/.test(r.frecuencia)) s += 1;
    if (/Nada/.test(r.frecuencia)) s -= 1;
    if (/no me veo/.test(r.camara)) s -= 1;
    return s <= -1 ? "esencial" : (s >= 2 ? "completo" : "recomendado");
  }
  function index() {
    const p = S.perfil, r = S.respuestas;
    let perfil = 0;
    if (p.titular) perfil += 10;
    if (p.titular && p.titular.length >= 45) perfil += 5;
    if (p.extracto) perfil += 10;
    if (p.extracto && p.extracto.length >= 400) perfil += 5;
    if (p.cargo_actual) perfil += 5;
    if (p.empresa_actual) perfil += 3;
    if (p.experiencia) perfil += 7;
    if (p.sector) perfil += 5;
    const act = ({ "Nada o casi nada": 0, "Alguna vez al mes": 10, "Una vez por semana": 25, "Varias veces por semana": 35 })[r.frecuencia] || 0;
    const cam = ({ "Sí, sin problema": 15, "Con una guía, sí": 12, "Me cuesta, pero quiero intentarlo": 6, "Ahora mismo no me veo": 2 })[r.camara] || 0;
    return { total: Math.min(100, perfil + act + cam), perfil: perfil, act: act, cam: cam };
  }

  /* ---------- paso 6: calculadora ---------- */
  const MONEDA = { ES: "€", CR: "USD" };
  const RITMOS = data.ritmos || { esencial: { videos: 4, posts: 2 }, recomendado: { videos: 6, posts: 3 }, completo: { videos: 8, posts: 4 } };
  function money(n) { return nf(n) + " " + MONEDA[S.pais]; }
  function ritmoText(v, p) { return v + (v === 1 ? " vídeo" : " vídeos") + (p ? " y " + p + (p === 1 ? " post" : " posts") : "") + " al mes"; }
  function enterCalc() {
    readProfile();
    S.ritmo = recommend();
    S.ritmoReco = RITMOS[S.ritmo];
    if (!S.ritmoTocado) { S.videos = S.ritmoReco.videos; S.posts = S.ritmoReco.posts; }
    renderCalc();
  }
  function renderCalc() {
    $$("[data-calc-country] button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.country === S.pais)));
    $("[data-reco-label]").textContent = "★ Recomendado";
    const unit = MONEDA[S.pais] + "/h";
    $("[data-rate-unit]").textContent = unit; $("[data-rate-note]").textContent = unit;
    $("[data-rate-range]").value = Math.min(400, Math.max(30, S.tarifa));
    const keep = (sel, v) => { const el = $(sel); if (document.activeElement !== el) el.value = v; };
    keep("[data-rate-num]", S.tarifa); keep("[data-hv]", S.hv); keep("[data-hp]", S.hp);
    keep("[data-videos]", S.videos); keep("[data-posts]", S.posts);

    const hVideos = S.videos * S.hv, hPosts = S.posts * S.hp;
    const hours = hVideos + hPosts;
    const value = hours * S.tarifa;
    S.calc = { tarifa: S.tarifa, horasVideo: S.hv, horasPost: S.hp, videos: S.videos, posts: S.posts, horasMes: Math.round(hours * 10) / 10, valorMes: Math.round(value), moneda: MONEDA[S.pais] };

    $("[data-out-hours]").textContent = nf(hours, 1) + " h";
    $("[data-out-hours-detail]").textContent = S.videos + " vídeos × " + nf(S.hv, 2) + " h + " + S.posts + " posts × " + nf(S.hp, 2) + " h";
    $("[data-out-value]").textContent = nf(value);
    $("[data-out-value-unit]").textContent = MONEDA[S.pais] + " al mes";
    $("[data-out-bar1]").textContent = nf(hVideos, 1) + " h";
    $("[data-out-bar2]").textContent = nf(hPosts, 1) + " h";
    const max = Math.max(hVideos, hPosts, 0.1);
    $("[data-bar1]").style.width = (hVideos / max * 100).toFixed(1) + "%";
    $("[data-bar2]").style.width = (hPosts / max * 100).toFixed(1) + "%";
    $("[data-verdict]").innerHTML = "Hacerlo por tu cuenta te llevaría unas <b>" + nf(hours, 1) + " horas al mes</b>, que a tu tarifa valen <b>" + esc(money(value)) + "</b>. Con Autoría, esas horas las ponemos nosotros.";
  }
  function bindCalc() {
    $$("[data-calc-country] button").forEach((b) => b.addEventListener("click", () => {
      S.pais = b.dataset.country;
      if (A.store) A.store.set("autoria-pais", S.pais);
      renderCalc();
    }));
    const range = $("[data-rate-range]"), num = $("[data-rate-num]");
    range.addEventListener("input", () => { S.tarifa = Number(range.value); num.value = S.tarifa; renderCalc(); });
    num.addEventListener("input", () => { const v = Number(num.value); if (v > 0) { S.tarifa = Math.min(5000, v); renderCalc(); } });
    $("[data-hv]").addEventListener("input", (e) => { const v = Number(e.target.value); if (v > 0) { S.hv = Math.min(40, v); renderCalc(); } });
    $("[data-hp]").addEventListener("input", (e) => { const v = Number(e.target.value); if (v > 0) { S.hp = Math.min(20, v); renderCalc(); } });
    $("[data-videos]").addEventListener("input", (e) => { const v = Math.round(Number(e.target.value)); if (v >= 1) { S.videos = Math.min(30, v); S.ritmoTocado = true; renderCalc(); } });
    $("[data-posts]").addEventListener("input", (e) => { const v = Math.round(Number(e.target.value)); if (v >= 0 && e.target.value !== "") { S.posts = Math.min(30, v); S.ritmoTocado = true; renderCalc(); } });
  }

  /* ---------- paso 7: email y generación ---------- */
  const GENERATING = ["Preparando tu diagnóstico…", "Leyendo tu perfil con lupa…", "Buscando tu mejor titular…", "Pensando tres vídeos para ti…", "Ajustando tu ritmo de publicación…"];
  function bindGate() {
    const form = $("[data-gate]");
    const status = $("[data-gate-status]");
    const btn = $(".form-submit", form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.classList.contains("is-sending")) return;
      const email = form.email.value.trim();
      const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      form.email.closest(".field").classList.toggle("is-invalid", !okEmail);
      form.consent.closest(".consent").classList.toggle("is-invalid", !form.consent.checked);
      if (!okEmail) { status.textContent = "Escribe un email válido."; status.className = "form-status is-error"; form.email.focus(); return; }
      if (!form.consent.checked) { status.textContent = "Para ver tu diagnóstico, marca la casilla de la política de privacidad."; status.className = "form-status is-error"; return; }
      status.textContent = ""; status.className = "form-status";
      form.classList.add("is-sending"); btn.disabled = true;
      const gen = $("[data-generating]"), gt = $("[data-generating-text]");
      gen.classList.add("is-on");
      let k = 0; gt.textContent = GENERATING[0];
      const iv = setInterval(() => { k = (k + 1) % GENERATING.length; gt.textContent = GENERATING[k]; }, 2600);

      readProfile();
      const idx = index();
      S.idx = idx;
      S.nombre = form.nombre.value.trim() || S.perfil.nombre;
      const payload = {
        email: email, nombre: S.nombre, telefono: form.telefono.value.trim(), consent: true,
        pais: S.pais, perfil: S.perfil, respuestas: S.respuestas, calculo: S.calc || {}, ritmo: { nivel: S.ritmo, videos: S.ritmoReco.videos, posts: S.ritmoReco.posts }, indice: idx.total
      };
      let res = null;
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 80000);
        const r = await fetch("api/diagnostico", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal });
        clearTimeout(to);
        res = await r.json();
      } catch (_) { res = null; }
      clearInterval(iv);
      gen.classList.remove("is-on");
      form.classList.remove("is-sending"); btn.disabled = false;

      if (!res) { status.textContent = "No hemos podido conectar. Inténtalo de nuevo en un momento."; status.className = "form-status is-error"; return; }
      if (!res.ok) {
        const m = { email: "Escribe un email válido.", consent: "Marca la casilla de la política de privacidad." }[res.reason] ||
          (/^rate_/.test(res.reason || "") ? "Has pedido varios diagnósticos seguidos. Espera unos minutos y vuelve a intentarlo." : "No hemos podido preparar tu diagnóstico. Inténtalo de nuevo.");
        status.textContent = m; status.className = "form-status is-error"; return;
      }
      renderReport(res.resultado);
      goTo("informe");
    });
  }

  /* ---------- paso 8: informe ---------- */
  function renderReport(r) {
    const p = S.perfil, q = S.respuestas, idx = S.idx || index();
    const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    const c = data.contacto || {};
    const callHref = c.reservaUrl || "index.html?motivo=llamada#contacto";
    const R = 52, CIRC = 2 * Math.PI * R;
    const list = (arr, cls) => '<ul class="r-list ' + (cls || "") + '">' + (arr || []).map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>";

    let html = '<article class="report-paper">';
    html += '<header class="report-head"><p class="kicker" style="color:var(--accent-ink)">Diagnóstico de marca personal · orientativo</p>' +
      '<h2 id="t-informe">' + esc(S.nombre || "Tu diagnóstico") + "</h2>" +
      '<p class="report-meta"><span>' + esc(fecha) + "</span><span>Objetivo: " + esc(OBJ[q.objetivo] || "—") + "</span><span>" + (S.pais === "CR" ? "Costa Rica" : "España") + "</span></p></header>";

    html += '<div class="r-score"><div class="r-gauge" aria-hidden="true"><svg viewBox="0 0 120 120"><circle class="g-bg" cx="60" cy="60" r="' + R + '"/><circle class="g-fg" cx="60" cy="60" r="' + R + '" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + CIRC.toFixed(1) + '" data-gauge="' + idx.total + '"/></svg><b>' + idx.total + "</b></div>" +
      "<div><strong>Índice orientativo de presencia: " + idx.total + "/100</strong>" +
      "<p>Perfil " + idx.perfil + "/50 · Actividad " + idx.act + "/35 · Disposición a grabar " + idx.cam + "/15. Lo calculamos con reglas sencillas a partir de lo que aparece en tu perfil y de tus respuestas.</p>" +
      (r && r.resumen ? '<p style="margin-top:.6rem;color:var(--ink)">' + esc(r.resumen) + "</p>" : "") + "</div></div>";

    if (r) {
      html += '<section class="r-section"><div class="r-h"><span>01</span><h3>Tu punto de partida</h3></div><div class="r-two">' +
        '<div><p class="r-sub">Lo que juega a tu favor</p>' + list(r.puntos_fuertes) + "</div>" +
        '<div><p class="r-sub">Lo que te está frenando</p>' + list(r.puntos_debiles, "is-minus") + "</div></div></section>";

      html += '<section class="r-section"><div class="r-h"><span>02</span><h3>Tu titular</h3></div>' +
        '<p class="r-headline-old">' + (p.titular ? "Hoy: <span class=\"mark\">" + esc(p.titular) + "</span>" : "Hoy: tu perfil no tiene un titular propio.") + "</p>" +
        '<p class="r-headline-new">' + esc(r.titular_propuesto) + "</p>" +
        (r.titular_por_que ? '<p class="r-why">' + esc(r.titular_por_que) + "</p>" : "") +
        '<button class="r-copy" type="button" data-copy>Copiar el titular</button></section>';

      html += '<section class="r-section"><div class="r-h"><span>03</span><h3>Tres ideas de vídeo</h3></div><div class="r-ideas">' +
        (r.ideas_video || []).map((i) => '<article class="r-idea"><p class="format-tag">«' + esc(String(i.formato || "").replace(/[«»"]/g, "")) + "»</p><h4>" + esc(i.titulo) + "</h4><blockquote>" + esc(i.gancho) + "</blockquote>" + (i.por_que ? "<p>" + esc(i.por_que) + "</p>" : "") + "</article>").join("") +
        "</div></section>";
    } else {
      html += '<section class="r-section"><div class="r-fallback"><p class="r-sub">Hemos guardado tus datos.</p><p>Ahora mismo no hemos podido generar la parte automática del diagnóstico (puntos fuertes y débiles, titular e ideas de vídeo). Lo preparamos nosotros a partir de tu perfil y te escribimos.</p></div></section>';
    }

    const reco = S.ritmoReco;
    html += '<section class="r-section"><div class="r-h"><span>' + (r ? "04" : "01") + '</span><h3>El ritmo que te recomendamos</h3></div><div class="r-plan">' +
      '<div><p class="r-plan-name"><span class="mark" data-mark="circle">' + esc(ritmoText(reco.videos, reco.posts).replace(" al mes", "")) + "</span></p>" +
      '<p class="r-plan-price">al mes, con tu voz y tu criterio</p>' +
      (r && r.ritmo_por_que ? '<p class="r-why">' + esc(r.ritmo_por_que) + "</p>" : "") + "</div>" +
      (S.calc ? '<div class="r-plan-calc">Por tu cuenta, ' + esc(ritmoText(S.calc.videos, S.calc.posts)) + " te llevarían unas <b>" + nf(S.calc.horasMes, 1) + " horas al mes</b>, que a " + nf(S.calc.tarifa) + " " + esc(S.calc.moneda) + "/h valen <b>" + esc(money(S.calc.valorMes)) + "</b>. Con Autoría, tu parte es grabar y aprobar; del resto nos encargamos nosotros.</div>" : "") +
      "</div></section>";

    html += '<section class="r-section"><div class="r-h"><span>' + (r ? "05" : "02") + '</span><h3>Tu siguiente paso</h3></div>' +
      (r && r.primer_paso ? '<p class="r-sub">' + esc(r.primer_paso) + "</p>" : '') +
      (r && r.primer_paso ? '<p class="r-why">En la llamada revisamos juntos este diagnóstico, resolvemos tus dudas y te proponemos cómo ponerlo en marcha.</p>' : '<p class="r-sub">El siguiente paso es una llamada con el equipo: revisamos juntos este diagnóstico, resolvemos tus dudas y te proponemos cómo ponerlo en marcha.</p>') +
      '<div class="r-next"><a class="btn btn-primary btn-lg" href="' + esc(callHref) + '"' + (c.reservaUrl ? ' target="_blank" rel="noopener"' : "") + ">Reserva una llamada</a>" +
      '<button class="btn btn-ghost btn-lg" type="button" data-print>Guardar en PDF</button></div></section>';

    html += '<p class="r-fine">Diagnóstico orientativo generado con inteligencia artificial a partir de tu perfil y tus respuestas. Puede contener imprecisiones; no es una auditoría ni garantiza resultados. El índice, las horas y el valor de tu tiempo son estimaciones basadas en suposiciones que puedes ajustar.</p>';
    html += "</article>";

    const box = $("[data-report]");
    box.innerHTML = html;
    if (A.addAnnotations) A.addAnnotations(box);
    setTimeout(() => {
      $$("[data-mark]", box).forEach((m) => m.classList.add("is-drawn"));
      const g = $("[data-gauge]", box);
      if (g) g.style.strokeDashoffset = (CIRC * (1 - Number(g.dataset.gauge) / 100)).toFixed(1);
    }, 450);
    const copy = $("[data-copy]", box);
    if (copy && r) copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(r.titular_propuesto); copy.textContent = "Copiado ✓"; }
      catch (_) { copy.textContent = "Selecciónalo y cópialo a mano"; }
    });
    const pr2 = $("[data-print]", box);
    if (pr2) pr2.addEventListener("click", () => window.print());
  }

  function boot() {
    bindNav();
    bindUpload();
    bindCalc();
    bindGate();
    try { history.replaceState({ step: "intro" }, "", location.pathname + location.search); } catch (_) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
