/* ============================================================
   AIMonkey – termsida i AI-ordlistan (/ai-termer/<slug>), 2026-11-16
   Layouten är Webflow-element i Termers Template (.at-wrap):
   rubrik, svar, Exempel-ruta, Läs mer (CMS-referenser),
   Relaterade termer (en CMS-lista per ämne, .at-rel-grupp med
   data-amne) och sidopanelen med sök och ämnen.

   Skriptet sköter bara beteendet:
   - visar ämnesgruppen för termens ämne (Webflow kan inte filtrera
     en lista på aktuell posts Option-fält) och döljer termen själv
   - döljer tomma Läs mer-grupper och en tom Exempel-ruta
   - "Alla termer i <ämne> →" och markerar ämnet i sidopanelen
   - gör sökrutan till ett fält som skickar till /ai-termer?q=
   - reservlänkar via data-slug om Webflow lämnar href="#"
   dataLayer: at_sok { q }.
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimTermsida) return;
  window.__aimTermsida = true;

  function track(ev, data) {
    try { window.dataLayer = window.dataLayer || []; var o = { event: ev }; for (var k in data) o[k] = data[k]; window.dataLayer.push(o); } catch (e) {}
  }

  function init() {
    var wrap = document.querySelector('.at-wrap'); if (!wrap) return;
    var slug = location.pathname.replace(/\/$/, '').split('/').pop();
    var amneEl = wrap.querySelector('[data-ao="amne"]');
    var amne = amneEl ? amneEl.textContent.trim() : '';

    /* Reservlänkar */
    [].slice.call(wrap.querySelectorAll('a[data-slug]')).forEach(function (a) {
      var s = a.getAttribute('data-slug'), h = a.getAttribute('href') || '';
      if (s && (!h || h === '#' || h.indexOf('/ai-termer/') === -1)) a.setAttribute('href', '/ai-termer/' + s);
    });

    /* Ämnesetikett */
    if (!amne && amneEl) {
      amneEl.style.display = 'none';
      var forsta = amneEl.parentNode.firstElementChild;
      if (forsta && forsta !== amneEl) forsta.textContent = 'AI-ordlistan';
    }

    /* Relaterade termer */
    var rel = wrap.querySelector('[data-ao="relaterade"]');
    var antalRel = 0;
    [].slice.call(wrap.querySelectorAll('.at-rel-grupp')).forEach(function (g) {
      var match = amne && g.getAttribute('data-amne') === amne;
      g.classList.toggle('is-vald', !!match);
      if (!match) return;
      var visade = 0;
      [].slice.call(g.querySelectorAll('.w-dyn-item')).forEach(function (it) {
        var a = it.querySelector('a[data-slug]');
        var ok = !(a && a.getAttribute('data-slug') === slug) && visade < 6;
        it.style.display = ok ? '' : 'none';
        if (ok) visade++;
      });
      antalRel = visade;
    });
    if (rel && !antalRel) rel.style.display = 'none';

    var allaAmne = wrap.querySelector('[data-ao="alla-amne"]');
    if (allaAmne && amne) {
      allaAmne.textContent = 'Alla termer i ' + amne.toLowerCase() + ' →';
      allaAmne.setAttribute('href', '/ai-termer?amne=' + encodeURIComponent(amne));
    }
    [].slice.call(wrap.querySelectorAll('.at-amne-lank[data-amne]')).forEach(function (a) {
      if (a.getAttribute('data-amne') === amne) { a.classList.add('is-aktuell'); a.setAttribute('aria-current', 'true'); }
    });

    /* Läs mer: dölj tomma grupper */
    var las = wrap.querySelector('[data-ao="lasmer"]');
    if (las) {
      var nagon = false;
      [].slice.call(las.querySelectorAll('.at-las-grupp')).forEach(function (g) {
        var har = g.querySelectorAll('.w-dyn-item').length > 0;
        g.style.display = har ? '' : 'none';
        if (har) nagon = true;
      });
      if (!nagon) las.style.display = 'none';
    }

    /* Exempel: dölj om fältet är tomt */
    var ex = wrap.querySelector('[data-ao="exempel"]');
    if (ex) {
      var rt = ex.querySelector('.w-richtext');
      if (!rt || rt.classList.contains('w-dyn-bind-empty') || !rt.textContent.trim()) ex.style.display = 'none';
    }

    /* Sökrutan */
    var sok = wrap.querySelector('[data-ao="sok"]');
    if (sok) {
      var f = document.createElement('form');
      f.className = 'at-sok-form'; f.setAttribute('role', 'search'); f.action = '/ai-termer'; f.method = 'get';
      f.innerHTML = '<label class="ao-sok-label" for="at-sok-input">Sök bland AI-termerna</label>' +
        '<input id="at-sok-input" class="at-sok-input" name="q" type="search" autocomplete="off" placeholder="Sök, t.ex. token eller RAG">';
      f.addEventListener('submit', function (e) {
        var q = f.querySelector('input').value.trim();
        if (!q) { e.preventDefault(); location.href = '/ai-termer#alla-termer'; return; }
        track('at_sok', { q: q.slice(0, 60) });
      });
      sok.parentNode.replaceChild(f, sok);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
