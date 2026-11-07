/* Évszámok kitöltése a [data-year] elemekbe */
document.querySelectorAll('[data-year]').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});
