/* ============================================================
   AIMonkey — projekt-puff.js
   Puff för projektmallarna (/projektpaket/<slug>) på:
     • Promptgeneratorn: visas efter första "Kopiera" (under AI-knapparna).
       Rekommenderad mall väljs utifrån vald roll.
     • Artiklar: visas efter brödtexten på artiklarna i ARTIKLAR.
   Använder sajtens klasser .paket-puff* (samma utseende som pillar-puffarna).

   Underhåll:
     • PAKET  = projektmallar som är live. Lägg till när en ny släpps.
     • ARTIKLAR = artikel-slug → rekommenderad projektmall ('' = låt
       läsaren välja bland alla).
   dataLayer: paket_puff_visa / paket_puff_klick (paket, kalla, sida).
============================================================ */
(function () {
  'use strict';

  var PAKET = [
    { slug: 'saljassistenten', namn: 'Säljassistenten', kort: 'för dig som säljer' },
    { slug: 'smaforetagets-ai-avdelning', namn: 'Småföretagets AI-avdelning', kort: 'för dig som driver eget' },
    { slug: 'innehallsmaskinen', namn: 'Innehållsmaskinen', kort: 'för sociala medier och nyhetsbrev' },
    { slug: 'kundtjanst-for-webbshopen', namn: 'Kundtjänst för webbshopen', kort: 'för dig som svarar kunder' }
  ];

  var ARTIKLAR = {
    'ai-for-smaforetagare-2026': 'smaforetagets-ai-avdelning',
    'ai-verktyg-smaforetag-budget': 'smaforetagets-ai-avdelning',
    'voice-ai-for-smaforetagare': 'smaforetagets-ai-avdelning',
    'ai-for-sociala-medier': 'innehallsmaskinen',
    'ai-for-marknadsforare': 'innehallsmaskinen',
    'kom-igang-med-chatgpt-steg-for-steg': '',
    'chatgpt-vs-claude-vs-gemini-2026': '',
    'chatgpt-dreaming-v3-nya-minnet': '',
    'claude-delat-minne-chatt-cowork': '',
    'claude-gmail-google-drive-integration': '',
    'chatgpt-google-drive-library': '',
    'vanliga-nyborjarmisstag-med-ai': '',
    'ai-pa-jobbet-2026-kompletta-guiden': ''
  };

  /* Promptgeneratorns roller → projektmall */
  var ROLL = {
    'säljare': 'saljassistenten',
    'copywriter': 'innehallsmaskinen',
    'marknadsförare': 'innehallsmaskinen',
    'seo-expert': 'innehallsmaskinen'
  };

  var CSS = [
    '.projektpuff{margin:24px 0}',
    '.projektpuff .paket-puff-rubrik{margin-top:0}',
    '.projektpuff-val{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;align-items:center}',
    '.projektpuff-val span{font-size:14px;color:#c9d3de;margin-right:2px}',
    '.projektpuff-val a{display:inline-flex;align-items:center;font-size:14px;font-weight:600;color:#fff;text-decoration:none;border:1.5px solid rgba(255,255,255,.35);border-radius:999px;padding:6px 12px;line-height:1.2}',
    '.projektpuff-val a:hover{border-color:#ffd43b;color:#ffd43b}',
    '.projektpuff-val a.is-rek{border-color:#4cd9c1;color:#4cd9c1}'
  ].join('');

  var sidaTyp = /^\/promptgeneratorn/.test(location.pathname) ? 'generator'
    : /^\/artiklar\//.test(location.pathname) ? 'artikel' : '';
  if (!sidaTyp) return;
  var sidaSlug = location.pathname.split('/').filter(Boolean).pop() || '';

  function track(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event, kalla: sidaTyp, sida: sidaSlug };
    for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }
  function hitta(slug) {
    for (var i = 0; i < PAKET.length; i++) if (PAKET[i].slug === slug) return PAKET[i];
    return null;
  }
  function url(slug) {
    return '/projektpaket/' + slug + '?source=' + sidaTyp + '&sida=' + encodeURIComponent(sidaSlug);
  }

  function bygg(rek, rubrik, text) {
    if (!document.getElementById('projektpuff-css')) {
      var st = document.createElement('style');
      st.id = 'projektpuff-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    var box = document.createElement('div');
    box.className = 'paket-puff projektpuff';
    box.setAttribute('data-projektpuff', rek ? rek.slug : 'val');
    var inner = document.createElement('div');
    inner.className = 'paket-puff-text';
    var tagg = document.createElement('div');
    tagg.className = 'paket-puff-tagg';
    tagg.textContent = 'Projektmall · steg för steg';
    var h = document.createElement('p');
    h.className = 'paket-puff-rubrik';
    h.textContent = rubrik;
    var p = document.createElement('p');
    p.className = 'paket-puff-p';
    p.textContent = text;
    inner.appendChild(tagg); inner.appendChild(h); inner.appendChild(p);

    var val = document.createElement('div');
    val.className = 'projektpuff-val';
    var lbl = document.createElement('span');
    lbl.textContent = rek ? 'Eller välj:' : 'Välj din:';
    val.appendChild(lbl);
    PAKET.forEach(function (pk) {
      if (rek && pk.slug === rek.slug) return;
      var a = document.createElement('a');
      a.href = url(pk.slug);
      a.textContent = pk.namn;
      a.title = 'Projektmall ' + pk.kort;
      a.addEventListener('click', function () { track('paket_puff_klick', { paket: pk.slug, typ: 'val' }); });
      val.appendChild(a);
    });
    inner.appendChild(val);
    box.appendChild(inner);

    if (rek) {
      var btn = document.createElement('a');
      btn.className = 'paket-puff-btn';
      btn.href = url(rek.slug);
      btn.textContent = rek.namn + ' →';
      btn.addEventListener('click', function () { track('paket_puff_klick', { paket: rek.slug, typ: 'rek' }); });
      box.appendChild(btn);
    }
    return box;
  }

  /* ── Promptgeneratorn ── */
  function generator() {
    var copy = document.getElementById('copy-prompt-preview');
    if (!copy) return;
    var visad = false;
    copy.addEventListener('click', function () {
      if (visad) return;
      setTimeout(function () {
        var prev = document.getElementById('prompt-preview-raw');
        if (!prev || !(prev.value || '').trim()) return;
        var r = document.querySelector('input[name="Roll"]:checked');
        var roll = r ? String(r.value).trim().toLowerCase() : '';
        var rek = hitta(ROLL[roll] || '');
        var box = bygg(rek,
          'Använder du sådana här prompter ofta? Gör ett eget AI-projekt',
          'Med en projektmall klistrar du in instruktionerna en gång i ChatGPT, Claude, Gemini eller Copilot. Sen vet AI:n vem du är och hur du vill ha det i varje chatt, så dina prompter kan bli mycket kortare. Gratis, klart på 10 minuter.');
        var links = document.querySelector('.ai-tool-links');
        var anchor = links || copy;
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
        visad = true;
        track('paket_puff_visa', { paket: rek ? rek.slug : 'val', roll: roll });
      }, 400);
    });
  }

  /* ── Artiklar ── */
  function artikel() {
    if (!Object.prototype.hasOwnProperty.call(ARTIKLAR, sidaSlug)) return;
    var body = document.querySelector('.article-wrapper [fs-toc-element="contents"]') ||
               document.querySelector('[fs-toc-element="contents"]');
    if (!body || document.querySelector('[data-projektpuff]')) return;
    var rek = hitta(ARTIKLAR[sidaSlug]);
    var box = bygg(rek,
      rek ? 'Nästa steg: gör det till ett eget AI-projekt' : 'Nästa steg: ditt eget AI-projekt',
      rek ? ('Med projektmallen ' + rek.namn + ' klistrar du in instruktionerna en gång i ChatGPT, Claude, Gemini eller Copilot. Sen vet AI:n vem du är i varje chatt. Gratis, klart på 10 minuter.')
          : 'Ett projekt är en egen arbetsyta i din AI-tjänst där AI:n alltid kommer ihåg vem du är och hur du vill ha det. Välj en färdig projektmall, fyll i dina uppgifter och klistra in. Gratis, klart på 10 minuter.');
    body.parentNode.insertBefore(box, body.nextSibling);
    track('paket_puff_visa', { paket: rek ? rek.slug : 'val' });
  }

  function init() {
    try { if (sidaTyp === 'generator') generator(); else artikel(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
