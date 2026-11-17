/* ============================================================
   AIMonkey – "Relaterade artiklar" på artikelsidorna (/artiklar/<slug>), 2026-11-17
   Korten är Webflow-element i Artiklar Template: en CMS-lista per
   ämne (.ar-grupp med data-amne = Ämne-valets namn), filtrerad på
   "Ämne är <ämne>". Varje kort har a[data-slug]. Den gamla listan
   (tre senaste artiklarna) ligger kvar som reserv.

   Skriptet väljer gruppen som matchar artikelns ämne
   ([data-art="amne"], dold textkoppling till fältet Ämne), eftersom
   Webflow inte kan filtrera en lista på aktuell posts Option-fält.
   Det visar tre artiklar utom den här och döljer reservlistan.
   Utan skript syns reservlistan, som förut.
   dataLayer: ar_klick { amne, slug }.
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimArtRel) return;
  window.__aimArtRel = true;

  var ANTAL = 3;

  function track(ev, data) {
    try { window.dataLayer = window.dataLayer || []; var o = { event: ev }; for (var k in data) o[k] = data[k]; window.dataLayer.push(o); } catch (e) {}
  }

  function init() {
    var grupper = [].slice.call(document.querySelectorAll('.ar-grupp[data-amne]'));
    if (!grupper.length) return;
    var slug = location.pathname.replace(/\/$/, '').split('/').pop();

    grupper.forEach(function (g) {
      [].slice.call(g.querySelectorAll('a[data-slug]')).forEach(function (a) {
        var s = a.getAttribute('data-slug'), h = a.getAttribute('href') || '';
        if (s && (!h || h === '#' || h.indexOf('/artiklar/') === -1)) a.setAttribute('href', '/artiklar/' + s);
      });
    });

    var amneEl = document.querySelector('[data-art="amne"]');
    var amne = amneEl && !amneEl.classList.contains('w-dyn-bind-empty') ? amneEl.textContent.trim() : '';
    var vald = grupper.filter(function (g) { return amne && g.getAttribute('data-amne') === amne; })[0];
    if (!vald) return;

    var visade = 0;
    [].slice.call(vald.querySelectorAll('.w-dyn-item')).forEach(function (it) {
      var a = it.querySelector('a[data-slug]');
      var ok = !(a && a.getAttribute('data-slug') === slug) && visade < ANTAL;
      it.style.display = ok ? '' : 'none';
      if (ok) visade++;
    });
    if (visade < 2) return; /* för få i ämnet: behåll reservlistan */
    vald.classList.add('is-vald');

    [].slice.call(vald.parentNode.children).forEach(function (c) {
      if (c !== vald && c.classList.contains('w-dyn-list') && !c.classList.contains('ar-grupp') && c.querySelector('.article')) c.style.display = 'none';
    });

    var rubrik = [].slice.call(document.querySelectorAll('h2,h3')).filter(function (h) { return /^\s*Relaterade artiklar\s*$/.test(h.textContent); })[0];
    var RUBRIK = {
      'Kom igång': 'Fler artiklar för dig som är ny',
      'Förstå AI': 'Fler artiklar om hur AI fungerar',
      'Jobbet': 'Fler artiklar om AI på jobbet',
      'Skapa och bygga': 'Fler artiklar om att skapa och bygga med AI',
      'Säkert och lagligt': 'Fler artiklar om säker och laglig AI',
      'Vardag och lärande': 'Fler artiklar om AI i vardagen'
    };
    if (rubrik && RUBRIK[amne]) rubrik.textContent = RUBRIK[amne];

    vald.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-slug]');
      if (a) track('ar_klick', { amne: amne, slug: a.getAttribute('data-slug') });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
