// ============================================================
// Viridiana & Felipe — lógica del sitio principal
// ============================================================

// ---------- Envelope gate (portada de apertura) ----------
(function envelopeGate() {
  const gate = document.getElementById("envelopeGate");
  const seal = document.getElementById("waxSeal");
  const card = document.getElementById("polaroidCard");
  const heroMedia = document.getElementById("heroMedia");
  if (!gate || !seal || gate.classList.contains("is-skipped")) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // FLIP: calcula exactamente cuánto debe moverse/escalarse la polaroid para
  // terminar calzando sobre la foto de fondo real, en vez de crecer parejo
  // desde su propio centro.
  function setFlipTargets() {
    if (!card || !heroMedia) return;
    const from = card.getBoundingClientRect();
    const to = heroMedia.getBoundingClientRect();

    const scaleX = to.width / from.width;
    const scaleY = to.height / from.height;
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);

    card.style.setProperty("--flip-x", `${dx}px`);
    card.style.setProperty("--flip-y", `${dy}px`);
    card.style.setProperty("--flip-scale-x", scaleX);
    card.style.setProperty("--flip-scale-y", scaleY);
  }

  seal.addEventListener(
    "click",
    () => {
      setFlipTargets();
      gate.classList.add("is-opening");

      setTimeout(() => {
        gate.classList.add("is-closing");

        setTimeout(() => {
          gate.style.display = "none";
          document.documentElement.classList.remove("gate-lock");
          sessionStorage.setItem("envelopeOpened", "1");
        }, reduced ? 200 : 650);
      }, reduced ? 50 : 1400);
    },
    { once: true }
  );
})();

// ---------- Countdown ----------
(function countdown() {
  const heroEl = document.getElementById("inicio");
  const target = new Date(heroEl.dataset.weddingDate).getTime();
  const els = {
    days: document.querySelector('[data-unit="days"]'),
    hours: document.querySelector('[data-unit="hours"]'),
    minutes: document.querySelector('[data-unit="minutes"]'),
  };

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      els.days.textContent = "00";
      els.hours.textContent = "00";
      els.minutes.textContent = "00";
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    els.days.textContent = String(days).padStart(2, "0");
    els.hours.textContent = String(hours).padStart(2, "0");
    els.minutes.textContent = String(minutes).padStart(2, "0");
  }

  tick();
  setInterval(tick, 1000 * 30);
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
    "deseos",
    "canciones",
    "contactos",
    "rsvp",
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

// ---------- RSVP form ----------
(function rsvpForm() {
  const form = document.getElementById("rsvpForm");
  if (!form) return;

  const attendingSelect = document.getElementById("attending");
  const guestCountField = document.getElementById("guestCountField");
  const submitBtn = document.getElementById("rsvpSubmit");
  const note = document.getElementById("rsvpNote");
  const successEl = document.getElementById("rsvpSuccess");

  attendingSelect.addEventListener("change", () => {
    const attending = attendingSelect.value === "yes";
    guestCountField.classList.toggle("is-hidden", !attending);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    note.textContent = "";
    note.className = "form-note";

    const fullName = form.fullName.value.trim();
    if (!fullName) {
      note.textContent = "Por favor escribe tu nombre.";
      note.classList.add("error");
      return;
    }

    const attending = form.attending.value === "yes";
    const payload = {
      fullName,
      attending,
      guestCount: attending ? Number(form.guestCount.value) : 0,
      message: form.message.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("request-failed");

      form.hidden = true;
      successEl.classList.add("is-visible");
    } catch (err) {
      note.textContent = "No pudimos enviar tu confirmación. Intenta de nuevo en un momento.";
      note.classList.add("error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmar asistencia";
    }
  });
})();
