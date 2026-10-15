/* ============================================================
   AIMonkey — paket-sida.js (Projektpaket Template)
   Gör ett projektpaket i CMS:et till en steg-för-steg-sida för
   nybörjare: vad ett AI-projekt är, sedan fem steg (välj tjänst,
   anpassa och kopiera, skapa projektet, ladda upp filer, testa),
   ett extrasteg (kopplingar) och vanliga frågor med FAQ-schema.

   Webflow-struktur (Designer, sidan Projektpaket Template):
     [data-paket="app"]
       [data-paket="etikett"]  ← Etikett
       h1[data-paket="namn"]   ← Name
       [data-paket="forvem"]   ← För vem
       [data-paket="data"]     dolda fält [data-f="…"] (se P nedan)
       [data-paket="kopplingar"] Collection list, källa: paketets
                                 referensfält Kopplingar. Varje post:
                                 [data-koppling="item"] med [data-k="…"]
       [data-paket="faq"]      h2 + Collection list, källa: paketets
                                 referensfält FAQ. Varje post:
                                 [data-faq="item"] > h3[data-faq="q"] ← Name,
                                 RichText[data-faq="a"] ← Svar RT
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
    /* Toppen */
    '.pp-overst{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-bottom:14px}',
    '.pp-kicker{display:inline-flex;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:#0b1f3b;border-radius:999px;padding:6px 12px}',
    '[data-paket="etikett"]{display:inline-flex;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#005042;background:#e5f9f6;border-radius:999px;padding:6px 12px}',
    '.pp-pillar{font-size:14px;color:#00806b;text-decoration:none}',
    '.pp-pillar:hover{text-decoration:underline}',
    '[data-paket="namn"]{margin:0 0 12px}',
    '[data-paket="forvem"]{margin:0 0 16px;color:#3d4a5c;max-width:680px}',
    '.pp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 28px;padding:0;list-style:none}',
    '.pp-chips li{font-size:14px;color:#24384f;border:1.5px solid #dbe2ea;border-radius:999px;padding:6px 12px;background:#fff}',
    /* Vad är det här */
    '.pp-forklaring{background:#fff;border:1.5px solid #e1e7ee;border-radius:24px;padding:26px 28px;margin:0 0 28px}',
    '.pp-forklaring h2{font-size:26px!important;line-height:1.2!important;margin:0 0 8px!important;color:#0b1f3b}',
    '.pp-forklaring > p{margin:0 0 20px;font-size:17px;line-height:1.6;color:#24384f;max-width:700px}',
    '.pp-jamfor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0 0 16px}',
    '.pp-chatt{border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px}',
    '.pp-chatt.is-utan{background:#f2f4f7}',
    '.pp-chatt.is-med{background:#e5f9f6}',
    '.pp-chatt-rubrik{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5b6573}',
    '.pp-chatt.is-med .pp-chatt-rubrik{color:#005042}',
    '.pp-bubbla{align-self:flex-end;max-width:92%;background:#0b1f3b;color:#fff;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:15px;line-height:1.45}',
    '.pp-bubbla.is-ai{align-self:flex-start;background:#fff;color:#0b1f3b;border:1.5px solid #dbe2ea;border-radius:16px 16px 16px 4px}',
    '.pp-chatt small{font-size:14px;color:#4a5668}',
    '.pp-chatt.is-med small{color:#24433d}',
    '.pp-forklaring-fot{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:15px;color:#4a5668}',
    '.pp-forklaring-fot a{color:#00806b;font-weight:600}',
    /* Förloppet */
    '.pp-forlopp{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 32px;padding:0;list-style:none;counter-reset:fl}',
    '.pp-forlopp li{counter-increment:fl}',
    '.pp-forlopp a{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#3d4a5c;text-decoration:none;border:1.5px dashed #c9d3de;border-radius:999px;padding:6px 14px 6px 6px;background:#fff}',
    '.pp-forlopp a:before{content:counter(fl);width:24px;height:24px;border-radius:50%;border:1.5px solid #c9d3de;display:inline-flex;align-items:center;justify-content:center;font-size:12px}',
    '.pp-forlopp li.is-klar a{border-style:solid;border-color:#bfeee5;background:#e5f9f6;color:#005042}',
    '.pp-forlopp li.is-klar a:before{content:"✓";background:#00c9a7;border-color:#00c9a7;color:#0b1f3b}',
    /* Stegen */
    '.pp-steg{margin:0 0 36px;scroll-margin-top:90px}',
    '.pp-steghuvud{display:flex;gap:14px;align-items:flex-start;margin:0 0 14px}',
    '.pp-stegnr{width:40px;height:40px;flex-shrink:0;border-radius:50%;background:#0b1f3b;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:17px;font-weight:700}',
    '.pp-steg.is-klar .pp-stegnr{background:#00c9a7;color:#0b1f3b;font-size:0}',
    '.pp-steg.is-klar .pp-stegnr:after{content:"✓";font-size:18px}',
    '.pp-steg.is-extra .pp-stegnr{background:#e5f9f6;color:#005042;font-size:12px}',
    '.pp-steghuvud h2{font-size:26px!important;line-height:1.2!important;margin:4px 0 4px!important;color:#0b1f3b}',
    '.pp-steghuvud p{margin:0;font-size:16px;line-height:1.55;color:#4a5668}',
    '.pp-kort{background:#fff;border:1.5px solid #e1e7ee;border-radius:20px;padding:24px 26px}',
    '.pp-tjanster{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.pp-tab{font:inherit;font-size:17px;font-weight:700;padding:12px 22px;min-height:50px;border-radius:999px;cursor:pointer;background:#fff;color:#0b1f3b;border:2px solid #c9d3de}',
    '.pp-tab[aria-pressed="true"]{background:#0b1f3b;color:#fff;border-color:#0b1f3b}',
    '.pp-ingen{font-size:15px;color:#00806b;font-weight:600;margin-left:6px}',
    '.pp-term{margin:14px 0 0;font-size:15px;line-height:1.5;color:#24433d;background:#e5f9f6;border-radius:12px;padding:10px 14px}',
    '.pp-falt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 18px}',
    '.pp-falt label{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600;color:#3d4a5c}',
    '.pp-falt input{font:inherit;font-size:16px;font-weight:400;min-height:48px;padding:10px 14px;border:2px solid #d3dbe4;border-radius:12px;background:#fff;color:#0b1f3b;width:100%;box-sizing:border-box}',
    '.pp-falt input:focus,.pp-reglerlista input:focus-visible{outline:none;border-color:#00c9a7;box-shadow:0 0 0 4px rgba(0,201,167,.2)}',
    '.pp-delrubrik{margin:0 0 6px;font-size:16px;font-weight:700;color:#0b1f3b}',
    '.pp-delingress{margin:0 0 14px;font-size:15px;line-height:1.5;color:#4a5668}',
    '.pp-regler{background:#e5f9f6;border:1.5px solid #bfeee5;border-radius:16px;padding:16px 18px;margin:0 0 18px}',
    '.pp-regler p{margin:0 0 10px;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#005042}',
    '.pp-reglerlista{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}',
    '.pp-reglerlista label{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45;color:#0b1f3b;cursor:pointer}',
    '.pp-reglerlista input{width:18px;height:18px;margin-top:2px;flex-shrink:0;accent-color:#00806b}',
    '.pp-reglerlista em{font-style:normal;font-weight:600;color:#005042}',
    '.pp-instr{border:2px solid #00c9a7;border-radius:18px;padding:20px 22px;background:#fff}',
    '.pp-instr-topp{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:14px;color:#4a5668;margin-bottom:10px}',
    '.pp-instr-topp strong{color:#005042}',
    '.pp-instr pre{margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:16px;line-height:1.6;color:#0b1f3b;max-height:420px;overflow:auto}',
    '.pp-knappar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:16px}',
    '.pp-kopiera{font:inherit;font-size:18px;font-weight:700;padding:16px 28px;min-height:56px;border-radius:14px;border:0;background:#ffd23f;color:#0b1f3b;cursor:pointer}',
    '.pp-kopiera:hover{background:#ffdf78}',
    '.pp-kopiera.is-kopierad,.pp-liten.is-kopierad{background:#00c9a7;color:#0b1f3b;border-color:#00c9a7}',
    '.pp-knappar small{font-size:14px;color:#4a5668}',
    '.pp-nasta{display:none;flex-wrap:wrap;gap:10px 16px;align-items:center;margin-top:14px;background:#0b1f3b;color:#fff;border-radius:16px;padding:14px 18px;font-size:16px}',
    '.pp-nasta.is-synlig{display:flex}',
    '.pp-nasta span{flex:1 1 260px}',
    '.pp-oppna{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:16px;padding:12px 18px;min-height:48px;box-sizing:border-box;border-radius:12px;background:#ffd23f;color:#0b1f3b!important;text-decoration:none}',
    '.pp-oppna:hover{background:#ffdf78}',
    '.pp-oppna.is-ljus{background:#fff;border:1.5px solid #0b1f3b}',
    '.pp-guide ol{margin:0 0 16px;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px;counter-reset:pp}',
    '.pp-guide li{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.5;counter-increment:pp}',
    '.pp-guide li:before{content:counter(pp);width:28px;height:28px;border-radius:50%;background:#0b1f3b;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}',
    '.pp-tips{margin:0 0 16px;font-size:15px;line-height:1.5;color:#24433d;background:#e5f9f6;border-radius:12px;padding:12px 14px}',
    '.pp-klarknapp{font:inherit;font-size:15px;font-weight:600;padding:10px 18px;min-height:48px;border-radius:12px;border:1.5px solid #0b1f3b;background:#fff;color:#0b1f3b;cursor:pointer}',
    '.pp-klarknapp[aria-pressed="true"]{background:#00c9a7;border-color:#00c9a7}',
    '.pp-filer{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}',
    '.pp-fil{display:flex;gap:14px;align-items:center;width:100%;text-align:left;font:inherit;font-size:16px;color:#0b1f3b;background:#fff;border:1.5px solid #dbe2ea;border-radius:14px;padding:12px 16px;min-height:56px;cursor:pointer}',
    '.pp-fil i{font-style:normal;width:26px;height:26px;border-radius:8px;border:2px solid #c9d3de;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0}',
    '.pp-fil b{display:block;font-weight:600}',
    '.pp-fil span span{display:block;font-size:14px;color:#4a5668}',
    '.pp-fil[aria-pressed="true"]{background:#e5f9f6;border-color:#bfeee5}',
    '.pp-fil[aria-pressed="true"] i{background:#00c9a7;border-color:#00c9a7;color:#0b1f3b}',
    '.pp-filnot{margin:12px 0 0;font-size:14px;color:#4a5668}',
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
    '.pp-koppling .pp-gor{font-size:15px;line-height:1.5;color:#24384f;flex-grow:1}',
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
    /* FAQ */
    '[data-paket="faq"]{margin:0 0 36px;scroll-margin-top:90px}',
    '[data-paket="faq"].pp-tom{display:none}',
    '[data-paket="faq"] > h2{font-size:26px!important;line-height:1.2!important;margin:0 0 14px!important;color:#0b1f3b}',
    '[data-paket="faq"] .w-dyn-empty{display:none!important}',
    '[data-paket="faq"] [role="list"],[data-paket="faq"] .w-dyn-items{display:flex;flex-direction:column;gap:10px}',
    '[data-faq="item"]{background:#fff;border:1.5px solid #e1e7ee;border-radius:16px}',
    '[data-faq="q"]{margin:0!important;font-size:17px!important;line-height:1.4!important;font-weight:600;color:#0b1f3b}',
    '.pp-faq-knapp{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;text-align:left;font:inherit;font-size:17px;font-weight:600;color:#0b1f3b;background:none;border:0;padding:16px 20px;min-height:56px;cursor:pointer}',
    '.pp-faq-knapp:after{content:"+";font-size:22px;color:#00806b;flex-shrink:0}',
    '.pp-faq-knapp[aria-expanded="true"]:after{content:"−"}',
    '[data-faq="a"]{padding:0 20px 18px;font-size:16px;line-height:1.6;color:#24384f}',
    '[data-faq="a"] p{margin:0}',
    '[data-faq="a"] a{color:#00806b;font-weight:600}',
    '[data-faq="a"][hidden]{display:none}',
    /* Apan */
    '[data-paket="apan"]{display:flex;gap:14px;align-items:flex-start;background:#0b1f3b;color:#e8edf3;border-radius:20px;padding:20px 22px}',
    '[data-paket="apan"]:before{content:"Apan tycker:";font-weight:700;color:#4cd9c1;white-space:nowrap}',
    '[data-paket="apan"] p{margin:0;color:#e8edf3;font-size:16px;line-height:1.55}',
    '[data-paket="apan"].pp-tom{display:none}',
    '.pp-h1-typ{color:#00806b}',
    '[data-paket="namn"]{font-size:clamp(34px,5vw,56px)!important;line-height:1.1!important}',
    '.pp-val{border:1.5px solid #e1e7ee;border-radius:16px;padding:16px 18px;margin:0 0 18px}',
    '.pp-val.is-mint{background:#e5f9f6;border-color:#bfeee5}',
    '.pp-valrubrik{margin:0 0 4px!important;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#005042}',
    '.pp-valingress{margin:0 0 12px!important;font-size:14px;line-height:1.5;color:#4a5668}',
    '.pp-reglerlista small{display:block;font-size:13px;color:#4a5668}',
    '.pp-reglerlista .pp-badge{flex:0 0 auto;align-self:flex-start;margin-left:auto;font-size:12px;padding:3px 8px;white-space:nowrap}',
    '.pp-reglerlista label>span:not(.pp-badge){flex:1 1 0;min-width:0}',
    '.pp-pil{display:flex;align-items:center;gap:8px;margin:4px 0 10px;font-size:15px;font-weight:600;color:#0b1f3b}',
    '.pp-pil:before{content:"↓";display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#00c9a7;color:#0b1f3b;font-weight:700}',
    '.pp-andrat{display:none;margin-top:12px;background:#fff4cc;border:1.5px solid #f2d66b;color:#4d3b00;border-radius:14px;padding:12px 16px;font-size:15px}',
    '.pp-andrat.is-synlig{display:block}',
    '.pp-koppstatus{display:block;margin-top:auto;font-size:13px;font-weight:600;color:#005042}',
    '.pp-koppstatus.is-av{color:#5b6573;font-weight:500}',
    '@media (max-width:767px){.pp-reglerlista label{flex-wrap:wrap}.pp-reglerlista label>span:not(.pp-badge){flex-basis:calc(100% - 28px)}.pp-reglerlista .pp-badge{margin-left:28px}.pp-falt,.pp-jamfor{grid-template-columns:1fr}.pp-kort,.pp-forklaring{padding:18px}[data-paket="apan"]{flex-direction:column;gap:6px}.pp-kopiera{width:100%}.pp-steghuvud h2,.pp-forklaring h2{font-size:22px!important}.pp-forlopp{display:none}}'
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

  var NAMN = P.namn || 'Mitt projekt';
  var TJANSTER = {
    chatgpt: {
      namn: 'ChatGPT', term: 'projekt', ditt: 'ditt projekt', var: 'ChatGPT-projekt', url: 'https://chatgpt.com/',
      termText: 'I ChatGPT heter det Projekt. Det finns även i gratisversionen.',
      steg: ['Klicka på Nytt projekt i sidomenyn och ge projektet ett namn, t.ex. ”' + NAMN + '”.', 'Öppna projektets meny (•••) och välj Projektinställningar.', 'Klistra in instruktionerna i rutan för instruktioner och spara.', 'Starta nya chattar inifrån projektet. Då gäller instruktionerna automatiskt.'],
      tips: 'Vanliga chattar utanför projektet påverkas inte. Det är bara i projektet AI:n följer instruktionerna.',
      filnot: 'I gratisversionen av ChatGPT kan du ladda upp upp till fem filer per projekt.'
    },
    claude: {
      namn: 'Claude', term: 'projekt', ditt: 'ditt projekt', var: 'Claude-projekt', url: 'https://claude.ai/projects',
      termText: 'I Claude heter det Projekt. Gratisversionen har ett begränsat antal projekt.',
      steg: ['Gå till Projekt i sidomenyn och klicka på Nytt projekt.', 'Ge projektet ett namn, t.ex. ”' + NAMN + '”, och skapa det.', 'Klicka på rutan för projektets instruktioner och klistra in texten. Spara.', 'Starta nya chattar inifrån projektet. Då gäller instruktionerna automatiskt.'],
      tips: 'Filer lägger du i projektets kunskap, så slipper du klistra in dem i varje chatt.',
      filnot: ''
    },
    gemini: {
      namn: 'Gemini', term: 'Gem', ditt: 'din Gem', var: 'Gemini Gem', url: 'https://gemini.google.com/',
      termText: 'I Gemini heter det Gem. Gems är gratis för alla.',
      steg: ['Öppna Gemini och gå till Gems i sidomenyn.', 'Klicka på Ny Gem och ge den ett namn, t.ex. ”' + NAMN + '”.', 'Klistra in instruktionerna i fältet Instruktioner.', 'Spara. Sedan startar du din Gem från sidomenyn varje gång.'],
      tips: 'Filerna lägger du till som kunskap i din Gem.',
      filnot: ''
    },
    copilot: {
      namn: 'Copilot', term: 'agent', ditt: 'din agent', var: 'Copilot-agent', url: 'https://m365.cloud.microsoft/',
      termText: 'I Microsoft Copilot heter det agent. Det kräver ett jobbkonto och ofta en Copilot-licens.',
      steg: ['Öppna Microsoft 365 Copilot och välj Skapa agent.', 'Gå till fliken Konfigurera och ge agenten ett namn, t.ex. ”' + NAMN + '”.', 'Klistra in instruktionerna i fältet Instruktioner.', 'Spara. Du kan dela agenten med kollegor om du vill.'],
      tips: 'Hittar du inte Skapa agent? Fråga IT, funktionen kan vara avstängd i ert konto.',
      filnot: ''
    }
  };
  var ORDNING = ['chatgpt', 'claude', 'gemini', 'copilot'];
  var PILLAR_URL = { saljare: '/ai-for-saljare', smaforetagare: '/ai-for-smaforetagare', marknadsforare: '/ai-for-marknadsforing-sociala-medier' };
  var TON = { 'Vänlig': 'varm och personlig', 'Professionell': 'saklig och förtroendeingivande', 'Direkt': 'kort och rakt på sak', 'Kreativ': 'lekfull, med glimt i ögat', 'Övertygande': 'får läsaren att vilja agera', 'Akademisk': 'noggrann och resonerande' };
  var GDPR_URL = '/artiklar/ai-och-gdpr-vad-du-maste-veta-som-foretagare';
  var VALJ_URL = '/artiklar/chatgpt-vs-claude-vs-gemini-2026';

  var STEG_KEY = 'aim_paket_steg_' + P.slug;
  var S = {
    tjanst: las('aim_paket_tjanst', 'chatgpt'),
    du: {
      foretag: kedja.fyll[FYLL.foretag] || '',
      gor: kedja.fyll[FYLL.gor] || '',
      malgrupp: kedja.fyll[FYLL.malgrupp] || ''
    },
    av: las('aim_paket_av_' + P.slug, []),         /* bortklickade regler/arbetssätt */
    filer: las('aim_paket_filer_' + P.slug, []),    /* uppladdade filer (index) */
    utanFiler: las('aim_paket_utanfiler_' + P.slug, []), /* filer användaren inte har (index) */
    kopierad: las('aim_paket_kopierad_' + P.slug, ''),  /* senast kopierade texten */
    kopp: las('aim_paket_kopp_' + P.slug, []),      /* valda kopplingar (slug) */
    steg: las(STEG_KEY, {})                         /* valt, kopierat, inklistrat, testat */
  };
  if (!TJANSTER[S.tjanst]) S.tjanst = 'chatgpt';
  if (!S.steg || typeof S.steg !== 'object') S.steg = {};

  function track(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event, paket: P.slug, tjanst: S.tjanst };
    for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }
  function markera(key) {
    if (S.steg[key]) return;
    S.steg[key] = 1;
    spara(STEG_KEY, S.steg);
    ritaForlopp();
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
    var medFiler = P.filer.filter(function (x, i) { return S.utanFiler.indexOf(i) === -1; });
    if (medFiler.length) {
      r.push('', '# Filer i projektet');
      r.push('Jag har laddat upp: ' + medFiler.map(function (x) { return x.namn.charAt(0).toLowerCase() + x.namn.slice(1); }).join(', ') + '. Använd dem som källa och säg till om något saknas.');
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
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(klart, function () { fallback(); klart(); });
    } else { fallback(); klart(); }
  }

  /* ── Toppen ── */
  var etikett = app.querySelector('[data-paket="etikett"]');
  var forvem = app.querySelector('[data-paket="forvem"]');
  var faq = app.querySelector('[data-paket="faq"]');
  var apan = app.querySelector('[data-paket="apan"]');
  if (apan && !textAv(apan)) apan.classList.add('pp-tom');
  var faqItems = faq ? [].slice.call(faq.querySelectorAll('[data-faq="item"]')) : [];
  if (faq && !faqItems.length) faq.classList.add('pp-tom');
  if (faq) faq.id = 'vanliga-fragor';

  var topp = document.createElement('div');
  topp.className = 'pp-overst';
  var namnEl = app.querySelector('[data-paket="namn"]');
  if (namnEl && !namnEl.querySelector('.pp-h1-typ')) {
    var typ = document.createElement('span');
    typ.className = 'pp-h1-typ';
    typ.textContent = 'Projektmall: ';
    namnEl.insertBefore(typ, namnEl.firstChild);
  }
  (etikett || namnEl).parentNode.insertBefore(topp, etikett || namnEl);
  if (etikett) {
    topp.appendChild(etikett);
    if (!textAv(etikett)) etikett.style.display = 'none';
  }
  if (P.rollSlug && PILLAR_URL[P.rollSlug]) {
    var pl = document.createElement('a');
    pl.className = 'pp-pillar';
    pl.href = PILLAR_URL[P.rollSlug];
    pl.textContent = 'Fler mallar och prompter →';
    topp.appendChild(pl);
  }

  var root = document.createElement('div');
  root.className = 'pp-root';
  (forvem || namnEl).insertAdjacentElement('afterend', root);

  var FORLOPP = [
    { id: 'valt', namn: 'Välj tjänst', mal: 'pp-s1' },
    { id: 'kopierat', namn: 'Anpassa och kopiera', mal: 'pp-s2' },
    { id: 'inklistrat', namn: 'Skapa projektet', mal: 'pp-s3' },
    { id: 'filer', namn: 'Ladda upp filer', mal: 'pp-s4' },
    { id: 'testat', namn: 'Testa', mal: 'pp-s5' }
  ];

  function steghuvud(nr, titel, text, id, extra) {
    return '<div class="pp-steghuvud"><span class="pp-stegnr" aria-hidden="true">' + nr + '</span><div><h2 id="' + id + '-rubrik">' + titel + '</h2>' + (text ? '<p>' + text + '</p>' : '') + '</div></div>';
  }

  root.innerHTML =
    '<ul class="pp-chips"><li>Klart på 10 minuter</li><li>Gratis</li><li>Funkar i ChatGPT, Claude, Gemini och Copilot</li></ul>' +

    '<section class="pp-forklaring" aria-labelledby="pp-vad">' +
      '<h2 id="pp-vad">Vad är det här?</h2>' +
      '<p>En <strong>projektmall</strong> är ett färdigt upplägg för ett nytt projekt i din AI-tjänst. Ett projekt är en egen arbetsyta i ChatGPT, Claude, Gemini eller Copilot där AI:n alltid kommer ihåg vem du är och hur du vill ha det. Du ställer in det en gång, sedan gäller det i varje samtal. Här anpassar du mallen och kopierar texten, sedan klistrar du in den i ditt nya projekt.</p>' +
      '<div class="pp-jamfor">' +
        '<div class="pp-chatt is-utan"><span class="pp-chatt-rubrik">Utan projekt</span>' +
          '<div class="pp-bubbla">Jag jobbar på ett städföretag, vi säljer till kontor, våra kunder är kontorschefer, skriv professionellt och kort … Kan du skriva ett mejl till Anna?</div>' +
          '<small>Varje gång. I varje ny chatt.</small></div>' +
        '<div class="pp-chatt is-med"><span class="pp-chatt-rubrik">Med projekt</span>' +
          '<div class="pp-bubbla">Skriv ett mejl till Anna.</div>' +
          '<div class="pp-bubbla is-ai">Här är ett förslag i er ton, utifrån kundkortet …</div>' +
          '<small>AI:n vet redan resten.</small></div>' +
      '</div>' +
      '<div class="pp-forklaring-fot"><span>Följ stegen nedan, det tar ungefär tio minuter.</span><a href="#vanliga-fragor">Första gången? Läs vanliga frågor ↓</a></div>' +
    '</section>' +

    '<ol class="pp-forlopp" aria-label="Dina steg">' + FORLOPP.map(function (s) { return '<li data-fl="' + s.id + '"><a href="#' + s.mal + '">' + s.namn + '</a></li>'; }).join('') + '</ol>' +

    '<section class="pp-steg" id="pp-s1" data-stegid="valt" aria-labelledby="pp-s1-rubrik">' +
      steghuvud(1, 'Välj din AI-tjänst', 'Stegen och guiden nedan anpassas efter tjänsten du använder.', 'pp-s1') +
      '<div class="pp-kort"><div class="pp-tjanster" role="group" aria-label="Välj AI-tjänst">' +
        ORDNING.map(function (id) { return '<button type="button" class="pp-tab" data-tjanst="' + id + '" aria-pressed="false">' + TJANSTER[id].namn + '</button>'; }).join('') +
        '<a class="pp-ingen" href="' + VALJ_URL + '">Har ingen än? Så väljer du →</a>' +
      '</div><p class="pp-term" data-pp="term"></p></div>' +
    '</section>' +

    '<section class="pp-steg" id="pp-s2" data-stegid="kopierat" aria-labelledby="pp-s2-rubrik">' +
      steghuvud(2, 'Anpassa och kopiera instruktionerna', 'Instruktionerna är texten AI:n läser innan varje svar. Allt du väljer här ändrar texten i rutan längst ned. Kopiera när du är nöjd.', 'pp-s2') +
      '<div class="pp-kort">' +
        '<div class="pp-val">' +
          '<p class="pp-valrubrik">Om dig</p>' +
          '<p class="pp-valingress">Sparas bara i din webbläsare och fylls i automatiskt i promptgeneratorn och mallarna.</p>' +
          '<div class="pp-falt">' +
            '<label>Namn eller företag<input data-du="foretag" autocomplete="organization" placeholder="' + esc(P.exForetag || 'T.ex. Bageriet i Gnesta') + '"></label>' +
            '<label>Vad du gör eller säljer<input data-du="gor" placeholder="' + esc(P.exErbjudande || 'T.ex. surdegsbröd och catering') + '"></label>' +
            '<label>Vilka du pratar med<input data-du="malgrupp" placeholder="' + esc(P.exMalgrupp || 'T.ex. barnfamiljer i Sörmland') + '"></label>' +
          '</div>' +
        '</div>' +
        ((P.regler.length || P.arbete.length) ?
        '<div class="pp-val is-mint"><p class="pp-valrubrik">Regler och arbetssätt</p><p class="pp-valingress">Ingår i mallen. Klicka ur det som inte passar dig.</p><ul class="pp-reglerlista">' +
          P.regler.concat(P.arbete).map(function (t, i) {
            var m = /^(alltid|aldrig):\s*/i.exec(t);
            var visa = m ? '<em>' + (m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()) + ':</em> ' + esc(t.slice(m[0].length)) : esc(t);
            return '<li><label><input type="checkbox" data-regel="' + i + '"> <span>' + visa + '</span></label></li>';
          }).join('') +
        '</ul></div>' : '') +
        (P.filer.length ?
        '<div class="pp-val"><p class="pp-valrubrik">Filer du lägger i projektet</p><p class="pp-valingress">AI:n får veta vilka filer som finns, så att den läser i dem i stället för att gissa. Klicka ur det du inte har. Du laddar upp filerna i steg 4.</p><ul class="pp-reglerlista">' +
          P.filer.map(function (x, i) {
            return '<li><label><input type="checkbox" data-filval="' + i + '"> <span><b>' + esc(x.namn) + '</b>' + (x.varfor ? '<small>' + esc(x.varfor) + '</small>' : '') + '</span></label></li>';
          }).join('') +
        '</ul></div>' : '') +
        (kopplingar.length ?
        '<div class="pp-val"><p class="pp-valrubrik">Verktyg AI:n får använda (valfritt)</p><p class="pp-valingress">Bara om du har kopplat, eller tänker koppla, verktyget i din AI-tjänst. Då får AI:n veta när den ska använda det. Hur du kopplar står <a href="#pp-s6">längst ned</a>.</p><ul class="pp-reglerlista" data-pp="koppval"></ul></div>' : '') +
        '<p class="pp-pil">Det här klistrar du in</p>' +
        '<div class="pp-instr"><div class="pp-instr-topp"><strong data-pp="kortrubrik"></strong><span data-pp="tecken"></span></div><pre data-pp="instr"></pre></div>' +
        '<div class="pp-knappar"><button type="button" class="pp-kopiera" data-pp="kopiera">Kopiera instruktionerna</button><small>Du kan ändra dem i AI-tjänsten när som helst.</small></div>' +
        '<div class="pp-andrat" data-pp="andrat" role="status">Du har ändrat något sedan du kopierade. Kopiera igen och ersätt texten i ditt projekt.</div>' +
        '<div class="pp-nasta" data-pp="nasta" role="status"><span data-pp="nastatext"></span><a class="pp-oppna" data-pp="oppna1" target="_blank" rel="noopener"></a></div>' +
      '</div>' +
    '</section>' +

    '<section class="pp-steg" id="pp-s3" data-stegid="inklistrat" aria-labelledby="pp-s3-rubrik">' +
      steghuvud(3, '<span data-pp="s3titel"></span>', '<span data-pp="s3text"></span>', 'pp-s3') +
      '<div class="pp-kort pp-guide"><ol data-pp="guide"></ol><p class="pp-tips" data-pp="tips"></p>' +
        '<div class="pp-knappar"><a class="pp-oppna is-ljus" data-pp="oppna2" target="_blank" rel="noopener"></a><button type="button" class="pp-klarknapp" data-pp="inklistrat" aria-pressed="false">Klart, jag har klistrat in</button></div>' +
      '</div>' +
    '</section>' +

    (P.filer.length ?
    '<section class="pp-steg" id="pp-s4" data-stegid="filer" aria-labelledby="pp-s4-rubrik">' +
      steghuvud(4, 'Ladda upp filerna', 'Det här är filerna du valde i steg 2. Lägg in dem i projektet och bocka av. Saknar du någon? Klicka ur den i steg 2 och kopiera igen.', 'pp-s4') +
      '<div class="pp-kort"><ul class="pp-filer" data-pp="fillista"></ul><p class="pp-filnot" data-pp="filnot"></p></div>' +
    '</section>' : '') +

    (P.start.length ?
    '<section class="pp-steg" id="pp-s5" data-stegid="testat" aria-labelledby="pp-s5-rubrik">' +
      steghuvud(P.filer.length ? 5 : 4, 'Testa projektet', 'Starta en ny chatt i <span data-pp="ditt"></span> och klistra in en av de här. De är korta, för projektet vet redan vem du är. Gör AI:n något du inte gillar? Lägg till en regel i instruktionerna.', 'pp-s5') +
      '<div class="pp-kort"><div class="pp-start">' + P.start.map(function (s, i) {
        return '<div class="pp-startkort"><div class="pp-startkort-topp"><strong>' + esc(s.titel || ('Startprompt ' + (i + 1))) + '</strong>' +
          (s.mallSlug ? '<a href="/ai-mallar/' + encodeURIComponent(s.mallSlug) + '" data-mall="' + esc(s.mallSlug) + '">Hela mallen: ' + esc(s.mall.split(/\s[—–:-]\s|:\s/)[0]) + ' →</a>' : '') +
          '</div><p>' + esc(s.prompt) + '</p><button type="button" class="pp-liten" data-start="' + i + '">Kopiera</button></div>';
      }).join('') + '</div></div>' +
    '</section>' : '') +

    '<section class="pp-steg is-extra" id="pp-s6" aria-labelledby="pp-s6-rubrik">' +
      steghuvud('Extra', 'Koppla dina verktyg (valfritt)', 'När projektet fungerar kan du låta AI:n läsa i dina andra verktyg, så slipper du klistra in. Du kopplar i AI-tjänstens inställningar, inte här. Det du valde i steg 2 står redan i instruktionerna.', 'pp-s6') +
      '<div class="pp-kort">' +
      (kopplingar.length ?
        '<div class="pp-kopplingar" data-pp="kopplingar"></div>' +
        '<div class="pp-sakerhet"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b5200" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"></path><path d="M9 12l2 2 4-4"></path></svg><div>' +
          '<strong>Innan du kopplar</strong>Använd bara kopplingar från tjänstens egen katalog, aldrig okända tillägg från nätet. Börja med en koppling och ge AI:n bara läsrätt om det går. Kunduppgifter omfattas av GDPR, så kolla att ditt företag får använda AI-tjänsten med kunddata. <a href="' + GDPR_URL + '">Så funkar AI och GDPR →</a>' +
        '</div></div>' +
        '<span class="pp-koll" data-pp="koll"></span>'
      : '<p class="pp-inga">Den här projektmallen behöver inga kopplingar. Filerna räcker gott.</p>') +
      '</div>' +
    '</section>';

  if (faq) root.insertAdjacentElement('afterend', faq);
  if (apan) (faq || root).insertAdjacentElement('afterend', apan);

  function $(sel) { return root.querySelector(sel); }

  /* ── FAQ: dragspel + FAQPage-schema ── */
  var schema = [];
  faqItems.forEach(function (it, i) {
    var q = it.querySelector('[data-faq="q"]');
    var a = it.querySelector('[data-faq="a"]');
    if (!q || !a) return;
    var fraga = textAv(q);
    if (!fraga) { it.style.display = 'none'; return; }
    schema.push({ '@type': 'Question', name: fraga, acceptedAnswer: { '@type': 'Answer', text: textAv(a) } });
    var id = 'pp-faq-' + i;
    a.id = id;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pp-faq-knapp';
    b.setAttribute('aria-controls', id);
    b.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
    b.textContent = fraga;
    q.textContent = '';
    q.appendChild(b);
    if (i !== 0) a.hidden = true;
    b.addEventListener('click', function () {
      var oppen = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', oppen ? 'false' : 'true');
      a.hidden = oppen;
      if (!oppen) track('paket_faq', { fraga: fraga.slice(0, 80) });
    });
  });
  if (schema.length) {
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: schema });
    document.head.appendChild(ld);
  }

  /* ── Fälten och reglerna ── */
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

  [].forEach.call(root.querySelectorAll('[data-filval]'), function (cb) {
    var i = +cb.getAttribute('data-filval');
    cb.checked = S.utanFiler.indexOf(i) === -1;
    cb.addEventListener('change', function () {
      var j = S.utanFiler.indexOf(i);
      if (cb.checked && j !== -1) S.utanFiler.splice(j, 1);
      if (!cb.checked && j === -1) S.utanFiler.push(i);
      spara('aim_paket_utanfiler_' + P.slug, S.utanFiler);
      track('paket_filval', { fil: i + 1, med: cb.checked ? 1 : 0 });
      ritaInstr(); ritaFiler();
    });
  });

  /* ── Rita ── */
  function ritaInstr() {
    var txt = instruktioner();
    $('[data-pp="instr"]').textContent = txt;
    $('[data-pp="tecken"]').textContent = String(txt.length).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' tecken';
    var andrat = !!(S.steg.kopierat && S.kopierad && S.kopierad !== txt);
    $('[data-pp="andrat"]').classList.toggle('is-synlig', andrat);
    if (andrat) $('[data-pp="nasta"]').classList.remove('is-synlig');
  }

  function ritaForlopp() {
    var klar = {
      valt: !!S.steg.valt,
      kopierat: !!S.steg.kopierat,
      inklistrat: !!S.steg.inklistrat,
      filer: S.filer.some(function (i) { return S.utanFiler.indexOf(i) === -1; }),
      testat: !!S.steg.testat
    };
    [].forEach.call(root.querySelectorAll('[data-fl]'), function (li) { li.classList.toggle('is-klar', !!klar[li.getAttribute('data-fl')]); });
    [].forEach.call(root.querySelectorAll('[data-stegid]'), function (s) { s.classList.toggle('is-klar', !!klar[s.getAttribute('data-stegid')]); });
    var b = $('[data-pp="inklistrat"]');
    if (b) {
      b.setAttribute('aria-pressed', klar.inklistrat ? 'true' : 'false');
      b.textContent = klar.inklistrat ? '✓ Klart, projektet finns' : 'Klart, jag har klistrat in';
    }
  }

  function ritaTjanst() {
    var t = TJANSTER[S.tjanst];
    [].forEach.call(root.querySelectorAll('[data-tjanst]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tjanst') === S.tjanst ? 'true' : 'false'); });
    $('[data-pp="term"]').textContent = t.termText;
    $('[data-pp="kortrubrik"]').textContent = 'Instruktioner för ' + t.ditt + ' i ' + t.namn;
    var pil = $('.pp-pil');
    if (pil) pil.textContent = 'Det här klistrar du in i ' + t.ditt + ' i ' + t.namn;
    $('[data-pp="s3titel"]').textContent = 'Skapa ' + (t.term === 'projekt' ? 'projektet' : t.term === 'Gem' ? 'din Gem' : 'agenten') + ' i ' + t.namn + ' och klistra in';
    $('[data-pp="s3text"]').textContent = 'Öppna ' + t.namn + ' i en ny flik och följ stegen. Kom tillbaka hit när du är klar.';
    $('[data-pp="guide"]').innerHTML = t.steg.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    $('[data-pp="tips"]').textContent = 'Bra att veta: ' + t.tips;
    var o1 = $('[data-pp="oppna1"]'), o2 = $('[data-pp="oppna2"]');
    [o1, o2].forEach(function (o) { if (o) { o.href = t.url; o.textContent = 'Öppna ' + t.namn + ' ↗'; } });
    $('[data-pp="nastatext"]').textContent = 'Kopierat! Nästa steg: skapa ' + t.ditt + ' i ' + t.namn + ' och klistra in texten.';
    var fn = $('[data-pp="filnot"]');
    if (fn) { fn.textContent = t.filnot; fn.style.display = t.filnot ? '' : 'none'; }
    var d = $('[data-pp="ditt"]');
    if (d) d.textContent = t.ditt;
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
        '<span class="pp-gor">' + esc(k.gor) + '</span>' +
        '<span class="pp-badge ' + statusKlass(s) + '">' + esc(statusText(s, t.namn)) + '</span>' +
        '<span class="pp-koppstatus' + (vald ? '' : ' is-av') + '">' + (vald ? '✓ Med i instruktionerna' : 'Inte med i instruktionerna. <a href="#pp-s2">Välj i steg 2 ↑</a>') + '</span>' +
      '</div>';
    }).join('');
    var val = $('[data-pp="koppval"]');
    if (val) val.innerHTML = kopplingar.map(function (k) {
      var s = k.status[S.tjanst];
      return '<li><label><input type="checkbox" data-kopp="' + esc(k.slug) + '"' + (S.kopp.indexOf(k.slug) !== -1 ? ' checked' : '') + '> <span><b>' + esc(k.namn) + '</b><small>' + esc(k.gor) + '</small></span><span class="pp-badge ' + statusKlass(s) + '">' + esc(statusText(s, t.namn)) + '</span></label></li>';
    }).join('');
    var datum = kopplingar.map(function (k) { return k.datum; }).filter(Boolean).map(function (d) { var x = new Date(d); return isNaN(x) ? null : x; }).filter(Boolean);
    var aldst = datum.length ? new Date(Math.min.apply(null, datum)) : null;
    var koll = $('[data-pp="koll"]');
    if (koll) koll.textContent = 'Visar läget i ' + t.namn + '. Utbudet skiljer sig mellan planer och ändras ofta.' + (aldst ? ' Senast kontrollerat ' + aldst.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }) + '.' : '');
  }

  function ritaFiler() {
    var lista = $('[data-pp="fillista"]');
    if (lista) {
      var med = P.filer.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return S.utanFiler.indexOf(o.i) === -1; });
      lista.innerHTML = med.length ? med.map(function (o) {
        return '<li><button type="button" class="pp-fil" data-fil="' + o.i + '" aria-pressed="false"><i aria-hidden="true"></i><span><b>' + esc(o.x.namn) + '</b>' + (o.x.varfor ? '<span>' + esc(o.x.varfor) + '</span>' : '') + '</span></button></li>';
      }).join('') : '<li class="pp-inga">Du har inte valt några filer i steg 2. Det går bra, men AI:n får då bara det du skriver i chatten.</li>';
    }
    [].forEach.call(root.querySelectorAll('[data-fil]'), function (b) {
      var klar = S.filer.indexOf(+b.getAttribute('data-fil')) !== -1;
      b.setAttribute('aria-pressed', klar ? 'true' : 'false');
      b.querySelector('i').textContent = klar ? '✓' : '';
    });
    ritaForlopp();
  }

  /* ── Klick ── */
  root.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && root.contains(a)) {
      if (a.hasAttribute('data-mall')) track('paket_mall', { mall: a.getAttribute('data-mall') });
      else if (a.classList.contains('pp-oppna')) track('paket_oppna_tjanst', { var: a.getAttribute('data-pp') });
      else if (a.classList.contains('pp-ingen')) track('paket_ingen_tjanst', {});
      return;
    }
    var b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute('data-tjanst')) {
      S.tjanst = b.getAttribute('data-tjanst');
      spara('aim_paket_tjanst', S.tjanst);
      markera('valt');
      ritaTjanst(); ritaInstr();
      track('paket_tjanst', {});
    } else if (b.getAttribute('data-pp') === 'kopiera') {
      S.kopierad = instruktioner();
      spara('aim_paket_kopierad_' + P.slug, S.kopierad);
      kopiera(S.kopierad, b, 'Kopierad ✓', 'Kopiera instruktionerna');
      markera('valt'); markera('kopierat');
      ritaInstr();
      $('[data-pp="nasta"]').classList.add('is-synlig');
      track('paket_kopiera', {
        egna_falt: ['foretag', 'gor', 'malgrupp'].filter(function (k) { return S.du[k]; }).length,
        regler_av: S.av.length,
        kopplingar: S.kopp.length,
        filer: P.filer.length - S.utanFiler.length
      });
    } else if (b.getAttribute('data-pp') === 'inklistrat') {
      if (S.steg.inklistrat) { delete S.steg.inklistrat; spara(STEG_KEY, S.steg); ritaForlopp(); }
      else { markera('inklistrat'); track('paket_inklistrat', {}); }
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
      markera('testat');
      track('paket_startprompt', { nr: n + 1 });
    }
  });
  root.addEventListener('change', function (e) {
    var cb = e.target;
    if (!cb.hasAttribute || !cb.hasAttribute('data-kopp')) return;
    var slug = cb.getAttribute('data-kopp');
    var k = S.kopp.indexOf(slug);
    if (cb.checked && k === -1) S.kopp.push(slug);
    if (!cb.checked && k !== -1) S.kopp.splice(k, 1);
    spara('aim_paket_kopp_' + P.slug, S.kopp);
    ritaKopplingar(); ritaInstr();
    track('paket_koppling', { koppling: slug, vald: cb.checked ? 1 : 0 });
  });

  ritaTjanst();
  ritaInstr();
  ritaFiler();
  var kalla = '';
  try { kalla = new URLSearchParams(location.search).get('source') || ''; } catch (e) {}
  track('paket_visa', { kopplingar_finns: kopplingar.length, faq: schema.length, kalla: kalla || (document.referrer.indexOf(location.host) !== -1 ? 'intern' : 'extern') });
})();
