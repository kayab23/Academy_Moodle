/**
 * sige-logout.js — cierre de sesión en cascada desde SIGE (SIGE-PLT-001 B.4).
 * Cargar DESPUÉS de sige-embed.js:
 *   <script src="/assets/js/sige-embed.js?v=3" data-app="vitaris" defer></script>
 *   <script src="/assets/js/sige-logout.js?v=1" data-endpoint="/api/logout" defer></script>
 * Cuando SIGE cierra sesión envía `sige:logout`; aquí se invalida la sesión de la app con una sola petición
 * `keepalive` (SIGE desmonta el iframe justo después, una petición normal podría cancelarse).
 */
(function () {
  'use strict';
  var s = document.currentScript;
  var endpoint = s && s.getAttribute('data-endpoint');
  var clearSession = !!s && s.getAttribute('data-clear-session') === 'true';
  if (!endpoint && !clearSession) return;

  function onLogout() {
    if (endpoint) {
      try {
        fetch(endpoint, { method: 'POST', credentials: 'include', keepalive: true }).catch(function () {});
      } catch (e) { console.error('[sige-logout]', e); }
    }
    if (clearSession) { try { sessionStorage.clear(); } catch (e) {} }
  }

  function register() {
    if (window.SigeEmbed && typeof window.SigeEmbed.onLogout === 'function') {
      window.SigeEmbed.onLogout(onLogout);
      return true;
    }
    return false;
  }

  if (!register()) {
    var t = setInterval(function () { if (register()) clearInterval(t); }, 100);
    setTimeout(function () { clearInterval(t); }, 5000);
  }
})();
