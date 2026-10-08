/* ============================================================
   AIMonkey — mall-steg.js (AI-Mallar Template)
   Stegkort för mallar som har steg-prompter i biblioteket.

   Webflow-struktur (Designer):
     [data-mall-v2="wrapper"]
       RichText  (Intro)          — bunden till AI-Mallar.intro
       Collection list [data-mall-v2="steg"] — Prompters, filter
                                    Huvudmall = aktuell mall, sort Steg ↑
         .stegkort[data-steg][data-slug][data-roll][data-malgrupp][data-namn]
       RichText  (Efter stegen)   — bunden till AI-Mallar.efter-stegen

   Regel: finns minst ett stegkort → stegkort-layout (body.mall-v2-on),
   gamla rich text + Finsweet-TOC döljs. Annars döljs hela wrappern och
   mallen ser ut som förut (body.mall-v2-off).
============================================================ */
(function () {
  'use strict';

  var CSS = [
    'body.mall-v2-off [data-mall-v2="wrapper"]{display:none!important}',
    'body.mall-v2-on [fs-toc-element="contents"]{display:none!important}',
    'body.mall-v2-on .content27_link-content{display:none!important}',
    '[data-mall-v2="steg"] .w-dyn-empty{display:none!important}',
    '[data-mall-v2="intro"]{margin-bottom:2rem}',
    '[data-mall-v2="efter"]{margin-top:2.5rem}',
    '.stegkort-rubrik{font-size:2rem;line-height:1.15;margin:0 0 .5rem}',
    '.stegkort-ingress{margin:0 0 1.25rem;color:#5b6573}',
    '.stegkort-progress{display:flex;align-items:center;gap:14px;margin:0 0 1.5rem;font-size:14px;color:#313a47}',
    '.stegkort-progress-bar{flex:1;height:8px;border-radius:8px;background:#e5f9f6;overflow:hidden}',
    '.stegkort-progress-bar span{display:block;height:8px;border-radius:8px;background:#00c9a7;transition:width .3s}',
    '.stegkort.is-current .stegkort-card{border:2px solid #00c9a7}',
    '.stegkort.is-todo .stegkort-num{background:#fff;color:#5b6573;border:2px solid #ced2d7;box-sizing:border-box}',
    '.stegkort.is-done .stegkort-num{background:#00c9a7;color:#0b1f3b;font-size:0}',
    '.stegkort.is-done .stegkort-num:after{content:"\\2713";font-size:18px}',
    '.stegkort.is-collapsed .stegkort-nar,.stegkort.is-collapsed .stegkort-prompt,.stegkort.is-collapsed .stegkort-actions,.stegkort.is-collapsed .stegkort-acc,.stegkort.is-collapsed .stegkort-foot{display:none}',
    '.stegkort.is-collapsed .stegkort-card{padding:16px 20px;cursor:pointer}',
    '.stegkort.is-collapsed .stegkort-titel{font-size:18px;color:#313a47}',
    '.stegkort.is-collapsed .stegkort-badge{display:none}',
    '.stegkort-prompt.is-expanded{max-height:none}',
    '.stegkort-visa-hela{display:inline-block;margin-top:8px;font-size:13px;font-weight:600;color:#00806b;cursor:pointer;background:none;border:0;padding:0}',
    '.stegkort-acc.is-open .stegkort-acc-body{display:block}',
    '.stegkort-acc-btn:after{content:"+";float:right;color:#00806b}',
    '.stegkort-acc.is-open .stegkort-acc-btn:after{content:"\\2212"}',
    '.stegkort-btn.is-copied{background:#00c9a7;color:#0b1f3b}',
    '.stegkort.is-done .stegkort-klar{background:#e5f9f6;color:#005042;border-color:#4cd9c1}',
    '.stegkort-klart{margin:0 0 0 60px;background:#e5f9f6;border-radius:16px;padding:16px 20px;font-weight:600;color:#005042}',
    '.stegnav{display:flex;flex-direction:column;gap:4px;margin-top:.5rem}',
    '.stegnav a{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;font-size:14px;color:#313a47;text-decoration:none}',
    '.stegnav a.is-current{background:#e5f9f6;color:#005042;font-weight:600}',
    '.stegnav i{font-style:normal;width:24px;height:24px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:12px;border:1px solid #ced2d7;color:#5b6573}',
    '.stegnav a.is-done i{background:#00c9a7;border-color:#00c9a7;color:#0b1f3b}',
    '.stegnav-progress{font-size:13px;color:#5b6573;margin:.25rem 0 .5rem}',
    '@media (max-width:767px){.stegkort{gap:12px}.stegkort-rail{width:32px}.stegkort-num{width:32px;height:32px;font-size:14px}.stegkort-card{padding:16px}.stegkort-titel{font-size:20px}.stegkort-actions{flex-direction:column;align-items:stretch}.stegkort-btn{text-align:center}.stegkort-oppna{margin-left:0;text-align:center}.stegkort-klart{margin-left:0}}'
  ].join('\n');

  function track(event, params) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event, mall: mallSlug };
    for (var k in params) o[k] = params[k];
    window.dataLayer.push(o);
  }

  var mallSlug = (location.pathname.split('/').filter(Boolean).pop() || '');
  var storeKey = 'aim_mall_klar_' + mallSlug;

  function loadDone() {
    try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch (e) { return []; }
  }
  function saveDone(list) {
    try { localStorage.setItem(storeKey, JSON.stringify(list)); } catch (e) { /* privat läge */ }
  }

  function rawText(el) {
    if (!el) return '';
    return (el.getAttribute('data-pm-raw') || el.textContent || '').trim();
  }

  function copy(text, btn, label) {
    function ok() {
      btn.textContent = 'Kopierad!';
      btn.classList.add('is-copied');
      setTimeout(function () { btn.textContent = label; btn.classList.remove('is-copied'); }, 2500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var list = document.querySelector('[data-mall-v2="steg"]');
    var cards = list ? Array.prototype.slice.call(list.querySelectorAll('.stegkort')) : [];
    if (!cards.length) { document.body.classList.add('mall-v2-off'); return; }
    document.body.classList.add('mall-v2-on');

    cards.sort(function (a, b) { return (+a.getAttribute('data-steg') || 0) - (+b.getAttribute('data-steg') || 0); });
    var total = cards.length;
    var mallNamn = (document.querySelector('h1') || {}).textContent || document.title;

    /* Rubrik + förlopp ovanför listan */
    var head = document.createElement('div');
    head.innerHTML = '<h2 class="stegkort-rubrik">Stegen</h2>' +
      '<p class="stegkort-ingress">Kör stegen i ordning. Svaret från ett steg klistrar du in i nästa, eller låter Promptgeneratorn hjälpa dig.</p>' +
      '<div class="stegkort-progress"><span class="stegkort-progress-txt"></span><div class="stegkort-progress-bar"><span></span></div></div>';
    list.parentNode.insertBefore(head, list);
    var progTxt = head.querySelector('.stegkort-progress-txt');
    var progBar = head.querySelector('.stegkort-progress-bar span');
    var klartBox = document.createElement('div');
    klartBox.className = 'stegkort-klart';
    klartBox.textContent = 'Snyggt jobbat! Alla steg är klara.';
    klartBox.style.display = 'none';
    list.parentNode.insertBefore(klartBox, list.nextSibling);

    /* Sidonavigering i stället för Finsweet-TOC */
    var nav = null;
    var sidebar = document.querySelector('.content27_sidebar');
    if (sidebar) {
      var h = sidebar.querySelector('.content27_sidebar-heading .heading-style-h5');
      if (h) h.textContent = 'Din väg';
      nav = document.createElement('nav');
      nav.className = 'stegnav';
      nav.setAttribute('aria-label', 'Mallens steg');
      sidebar.appendChild(nav);
    }

    var done = loadDone();
    var openOverride = {};

    cards.forEach(function (card, i) {
      var n = +card.getAttribute('data-steg') || (i + 1);
      card.id = 'steg-' + n;
      var promptEl = card.querySelector('.stegkort-prompt');
      var titel = (card.querySelector('.stegkort-titel') || {}).textContent || ('Steg ' + n);

      /* Visa hela prompten */
      if (promptEl) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'stegkort-visa-hela';
        more.textContent = 'Visa hela prompten';
        promptEl.parentNode.insertBefore(more, promptEl.nextSibling);
        more.addEventListener('click', function () {
          var on = promptEl.classList.toggle('is-expanded');
          more.textContent = on ? 'Visa mindre' : 'Visa hela prompten';
        });
      }

      /* Dragspel */
      card.querySelectorAll('.stegkort-acc').forEach(function (acc) {
        var btn = acc.querySelector('.stegkort-acc-btn');
        var body = acc.querySelector('.stegkort-acc-body');
        var empty = body && !body.textContent.trim();
        if (empty) { acc.style.display = 'none'; return; }
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-expanded', 'false');
        function toggle() {
          var on = acc.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        }
        btn.addEventListener('click', toggle);
        btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      });

      /* Kopiera (prompt + följdprompt) */
      var kop = card.querySelector('.stegkort-kopiera');
      if (kop) kop.addEventListener('click', function (e) {
        e.preventDefault();
        copy(rawText(promptEl), kop, 'Kopiera prompt');
        track('mall_steg_kopiera', { steg: n });
      });
      var nasta = card.querySelector('.stegkort-nasta');
      if (nasta && nasta.textContent.trim()) {
        var nbtn = document.createElement('button');
        nbtn.type = 'button';
        nbtn.className = 'stegkort-btn stegkort-kopiera';
        nbtn.style.marginTop = '10px';
        nbtn.style.border = '1px solid #4cd9c1';
        nbtn.style.cursor = 'pointer';
        nbtn.textContent = 'Kopiera följdprompt';
        nasta.parentNode.appendChild(nbtn);
        nbtn.addEventListener('click', function () { copy(rawText(nasta), nbtn, 'Kopiera följdprompt'); });
      }

      /* Fyll i med Promptgeneratorn */
      var anp = card.querySelector('.stegkort-anpassa');
      if (anp) anp.addEventListener('click', function (e) {
        e.preventDefault();
        var text = rawText(promptEl);
        var namn = card.getAttribute('data-namn') || titel;
        var roll = card.getAttribute('data-roll') || '';
        var malgrupp = card.getAttribute('data-malgrupp') || '';
        track('mall_steg_anpassa', { steg: n });
        try {
          sessionStorage.setItem('pg_chain', JSON.stringify({
            mall: mallSlug, mallNamn: mallNamn.trim(), steg: n, total: total,
            steps: cards.map(function (c) {
              return { steg: +c.getAttribute('data-steg'), titel: ((c.querySelector('.stegkort-titel') || {}).textContent || '').trim() };
            })
          }));
          sessionStorage.setItem('pg_from', location.pathname);
        } catch (err) {}
        var base = '/promptgeneratorn?source=mallar&mall=' + encodeURIComponent(mallSlug) + '&steg=' + n;
        if (text.length > 1200) {
          try {
            sessionStorage.setItem('pg_imported_prompt', text);
            sessionStorage.setItem('pg_imported_namn', namn);
            sessionStorage.setItem('pg_imported_tasktype', '');
            sessionStorage.setItem('pg_imported_roll', roll);
            sessionStorage.setItem('pg_imported_ton', '');
            sessionStorage.setItem('pg_imported_malgrupp', malgrupp);
          } catch (err) {}
          location.href = base + '&namn=' + encodeURIComponent(namn);
        } else {
          location.href = base + '&brief=' + encodeURIComponent(text) + '&namn=' + encodeURIComponent(namn) +
            (roll ? '&roll=' + encodeURIComponent(roll) : '') + (malgrupp ? '&malgrupp=' + encodeURIComponent(malgrupp) : '');
        }
      });

      /* Markera som klart */
      var klar = card.querySelector('.stegkort-klar');
      if (klar) klar.addEventListener('click', function (e) {
        e.preventDefault();
        var idx = done.indexOf(n);
        if (idx === -1) {
          done.push(n);
          track('mall_steg_klar', { steg: n });
          if (done.length === total) track('mall_klar', { steg: n });
        } else { done.splice(idx, 1); }
        saveDone(done);
        openOverride = {};
        update();
        var next = cards[i + 1];
        if (idx === -1 && next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      /* Klick på hopfällt kort öppnar det */
      card.querySelector('.stegkort-card').addEventListener('click', function (e) {
        if (!card.classList.contains('is-collapsed')) return;
        e.preventDefault();
        openOverride[n] = true;
        update();
      });

      if (nav) {
        var a = document.createElement('a');
        a.href = '#steg-' + n;
        a.innerHTML = '<i></i><span></span>';
        a.querySelector('span').textContent = titel.trim();
        a.addEventListener('click', function () { openOverride[n] = true; update(); });
        nav.appendChild(a);
        card._nav = a;
      }
    });

    var navProg = null;
    if (nav) {
      navProg = document.createElement('p');
      navProg.className = 'stegnav-progress';
      nav.parentNode.insertBefore(navProg, nav);
    }

    function update() {
      var current = null;
      cards.forEach(function (card) {
        var n = +card.getAttribute('data-steg');
        var isDone = done.indexOf(n) !== -1;
        if (!isDone && current === null) current = n;
      });
      cards.forEach(function (card) {
        var n = +card.getAttribute('data-steg');
        var isDone = done.indexOf(n) !== -1;
        var isCurrent = n === current;
        card.classList.toggle('is-done', isDone);
        card.classList.toggle('is-current', isCurrent);
        card.classList.toggle('is-todo', !isDone && !isCurrent);
        card.classList.toggle('is-collapsed', isDone && !openOverride[n]);
        var klar = card.querySelector('.stegkort-klar');
        if (klar) klar.textContent = isDone ? 'Klart ✓ Ångra' : (n === total ? 'Markera som klart' : 'Markera som klart och gå vidare');
        if (card._nav) {
          card._nav.classList.toggle('is-done', isDone);
          card._nav.classList.toggle('is-current', isCurrent);
          card._nav.querySelector('i').textContent = isDone ? '✓' : String(n);
        }
      });
      var c = done.filter(function (d) { return cards.some(function (k) { return +k.getAttribute('data-steg') === d; }); }).length;
      progTxt.textContent = c + ' av ' + total + ' steg klara';
      progBar.style.width = Math.round(c / total * 100) + '%';
      if (navProg) navProg.textContent = c + ' av ' + total + ' steg klara';
      klartBox.style.display = c === total ? 'block' : 'none';
    }
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
