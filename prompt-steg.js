/* ============================================================
   AIMonkey — prompt-steg.js (Prompters Template)
   Promptsidan för prompter som är ett steg i en mall.

   Webflow-struktur (Designer), i vänsterkolumnen under promptkortet:
     [data-promptsteg="wrap"]
       [data-promptsteg="meta"] (hidden): steg, stegrubrik,
         mallnamn, mallslug, mallfas  — bundna textblock
       [data-promptsteg="nar"]      ← När du använder den
       [data-promptsteg="exempel"]  ← Exempel på svar (RichText)
       [data-promptsteg="nasta"]    ← Nästa drag
       [data-promptsteg="misstag"]  ← Vanliga misstag (RichText)
       [data-promptsteg="apan"]     ← Apan tycker (RichText)

   Regel: Steg + Huvudmall ifyllda → body.promptsteg-on: banner
   "Steg X av Y i [mall]" med föregående/nästa, nya sektioner och
   kortet "Ingår i mallen". Annars body.promptsteg-off och sidan
   ser ut som förut.

   Stegen i mallen (titlar, ordning, adresser) läses från mallsidan
   (/ai-mallar/<slug>), som redan listar dem som stegkort.
============================================================ */
(function () {
  'use strict';

  var CSS = [
    '[data-promptsteg="wrap"] [hidden],[data-promptsteg="meta"]{display:none!important}',
    'body.promptsteg-off [data-promptsteg="wrap"]{display:none!important}',
    '.ps-banner{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;background:#0b1f3b;border-radius:16px;padding:14px 20px;margin:0 0 20px}',
    '.ps-dots{display:flex;gap:6px;align-items:center}',
    '.ps-dots a,.ps-dots span{display:block;width:10px;height:10px;border-radius:50%;background:#5b6b82}',
    '.ps-dots .is-done{background:#00c9a7}',
    '.ps-dots .is-here{width:28px;border-radius:6px;background:#ffd23f}',
    '.ps-banner-text{margin:0!important;flex:1 1 260px;color:#f5f6fa!important;font-size:15px!important;line-height:1.5!important}',
    '.ps-banner-text a{color:#4cd9c1!important;font-weight:600;text-decoration:none}',
    '.ps-banner-text a:hover{text-decoration:underline}',
    '.ps-prev{color:#ced2d7!important;font-size:14px;text-decoration:none;padding:10px 12px;border-radius:10px;border:1px solid #3a4c68;white-space:nowrap}',
    '.ps-prev:hover{border-color:#4cd9c1;color:#fff!important}',
    '.ps-next{color:#0b1f3b!important;background:#ffd23f;font-size:14px;font-weight:600;text-decoration:none;padding:10px 14px;border-radius:10px}',
    '.ps-next:hover{background:#ffdf78}',
    '.ps-badge{display:inline-flex;align-items:center;background:#fff3c4;color:#665419;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px}',
    '.ps-nar{background:#f5f6fa;border-radius:16px;padding:16px 20px;margin:4px 0 20px}',
    '.ps-nar-label{margin:0 0 4px!important;font-size:13px!important;font-weight:600;color:#005042!important}',
    '.ps-nar-text{margin:0!important;font-size:15px!important;line-height:1.6!important;color:#313a47}',
    '.ps-tips{margin:10px 0 0!important;font-size:13px!important;color:#5b6573!important;text-align:center}',
    '.ps-sektioner{padding:8px 0 0}',
    '.ps-h2{margin:48px 0 14px!important;font-size:28px!important;line-height:1.2!important;color:#0b1f3b}',
    '.ps-sektioner > .ps-h2:first-child{margin-top:40px!important}',
    '.ps-exempel{border:1px solid #e6e8ec;border-radius:20px;padding:22px 24px;background:#fff}',
    '.ps-exempel p{font-size:15px;line-height:1.7;color:#313a47;margin:0 0 8px}',
    '.ps-exempel p:last-child{margin-bottom:0}',
    '.ps-pill{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;margin:0 2px;vertical-align:1px}',
    '.ps-pill.is-fakta{background:#e5f9f6;color:#005042}',
    '.ps-pill.is-hypotes{background:#fff3c4;color:#665419}',
    '.ps-nasta-intro{margin:0 0 12px!important;font-size:15px!important;color:#5b6573!important}',
    '.ps-nasta{display:flex;flex-wrap:wrap;gap:12px;align-items:center;background:#e5f9f6;border-radius:16px;padding:18px 20px}',
    '.ps-nasta-text{margin:0!important;flex:1 1 360px;font-size:15px!important;line-height:1.6!important;color:#1b2a26}',
    '.ps-kopiera{background:#fff;color:#005042;border:1px solid #4cd9c1;border-radius:10px;padding:12px 16px;font-size:14px;font-weight:600;min-height:44px;cursor:pointer;font-family:inherit}',
    '.ps-kopiera.is-copied{background:#00c9a7;color:#0b1f3b;border-color:#00c9a7}',
    '.ps-misstag p{font-size:16px;line-height:1.7;color:#313a47}',
    '.ps-apan{margin-top:40px}',
    '.ps-aside{display:flex;flex-direction:column;gap:16px;align-self:start;min-width:0}',
    '.ps-aside .promptgeneratorn-puff{align-self:stretch}',
    '.ps-mall{border:1px solid #e6e8ec;border-radius:24px;padding:22px;background:#fff}',
    '.ps-mall-label{margin:0 0 4px!important;font-size:12px!important;letter-spacing:.04em;text-transform:uppercase;color:#5b6573!important}',
    '.ps-mall-namn{display:block;margin:0 0 14px;font-size:22px;font-weight:700;line-height:1.2;color:#0b1f3b!important;text-decoration:none}',
    '.ps-mall-namn:hover{color:#00806b!important}',
    '.ps-mall ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}',
    '.ps-mall li a,.ps-mall li > span{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;font-size:14px;line-height:1.35;color:#313a47;text-decoration:none}',
    '.ps-mall li a:hover{background:#f5f6fa}',
    '.ps-mall li.is-here > span{background:#e5f9f6;color:#005042;font-weight:600}',
    '.ps-mall li i{font-style:normal;width:24px;height:24px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:12px;border:1px solid #ced2d7;color:#5b6573}',
    '.ps-mall li.is-here i{background:#0b1f3b;border-color:#0b1f3b;color:#fff}',
    '.ps-mall-hela{display:inline-block;margin-top:12px;font-size:14px;color:#00806b!important}',
    '@media (max-width:767px){.ps-banner{padding:14px 16px}.ps-prev,.ps-next{flex:1 1 auto;text-align:center}.ps-h2{font-size:22px!important;margin-top:36px!important}.ps-exempel{padding:18px}}'
  ].join('\n');

  function txt(key) {
    var el = document.querySelector('[data-promptsteg="' + key + '"]');
    return el && !el.classList.contains('w-dyn-bind-empty') ? el.textContent.trim() : '';
  }
  function node(key) {
    var el = document.querySelector('[data-promptsteg="' + key + '"]');
    return el && !el.classList.contains('w-dyn-bind-empty') && el.textContent.trim() ? el : null;
  }
  function make(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function shortName(n) { return n.split(/\s*[:—–]\s+|\s+[—–]\s*/)[0].trim(); }
  function resanNamn(roll) {
    if (!roll) return '';
    if (SAMLING[roll]) return SAMLING[roll];
    return (roll.slice(-1) === 'e' ? roll.slice(0, -1) : roll) + 'resan';
  }
  /* Samlingssidor (pillar-typ Samlingssida) har delar i stället för faser */
  var SAMLING = { 'Småföretagare': 'Din AI-avdelning' };
  function enhet(roll) { return SAMLING[roll] ? 'del' : 'fas'; }
  var PILLAR_URL = {
    saljare: '/ai-for-saljare',
    smaforetagare: '/ai-for-smaforetagare',
    marknadsforare: '/ai-for-marknadsforing-sociala-medier'
  };

  var slug = location.pathname.split('/').filter(Boolean).pop() || '';
  var steg = 0, mallSlug = '', mallNamn = '';

  function track(event, params) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event, mall: mallSlug, steg: steg, prompt: slug };
    for (var k in params) o[k] = params[k];
    window.dataLayer.push(o);
  }

  function copy(text, btn, label) {
    function ok() {
      btn.textContent = 'Kopierad!';
      btn.classList.add('is-copied');
      setTimeout(function () { btn.textContent = label; btn.classList.remove('is-copied'); }, 2500);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }

  /* Hämtar mallsidan och läser ut stegen ur stegkorten */
  function loadMall(cb) {
    var done = false;
    function finish(d) { if (!done) { done = true; cb(d); } }
    setTimeout(function () { finish(null); }, 6000);
    try {
      fetch('/ai-mallar/' + encodeURIComponent(mallSlug), { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (html) {
          if (!html) return finish(null);
          var doc = new DOMParser().parseFromString(html, 'text/html');
          function t(root, sel) {
            var e = root.querySelector(sel);
            return e && !e.classList.contains('w-dyn-bind-empty') ? e.textContent.trim() : '';
          }
          var steps = Array.prototype.slice.call(doc.querySelectorAll('[data-mall-v2="steg"] .stegkort')).map(function (c) {
            return { n: parseInt(t(c, '.stegkort-num'), 10) || 0, titel: t(c, '.stegkort-titel'), slug: t(c, '[data-stegkort="slug"]') };
          }).filter(function (s) { return s.n > 0 && s.titel; });
          steps.sort(function (a, b) { return a.n - b.n; });
          finish({ steps: steps, roll: t(doc, '[data-mall-meta="roll"]'), rollSlug: t(doc, '[data-mall-meta="rollslug"]') });
        })['catch'](function () { finish(null); });
    } catch (e) { finish(null); }
  }

  function buildBanner(steps, roll, fas) {
    var total = steps.length;
    var idx = -1;
    steps.forEach(function (s, i) { if (s.n === steg) idx = i; });
    var b = make('div', 'ps-banner');
    b.setAttribute('role', 'navigation');
    b.setAttribute('aria-label', 'Steg i mallen');
    if (total > 1) {
      var dots = make('div', 'ps-dots');
      steps.forEach(function (s, i) {
        var d = s.n === steg ? make('span', 'is-here') : make('a', i < idx ? 'is-done' : '');
        if (s.n !== steg && s.slug) { d.href = '/ai-prompter/' + s.slug; d.setAttribute('aria-label', 'Steg ' + s.n + ': ' + s.titel); }
        dots.appendChild(d);
      });
      b.appendChild(dots);
    }
    var p = make('p', 'ps-banner-text');
    p.appendChild(document.createTextNode('Steg ' + steg + (total ? ' av ' + total : '') + ' i '));
    var a = make('a', '', shortName(mallNamn));
    a.href = '/ai-mallar/' + mallSlug;
    p.appendChild(a);
    if (roll && fas) p.appendChild(document.createTextNode(' · ' + resanNamn(roll) + ', ' + enhet(roll) + ' ' + fas));
    b.appendChild(p);
    var prev = idx > 0 ? steps[idx - 1] : null;
    var next = idx > -1 && idx < total - 1 ? steps[idx + 1] : null;
    if (prev && prev.slug) {
      var pa = make('a', 'ps-prev', '← Steg ' + prev.n);
      pa.href = '/ai-prompter/' + prev.slug;
      pa.title = prev.titel;
      pa.addEventListener('click', function () { track('prompt_steg_nav', { till: prev.n, riktning: 'bakat' }); });
      b.appendChild(pa);
    }
    var na = make('a', 'ps-next');
    if (next && next.slug) {
      na.textContent = 'Steg ' + next.n + ': ' + next.titel + ' →';
      na.href = '/ai-prompter/' + next.slug;
      na.addEventListener('click', function () { track('prompt_steg_nav', { till: next.n, riktning: 'framat' }); });
    } else {
      na.textContent = (total && idx === total - 1 ? 'Sista steget! Tillbaka till ' : 'Hela mallen: ') + shortName(mallNamn) + ' →';
      na.href = '/ai-mallar/' + mallSlug;
    }
    b.appendChild(na);
    return b;
  }

  function buildMallKort(steps) {
    var k = make('div', 'ps-mall');
    k.appendChild(make('p', 'ps-mall-label', 'Ingår i mallen'));
    var n = make('a', 'ps-mall-namn', shortName(mallNamn));
    n.href = '/ai-mallar/' + mallSlug;
    k.appendChild(n);
    var ol = make('ol');
    steps.forEach(function (s) {
      var li = make('li', s.n === steg ? 'is-here' : '');
      var inner = s.n === steg || !s.slug ? make('span') : make('a');
      if (inner.tagName === 'A') inner.href = '/ai-prompter/' + s.slug;
      if (s.n === steg) inner.setAttribute('aria-current', 'step');
      inner.appendChild(make('i', '', String(s.n)));
      inner.appendChild(document.createTextNode(s.titel));
      li.appendChild(inner);
      ol.appendChild(li);
    });
    k.appendChild(ol);
    var h = make('a', 'ps-mall-hela', 'Kör hela mallen →');
    h.href = '/ai-mallar/' + mallSlug;
    k.appendChild(h);
    return k;
  }

  /* "(Fakta …)" och "(Hypotes)" i exemplen blir små etiketter */
  function pills(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var list = [], t;
    while ((t = walker.nextNode())) if (/\((Fakta|Hypotes)[^)]*\)/.test(t.nodeValue)) list.push(t);
    list.forEach(function (tn) {
      var frag = document.createDocumentFragment();
      var parts = tn.nodeValue.split(/(\((?:Fakta|Hypotes)[^)]*\))/);
      parts.forEach(function (part, i) {
        var m = /^\((Fakta|Hypotes)([^)]*)\)$/.exec(part);
        /* "Utmaning 2 (Hypotes): text" → "Utmaning 2: [Hypotes] text" */
        if (m && /^:/.test(parts[i + 1] || '')) {
          frag.appendChild(document.createTextNode(':'));
          parts[i + 1] = parts[i + 1].slice(1);
          var prevTxt = frag.childNodes[frag.childNodes.length - 2];
          if (prevTxt && prevTxt.nodeType === 3) prevTxt.nodeValue = prevTxt.nodeValue.replace(/\s+$/, '');
          frag.appendChild(document.createTextNode(' '));
        }
        if (m) {
          var s = make('span', 'ps-pill is-' + m[1].toLowerCase(), m[1] + m[2].replace(/^:\s*/, ': ').replace(/^\s+$/, ''));
          frag.appendChild(s);
        } else if (part) frag.appendChild(document.createTextNode(part));
      });
      tn.parentNode.replaceChild(frag, tn);
    });
  }

  function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    steg = parseInt(txt('steg'), 10) || 0;
    mallSlug = txt('mallslug');
    mallNamn = txt('mallnamn');
    /* Sista brödsmulan pekade på /ai-termer: låt den peka på sidan själv */
    try {
      var bc = document.querySelectorAll('.breadcrumb_component .breadcrumb-link');
      if (bc.length >= 3) bc[bc.length - 1].setAttribute('href', location.pathname);
    } catch (e) {}

    var wrap = document.querySelector('[data-promptsteg="wrap"]');
    if (!steg || !mallSlug || !wrap) { document.body.classList.add('promptsteg-off'); return; }
    document.body.classList.add('promptsteg-on');

    var card = document.querySelector('.prompt-container.prompt-large');
    var promptEl = card && card.querySelector('.prompt-copy-text.prompt-copy');
    var promptText = promptEl ? (promptEl.getAttribute('data-pm-raw') || promptEl.textContent || '') : '';
    var fas = parseInt(txt('mallfas'), 10) || 0;

    /* Brödsmulor: AI-Prompter → mallen */
    try {
      var crumbs = document.querySelectorAll('.breadcrumb_component .breadcrumb-link');
      if (crumbs.length >= 3) {
        crumbs[1].href = '/ai-mallar/' + mallSlug;
        var cl = crumbs[1].querySelector('div') || crumbs[1];
        cl.textContent = shortName(mallNamn);
      }
    } catch (e) {}

    /* "Bygger på steg N" när prompten tar in ett tidigare svar */
    if (steg > 1 && /klistra in [^\]]*fr[åa]n (steg|fas|kundkort)/i.test(promptText)) {
      var meta = card.querySelector('.blog40_meta-wrapper');
      /* "från steg 2", "från steg 1 och 2", "från steg 1–3" */
      var nums = [], re = /fr[åa]n steg (\d+(?:\s*(?:[–-]|,|och)\s*\d+)*)/gi, mm;
      function add(v) { if (v > 0 && v < steg && nums.indexOf(v) === -1) nums.push(v); }
      while ((mm = re.exec(promptText))) {
        mm[1].split(/\s*(?:,|och)\s*/i).forEach(function (part) {
          var r = /^(\d+)\s*[–-]\s*(\d+)$/.exec(part);
          if (r) { for (var k = +r[1]; k <= +r[2]; k++) add(k); } else add(parseInt(part, 10));
        });
      }
      nums.sort(function (a, b) { return a - b; });
      var fasM = /fr[åa]n fas (\d+)/i.exec(promptText);
      var lbl = nums.length > 1 ? 'Bygger på steg ' + nums.slice(0, -1).join(', ') + ' och ' + nums[nums.length - 1]
        : nums.length ? 'Bygger på steg ' + nums[0] : fasM ? 'Bygger på fas ' + fasM[1] : 'Bygger på tidigare steg';
      if (meta) meta.appendChild(make('span', 'ps-badge', lbl));
    }

    /* När du använder den — mellan ingressen och prompten */
    var nar = txt('nar');
    var code = card && card.querySelector('.code-container');
    if (nar && code) {
      var box = make('div', 'ps-nar');
      box.appendChild(make('p', 'ps-nar-label', 'När du använder den'));
      box.appendChild(make('p', 'ps-nar-text', nar));
      code.parentNode.insertBefore(box, code);
    }

    /* Generatorknappen: samma länk som förut + mall/steg, och pg_chain för kedjeläget */
    function fixAnpassa() {
      var a = card && card.querySelector('.anpassa-btn-wrapper a');
      if (!a || a.getAttribute('data-ps')) return !!a;
      a.setAttribute('data-ps', '1');
      a.textContent = 'Fyll i med Promptgeneratorn →';
      var href = a.getAttribute('href') || '';
      if (href.indexOf('mall=') === -1) a.setAttribute('href', href + (href.indexOf('?') === -1 ? '?' : '&') + 'mall=' + encodeURIComponent(mallSlug) + '&steg=' + steg);
      a.addEventListener('click', function () {
        track('prompt_steg_anpassa', {});
        try {
          sessionStorage.setItem('pg_chain', JSON.stringify({ mall: mallSlug, mallNamn: shortName(mallNamn), steg: steg, total: (window.__psSteps || []).length,
            steps: (window.__psSteps || []).map(function (s) { return { steg: s.n, titel: s.titel }; }) }));
          sessionStorage.setItem('pg_from', location.pathname);
        } catch (e) {}
      });
      return true;
    }
    if (!fixAnpassa()) { var tries = 0; var iv = setInterval(function () { if (fixAnpassa() || ++tries > 20) clearInterval(iv); }, 150); }

    /* Sektionerna under promptkortet */
    var sek = make('div', 'ps-sektioner');
    var ex = node('exempel');
    if (ex) {
      sek.appendChild(make('h2', 'ps-h2', 'Exempel på svar'));
      var exBox = make('div', 'ps-exempel text-rich-text w-richtext');
      while (ex.firstChild) exBox.appendChild(ex.firstChild);
      try { pills(exBox); } catch (e) {}
      sek.appendChild(exBox);
    }
    var nasta = txt('nasta');
    if (nasta) {
      sek.appendChild(make('h2', 'ps-h2', 'Nästa drag'));
      sek.appendChild(make('p', 'ps-nasta-intro', 'Ställ den här följdfrågan i samma chatt när du fått svaret.'));
      var nb = make('div', 'ps-nasta');
      nb.appendChild(make('p', 'ps-nasta-text', nasta));
      var kb = make('button', 'ps-kopiera', 'Kopiera');
      kb.type = 'button';
      kb.addEventListener('click', function () { copy(nasta, kb, 'Kopiera'); track('prompt_steg_kopiera_nasta', {}); });
      nb.appendChild(kb);
      sek.appendChild(nb);
    }
    var mi = node('misstag');
    if (mi) {
      sek.appendChild(make('h2', 'ps-h2', 'Vanliga misstag'));
      var miBox = make('div', 'ps-misstag text-rich-text w-richtext');
      while (mi.firstChild) miBox.appendChild(mi.firstChild);
      sek.appendChild(miBox);
    }
    var ap = node('apan');
    if (ap) {
      var at = make('div', 'apan-tycker shadow-medium ps-apan');
      at.innerHTML = '<div class="w-layout-vflex apan-icon-holder"><img src="https://cdn.prod.website-files.com/69a9596bad3505a90ea79eb6/6aad2a5e72f1087b78996698_apa.png" loading="eager" alt="" class="apan-icon"></div>' +
        '<div class="w-layout-vflex apan-text-wrapper"><div class="apa-title">Apan tycker</div><div class="w-richtext"></div></div>';
      var atBody = at.querySelector('.w-richtext');
      while (ap.firstChild) atBody.appendChild(ap.firstChild);
      sek.appendChild(at);
    }
    if (sek.children.length) wrap.parentNode.insertBefore(sek, wrap);

    /* Banner + mallkort (behöver stegen från mallsidan) */
    var cols = document.querySelector('.header-columns');
    var bannerHost = cols ? cols.parentNode : null;
    loadMall(function (d) {
      var steps = d && d.steps.length ? d.steps : [];
      if (!steps.some(function (s) { return s.n === steg; })) steps = [];
      window.__psSteps = steps;
      try {
        var banner = buildBanner(steps, d ? d.roll : '', fas);
        if (bannerHost) bannerHost.insertBefore(banner, cols);
      } catch (e) {}
      if (steps.length) {
        try {
          var puff = cols && cols.querySelector('.promptgeneratorn-puff');
          if (puff) {
            var aside = make('div', 'ps-aside');
            puff.parentNode.insertBefore(aside, puff);
            aside.appendChild(buildMallKort(steps));
            aside.appendChild(puff);
          }
        } catch (e) {}
      }
      if (d && d.rollSlug && PILLAR_URL[d.rollSlug]) {
        var pl = document.querySelector('.ps-banner-text');
        if (pl && pl.lastChild && pl.lastChild.nodeType === 3 && /(resan|avdelning), (fas|del) /.test(pl.lastChild.nodeValue)) {
          var txtNode = pl.lastChild;
          var link = make('a', '', txtNode.nodeValue.replace(/^ · /, ''));
          link.href = PILLAR_URL[d.rollSlug];
          link.style.fontWeight = '400';
          pl.replaceChild(document.createTextNode(' · '), txtNode);
          pl.appendChild(link);
        }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
