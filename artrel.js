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

    /* Olika artiklar i samma ämne visar olika förslag: starta på en plats
       som räknas fram ur sluggen, så sprids länkarna över hela ämnet */
    var kort = [].slice.call(vald.querySelectorAll('.w-dyn-item')).filter(function (it) {
      var a = it.querySelector('a[data-slug]');
      if (a && a.getAttribute('data-slug') === slug) { it.style.display = 'none'; return false; }
      return true;
    });
    var hash = 0;
    for (var i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) % 9973;
    var start = kort.length ? hash % kort.length : 0, visade = 0;
    var lista = kort.length ? kort[0].parentNode : null;
    for (var j = 0; j < kort.length; j++) {
      var it = kort[(start + j) % kort.length];
      var ok = visade < ANTAL;
      it.style.display = ok ? '' : 'none';
      if (ok) { lista.appendChild(it); visade++; }
    }
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
