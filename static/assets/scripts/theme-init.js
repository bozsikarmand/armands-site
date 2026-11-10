/* Téma-init – a CSS előtt fut (parser-blocking, külső fájl → CSP-barát) */
(function () {
  var theme = localStorage.getItem('theme') || 'dark';
  if (theme !== 'dark' && theme !== 'monolight') theme = 'dark';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.backgroundColor = theme === 'monolight' ? '#f8f5ef' : '#2d2a2e';
})();
