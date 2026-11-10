/* Téma-kapcsoló (Monokai dark ↔ monolight) */
(function () {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  function current() {
    var t = document.documentElement.dataset.theme;
    return (t === 'dark' || t === 'monolight') ? t : 'dark';
  }
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.backgroundColor = theme === 'monolight' ? '#f8f5ef' : '#2d2a2e';
    localStorage.setItem('theme', theme);
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    toggle.setAttribute('aria-pressed', theme === 'monolight' ? 'true' : 'false');
  }
  toggle.addEventListener('click', function () {
    apply(current() === 'dark' ? 'monolight' : 'dark');
  });
  apply(current());
})();

/* Mobil hamburger panel */
(function () {
  var toggle = document.getElementById('menu-toggle');
  var list = document.getElementById('nav-list');
  if (!toggle || !list) return;
  toggle.addEventListener('click', function () {
    var open = list.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? '✕' : '☰';
  });
  list.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      list.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';
    });
  });
})();
