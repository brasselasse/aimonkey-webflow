/* ============================================================
   AIMonkey — startsida.js (nya startsidan, skiss 2026-10-16)
   Kräver pg-fyll.js (window.AimFyll) för ★ och "senast kopierade".

   Innehållet (hero-chips, promptkort, flöden, vägar, Apan) ligger som
   vanliga Webflow-element så att det syns för Google och går att
   redigera i Designern. Skriptet lägger till det som kräver JS:
   - sökrutan i heron (skickar till /promptbiblioteket?q=)
   - flikar över promptkorten (Populära, Företag, …)
   - Kopiera och ★ på korten (prompttexten hämtas från /prompt-data
     först när sektionen närmar sig skärmen)
   - svenska datum i artikellistorna
   - FAQ: visar 4 frågor + "Visa alla"
   Mätning: pb_start_* (fångas av GTM-triggern ^pb_).
   ============================================================ */
(function () {
  'use strict';
  var SIDOR = ['/startsida-ny', ''];
  var vag = location.pathname.replace(/\/$/, '');
  if (SIDOR.indexOf(vag) === -1 || window.__aimStart) return;
  if (!document.querySelector('[data-st="prompter"]')) return;
  window.__aimStart = true;

  var CSS = [
    '.st-sok{display:flex;gap:8px;background:#fff;border-radius:16px;padding:8px;box-shadow:0 10px 30px -12px rgba(11,31,59,.25);max-width:620px;margin:0}',
    '.st-sok input{flex:1 1 auto;min-width:0;border:0;outline:none;font:inherit;font-size:17px;padding:12px 14px;background:transparent;color:#0b1f3b}',
    '.st-sok input::placeholder{color:#6b7a90}',
    '.st-sok button{flex:none;border:0;border-radius:12px;padding:0 22px;min-height:48px;background:#00a085;color:#fff;font:inherit;font-size:16px;font-weight:600;cursor:pointer}',
    '.st-sok button:hover{background:#008a73}',
    '.st-sok:focus-within{box-shadow:0 0 0 3px #4cd9c1,0 10px 30px -12px rgba(11,31,59,.25)}',
    '.st-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.st-flikar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}',
    '.st-flik{font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:0 16px;border-radius:10px;border:0;cursor:pointer;background:#e7ebf1;color:#0b1f3b}',
    '.st-flik[aria-selected="true"]{background:#0b1f3b;color:#fff}',
    '.st-pop-chip:focus-visible,.st-pg-lank:focus-visible,.st-flik:focus-visible,.st-sek:focus-visible,.st-ikon:focus-visible,.st-chip:focus-visible,.st-prim:focus-visible{outline:3px solid #4cd9c1;outline-offset:2px}',
    '.st-kort[hidden]{display:none!important}',
    '.st-sek{flex:none;min-height:44px;padding:0 14px;border-radius:10px;border:1.5px solid #cfd6e0;background:#fff;color:#0b1f3b;font:inherit;font-size:14px;font-weight:600;cursor:pointer}',
    '.st-sek:hover{border-color:#00a085}',
    '.st-ikon{flex:none;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1.5px solid #cfd6e0;background:#fff;cursor:pointer;padding:0}',
    '.st-ikon[aria-pressed="true"]{border-color:#e0b400;background:#fff3c4}',
    '.st-apan .apan-icon{width:72px!important;height:72px!important;max-width:none;flex:none;border-radius:16px;object-fit:cover}',
    '.st-lar-gammal{display:none!important}',
    '.st-lar .st-topp{align-items:center}',
    '.st-lar-flikar{display:flex;gap:6px;padding:4px;border-radius:12px;background:#e7ebf1}',
    '.st-lar-flik{font:inherit;font-size:15px;font-weight:600;min-height:40px;padding:0 16px;border-radius:9px;border:0;cursor:pointer;background:transparent;color:#0b1f3b}',
    '.st-lar-flik[aria-selected="true"]{background:#fff;box-shadow:0 1px 3px rgba(11,31,59,.12)}',
    '.st-lar-flik:focus-visible,.st-art:focus-visible{outline:3px solid #4cd9c1;outline-offset:2px}',
    '.st-grid-art{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}',
    '.st-art{display:flex;flex-direction:column;overflow:hidden;border-radius:20px;border:1px solid #e3e7ee;background:#fff;color:#0b1f3b;text-decoration:none;transition:border-color .15s,transform .15s}',
    '.st-art:hover{border-color:#00c9a7;transform:translateY(-2px)}',
    '.st-art-bild{aspect-ratio:16/9;background:#dfe9f2;overflow:hidden}',
    '.st-art-bild img{width:100%;height:100%;object-fit:cover;display:block}',
    '.st-art-text{display:flex;flex-direction:column;gap:8px;padding:18px 20px 22px}',
    '.st-art-etikett{font-size:12px;font-weight:600;color:#005042}',
    '.st-art-titel{font-size:19px;line-height:1.25;font-weight:700}',
    '.st-lar-alla{display:inline-block;margin-top:16px}',
    '.st-faq-dold{display:none!important}',
    '.st-faq-mer{margin-top:16px;font-size:15px;color:#4a5a70}',
    '.st-faq-mer button{font:inherit;font-weight:600;color:#005042;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer}',
    '.st-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;max-width:min(560px,calc(100vw - 32px));padding:14px 18px;border-radius:14px;background:#0b1f3b;color:#fff;box-shadow:0 12px 32px -8px rgba(0,0,0,.4);font-size:15px}',
    '.st-toast[hidden]{display:none}',
    '.st-toast div{display:flex;flex-direction:column;gap:2px;flex:1 1 220px}',
    '.st-toast span{color:#ced2d7;font-size:14px}',
    '.st-toast a{color:#ffd23f;font-weight:600;text-decoration:none;white-space:nowrap}',
    '.st-grid-vagar{grid-template-columns:repeat(3,minmax(0,1fr))!important}',
    '@media (min-width:992px){.st-stats{max-width:470px}}',
    '@media (max-width:767px){',
    '.st-knappar{flex-wrap:wrap}',
    '.st-prim{flex:1 1 100%}',
    '.st-sek{flex:1 1 auto}',
    '.st-sektion{padding:44px 0 8px}',
    '.st-wrap{padding:0 16px}',
    '.st-h2{font-size:28px!important}',
    '.st-ingress{font-size:16px}',
    '.st-grid-kort,.st-grid-floden{grid-template-columns:1fr}',
    '.st-grid-vagar{grid-template-columns:1fr 1fr!important;gap:12px}',
    '.st-vag{padding:16px}',
    '.st-vag-namn{font-size:17px}',
    '.st-kort,.st-flode{padding:18px}',
    '.st-flikar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px 18px;padding:0 16px 2px}',
    '.st-flikar::-webkit-scrollbar{display:none}',
    '.st-flik{flex:none}',
    '.st-chips{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px 2px}',
    '.st-chips::-webkit-scrollbar{display:none}',
    '.st-chip{flex:none}',
    '.st-pop{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px 2px}',
    '.st-pop::-webkit-scrollbar{display:none}',
    '.st-pop-chip,.st-pop-rubrik{flex:none}',
    '.st-sok input{font-size:16px;padding:10px}',
    '.st-sok button{padding:0 16px}',
    '.st-apan{flex-direction:column;padding:22px}',
    '.st-grid-art{grid-template-columns:1fr}',
    '.st-lar .st-topp{align-items:flex-start}',
    '.st-hjalp{padding:22px}',
    '.st-stats{gap:8px 20px}',
    '.st-stat-tal{font-size:22px!important}',
    '}'
  ].join('');

  var FLIKAR = [
    { text: 'Populära', k: 'Populära' },
    { text: 'Företag', k: 'Företag' },
    { text: 'Marknadsföring', k: 'Marknadsföring' },
    { text: 'Bild och video', k: 'Bild' },
    { text: 'Plugg', k: 'Plugg' }
  ];
  var KORT = { jan: 'jan', feb: 'feb', mar: 'mars', apr: 'apr', may: 'maj', jun: 'juni', jul: 'juli', aug: 'aug', sep: 'sep', oct: 'okt', nov: 'nov', dec: 'dec' };
  var MAN = { january: 'jan', february: 'feb', march: 'mars', april: 'apr', may: 'maj', june: 'juni', july: 'juli', august: 'aug', september: 'sep', october: 'okt', november: 'nov', december: 'dec' };

  var F, DATA = null, laddar = null, toastEl, toastTimer;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(event, extra) { window.dataLayer = window.dataLayer || []; var o = { event: event }; for (var k in extra) o[k] = extra[k]; window.dataLayer.push(o); }
  function stjarna(fylld) { return '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="' + (fylld ? '#ffd23f' : 'none') + '" stroke="#0b1f3b" stroke-width="1.6" stroke-linejoin="round"/></svg>'; }
  function tillKlipp(text, ok, fel) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); var lyckades = false;
      try { lyckades = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); (lyckades ? ok : fel)();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }
  function toast(titel, text, lankar) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'st-toast'; toastEl.setAttribute('role', 'status'); toastEl.hidden = true; document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<div><strong>' + esc(titel) + '</strong>' + (text ? '<span>' + esc(text) + '</span>' : '') + '</div>' +
      (lankar || []).map(function (l) { var ext = /^https?:/.test(l.href); return '<a href="' + esc(l.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l.namn) + (ext ? ' ↗' : ' →') + '</a>'; }).join('');
    toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4500);
  }

  /* ── Prompttexter från /prompt-data ── */
  function hamtaData() {
    if (DATA) return Promise.resolve(DATA);
    if (laddar) return laddar;
    laddar = fetch('/prompt-data', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
      var doc = new DOMParser().parseFromString(html || '', 'text/html'), d = {};
      [].forEach.call(doc.querySelectorAll('.pg-data-item'), function (it) {
        var s = it.querySelector('.pg-d-slug'), p = it.querySelector('.pg-d-prompt'), n = it.querySelector('.pg-d-name');
        if (s && p) d[s.textContent.trim()] = { prompt: p.textContent.replace(/\r\n?/g, '\n').trim(), namn: n ? n.textContent.trim() : '' };
      });
      DATA = d; uppdateraFalt(); return d;
    })['catch'](function () { laddar = null; return {}; });
    return laddar;
  }
  function uppdateraFalt() {
    if (!DATA || !F || !F.parse) return;
    [].forEach.call(document.querySelectorAll('.st-kort[data-st-slug]'), function (k) {
      var p = DATA[k.getAttribute('data-st-slug')], e = k.querySelector('.st-e-falt');
      if (!p || !e) return;
      var n = F.parse(p.prompt, {}).length;
      if (n) e.textContent = n + ' fält att fylla i'; else e.parentNode.removeChild(e);
    });
  }

  /* ── Sök i heron ── */
  function sok() {
    var host = document.querySelector('[data-st="sok"]');
    if (!host) return;
    host.innerHTML = '<form class="st-sok" role="search" action="/promptbiblioteket" method="get">' +
      '<label class="st-sr" for="st-sok">Sök bland prompterna</label>' +
      '<input id="st-sok" name="q" type="search" autocomplete="off" placeholder="Vad vill du göra? T.ex. svara på en recension">' +
      '<button type="submit">Sök</button></form>';
    host.querySelector('form').addEventListener('submit', function (e) {
      var q = this.q.value.trim();
      if (!q) { e.preventDefault(); location.href = '/promptbiblioteket'; return; }
      track('pb_start_sok', { q: q.slice(0, 100) });
    });
    [].forEach.call(document.querySelectorAll('.st-chip,.st-pop-chip'), function (a) {
      a.addEventListener('click', function () { track('pb_start_mal', { varde: a.textContent.trim() }); });
    });
  }

  /* ── Promptkort: flikar, Kopiera, ★ ── */
  function kort() {
    var sek = document.querySelector('[data-st="prompter"]');
    var host = sek.querySelector('[data-st="flikar"]');
    var alla = [].slice.call(sek.querySelectorAll('.st-kort[data-st-slug]'));
    var valt = 'Populära';
    function visa() {
      alla.forEach(function (k) {
        var g = ' ' + (k.getAttribute('data-st-grupp') || '') + ' ';
        k.hidden = g.indexOf(' ' + valt + ' ') === -1;
      });
      [].forEach.call(host.querySelectorAll('.st-flik'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-k') === valt); b.tabIndex = b.getAttribute('data-k') === valt ? 0 : -1; });
    }
    host.innerHTML = '<div class="st-flikar" role="tablist" aria-label="Visa prompter för">' + FLIKAR.map(function (f) {
      return '<button type="button" class="st-flik" role="tab" data-k="' + esc(f.k) + '">' + esc(f.text) + '</button>';
    }).join('') + '</div>';
    host.addEventListener('click', function (e) {
      var b = e.target.closest('.st-flik'); if (!b) return;
      valt = b.getAttribute('data-k'); visa(); track('pb_start_flik', { varde: valt });
    });
    host.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var bs = [].slice.call(host.querySelectorAll('.st-flik')), i = bs.indexOf(document.activeElement); if (i < 0) return;
      var n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click();
    });
    visa();

    alla.forEach(function (k) {
      var slug = k.getAttribute('data-st-slug'), rad = k.querySelector('.st-knappar');
      if (!rad) return;
      var fav = F && F.arFavorit ? F.arFavorit(slug) : false;
      rad.insertAdjacentHTML('beforeend',
        '<button type="button" class="st-sek" data-st-g="kopiera">Kopiera</button>' +
        (F && F.vaxlaFavorit ? '<button type="button" class="st-ikon" data-st-g="fav" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter') + '" title="' + (fav ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter') + '">' + stjarna(fav) + '</button>' : ''));
    });

    sek.addEventListener('pointerover', function (e) { if (e.target.closest('[data-st-g="kopiera"]')) hamtaData(); });
    sek.addEventListener('focusin', function (e) { if (e.target.closest('[data-st-g="kopiera"]')) hamtaData(); });
    sek.addEventListener('click', function (e) {
      var b = e.target.closest('[data-st-g]'), k = e.target.closest('.st-kort');
      if (!k) return;
      var slug = k.getAttribute('data-st-slug'), titelEl = k.querySelector('.st-kort-lank'), titel = titelEl ? titelEl.textContent.trim() : slug;
      if (!b) { if (e.target.closest('a')) track('pb_start_oppna', { prompt: slug }); return; }
      if (b.getAttribute('data-st-g') === 'fav') {
        var nu = F.vaxlaFavorit(slug, titel);
        b.setAttribute('aria-pressed', nu); b.innerHTML = stjarna(nu);
        b.setAttribute('aria-label', nu ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter'); b.title = b.getAttribute('aria-label');
        toast(nu ? 'Sparad i Mina prompter' : 'Borttagen från Mina prompter', nu ? 'Du hittar den under Mina prompter i promptbiblioteket.' : '', nu ? [{ namn: 'Mina prompter', href: '/promptbiblioteket?flik=mina' }] : null);
        track('pb_start_fav', { prompt: slug, sparad: nu });
        return;
      }
      var sida = '/ai-prompter/' + slug;
      b.disabled = true;
      hamtaData().then(function (d) {
        b.disabled = false;
        var p = d[slug];
        if (!p) { location.href = sida; return; }
        var n = F && F.parse ? F.parse(p.prompt, {}).length : 1;
        tillKlipp(p.prompt, function () {
          if (F && F.sparaSenaste) F.sparaSenaste(p.prompt, '', titel, slug);
          b.textContent = 'Kopierad ✓'; setTimeout(function () { b.textContent = 'Kopiera'; }, 2000);
          var q = encodeURIComponent(p.prompt);
          if (n) toast('Kopierad med hakparenteser', 'Byt ut [DET SOM STÅR SÅ HÄR] innan du skickar, eller fyll i fälten på promptsidan.', [{ namn: 'Fyll i på promptsidan', href: sida }]);
          else toast('Kopierad! Klistra in i din AI', titel, [{ namn: 'ChatGPT', href: 'https://chatgpt.com/?q=' + q }, { namn: 'Claude', href: 'https://claude.ai/new?q=' + q }]);
          track('pb_start_kopiera', { prompt: slug, falt: n });
        }, function () { toast('Det gick inte att kopiera här', 'Öppna prompten och kopiera den därifrån.', [{ namn: 'Öppna prompten', href: sida }]); });
      });
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); hamtaData(); } }, { rootMargin: '400px 0px' });
      io.observe(sek);
    } else hamtaData();
  }

  /* ── Svenska datum ── */
  function datum() {
    var re = /^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})$/;
    [].forEach.call(document.querySelectorAll('main .prompter-date, main [class*="date"]'), function (el) {
      if (el.children.length) return;
      var m = re.exec(el.textContent.trim()); if (!m) return;
      var ar = +m[3] === new Date().getFullYear() ? '' : ' ' + m[3];
      el.textContent = m[2] + ' ' + MAN[m[1].toLowerCase()] + ar;
    });
    /* Nyhetslistan visar "Oct 16" */
    var kort = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})$/i;
    [].forEach.call(document.querySelectorAll('main .text-style-tagline'), function (el) {
      if (el.children.length) return;
      var m = kort.exec(el.textContent.trim()); if (!m) return;
      el.textContent = m[2] + ' ' + KORT[m[1].toLowerCase()];
    });
  }

  /* ── Lär dig mer om AI: Guider/Nyheter i en sektion ──
     Läser korten från Webflows två CMS-sektioner (som ligger kvar i
     HTML:en men döljs) och ritar dem som skissen. */
  function lasArtiklar(sek, nyhet) {
    return [].slice.call(sek.querySelectorAll('.w-dyn-item a[href]')).map(function (a) {
      var img = a.querySelector('img'), h = a.querySelector('h3'), tag = a.querySelector('.text-style-tag'), d = nyhet ? a.querySelector('.text-style-tagline:not(.text-style-tag)') : null;
      var etikett = nyhet ? 'Nyhet' + (d && d.textContent.trim() ? ' · ' + d.textContent.trim() : '') : (tag ? tag.textContent.trim() : '');
      return { href: a.getAttribute('href'), titel: h ? h.textContent.trim() : '', etikett: etikett,
        src: img ? img.getAttribute('src') : '', srcset: img ? img.getAttribute('srcset') || '' : '', alt: img ? img.getAttribute('alt') || '' : '' };
    }).filter(function (x) { return x.href && x.titel; }).slice(0, 3);
  }
  function lar() {
    var gs = document.querySelector('main section.section_articles'), ns = document.querySelector('main section.section-start-articles');
    if (!gs || !ns) return;
    var G = lasArtiklar(gs, false), N = lasArtiklar(ns, true);
    if (!G.length || !N.length) return;
    var valt = 'guider';
    var sek = document.createElement('section');
    sek.className = 'st-sektion st-lar';
    sek.innerHTML = '<div class="st-wrap"><div class="st-topp"><h2 class="st-h2">Lär dig mer om AI</h2>' +
      '<div class="st-lar-flikar" role="tablist" aria-label="Visa">' +
      '<button type="button" class="st-lar-flik" role="tab" id="st-lar-guider" aria-controls="st-lar-panel" data-k="guider">Guider</button>' +
      '<button type="button" class="st-lar-flik" role="tab" id="st-lar-nyheter" aria-controls="st-lar-panel" data-k="nyheter">Nyheter</button></div></div>' +
      '<div id="st-lar-panel" role="tabpanel"><div class="st-grid st-grid-art"></div></div>' +
      '<a class="st-alla st-lar-alla" href="/ai-artiklar"></a></div>';
    function rita() {
      var l = valt === 'guider' ? G : N;
      sek.querySelector('.st-grid-art').innerHTML = l.map(function (x) {
        return '<a class="st-art" href="' + esc(x.href) + '"><div class="st-art-bild">' +
          (x.src ? '<img loading="lazy" src="' + esc(x.src) + '"' + (x.srcset ? ' srcset="' + esc(x.srcset) + '" sizes="(max-width:767px) 100vw, 380px"' : '') + ' alt="' + esc(x.alt) + '">' : '') +
          '</div><div class="st-art-text"><span class="st-art-etikett">' + esc(x.etikett) + '</span><strong class="st-art-titel">' + esc(x.titel) + '</strong></div></a>';
      }).join('');
      sek.querySelector('.st-lar-alla').textContent = (valt === 'guider' ? 'Alla guider' : 'Alla nyheter') + ' →';
      [].forEach.call(sek.querySelectorAll('.st-lar-flik'), function (b) { var on = b.getAttribute('data-k') === valt; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      sek.querySelector('[role=tabpanel]').setAttribute('aria-labelledby', 'st-lar-' + valt);
    }
    sek.addEventListener('click', function (e) {
      var b = e.target.closest('.st-lar-flik');
      if (b) { valt = b.getAttribute('data-k'); rita(); track('pb_start_lar', { varde: valt }); return; }
      var a = e.target.closest('.st-art'); if (a) track('pb_start_artikel', { flik: valt, url: a.getAttribute('href') });
    });
    sek.addEventListener('keydown', function (e) {
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.closest('.st-lar-flik')) { var n = sek.querySelector('.st-lar-flik[data-k="' + (valt === 'guider' ? 'nyheter' : 'guider') + '"]'); n.focus(); n.click(); }
    });
    gs.parentNode.insertBefore(sek, gs);
    gs.classList.add('st-lar-gammal'); ns.classList.add('st-lar-gammal');
    rita();
  }

  /* ── FAQ: fyra frågor först ── */
  function faq() {
    var lista = document.querySelector('.section_faq .faq_list');
    if (!lista) return;
    var q = [].slice.call(lista.querySelectorAll('.faq_accordion'));
    if (q.length <= 5) return;
    q.slice(4).forEach(function (x) { x.classList.add('st-faq-dold'); });
    var p = document.createElement('p'); p.className = 'st-faq-mer';
    p.innerHTML = 'Visar 4 av ' + q.length + ' frågor · <button type="button" aria-expanded="false">Visa alla</button>';
    lista.parentNode.insertBefore(p, lista.nextSibling);
    p.querySelector('button').addEventListener('click', function () {
      q.forEach(function (x) { x.classList.remove('st-faq-dold'); }); p.parentNode.removeChild(p);
    });
  }

  function init() {
    F = window.AimFyll || null;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    sok(); kort(); datum(); lar(); faq();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
