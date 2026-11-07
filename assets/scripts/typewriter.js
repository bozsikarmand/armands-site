/* Gépelős tagline: a data-typewriter szavak sorban begépelődnek,
 * aztán a kurzor kialszik. Reduced-motion esetén azonnal teljes szöveg. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-typewriter]').forEach(function (el) {
    var words = (el.getAttribute('data-typewriter') || '').split('|').filter(Boolean);
    if (!words.length) return;
    if (reduce) return; // az eredeti teljes szöveg marad

    el.textContent = '';
    var caret = document.createElement('span');
    caret.className = 'tw-caret';
    caret.setAttribute('aria-hidden', 'true');
    el.appendChild(caret);

    var wordIdx = 0, charIdx = 0, deleting = false, done = false;

    function step() {
      if (done) return;
      var word = words[wordIdx];

      if (!deleting) {
        charIdx++;
        el.textContent = word.slice(0, charIdx);
        el.appendChild(caret);
        if (charIdx === word.length) {
          if (wordIdx === words.length - 1) {
            done = true;
            setTimeout(function () { caret.classList.add('tw-caret--off'); }, 1800);
            return;
          }
          deleting = true;
          setTimeout(step, 900); // szó végén tartás
          return;
        }
        setTimeout(step, 65 + Math.random() * 70);
      } else {
        charIdx--;
        el.textContent = word.slice(0, charIdx);
        el.appendChild(caret);
        if (charIdx === 0) {
          deleting = false;
          wordIdx++;
        }
        setTimeout(step, 34);
      }
    }
    setTimeout(step, 600); // az oldal-fade után indul
  });
})();
