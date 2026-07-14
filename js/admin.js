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

refreshBtn.addEventListener("click", loadRsvps);

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/admin-logout", { method: "POST" });
  showLogin();
});

loadRsvps();
