/* Gépelős tagline: a szavak begépelődnek, megállnak, törlődnek, majd jön a
 * következő – a végén a kurzor kialszik.
 * Finomságok a mérhetőségért: a konténer min-widthja a legszélesebb szóhoz
 * igazodik (nincs elcsúszás), és a ciklus a legszélesebb szóval indul, így az
 * LCP hamar lezárul, a keskenyebb későbbi szavak nem nyitják újra.
 * Reduced-motion esetén az eredeti teljes szöveg marad. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-typewriter]').forEach(function (el) {
    var words = (el.getAttribute('data-typewriter') || '').split('|').filter(Boolean);
    if (!words.length || reduce) return; // az eredeti teljes szöveg marad

    // képernyőolvasóknak a teljes szöveg (a gépelő rész aria-hidden)
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = words.join(' ');
    el.textContent = '';
    el.appendChild(sr);

    var wordSpan = document.createElement('span');
    wordSpan.setAttribute('aria-hidden', 'true');
    el.appendChild(wordSpan);

    var caret = document.createElement('span');
    caret.className = 'tw-caret';
    caret.setAttribute('aria-hidden', 'true');
    el.appendChild(caret);

    // legszélesebb szó megkeresése + konténer-min-width (a mérés a wordSpan-ben történik)
    var startIdx = 0, maxW = -1;
    words.forEach(function (w, i) {
      wordSpan.textContent = w;
      var width = wordSpan.offsetWidth;
      if (width > maxW) { maxW = width; startIdx = i; }
    });
    if (maxW > 0) el.style.minWidth = Math.ceil(maxW) + 'px';

    var idx = startIdx, charIdx = 0, deleting = false, done = false;
    var lastIdx = (startIdx + words.length - 1) % words.length;

    function step() {
      if (done) return;
      var word = words[idx];

      if (!deleting) {
        charIdx++;
        wordSpan.textContent = word.slice(0, charIdx);
        if (charIdx === word.length) {
          if (idx === lastIdx) {
            done = true;
            setTimeout(function () { caret.classList.add('tw-caret--off'); }, 1800);
            return;
          }
          deleting = true;
          setTimeout(step, 900); // szó végén tartás
          return;
        }
        setTimeout(step, 45 + Math.random() * 50);
      } else {
        charIdx--;
        wordSpan.textContent = word.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          idx = (idx + 1) % words.length;
        }
        setTimeout(step, 30);
      }
    }

    wordSpan.textContent = '';
    setTimeout(step, 600); // az oldal-fade után indul
  });
})();
