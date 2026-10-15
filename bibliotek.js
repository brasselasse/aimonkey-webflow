/* ============================================================
   AIMonkey — bibliotek.js (promptbiblioteket, ny version)
   Kräver pg-fyll.js (window.AimFyll).

   Webflow renderar korten (100 per sida, länk till /ai-prompter/<slug>
   och CMS-fält som data-pb-*). Skriptet hämtar resten av sidorna via
   paginering, döljer Webflow-listan (den ligger kvar i HTML:en för
   länkarnas skull) och ritar biblioteket enligt skissen 2026-10-15:
   sök, "Vad vill du göra?", Färdiga flöden, Alla/Mina prompter,
   kategorier, filter, sortering och kort med etiketter, utdrag,
   Fyll i och kopiera, Kopiera (med hakparenteser), ★ och Kopiera länk.

   Körs bara på sidorna i SIDOR (live på /promptbiblioteket sedan 2026-10-15). Filter och sök sparas i adressen
   (?q=&kat=&flode=&flik=&bara=&sort=) så att en vy går att länka till.
   ============================================================ */
(function () {
  'use strict';
  var SIDOR = ['/promptbiblioteket', '/promptbiblioteket-ny'];
  var vag = location.pathname.replace(/\/$/, '');
  if (SIDOR.indexOf(vag) === -1 || window.__aimBibliotek) return;
  window.__aimBibliotek = true;
  var F;

  var CSS = [
    'body.pb-on .section_blog{display:none!important}',
    '.pb-app [hidden]{display:none!important}',
    '.pb-app{background:#f2f6f9;color:#0b1f3b;padding:40px 0 96px}',
    '.pb-wrap{max-width:1200px;margin:0 auto;padding:0 20px;display:flex;flex-direction:column;gap:40px}',
    '.pb-hero{display:flex;flex-direction:column;gap:14px;max-width:820px}',
    '.pb-etikett{margin:0!important;font-size:13px!important;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#00806b!important}',
    '.pb-h1{margin:0!important;font-size:clamp(38px,6vw,64px)!important;line-height:1.02!important;letter-spacing:-.02em}',
    '.pb-ingress{margin:0!important;font-size:clamp(17px,2vw,20px)!important;line-height:1.5!important;color:#3d4a5c!important}',
    '.pb-sok{position:relative;max-width:820px}',
    '.pb-sok svg{position:absolute;left:22px;top:50%;transform:translateY(-50%)}',
    '.pb-sok input{width:100%;box-sizing:border-box;min-height:66px;margin:0;padding:0 22px 0 60px;border:2px solid #d3dbe4;border-radius:20px;background:#fff;font:inherit;font-size:19px;color:#0b1f3b;box-shadow:0 12px 32px rgba(11,31,59,.06)}',
    '.pb-sok input:focus{outline:none;border-color:#00c9a7;box-shadow:0 0 0 6px rgba(0,201,167,.18)}',
    '.pb-rad{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    '.pb-malwrap{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}',
    '.pb-radlabel{flex:none;white-space:nowrap}',
    '.pb-radlabel{font-size:15px;font-weight:600;color:#3d4a5c;margin-right:4px}',
    '.pb-chip{font:inherit;font-size:15px;min-height:44px;padding:0 16px;border-radius:999px;cursor:pointer;border:1.5px solid #c9d3de;background:#fff;color:#0b1f3b;white-space:nowrap}',
    '.pb-chip:hover{border-color:#00c9a7}',
    '.pb-chip[aria-pressed="true"]{border-color:#0b1f3b;background:#0b1f3b;color:#fff;font-weight:600}',
    '.pb-h2rad{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px 16px}',
    '.pb-h2{margin:0!important;font-size:28px!important;line-height:1.2!important}',
    '.pb-text{margin:0!important;font-size:16px!important;line-height:1.5!important;color:#3d4a5c!important;max-width:720px}',
    '.pb-lank{font:inherit;font-size:15px;font-weight:600;color:#00806b!important;background:none;border:0;cursor:pointer;padding:6px 0;text-decoration:none}',
    '.pb-lank:hover{text-decoration:underline}',
    '.pb-floden{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:14px}',
    '.pb-flode{text-align:left;font:inherit;color:#0b1f3b;cursor:pointer;display:flex;flex-direction:column;gap:6px;padding:18px 20px;border-radius:20px;background:#fff;border:2px solid #e1e7ee;transition:border-color .15s,transform .15s}',
    '.pb-flode:hover{border-color:#00c9a7;transform:translateY(-2px)}',
    '.pb-flode[aria-pressed="true"]{background:#e5f9f6;border-color:#00c9a7}',
    '.pb-flode small{font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#005042}',
    '.pb-flode strong{font-size:20px;line-height:1.25}',
    '.pb-flode ol{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:13px;color:#3d4a5c}',
    '.pb-flode li{display:flex;gap:8px;align-items:baseline}',
    '.pb-flode li i{font-style:normal;flex:none;width:20px;height:20px;border-radius:50%;background:#e5f9f6;color:#005042;font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}',
    '.pb-flode li.pb-fler{padding-left:28px;color:#5b6573}',
    '.pb-flodebanner{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;background:#0b1f3b;color:#fff;border-radius:20px;padding:18px 22px}',
    '.pb-flodebanner div{flex:1 1 320px;display:flex;flex-direction:column;gap:4px}',
    '.pb-flodebanner small{font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#4cd9c1}',
    '.pb-flodebanner strong{font-size:24px;line-height:1.2}',
    '.pb-flodebanner p{margin:0!important;font-size:15px!important;color:#ced2d7!important}',
    '.pb-flodebanner a{color:#4cd9c1!important;font-size:15px;font-weight:600}',
    '.pb-flodebanner button{font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:0 16px;border-radius:12px;border:1.5px solid #3a4c68;background:transparent;color:#fff;cursor:pointer}',
    '.pb-verktyg{display:flex;flex-direction:column;gap:14px;background:#fff;border:1.5px solid #e1e7ee;border-radius:20px;padding:16px 18px}',
    '.pb-verktyg-topp{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}',
    '.pb-flikar{display:flex;gap:4px;background:#f2f6f9;border-radius:14px;padding:4px}',
    '.pb-flik{font:inherit;font-size:14px;min-height:40px;padding:0 14px;border-radius:10px;cursor:pointer;border:0;background:transparent;color:#0b1f3b}',
    '.pb-flik[aria-selected="true"]{background:#fff;font-weight:600;box-shadow:0 2px 6px rgba(11,31,59,.12)}',
    '.pb-sort{font:inherit;font-size:14px;min-height:40px;padding:0 12px;border-radius:10px;cursor:pointer;border:1.5px solid #e1e7ee;background:#fff;color:#0b1f3b}',
    '.pb-sort[aria-pressed="true"]{border-color:#0b1f3b;font-weight:600}',
    '.pb-kat{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}',
    '.pb-kat::-webkit-scrollbar{display:none}',
    '.pb-bara{padding-top:12px;border-top:1px solid #e1e7ee}',
    '.pb-antal{margin:0!important;font-size:15px!important;color:#3d4a5c!important}',
    '.pb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,460px),1fr));gap:18px}',
    '.pb-kort{background:#fff;border:1.5px solid #e1e7ee;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:12px;min-width:0;transition:border-color .15s,box-shadow .15s}',
    '.pb-kort:hover{border-color:#9fe3d6;box-shadow:0 12px 30px rgba(11,31,59,.07)}',
    '.pb-etiketter{display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
    '.pb-e{font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;background:#f2f6f9;color:#3d4a5c}',
    '.pb-e.is-flode{background:#e5f9f6;color:#005042}',
    '.pb-e.is-falt{background:#fff1bf;color:#6b4d00}',
    '.pb-e.is-kant{background:transparent;border:1.5px solid #c9d3de;padding:3px 9px}',
    '.pb-stegnr{width:34px;height:34px;border-radius:50%;background:#0b1f3b;color:#ffd23f;font-size:16px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-right:4px}',
    '.pb-titel{margin:0!important;font-size:22px!important;line-height:1.25!important}',
    '.pb-titel a{color:#0b1f3b!important;text-decoration:none}',
    '.pb-titel a:hover{color:#00806b!important;text-decoration:underline}',
    '.pb-desc{margin:0!important;font-size:15px!important;line-height:1.5!important;color:#3d4a5c!important}',
    '.pb-utdrag{background:#f2f6f9;border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.55;color:#3d4a5c;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}',
    '.pb-knappar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:auto}',
    '.pb-prim{font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:0 18px;border-radius:12px;border:0;background:#0b1f3b;color:#fff!important;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none}',
    '.pb-prim:hover{background:#1c3459}',
    '.pb-sek{font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:0 16px;border-radius:12px;border:1.5px solid #c9d3de;background:#fff;color:#0b1f3b;cursor:pointer}',
    '.pb-sek:hover{border-color:#0b1f3b}',
    '.pb-luft{flex:1 1 0}',
    '.pb-ikon{width:44px;height:44px;border-radius:12px;border:0;background:transparent;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#0b1f3b}',
    '.pb-ikon:hover{background:#f2f6f9}',
    '.pb-tomt{background:#fff;border:1.5px dashed #c9d3de;border-radius:20px;padding:28px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}',
    '.pb-tomt strong{font-size:22px}',
    '.pb-tomt p{margin:0!important;color:#3d4a5c!important}',
    '.pb-mer{align-self:center;font:inherit;font-size:16px;font-weight:600;min-height:48px;padding:0 24px;border-radius:14px;border:1.5px solid #0b1f3b;background:#fff;color:#0b1f3b;cursor:pointer}',
    '.pb-laddar{font-size:15px;color:#3d4a5c}',
    '.pb-botten{display:flex;flex-wrap:wrap;gap:18px}',
    '.pb-apan{flex:999 1 520px;min-width:0;background:#e5f9f6;border-radius:22px;padding:24px 26px;display:flex;flex-direction:column;gap:10px}',
    '.pb-apan strong{font-size:22px;color:#005042}',
    '.pb-apan blockquote{margin:0;border:0;padding:0;font-size:17px;line-height:1.6;color:#0b1f3b}',
    '.pb-gen{flex:1 1 300px;min-width:0;background:#0b1f3b;color:#fff;border-radius:22px;padding:24px 26px;display:flex;flex-direction:column;gap:10px;align-items:flex-start}',
    '.pb-gen strong{font-size:22px}',
    '.pb-gen p{margin:0!important;font-size:15px!important;line-height:1.5!important;color:#ced2d7!important}',
    '.pb-gen a{display:inline-flex;align-items:center;min-height:48px;padding:0 20px;border-radius:14px;background:#ffd23f;color:#0b1f3b!important;font-weight:700;text-decoration:none}',
    '.pb-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;width:min(640px,calc(100% - 32px));box-sizing:border-box;background:#0b1f3b;color:#fff;border-radius:18px;padding:16px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;box-shadow:0 16px 40px rgba(11,31,59,.3)}',
    '.pb-toast[hidden]{display:none}',
    '.pb-toast div{flex:1 1 240px}',
    '.pb-toast strong{display:block;font-size:16px}',
    '.pb-toast span{font-size:14px;color:#ced2d7;overflow-wrap:anywhere}',
    '.pb-toast a{color:#4cd9c1!important;font-size:15px;font-weight:600}',
    '@media (max-width:767px){.pb-malwrap{flex-direction:column;align-items:stretch;gap:10px}.pb-mal{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px 2px}.pb-mal::-webkit-scrollbar{display:none}.pb-mal .pb-chip{flex:none}.pb-h2rad{flex-direction:column;align-items:flex-start;gap:4px}.pb-floden{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 16px;scrollbar-width:none;margin:0 -16px;padding:2px 16px 6px;gap:12px}.pb-floden::-webkit-scrollbar{display:none}.pb-flode{flex:0 0 82%;scroll-snap-align:start}.pb-flode:hover{transform:none}.pb-kat .pb-chip,.pb-bara .pb-chip{flex:none}.pb-bara{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -18px;padding:12px 18px 2px}.pb-bara::-webkit-scrollbar{display:none}.pb-verktyg-topp{flex-direction:column;align-items:stretch}.pb-flikar{align-self:stretch}.pb-flik{flex:1 1 0;white-space:nowrap;padding:0 8px}.pb-app{padding:28px 0 80px}.pb-wrap{gap:32px;padding:0 16px}.pb-kort{padding:18px}.pb-h2{font-size:24px!important}.pb-sok input{font-size:17px;min-height:58px}}'
  ].join('\n');

  var TYPER = { 'skriva-text': 'Text', 'sammanfatta': 'Sammanfatta', 'analysera': 'Analysera', 'brainstorma': 'Brainstorma', 'förklara': 'Förklara', 'forklara': 'Förklara', 'bild': 'Bild', 'video': 'Video', 'kod': 'Kod' };
  var MAL = [
    { text: 'Svara en kund', q: 'kund' },
    { text: 'Skriva ett mejl', q: 'mejl' },
    { text: 'Sälja mer', q: 'sälj' },
    { text: 'Synas i sociala medier', q: 'inlägg' },
    { text: 'Planera och prioritera', q: 'planera' },
    { text: 'Göra en bild', bara: 'bild' },
    { text: 'Fixa kod', bara: 'kod' }
  ];
  var BARA = [
    { k: 'flode', text: 'Ingår i ett flöde' },
    { k: 'nyb', text: 'Nybörjarvänliga' },
    { k: 'bild', text: 'Bildprompter' },
    { k: 'kod', text: 'Kod' }
  ];
  var SORT = [{ k: 'utvalda', text: 'Utvalda' }, { k: 'ny', text: 'Nyast' }, { k: 'az', text: 'A–Ö' }];
  var PER_SIDA = 30;

  var IKON_LANK = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  function stjarna(fylld) { return '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="' + (fylld ? '#ffd23f' : 'none') + '" stroke="#0b1f3b" stroke-width="1.6" stroke-linejoin="round"/></svg>'; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(event, extra) { window.dataLayer = window.dataLayer || []; var o = { event: event }; for (var k in extra) o[k] = extra[k]; window.dataLayer.push(o); }
  function kortNamn(n) { return (n || '').split(/\s+[—–]\s+|:\s+/)[0].trim(); }
  function tillKlipp(text, ok) {
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); if (ok) ok(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { if (ok) ok(); }, fallback); else fallback();
  }

  /* ── Läs korten ── */
  function lasKort(root) {
    return [].slice.call(root.querySelectorAll('[data-pb-slug]')).map(function (el) {
      function t(sel) { var e = el.querySelector(sel); return e ? e.textContent.trim() : ''; }
      var pe = el.querySelector('.prompt-copy-text.prompt-copy');
      var prompt = pe ? (pe.getAttribute('data-pm-raw') || pe.textContent || '') : '';
      var datum = new Date(t('.prompter-date'));
      return {
        slug: el.getAttribute('data-pb-slug') || '',
        titel: t('.article-title-prompt'),
        desc: t('.article-desc-prompt'),
        kat: t('[fs-list-field="category"]'),
        datum: isNaN(datum) ? 0 : datum.getTime(),
        prompt: prompt.replace(/\r\n?/g, '\n').trim(),
        steg: parseInt(el.getAttribute('data-pb-steg') || '', 10) || 0,
        stegrubrik: el.getAttribute('data-pb-stegrubrik') || '',
        mall: el.getAttribute('data-pb-mall') || '',
        mallslug: el.getAttribute('data-pb-mallslug') || '',
        typ: el.getAttribute('data-pb-typ') || '',
        niva: el.getAttribute('data-pb-niva') || ''
      };
    }).filter(function (p) { return p.slug && p.titel; });
  }

  function hamtaAlla(cb) {
    var alla = lasKort(document), sedda = {};
    alla.forEach(function (p) { sedda[p.slug] = 1; });
    var next = document.querySelector('.w-pagination-next');
    var url = next ? next.getAttribute('href') : '';
    var varv = 0;
    if (!url) {
      /* Finsweet (gamla sidan) kan ha tagit bort pagineringen och laddar
         själv in resten: vänta tills antalet kort slutat växa (max 6 s). */
      var forra = -1, lika = 0, start = Date.now();
      (function vanta() {
        var n = document.querySelectorAll('[data-pb-slug]').length;
        lika = n === forra ? lika + 1 : 0; forra = n;
        if (lika >= 6 || Date.now() - start > 6000) {
          lasKort(document).forEach(function (p) { if (!sedda[p.slug]) { sedda[p.slug] = 1; alla.push(p); } });
          return cb(alla);
        }
        setTimeout(vanta, 100);
      })();
      return;
    }
    (function steg() {
      if (!url || ++varv > 10) return cb(alla);
      fetch(location.pathname + url, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
        if (!html) return cb(alla);
        var doc = new DOMParser().parseFromString(html, 'text/html');
        lasKort(doc).forEach(function (p) { if (!sedda[p.slug]) { sedda[p.slug] = 1; alla.push(p); } });
        var n = doc.querySelector('.w-pagination-next');
        url = n ? n.getAttribute('href') : '';
        steg();
      })['catch'](function () { cb(alla); });
    })();
  }

  /* ── Tillstånd (speglas i adressen) ── */
  var S = { q: '', kat: '', flode: '', flik: 'alla', bara: {}, sort: 'utvalda', visa: PER_SIDA };
  function lasAdress() {
    var u = new URLSearchParams(location.search);
    S.q = u.get('q') || ''; S.kat = u.get('kat') || ''; S.flode = u.get('flode') || '';
    S.flik = u.get('flik') === 'mina' ? 'mina' : 'alla';
    S.sort = SORT.some(function (s) { return s.k === u.get('sort'); }) ? u.get('sort') : 'utvalda';
    S.bara = {}; (u.get('bara') || '').split(',').filter(Boolean).forEach(function (k) { S.bara[k] = true; });
  }
  function skrivAdress() {
    var u = new URLSearchParams();
    if (S.q) u.set('q', S.q); if (S.kat) u.set('kat', S.kat); if (S.flode) u.set('flode', S.flode);
    if (S.flik === 'mina') u.set('flik', 'mina'); if (S.sort !== 'utvalda') u.set('sort', S.sort);
    var b = Object.keys(S.bara).filter(function (k) { return S.bara[k]; }); if (b.length) u.set('bara', b.join(','));
    var s = u.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (e) {}
  }

  var P = [], FLODEN = [], KATS = [], root, el = {};

  function bygg(alla) {
    P = alla.map(function (p, i) {
      p.ordning = i;
      p.falt = F.parse(p.prompt, { kod: p.typ === 'kod' }).length;
      var m = /fr[åa]n steg (\d+)/i.exec(p.prompt);
      p.byggerPa = p.steg > 1 && m ? +m[1] : 0;
      p.hay = (p.titel + ' ' + p.desc + ' ' + p.kat + ' ' + p.mall + ' ' + p.prompt).toLowerCase();
      return p;
    });
    var fm = {};
    P.forEach(function (p) {
      if (!p.mallslug || !p.steg) return;
      (fm[p.mallslug] = fm[p.mallslug] || { slug: p.mallslug, namn: p.mall, steg: [] }).steg.push(p);
    });
    FLODEN = Object.keys(fm).map(function (k) { var f = fm[k]; f.steg.sort(function (a, b) { return a.steg - b.steg; }); return f; })
      .filter(function (f) { return f.steg.length >= 2; })
      .sort(function (a, b) { return b.steg.length - a.steg.length || a.namn.localeCompare(b.namn, 'sv'); });
    var km = {};
    P.forEach(function (p) { if (p.kat) km[p.kat] = (km[p.kat] || 0) + 1; });
    KATS = Object.keys(km).sort(function (a, b) { return km[b] - km[a]; });
  }

  function mina() {
    var s = {};
    F.favoriter().forEach(function (f) { s[f.slug] = 1; });
    F.lasSenaste().forEach(function (x) { if (x.slug) s[x.slug] = 1; });
    return s;
  }

  function urval() {
    if (S.flode) {
      var f = FLODEN.filter(function (x) { return x.slug === S.flode; })[0];
      return f ? f.steg.slice() : [];
    }
    var l = P.slice(), m = S.flik === 'mina' ? mina() : null;
    if (m) l = l.filter(function (p) { return m[p.slug]; });
    if (S.kat) l = l.filter(function (p) { return p.kat === S.kat; });
    var ord = S.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (ord.length) l = l.filter(function (p) { return ord.every(function (o) { return p.hay.indexOf(o) !== -1; }); });
    if (S.bara.flode) l = l.filter(function (p) { return !!p.mallslug && p.steg; });
    if (S.bara.nyb) l = l.filter(function (p) { return p.niva === 'Beginner'; });
    if (S.bara.bild) l = l.filter(function (p) { return p.typ === 'bild' || p.typ === 'video'; });
    if (S.bara.kod) l = l.filter(function (p) { return p.typ === 'kod'; });
    if (S.sort === 'ny') l.sort(function (a, b) { return b.datum - a.datum; });
    else if (S.sort === 'az') l.sort(function (a, b) { return a.titel.localeCompare(b.titel, 'sv'); });
    else if (ord.length) {
      /* Sök: träff i titeln först */
      l.sort(function (a, b) {
        var ta = ord.every(function (o) { return a.titel.toLowerCase().indexOf(o) !== -1; }) ? 0 : 1;
        var tb = ord.every(function (o) { return b.titel.toLowerCase().indexOf(o) !== -1; }) ? 0 : 1;
        return ta - tb || a.ordning - b.ordning;
      });
    }
    return l;
  }

  /* ── Ritning ── */
  function kortHtml(p, iFlode) {
    var fav = F.arFavorit(p.slug), n = p.falt;
    var e = '';
    if (iFlode) e += '<span class="pb-stegnr" aria-label="Steg ' + p.steg + '">' + p.steg + '</span>';
    if (p.kat) e += '<span class="pb-e">' + esc(p.kat) + '</span>';
    if (!iFlode && p.mallslug && p.steg) e += '<span class="pb-e is-flode">Steg ' + p.steg + ' · ' + esc(kortNamn(p.mall)) + '</span>';
    if (n) e += '<span class="pb-e is-falt">' + n + ' fält att fylla i</span>';
    if (p.byggerPa) e += '<span class="pb-e is-kant">Bygger på steg ' + p.byggerPa + '</span>';
    if (p.niva === 'Beginner') e += '<span class="pb-e is-kant">Nybörjarvänlig</span>';
    if (TYPER[p.typ] && TYPER[p.typ] !== 'Text') e += '<span class="pb-e is-kant">' + TYPER[p.typ] + '</span>';
    var href = '/ai-prompter/' + encodeURIComponent(p.slug);
    return '<article class="pb-kort" data-slug="' + esc(p.slug) + '">' +
      '<div class="pb-etiketter">' + e + '</div>' +
      '<h3 class="pb-titel"><a href="' + href + '" data-pb="oppna">' + esc(p.titel) + '</a></h3>' +
      (p.desc ? '<p class="pb-desc">' + esc(p.desc) + '</p>' : '') +
      '<div class="pb-utdrag">' + esc(p.prompt.slice(0, 320)) + '</div>' +
      '<div class="pb-knappar">' +
        (n ? '<a class="pb-prim" href="' + href + '" data-pb="fyll">Fyll i och kopiera →</a><button type="button" class="pb-sek" data-pb="kopiera">Kopiera</button>'
           : '<button type="button" class="pb-prim" data-pb="kopiera">Kopiera prompt</button><a class="pb-lank" href="' + href + '" data-pb="oppna">Öppna →</a>') +
        '<span class="pb-luft"></span>' +
        '<button type="button" class="pb-ikon" data-pb="fav" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter') + '" title="' + (fav ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter') + '">' + stjarna(fav) + '</button>' +
        '<button type="button" class="pb-ikon" data-pb="lank" aria-label="Kopiera länk till prompten" title="Kopiera länk till prompten">' + IKON_LANK + '</button>' +
      '</div></article>';
  }

  function ritaFloden() {
    var visaAlla = el.flodenHost.getAttribute('data-alla') === '1';
    var mobil = window.matchMedia && matchMedia('(max-width:767px)').matches;
    var lista = visaAlla || mobil ? FLODEN : FLODEN.slice(0, 6);
    el.flodenHost.innerHTML = lista.map(function (f) {
      var steg = f.steg.slice(0, 4).map(function (p) { return '<li><i>' + p.steg + '</i>' + esc(p.stegrubrik || p.titel) + '</li>'; }).join('') +
        (f.steg.length > 4 ? '<li class="pb-fler">+ ' + (f.steg.length - 4) + ' steg till</li>' : '');
      return '<button type="button" class="pb-flode" data-flode="' + esc(f.slug) + '" aria-pressed="' + (S.flode === f.slug) + '">' +
        '<small>Flöde · ' + f.steg.length + ' steg</small><strong>' + esc(kortNamn(f.namn)) + '</strong><ol>' + steg + '</ol></button>';
    }).join('');
    el.flodenAlla.hidden = FLODEN.length <= 6 || mobil;
    el.flodenAlla.textContent = visaAlla ? 'Visa färre' : 'Visa alla ' + FLODEN.length + ' flöden';
    var filtrerat = S.q || S.kat || S.flik === 'mina' || Object.keys(S.bara).some(function (k) { return S.bara[k]; });
    el.flodenSek.hidden = !FLODEN.length || (filtrerat && !S.flode);
  }

  function chip(text, tryckt, data) { return '<button type="button" class="pb-chip" ' + data + ' aria-pressed="' + !!tryckt + '">' + esc(text) + '</button>'; }

  function ritaVerktyg() {
    var antalMina = Object.keys(mina()).filter(function (s) { return P.some(function (p) { return p.slug === s; }); }).length;
    el.flikar.innerHTML =
      '<button type="button" class="pb-flik" role="tab" data-flik="alla" aria-selected="' + (S.flik === 'alla') + '">Alla prompter</button>' +
      '<button type="button" class="pb-flik" role="tab" data-flik="mina" aria-selected="' + (S.flik === 'mina') + '">Mina prompter (' + antalMina + ')</button>';
    el.sort.innerHTML = '<span class="pb-radlabel">Sortera</span>' + SORT.map(function (s) { return '<button type="button" class="pb-sort" data-sort="' + s.k + '" aria-pressed="' + (S.sort === s.k) + '">' + s.text + '</button>'; }).join('');
    el.kat.innerHTML = chip('Alla kategorier', !S.kat, 'data-kat=""') + KATS.map(function (k) { return chip(k, S.kat === k, 'data-kat="' + esc(k) + '"'); }).join('');
    el.bara.innerHTML = '<span class="pb-radlabel">Visa bara</span>' + BARA.map(function (b) { return chip(b.text, S.bara[b.k], 'data-bara="' + b.k + '"'); }).join('');
    el.mal.innerHTML = MAL.map(function (m, i) {
      var tr = m.q ? S.q === m.q : !!S.bara[m.bara] && !S.q;
      return chip(m.text, tr, 'data-mal="' + i + '"');
    }).join('');
  }

  function ritaLista() {
    var l = urval(), f = S.flode ? FLODEN.filter(function (x) { return x.slug === S.flode; })[0] : null;
    el.verktyg.hidden = !!f;
    el.banner.hidden = !f;
    if (f) {
      el.banner.innerHTML = '<div><small>Flöde · ' + f.steg.length + ' steg i ordning</small><strong>' + esc(kortNamn(f.namn)) + '</strong>' +
        '<p>Börja med steg 1. Steg som bygger på ett tidigare steg har ett fält där du klistrar in svaret.</p></div>' +
        '<a href="/ai-mallar/' + encodeURIComponent(f.slug) + '">Läs hela mallen →</a><button type="button" data-pb="rensaflode">Visa alla prompter ×</button>';
    }
    el.antal.textContent = f ? '' : S.flik === 'mina'
      ? 'Mina prompter: ' + l.length + ' (★ sparade och senast kopierade, i den här webbläsaren)'
      : 'Visar ' + l.length + ' av ' + P.length + ' prompter' + (S.kat ? ' i ' + S.kat : '') + (S.q ? ' för "' + S.q + '"' : '');
    el.antal.hidden = !!f;
    if (!l.length) {
      var minaTomt = S.flik === 'mina' && !S.q && !S.kat;
      el.grid.innerHTML = '<div class="pb-tomt"><strong>' + (minaTomt ? 'Du har inga sparade prompter än' : 'Inga prompter matchar') + '</strong><p>' +
        (minaTomt ? 'Tryck på ★ på en prompt för att spara den här. Prompter du kopierar hamnar också här.' : 'Testa ett annat ord, ta bort ett filter eller beskriv uppgiften med egna ord i Promptgeneratorn.') +
        '</p><a class="pb-lank" href="/promptgeneratorn">Bygg en egen i Promptgeneratorn →</a></div>';
      el.mer.hidden = true;
      return;
    }
    var visa = f ? l : l.slice(0, S.visa);
    el.grid.innerHTML = visa.map(function (p) { return kortHtml(p, !!f); }).join('');
    el.mer.hidden = f || l.length <= S.visa;
    el.mer.textContent = 'Visa fler (' + (l.length - S.visa) + ' kvar)';
  }

  function ritaAllt() { ritaVerktyg(); ritaFloden(); ritaLista(); skrivAdress(); }

  var toastTimer;
  function toast(titel, text, lankar) {
    el.toast.innerHTML = '<div><strong>' + esc(titel) + '</strong>' + (text ? '<span>' + esc(text) + '</span>' : '') + '</div>' +
      (lankar || []).map(function (l) { return '<a href="' + esc(l.href) + '"' + (/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l.namn) + (/^https?:/.test(l.href) ? ' ↗' : ' →') + '</a>'; }).join('');
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 4500);
  }

  function skelett() {
    root = document.createElement('section');
    root.className = 'pb-app';
    root.innerHTML =
      '<div class="pb-wrap">' +
        '<div class="pb-hero">' +
          '<p class="pb-etikett"><span data-pb-antal>300+</span> prompter på svenska · gratis</p>' +
          '<h1 class="pb-h1">Promptbiblioteket</h1>' +
          '<p class="pb-ingress">Hitta en prompt, fyll i det som är ditt och kopiera. Funkar i ChatGPT, Claude, Gemini och Copilot.</p>' +
        '</div>' +
        '<div class="pb-sok"><label for="pb-sok" style="position:absolute;left:-9999px">Sök bland prompterna</label>' +
          '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="#3d4a5c" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="#3d4a5c" stroke-width="2" stroke-linecap="round"/></svg>' +
          '<input id="pb-sok" type="search" autocomplete="off" placeholder="Sök: mejl, offert, recension, LinkedIn …"></div>' +
        '<div class="pb-malwrap"><span class="pb-radlabel">Vad vill du göra?</span><div class="pb-rad pb-mal" data-el="mal"></div></div>' +
        '<section class="pb-sek-floden" data-el="flodenSek" aria-labelledby="pb-flodrubrik" style="display:flex;flex-direction:column;gap:14px">' +
          '<div class="pb-h2rad"><h2 class="pb-h2" id="pb-flodrubrik">Färdiga flöden, steg för steg</h2><a class="pb-lank" href="/ai-mallar">Alla mallar →</a></div>' +
          '<p class="pb-text">Prompter som hänger ihop. Svaret från ett steg tar du med till nästa, och dina uppgifter fylls i automatiskt.</p>' +
          '<div class="pb-floden" data-el="flodenHost"></div>' +
          '<button type="button" class="pb-lank" data-el="flodenAlla" style="align-self:flex-start"></button>' +
        '</section>' +
        '<section aria-label="Prompter" style="display:flex;flex-direction:column;gap:18px">' +
          '<div class="pb-flodebanner" data-el="banner" hidden></div>' +
          '<div class="pb-verktyg" data-el="verktyg">' +
            '<div class="pb-verktyg-topp"><div class="pb-flikar" role="tablist" aria-label="Visa" data-el="flikar"></div><div class="pb-rad" data-el="sort"></div></div>' +
            '<div class="pb-rad pb-kat" data-el="kat" aria-label="Kategorier"></div>' +
            '<div class="pb-rad pb-bara" data-el="bara"></div>' +
          '</div>' +
          '<p class="pb-antal" aria-live="polite" data-el="antal"></p>' +
          '<div class="pb-grid" data-el="grid"><p class="pb-laddar">Hämtar alla prompter …</p></div>' +
          '<button type="button" class="pb-mer" data-el="mer" hidden></button>' +
        '</section>' +
        '<section class="pb-botten">' +
          '<div class="pb-apan"><strong>Apan tycker</strong><blockquote>Börja aldrig med en tom ruta. Leta upp prompten som ligger närmast, fyll i dina riktiga uppgifter och låt AI:n göra grovjobbet. Ju mer konkret du är i fälten, desto mindre behöver du rätta i svaret.</blockquote></div>' +
          '<div class="pb-gen"><strong>Hittar du inte rätt?</strong><p>Beskriv uppgiften med egna ord, så bygger Promptgeneratorn en prompt åt dig.</p><a href="/promptgeneratorn">Öppna Promptgeneratorn →</a></div>' +
        '</section>' +
      '</div>' +
      '<div class="pb-toast" role="status" data-el="toast" hidden></div>';
    [].forEach.call(root.querySelectorAll('[data-el]'), function (x) { el[x.getAttribute('data-el')] = x; });
    el.sok = root.querySelector('#pb-sok');
    var host = document.querySelector('.section_blog');
    host.parentNode.insertBefore(root, host);
  }

  function handelser() {
    var sokTimer;
    el.sok.addEventListener('input', function () {
      S.q = el.sok.value.trim(); S.flode = ''; S.visa = PER_SIDA;
      clearTimeout(sokTimer);
      sokTimer = setTimeout(function () { ritaVerktyg(); ritaFloden(); ritaLista(); skrivAdress(); if (S.q) track('pb_sok', { q: S.q, traffar: urval().length }); }, 180);
    });
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button, a');
      if (!t || !root.contains(t)) return;
      var d = t.dataset;
      if (d.mal !== undefined) {
        var m = MAL[+d.mal];
        if (m.q) { S.q = S.q === m.q ? '' : m.q; el.sok.value = S.q; }
        else { var pa = !S.bara[m.bara]; S.bara = {}; if (pa) S.bara[m.bara] = true; S.q = ''; el.sok.value = ''; }
        S.flode = ''; S.flik = 'alla'; S.visa = PER_SIDA; ritaAllt(); track('pb_filter', { typ: 'mal', varde: m.text }); return;
      }
      if (d.flode !== undefined) {
        S.flode = S.flode === d.flode ? '' : d.flode; S.visa = PER_SIDA; ritaAllt();
        if (S.flode) { track('pb_flode', { mall: S.flode }); el.banner.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        return;
      }
      if (t === el.flodenAlla) { el.flodenHost.setAttribute('data-alla', el.flodenHost.getAttribute('data-alla') === '1' ? '0' : '1'); ritaFloden(); return; }
      if (d.flik) { S.flik = d.flik; S.visa = PER_SIDA; ritaAllt(); track('pb_filter', { typ: 'flik', varde: d.flik }); return; }
      if (d.sort) { S.sort = d.sort; ritaAllt(); return; }
      if (d.kat !== undefined) { S.kat = d.kat; S.visa = PER_SIDA; ritaAllt(); track('pb_filter', { typ: 'kategori', varde: d.kat }); return; }
      if (d.bara) { S.bara[d.bara] = !S.bara[d.bara]; S.visa = PER_SIDA; ritaAllt(); track('pb_filter', { typ: 'bara', varde: d.bara }); return; }
      if (t === el.mer) { S.visa += PER_SIDA; ritaLista(); return; }
      var kort = t.closest('.pb-kort'), p = kort && P.filter(function (x) { return x.slug === kort.getAttribute('data-slug'); })[0];
      if (d.pb === 'rensaflode') { S.flode = ''; ritaAllt(); return; }
      if (!p) return;
      if (d.pb === 'oppna' || d.pb === 'fyll') { track('pb_oppna', { prompt: p.slug, via: d.pb }); return; }
      if (d.pb === 'kopiera') {
        tillKlipp(p.prompt);
        F.sparaSenaste(p.prompt, p.typ, p.titel, p.slug);
        var q = encodeURIComponent(p.prompt);
        if (p.falt) toast('Kopierad med hakparenteser', 'Byt ut [DET SOM STÅR SÅ HÄR] innan du skickar, eller fyll i fälten på promptsidan.', [{ namn: 'Fyll i på promptsidan', href: '/ai-prompter/' + p.slug }]);
        else toast('Kopierad! Klistra in i din AI', p.titel, [{ namn: 'ChatGPT', href: 'https://chatgpt.com/?q=' + q }, { namn: 'Claude', href: 'https://claude.ai/new?q=' + q }]);
        track('pb_kopiera_ra', { prompt: p.slug, falt: p.falt });
        if (S.flik === 'mina') ritaVerktyg();
        return;
      }
      if (d.pb === 'fav') {
        var nu = F.vaxlaFavorit(p.slug, p.titel);
        t.setAttribute('aria-pressed', nu); t.innerHTML = stjarna(nu);
        t.setAttribute('aria-label', nu ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter'); t.title = t.getAttribute('aria-label');
        toast(nu ? 'Sparad i Mina prompter' : 'Borttagen från Mina prompter', nu ? 'Du hittar den under fliken Mina prompter, i den här webbläsaren.' : '');
        ritaVerktyg();
        if (S.flik === 'mina' && !nu) ritaLista();
        track('pb_fav', { prompt: p.slug, sparad: nu });
        return;
      }
      if (d.pb === 'lank') {
        var url = location.origin + '/ai-prompter/' + p.slug;
        tillKlipp(url, function () { toast('Länken är kopierad', url); });
        track('pb_lank', { prompt: p.slug });
      }
    });
  }

  function init() {
    F = window.AimFyll;
    var host = document.querySelector('.section_blog');
    if (!F || !host) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    lasAdress();
    skelett();
    el.sok.value = S.q;
    document.body.classList.add('pb-on');
    hamtaAlla(function (alla) {
      bygg(alla);
      root.querySelector('[data-pb-antal]').textContent = P.length;
      handelser();
      ritaAllt();
      track('pb_visa', { prompter: P.length, floden: FLODEN.length });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
