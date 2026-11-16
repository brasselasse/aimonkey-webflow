/* ============================================================
   AIMonkey – AI-ordlistan (/ai-termer), 2026-11-16
   Innehållet är Webflow-element: hero, ämnesknappar (a.ao-chip
   med data-amne), CMS-listan "Vanligast att slå upp" och två
   CMS-listor med alla termer (offset 0 och 100). Varje rad har
   data-amne = CMS-fältet Ämne.

   Skriptet sköter bara beteendet:
   - sökrutan (filtrerar på namn och kort förklaring)
   - ämnesknapparna (filter, även via ?amne=…)
   - bokstavsrubriker A–Ö och bokstavsraden (Webflow kan inte
     gruppera en CMS-lista per bokstav)
   - antalet i rubriken och "Ingen term matchar"
   Utan skript syns alla termer i bokstavsordning.
   dataLayer: ao_sok { q, antal }, ao_amne { amne }.
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimOrdlista) return;
  window.__aimOrdlista = true;

  var ALFABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

  function track(ev, data) {
    try { window.dataLayer = window.dataLayer || []; var o = { event: ev }; for (var k in data) o[k] = data[k]; window.dataLayer.push(o); } catch (e) {}
  }
  function norm(s) { return (s || '').toLowerCase().replace(/[-–—_()]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function forsta(namn) {
    var c = (namn || '').trim().charAt(0).toUpperCase();
    return ALFABET.indexOf(c) > -1 ? c : (/[0-9]/.test(c) ? '0–9' : c || '#');
  }

  function init() {
    var wrap = document.querySelector('.ao-wrap'); if (!wrap) return;
    var alla = wrap.querySelector('.ao-alla'); if (!alla) return;
    var pop = wrap.querySelector('[data-ao="pop"]');
    var rubrik = wrap.querySelector('[data-ao="antal"]');
    var bokst = wrap.querySelector('[data-ao="bokst"]');
    var tomt = wrap.querySelector('[data-ao="tomt"]');
    var chips = [].slice.call(wrap.querySelectorAll('.ao-chip[data-amne]'));

    /* Rader från båda CMS-listorna, sorterade på svenska */
    var listor = [].slice.call(alla.querySelectorAll('.w-dyn-list'));
    var rader = [].slice.call(alla.querySelectorAll('.w-dyn-item')).map(function (el) {
      var namn = (el.querySelector('.ao-rad-namn') || {}).textContent || '';
      var desc = (el.querySelector('.ao-rad-desc') || {}).textContent || '';
      return { el: el, namn: namn.trim(), sok: norm(namn + ' ' + desc), amne: el.getAttribute('data-amne') || '', b: forsta(namn) };
    }).filter(function (r) { return r.namn; });
    rader.sort(function (a, b) { return a.namn.localeCompare(b.namn, 'sv', { sensitivity: 'base' }); });
    var total = rader.length;

    /* Grupper per bokstav */
    var grupperEl = document.createElement('div');
    grupperEl.className = 'ao-grupper';
    var grupper = {}, ordning = [];
    rader.forEach(function (r) {
      if (!grupper[r.b]) {
        var g = document.createElement('div');
        g.className = 'ao-grupp'; g.id = 'bokstav-' + r.b.toLowerCase();
        g.innerHTML = '<h3 class="ao-bokstav">' + r.b + '</h3><div class="ao-lista ao-grupplista" role="list"></div>';
        grupper[r.b] = { el: g, lista: g.querySelector('.ao-grupplista'), rader: [] };
        ordning.push(r.b); grupperEl.appendChild(g);
      }
      r.el.setAttribute('role', 'listitem');
      grupper[r.b].lista.appendChild(r.el);
      grupper[r.b].rader.push(r);
    });
    var forstaLista = listor[0];
    alla.insertBefore(grupperEl, forstaLista ? forstaLista.closest('.w-dyn-list') : null);
    listor.forEach(function (l) { l.style.display = 'none'; });

    /* Bokstavsraden */
    var bokstLankar = {};
    if (bokst) {
      bokst.setAttribute('role', 'navigation');
      bokst.setAttribute('aria-label', 'Hoppa till bokstav');
      ALFABET.forEach(function (b) {
        var a = document.createElement('a');
        a.className = 'ao-bokst-lank'; a.textContent = b;
        a.href = '#bokstav-' + b.toLowerCase();
        bokst.appendChild(a); bokstLankar[b] = a;
      });
    }

    /* Sökrutan */
    var sokHost = wrap.querySelector('[data-ao="sokruta"]'), input = null;
    if (sokHost) {
      sokHost.innerHTML = '<label class="ao-sok-label" for="ao-sok-input">Sök bland AI-termerna</label>' +
        '<span class="ao-sok-ikon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg></span>' +
        '<input id="ao-sok-input" class="ao-sok-input" type="search" autocomplete="off" placeholder="Sök, t.ex. token, RAG eller hallucination">';
      input = sokHost.querySelector('input');
    }

    var state = { q: '', amne: '' };
    var params = new URLSearchParams(location.search);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('amne')) state.amne = params.get('amne');
    if (input && state.q) input.value = state.q;

    function rita() {
      var q = norm(state.q), antal = 0;
      ordning.forEach(function (b) {
        var g = grupper[b], syns = 0;
        g.rader.forEach(function (r) {
          var ok = (!state.amne || r.amne === state.amne) && (!q || r.sok.indexOf(q) > -1);
          r.el.style.display = ok ? '' : 'none';
          if (ok) syns++;
        });
        g.el.style.display = syns ? '' : 'none';
        antal += syns;
        if (bokstLankar[b]) bokstLankar[b].classList.toggle('is-tom', !syns);
      });
      ALFABET.forEach(function (b) { if (!grupper[b] && bokstLankar[b]) bokstLankar[b].classList.add('is-tom'); });
      var filtrerat = !!(q || state.amne);
      if (pop) pop.style.display = filtrerat ? 'none' : '';
      if (tomt) tomt.style.display = antal ? 'none' : 'block';
      if (rubrik) rubrik.textContent = filtrerat ?
        antal + (antal === 1 ? ' term' : ' termer') + (state.amne ? ' i ' + state.amne.toLowerCase() : '') :
        'Alla ' + total + ' termer från A till Ö';
      chips.forEach(function (c) {
        var on = c.getAttribute('data-amne') === state.amne;
        c.classList.toggle('is-vald', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      return antal;
    }

    var tid = null;
    if (input) input.addEventListener('input', function () {
      state.q = input.value; var n = rita();
      clearTimeout(tid);
      tid = setTimeout(function () { if (state.q.trim().length > 1) track('ao_sok', { q: state.q.trim().slice(0, 60), antal: n }); }, 900);
    });
    chips.forEach(function (c) {
      c.setAttribute('role', 'button');
      c.addEventListener('click', function (e) {
        e.preventDefault();
        state.amne = c.getAttribute('data-amne') || '';
        rita();
        track('ao_amne', { amne: state.amne || 'alla' });
        var y = alla.getBoundingClientRect().top + window.pageYOffset - 90;
        if (window.pageYOffset < y - 40 || window.pageYOffset > y + 400) window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });

    rita();
    if (state.amne || state.q) setTimeout(function () { alla.scrollIntoView({ block: 'start' }); }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
