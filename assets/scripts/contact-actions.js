/* Kapcsolat-oldal: e-mail-cím másolása visszajelzéssel */
(function () {
  var btn = document.getElementById('copy-email-btn');
  if (!btn || !navigator.clipboard) return;
  btn.addEventListener('click', function () {
    var label = btn.querySelector('span');
    navigator.clipboard.writeText(btn.getAttribute('data-email') || '').then(function () {
      if (!label) return;
      var orig = label.textContent;
      label.textContent = btn.getAttribute('data-copied') || 'Copied!';
      setTimeout(function () { label.textContent = orig; }, 1600);
    });
  });
})();
