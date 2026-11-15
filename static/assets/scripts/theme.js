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


/* Off-canvas menü (mobil) */
(function () {
  var fab = document.getElementById('menu-toggle');
  var panel = document.getElementById('site-topbar');
  var backdrop = document.getElementById('menu-backdrop');
  if (!fab || !panel) return;
  function setOpen(open) {
    panel.classList.toggle('is-open', open);
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (backdrop) backdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  fab.addEventListener('click', function () { setOpen(!panel.classList.contains('is-open')); });
  // BUG-01: asztali szelesseg felett a nyitott drawer automatikusan bezarodik
  var mq = window.matchMedia('(min-width: 1024px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () {
    if (mq.matches) setOpen(false);
  });
  if (backdrop) backdrop.addEventListener('click', function () { setOpen(false); });
  panel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false);
  });
})();
