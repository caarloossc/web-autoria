/* =============================================================
   AUTORÍA — comportamiento común (portada, páginas legales y
   diagnóstico). Patrón IIFE, sin módulos: funciona en cualquier
   hosting y abriendo el archivo directamente.
   ============================================================= */
(function () {
  "use strict";

  const root = document.documentElement;
  root.classList.add("booted");

  const data = window.__BRAND__ || {};
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const escHTML = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }
  const store = {
    get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (_) { return null; } },
    set(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (_) {} }
  };
  window.__AUTORIA__ = { $, $$, escHTML, safe, store, reduced };

  /* ---------- fecha de edición ---------- */
  function initEdicion() {
    const now = new Date();
    const mes = now.toLocaleDateString("es-ES", { month: "long" });
    $$("[data-edicion]").forEach((el) => { el.textContent = "Edición de " + mes + " de " + now.getFullYear(); });
    $$("[data-year]").forEach((el) => { el.textContent = String(now.getFullYear()); });
  }

  /* ---------- huecos de contacto y enlaces de reserva ---------- */
  function initContacto() {
    const c = data.contacto || {};
    $$("[data-contacto]").forEach((a) => {
      const k = a.dataset.contacto;
      if (k === "whatsapp" && c.whatsapp) {
        a.href = "https://wa.me/" + String(c.whatsapp).replace(/\D/g, "");
        a.textContent = c.whatsappTexto || ("+" + c.whatsapp);
        a.target = "_blank"; a.rel = "noopener";
      } else if (k === "email" && c.email) {
        a.href = "mailto:" + c.email; a.textContent = c.email;
      } else if (k === "linkedin" && c.linkedin) {
        a.href = c.linkedin; a.textContent = "Autoría en LinkedIn"; a.target = "_blank"; a.rel = "noopener";
      }
    });

    const onHome = !!$("#contacto");
    $$("[data-reserva]").forEach((a) => {
      if (c.reservaUrl) {
        a.href = c.reservaUrl; a.target = "_blank"; a.rel = "noopener";
        return;
      }
      if (!onHome) { a.href = "index.html?motivo=llamada#contacto"; return; }
      a.addEventListener("click", () => setMotivo("Reservar una llamada"));
    });

    $$("[data-plan-cta]").forEach((a) => {
      a.addEventListener("click", () => {
        setMotivo("Contratar un plan");
        const msg = $("#c-msg");
        if (msg && !msg.value.trim()) msg.value = "Me interesa el plan " + a.dataset.planCta + ".";
      });
    });

    const params = new URLSearchParams(location.search);
    if (params.get("motivo") === "llamada") setMotivo("Reservar una llamada");
    if (params.get("plan")) {
      setMotivo("Contratar un plan");
      const msg = $("#c-msg");
      if (msg && !msg.value.trim()) msg.value = "Me interesa el plan " + params.get("plan") + ".";
    }
  }
  function setMotivo(v) {
    const sel = $("[data-motivo]");
    if (sel) sel.value = v;
  }

  /* ---------- cabecera: fondo, ocultar al bajar, progreso ---------- */
  function initNav() {
    const nav = $("[data-masthead]");
    if (!nav) return;
    const bar = $("[data-progress]");
    let lastY = scrollY, ticking = false;
    function update() {
      const y = scrollY;
      nav.classList.toggle("is-scrolled", y > 24);
      if (!root.classList.contains("menu-open")) {
        if (y > 520 && y > lastY + 4) nav.classList.add("is-hidden");
        else if (y < lastY - 4 || y < 520) nav.classList.remove("is-hidden");
      }
      if (bar) {
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      }
      lastY = y; ticking = false;
    }
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    nav.addEventListener("focusin", () => nav.classList.remove("is-hidden"));
    update();
  }

  /* ---------- menú móvil ---------- */
  function initMenu() {
    const btn = $("[data-menu-btn]");
    const menu = $("[data-menu]");
    if (!btn || !menu) return;
    const label = $(".menu-btn-label", btn);
    function set(open) {
      root.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-hidden", String(!open));
      if (label) label.textContent = open ? "Cerrar" : "Menú";
      document.body.style.overflow = open ? "hidden" : "";
      if (open) { const first = $("a", menu); if (first) setTimeout(() => first.focus({ preventScroll: true }), 300); }
    }
    btn.addEventListener("click", () => set(!root.classList.contains("menu-open")));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("menu-open")) { set(false); btn.focus(); }
    });
    matchMedia("(min-width: 960px)").addEventListener("change", (m) => { if (m.matches) set(false); });
  }

  /* ---------- titulares: palabras con máscara ---------- */
  function splitDeep(el) {
    let count = 0;
    function walk(node) {
      const frag = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const i = document.createElement("span"); i.className = "wi";
            i.style.setProperty("--wi", String(count++));
            i.textContent = part; w.appendChild(i);
            /* signo de puntuación pegado a un elemento (p. ej. </em>.): que no se separe de línea */
            const prev = frag.lastChild;
            if (prev && prev.nodeType === 1 && /^[.,;:!?»)…]+$/.test(part)) {
              const nw = document.createElement("span"); nw.className = "nw";
              frag.replaceChild(nw, prev); nw.appendChild(prev); nw.appendChild(w);
            } else frag.appendChild(w);
          });
        } else if (child.nodeType === 1) {
          if (child.tagName === "BR" || child.tagName.toLowerCase() === "svg") { frag.appendChild(child.cloneNode(true)); return; }
          const clone = child.cloneNode(false);
          clone.appendChild(walk(child));
          frag.appendChild(clone);
        }
      });
      return frag;
    }
    const f = walk(el);
    el.textContent = "";
    el.appendChild(f);
    el.classList.add("is-split");
  }
  function initSplit() {
    $$("[data-split]").forEach((el) => {
      if (el.classList.contains("is-split")) return;
      el.classList.remove("reveal");
      splitDeep(el);
    });
  }

  /* ---------- anotaciones a mano (firma visual) ---------- */
  /* Trazos definidos en un lienzo 100×100 y reescalados al tamaño real de
     cada palabra, para que el grosor y el dibujado sean uniformes. */
  const ANNO = {
    circle: ["M10 40 C 16 13, 60 4, 86 15 C 104 25, 99 74, 64 88 C 37 99, 4 86, 3 57 C 2 34, 25 15, 55 10"],
    underline: ["M2 50 C 20 25, 41 70, 61 45 S 89 35, 98 50", "M12 85 C 36 62, 66 80, 92 70"],
    strike: ["M1 55 C 24 35, 49 72, 74 45 S 95 50, 99 35"],
    tick: ["M10 50 C 20 60, 28 70, 36 84 C 50 52, 66 28, 94 6"]
  };
  const ns = "http://www.w3.org/2000/svg";
  function scalePath(d, sx, sy) {
    return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (m, x, y) => (x * sx).toFixed(1) + " " + (y * sy).toFixed(1));
  }
  function drawAnno(svg) {
    const r = svg.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    if (svg.__w === Math.round(w) && svg.__h === Math.round(h)) return;
    svg.__w = Math.round(w); svg.__h = Math.round(h);
    svg.setAttribute("viewBox", "0 0 " + w.toFixed(1) + " " + h.toFixed(1));
    const defs = ANNO[svg.dataset.type] || [];
    Array.from(svg.children).forEach((p, i) => p.setAttribute("d", scalePath(defs[i], w / 100, h / 100)));
  }
  const annoRO = ("ResizeObserver" in window) ? new ResizeObserver((entries) => {
    entries.forEach((e) => { const svg = e.target.querySelector(":scope > svg.anno"); if (svg) drawAnno(svg); });
  }) : null;
  function makeAnno(type) {
    const defs = ANNO[type];
    if (!defs) return null;
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("class", "anno anno-" + type);
    svg.dataset.type = type;
    defs.forEach(() => {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("pathLength", "1");
      svg.appendChild(p);
    });
    return svg;
  }
  function addAnnotations(scope) {
    $$("[data-mark]", scope).forEach((el) => {
      if (el.dataset.markBound) return;
      el.dataset.markBound = "1";
      const svg = makeAnno(el.dataset.mark);
      if (!svg) return;
      el.appendChild(svg);
      drawAnno(svg);
      if (annoRO) annoRO.observe(el);
    });
  }
  window.__AUTORIA__.addAnnotations = addAnnotations;

  function initMarks() {
    addAnnotations(document);
    const marks = $$("[data-mark]");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const inSplit = el.closest("[data-split]");
        if (inSplit && !el.style.getPropertyValue("--anno-delay")) el.style.setProperty("--anno-delay", ".95s");
        const inList = el.closest(".symptoms li");
        if (inList) {
          const idx = Array.from(inList.parentNode.children).indexOf(inList);
          el.style.setProperty("--anno-delay", (0.35 + idx * 0.16).toFixed(2) + "s");
        }
        requestAnimationFrame(() => el.classList.add("is-drawn"));
        io.unobserve(el);
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -8% 0px" });
    marks.forEach((m) => io.observe(m));
    setTimeout(() => marks.forEach((m) => { if (m.getBoundingClientRect().top < innerHeight) m.classList.add("is-drawn"); }), 6000);
  }

  /* ---------- apariciones al hacer scroll ---------- */
  function initReveals() {
    const els = $$("[data-reveal], [data-split]");
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.style.setProperty("--rd", Math.min(n * 0.08, 0.48).toFixed(2) + "s");
        n++;
        el.classList.add("is-revealed");
        io.unobserve(el);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
    setTimeout(() => {
      els.forEach((el) => { if (!el.classList.contains("is-revealed") && el.getBoundingClientRect().top < innerHeight) el.classList.add("is-revealed"); });
    }, 6000);
  }

  /* ---------- código de tiempo del visor ---------- */
  function initTimecode() {
    const els = $$("[data-timecode]");
    if (!els.length) return;
    const visible = new Set();
    const start = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { visible.add(e.target); if (!start.has(e.target)) start.set(e.target, performance.now() - Math.random() * 9000); }
        else visible.delete(e.target);
      });
    }, { threshold: 0 });
    els.forEach((el) => io.observe(el));
    const pad = (n) => String(n).padStart(2, "0");
    let last = 0;
    function tick(t) {
      if (t - last > 40) {
        last = t;
        visible.forEach((el) => {
          const limit = parseFloat(el.dataset.limit || "0");
          let s = (t - start.get(el)) / 1000;
          if (limit) s = s % limit;
          const f = Math.floor((s % 1) * 25);
          const sec = Math.floor(s) % 60, min = Math.floor(s / 60) % 60, hr = Math.floor(s / 3600);
          el.textContent = pad(hr) + ":" + pad(min) + ":" + pad(sec) + ":" + pad(f);
        });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- cinta ---------- */
  function initMarquee() {
    $$("[data-marquee]").forEach((track) => {
      const wrap = track.parentNode;
      const base = track.innerHTML;
      let guard = 0;
      while (track.scrollWidth < wrap.clientWidth * 1.2 && guard++ < 6) track.innerHTML += base;
      const clone = track.cloneNode(true);
      clone.removeAttribute("data-marquee");
      wrap.appendChild(clone);
      const dur = Math.max(20, track.scrollWidth / 55);
      wrap.style.setProperty("--ticker-dur", dur + "s");
      wrap.classList.add("is-running");
    });
  }

  /* ---------- precios: España / Costa Rica ---------- */
  function detectCountry() {
    const saved = store.get("autoria-pais");
    if (saved === "ES" || saved === "CR") return saved;
    try { if (Intl.DateTimeFormat().resolvedOptions().timeZone === "America/Costa_Rica") return "CR"; } catch (_) {}
    return "ES";
  }
  window.__AUTORIA__.detectCountry = detectCountry;

  function tweenNumber(el, to) {
    const from = parseFloat(String(el.textContent).replace(/\./g, "").replace(",", ".")) || 0;
    if (reduced || from === to) { el.textContent = to.toLocaleString("es-ES"); return; }
    const t0 = performance.now(), dur = 700;
    function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString("es-ES");
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  window.__AUTORIA__.tweenNumber = tweenNumber;

  function initPricing() {
    const sw = $("[data-country-switch]");
    if (!sw || !data.precios) return;
    function apply(country, animate) {
      const p = data.precios[country];
      if (!p) return;
      sw.dataset.active = country;
      $$("[data-country]", sw).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.country === country)));
      const set = (key, val) => $$('[data-price="' + key + '"]').forEach((el) => animate ? tweenNumber(el, val) : (el.textContent = val.toLocaleString("es-ES")));
      set("arranque", p.arranque.importe);
      set("esencial", p.cuota.esencial);
      set("recomendado", p.cuota.recomendado);
      set("completo", p.cuota.completo);
      $$("[data-currency]").forEach((el) => { el.textContent = p.moneda; });
      $$("[data-cuota-nota]").forEach((el) => { el.textContent = country === "ES" ? "/mes + IVA" : "/mes"; });
      $$("[data-arranque-nota]").forEach((el) => { el.textContent = p.arranque.nota; });
      $$("[data-precio-pie]").forEach((el) => { el.textContent = p.pie; });
      const pais = $("#c-pais");
      if (pais && !pais.dataset.touched) pais.value = country === "CR" ? "Costa Rica" : "España";
    }
    $$("[data-country]", sw).forEach((b) => b.addEventListener("click", () => {
      store.set("autoria-pais", b.dataset.country);
      apply(b.dataset.country, true);
    }));
    sw.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const next = sw.dataset.active === "ES" ? "CR" : "ES";
      store.set("autoria-pais", next); apply(next, true);
      const b = $('[data-country="' + next + '"]', sw); if (b) b.focus();
    });
    const pais = $("#c-pais");
    if (pais) pais.addEventListener("change", () => { pais.dataset.touched = "1"; });
    apply(detectCountry(), false);
  }

  /* ---------- formulario de contacto ---------- */
  function initContactForm() {
    const form = $("[data-contact-form]");
    if (!form) return;
    const status = $("[data-form-status]", form);
    const btn = $(".form-submit", form);
    const say = (msg, type) => { status.textContent = msg; status.className = "form-status " + (type ? "is-" + type : ""); };

    function validate() {
      let ok = true;
      $$(".field", form).forEach((f) => f.classList.remove("is-invalid"));
      const req = [form.nombre, form.email];
      req.forEach((inp) => { if (!inp.value.trim()) { inp.closest(".field").classList.add("is-invalid"); ok = false; } });
      if (form.email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim())) { form.email.closest(".field").classList.add("is-invalid"); ok = false; }
      const consent = form.consent;
      consent.closest(".consent").classList.toggle("is-invalid", !consent.checked);
      if (!consent.checked) ok = false;
      return ok;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.classList.contains("is-sending")) return;
      if (!validate()) {
        say(!form.consent.checked ? "Para enviarlo, marca la casilla de la política de privacidad." : "Revisa los campos marcados.", "error");
        const bad = $(".is-invalid input, .is-invalid select", form) || form.consent;
        if (bad) bad.focus();
        return;
      }
      form.classList.add("is-sending"); btn.disabled = true; say("Enviando…");
      const payload = {
        nombre: form.nombre.value.trim(), email: form.email.value.trim(), telefono: form.telefono.value.trim(),
        pais: form.pais.value, cargo: form.cargo.value.trim(), motivo: form.motivo.value,
        mensaje: form.mensaje.value.trim(), consent: form.consent.checked, web: form.web.value
      };
      let ok = false;
      try {
        const r = await fetch("api/contacto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const j = await r.json();
        ok = !!(j && j.ok);
      } catch (_) { ok = false; }
      form.classList.remove("is-sending"); btn.disabled = false;
      if (ok) {
        form.reset();
        say("Recibido, " + payload.nombre.split(/\s+/)[0] + ". Te escribimos muy pronto.", "ok");
      } else {
        const c = data.contacto || {};
        const alt = c.email ? " Escríbenos a " + c.email + "." : (c.whatsappTexto ? " Escríbenos por WhatsApp al " + c.whatsappTexto + "." : "");
        say("No hemos podido enviarlo ahora mismo. Inténtalo de nuevo en un momento." + alt, "error");
      }
    });
  }

  /* ---------- GSAP: parallax y tarjetas apiladas ---------- */
  function initGsap() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (!reduced) {
      $$("img[data-parallax]").forEach((img) => {
        const frame = img.closest(".frame") || img;
        gsap.fromTo(img, { yPercent: -5, scale: 1.12 }, {
          yPercent: 5, scale: 1.12, ease: "none",
          scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true }
        });
      });
    }
    const cards = $$(".stack-card");
    if (cards.length > 1 && gsap.matchMedia) {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 960px)", () => {
        const navH = parseFloat(getComputedStyle(root).getPropertyValue("--nav-h")) || 68;
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) return;
          let shade = $(".stack-shade", card);
          if (!shade) { shade = document.createElement("span"); shade.className = "stack-shade"; card.appendChild(shade); }
          const st = { trigger: next, start: "top bottom", end: () => "top " + (navH + 26 + (i + 1) * 18) + "px", scrub: true };
          gsap.to(card, { scale: 0.94, ease: "none", scrollTrigger: st });
          gsap.to(shade, { opacity: 0.06, ease: "none", scrollTrigger: Object.assign({}, st) });
        });
        return () => cards.forEach((c) => { gsap.set(c, { clearProps: "transform" }); });
      });
    }
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  /* ---------- asistente de chat ---------- */
  function initAsistente() {
    const box = $("[data-asistente]");
    if (!box) return;
    const openBtn = $("[data-asistente-open]", box);
    const panel = $("[data-asistente-panel]", box);
    const closeBtn = $("[data-asistente-close]", box);
    const log = $("[data-asistente-log]", box);
    const form = $("[data-asistente-form]", box);
    const input = $("textarea", form);
    const sendBtn = $(".asistente-send", form);
    const consentLabel = $("[data-asistente-consent]", box);
    const consent = $("input", consentLabel);
    const chips = $("[data-asistente-chips]", box);
    const KEY = "autoria-chat";
    let history = [];
    try { history = JSON.parse(store.get(KEY, true) || "[]"); } catch (_) { history = []; }
    let busy = false;

    if (store.get(KEY + "-ok", true) === "1") { consent.checked = true; consentLabel.hidden = true; }

    const diagHref = $("body.page-diag") ? "#" : "diagnostico.html";
    function actionsHTML(kinds) {
      const c = data.contacto || {};
      const out = [];
      if (kinds.indexOf("d") > -1) out.push('<a class="btn btn-primary" href="' + diagHref + '" data-act="diag">Haz tu diagnóstico gratis</a>');
      if (kinds.indexOf("l") > -1) {
        const href = c.reservaUrl ? c.reservaUrl : ($("#contacto") ? "#contacto" : "index.html?motivo=llamada#contacto");
        out.push('<a class="btn btn-ghost" href="' + escHTML(href) + '"' + (c.reservaUrl ? ' target="_blank" rel="noopener"' : "") + ' data-act="call">Reserva una llamada</a>');
      }
      return out.length ? '<div class="msg-actions">' + out.join("") + "</div>" : "";
    }
    function formatReply(text) {
      let kinds = "";
      text = String(text || "").replace(/\[\[\s*DIAGNOSTICO\s*\]\]/gi, () => { kinds += "d"; return ""; })
                               .replace(/\[\[\s*LLAMADA\s*\]\]/gi, () => { kinds += "l"; return ""; }).trim();
      let html = "", inList = false;
      escHTML(text).split("\n").forEach((line) => {
        const m = line.match(/^\s*[-•*]\s+(.*)/);
        if (m) {
          if (!inList) { html += "<ul>"; inList = true; }
          html += "<li>" + m[1] + "</li>";
        } else {
          if (inList) { html += "</ul>"; inList = false; }
          html += line + "\n";
        }
      });
      if (inList) html += "</ul>";
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n{3,}/g, "\n\n").trim();
      return html + actionsHTML(kinds);
    }
    function add(role, html) {
      const div = document.createElement("div");
      div.className = "msg " + (role === "user" ? "msg-user" : "msg-bot");
      div.innerHTML = html;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }
    function render() {
      log.innerHTML = "";
      add("bot", formatReply("Hola. Soy el asistente de Autoría. Puedo contarte cómo trabajamos, qué incluye cada plan, cuánto cuesta o cómo se graba. ¿Qué te gustaría saber?"));
      history.forEach((h) => add(h.role === "user" ? "user" : "bot", h.role === "user" ? escHTML(h.text) : formatReply(h.text)));
      chips.hidden = history.length > 0;
    }
    function open() {
      box.classList.add("is-open");
      panel.hidden = false;
      openBtn.setAttribute("aria-expanded", "true");
      if (matchMedia("(max-width: 539px)").matches) document.body.style.overflow = "hidden";
      if (!log.children.length) render();
      setTimeout(() => input.focus({ preventScroll: true }), 60);
    }
    function close() {
      box.classList.remove("is-open");
      panel.hidden = true;
      openBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      openBtn.focus({ preventScroll: true });
    }
    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && box.classList.contains("is-open")) close(); });
    $$("[data-open-asistente]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); open(); }));
    log.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]");
      if (!a) return;
      if (a.dataset.act === "call") { setMotivo("Reservar una llamada"); if (matchMedia("(max-width: 539px)").matches) close(); }
      if (a.dataset.act === "diag" && a.getAttribute("href") === "#") { e.preventDefault(); close(); }
    });

    function autosize() { input.style.height = "auto"; input.style.height = Math.min(120, input.scrollHeight) + "px"; }
    input.addEventListener("input", autosize);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true })); }
    });
    consent.addEventListener("change", () => {
      consentLabel.classList.remove("is-invalid");
      if (consent.checked) { store.set(KEY + "-ok", "1", true); }
    });
    chips.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      input.value = b.textContent;
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || busy) return;
      if (!consent.checked) {
        consentLabel.classList.add("is-invalid");
        consent.focus();
        return;
      }
      consentLabel.hidden = true;
      busy = true; sendBtn.disabled = true;
      chips.hidden = true;
      add("user", escHTML(text));
      input.value = ""; autosize();
      const typing = add("bot", '<span class="msg-typing" aria-label="Escribiendo"><i></i><i></i><i></i></span>');
      typing.classList.add("is-typing");
      let reply = "";
      try {
        const r = await fetch("api/asistente", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: history.slice(-10), pagina: $("body.page-diag") ? "diagnostico" : "inicio" })
        });
        const j = await r.json();
        reply = (j && j.reply) ? String(j.reply) : "";
      } catch (_) { reply = ""; }
      if (!reply) reply = "Ahora mismo no puedo responder. Puedes hacer el diagnóstico gratis o dejarnos tus datos en el formulario de contacto y te escribimos. [[DIAGNOSTICO]] [[LLAMADA]]";
      typing.remove();
      add("bot", formatReply(reply));
      history.push({ role: "user", text: text }, { role: "model", text: reply });
      history = history.slice(-16);
      store.set(KEY, JSON.stringify(history), true);
      busy = false; sendBtn.disabled = false;
      input.focus({ preventScroll: true });
    });
  }

  /* ---------- arranque ---------- */
  function boot() {
    safe(initEdicion, "edicion");
    safe(initContacto, "contacto");
    safe(initSplit, "split");
    safe(initMarks, "marks");
    safe(initReveals, "reveals");
    safe(initNav, "nav");
    safe(initMenu, "menu");
    safe(initTimecode, "timecode");
    safe(initMarquee, "marquee");
    safe(initPricing, "pricing");
    safe(initContactForm, "contactForm");
    safe(initAsistente, "asistente");
    safe(initGsap, "gsap");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
