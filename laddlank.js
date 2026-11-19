/* ============================================================
   AIMonkey – laddkvittens på länkar och knappar, 2026-11-19
   När någon klickar på en intern länk som byter sida visas en liten
   snurra i länken (samma som mockupens variant B), så att man ser
   att klicket gick fram medan nästa sida laddas.

   - Bara interna länkar som byter sida: inte #-ankare, nya flikar,
     nedladdningar, mailto/tel eller klick som ett annat skript redan
     har tagit hand om (preventDefault, t.ex. ämnesknapparna på /ai-termer).
   - Snurran syns först efter 150 ms, så snabba sidbyten blinkar inte.
   - Stora kort (länkblock högre än 70 px) får snurran i hörnet och
     tonas ner lite. Text- och knapplänkar får snurran efter texten.
   - Förhandsladdning: håller man musen över (eller rör vid) en intern
     länk med url-parametrar börjar webbläsaren hämta sidan. Det värmer
     också Webflows cache, som annars bygger varje ny parameter-sida
     från början (upp till ~5 s första gången).
   - Tillbaka-knappen (bfcache) återställer länkarna.
   Klasser: lk-laddar (länken), lk-snurra (snurran).
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimLaddLank) return;
  window.__aimLaddLank = true;

  var css = '' +
    '@keyframes lk-snurr{to{transform:rotate(360deg)}}' +
    '.lk-snurra{display:inline-block;width:1em;height:1em;max-width:18px;max-height:18px;min-width:12px;min-height:12px;margin-left:.45em;vertical-align:-.15em;border-radius:50%;' +
    'border:2.5px solid #b9ece2;border-top-color:#00a88c;animation:lk-snurr .8s linear infinite;box-sizing:border-box;flex:none}' +
    '.lk-laddar{cursor:progress!important}' +
    '.lk-laddar.lk-kort{opacity:.75;transition:opacity .2s}' +
    '.lk-kort>.lk-snurra{position:absolute;bottom:12px;right:12px;margin:0;width:20px;height:20px;max-width:none;max-height:none;background:#fff;box-shadow:0 0 0 4px #fff}' +
    '@media (prefers-reduced-motion:reduce){.lk-snurra{animation-duration:2.4s}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function internLank(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return false; }
    if (u.origin !== location.origin) return false;
    if (!/^https?:$/.test(u.protocol)) return false;
    /* bara ett ankare på samma sida */
    if (u.pathname === location.pathname && u.search === location.search && u.hash) return false;
    return u;
  }

  /* --- Laddkvittens vid klick --- */
  var timer = null, aktiv = null;
  function aterstall() {
    clearTimeout(timer);
    if (aktiv) {
      aktiv.classList.remove('lk-laddar', 'lk-kort');
      aktiv.removeAttribute('aria-busy');
      var s = aktiv.querySelector(':scope > .lk-snurra');
      if (s) s.remove();
      if (aktiv.dataset.lkPos) { aktiv.style.position = ''; delete aktiv.dataset.lkPos; }
      aktiv = null;
    }
  }
  function visa(a) {
    aterstall();
    aktiv = a;
    timer = setTimeout(function () {
      if (aktiv !== a) return;
      var kort = a.offsetHeight > 70;
      a.classList.add('lk-laddar');
      a.setAttribute('aria-busy', 'true');
      if (kort) {
        a.classList.add('lk-kort');
        if (getComputedStyle(a).position === 'static') { a.style.position = 'relative'; a.dataset.lkPos = '1'; }
      }
      var s = document.createElement('span');
      s.className = 'lk-snurra';
      s.setAttribute('aria-hidden', 'true');
      a.appendChild(s);
    }, 150);
  }

  document.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!internLank(a)) return;
    /* vänta ut andra klickhanterare: om de stoppar navigeringen visar vi inget */
    setTimeout(function () { if (!e.defaultPrevented) visa(a); }, 0);
  });
  window.addEventListener('pageshow', aterstall);
  window.addEventListener('pagehide', function () { clearTimeout(timer); });

  /* --- Förhandsladdning av länkar med url-parametrar --- */
  var hamtade = {};
  function forhandsladda(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    var u = internLank(a);
    if (!u || !u.search) return;
    var nyckel = u.pathname + u.search;
    if (hamtade[nyckel]) return;
    hamtade[nyckel] = true;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = u.pathname + u.search;
    document.head.appendChild(l);
  }
  document.addEventListener('mouseover', forhandsladda, { passive: true });
  document.addEventListener('touchstart', forhandsladda, { passive: true });
})();
