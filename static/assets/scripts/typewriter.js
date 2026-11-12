/* Szó-csere egyetlen span-ben: a LEGSZÉLESEBB szóval indul, így az LCP az
 * első festéskor a maximális méretnél zárul; a későbbi, keskenyebb szavak
 * kisebb festett területet adnak, az LCP nem frissül. A konténer min-widthja
 * a leghosszabb szóhoz igazodik – nincs elcsúszás (CLS).
 * A mérés a webfont betöltése után, de még az első festés előtt fut.
 * Reduced-motion esetén az eredeti teljes szöveg marad. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-typewriter]').forEach(function (el) {
    var words = (el.getAttribute('data-typewriter') || '').split('|').filter(Boolean);
    if (words.length < 2 || reduce) return; // az eredeti teljes szöveg marad

    // képernyőolvasóknak a teljes szöveg (a forgó szavak aria-hiddenak)
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = el.textContent.trim();
    el.textContent = '';
    el.appendChild(sr);

    var wordSpan = document.createElement('span');
    wordSpan.setAttribute('aria-hidden', 'true');
    el.appendChild(wordSpan);

    var caret = document.createElement('span');
    caret.className = 'tw-caret';
    caret.setAttribute('aria-hidden', 'true');
    el.appendChild(caret);

    var started = false;
    function measureAndStart() {
      if (started) return;
      started = true;
      // indulás a legszélesebb szóval: az LCP rögtön a max mérethez kötődik
      var idx = 0, maxW = -1;
      words.forEach(function (w, i) {
        wordSpan.textContent = w;
        var width = wordSpan.offsetWidth;
        if (width > maxW) { maxW = width; idx = i; }
      });
      el.style.minWidth = Math.ceil(maxW) + 'px';
      wordSpan.textContent = words[idx];
      setInterval(function () {
        idx = (idx + 1) % words.length;
        wordSpan.textContent = words[idx];
      }, 2400);
    }

    // Fontokra várunk a méréshez (különben fallback betűméretet mérünk és
    // a min-width később nőhet – az LCP/CLS romlana), de egy biztonsági
    // időkorláttal, hogy sose késsük le az első festést.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureAndStart);
      setTimeout(measureAndStart, 500);
    } else {
      measureAndStart();
    }
  });
})();
