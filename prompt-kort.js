/* ============================================================
   AIMonkey — prompt-kort.js
   Gör om promptlistan i komponenten Section-prompter (section#prompts,
   används på pillar- och temasidorna /ai-for-…) till samma kort som på
   startsidan: tre kolumner, etiketter, beskrivning, "Fyll i och kopiera",
   Kopiera och ★.

   CMS-listan ligger kvar i HTML:en (för Google och Finsweet) och döljs
   först när korten är klara. Beskrivning, kategori, slug och prompttext
   hämtas från /prompt-data (samma källa som startsidan). Går något fel
   ligger den gamla listan kvar.

   Kräver pg-fyll.js (window.AimFyll) för ★, fältantal och "senast kopierade".
   Mätning: pb_pillar_oppna, pb_pillar_kopiera, pb_pillar_fav (GTM-triggern ^pb_).
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimPk) return;

  var CSS = [
    '.pk-grid{width:100%;align-self:stretch;margin-bottom:8px;text-align:left;grid-template-columns:repeat(3,minmax(0,1fr))!important}',
    '@media (max-width:991px){.pk-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
    '.pk-grid .st-kort{height:100%}',
    '.pk-grid .st-prim{white-space:nowrap;padding:0 12px;min-width:0}',
    '.pk-dold{display:none!important}',
    '.pk-grid .st-sek{flex:none;min-height:44px;padding:0 14px;border-radius:10px;border:1.5px solid #cfd6e0;background:#fff;color:#0b1f3b;font:inherit;font-size:14px;font-weight:600;cursor:pointer}',
    '.pk-grid .st-sek:hover{border-color:#00a085}',
    '.pk-grid .st-ikon{flex:none;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1.5px solid #cfd6e0;background:#fff;cursor:pointer;padding:0}',
    '.pk-grid .st-ikon[aria-pressed="true"]{border-color:#e0b400;background:#fff3c4}',
    '.pk-grid .st-prim:focus-visible,.pk-grid .st-sek:focus-visible,.pk-grid .st-ikon:focus-visible,.pk-grid .st-kort-lank:focus-visible{outline:3px solid #4cd9c1;outline-offset:2px}',
    '.pk-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;max-width:min(560px,calc(100vw - 32px));padding:14px 18px;border-radius:14px;background:#0b1f3b;color:#fff;box-shadow:0 12px 32px -8px rgba(0,0,0,.4);font-size:15px}',
    '.pk-toast[hidden]{display:none}',
    '.pk-toast div{display:flex;flex-direction:column;gap:2px;flex:1 1 220px}',
    '.pk-toast span{color:#ced2d7;font-size:14px}',
    '.pk-toast a{color:#ffd23f;font-weight:600;text-decoration:none;white-space:nowrap}',
    '@media (max-width:767px){',
    '.pk-grid{grid-template-columns:1fr!important}',
    '.pk-grid .st-kort{padding:18px}',
    '.pk-grid .st-knappar{flex-wrap:wrap}',
    '.pk-grid .st-prim{flex:1 1 100%}',
    '.pk-grid .st-sek{flex:1 1 auto}',
    '}'
  ].join('');

  var F, DATA = null, laddar = null, toastEl, toastTimer, SIDA = location.pathname.replace(/\/$/, '');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(event, extra) { window.dataLayer = window.dataLayer || []; var o = { event: event, sida: SIDA }; for (var k in extra) o[k] = extra[k]; window.dataLayer.push(o); }
  function stjarna(fylld) { return '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="' + (fylld ? '#ffd23f' : 'none') + '" stroke="#0b1f3b" stroke-width="1.6" stroke-linejoin="round"/></svg>'; }
  function kortKat(k) { return String(k || '').split(/\s+(?:och|&)\s+/)[0]; }
  function nyckel(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

  function tillKlipp(text, ok, fel) {
    function fallback() {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); var r = document.execCommand('copy'); document.body.removeChild(ta); r ? ok() : fel();
      } catch (e) { fel(); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }
  function toast(titel, text, lankar) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'pk-toast'; toastEl.setAttribute('role', 'status'); toastEl.hidden = true; document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<div><strong>' + esc(titel) + '</strong>' + (text ? '<span>' + esc(text) + '</span>' : '') + '</div>' +
      (lankar || []).map(function (l) { var ext = /^https?:/.test(l.href); return '<a href="' + esc(l.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l.namn) + (ext ? ' ↗' : ' →') + '</a>'; }).join('');
    toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4500);
  }

  function hamtaData() {
    if (DATA) return Promise.resolve(DATA);
    if (laddar) return laddar;
    laddar = fetch('/prompt-data', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html'), d = {};
      [].forEach.call(doc.querySelectorAll('.pg-data-item'), function (it) {
        function t(c) { var e = it.querySelector(c); return e ? e.textContent : ''; }
        var namn = t('.pg-d-name').trim(), slug = t('.pg-d-slug').trim();
        if (!namn || !slug) return;
        d[nyckel(namn)] = { namn: namn, slug: slug, desc: t('.pg-d-desc').trim(), kat: t('.pg-d-cat').trim(), prompt: t('.pg-d-prompt').replace(/\r\n?/g, '\n').trim() };
      });
      DATA = d; return d;
    })['catch'](function () { laddar = null; return {}; });
    return laddar;
  }

  function kortHtml(p) {
    var falt = F && F.parse ? F.parse(p.prompt, {}).length : 0;
    var fav = F && F.arFavorit ? F.arFavorit(p.slug) : false;
    var url = '/ai-prompter/' + encodeURIComponent(p.slug);
    return '<article class="st-kort" data-st-slug="' + esc(p.slug) + '">' +
      '<div class="st-etiketter">' +
        (p.kat ? '<span class="st-e">' + esc(kortKat(p.kat)) + '</span>' : '') +
        (falt ? '<span class="st-e st-e-falt">' + falt + ' fält att fylla i</span>' : '') +
      '</div>' +
      '<h3 class="st-kort-titel"><a class="st-kort-lank" href="' + url + '">' + esc(p.namn) + '</a></h3>' +
      (p.desc ? '<p class="st-kort-desc">' + esc(p.desc) + '</p>' : '') +
      '<div class="st-knappar">' +
        '<a class="st-prim" href="' + url + '">Fyll i och kopiera →</a>' +
        '<button type="button" class="st-sek" data-pk="kopiera">Kopiera</button>' +
        (F && F.vaxlaFavorit ? '<button type="button" class="st-ikon" data-pk="fav" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter') + '" title="' + (fav ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter') + '">' + stjarna(fav) + '</button>' : '') +
      '</div>' +
    '</article>';
  }

  function bygg(sek, wrap, namnLista) {
    hamtaData().then(function (d) {
      var kort = [];
      namnLista.forEach(function (n) { var p = d[nyckel(n)]; if (p) kort.push(p); });
      if (!kort.length) return; /* behåll den gamla listan */
      var grid = document.createElement('div');
      grid.className = 'st-grid st-grid-kort pk-grid';
      grid.setAttribute('role', 'list');
      grid.innerHTML = kort.map(kortHtml).join('');
      [].forEach.call(grid.children, function (a) { a.setAttribute('role', 'listitem'); });
      wrap.parentNode.insertBefore(grid, wrap);
      wrap.classList.add('pk-dold');
      koppla(grid);
    });
  }

  function koppla(grid) {
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pk]'), k = e.target.closest('.st-kort');
      if (!k) return;
      var slug = k.getAttribute('data-st-slug'), titelEl = k.querySelector('.st-kort-lank'), titel = titelEl ? titelEl.textContent.trim() : slug;
      if (!b) { if (e.target.closest('a')) track('pb_pillar_oppna', { prompt: slug }); return; }
      if (b.getAttribute('data-pk') === 'fav') {
        var nu = F.vaxlaFavorit(slug, titel);
        b.setAttribute('aria-pressed', nu); b.innerHTML = stjarna(nu);
        b.setAttribute('aria-label', nu ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter'); b.title = b.getAttribute('aria-label');
        toast(nu ? 'Sparad i Mina prompter' : 'Borttagen från Mina prompter', nu ? 'Du hittar den under Mina prompter i promptbiblioteket.' : '', nu ? [{ namn: 'Mina prompter', href: '/promptbiblioteket?flik=mina' }] : null);
        track('pb_pillar_fav', { prompt: slug, sparad: nu });
        return;
      }
      var sida = '/ai-prompter/' + slug, p = null;
      for (var key in DATA) if (DATA[key].slug === slug) { p = DATA[key]; break; }
      if (!p) { location.href = sida; return; }
      var n = F && F.parse ? F.parse(p.prompt, {}).length : 1;
      tillKlipp(p.prompt, function () {
        if (F && F.sparaSenaste) F.sparaSenaste(p.prompt, '', titel, slug);
        b.textContent = 'Kopierad ✓'; setTimeout(function () { b.textContent = 'Kopiera'; }, 2000);
        var q = encodeURIComponent(p.prompt);
        if (n) toast('Kopierad med hakparenteser', 'Byt ut [DET SOM STÅR SÅ HÄR] innan du skickar, eller fyll i fälten på promptsidan.', [{ namn: 'Fyll i på promptsidan', href: sida }]);
        else toast('Kopierad! Klistra in i din AI', titel, [{ namn: 'ChatGPT', href: 'https://chatgpt.com/?q=' + q }, { namn: 'Claude', href: 'https://claude.ai/new?q=' + q }]);
        track('pb_pillar_kopiera', { prompt: slug, falt: n });
      }, function () { toast('Det gick inte att kopiera här', 'Öppna prompten och kopiera den därifrån.', [{ namn: 'Öppna prompten', href: sida }]); });
    });
  }

  function init() {
    var sek = document.querySelector('section#prompts');
    if (!sek) return;
    var wrap = sek.querySelector('.prompter-list-hidden');
    if (!wrap) return;
    var namnLista = [].slice.call(wrap.querySelectorAll('.w-dyn-item .article-title-prompt'))
      .map(function (h) { return h.textContent.trim(); }).filter(Boolean);
    if (!namnLista.length) return;
    window.__aimPk = true;
    F = window.AimFyll || null;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); bygg(sek, wrap, namnLista); }
      }, { rootMargin: '900px 0px' });
      io.observe(sek);
    } else bygg(sek, wrap, namnLista);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
