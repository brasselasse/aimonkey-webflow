/* ============================================================
   AIMonkey — mall-steg.js (AI-Mallar Template)
   Stegkort för mallar som har steg-prompter i biblioteket.

   Webflow-struktur (Designer):
     [data-mall-v2="wrapper"]
       RichText  (Intro)          — bunden till AI-Mallar.intro
       Collection list [data-mall-v2="steg"] — källa: mallens referensfält
                                    "Prompts" (AI-Mallar.prompts), sort Steg ↑
         .stegkort (.stegkort-num ← Steg, .stegkort-titel ← Stegrubrik, …)
       Prompter utan Steg/Stegrubrik tas bort, så mallar som bara har
       "används även i"-prompter i fältet behåller gamla layouten.
       RichText  (Efter stegen)   — bunden till AI-Mallar.efter-stegen

   Regel: finns minst ett stegkort → stegkort-layout (body.mall-v2-on),
   gamla rich text + Finsweet-TOC döljs. Annars döljs hela wrappern och
   mallen ser ut som förut (body.mall-v2-off).
============================================================ */
(function () {
  'use strict';

  var CSS = [
    'body.mall-v2-off [data-mall-v2="wrapper"]{display:none!important}',
    /* Långa ord i rubriken (t.ex. "Invändningshanteraren") sprängde mobilbredden */
    '@media (max-width:767px){h1.heading-style-h1{hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word}}',
    'body.mall-v2-on [fs-toc-element="contents"]{display:none!important}',
    /* Gamla TOC-länkarna döljs, men behållaren behålls: den är dropdownen
       "Din väg" på mobil/surfplatta (Webflow-interaktionen växlar höjden). */
    'body.mall-v2-on .content27_link-content > .content27_link-wrapper{display:none!important}',
    'body.mall-v2-on .content27_link-content{overflow:hidden}',
    'body.mall-v2-on .content27_link-content > .stegnav-progress{margin-top:.75rem}',
    '[data-mall-v2="steg"] .w-dyn-empty{display:none!important}',
    '[data-stegkort="meta"]{display:none!important}',
    '[data-mall-meta]{display:none!important}',
    '[data-mall-resa]{display:none!important}',
    '.mall-resa{background:#0b1f3b;color:#f5f6fa;border-radius:16px;padding:20px;margin-top:20px}',
    '.mall-resa-label{margin:0 0 12px!important;font-size:12px!important;letter-spacing:.04em;text-transform:uppercase;color:#4cd9c1!important;font-weight:600}',
    '.mall-resa ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}',
    '.mall-resa li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.35;color:#ced2d7;min-width:0;overflow-wrap:anywhere;hyphens:auto}',
    '.mall-resa li i{font-style:normal;width:22px;height:22px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:12px;border:1px solid #5b6b82;margin-top:-1px}',
    '.mall-resa li.is-here{color:#fff;font-weight:600}',
    '.mall-resa li.is-here i{background:#00c9a7;border-color:#00c9a7;color:#0b1f3b}',
    '.mall-resa a{color:#ced2d7;text-decoration:none}',
    '.mall-resa a:hover{color:#4cd9c1}',
    '.mall-resa .mall-resa-mer{display:inline-block;margin-top:14px;font-size:13px;color:#4cd9c1}',
    '.mall-resa-mobil{display:none}',
    '@media (max-width:767px){.content27_sidebar .mall-resa{display:none}.mall-resa-mobil{display:block;margin:0 0 2rem}}',
    '.mall-fasmarke{display:inline-flex;align-items:center;gap:8px;background:#fff3c4;color:#665419;font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;margin-bottom:16px;text-decoration:none}',
    'a.mall-fasmarke:hover{background:#ffe9a0;color:#665419}',
    '.mall-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:1.5rem 0 2.5rem}',
    '.mall-info-kort{border:1px solid #e6e8ec;border-radius:16px;padding:20px 22px;background:#fff}',
    '.mall-info-kort h2,.mall-info-kort h3{font-size:20px!important;line-height:1.25;margin:0 0 10px!important;color:#0b1f3b}',
    '.mall-info-kort ul{margin:0;padding-left:0}',
    '.mall-info-kort p:last-child,.mall-info-kort ul:last-child{margin-bottom:0}',
    '.mall-misstag-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:1rem 0 2.5rem}',
    '.mall-misstag-kort{background:#f5f6fa;border-radius:16px;padding:18px 20px}',
    '.mall-misstag-kort strong{display:block;color:#0b1f3b;margin-bottom:6px}',
    '.mall-misstag-kort p{margin:0;font-size:15px;line-height:1.6}',
    '.mall-nastafas{display:flex;flex-wrap:wrap;gap:16px 24px;align-items:center;background:#0b1f3b;border-radius:24px;padding:28px 32px;margin:2rem 0}',
    '.mall-nastafas-text{flex:1 1 300px;min-width:0}',
    '.mall-nastafas .mall-nastafas-label{margin:0 0 6px!important;font-size:13px!important;line-height:1.4!important;letter-spacing:.04em;text-transform:uppercase;color:#4cd9c1!important;font-weight:600}',
    '.mall-nastafas .mall-nastafas-titel{margin:0 0 8px!important;font-size:28px!important;line-height:1.15!important;font-weight:700;color:#fff!important}',
    '.mall-nastafas .mall-nastafas-text p{color:#ced2d7;margin:0;font-size:15px;line-height:1.6}',
    'body.mall-v2-on .mallar-content > .w-dyn-list > .w-dyn-empty{display:none!important}',
    '.mall-nastafas-text a{color:#4cd9c1}',
    '.mall-nastafas-btn{background:#ffd23f;color:#0b1f3b!important;padding:14px 22px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;white-space:nowrap}',
    '.mall-nastafas-btn:hover{background:#ffdf78}',
    '.stegnav-pillar{display:block;margin-top:12px;font-size:13px;color:#00806b}',
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
    '@media (max-width:767px){.mall-info-grid,.mall-misstag-grid{grid-template-columns:1fr}.mall-nastafas{padding:22px}.mall-nastafas .mall-nastafas-titel{font-size:22px!important}.stegkort{gap:12px}.stegkort-rail{width:32px}.stegkort-num{width:32px;height:32px;font-size:14px}.stegkort-card{padding:16px}.stegkort-titel{font-size:20px}.stegkort-actions{flex-direction:column;align-items:stretch}.stegkort-btn{text-align:center}.stegkort-oppna{margin-left:0;text-align:center}.stegkort-klart{margin-left:0}}'
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


  /* ── Grafiska delar ur rich text (innehållet redigeras i CMS som vanlig text) ── */
  function metaText(key) {
    var el = document.querySelector('[data-mall-meta="' + key + '"]');
    return el && !el.classList.contains('w-dyn-bind-empty') ? el.textContent.trim() : '';
  }
  /* Pillar-sidor per roll (Roller-slug → adress). Lägg till när sidorna finns. */
  var PILLAR_URL = {
    saljare: '/ai-for-saljare',
    smaforetagare: '/ai-for-smaforetagare',
    marknadsforare: '/ai-for-marknadsforing-sociala-medier'
  };
  function resanNamn(roll) {
    if (!roll) return '';
    return (roll.slice(-1) === 'e' ? roll.slice(0, -1) : roll) + 'resan';
  }
  /* Delar upp en rich text i sektioner per H2: [{h, nodes}] */
  function sections(root) {
    var out = [], cur = { h: null, nodes: [] };
    Array.prototype.slice.call(root.children).forEach(function (n) {
      if (n.tagName === 'H2') { out.push(cur); cur = { h: n, nodes: [] }; }
      else cur.nodes.push(n);
    });
    out.push(cur);
    return out;
  }
  function htxt(s) { return s.h ? s.h.textContent.trim().toLowerCase() : ''; }

  function enhanceIntro() {
    var root = document.querySelector('[data-mall-v2="intro"]');
    if (!root) return;
    var secs = sections(root);
    var anv = secs.filter(function (s) { return /^anv[äa]nd (den h[äa]r )?mallen/.test(htxt(s)); })[0];
    var fa = secs.filter(function (s) { return /(vad du f[åa]r ut|det h[äa]r f[åa]r du ut)/.test(htxt(s)); })[0];
    if (!anv && !fa) return;
    var grid = document.createElement('div');
    grid.className = 'mall-info-grid';
    [anv, fa].forEach(function (s) {
      if (!s) return;
      var kort = document.createElement('div');
      kort.className = 'mall-info-kort';
      s.h.parentNode.insertBefore(grid, s.h);
      kort.appendChild(s.h);
      s.nodes.forEach(function (n) { kort.appendChild(n); });
      grid.appendChild(kort);
    });
  }

  function enhanceEfter(fas) {
    var root = document.querySelector('[data-mall-v2="efter"]');
    if (!root) return;
    sections(root).forEach(function (s) {
      var t = htxt(s);
      if (/^vanliga misstag/.test(t)) {
        var ps = s.nodes.filter(function (n) { return n.tagName === 'P' && n.firstElementChild && n.firstElementChild.tagName === 'STRONG' && n.textContent.indexOf(n.firstElementChild.textContent) === 0; });
        if (ps.length < 2) return;
        var grid = document.createElement('div');
        grid.className = 'mall-misstag-grid';
        ps[0].parentNode.insertBefore(grid, ps[0]);
        ps.forEach(function (p) {
          var kort = document.createElement('div');
          kort.className = 'mall-misstag-kort';
          var st = p.firstElementChild;
          var titel = document.createElement('strong');
          titel.textContent = st.textContent.replace(/[.:]\s*$/, '');
          p.removeChild(st);
          kort.appendChild(titel);
          kort.appendChild(p);
          grid.appendChild(kort);
        });
      } else if (/^n[äa]sta (fas|steg)/.test(t)) {
        var link = null;
        s.nodes.some(function (n) { link = n.querySelector && n.querySelector('a[href]'); return !!link; });
        if (!link) return;
        /* "Nästa steg" (t.ex. sista fasen) får rubriken som etikett, inte fas + 1 */
        var arFas = fas && /^n[äa]sta fas/.test(t);
        var card = document.createElement('div');
        card.className = 'mall-nastafas';
        var txt = document.createElement('div');
        txt.className = 'mall-nastafas-text';
        var label = document.createElement('p');
        label.className = 'mall-nastafas-label';
        label.textContent = arFas ? 'Nästa fas · ' + (fas + 1) : s.h.textContent.trim().replace(/[:.]\s*$/, '');
        var titel = document.createElement('p');
        titel.className = 'mall-nastafas-titel';
        titel.textContent = link.textContent.replace(/[→>\s]+$/, '').trim();
        txt.appendChild(label);
        txt.appendChild(titel);
        s.nodes.forEach(function (n) { txt.appendChild(n); });
        var btn = document.createElement('a');
        btn.className = 'mall-nastafas-btn';
        btn.href = link.getAttribute('href');
        btn.textContent = (arFas ? 'Fortsätt till fas ' + (fas + 1) : 'Fortsätt') + ' →';
        s.h.parentNode.insertBefore(card, s.h);
        s.h.parentNode.removeChild(s.h);
        card.appendChild(txt);
        card.appendChild(btn);
      }
    });
  }

  function addFasmarke(roll, rollSlug, fas) {
    var h1 = document.querySelector('h1');
    if (!h1 || !roll || !fas) return null;
    var url = PILLAR_URL[rollSlug];
    var el = document.createElement(url ? 'a' : 'span');
    el.className = 'mall-fasmarke';
    el.textContent = resanNamn(roll) + ' · Fas ' + fas;
    if (url) el.href = url;
    var holder = h1.parentNode;
    holder.parentNode.insertBefore(el, holder);
    return url;
  }

  function shortName(n) { return n.split(/\s*[:—–]\s+|\s+[—–]\s*/)[0].trim(); }
  function renderResa(roll, rollSlug, fas, pillarUrl) {
    if (!roll || !rollSlug || !fas) return null;
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-resa="item"]')).map(function (it) {
      function v(k) { var e = it.querySelector('[data-resa="' + k + '"]'); return e && !e.classList.contains('w-dyn-bind-empty') ? e.textContent.trim() : ''; }
      return { namn: v('namn'), slug: v('slug'), fas: parseInt(v('fas'), 10) || 0, roll: v('roll') };
    }).filter(function (m) { return m.roll === rollSlug && m.fas > 0 && m.namn; });
    if (items.length < 2) return null;
    var faser = {};
    items.forEach(function (m) { (faser[m.fas] = faser[m.fas] || []).push(m); });
    var nums = Object.keys(faser).map(Number).sort(function (a, b) { return a - b; });
    function build(extraClass) {
      var box = document.createElement('div');
      box.className = 'mall-resa' + (extraClass ? ' ' + extraClass : '');
      var lab = document.createElement('p');
      lab.className = 'mall-resa-label';
      lab.textContent = resanNamn(roll);
      box.appendChild(lab);
      var ol = document.createElement('ol');
      nums.forEach(function (n) {
        var li = document.createElement('li');
        if (n === fas) li.className = 'is-here';
        var i = document.createElement('i');
        i.textContent = n;
        li.appendChild(i);
        var span = document.createElement('span');
        faser[n].forEach(function (m, k) {
          if (k) span.appendChild(document.createTextNode(' + '));
          var here = location.pathname.split('/').filter(Boolean).pop() === m.slug;
          var el = document.createElement(here ? 'span' : 'a');
          el.textContent = shortName(m.namn);
          if (!here) el.href = '/ai-mallar/' + m.slug;
          span.appendChild(el);
        });
        li.appendChild(span);
        ol.appendChild(li);
      });
      box.appendChild(ol);
      if (pillarUrl) {
        var a = document.createElement('a');
        a.className = 'mall-resa-mer';
        a.href = pillarUrl;
        a.textContent = 'Se hela ' + resanNamn(roll).toLowerCase() + ' →';
        box.appendChild(a);
      }
      return box;
    }
    return build;
  }

  function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var list = document.querySelector('[data-mall-v2="steg"]');
    var cards = list ? Array.prototype.slice.call(list.querySelectorAll('.stegkort')) : [];
    /* Listan hämtar mallens referensfält "Prompts". Webflow publicerar inte
       attributbindningar här, så stegnummer/rubrik läses ur kortet.
       Bara prompter med Steg + Stegrubrik blir stegkort; vanliga
       "används även i"-prompter (utan steg) tas bort. */
    cards = cards.filter(function (c) {
      var numEl = c.querySelector('.stegkort-num');
      var titelEl = c.querySelector('.stegkort-titel');
      var n = numEl ? parseInt(numEl.textContent, 10) : NaN;
      var t = titelEl ? titelEl.textContent.trim() : '';
      var keep = n > 0 && !!t && !(numEl.classList.contains('w-dyn-bind-empty') || titelEl.classList.contains('w-dyn-bind-empty'));
      if (keep) {
        if (!c.getAttribute('data-steg')) c.setAttribute('data-steg', String(n));
        /* Dolda metafält (bundna textblock) → data-attribut */
        ['slug', 'roll', 'malgrupp'].forEach(function (k) {
          var el = c.querySelector('[data-stegkort="' + k + '"]');
          var v = el && !el.classList.contains('w-dyn-bind-empty') ? el.textContent.trim() : '';
          if (v && !c.getAttribute('data-' + k)) c.setAttribute('data-' + k, v);
        });
        var oppna = c.querySelector('.stegkort-oppna');
        if (oppna) {
          if (c.getAttribute('data-slug')) oppna.setAttribute('href', '/ai-prompter/' + c.getAttribute('data-slug'));
          else oppna.style.display = 'none';
        }
        /* Märkningen "Bygger på förra steget": visa bara när prompten tar in ett tidigare svar */
        var pr = c.querySelector('.stegkort-prompt');
        var badge = c.querySelector('.stegkort-badge');
        if (badge && pr && (n < 2 || !/klistra in [^\]]*fr[åa]n (steg|fas|kundkort)/i.test(pr.textContent))) badge.style.display = 'none';
      } else { var item = c.closest('.w-dyn-item') || c; item.parentNode.removeChild(item); }
      return keep;
    });
    if (!cards.length) { document.body.classList.add('mall-v2-off'); return; }
    document.body.classList.add('mall-v2-on');

    cards.sort(function (a, b) { return (+a.getAttribute('data-steg') || 0) - (+b.getAttribute('data-steg') || 0); });
    var total = cards.length;
    var mallNamn = (document.querySelector('h1') || {}).textContent || document.title;
    var rollNamn = metaText('roll'), rollSlug = metaText('rollslug'), fasNr = parseInt(metaText('fas'), 10) || 0;
    var pillarUrl = null;
    try { pillarUrl = addFasmarke(rollNamn, rollSlug, fasNr); enhanceIntro(); enhanceEfter(fasNr); } catch (err) { /* grafiken är ett tillägg, stegkorten ska alltid fungera */ }

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
      /* Lägg stegmenyn i dropdown-behållaren (där TOC:n låg), annars direkt i sidokolumnen */
      var navHost = sidebar.querySelector('.content27_link-content') || sidebar;
      navHost.appendChild(nav);
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
        e.stopPropagation();
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
        a.addEventListener('click', function () {
          openOverride[n] = true; update();
          /* Mobil/surfplatta: stäng dropdownen "Din väg" när man valt ett steg */
          var lc = nav.parentNode;
          var head = sidebar.querySelector('.content27_sidebar-heading');
          if (window.innerWidth < 992 && head && lc && lc.classList.contains('content27_link-content') && lc.getBoundingClientRect().height > 0) head.click();
        });
        nav.appendChild(a);
        card._nav = a;
      }
    });

    var navProg = null;
    if (nav) {
      navProg = document.createElement('p');
      navProg.className = 'stegnav-progress';
      nav.parentNode.insertBefore(navProg, nav);
      if (rollNamn && fasNr) {
        var pl = document.createElement(pillarUrl ? 'a' : 'span');
        pl.className = 'stegnav-pillar';
        pl.textContent = 'Del av ' + resanNamn(rollNamn) + ', fas ' + fasNr + (pillarUrl ? ' →' : '');
        if (pillarUrl) pl.href = pillarUrl;
        nav.parentNode.appendChild(pl);
      }
    }

    try {
      var resa = renderResa(rollNamn, rollSlug, fasNr, pillarUrl);
      if (resa) {
        if (sidebar) sidebar.appendChild(resa());
        klartBox.parentNode.insertBefore(resa('mall-resa-mobil'), klartBox.nextSibling);
      }
    } catch (err) {}

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
