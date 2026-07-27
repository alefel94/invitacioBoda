// ============================================================
// Viridiana & Felipe — música de fondo
//
// Regla: al abrir el sobre, la canción SIEMPRE arranca desde el principio
// (aunque hayas recargado antes). La única excepción es la transición
// puntual index.html -> rsvp.html (y de regreso): ahí sí sigue sonando
// exactamente donde iba, gracias a un "pase" de un solo uso que
// window.handOffMusic() guarda justo antes de navegar.
// ============================================================

(function backgroundMusic() {
  const music = document.getElementById("bgMusic");
  const toggle = document.getElementById("musicToggle");
  if (!music || !toggle) return;

  music.volume = 0.55;

  function setPlayingUI(isPlaying) {
    toggle.classList.toggle("is-muted", !isPlaying);
    toggle.setAttribute("aria-pressed", String(!isPlaying));
    toggle.setAttribute("aria-label", isPlaying ? "Silenciar música" : "Reproducir música");
  }

  // al minimizar/cambiar de app se pausa sola; al volver, se reanuda SOLO
  // si sonaba antes (si el invitado ya la había silenciado, se queda así)
  let wasPlayingBeforeHidden = false;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      wasPlayingBeforeHidden = !music.paused;
      if (wasPlayingBeforeHidden) music.pause();
    } else if (wasPlayingBeforeHidden) {
      wasPlayingBeforeHidden = false;
      music.play().then(() => setPlayingUI(true)).catch(() => {});
    }
  });

  toggle.addEventListener("click", () => {
    if (music.paused) {
      music.play().then(() => setPlayingUI(true)).catch(() => {});
    } else {
      music.pause();
      setPlayingUI(false);
    }
  });

  // ¿venimos de la otra página con la canción sonando? se retoma UNA vez
  const handoffRaw = sessionStorage.getItem("musicHandoff");
  if (handoffRaw) {
    sessionStorage.removeItem("musicHandoff");
    try {
      const handoff = JSON.parse(handoffRaw);
      if (handoff.playing) {
        music.currentTime = handoff.time || 0;
        toggle.hidden = false;
        music.play().then(() => setPlayingUI(true)).catch(() => setPlayingUI(false));
        return;
      }
    } catch (err) {
      /* pase inválido: seguimos con el flujo normal de abajo */
    }
  }

  // portada con sobre (index.html): arranca DESDE CERO justo al abrirlo
  const gate = document.getElementById("envelopeGate");
  if (!gate || gate.classList.contains("is-skipped")) {
    // sin sobre en esta página, o ya se completó antes: solo dejamos el
    // botón visible para que el invitado le dé play si quiere
    toggle.hidden = false;
    return;
  }

  document.getElementById("waxSeal")?.addEventListener(
    "click",
    () => {
      toggle.hidden = false;
      music.currentTime = 0;
      music.play().then(() => setPlayingUI(true)).catch(() => {});
    },
    { once: true }
  );
})();

// Llamar justo antes de cambiar de página para que la música siga sonando
// en la siguiente (index.html <-> rsvp.html).
window.handOffMusic = function handOffMusic() {
  const music = document.getElementById("bgMusic");
  if (!music) return;
  sessionStorage.setItem(
    "musicHandoff",
    JSON.stringify({ playing: !music.paused, time: music.currentTime })
  );
};
