/* Téma-init – a CSS előtt fut (parser-blocking, külső fájl → CSP-barát).
 * Alapértelmezés: a rendszer dark/light beállítását követi; a látogató
 * választása (localStorage) mindig felülírja. */
(function () {
  var theme = localStorage.getItem('theme');
  if (theme !== 'dark' && theme !== 'monolight') {
    var light = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    theme = light ? 'monolight' : 'dark';
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.backgroundColor = theme === 'monolight' ? '#f8f5ef' : '#2d2a2e';
})();
