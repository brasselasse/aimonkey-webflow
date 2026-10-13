/* ============================================================
   AIMonkey — paket-sida.js (Projektpaket Template)
   Gör ett projektpaket i CMS:et till en sida med fyra delar:
   1 instruktionerna (går att anpassa och kopiera), 2 filerna,
   3 startprompterna, 4 kopplingar till verktyg.

   Webflow-struktur (Designer, sidan Projektpaket Template):
     [data-paket="app"]
       [data-paket="etikett"]  ← Etikett
       h1[data-paket="namn"]   ← Name
       [data-paket="forvem"]   ← För vem
       [data-paket="data"]     dolda fält [data-f="…"] (se FALT nedan)
       [data-paket="kopplingar"] Collection list, källa: paketets
                                 referensfält Kopplingar. Varje post:
                                 [data-koppling="item"] med [data-k="…"]
       [data-paket="apan"]     RichText ← Apan tycker
   Allt annat byggs av skriptet. Utan [data-paket="app"] gör det inget.
============================================================ */
(function () {
  'use strict';

  var app = document.querySelector('[data-paket="app"]');
  if (!app) return;

  var CSS = [
    '[data-paket="data"],[data-paket="kopplingar"]{display:none!important}',
    '[data-paket="app"]{max-width:880px;margin:0 auto}',
    '.pp-overst{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-bottom:14px}',
    '[data-paket="etikett"]{display:inline-flex;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#005042;background:#e5f9f6;border-radius:999px;padding:6px 12px}',
    '.pp-pillar{font-size:14px;color:#00806b;text-decoration:none}',
    '.pp-pillar:hover{text-decoration:underline}',
    '[data-paket="namn"]{margin:0 0 12px}',
    '[data-paket="forvem"]{margin:0 0 18px;color:#3d4a5c;max-width:680px}',
    '.pp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 36px;padding:0;list-style:none}',
    '.pp-chips li{font-size:14px;color:#24384f;border:1.5px solid #dbe2ea;border-radius:999px;padding:6px 12px;background:#fff}',
    '.pp-del{margin:0 0 40px}',
    '.pp-dellabel{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5b6573;margin:0 0 10px}',
    '.pp-kort{background:#fff;border:1.5px solid #e1e7ee;border-radius:20px;padding:24px 26px}',
    '.pp-kort + .pp-kort{margin-top:14px}',
    '.pp-h2{font-size:24px!important;line-height:1.2!important;margin:0 0 6px!important;color:#0b1f3b}',
    '.pp-ingress{margin:0 0 18px;font-size:15px;line-height:1.55;color:#4a5668}',
    '.pp-tjanster{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 28px;align-items:center}',
    '.pp-tjanster span{font-size:15px;font-weight:600;color:#3d4a5c;margin-right:6px}',
    '.pp-tab{font:inherit;font-size:16px;font-weight:700;padding:10px 20px;min-height:46px;border-radius:999px;cursor:pointer;background:#fff;color:#0b1f3b;border:2px solid #c9d3de}',
    '.pp-tab[aria-pressed="true"]{background:#0b1f3b;color:#fff;border-color:#0b1f3b}',
    '.pp-falt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 18px}',
    '.pp-falt label{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600;color:#3d4a5c}',
    '.pp-falt input{font:inherit;font-size:16px;font-weight:400;min-height:48px;padding:10px 14px;border:2px solid #d3dbe4;border-radius:12px;background:#fff;color:#0b1f3b;width:100%;box-sizing:border-box}',
    '.pp-falt input:focus,.pp-reglerlista input:focus-visible{outline:none;border-color:#00c9a7;box-shadow:0 0 0 4px rgba(0,201,167,.2)}',
    '.pp-regler{background:#e5f9f6;border:1.5px solid #bfeee5;border-radius:16px;padding:16px 18px;margin:0 0 18px}',
    '.pp-regler p{margin:0 0 10px;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#005042}',
    '.pp-reglerlista{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}',
    '.pp-reglerlista label{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45;color:#0b1f3b;cursor:pointer}',
    '.pp-reglerlista input{width:18px;height:18px;margin-top:2px;flex-shrink:0;accent-color:#00806b}',
    '.pp-reglerlista em{font-style:normal;font-weight:600;color:#005042}',
    '.pp-instr{border:2px solid #00c9a7;border-radius:18px;padding:20px 22px;background:#fff}',
    '.pp-instr-topp{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:14px;color:#4a5668;margin-bottom:10px}',
    '.pp-instr-topp strong{color:#005042}',
    '.pp-instr pre{margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:16px;line-height:1.6;color:#0b1f3b;max-height:520px;overflow:auto}',
    '.pp-knappar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:16px}',
    '.pp-kopiera{font:inherit;font-size:18px;font-weight:700;padding:16px 28px;min-height:56px;border-radius:14px;border:0;background:#ffd23f;color:#0b1f3b;cursor:pointer}',
    '.pp-kopiera:hover{background:#ffdf78}',
    '.pp-kopiera.is-kopierad,.pp-liten.is-kopierad{background:#00c9a7;color:#0b1f3b;border-color:#00c9a7}',
    '.pp-knappar small{font-size:14px;color:#4a5668}',
    '.pp-guide ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;counter-reset:pp}',
    '.pp-guide li{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.5;counter-increment:pp}',
    '.pp-guide li:before{content:counter(pp);width:28px;height:28px;border-radius:50%;background:#0b1f3b;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}',
    '.pp-tips{margin:14px 0 0;font-size:15px;line-height:1.5;color:#24433d;background:#e5f9f6;border-radius:12px;padding:12px 14px}',
    '.pp-filer{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}',
    '.pp-fil{display:flex;gap:14px;align-items:center;width:100%;text-align:left;font:inherit;font-size:16px;color:#0b1f3b;background:#fff;border:1.5px solid #dbe2ea;border-radius:14px;padding:12px 16px;min-height:56px;cursor:pointer}',
    '.pp-fil i{font-style:normal;width:26px;height:26px;border-radius:8px;border:2px solid #c9d3de;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0}',
    '.pp-fil b{display:block;font-weight:600}',
    '.pp-fil span span{display:block;font-size:14px;color:#4a5668}',
    '.pp-fil[aria-pressed="true"]{background:#e5f9f6;border-color:#bfeee5}',
    '.pp-fil[aria-pressed="true"] i{background:#00c9a7;border-color:#00c9a7;color:#0b1f3b}',
    '.pp-start{display:flex;flex-direction:column;gap:12px}',
    '.pp-startkort{border:1.5px solid #dbe2ea;border-radius:16px;padding:16px 18px}',
    '.pp-startkort-topp{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:6px 12px;margin-bottom:10px}',
    '.pp-startkort-topp strong{font-size:18px;color:#0b1f3b}',
    '.pp-startkort-topp a{font-size:14px;font-weight:600;color:#00806b}',
    '.pp-startkort p{margin:0 0 12px;font-size:16px;line-height:1.55;color:#24384f;background:#f2f6f9;border-radius:12px;padding:12px 14px}',
    '.pp-liten{font:inherit;font-size:15px;font-weight:600;padding:10px 18px;min-height:44px;border-radius:12px;border:1.5px solid #0b1f3b;background:#fff;color:#0b1f3b;cursor:pointer}',
    '.pp-kopplingar{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}',
    '.pp-koppling{display:flex;flex-direction:column;gap:10px;border:1.5px solid #dbe2ea;border-radius:16px;padding:16px 18px;background:#fff}',
    '.pp-koppling.is-vald{border:2px solid #00c9a7;background:#f6fdfb}',
    '.pp-koppling-topp{display:flex;gap:12px;align-items:center}',
    '.pp-ikon{width:42px;height:42px;flex-shrink:0;border-radius:12px;background:#0b1f3b;color:#4cd9c1;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}',
    '.pp-koppling-topp b{display:block;font-size:17px;color:#0b1f3b}',
    '.pp-koppling-topp small{display:block;font-size:13px;color:#4a5668}',
    '.pp-koppling > span{font-size:15px;line-height:1.5;color:#24384f;flex-grow:1}',
    '.pp-badge{align-self:flex-start;font-size:13px;font-weight:600;padding:5px 10px;border-radius:999px}',
    '.pp-badge.is-finns{background:#e5f9f6;color:#005042}',
    '.pp-badge.is-saknas{background:#eef1f5;color:#4a5668}',
    '.pp-badge.is-kolla{background:#fff4cc;color:#6b5200}',
    '.pp-koppling .pp-liten[aria-pressed="true"]{background:#0b1f3b;color:#fff}',
    '.pp-sakerhet{display:flex;gap:14px;align-items:flex-start;margin-top:16px;background:#fff7db;border:1.5px solid #f2dc8a;border-radius:14px;padding:14px 16px;font-size:15px;line-height:1.5;color:#3d3410}',
    '.pp-sakerhet strong{display:block;margin-bottom:4px}',
    '.pp-sakerhet a{color:#00664f;font-weight:600}',
    '.pp-sakerhet svg{flex-shrink:0;margin-top:2px}',
    '.pp-koll{display:block;margin-top:12px;font-size:13px;color:#5b6573}',
    '.pp-inga{margin:0;font-size:16px;color:#24433d;background:#e5f9f6;border-radius:12px;padding:12px 16px}',
    '.pp-skillnad{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;background:#f2f6f9;border-radius:18px;padding:18px 22px;margin:0 0 40px}',
    '.pp-skillnad p{flex:1 1 380px;margin:0;font-size:15px;line-height:1.55;color:#3d4a5c}',
    '.pp-skillnad a{font-weight:600;color:#00806b;white-space:nowrap}',
    '[data-paket="apan"]{display:flex;gap:14px;align-items:flex-start;background:#0b1f3b;color:#e8edf3;border-radius:20px;padding:20px 22px}',
    '[data-paket="apan"]:before{content:"Apan tycker:";font-weight:700;color:#4cd9c1;white-space:nowrap}',
    '[data-paket="apan"] p{margin:0;color:#e8edf3;font-size:16px;line-height:1.55}',
    '[data-paket="apan"].pp-tom{display:none}',
    '@media (max-width:767px){.pp-falt{grid-template-columns:1fr}.pp-kort{padding:18px}[data-paket="apan"]{flex-direction:column;gap:6px}.pp-kopiera{width:100%}}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  /* ── Läs CMS-fälten ── */
  function textAv(el) {
    if (!el || el.classList.contains('w-dyn-bind-empty')) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    return (tmp.textContent || '').replace(/\r/g, '').trim();
  }
  function f(key) { return textAv(app.querySelector('[data-paket="data"] [data-f="' + key + '"]')); }
  function rader(s) { return s.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var P = {
    slug: f('slug') || (location.pathname.split('/').filter(Boolean).pop() || ''),
    namn: textAv(app.querySelector('[data-paket="namn"]')),
    projekt: f('projekttext'),
    roll: f('roll'),
    ton: f('ton'),
    tilltal: f('tilltal'),
    exForetag: f('exempel-foretag'),
    exErbjudande: f('exempel-erbjudande'),
    exMalgrupp: f('exempel-malgrupp'),
    regler: rader(f('regler')),
    arbete: rader(f('arbetssatt')),
    filer: rader(f('filer')).map(function (r) {
      var d = r.split('|');
      return { namn: d[0].trim(), varfor: (d[1] || '').trim() };
    }),
    start: [1, 2, 3].map(function (n) {
      return { titel: f('sp' + n + 't'), prompt: f('sp' + n), mall: f('sp' + n + 'm'), mallSlug: f('sp' + n + 's') };
    }).filter(function (s) { return s.prompt; }),
    rollNamn: f('rollnamn'),
    rollSlug: f('rollslug')
  };

  var kopplingar = [].slice.call(document.querySelectorAll('[data-paket="kopplingar"] [data-koppling="item"]')).map(function (it) {
    function k(key) { return textAv(it.querySelector('[data-k="' + key + '"]')); }
    return {
      slug: k('slug'), namn: k('namn'), exempel: k('exempel'), ikon: k('ikon'), gor: k('gor'), rad: k('rad'),
      status: { chatgpt: k('chatgpt'), claude: k('claude'), gemini: k('gemini'), copilot: k('copilot') },
      datum: k('datum')
    };
  }).filter(function (x) { return x.namn; });

  /* ── Lagring (per webbläsare, tål blockerad lagring) ── */
  function las(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function spara(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  /* Samma "fyll i en gång"-lager som promptgeneratorns kedjeläge */
  var KEDJA = 'pg_kedja';
  var FYLL = { foretag: '[DITT FÖRETAG]', gor: '[DIN PRODUKT/TJÄNST]', malgrupp: '[MÅLGRUPP]' };
  var kedja = las(KEDJA, {});
  if (!kedja || typeof kedja !== 'object') kedja = {};
  kedja.fyll = kedja.fyll || {};
  kedja.mallar = kedja.mallar || {};

  var TJANSTER = {
    chatgpt: { namn: 'ChatGPT', var: 'ChatGPT-projekt', steg: ['Öppna ChatGPT och klicka på Projekt i sidomenyn.', 'Skapa ett nytt projekt och ge det ett namn, t.ex. ”' + (P.namn || 'Mitt projekt') + '”.', 'Öppna projektets inställningar och välj Instruktioner.', 'Klistra in texten och spara. Nu gäller den i alla samtal i projektet.'], tips: 'Ladda upp filerna nedan i projektet, så hämtar AI:n fakta därifrån.' },
    claude: { namn: 'Claude', var: 'Claude-projekt', steg: ['Öppna Claude och gå till Projekt.', 'Skapa ett nytt projekt och ge det ett namn, t.ex. ”' + (P.namn || 'Mitt projekt') + '”.', 'Klicka på rutan för projektets instruktioner.', 'Klistra in texten och spara. Starta sen nya samtal inifrån projektet.'], tips: 'Lägg filerna nedan i projektets kunskap, så slipper du klistra in dem i varje samtal.' },
    gemini: { namn: 'Gemini', var: 'Gemini Gem', steg: ['Öppna Gemini och gå till Gems.', 'Klicka på Ny Gem och ge den ett namn.', 'Klistra in texten i fältet Instruktioner.', 'Spara. Nu hittar du din Gem i sidomenyn.'], tips: 'Du kan lägga till filerna nedan som kunskap i din Gem.' },
    copilot: { namn: 'Copilot', var: 'Copilot-agent', steg: ['Öppna Microsoft 365 Copilot och välj Skapa agent.', 'Gå till fliken Konfigurera och ge agenten ett namn.', 'Klistra in texten i fältet Instruktioner.', 'Spara. Du kan dela agenten med kollegor om du vill.'], tips: 'Kräver oftast ett jobbkonto med Copilot. Fråga IT om du inte hittar knappen.' }
  };
  var ORDNING = ['chatgpt', 'claude', 'gemini', 'copilot'];
  var PILLAR_URL = { saljare: '/ai-for-saljare', smaforetagare: '/ai-for-smaforetagare', marknadsforare: '/ai-for-marknadsforing-sociala-medier' };
  var TON = { 'Vänlig': 'varm och personlig', 'Professionell': 'saklig och förtroendeingivande', 'Direkt': 'kort och rakt på sak', 'Kreativ': 'lekfull, med glimt i ögat', 'Övertygande': 'får läsaren att vilja agera', 'Akademisk': 'noggrann och resonerande' };
  var GDPR_URL = '/artiklar/ai-och-gdpr-vad-du-maste-veta-som-foretagare';

  var S = {
    tjanst: las('aim_paket_tjanst', 'chatgpt'),
    du: {
      foretag: kedja.fyll[FYLL.foretag] || '',
      gor: kedja.fyll[FYLL.gor] || '',
      malgrupp: kedja.fyll[FYLL.malgrupp] || ''
    },
    av: las('aim_paket_av_' + P.slug, []),         /* bortklickade regler/arbetssätt */
    filer: las('aim_paket_filer_' + P.slug, []),    /* bockade filer (index) */
    kopp: las('aim_paket_kopp_' + P.slug, [])       /* valda kopplingar (slug) */
  };
  if (!TJANSTER[S.tjanst]) S.tjanst = 'chatgpt';

  function track(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event, paket: P.slug, tjanst: S.tjanst };
    for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }

  /* ── Instruktionerna ── */
  function punkt(t) { return '- ' + t.replace(/[.\s]+$/, '') + '.'; }
  function aktiv(t) { return S.av.indexOf(t) === -1; }
  function instruktioner() {
    var r = [];
    r.push('# Om projektet');
    r.push('Det här projektet handlar om: ' + (P.projekt || P.namn).replace(/[.\s]+$/, '') + '.');
    r.push(S.du.foretag ? 'Vem jag är: ' + S.du.foretag : '[FYLL I: ditt namn eller företag]');
    r.push(S.du.gor ? 'Det vi gör: ' + S.du.gor : '[FYLL I: vad du gör eller säljer]');
    r.push(S.du.malgrupp ? 'Vi pratar mest med: ' + S.du.malgrupp : '[FYLL I: vilka du pratar med]');
    r.push('', '# Din roll');
    r.push((P.roll || 'Var min erfarna medhjälpare').replace(/[.\s]+$/, '') + ' i det här projektet. Använd det du vet om mig ovan i varje svar, utan att jag behöver upprepa det.');
    var arbete = P.arbete.filter(aktiv);
    if (arbete.length) { r.push('', '# Så jobbar vi'); arbete.forEach(function (a) { r.push(punkt(a)); }); }
    if (P.filer.length) {
      r.push('', '# Filer i projektet');
      r.push('Jag har laddat upp: ' + P.filer.map(function (x) { return x.namn.charAt(0).toLowerCase() + x.namn.slice(1); }).join(', ') + '. Använd dem som källa och säg till om något saknas.');
    }
    var valda = kopplingar.filter(function (k) { return S.kopp.indexOf(k.slug) !== -1 && k.rad; });
    if (valda.length) { r.push('', '# Dina kopplingar'); valda.forEach(function (k) { r.push('- ' + k.rad); }); }
    r.push('', '# Röst och ton');
    r.push('Ton: ' + (P.ton ? P.ton.toLowerCase() + (TON[P.ton] ? ' – ' + TON[P.ton] : '') : 'vänlig och tydlig'));
    r.push('Tilltal: ' + (P.tilltal === 'Ni' ? 'ni' : 'du'));
    r.push('Språk: svenska');
    var regler = P.regler.filter(aktiv);
    var alltid = ['Fråga om något är oklart'].concat(regler.filter(function (x) { return /^alltid:/i.test(x); }).map(function (x) { return x.replace(/^alltid:\s*/i, ''); }));
    var aldrig = ['Hitta på fakta, siffror eller citat'].concat(regler.filter(function (x) { return /^aldrig:/i.test(x); }).map(function (x) { return x.replace(/^aldrig:\s*/i, ''); }));
    r.push('', '# Gör alltid'); alltid.forEach(function (a) { r.push(punkt(a)); });
    r.push('', '# Gör aldrig'); aldrig.forEach(function (a) { r.push(punkt(a)); });
    return r.join('\n');
  }

  function kopiera(text, knapp, klartText, ursprung) {
    function klart() {
      knapp.classList.add('is-kopierad');
      knapp.textContent = klartText;
      setTimeout(function () { knapp.classList.remove('is-kopierad'); knapp.textContent = ursprung; }, 2200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(klart, function () { fallback(); klart(); });
    } else { fallback(); klart(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ── Bygg sidan ── */
  var etikett = app.querySelector('[data-paket="etikett"]');
  var forvem = app.querySelector('[data-paket="forvem"]');
  var apan = app.querySelector('[data-paket="apan"]');
  if (apan && !textAv(apan)) apan.classList.add('pp-tom');

  if (etikett) {
    var topp = document.createElement('div');
    topp.className = 'pp-overst';
    etikett.parentNode.insertBefore(topp, etikett);
    topp.appendChild(etikett);
    if (P.rollSlug && PILLAR_URL[P.rollSlug]) {
      var pl = document.createElement('a');
      pl.className = 'pp-pillar';
      pl.href = PILLAR_URL[P.rollSlug];
      pl.textContent = 'Del av ' + (P.rollNamn ? 'AI för ' + P.rollNamn.toLowerCase() : 'resan') + ' →';
      topp.appendChild(pl);
    }
    if (!textAv(etikett)) etikett.style.display = 'none';
  }

  var root = document.createElement('div');
  root.className = 'pp-root';
  (forvem || app.querySelector('[data-paket="namn"]')).insertAdjacentElement('afterend', root);
  if (apan) root.insertAdjacentElement('afterend', apan);

  var chips = ['Klart på 10 minuter', P.filer.length + ' filer att ladda upp', P.start.length + ' startprompter', 'ChatGPT, Claude, Gemini och Copilot'];

  root.innerHTML =
    '<ul class="pp-chips">' + chips.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
    '<div class="pp-tjanster" role="group" aria-label="Välj AI-tjänst"><span>Var ska du använda det?</span>' +
      ORDNING.map(function (id) { return '<button type="button" class="pp-tab" data-tjanst="' + id + '" aria-pressed="false">' + TJANSTER[id].namn + '</button>'; }).join('') +
    '</div>' +

    '<section class="pp-del" aria-labelledby="pp-d1"><p class="pp-dellabel">Del 1 av 4 · Instruktionerna</p>' +
      '<div class="pp-kort">' +
        '<h2 class="pp-h2" id="pp-d1">Gör dem till dina</h2>' +
        '<p class="pp-ingress">Fyll i det paketet inte kan veta. Det sparas bara i din webbläsare och fylls i automatiskt i promptgeneratorn och mallarna.</p>' +
        '<div class="pp-falt">' +
          '<label>Namn eller företag<input data-du="foretag" autocomplete="organization" placeholder="' + esc(P.exForetag || 'T.ex. Bageriet i Gnesta') + '"></label>' +
          '<label>Vad du gör eller säljer<input data-du="gor" placeholder="' + esc(P.exErbjudande || 'T.ex. surdegsbröd och catering') + '"></label>' +
          '<label>Vilka du pratar med<input data-du="malgrupp" placeholder="' + esc(P.exMalgrupp || 'T.ex. barnfamiljer i Sörmland') + '"></label>' +
        '</div>' +
        ((P.regler.length || P.arbete.length) ?
        '<div class="pp-regler"><p>Från paketet · sånt man lätt glömmer</p><ul class="pp-reglerlista">' +
          P.regler.concat(P.arbete).map(function (t, i) {
            var m = /^(alltid|aldrig):\s*/i.exec(t);
            var visa = m ? '<em>' + (m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()) + ':</em> ' + esc(t.slice(m[0].length)) : esc(t);
            return '<li><label><input type="checkbox" data-regel="' + i + '"> <span>' + visa + '</span></label></li>';
          }).join('') +
        '</ul></div>' : '') +
        '<div class="pp-instr"><div class="pp-instr-topp"><strong data-pp="kortrubrik"></strong><span data-pp="tecken"></span></div><pre data-pp="instr"></pre></div>' +
        '<div class="pp-knappar"><button type="button" class="pp-kopiera" data-pp="kopiera">Kopiera instruktionerna</button><small>Klistra in dem en gång, sen gäller de i varje samtal.</small></div>' +
      '</div>' +
      '<div class="pp-kort pp-guide"><h3 class="pp-h2" data-pp="guiderubrik"></h3><ol data-pp="guide"></ol><p class="pp-tips" data-pp="tips"></p></div>' +
    '</section>' +

    (P.filer.length ?
    '<section class="pp-del" aria-labelledby="pp-d2"><p class="pp-dellabel">Del 2 av 4 · Filerna</p><div class="pp-kort">' +
      '<h2 class="pp-h2" id="pp-d2">Ladda upp de här i projektet</h2>' +
      '<p class="pp-ingress">Då hämtar AI:n fakta därifrån i stället för att gissa. Bocka av det du har lagt in.</p>' +
      '<ul class="pp-filer">' + P.filer.map(function (x, i) {
        return '<li><button type="button" class="pp-fil" data-fil="' + i + '" aria-pressed="false"><i aria-hidden="true"></i><span><b>' + esc(x.namn) + '</b>' + (x.varfor ? '<span>' + esc(x.varfor) + '</span>' : '') + '</span></button></li>';
      }).join('') + '</ul>' +
    '</div></section>' : '') +

    (P.start.length ?
    '<section class="pp-del" aria-labelledby="pp-d3"><p class="pp-dellabel">Del 3 av 4 · Testa projektet</p><div class="pp-kort">' +
      '<h2 class="pp-h2" id="pp-d3">' + (P.start.length === 3 ? 'Tre' : P.start.length) + ' startprompter att köra i projektet</h2>' +
      '<p class="pp-ingress">De är korta, för projektet vet redan vem du är. Gör AI:n något du inte gillar? Lägg till en regel i instruktionerna.</p>' +
      '<div class="pp-start">' + P.start.map(function (s, i) {
        return '<div class="pp-startkort"><div class="pp-startkort-topp"><strong>' + esc(s.titel || ('Startprompt ' + (i + 1))) + '</strong>' +
          (s.mallSlug ? '<a href="/ai-mallar/' + encodeURIComponent(s.mallSlug) + '" data-mall="' + esc(s.mallSlug) + '">Hela mallen: ' + esc(s.mall.split(/\s[—–:-]\s|:\s/)[0]) + ' →</a>' : '') +
          '</div><p>' + esc(s.prompt) + '</p><button type="button" class="pp-liten" data-start="' + i + '">Kopiera</button></div>';
      }).join('') + '</div>' +
    '</div></section>' : '') +

    '<section class="pp-del" aria-labelledby="pp-d4"><p class="pp-dellabel">Del 4 av 4 · Koppla dina verktyg (valfritt)</p><div class="pp-kort">' +
      '<h2 class="pp-h2" id="pp-d4">Låt AI:n hämta det själv</h2>' +
      (kopplingar.length ?
        '<p class="pp-ingress">Med en koppling kan AI:n läsa i dina verktyg, så du slipper klistra in. Välj det du kopplar, så får instruktionerna en rad om när AI:n ska använda det.</p>' +
        '<div class="pp-kopplingar" data-pp="kopplingar"></div>' +
        '<div class="pp-sakerhet"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b5200" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"></path><path d="M9 12l2 2 4-4"></path></svg><div>' +
          '<strong>Innan du kopplar</strong>Använd bara kopplingar från tjänstens egen katalog, aldrig okända tillägg från nätet. Börja med en koppling och ge AI:n bara läsrätt om det går. Kunduppgifter omfattas av GDPR, så kolla att ditt företag får använda AI-tjänsten med kunddata. <a href="' + GDPR_URL + '">Så funkar AI och GDPR →</a>' +
        '</div></div>' +
        '<span class="pp-koll" data-pp="koll"></span>'
      : '<p class="pp-inga">Det här paketet behöver inga kopplingar. Filerna räcker gott.</p>') +
    '</div></section>' +

    '<div class="pp-skillnad"><p><strong>Projekt eller prompt?</strong> Instruktionerna sköter vem du är och hur det ska låta, i varje samtal. För dagens enskilda uppgift, ett mejl eller ett inlägg, är promptgeneratorn snabbast.</p><a href="/promptgeneratorn?source=projektpaket">Till promptgeneratorn →</a></div>';

  function $(sel) { return root.querySelector(sel); }

  /* Fyll fälten och reglerna */
  [].forEach.call(root.querySelectorAll('[data-du]'), function (inp) {
    var key = inp.getAttribute('data-du');
    inp.value = S.du[key] || '';
    inp.addEventListener('input', function () {
      S.du[key] = inp.value.trim();
      kedja = las(KEDJA, kedja) || kedja;
      kedja.fyll = kedja.fyll || {};
      kedja.mallar = kedja.mallar || {};
      if (S.du[key]) kedja.fyll[FYLL[key]] = S.du[key]; else delete kedja.fyll[FYLL[key]];
      spara(KEDJA, kedja);
      ritaInstr();
    });
    inp.addEventListener('change', function () { if (inp.value.trim()) track('paket_fyll', { falt: key }); });
  });
  var allaRegler = P.regler.concat(P.arbete);
  [].forEach.call(root.querySelectorAll('[data-regel]'), function (cb) {
    var t = allaRegler[+cb.getAttribute('data-regel')];
    cb.checked = aktiv(t);
    cb.addEventListener('change', function () {
      var i = S.av.indexOf(t);
      if (cb.checked && i !== -1) S.av.splice(i, 1);
      if (!cb.checked && i === -1) S.av.push(t);
      spara('aim_paket_av_' + P.slug, S.av);
      track('paket_regel', { regel: t.slice(0, 80), pa: cb.checked ? 1 : 0 });
      ritaInstr();
    });
  });

  function ritaInstr() {
    var txt = instruktioner();
    $('[data-pp="instr"]').textContent = txt;
    $('[data-pp="tecken"]').textContent = String(txt.length).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' tecken';
  }

  function ritaTjanst() {
    var t = TJANSTER[S.tjanst];
    [].forEach.call(root.querySelectorAll('[data-tjanst]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tjanst') === S.tjanst ? 'true' : 'false'); });
    $('[data-pp="kortrubrik"]').textContent = 'Instruktioner för ditt ' + t.var;
    $('[data-pp="guiderubrik"]').textContent = 'Så klistrar du in dem i ' + t.namn;
    $('[data-pp="guide"]').innerHTML = t.steg.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    $('[data-pp="tips"]').textContent = 'Tips: ' + t.tips;
    ritaKopplingar();
  }

  function statusKlass(s) {
    s = (s || '').toLowerCase();
    if (s === 'finns' || s === 'inbyggt') return 'is-finns';
    if (s.indexOf('finns inte') === 0) return 'is-saknas';
    return 'is-kolla';
  }
  function statusText(s, namn) {
    s = (s || '').toLowerCase();
    if (s === 'finns') return 'Finns i ' + namn;
    if (s === 'inbyggt') return 'Inbyggt i ' + namn;
    if (s.indexOf('finns inte') === 0) return 'Finns inte i ' + namn + ' än';
    return 'Kolla om den finns i ' + namn;
  }
  function ritaKopplingar() {
    var box = $('[data-pp="kopplingar"]');
    if (!box) return;
    var t = TJANSTER[S.tjanst];
    box.innerHTML = kopplingar.map(function (k) {
      var vald = S.kopp.indexOf(k.slug) !== -1;
      var s = k.status[S.tjanst];
      return '<div class="pp-koppling' + (vald ? ' is-vald' : '') + '">' +
        '<div class="pp-koppling-topp"><span class="pp-ikon" aria-hidden="true">' + esc(k.ikon || k.namn.charAt(0)) + '</span><span><b>' + esc(k.namn) + '</b><small>' + esc(k.exempel) + '</small></span></div>' +
        '<span>' + esc(k.gor) + '</span>' +
        '<span class="pp-badge ' + statusKlass(s) + '">' + esc(statusText(s, t.namn)) + '</span>' +
        '<button type="button" class="pp-liten" data-kopp="' + esc(k.slug) + '" aria-pressed="' + vald + '">' + (vald ? '✓ Med i instruktionerna' : '+ Lägg till i instruktionerna') + '</button>' +
      '</div>';
    }).join('');
    var datum = kopplingar.map(function (k) { return k.datum; }).filter(Boolean).map(function (d) { var x = new Date(d); return isNaN(x) ? null : x; }).filter(Boolean);
    var aldst = datum.length ? new Date(Math.min.apply(null, datum)) : null;
    var koll = $('[data-pp="koll"]');
    if (koll) koll.textContent = 'Visar läget i ' + t.namn + '. Utbudet skiljer sig mellan planer och ändras ofta.' + (aldst ? ' Senast kontrollerat ' + aldst.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }) + '.' : '');
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute('data-tjanst')) {
      S.tjanst = b.getAttribute('data-tjanst');
      spara('aim_paket_tjanst', S.tjanst);
      ritaTjanst(); ritaInstr();
      track('paket_tjanst', {});
    } else if (b.getAttribute('data-pp') === 'kopiera') {
      kopiera(instruktioner(), b, 'Kopierad ✓', 'Kopiera instruktionerna');
      track('paket_kopiera', {
        egna_falt: ['foretag', 'gor', 'malgrupp'].filter(function (k) { return S.du[k]; }).length,
        regler_av: S.av.length,
        kopplingar: S.kopp.length
      });
    } else if (b.hasAttribute('data-fil')) {
      var i = +b.getAttribute('data-fil');
      var j = S.filer.indexOf(i);
      if (j === -1) S.filer.push(i); else S.filer.splice(j, 1);
      spara('aim_paket_filer_' + P.slug, S.filer);
      ritaFiler();
      track('paket_fil', { fil: i + 1, klar: j === -1 ? 1 : 0 });
    } else if (b.hasAttribute('data-start')) {
      var n = +b.getAttribute('data-start');
      kopiera(P.start[n].prompt, b, 'Kopierad ✓', 'Kopiera');
      track('paket_startprompt', { nr: n + 1 });
    } else if (b.hasAttribute('data-kopp')) {
      var slug = b.getAttribute('data-kopp');
      var k = S.kopp.indexOf(slug);
      if (k === -1) S.kopp.push(slug); else S.kopp.splice(k, 1);
      spara('aim_paket_kopp_' + P.slug, S.kopp);
      ritaKopplingar(); ritaInstr();
      track('paket_koppling', { koppling: slug, vald: k === -1 ? 1 : 0 });
    }
  });
  root.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-mall]');
    if (a) track('paket_mall', { mall: a.getAttribute('data-mall') });
  });

  function ritaFiler() {
    [].forEach.call(root.querySelectorAll('[data-fil]'), function (b) {
      var klar = S.filer.indexOf(+b.getAttribute('data-fil')) !== -1;
      b.setAttribute('aria-pressed', klar ? 'true' : 'false');
      b.querySelector('i').textContent = klar ? '✓' : '';
    });
  }

  ritaTjanst();
  ritaInstr();
  ritaFiler();
  track('paket_visa', { kopplingar_finns: kopplingar.length });
})();
