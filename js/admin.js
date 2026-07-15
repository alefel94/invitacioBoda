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
  if (isGuests) loadGuests();
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
        <td><button class="copy-link-btn" data-link="${link}" type="button">Copiar link</button></td>
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
            <th>Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  guestsTableContainer.querySelectorAll(".copy-link-btn").forEach((btn) => {
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
    renderGuests(data.guests || []);
  } catch (err) {
    guestsTableContainer.innerHTML = `<p class="admin-error">No se pudo cargar la lista de invitados. Intenta de nuevo.</p>`;
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
