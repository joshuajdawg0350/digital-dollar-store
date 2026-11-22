/* LIVING CABINET — presentation-only state mirror (2026-11-21).
   Joshua picked the cabinet directions; the cabinet crew's plan: the
   winning look is rebuilt as a LIVING cabinet — animated lighting driven
   by game state. This script is that driver: it watches the game's own
   UI signals (SPIN/STOP mode on the spin button, the win flash, the
   celebration / bonus overlays, the free-spins banner) and mirrors them
   as classes on #cabinet — cab-spinning / cab-win / cab-party — so
   style.css can run the light chases. It reads classes only: it never
   touches game state, credits, reels, RNG, or outcomes.
   (c) 2026 J-Dawgs Industries. */
'use strict';
(function () {
  var cab = document.getElementById('cabinet');
  if (!cab) return;
  var spinBtn = document.getElementById('spinBtn');
  var winFlash = document.getElementById('winFlash');
  var celeb = document.getElementById('celeb');
  var bonus = document.getElementById('bonusOverlay');
  var fsBanner = document.getElementById('fsBanner');
  function has(el, cls) { return !!(el && el.classList && el.classList.contains(cls)); }
  function sync() {
    cab.classList.toggle('cab-spinning', has(spinBtn, 'stop') || has(spinBtn, 'stop-mode'));
    cab.classList.toggle('cab-win', has(winFlash, 'on'));
    cab.classList.toggle('cab-party', has(celeb, 'on') || has(bonus, 'on') || has(fsBanner, 'on'));
  }
  var obs = new MutationObserver(sync);
  [spinBtn, winFlash, celeb, bonus, fsBanner].forEach(function (el) {
    if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  sync();
  window.__cabLifeLoaded = true;
})();
