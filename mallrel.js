/* ============================================================
   AIMonkey – "Fler AI-mallar" på mallsidorna (/ai-mallar/<slug>), 2026-11-17
   Korten är Webflow-element i AI-Mallar Template: en CMS-lista per
   roll (.mr-grupp med data-roll = Roller-slug), filtrerad på
   "Roll innehåller <roll>" och sorterad på Fas och namn. Varje kort
   har a[data-slug]. Den gamla listan (tre första mallarna) ligger kvar
   som reserv för mallar utan roll.

   Skriptet väljer vilken grupp som visas, eftersom Webflow inte kan
   filtrera en lista på aktuell posts referensfält:
   1. huvudrollens grupp ([data-mall-meta="rollslug"]) om mallen finns där
   2. annars den minsta grupp som innehåller mallen (mest specifik)
   I gruppen visas de tre mallar som kommer efter den här i fas-ordning.
   Utan skript syns bara reservlistan, som förut.
   dataLayer: mr_klick { roll, slug }.
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimMallRel) return;
  window.__aimMallRel = true;

  var ANTAL = 3;
  var NAMN = {
    saljare: 'säljare', marknadsforare: 'marknadsförare', chef: 'chefer',
    smaforetagare: 'småföretagare', analytiker: 'analytiker',
    motesledare: 'mötesledare', skribent: 'skribenter', nyborjare: 'nybörjare'
  };
  var PILLAR = {
    saljare: '/ai-for-saljare', marknadsforare: '/ai-for-marknadsforing-sociala-medier',
    chef: '/ai-for-chefer', smaforetagare: '/ai-for-smaforetagare', nyborjare: '/ai-for-nyborjare'
  };

  function track(ev, data) {
    try { window.dataLayer = window.dataLayer || []; var o = { event: ev }; for (var k in data) o[k] = data[k]; window.dataLayer.push(o); } catch (e) {}
  }

  function init() {
    var grupper = [].slice.call(document.querySelectorAll('.mr-grupp[data-roll]'));
    if (!grupper.length) return;
    var slug = location.pathname.replace(/\/$/, '').split('/').pop();

    var info = grupper.map(function (g) {
      var kort = [].slice.call(g.querySelectorAll('.w-dyn-item'));
      var slugs = kort.map(function (it) { var a = it.querySelector('a[data-slug]'); return a ? a.getAttribute('data-slug') : ''; });
      return { el: g, roll: g.getAttribute('data-roll'), kort: kort, slugs: slugs, har: slugs.indexOf(slug) };
    });

    var metaEl = document.querySelector('[data-mall-meta="rollslug"]');
    var huvud = metaEl && !metaEl.classList.contains('w-dyn-bind-empty') ? metaEl.textContent.trim() : '';
    var kandidater = info.filter(function (g) { return g.har > -1 && g.kort.length > 1; });
    var vald = kandidater.filter(function (g) { return g.roll === huvud; })[0] ||
      kandidater.sort(function (a, b) { return a.kort.length - b.kort.length; })[0];
    if (!vald) return;

    /* De tre som kommer efter den här mallen, runt om i listan */
    var n = vald.kort.length, visa = [];
    for (var i = 1; i < n && visa.length < ANTAL; i++) visa.push((vald.har + i) % n);
    vald.kort.forEach(function (it, idx) { it.style.display = visa.indexOf(idx) > -1 ? '' : 'none'; });
    /* Visa dem i ordningen "nästa först" */
    var lista = vald.kort[0].parentNode;
    visa.forEach(function (idx) { lista.appendChild(vald.kort[idx]); });
    vald.el.classList.add('is-vald');

    /* Dölj reservlistan (den som inte är en rollgrupp) i samma behållare */
    var behallare = vald.el.parentNode;
    [].slice.call(behallare.children).forEach(function (c) {
      if (c !== vald.el && c.classList.contains('w-dyn-list') && !c.classList.contains('mr-grupp')) c.style.display = 'none';
    });

    /* Rubrik och länk till rollens sida */
    var namn = NAMN[vald.roll];
    var sektion = behallare.parentNode;
    var rubrik = sektion && [].slice.call(sektion.querySelectorAll('h2,h3')).filter(function (h) { return /Fler AI-mallar/.test(h.textContent); })[0];
    if (rubrik && namn) rubrik.textContent = 'Fler AI-mallar för ' + namn;
    var lank = document.createElement('a');
    lank.className = 'mr-alla';
    lank.href = PILLAR[vald.roll] || '/ai-mallar';
    lank.textContent = PILLAR[vald.roll] && namn ? 'Alla mallar för ' + namn + ' →' : 'Alla AI-mallar →';
    vald.el.appendChild(lank);

    vald.el.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-slug]');
      if (a) track('mr_klick', { roll: vald.roll, slug: a.getAttribute('data-slug') });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
