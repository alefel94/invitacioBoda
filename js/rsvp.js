// ============================================================
// Viridiana & Felipe — Confirmación de Asistencia
// Si el link trae ?invite=CODIGO, el formulario se precarga con el
// nombre y el número de boletos asignados a esa invitación.
// ============================================================

// captura ?invite=CODIGO de la URL (por si esta página se abrió directo,
// sin pasar por index.html) y lo deja guardado para el resto de la sesión
(function captureInviteCode() {
  const code = new URLSearchParams(window.location.search).get("invite");
  if (code) sessionStorage.setItem("inviteCode", code.trim());
})();

(function rsvpForm() {
  const form = document.getElementById("rsvpForm");
  if (!form) return;

  const attendingSelect = document.getElementById("attending");
  const guestCountField = document.getElementById("guestCountField");
  const guestCountSelect = document.getElementById("guestCount");
  const submitBtn = document.getElementById("rsvpSubmit");
  const note = document.getElementById("rsvpNote");
  const successEl = document.getElementById("rsvpSuccess");
  const successTitle = document.getElementById("rsvpSuccessTitle");
  const successText = document.getElementById("rsvpSuccessText");
  const suggestionsList = document.getElementById("fullNameSuggestions");

  // empieza con el código de la URL/sesión, si lo hay; elegir un nombre del
  // autocompletado lo reemplaza por el código de esa invitación específica
  const urlInviteCode = sessionStorage.getItem("inviteCode") || "";
  let selectedInviteCode = urlInviteCode;
  let lockedName = ""; // nombre exacto que corresponde a selectedInviteCode

  // el botón solo se habilita cuando Nombre y ¿Asistirás? tienen datos
  function updateSubmitState() {
    const ready = form.fullName.value.trim() !== "" && form.attending.value !== "";
    submitBtn.disabled = !ready;
  }

  function setGuestOptions(max) {
    guestCountSelect.innerHTML = "";
    for (let n = 1; n <= max; n++) {
      const opt = document.createElement("option");
      opt.value = String(n);
      opt.textContent = n === 1 ? "1 Persona" : `${n} Personas`;
      guestCountSelect.appendChild(opt);
    }
  }

  // precarga los datos de una invitación (por el código de la URL/sesión al
  // entrar, o el de la invitación elegida en el autocompletado)
  async function loadInvite(code) {
    if (!code) return;
    try {
      const res = await fetch(`/api/guest?code=${encodeURIComponent(code)}`);
      if (!res.ok) return; // código inválido: se queda el formulario genérico
      const guest = await res.json();

      selectedInviteCode = code;
      setGuestOptions(guest.allowedGuests || 1);
      note.textContent = `Invitación de ${guest.displayName} · ${guest.allowedGuests} boleto${guest.allowedGuests === 1 ? "" : "s"} asignado${guest.allowedGuests === 1 ? "" : "s"}.`;
      note.className = "form-note success";

      const prev = guest.previousResponse;
      if (prev) {
        form.fullName.value = prev.fullName;
        form.attending.value = prev.attending ? "yes" : "no";
        guestCountField.classList.toggle("is-hidden", !prev.attending);
        if (prev.attending) guestCountSelect.value = String(prev.guestCount);
        form.message.value = "";
      } else {
        form.fullName.value = guest.displayName;
      }
      lockedName = form.fullName.value;
      updateSubmitState();
    } catch (err) {
      /* sin conexión o similar: se queda el formulario genérico */
    }
  }
  loadInvite(selectedInviteCode);

  // ---------- Autocompletado del nombre con la lista de invitados ----------
  let guestDirectory = [];
  let activeSuggestionIndex = -1;

  function normalize(str) {
    return str
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }

  async function loadGuestDirectory() {
    try {
      const res = await fetch("/api/guest-directory");
      if (!res.ok) return;
      const data = await res.json();
      guestDirectory = data.guests || [];
    } catch (err) {
      /* sin autocompletado disponible; el formulario genérico sigue funcionando */
    }
  }
  loadGuestDirectory();

  function hideSuggestions() {
    suggestionsList.hidden = true;
    suggestionsList.innerHTML = "";
    activeSuggestionIndex = -1;
  }

  function highlightMatch(name, query) {
    const idx = normalize(name).indexOf(query);
    if (idx === -1) return escapeHtmlRsvp(name);
    return (
      escapeHtmlRsvp(name.slice(0, idx)) +
      "<mark>" + escapeHtmlRsvp(name.slice(idx, idx + query.length)) + "</mark>" +
      escapeHtmlRsvp(name.slice(idx + query.length))
    );
  }

  function escapeHtmlRsvp(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showSuggestions(matches, query) {
    if (!matches.length) return hideSuggestions();
    suggestionsList.innerHTML = matches
      .map(
        (g, i) =>
          `<li role="option" data-index="${i}" data-code="${g.inviteCode}">${highlightMatch(g.displayName, query)}</li>`
      )
      .join("");
    suggestionsList.hidden = false;
    activeSuggestionIndex = -1;
  }

  function pickSuggestion(inviteCodeToLoad, displayName) {
    form.fullName.value = displayName;
    hideSuggestions();
    loadInvite(inviteCodeToLoad);
  }

  form.fullName.addEventListener("input", () => {
    // si el texto ya no coincide con la invitación que se había elegido
    // (URL o autocompletado), se suelta esa liga para no mandar el boleto
    // de alguien más con un nombre distinto
    if (lockedName && form.fullName.value !== lockedName) {
      lockedName = "";
      selectedInviteCode = "";
      setGuestOptions(1);
      note.textContent = "";
      note.className = "form-note";
    }

    const query = normalize(form.fullName.value.trim());
    if (query.length < 2) return hideSuggestions();
    const matches = guestDirectory
      .filter((g) => normalize(g.displayName).includes(query))
      .slice(0, 6);
    showSuggestions(matches, query);
  });

  suggestionsList.addEventListener("click", (event) => {
    const li = event.target.closest("li[data-code]");
    if (!li) return;
    pickSuggestion(li.dataset.code, guestDirectory.find((g) => g.inviteCode === li.dataset.code)?.displayName || form.fullName.value);
  });

  form.fullName.addEventListener("keydown", (event) => {
    const items = Array.from(suggestionsList.querySelectorAll("li"));
    if (suggestionsList.hidden || !items.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      items[activeSuggestionIndex].click();
      return;
    } else if (event.key === "Escape") {
      hideSuggestions();
      return;
    } else {
      return;
    }

    items.forEach((li, i) => li.classList.toggle("is-active", i === activeSuggestionIndex));
    items[activeSuggestionIndex].scrollIntoView({ block: "nearest" });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".field-autocomplete")) hideSuggestions();
  });

  form.fullName.addEventListener("input", updateSubmitState);

  attendingSelect.addEventListener("change", () => {
    const attending = attendingSelect.value === "yes";
    guestCountField.classList.toggle("is-hidden", !attending);
    updateSubmitState();
  });

  updateSubmitState();

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

    if (!form.attending.value) {
      note.textContent = "Por favor selecciona si podrás asistir.";
      note.classList.add("error");
      return;
    }

    const attending = form.attending.value === "yes";
    const payload = {
      fullName,
      attending,
      guestCount: attending ? Number(form.guestCount.value) : 0,
      message: form.message.value.trim(),
      inviteCode: selectedInviteCode || undefined,
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
      const data = await res.json().catch(() => ({}));

      if (data.duplicate) {
        const existing = data.existing || {};
        successTitle.textContent = "Ya habíamos recibido tu confirmación";
        successText.textContent = existing.attending
          ? `Nos dijiste que sí asistirías (${existing.guestCount || 1} ${existing.guestCount === 1 ? "persona" : "personas"}). Si algo cambió, contáctanos directamente.`
          : "Nos dijiste que no podrás acompañarnos. Si cambiaste de opinión, contáctanos directamente.";
      }

      form.hidden = true;
      successEl.classList.add("is-visible");
      const card = successEl.closest(".rsvp-card");
      card?.classList.add("is-success");
      card?.querySelector(".rsvp-deadline")?.setAttribute("hidden", "");
      card?.scrollTo({ top: 0, behavior: "instant" });
      sessionStorage.setItem("envelopeOpened", "1");

      if (document.body.classList.contains("rsvp-page")) {
        // página independiente (rsvp.html visitada directo): sí hay que
        // navegar, así que le pasamos el testigo a la música primero
        window.handOffMusic?.();
        setTimeout(() => {
          window.location.href = "index.html";
        }, 2600);
      } else {
        // superposición dentro de index.html: nunca se sale de la página,
        // así que la música no necesita ningún testigo — solo se cierra
        setTimeout(() => {
          window.closeRsvpOverlay?.();
        }, 1800);
      }
    } catch (err) {
      note.textContent = "No pudimos enviar tu confirmación. Intenta de nuevo en un momento.";
      note.classList.add("error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmar";
    }
  });
})();
