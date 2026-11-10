/* Nyelvválasztó dropdown (blog-minta: gömb → zászló+nyelvnév) */
(function () {
  if (window.__langSwitchInit) return;
  window.__langSwitchInit = true;
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lang-switch-btn]');
    document.querySelectorAll('[data-lang-switch].is-open').forEach(function (d) {
      if (!d.contains(e.target)) d.classList.remove('is-open');
    });
    if (btn) {
      var root = btn.closest('[data-lang-switch]');
      var open = root.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });
  document.addEventListener('keydown', function (e) {
    var open = document.querySelector('[data-lang-switch].is-open');
    if (!open) return;
    if (e.key === 'Escape') {
      open.classList.remove('is-open');
      var b = open.querySelector('[data-lang-switch-btn]');
      if (b) b.focus();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var items = open.querySelectorAll('.lang-switch__item');
      if (!items.length) return;
      var idx = Array.prototype.indexOf.call(items, document.activeElement);
      idx = e.key === 'ArrowDown'
        ? (idx + 1) % items.length
        : (idx - 1 + items.length) % items.length;
      items[idx].focus();
    }
  });
  document.addEventListener('focusin', function (e) {
    document.querySelectorAll('[data-lang-switch].is-open').forEach(function (d) {
      if (!d.contains(e.target)) d.classList.remove('is-open');
    });
  });
})();
