/* ============================================================
   AIMonkey — prompt-sida.js (Prompters Template, /ai-prompter/<slug>)
   Kräver pg-fyll.js (window.AimFyll). Registrerade sidskript i
   Prompters Template (PgFyll, PromptSida). init väntar tills
   prompt-steg.js och sidans egen kod har kört.

   Promptsidan blir en plats där man gör prompten till sin:
   1. "Fyll i det som är ditt": ett fält per [PLATSHÅLLARE] (samma
      regler som nya generatorn). Egna uppgifter förifylls från
      förra gången (pg_kedja). Fält som tar in svaret från ett
      tidigare steg får en länk till det steget. Det man skrivit på
      sidan ligger kvar i sessionStorage om man går till ett annat
      steg och tillbaka.
   2. Prompten uppdateras direkt: ifyllt markeras grönt, luckor gult.
   3. Kopiera prompt är spärrad tills allt är ifyllt (beslut
      2026-10-15). Undantag: "Kopiera originalet med hakparenteser".
   4. Kopiera länk, Öppna direkt i ChatGPT/Claude/Gemini/Copilot,
      ★ Spara (aimonkey_fav_prompts) och Senaste prompter.
   5. Efter kopiering: "Nästa: Steg N" om prompten ingår i en mall.

   Visas bara på testdomänen (*.webflow.io) tills den släpps:
   sätt LIVE = true, eller localStorage aim_promptsida = '1'
   för att se den på aimonkey.se.
   ============================================================ */
(function () {
  'use strict';
  var LIVE = false;
  var visa = LIVE || /\.webflow\.io$/.test(location.hostname);
  try { if (localStorage.getItem('aim_promptsida') === '1') visa = true; if (localStorage.getItem('aim_promptsida') === '0') visa = false; } catch (e) {}
  if (!visa || window.__aimPromptSida) return;
  window.__aimPromptSida = true;

  var F;

  var CSS = [
    'body.ps2-on .kopiera-prompt{display:none!important}',
    '.ps2-fyll{background:#fff;border:1px solid #e1e7ee;border-radius:20px;padding:22px;margin:4px 0 20px;display:flex;flex-direction:column;gap:14px}',
    '.ps2-topp{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px}',
    '.ps2-h2{margin:0!important;font-size:22px!important;line-height:1.2!important;color:#0b1f3b}',
    '.ps2-rakna{font-size:14px;font-weight:600;color:#005042}',
    '.ps2-rakna.is-klar::before{content:"✓ "}',
    '.ps2-ingress{margin:0!important;font-size:15px!important;line-height:1.55!important;color:#3d4a5c!important}',
    '.ps2-stapel{height:6px;border-radius:999px;background:#e1e7ee;overflow:hidden}',
    '.ps2-stapel i{display:block;height:100%;background:#00c9a7;border-radius:999px;transition:width .2s}',
    '.ps2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}',
    '.ps2-falt{display:flex;flex-direction:column;gap:6px;min-width:0}',
    '.ps2-falt.is-full{grid-column:1/-1}',
    '.ps2-falt label{font-size:15px;font-weight:600;color:#0b1f3b;margin:0}',
    '.ps2-in{width:100%;box-sizing:border-box;min-height:50px;padding:12px 14px;border:2px solid #d3dbe4;border-radius:14px;background:#fff;font:inherit;font-size:16px;color:#0b1f3b;margin:0}',
    'textarea.ps2-in{min-height:120px;resize:vertical;line-height:1.5}',
    '.ps2-in:focus{outline:none;border-color:#00c9a7;box-shadow:0 0 0 5px rgba(0,201,167,.18)}',
    '.ps2-falt.is-ifylld .ps2-in{border-color:#9fe3d6}',
    '.ps2-falt.is-fel .ps2-in{border-color:#c2410c}',
    '.ps2-not{font-size:13px;color:#005042}',
    '.ps2-fel{display:none;font-size:13px;font-weight:600;color:#9a3412}',
    '.ps2-falt.is-fel .ps2-fel{display:block}',
    '.ps2-steglank{font-size:13px;font-weight:600;color:#00806b!important;text-decoration:none}',
    '.ps2-steglank:hover{text-decoration:underline}',
    '.ps2-prompt-rubrik{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0 0 8px;font-size:13px;color:#5b6573}',
    '.ps2-prompt-rubrik strong{font-size:15px;color:#0b1f3b}',
    '.ps2-aktiv .pm-ph{background:#fff1bf!important;color:#6b4d00;font-weight:600}',
    '.ps2-aktiv mark.ps2-fylld{background:#d6f5ef;color:#004a3d;font-weight:600;border-radius:4px;padding:0 .2em;box-decoration-break:clone;-webkit-box-decoration-break:clone}',
    '.ps2-actions{display:flex;flex-direction:column;gap:12px;margin:18px 0 6px}',
    '.ps2-rad{display:flex;flex-wrap:wrap;align-items:center;gap:10px}',
    '.ps2-kopiera{font:inherit;font-size:17px;font-weight:700;min-height:52px;padding:0 24px;border-radius:14px;border:0;cursor:pointer;background:#e1e7ee;color:#3d4a5c}',
    '.ps2-kopiera.is-klar{background:#ffd23f;color:#0b1f3b;box-shadow:0 8px 22px rgba(255,210,63,.35)}',
    '.ps2-kopiera.is-copied{background:#00c9a7;color:#0b1f3b}',
    '.ps2-sek{font:inherit;font-size:15px;font-weight:600;min-height:48px;padding:0 16px;border-radius:12px;border:1.5px solid #c9d3de;background:#fff;color:#0b1f3b;cursor:pointer;display:inline-flex;align-items:center;gap:8px}',
    '.ps2-sek:hover{border-color:#0b1f3b}',
    '.ps2-sek[aria-pressed="true"]{border-color:#e0b100;background:#fff8dc}',
    '.ps2-sek svg{flex:none}',
    '.ps2-ra{all:unset;cursor:pointer;align-self:flex-start;font-size:14px;color:#3d4a5c;text-decoration:underline;padding:2px 0}',
    '.ps2-ra:focus-visible{outline:2px solid #00c9a7;outline-offset:2px}',
    '.ps2-ai{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:12px;border-top:1px solid #e1e7ee}',
    '.ps2-ai span{font-size:14px;font-weight:600;color:#3d4a5c;margin-right:2px}',
    '.ps2-ai a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:12px;border:1.5px solid #c9d3de;background:#fff;color:#0b1f3b!important;font-size:15px;font-weight:600;text-decoration:none}',
    '.ps2-ai a:hover{border-color:#0b1f3b}',
    '.ps2-ai.is-last a{opacity:.55}',
    '.ps2-klarruta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;background:#0b1f3b;color:#fff;border-radius:16px;padding:14px 18px}',
    '.ps2-klarruta[hidden]{display:none}',
    '.ps2-klarruta p{margin:0!important;flex:1 1 220px;font-size:15px!important;line-height:1.5!important;color:#f5f6fa!important}',
    '.ps2-klarruta a{color:#0b1f3b!important;background:#ffd23f;font-size:14px;font-weight:600;text-decoration:none;padding:10px 14px;border-radius:10px}',
    '.ps2-meddelande{font-size:14px;font-weight:600;color:#9a3412;margin:0}',
    '.ps2-lik-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
    '.ps2-lik{display:flex;flex-direction:column;gap:6px;background:#fff;border:1.5px solid #e1e7ee;border-radius:18px;padding:18px 20px;text-decoration:none!important;color:#0b1f3b!important;transition:border-color .15s,box-shadow .15s}',
    '.ps2-lik:hover{border-color:#9fe3d6;box-shadow:0 10px 26px rgba(11,31,59,.07)}',
    '.ps2-lik strong{font-size:18px;line-height:1.3}',
    '.ps2-lik span{font-size:14px;line-height:1.5;color:#4a5668}',
    '.ps2-lik em{font-style:normal;font-size:12px;font-weight:600;color:#005042;background:#e5f9f6;border-radius:999px;padding:3px 9px;align-self:flex-start}',
    '.ps2-lik em.is-gul{color:#6b4d00;background:#fff1bf}',
    '@media (max-width:767px){.ps2-lik-grid{grid-template-columns:1fr}.ps2-lik{padding:16px}}',
    '@media (max-width:767px){.ps2-grid{grid-template-columns:1fr}.ps2-fyll{padding:18px}.ps2-kopiera{flex:1 1 100%}}'
  ].join('\n');

  var IKON_LANK = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  var IKON_STJARNA = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="FILL" stroke="#0b1f3b" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  var slug = location.pathname.split('/').filter(Boolean).pop() || '';
  var SESS = 'aim_ps_fyll_' + slug;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function make(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function track(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event, prompt: slug };
    for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }
  function tillKlipp(text, ok) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (ok) ok();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { if (ok) ok(); }, fallback);
    else fallback();
  }
  function lasSess() { try { return JSON.parse(sessionStorage.getItem(SESS) || '{}') || {}; } catch (e) { return {}; } }
  function sparaSess(v) { try { sessionStorage.setItem(SESS, JSON.stringify(v)); } catch (e) {} }

  function init() {
    F = window.AimFyll;
    if (!F) return;
    var card = document.querySelector('.prompt-container.prompt-large');
    var promptEl = card && card.querySelector('.prompt-copy-text.prompt-copy');
    var code = card && card.querySelector('.code-container');
    if (!card || !promptEl || !code) return;

    var wrapperA = card.querySelector('.anpassa-btn-wrapper');
    var raw = (wrapperA && wrapperA.getAttribute('data-brief')) || promptEl.getAttribute('data-pm-raw') || promptEl.textContent || '';
    raw = raw.replace(/\r\n?/g, '\n').trim();
    if (!raw) return;
    var namn = (wrapperA && wrapperA.getAttribute('data-namn')) || ((card.querySelector('h1') || {}).textContent || '').trim();
    var tasktype = (wrapperA && wrapperA.getAttribute('data-tasktype')) || '';

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    document.body.classList.add('ps2-on');

    var falt = F.parse(raw, { kod: tasktype === 'kod' });
    var fore = F.forifyll(falt);
    var sess = lasSess();
    var V = {}, fran = {};
    falt.forEach(function (t) {
      if (sess[t.key] !== undefined) V[t.key] = sess[t.key];
      else if (fore.varden[t.key]) { V[t.key] = fore.varden[t.key]; fran[t.key] = true; }
      else V[t.key] = '';
    });
    var visaFel = false, borjat = false;

    function kvar() { return falt.filter(function (t) { return !F.varde(V, t.key); }); }
    function fylld() { return F.apply(raw, V); }

    /* ── Fyll i-panelen ── */
    var panel = null, grid = null, rakna = null, stapel = null;
    if (falt.length) {
      panel = make('section', 'ps2-fyll');
      panel.setAttribute('aria-labelledby', 'ps2-h');
      panel.innerHTML =
        '<div class="ps2-topp"><h2 class="ps2-h2" id="ps2-h">Fyll i det som är ditt</h2><span class="ps2-rakna" aria-live="polite"></span></div>' +
        '<p class="ps2-ingress">Fälten ersätter [HAKPARENTESERNA] i prompten. Det du skriver om dig själv, som företagsnamnet, sparas i din webbläsare till nästa gång.</p>' +
        '<div class="ps2-stapel" aria-hidden="true"><i></i></div><div class="ps2-grid"></div>';
      grid = panel.querySelector('.ps2-grid');
      rakna = panel.querySelector('.ps2-rakna');
      stapel = panel.querySelector('.ps2-stapel i');
      falt.forEach(function (t, i) {
        var id = 'ps2-f-' + i;
        var f = make('div', 'ps2-falt' + (t.multi ? ' is-full' : ''));
        f.setAttribute('data-ps2', i);
        f.innerHTML = '<label for="' + id + '">' + esc(t.label) + '</label>' +
          (t.multi ? '<textarea id="' + id + '" class="ps2-in" placeholder="' + esc(t.hint) + '"></textarea>'
                   : '<input id="' + id + '" class="ps2-in" placeholder="' + esc(t.hint) + '">') +
          (fran[t.key] ? '<span class="ps2-not">Ifyllt från förra gången. Ändra om det behövs.</span>' : '') +
          '<span class="ps2-steg" hidden></span><span class="ps2-fel">Fyll i det här fältet</span>';
        f.querySelector('.ps2-in').value = V[t.key] || '';
        grid.appendChild(f);
      });
      code.parentNode.insertBefore(panel, code);
    }

    var rubrik = make('div', 'ps2-prompt-rubrik', '<strong>Din prompt</strong><span class="ps2-tecken"></span>');
    code.parentNode.insertBefore(rubrik, code);

    /* ── Knappar ── */
    var actions = make('div', 'ps2-actions');
    actions.innerHTML =
      '<div class="ps2-rad">' +
        '<button type="button" class="ps2-kopiera"></button>' +
        '<button type="button" class="ps2-sek" data-ps2-lank>' + IKON_LANK + 'Kopiera länk</button>' +
        '<button type="button" class="ps2-sek" data-ps2-fav aria-pressed="false"></button>' +
      '</div>' +
      '<p class="ps2-meddelande" hidden aria-live="polite"></p>' +
      '<button type="button" class="ps2-ra" hidden>Kopiera originalet med hakparenteser</button>' +
      '<div class="ps2-klarruta" hidden role="status"><p></p></div>' +
      '<div class="ps2-ai"><span>Öppna direkt i</span>' +
        '<a href="#" data-ai="chatgpt" target="_blank" rel="noopener">ChatGPT ↗</a>' +
        '<a href="#" data-ai="claude" target="_blank" rel="noopener">Claude ↗</a>' +
        '<a href="https://gemini.google.com/app" data-ai="gemini" target="_blank" rel="noopener">Gemini ↗</a>' +
        '<a href="#" data-ai="copilot" target="_blank" rel="noopener">Copilot ↗</a>' +
      '</div>';
    code.parentNode.insertBefore(actions, code.nextSibling);
    var bKop = actions.querySelector('.ps2-kopiera');
    var bRa = actions.querySelector('.ps2-ra');
    var bFav = actions.querySelector('[data-ps2-fav]');
    var meddelande = actions.querySelector('.ps2-meddelande');
    var klarruta = actions.querySelector('.ps2-klarruta');
    var aiRad = actions.querySelector('.ps2-ai');

    function ritaFav() {
      var ar = F.arFavorit(slug);
      bFav.setAttribute('aria-pressed', ar ? 'true' : 'false');
      bFav.innerHTML = IKON_STJARNA.replace('FILL', ar ? '#ffd23f' : 'none') + (ar ? 'Sparad' : 'Spara');
      bFav.title = ar ? 'Ta bort från Mina prompter' : 'Spara i Mina prompter';
    }
    ritaFav();

    /* ── Förhandsvisning i promptrutan ── */
    var MS = '', ME = '';
    function ritaPrompt() {
      var md = F.segment(raw, V).map(function (s) {
        if (!s.ph || !s.fylld) return s.t;
        var t = s.t.replace(/\s*\n+\s*/g, ' ');
        if (t.length > 160) t = t.slice(0, 157) + '…';
        return MS + t.replace(/[]/g, '') + ME;
      }).join('');
      var html;
      if (typeof window.aimPromptMarkdown === 'function') html = window.aimPromptMarkdown(md);
      else html = '<span style="white-space:pre-wrap">' + esc(md) + '</span>';
      html = html.split(MS).join('<mark class="ps2-fylld">').split(ME).join('</mark>');
      promptEl.setAttribute('data-pm-raw', fylld());
      promptEl.setAttribute('data-pm', '1');
      promptEl.classList.add('pm-md');
      promptEl.classList.remove('pm-raw');
      promptEl.innerHTML = html;
      card.classList.add('ps2-aktiv');
    }

    function uppdatera() {
      var k = kvar(), klar = !k.length, n = falt.length;
      if (rakna) { rakna.textContent = (n - k.length) + ' av ' + n + ' ifyllda'; rakna.classList.toggle('is-klar', klar); }
      if (stapel) stapel.style.width = (n ? Math.round(100 * (n - k.length) / n) : 100) + '%';
      if (grid) [].forEach.call(grid.querySelectorAll('[data-ps2]'), function (f) {
        var t = falt[+f.getAttribute('data-ps2')], ok = !!F.varde(V, t.key);
        f.classList.toggle('is-ifylld', ok);
        f.classList.toggle('is-fel', visaFel && !ok);
      });
      bKop.classList.toggle('is-klar', klar);
      if (!bKop.classList.contains('is-copied')) bKop.textContent = klar ? 'Kopiera prompt' : 'Fyll i ' + k.length + ' fält till';
      bKop.setAttribute('aria-disabled', klar ? 'false' : 'true');
      bRa.hidden = klar;
      aiRad.classList.toggle('is-last', !klar);
      if (klar) meddelande.hidden = true;
      var text = fylld(), q = encodeURIComponent(text);
      aiRad.querySelector('[data-ai="chatgpt"]').href = 'https://chatgpt.com/?q=' + q;
      aiRad.querySelector('[data-ai="claude"]').href = 'https://claude.ai/new?q=' + q;
      aiRad.querySelector('[data-ai="copilot"]').href = 'https://copilot.microsoft.com/?q=' + q;
      rubrik.querySelector('.ps2-tecken').textContent = text.length + ' tecken';
      ritaPrompt();
    }

    function visaTomma(kalla) {
      visaFel = true;
      uppdatera();
      var k = kvar();
      meddelande.textContent = 'Fyll i ' + k.length + (k.length === 1 ? ' fält' : ' fält') + ' till först. Prompten blir mycket bättre med dina riktiga uppgifter.';
      meddelande.hidden = false;
      var forsta = grid && grid.querySelector('.ps2-falt.is-fel .ps2-in');
      if (forsta) { forsta.focus(); forsta.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      track('ps_sparr', { kalla: kalla, kvar: k.length });
    }

    function nastaSteg() {
      var steps = window.__psSteps || [], nu = parseInt(((document.querySelector('[data-promptsteg="steg"]') || {}).textContent || '0'), 10) || 0;
      if (!steps.length || !nu) return null;
      var idx = -1;
      steps.forEach(function (s, i) { if (s.n === nu) idx = i; });
      return idx > -1 && idx < steps.length - 1 ? steps[idx + 1] : null;
    }

    function efterKopiering(etikett) {
      bKop.textContent = etikett;
      bKop.classList.add('is-copied');
      setTimeout(function () { bKop.classList.remove('is-copied'); uppdatera(); }, 2200);
      var nasta = nastaSteg();
      klarruta.innerHTML = '<p>Kopierad! Klistra in den i ChatGPT, Claude eller Gemini.' + (nasta ? ' Spara svaret, det behövs i nästa steg.' : '') + '</p>' +
        (nasta && nasta.slug ? '<a href="/ai-prompter/' + esc(nasta.slug) + '">Nästa: steg ' + nasta.n + ', ' + esc(nasta.titel) + ' →</a>' : '');
      klarruta.hidden = false;
    }

    /* ── Händelser ── */
    if (grid) {
      grid.addEventListener('input', function (e) {
        var f = e.target.closest('[data-ps2]');
        if (!f) return;
        var t = falt[+f.getAttribute('data-ps2')];
        V[t.key] = e.target.value;
        sparaSess(V);
        F.sparaFyll(t, e.target.value);
        if (!borjat) { borjat = true; track('ps_fyll', { antal: falt.length }); }
        uppdatera();
      });
      grid.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
        e.preventDefault();
        var alla = [].slice.call(grid.querySelectorAll('.ps2-in'));
        var nasta = alla.slice(alla.indexOf(e.target) + 1).concat(alla).filter(function (x) { return !x.value.trim(); })[0];
        if (nasta && nasta !== e.target) nasta.focus(); else bKop.focus();
      });
    }

    bKop.addEventListener('click', function () {
      if (kvar().length) return visaTomma('kopiera');
      var text = fylld();
      tillKlipp(text, function () { efterKopiering('Kopierad ✓'); });
      F.sparaSenaste(text, tasktype, namn, slug);
      track('ps_kopiera', { ifyllt: falt.length });
    });
    bRa.addEventListener('click', function () {
      tillKlipp(raw, function () {
        meddelande.hidden = true;
        klarruta.innerHTML = '<p>Originalet är kopierat. Byt ut [DET SOM STÅR SÅ HÄR] innan du skickar prompten.</p>';
        klarruta.hidden = false;
      });
      track('ps_kopiera_ra', {});
    });
    actions.querySelector('[data-ps2-lank]').addEventListener('click', function (e) {
      var b = e.currentTarget, url = location.origin + location.pathname;
      tillKlipp(url, function () {
        b.innerHTML = IKON_LANK + 'Länken är kopierad';
        setTimeout(function () { b.innerHTML = IKON_LANK + 'Kopiera länk'; }, 2200);
      });
      track('ps_lank', {});
    });
    bFav.addEventListener('click', function () {
      var nu = F.vaxlaFavorit(slug, namn);
      ritaFav();
      track('ps_fav', { sparad: nu });
    });
    aiRad.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ai]');
      if (!a) return;
      if (kvar().length) { e.preventDefault(); return visaTomma('ai'); }
      var text = fylld();
      tillKlipp(text);
      F.sparaSenaste(text, tasktype, namn, slug);
      track('ps_ai', { tjanst: a.getAttribute('data-ai') });
    });

    /* Promptgeneratorn: skicka med det ifyllda i stället för originalet */
    var anpassa = card.querySelector('.anpassa-btn-wrapper a');
    if (anpassa) {
      anpassa.textContent = 'Finjustera i Promptgeneratorn →';
      anpassa.addEventListener('click', function () {
        var text = fylld(), href = anpassa.getAttribute('href') || '';
        try {
          if (/[?&]brief=/.test(href) && text.length <= 1500) anpassa.setAttribute('href', href.replace(/([?&]brief=)[^&]*/, '$1' + encodeURIComponent(text)));
          else sessionStorage.setItem('pg_imported_prompt', text);
        } catch (err) {}
      }, true);
    }

    /* Länk till steget som ett fält hämtar svaret från (stegen kommer från prompt-steg.js) */
    function stegLankar() {
      var steps = window.__psSteps;
      if (!grid || !steps || !steps.length) return !!steps;
      falt.forEach(function (t, i) {
        if (!t.franSteg) return;
        var s = steps.filter(function (x) { return x.n === t.franSteg; })[0];
        var host = grid.querySelector('[data-ps2="' + i + '"] .ps2-steg');
        if (!s || !s.slug || !host) return;
        host.innerHTML = '<a class="ps2-steglank" href="/ai-prompter/' + esc(s.slug) + '">← Hämta svaret från steg ' + s.n + ': ' + esc(s.titel) + '</a>';
        host.hidden = false;
      });
      return true;
    }
    if (falt.some(function (t) { return t.franSteg; })) {
      var forsok = 0, iv = setInterval(function () { if (stegLankar() || ++forsok > 40) clearInterval(iv); }, 200);
    }

    uppdatera();
    try { liknande({ namn: namn }); } catch (e) {}
    track('ps_visa', { falt: falt.length, forifyllda: Object.keys(fran).length });
  }


  /* ── Liknande prompter (ersätter "Se fler prompter om <kategori>") ──
     Webflow-listan (samma kategori) ligger kvar i HTML:en för länkarnas
     skull men döljs. Urvalet görs från /prompt-data: ord i titel och
     beskrivning först, sedan samma kategori. Steg som bygger på ett
     tidigare steg ("från steg N") visas inte, de funkar inte fristående. */
  var STOPP = /^(och|eller|för|med|som|utan|till|från|inte|över|under|efter|innan|din|ditt|dina|ett|en|den|det|de|att|på|av|om|hur|vad|när|alla|mer|mest|varje|både|kort|enkel|bättre|text|ai|chatgpt|prompt|prompter|skriv|skapa|gör|få|befintlig|befintliga|egen|eget|egna|nytt|nya|specifik|specifikt|olika|bra)$/;
  function ord(t) {
    return (t || '').toLowerCase().split(/[^a-zåäöé0-9]+/).filter(function (w) { return w.length >= 4 && !STOPP.test(w); })
      .map(function (w) { return w.length > 6 ? w.slice(0, 6) : w; });
  }
  function beroende(p) { return /fr[åa]n (steg|fas) ?\d/i.test(p || ''); }

  function liknande(nu) {
    var sek = document.querySelector('.filters5_component');
    var lista = sek && sek.querySelector('.w-dyn-list');
    if (!sek || !lista) return;
    var h2 = sek.querySelectorAll('.div-block-2 h2');
    var webflow = [].slice.call(lista.querySelectorAll('.w-dyn-item')).map(function (it) {
      var a = it.querySelector('a[data-ps2-lik]'), href = a ? a.getAttribute('href') || '' : '';
      return {
        slug: /^\/ai-prompter\//.test(href) ? href.split('/').pop() : '',
        namn: ((it.querySelector('.article-title-prompt') || {}).textContent || '').trim(),
        desc: ((it.querySelector('.article-desc-prompt') || {}).textContent || '').trim(),
        prompt: ((it.querySelector('.prompt-copy-text.prompt-copy') || {}).getAttribute ? (it.querySelector('.prompt-copy-text.prompt-copy').getAttribute('data-pm-raw') || it.querySelector('.prompt-copy-text.prompt-copy').textContent) : '')
      };
    }).filter(function (x) { return x.slug && x.namn; });

    function rita(urval) {
      if (!urval.length) return;
      if (h2[0]) h2[0].textContent = 'Liknande prompter';
      if (h2[1]) h2[1].style.display = 'none';
      var grid = make('div', 'ps2-lik-grid');
      grid.setAttribute('aria-label', 'Liknande prompter');
      urval.forEach(function (p, i) {
        var n = F.parse(p.prompt || '').length;
        var a = make('a', 'ps2-lik',
          '<strong>' + esc(p.namn) + '</strong>' + (p.desc ? '<span>' + esc(p.desc) + '</span>' : '') +
          '<em' + (n ? ' class="is-gul"' : '') + '>' + (n ? n + ' fält att fylla i' : 'Klar att kopiera') + '</em>');
        a.href = '/ai-prompter/' + p.slug;
        a.addEventListener('click', function () { track('ps_liknande', { till: p.slug, plats: i + 1 }); });
        grid.appendChild(a);
      });
      lista.style.display = 'none';
      lista.parentNode.insertBefore(grid, lista);
    }

    var klar = false;
    function reserv() { if (klar) return; klar = true; rita(webflow.filter(function (x) { return x.slug !== slug && !beroende(x.prompt); }).slice(0, 6)); }
    var tid = setTimeout(reserv, 5000);
    try {
      fetch(location.origin + '/prompt-data', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
        if (klar) return;
        if (!html) return reserv();
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var alla = [].slice.call(doc.querySelectorAll('.pg-data-item')).map(function (el) {
          function t(c) { return ((el.querySelector(c) || {}).textContent || '').trim(); }
          return { namn: t('.pg-d-name'), desc: t('.pg-d-desc'), kat: t('.pg-d-cat'), slug: t('.pg-d-slug'), prompt: t('.pg-d-prompt') };
        }).filter(function (p) { return p.slug && p.namn; });
        var jag = alla.filter(function (p) { return p.slug === slug; })[0] || { namn: nu.namn, desc: '', kat: '' };
        var mina = {};
        ord(jag.namn).forEach(function (w) { mina[w] = 3; });
        ord(jag.desc).forEach(function (w) { if (!mina[w]) mina[w] = 1; });
        var sedda = {};
        var kand = alla.filter(function (p) {
          if (p.slug === slug || sedda[p.slug] || beroende(p.prompt)) return false;
          sedda[p.slug] = true; return true;
        }).map(function (p) {
          var tit = {}, bes = {}, pt = 0;
          ord(p.namn).forEach(function (w) { tit[w] = 1; });
          ord(p.desc).forEach(function (w) { bes[w] = 1; });
          for (var w in mina) { if (tit[w]) pt += 2 * mina[w]; else if (bes[w]) pt += mina[w]; }
          if (jag.kat && p.kat === jag.kat) pt += 1;
          return { p: p, pt: pt };
        });
        kand.sort(function (a, b) { return b.pt - a.pt; });
        var urval = kand.filter(function (x) { return x.pt >= 4; }).slice(0, 6).map(function (x) { return x.p; });
        var har = {}; urval.forEach(function (p) { har[p.slug] = 1; });
        kand.filter(function (x) { return !har[x.p.slug] && jag.kat && x.p.kat === jag.kat; }).forEach(function (x) {
          if (urval.length < 6) { urval.push(x.p); har[x.p.slug] = 1; }
        });
        clearTimeout(tid); klar = true;
        rita(urval.length ? urval : webflow.filter(function (x) { return x.slug !== slug; }).slice(0, 6));
      })['catch'](reserv);
    } catch (e) { reserv(); }
  }

  /* Körs efter prompt-steg.js (som alltid sätter body.promptsteg-on/-off)
     oavsett laddordning. Utan prompt-steg körs init efter 3 s ändå. */
  function start() {
    var n = 0;
    (function vanta() {
      var cl = document.body && document.body.classList;
      if ((cl && (cl.contains('promptsteg-on') || cl.contains('promptsteg-off'))) || ++n > 60) return setTimeout(init, 0);
      setTimeout(vanta, 50);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
