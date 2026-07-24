// ============================================================
// Viridiana & Felipe — lógica del sitio principal
// ============================================================

// ---------- Bloquear/restaurar el scroll sin saltar a la posición 0 ----------
// (html tiene scroll-behavior: smooth, así que hay que apagarlo mientras
// bloqueamos/restauramos, si no cualquier ajuste de scroll se ve animado)
function lockScroll() {
  const scrollY = window.scrollY;
  document.documentElement.style.scrollBehavior = "auto";
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.documentElement.classList.add("no-scroll");
}

function unlockScroll() {
  const scrollY = document.body.style.top;
  document.documentElement.style.scrollBehavior = "auto";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.documentElement.classList.remove("no-scroll");
  window.scrollTo(0, scrollY ? -parseInt(scrollY, 10) : 0);
  requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = "";
  });
}

// ---------- Envelope gate (portada de apertura) ----------
(function envelopeGate() {
  const gate = document.getElementById("envelopeGate");
  const seal = document.getElementById("waxSeal");
  const envelopeView = document.getElementById("envelopeView");
  const letterCard = document.getElementById("letterCard");
  const continueBtn = document.getElementById("continueBtn");
  if (!gate || !seal || gate.classList.contains("is-skipped")) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1) Clic en el sello: el sello "revienta", las dos mitades del sobre se
  //    separan hacia arriba/abajo, y la carta se revela DETRÁS mientras se abren.
  seal.addEventListener(
    "click",
    () => {
      gate.classList.add("is-opening");

      // la carta aparece justo cuando las mitades empiezan a separarse,
      // para que sea el propio sobre el que la va descubriendo
      setTimeout(() => {
        if (letterCard) {
          letterCard.hidden = false;
          requestAnimationFrame(() => letterCard.classList.add("is-visible"));
        }
      }, reduced ? 50 : 1000);

      // cuando las mitades ya salieron de pantalla, se retira el sobre
      setTimeout(() => {
        if (envelopeView) envelopeView.style.display = "none";
      }, reduced ? 100 : 3600);
    },
    { once: true }
  );

  // 2) Clic en "Continuar": el sobre se desvanece con un fundido elegante
  //    (ya definido en CSS como .is-closing, solo faltaba dispararlo) y
  //    recién entonces se revela la landing page. El RSVP ya no se abre
  //    aquí — vive al final de la página, como antes.
  continueBtn?.addEventListener(
    "click",
    () => {
      sessionStorage.setItem("envelopeOpened", "1");
      document.documentElement.classList.remove("no-scroll");
      gate.classList.add("is-closing");
      setTimeout(() => { gate.style.display = "none"; }, reduced ? 50 : 2000);
    },
    { once: true }
  );
})();

// ---------- RSVP: superposición dentro de la página (no navega, así la
// música nunca se corta). rsvp.html sigue existiendo como respaldo por si
// alguien entra a esa dirección directo. ----------
(function rsvpOverlay() {
  const overlay = document.getElementById("rsvpOverlay");
  if (!overlay) return;

  const closeBtn = document.getElementById("rsvpOverlayClose");

  function openOverlay(pushState) {
    overlay.hidden = false;
    if (!document.documentElement.classList.contains("no-scroll")) lockScroll();
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    if (pushState) history.pushState({ rsvp: true }, "", "rsvp.html");
  }

  function closeOverlay(pushState) {
    overlay.classList.remove("is-visible");
    unlockScroll();
    setTimeout(() => { overlay.hidden = true; }, 450);
    if (pushState) history.pushState({ rsvp: false }, "", "index.html");
  }

  window.openRsvpOverlay = () => openOverlay(true);
  window.closeRsvpOverlay = () => closeOverlay(true);

  closeBtn?.addEventListener("click", () => closeOverlay(true));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay(true);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-visible")) closeOverlay(true);
  });

  document.querySelectorAll("[data-rsvp-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openOverlay(true);
    });
  });

  window.addEventListener("popstate", () => {
    if (window.location.href.includes("rsvp.html")) openOverlay(false);
    else closeOverlay(false);
  });
})();

// (La música de fondo vive en js/music.js — se comparte con rsvp.html
// para que no se corte al navegar entre páginas)

// ---------- Galería: carrusel con autoplay, flechas, dots y swipe ----------
(function galleryCarousel() {
  const track = document.getElementById("galleryTrack");
  const slides = Array.from(document.querySelectorAll(".gallery-slide"));
  const dots = Array.from(document.querySelectorAll(".gallery-dot"));
  const prevBtn = document.getElementById("galleryPrev");
  const nextBtn = document.getElementById("galleryNext");
  if (!track || !slides.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AUTOPLAY_MS = 4200;
  const RESUME_DELAY_MS = 5000;

  let activeIndex = 0;
  let autoplayTimer = null;
  let resumeTimer = null;
  let sectionVisible = true;

  function setActive(index) {
    activeIndex = index;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
      dot.setAttribute("aria-selected", i === index ? "true" : "false");
    });
  }

  function goTo(index) {
    const target = slides[(index + slides.length) % slides.length];
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
  }

  function next() { goTo(activeIndex + 1); }
  function prev() { goTo(activeIndex - 1); }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function startAutoplay() {
    if (reduced || autoplayTimer) return;
    autoplayTimer = setInterval(() => {
      if (!sectionVisible || document.hidden) return;
      next();
    }, AUTOPLAY_MS);
  }

  function pauseAndScheduleResume() {
    stopAutoplay();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(startAutoplay, RESUME_DELAY_MS);
  }

  // qué foto está centrada — cubre autoplay, flechas, dots y swipe manual a la vez
  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          setActive(Number(entry.target.dataset.index));
        }
      });
    },
    { root: track, threshold: [0.6] }
  );
  slides.forEach((slide) => slideObserver.observe(slide));

  // solo reproduce mientras la galería está visible en pantalla
  const sectionObserver = new IntersectionObserver(
    ([entry]) => { sectionVisible = entry.isIntersecting; },
    { threshold: 0.2 }
  );
  sectionObserver.observe(track);

  prevBtn?.addEventListener("click", () => { prev(); pauseAndScheduleResume(); });
  nextBtn?.addEventListener("click", () => { next(); pauseAndScheduleResume(); });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => { goTo(Number(dot.dataset.index)); pauseAndScheduleResume(); });
  });

  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { next(); pauseAndScheduleResume(); }
    if (event.key === "ArrowLeft") { prev(); pauseAndScheduleResume(); }
  });

  ["pointerdown", "wheel"].forEach((type) => {
    track.addEventListener(type, pauseAndScheduleResume, { passive: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  setActive(0);
  startAutoplay();
})();

// ---------- Countdown (soporta varios widgets .countdown en la página) ----------
(function countdown() {
  const heroEl = document.getElementById("inicio");
  const target = new Date(heroEl.dataset.weddingDate).getTime();
  const widgets = document.querySelectorAll(".countdown");
  if (!widgets.length) return;

  function setUnit(widget, unit, value) {
    const el = widget.querySelector(`[data-unit="${unit}"]`);
    if (el) el.textContent = String(value).padStart(2, "0");
  }

  function tick() {
    const diff = target - Date.now();
    const days = diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
    const hours = diff > 0 ? Math.floor((diff / (1000 * 60 * 60)) % 24) : 0;
    const minutes = diff > 0 ? Math.floor((diff / (1000 * 60)) % 60) : 0;
    const seconds = diff > 0 ? Math.floor((diff / 1000) % 60) : 0;

    widgets.forEach((widget) => {
      setUnit(widget, "days", days);
      setUnit(widget, "hours", hours);
      setUnit(widget, "minutes", minutes);
      setUnit(widget, "seconds", seconds);
    });
  }

  tick();
  setInterval(tick, 1000);
})();

// ---------- Agregar a calendario (.ics) ----------
(function addToCalendar() {
  const btn = document.getElementById("addToCalendarBtn");
  const heroEl = document.getElementById("inicio");
  if (!btn || !heroEl) return;

  function toICSDate(date) {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  btn.addEventListener("click", () => {
    const start = new Date(heroEl.dataset.weddingDate);
    const end = new Date(start.getTime() + 8.5 * 60 * 60 * 1000);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      "SUMMARY:Boda de Viridiana & Felipe",
      "LOCATION:Quinta Majam\\, Lindavista\\, Villas de Monticello\\, Zapopan\\, Jal.",
      "DESCRIPTION:¡Nos casamos! Acompáñanos a celebrar.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "boda-viridiana-felipe.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  });
})();

// ---------- Header: solid background after scrolling past hero ----------
(function headerScrollState() {
  const header = document.getElementById("siteHeader");
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > window.innerHeight * 0.6);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

// ---------- Mobile off-canvas menu ----------
(function mobileMenu() {
  const menu = document.getElementById("mobileMenu");
  const toggle = document.getElementById("navToggle");
  const close = document.getElementById("mobileMenuClose");

  function open() {
    menu.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }
  function shut() {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", open);
  close.addEventListener("click", shut);
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", shut));
})();

// ---------- Scrollspy: highlight active section in nav + bottom nav ----------
(function scrollspy() {
  const sections = [
    "historia",
    "itinerario",
    "ubicaciones",
    "padrinos",
    "vestimenta",
    "regalos",
    "galeria",
  ]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const links = document.querySelectorAll("[data-nav-link]");

  function setActive(id) {
    links.forEach((link) => {
      const isMatch = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isMatch);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
})();

// ---------- Reveal on scroll ----------
(function revealOnScroll() {
  const revealEls = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => observer.observe(el));
})();

// (El formulario de RSVP vive en rsvp.html con su propia lógica: js/rsvp.js)
