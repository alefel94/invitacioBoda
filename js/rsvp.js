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
  const inviteCode = sessionStorage.getItem("inviteCode") || "";

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

  // precarga los datos de la invitación, si el link trae un código válido
  async function loadInvite() {
    if (!inviteCode) return;
    try {
      const res = await fetch(`/api/guest?code=${encodeURIComponent(inviteCode)}`);
      if (!res.ok) return; // código inválido: se queda el formulario genérico
      const guest = await res.json();

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
      updateSubmitState();
    } catch (err) {
      /* sin conexión o similar: se queda el formulario genérico */
    }
  }
  loadInvite();

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
      inviteCode: inviteCode || undefined,
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
