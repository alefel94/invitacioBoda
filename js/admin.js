// ============================================================
// Panel de RSVP — solo accesible con la contraseña de admin
// ============================================================

const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginNote = document.getElementById("loginNote");
const loginSubmit = document.getElementById("loginSubmit");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const tableContainer = document.getElementById("tableContainer");
const statResponses = document.getElementById("statResponses");
const statGuests = document.getElementById("statGuests");
const statDeclined = document.getElementById("statDeclined");

const tabResponsesBtn = document.getElementById("tabResponsesBtn");
const tabGuestsBtn = document.getElementById("tabGuestsBtn");
const panelResponses = document.getElementById("panelResponses");
const panelGuests = document.getElementById("panelGuests");
const guestsTableContainer = document.getElementById("guestsTableContainer");
const statGuestTotal = document.getElementById("statGuestTotal");
const statTicketsUsed = document.getElementById("statTicketsUsed");
const statTicketsTotal = document.getElementById("statTicketsTotal");
const statPending = document.getElementById("statPending");

const addGuestBtn = document.getElementById("addGuestBtn");
const guestModal = document.getElementById("guestModal");
const guestModalClose = document.getElementById("guestModalClose");
const guestModalTitle = document.getElementById("guestModalTitle");
const guestForm = document.getElementById("guestForm");
const guestFormNote = document.getElementById("guestFormNote");
const guestFormSubmit = document.getElementById("guestFormSubmit");

// caché en memoria de /api/guests: la pestaña "Invitados" solo se pide al
// entrar (nunca se ve de inicio), así que sin esto su primer clic siempre
// pagaba el cold-start del serverless function completo (~3s). Precargando
// en paralelo con las confirmaciones, el cambio de pestaña se siente instantáneo.
let guestsData = null;

function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden = true;
}

function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden = false;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-GT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function renderRsvps(rsvps) {
  const attending = rsvps.filter((r) => r.attending);
  const declined = rsvps.filter((r) => !r.attending);
  const totalGuests = attending.reduce((sum, r) => sum + Number(r.guest_count || 0), 0);

  statResponses.textContent = rsvps.length;
  statGuests.textContent = totalGuests;
  statDeclined.textContent = declined.length;

  if (rsvps.length === 0) {
    tableContainer.innerHTML = `<p class="admin-empty">Aún no hay confirmaciones. Cuando alguien llene el RSVP, aparecerá aquí.</p>`;
    return;
  }

  const rows = rsvps
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.full_name)}</td>
        <td><span class="status-pill ${r.attending ? "yes" : "no"}">${r.attending ? "Asiste" : "No asiste"}</span></td>
        <td>${r.attending ? r.guest_count : "—"}</td>
        <td>${r.message ? escapeHtml(r.message) : "—"}</td>
        <td>${formatDate(r.created_at)}</td>
      </tr>`
    )
    .join("");

  tableContainer.innerHTML = `
    <div class="table-wrap">
      <table class="rsvp-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Invitados</th>
            <th>Mensaje</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Pestañas ----------
function showTab(tab) {
  const isGuests = tab === "guests";
  tabResponsesBtn.classList.toggle("is-active", !isGuests);
  tabGuestsBtn.classList.toggle("is-active", isGuests);
  panelResponses.hidden = isGuests;
  panelGuests.hidden = !isGuests;
  if (isGuests) {
    // si ya la precargamos en segundo plano, se pinta al instante
    if (guestsData) renderGuests(guestsData);
    else loadGuests();
  }
}
tabResponsesBtn.addEventListener("click", () => showTab("responses"));
tabGuestsBtn.addEventListener("click", () => showTab("guests"));

// ---------- Invitados (tu lista precargada con boletos y su estado) ----------
function renderGuests(guests) {
  const totalTickets = guests.reduce((sum, g) => sum + Number(g.allowed_guests || 0), 0);
  const usedTickets = guests.reduce((sum, g) => sum + (g.status === "confirmado" ? Number(g.guest_count || 0) : 0), 0);
  const pending = guests.filter((g) => g.status === "pendiente").length;

  statGuestTotal.textContent = guests.length;
  statTicketsUsed.textContent = usedTickets;
  statTicketsTotal.textContent = totalTickets;
  statPending.textContent = pending;

  if (guests.length === 0) {
    guestsTableContainer.innerHTML = `<p class="admin-empty">Todavía no cargas tu lista de invitados. Sigue las instrucciones de <code>schema.sql</code> para agregarlos.</p>`;
    return;
  }

  const statusLabel = { confirmado: "Confirmado", "no asiste": "No asiste", pendiente: "Pendiente" };
  const statusClass = { confirmado: "yes", "no asiste": "no", pendiente: "pending" };

  const rows = guests
    .map((g) => {
      const link = `${window.location.origin}/rsvp.html?invite=${encodeURIComponent(g.invite_code)}`;
      return `
      <tr>
        <td>${escapeHtml(g.display_name)}${g.guest_group ? `<br><span style="color:var(--color-ink-faint); font-size:0.78em;">${escapeHtml(g.guest_group)}</span>` : ""}</td>
        <td><span class="status-pill ${statusClass[g.status] || "pending"}">${statusLabel[g.status] || g.status}</span></td>
        <td>${g.status === "confirmado" ? g.guest_count : "—"} / ${g.allowed_guests}</td>
        <td>${g.message ? escapeHtml(g.message) : "—"}</td>
        <td>
          <div class="row-actions">
            <button class="copy-link-btn" data-link="${link}" type="button">Copiar link</button>
            <button class="copy-link-btn" data-edit-id="${g.id}" type="button">Editar</button>
            <button class="copy-link-btn is-danger" data-delete-id="${g.id}" data-delete-name="${escapeHtml(g.display_name)}" type="button">Eliminar</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  guestsTableContainer.innerHTML = `
    <div class="table-wrap">
      <table class="rsvp-table">
        <thead>
          <tr>
            <th>Invitación</th>
            <th>Estado</th>
            <th>Boletos</th>
            <th>Mensaje</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  guestsTableContainer.querySelectorAll(".copy-link-btn[data-link]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.link);
        const original = btn.textContent;
        btn.textContent = "¡Copiado!";
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch (err) {
        /* portapapeles no disponible; sin problema, el botón solo no hace nada */
      }
    });
  });

  guestsTableContainer.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guest = guestsData.find((g) => String(g.id) === btn.dataset.editId);
      if (guest) openGuestModal(guest);
    });
  });

  guestsTableContainer.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteGuest(btn.dataset.deleteId, btn.dataset.deleteName));
  });
}

async function loadGuests() {
  guestsTableContainer.innerHTML = `<p class="admin-loading">Cargando invitados…</p>`;
  try {
    const res = await fetch("/api/guests", { credentials: "same-origin" });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) throw new Error("request-failed");
    const data = await res.json();
    guestsData = data.guests || [];
    renderGuests(guestsData);
  } catch (err) {
    guestsTableContainer.innerHTML = `<p class="admin-error">No se pudo cargar la lista de invitados. Intenta de nuevo.</p>`;
  }
}

// ---------- CRUD de invitados (modal para agregar/editar + eliminar) ----------
function openGuestModal(guest) {
  guestForm.reset();
  guestFormNote.textContent = "";
  guestFormNote.className = "form-note";

  if (guest) {
    guestModalTitle.textContent = "Editar invitado";
    document.getElementById("guestId").value = guest.id;
    document.getElementById("guestDisplayName").value = guest.display_name;
    document.getElementById("guestGroup").value = guest.guest_group || "";
    document.getElementById("guestAllowed").value = guest.allowed_guests;
    document.getElementById("guestPhone").value = guest.phone || "";
  } else {
    guestModalTitle.textContent = "Agregar invitado";
    document.getElementById("guestId").value = "";
    document.getElementById("guestAllowed").value = "1";
  }

  guestModal.hidden = false;
  requestAnimationFrame(() => guestModal.classList.add("is-visible"));
  document.getElementById("guestDisplayName").focus();
}

function closeGuestModal() {
  guestModal.classList.remove("is-visible");
  setTimeout(() => { guestModal.hidden = true; }, 250);
}

addGuestBtn.addEventListener("click", () => openGuestModal(null));
guestModalClose.addEventListener("click", closeGuestModal);
guestModal.addEventListener("click", (event) => {
  if (event.target === guestModal) closeGuestModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && guestModal.classList.contains("is-visible")) closeGuestModal();
});

guestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  guestFormNote.textContent = "";
  guestFormNote.className = "form-note";

  const id = document.getElementById("guestId").value;
  const payload = {
    displayName: document.getElementById("guestDisplayName").value.trim(),
    guestGroup: document.getElementById("guestGroup").value.trim(),
    allowedGuests: Number(document.getElementById("guestAllowed").value) || 1,
    phone: document.getElementById("guestPhone").value.trim(),
  };
  if (id) payload.id = Number(id);

  guestFormSubmit.disabled = true;
  guestFormSubmit.textContent = "Guardando…";

  try {
    const res = await fetch("/api/guests", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) throw new Error("request-failed");

    closeGuestModal();
    await loadGuests();
  } catch (err) {
    guestFormNote.textContent = "No se pudo guardar. Intenta de nuevo.";
    guestFormNote.classList.add("error");
  } finally {
    guestFormSubmit.disabled = false;
    guestFormSubmit.textContent = "Guardar";
  }
});

async function deleteGuest(id, name) {
  if (!window.confirm(`¿Eliminar la invitación de "${name}"? Esto no se puede deshacer.`)) return;
  try {
    const res = await fetch(`/api/guests?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) throw new Error("request-failed");
    await loadGuests();
  } catch (err) {
    window.alert("No se pudo eliminar. Intenta de nuevo.");
  }
}

// pide /api/guests sin tocar el DOM (la pestaña ni se ve todavía): solo
// deja los datos listos en caché para cuando el usuario sí la abra.
async function prefetchGuests() {
  try {
    const res = await fetch("/api/guests", { credentials: "same-origin" });
    if (!res.ok) return;
    const data = await res.json();
    guestsData = data.guests || [];
  } catch (err) {
    /* si falla, loadGuests() lo intenta de nuevo al abrir la pestaña */
  }
}

async function loadRsvps() {
  tableContainer.innerHTML = `<p class="admin-loading">Cargando confirmaciones…</p>`;
  try {
    const res = await fetch("/api/rsvp", { credentials: "same-origin" });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) throw new Error("request-failed");
    const data = await res.json();
    showDashboard();
    renderRsvps(data.rsvps || []);
    prefetchGuests();
  } catch (err) {
    tableContainer.innerHTML = `<p class="admin-error">No se pudieron cargar las confirmaciones. Intenta de nuevo.</p>`;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginNote.textContent = "";
  loginNote.className = "form-note";
  loginSubmit.disabled = true;
  loginSubmit.textContent = "Entrando…";

  try {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: document.getElementById("password").value }),
    });

    if (res.status === 401) {
      loginNote.textContent = "Contraseña incorrecta.";
      loginNote.classList.add("error");
      return;
    }
    if (!res.ok) throw new Error("request-failed");

    loginForm.reset();
    await loadRsvps();
  } catch (err) {
    loginNote.textContent = "Algo salió mal. Intenta de nuevo.";
    loginNote.classList.add("error");
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.textContent = "Entrar";
  }
});

refreshBtn.addEventListener("click", () => {
  if (panelGuests.hidden) loadRsvps();
  else loadGuests();
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/admin-logout", { method: "POST" });
  showLogin();
});

loadRsvps();
