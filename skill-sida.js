/* ============================================================
   AIMonkey — skill-sida.js (AI-skills Template)
   Gör en AI-skill i CMS:et till en steg-för-steg-sida: vad en skill
   är, sedan fem steg (välj tjänst, anpassa, hämta skillen som zip
   eller bygg den i chatten, installera, testa), ett extrasteg
   (använd i ett projekt) och vanliga frågor med FAQ-schema.

   Webflow-struktur (Designer, sidan AI-skills Template):
     [data-skill="app"]
       h1[data-skill="namn"]    ← Name
       [data-skill="forvem"]    ← För vem
       [data-skill="data"]      dolt, attribut bundna till CMS:
                                data-slug, data-etikett, data-skillnamn,
                                data-beskrivning, data-metod, data-regler,
                                data-utdata, data-exin, data-exut, data-om,
                                data-testja, data-testnej, data-mallnamn,
                                data-mallslug
       [data-skill="faq"]       h2 + Collection list (källa: skillens FAQ).
                                Post: [data-faq="item"] > h3[data-faq="q"],
                                RichText[data-faq="a"]
       [data-skill="apan"]      Komponenten "Apan tycker" (Apans text ← Apan tycker)
   Allt annat byggs av skriptet. Utan [data-skill="app"] gör det inget.

   Fältformat i CMS:
     metod   ett steg per rad
     regler  en per rad, börjar med "Alltid:" eller "Aldrig:"
     om      en per rad: Etikett | [PLATSHÅLLARE] | exempel
             (samma platshållare som promptgeneratorn fyller i, t.ex.
             [DITT FÖRETAG], delas via pg_kedja.fyll)
============================================================ */
(function () {
  'use strict';

  var app = document.querySelector('[data-skill="app"]');
  if (!app) return;

  var CSS = [
    '[data-skill="data"]{display:none!important}',
    '[data-skill="app"]{max-width:880px;margin:0 auto}',
    /* Toppen */
    '.sk-overst{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-bottom:14px}',
    '.sk-kicker{display:inline-flex;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:#0b1f3b;border-radius:999px;padding:6px 12px}',
    '.sk-etikett{display:inline-flex;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#005042;background:#e5f9f6;border-radius:999px;padding:6px 12px}',
    '.sk-pillar{font-size:14px;color:#00806b;text-decoration:none}',
    '.sk-pillar:hover{text-decoration:underline}',
    '.sk-alla{font-size:14px;font-weight:600;color:#0b1f3b;text-decoration:none}',
    '.sk-alla:hover{text-decoration:underline}',
    '[data-skill="namn"]{margin:0 0 12px}',
    '[data-skill="forvem"]{margin:0 0 16px;color:#3d4a5c;max-width:680px}',
    '.sk-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 28px;padding:0;list-style:none}',
    '.sk-chips li{font-size:14px;color:#24384f;border:1.5px solid #dbe2ea;border-radius:999px;padding:6px 12px;background:#fff}',
    /* Vad är det här */
    '.sk-forklaring{background:#fff;border:1.5px solid #e1e7ee;border-radius:24px;padding:26px 28px;margin:0 0 28px}',
    '.sk-forklaring h2{font-size:26px!important;line-height:1.2!important;margin:0 0 8px!important;color:#0b1f3b}',
    '.sk-forklaring > p{margin:0 0 20px;font-size:17px;line-height:1.6;color:#24384f;max-width:700px}',
    '.sk-jamfor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0 0 16px}',
    '.sk-chatt{border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px}',
    '.sk-chatt.is-utan{background:#f2f4f7}',
    '.sk-chatt.is-med{background:#e5f9f6}',
    '.sk-chatt-rubrik{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5b6573}',
    '.sk-chatt.is-med .sk-chatt-rubrik{color:#005042}',
    '.sk-bubbla{align-self:flex-end;max-width:92%;background:#0b1f3b;color:#fff;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:15px;line-height:1.45}',
    '.sk-bubbla.is-ai{align-self:flex-start;background:#fff;color:#0b1f3b;border:1.5px solid #dbe2ea;border-radius:16px 16px 16px 4px}',
    '.sk-chatt small{font-size:14px;color:#4a5668}',
    '.sk-chatt.is-med small{color:#24433d}',
    '.sk-forklaring-fot{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:15px;color:#4a5668}',
    '.sk-forklaring-fot a{color:#00806b;font-weight:600}',
    /* Förloppet */
    '.sk-forlopp{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 32px;padding:0;list-style:none;counter-reset:fl}',
    '.sk-forlopp li{counter-increment:fl}',
    '.sk-forlopp a{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#3d4a5c;text-decoration:none;border:1.5px dashed #c9d3de;border-radius:999px;padding:6px 14px 6px 6px;background:#fff}',
    '.sk-forlopp a:before{content:counter(fl);width:24px;height:24px;border-radius:50%;border:1.5px solid #c9d3de;display:inline-flex;align-items:center;justify-content:center;font-size:12px}',
    '.sk-forlopp li.is-klar a{border-style:solid;border-color:#bfeee5;background:#e5f9f6;color:#005042}',
    '.sk-forlopp li.is-klar a:before{content:"✓";background:#00c9a7;border-color:#00c9a7;color:#0b1f3b}',
    /* Stegen */
    '.sk-steg{margin:0 0 36px;scroll-margin-top:90px}',
    '.sk-steghuvud{display:flex;gap:14px;align-items:flex-start;margin:0 0 14px}',
    '.sk-stegnr{width:40px;height:40px;flex-shrink:0;border-radius:50%;background:#0b1f3b;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:17px;font-weight:700}',
    '.sk-steg.is-klar .sk-stegnr{background:#00c9a7;color:#0b1f3b;font-size:0}',
    '.sk-steg.is-klar .sk-stegnr:after{content:"✓";font-size:18px}',
    '.sk-steg.is-extra .sk-stegnr{background:#e5f9f6;color:#005042;font-size:12px}',
    '.sk-steghuvud h2{font-size:26px!important;line-height:1.2!important;margin:4px 0 4px!important;color:#0b1f3b}',
    '.sk-steghuvud p{margin:0;font-size:16px;line-height:1.55;color:#4a5668}',
    '.sk-kort{background:#fff;border:1.5px solid #e1e7ee;border-radius:20px;padding:24px 26px}',
    '.sk-tjanster{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.sk-tab{font:inherit;font-size:17px;font-weight:700;padding:12px 22px;min-height:50px;border-radius:999px;cursor:pointer;background:#fff;color:#0b1f3b;border:2px solid #c9d3de}',
    '.sk-tab[aria-pressed="true"]{background:#0b1f3b;color:#fff;border-color:#0b1f3b}',
    '.sk-ingen{font-size:15px;color:#00806b;font-weight:600;margin-left:6px}',
    '.sk-term{margin:14px 0 0;font-size:15px;line-height:1.5;color:#24433d;background:#e5f9f6;border-radius:12px;padding:10px 14px}',
    '.sk-falt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 18px}',
    '.sk-falt label{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600;color:#3d4a5c}',
    '.sk-falt input{font:inherit;font-size:16px;font-weight:400;min-height:48px;padding:10px 14px;border:2px solid #d3dbe4;border-radius:12px;background:#fff;color:#0b1f3b;width:100%;box-sizing:border-box}',
    '.sk-falt input:focus,.sk-reglerlista input:focus-visible{outline:none;border-color:#00c9a7;box-shadow:0 0 0 4px rgba(0,201,167,.2)}',
    '.sk-delrubrik{margin:0 0 6px;font-size:16px;font-weight:700;color:#0b1f3b}',
    '.sk-delingress{margin:0 0 14px;font-size:15px;line-height:1.5;color:#4a5668}',
    '.sk-regler{background:#e5f9f6;border:1.5px solid #bfeee5;border-radius:16px;padding:16px 18px;margin:0 0 18px}',
    '.sk-regler p{margin:0 0 10px;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#005042}',
    '.sk-reglerlista{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}',
    '.sk-reglerlista label{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45;color:#0b1f3b;cursor:pointer}',
    '.sk-reglerlista input{width:18px;height:18px;margin-top:2px;flex-shrink:0;accent-color:#00806b}',
    '.sk-reglerlista em{font-style:normal;font-weight:600;color:#005042}',
    '.sk-instr{border:2px solid #00c9a7;border-radius:18px;padding:20px 22px;background:#fff}',
    '.sk-instr-topp{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:14px;color:#4a5668;margin-bottom:10px}',
    '.sk-instr-topp strong{color:#005042}',
    '.sk-instr pre{margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:16px;line-height:1.6;color:#0b1f3b;max-height:420px;overflow:auto}',
    '.sk-knappar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:16px}',
    '.sk-kopiera{font:inherit;font-size:18px;font-weight:700;padding:16px 28px;min-height:56px;border-radius:14px;border:0;background:#ffd23f;color:#0b1f3b;cursor:pointer}',
    '.sk-kopiera:hover{background:#ffdf78}',
    '.sk-kopiera.is-kopierad,.sk-liten.is-kopierad{background:#00c9a7;color:#0b1f3b;border-color:#00c9a7}',
    '.sk-knappar small{font-size:14px;color:#4a5668}',
    '.sk-nasta{display:none;flex-wrap:wrap;gap:10px 16px;align-items:center;margin-top:14px;background:#0b1f3b;color:#fff;border-radius:16px;padding:14px 18px;font-size:16px}',
    '.sk-nasta.is-synlig{display:flex}',
    '.sk-nasta span{flex:1 1 260px}',
    '.sk-oppna{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:16px;padding:12px 18px;min-height:48px;box-sizing:border-box;border-radius:12px;background:#ffd23f;color:#0b1f3b!important;text-decoration:none}',
    '.sk-oppna:hover{background:#ffdf78}',
    '.sk-oppna.is-ljus{background:#fff;border:1.5px solid #0b1f3b}',
    '.sk-guide ol{margin:0 0 16px;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px;counter-reset:pp}',
    '.sk-guide li{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.5;counter-increment:pp}',
    '.sk-guide li:before{content:counter(pp);width:28px;height:28px;border-radius:50%;background:#0b1f3b;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}',
    '.sk-tips{margin:0 0 16px;font-size:15px;line-height:1.5;color:#24433d;background:#e5f9f6;border-radius:12px;padding:12px 14px}',
    '.sk-klarknapp{font:inherit;font-size:15px;font-weight:600;padding:10px 18px;min-height:48px;border-radius:12px;border:1.5px solid #0b1f3b;background:#fff;color:#0b1f3b;cursor:pointer}',
    '.sk-klarknapp[aria-pressed="true"]{background:#00c9a7;border-color:#00c9a7}',
    '.sk-filer{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}',
    '.sk-fil{display:flex;gap:14px;align-items:center;width:100%;text-align:left;font:inherit;font-size:16px;color:#0b1f3b;background:#fff;border:1.5px solid #dbe2ea;border-radius:14px;padding:12px 16px;min-height:56px;cursor:pointer}',
    '.sk-fil i{font-style:normal;width:26px;height:26px;border-radius:8px;border:2px solid #c9d3de;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0}',
    '.sk-fil b{display:block;font-weight:600}',
    '.sk-fil span span{display:block;font-size:14px;color:#4a5668}',
    '.sk-fil[aria-pressed="true"]{background:#e5f9f6;border-color:#bfeee5}',
    '.sk-fil[aria-pressed="true"] i{background:#00c9a7;border-color:#00c9a7;color:#0b1f3b}',
    '.sk-filnot{margin:12px 0 0;font-size:14px;color:#4a5668}',
    '.sk-start{display:flex;flex-direction:column;gap:12px}',
    '.sk-startkort{border:1.5px solid #dbe2ea;border-radius:16px;padding:16px 18px}',
    '.sk-startkort-topp{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:6px 12px;margin-bottom:10px}',
    '.sk-startkort-topp strong{font-size:18px;color:#0b1f3b}',
    '.sk-startkort-topp a{font-size:14px;font-weight:600;color:#00806b}',
    '.sk-startkort p{margin:0 0 12px;font-size:16px;line-height:1.55;color:#24384f;background:#f2f6f9;border-radius:12px;padding:12px 14px}',
    '.sk-liten{font:inherit;font-size:15px;font-weight:600;padding:10px 18px;min-height:44px;border-radius:12px;border:1.5px solid #0b1f3b;background:#fff;color:#0b1f3b;cursor:pointer}',
    '.sk-kopplingar{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}',
    '.sk-koppling{display:flex;flex-direction:column;gap:10px;border:1.5px solid #dbe2ea;border-radius:16px;padding:16px 18px;background:#fff}',
    '.sk-koppling.is-vald{border:2px solid #00c9a7;background:#f6fdfb}',
    '.sk-koppling-topp{display:flex;gap:12px;align-items:center}',
    '.sk-ikon{width:42px;height:42px;flex-shrink:0;border-radius:12px;background:#0b1f3b;color:#4cd9c1;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}',
    '.sk-koppling-topp b{display:block;font-size:17px;color:#0b1f3b}',
    '.sk-koppling-topp small{display:block;font-size:13px;color:#4a5668}',
    '.sk-koppling .sk-gor{font-size:15px;line-height:1.5;color:#24384f;flex-grow:1}',
    '.sk-badge{align-self:flex-start;font-size:13px;font-weight:600;padding:5px 10px;border-radius:999px}',
    '.sk-badge.is-finns{background:#e5f9f6;color:#005042}',
    '.sk-badge.is-saknas{background:#eef1f5;color:#4a5668}',
    '.sk-badge.is-kolla{background:#fff4cc;color:#6b5200}',
    '.sk-koppling .sk-liten[aria-pressed="true"]{background:#0b1f3b;color:#fff}',
    '.sk-sakerhet{display:flex;gap:14px;align-items:flex-start;margin-top:16px;background:#fff7db;border:1.5px solid #f2dc8a;border-radius:14px;padding:14px 16px;font-size:15px;line-height:1.5;color:#3d3410}',
    '.sk-sakerhet strong{display:block;margin-bottom:4px}',
    '.sk-sakerhet a{color:#00664f;font-weight:600}',
    '.sk-sakerhet svg{flex-shrink:0;margin-top:2px}',
    '.sk-koll{display:block;margin-top:12px;font-size:13px;color:#5b6573}',
    '.sk-inga{margin:0;font-size:16px;color:#24433d;background:#e5f9f6;border-radius:12px;padding:12px 16px}',
    /* FAQ */
    '[data-skill="faq"]{margin:0 0 36px;scroll-margin-top:90px}',
    '[data-skill="faq"].sk-tom{display:none}',
    '[data-skill="faq"] > h2{font-size:2.75rem!important;line-height:1.2!important;font-weight:700;letter-spacing:-.0275rem;margin:0 0 1rem!important;color:#313a47}',
    '@media (max-width:991px){[data-skill="faq"] > h2{font-size:2.25rem!important}}',
    '@media (max-width:767px){[data-skill="faq"] > h2{font-size:2rem!important}}',
    '[data-skill="faq"] .w-dyn-empty{display:none!important}',
    '[data-skill="faq"] [role="list"],[data-skill="faq"] .w-dyn-items{display:flex;flex-direction:column;gap:0}',
    '[data-faq="item"]{background:none;border:0;border-bottom:1px solid rgba(1,2,3,.1);border-radius:0}',
    '[data-faq="q"]{margin:0!important;font-size:1.125rem!important;line-height:1.5!important;font-weight:700;color:#313a47}',
    '.sk-faq-knapp{display:flex;justify-content:space-between;align-items:center;gap:1.5rem;width:100%;text-align:left;font:inherit;font-size:1.125rem;font-weight:700;color:#313a47;background:none;border:0;padding:1.25rem 0;min-height:56px;cursor:pointer}',
    '.sk-faq-knapp:after{content:"+";font-size:2rem;font-weight:300;line-height:1;color:#313a47;flex-shrink:0;width:2rem;text-align:center;transition:transform .3s}',
    '.sk-faq-knapp[aria-expanded="true"]:after{transform:rotate(45deg)}',
    '[data-faq="a"]{padding:0 3.5rem 1.25rem 0;font-size:1rem;line-height:1.6;color:#313a47}',
    '[data-faq="a"] p{margin:0}',
    '[data-faq="a"] a{color:inherit;font-weight:700;text-decoration:underline}',
    '[data-faq="a"][hidden]{display:none}',
    /* Apan */
    '[data-skill="apan"].sk-tom{display:none}',
    '.sk-h1-typ{color:#00806b}',
    '[data-skill="namn"]{font-size:clamp(34px,5vw,56px)!important;line-height:1.1!important}',
    '.sk-val{border:1.5px solid #e1e7ee;border-radius:16px;padding:16px 18px;margin:0 0 18px}',
    '.sk-val.is-mint{background:#e5f9f6;border-color:#bfeee5}',
    '.sk-valrubrik{margin:0 0 4px!important;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#005042}',
    '.sk-valingress{margin:0 0 12px!important;font-size:14px;line-height:1.5;color:#4a5668}',
    '.sk-reglerlista small{display:block;font-size:13px;color:#4a5668}',
    '.sk-reglerlista .sk-badge{flex:0 0 auto;align-self:flex-start;margin-left:auto;font-size:12px;padding:3px 8px;white-space:nowrap}',
    '.sk-reglerlista label>span:not(.sk-badge){flex:1 1 0;min-width:0}',
    '.sk-pil{display:flex;align-items:center;gap:8px;margin:4px 0 10px;font-size:15px;font-weight:600;color:#0b1f3b}',
    '.sk-pil:before{content:"↓";display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#00c9a7;color:#0b1f3b;font-weight:700}',
    '.sk-andrat{display:none;margin-top:12px;background:#fff4cc;border:1.5px solid #f2d66b;color:#4d3b00;border-radius:14px;padding:12px 16px;font-size:15px}',
    '.sk-andrat.is-synlig{display:block}',
    '.sk-koppstatus{display:block;margin-top:auto;font-size:13px;font-weight:600;color:#005042}',
    '.sk-koppstatus.is-av{color:#5b6573;font-weight:500}',
    '@media (max-width:767px){.sk-reglerlista label{flex-wrap:wrap}.sk-reglerlista label>span:not(.sk-badge){flex-basis:calc(100% - 28px)}.sk-reglerlista .sk-badge{margin-left:28px}.sk-falt,.sk-jamfor{grid-template-columns:1fr}.sk-kort,.sk-forklaring{padding:18px}.sk-kopiera{width:100%}.sk-steghuvud h2,.sk-forklaring h2{font-size:22px!important}.sk-forlopp{display:none}}',
    /* Skillsidan */
    '.sk-hamta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 14px}',
    '.sk-hamtakort{display:flex;flex-direction:column;gap:10px;border:1.5px solid #dbe2ea;border-radius:16px;padding:16px 18px;background:#fff}',
    '.sk-hamtakort.is-forst{border:2px solid #00c9a7;background:#f6fdfb}',
    '.sk-hamtakort strong{font-size:18px;color:#0b1f3b}',
    '.sk-hamtakort span{font-size:15px;line-height:1.5;color:#24384f;flex-grow:1}',
    '.sk-hamtakort .sk-kopiera,.sk-hamtakort .sk-liten{align-self:flex-start}',
    '.sk-saknas{margin:0 0 14px;background:#fff4cc;border:1.5px solid #f2d66b;color:#4d3b00;border-radius:14px;padding:12px 16px;font-size:15px;line-height:1.5}',
    '.sk-mdrad{margin:0;font-size:14px;color:#4a5668}',
    '.sk-textknapp{font:inherit;font-size:14px;font-weight:600;color:#00806b;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer}',
    '.sk-forhand{margin-top:4px}',
    '.sk-forhand summary{cursor:pointer;font-size:15px;font-weight:600;color:#00806b;margin:0 0 10px}',
    '.sk-startkort.is-ja{border-color:#bfeee5;background:#f6fdfb}',
    '.sk-startkort.is-nej{border-color:#e1e7ee;background:#fafbfc}',
    '.sk-mer{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}',
    '.sk-merlank{display:flex;flex-direction:column;gap:6px;border:1.5px solid #dbe2ea;border-radius:16px;padding:16px 18px;text-decoration:none;background:#fff}',
    '.sk-merlank:hover{border-color:#00c9a7}',
    '.sk-merlank strong{font-size:17px;color:#0b1f3b}',
    '.sk-merlank span{font-size:14px;color:#00806b;font-weight:600}',
    '@media (max-width:767px){.sk-hamta{grid-template-columns:1fr}.sk-hamtakort .sk-kopiera{width:100%}}'
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
  var dataEl = app.querySelector('[data-skill="data"]');
  function f(key) { return dataEl ? (dataEl.getAttribute('data-' + key) || '').replace(/\r/g, '').trim() : ''; }
  function rader(s) { return s.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var namnEl = app.querySelector('[data-skill="namn"]');
  var forvem = app.querySelector('[data-skill="forvem"]');
  var K = {
    slug: f('slug') || (location.pathname.split('/').filter(Boolean).pop() || ''),
    namn: textAv(namnEl),
    etikett: f('etikett'),
    skillnamn: '',
    beskrivning: f('beskrivning').replace(/\s+/g, ' '),
    metod: rader(f('metod')).map(function (x) { return x.replace(/^\d+[.)]\s*/, ''); }),
    regler: rader(f('regler')),
    utdata: f('utdata'),
    exIn: f('exin'),
    exUt: f('exut'),
    om: rader(f('om')).map(function (r) {
      var d = r.split('|');
      return { etikett: d[0].trim(), ph: (d[1] || '').trim() || '[' + d[0].trim().toUpperCase() + ']', ex: (d[2] || '').trim() };
    }),
    testJa: f('testja'),
    testNej: f('testnej'),
    mallNamn: f('mallnamn'),
    mallSlug: f('mallslug')
  };
  /* name i SKILL.md: små bokstäver, siffror, bindestreck, max 64 */
  function giltigtNamn(s) {
    return (s || '').toLowerCase()
      .replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e')
      .replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '');
  }
  K.skillnamn = giltigtNamn(f('skillnamn') || K.slug) || 'min-skill';

  /* ── Lagring (per webbläsare, tål blockerad lagring) ── */
  function las(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function spara(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  /* Samma "fyll i en gång"-lager som promptgeneratorn och projektmallarna */
  var KEDJA = 'pg_kedja';
  var kedja = las(KEDJA, {});
  if (!kedja || typeof kedja !== 'object') kedja = {};
  kedja.fyll = kedja.fyll || {};
  kedja.mallar = kedja.mallar || {};

  var TJANSTER = {
    claude: {
      namn: 'Claude', url: 'https://claude.ai/',
      termText: 'Claude har skills i alla chattar och projekt. Du laddar upp zip-filen under Inställningar.',
      hamta: 'zip',
      steg: ['Öppna Claude och gå till Inställningar.', 'Leta upp Skills (under Funktioner eller Anpassa, beroende på version) och välj Ladda upp skill.', 'Välj zip-filen du laddade ner och kolla att skillen är påslagen.', 'Klart. Claude använder skillen själv när uppgiften passar.'],
      tips: 'Hittar du inte Skills i inställningarna? Använd knappen Kopiera och låt AI:n bygga den i stället, så skapar Claude skillen åt dig i chatten.'
    },
    chatgpt: {
      namn: 'ChatGPT', url: 'https://chatgpt.com/',
      termText: 'I ChatGPT finns skills under Plugins. Enligt OpenAI gäller det just nu Business, Enterprise, Healthcare och Edu.',
      hamta: 'zip',
      steg: ['Öppna ChatGPT och välj Plugins i sidomenyn.', 'Gå till fliken Skills och klicka på Skapa.', 'Välj Ladda upp från datorn och välj zip-filen du laddade ner.', 'Klart. ChatGPT använder skillen själv när uppgiften passar.'],
      tips: 'Har du Plus eller gratisversionen? Då finns inte skills än. Kopiera SKILL.md och klistra in texten som instruktioner i ett projekt eller en Custom GPT. Det blir nästan samma sak.'
    },
    gemini: {
      namn: 'Gemini', url: 'https://gemini.google.com/',
      termText: 'I Gemini heter det skill, och skills ersätter Gems under november 2026. Det kräver ett personligt Google-konto och att du är över 18.',
      hamta: 'zip',
      steg: ['Öppna gemini.google.com och gå till Inställningar och Skills.', 'Ladda upp skillen. Det funkar på webben och i Mac-appen.', 'I mobilen: välj Skapa manuellt, skriv namnet ”' + K.skillnamn + '”, klistra in beskrivningen och resten av SKILL.md.', 'Klart. Skriv / i chatten för att se dina skills.'],
      tips: 'Enklast i mobilen är knappen Kopiera och låt AI:n bygga den. Klistra in i en chatt, så skapar Gemini skillen åt dig.'
    },
    copilot: {
      namn: 'Copilot', url: 'https://m365.cloud.microsoft/',
      termText: 'I Microsoft 365 Copilot finns skills bland annat i Cowork, PowerPoint och Excel. Det kräver ett jobbkonto med Copilot.',
      hamta: 'zip',
      steg: ['Öppna Copilot Cowork och gå till Anpassa.', 'Välj Skills och ladda upp zip-filen. En .md-fil går också bra.', 'Skillen sparas i din OneDrive och gäller bara dig.', 'Klart. Copilot använder skillen när uppgiften passar.'],
      tips: 'Hittar du inte Skills? Funktionen kan vara avstängd i ert konto, så fråga IT. Under tiden kan du klistra in SKILL.md som instruktioner i en agent.'
    }
  };
  var ORDNING = ['claude', 'chatgpt', 'gemini', 'copilot'];
  var ARTIKEL_URL = '/artiklar/prompt-skill-eller-projekt';
  var STEG_KEY = 'aim_skill_steg_' + K.slug;

  var S = {
    tjanst: las('aim_paket_tjanst', 'claude'),
    av: las('aim_skill_av_' + K.slug, []),
    steg: las(STEG_KEY, {})
  };
  if (!TJANSTER[S.tjanst]) S.tjanst = 'claude';
  if (!S.steg || typeof S.steg !== 'object') S.steg = {};

  function track(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event, skill: K.slug, tjanst: S.tjanst };
    for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }
  function markera(key) {
    if (S.steg[key]) return;
    S.steg[key] = 1;
    spara(STEG_KEY, S.steg);
    ritaForlopp();
  }

  /* ── SKILL.md ── */
  function aktiv(t) { return S.av.indexOf(t) === -1; }
  function punkt(t) { return '- ' + t.replace(/[.\s]+$/, '') + '.'; }
  function varde(o) { return (kedja.fyll[o.ph] || '').trim(); }
  function saknas() { return K.om.filter(function (o) { return !varde(o); }); }
  function yaml(s) { return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
  function kort(n) { return (n || '').split(/\s[—–:-]\s/)[0].trim(); }

  function kropp() {
    var r = [];
    r.push('# ' + (kort(K.namn) || K.skillnamn));
    if (K.om.length) {
      r.push('', '## Om mig');
      K.om.forEach(function (o) { r.push('- ' + o.etikett + ': ' + (varde(o) || '[FYLL I: ' + o.etikett.toLowerCase() + ']')); });
    }
    if (K.metod.length) {
      r.push('', '## Så gör du');
      K.metod.forEach(function (m, i) { r.push((i + 1) + '. ' + m); });
    }
    var regler = K.regler.filter(aktiv);
    var alltid = regler.filter(function (x) { return /^alltid:/i.test(x); }).map(function (x) { return x.replace(/^alltid:\s*/i, ''); }).concat(['Fråga mig om något viktigt saknas i stället för att gissa']);
    var aldrig = ['Hitta på fakta, siffror eller citat'].concat(regler.filter(function (x) { return /^aldrig:/i.test(x); }).map(function (x) { return x.replace(/^aldrig:\s*/i, ''); }));
    var ovriga = regler.filter(function (x) { return !/^(alltid|aldrig):/i.test(x); });
    r.push('', '## Regler');
    r.push('Gör alltid:'); alltid.forEach(function (a) { r.push(punkt(a)); });
    r.push('Gör aldrig:'); aldrig.forEach(function (a) { r.push(punkt(a)); });
    ovriga.forEach(function (a) { r.push(punkt(a)); });
    if (K.utdata) r.push('', '## Så ska svaret se ut', K.utdata);
    if (K.exIn && K.exUt) r.push('', '## Exempel', 'Jag skriver:', K.exIn, '', 'Ett bra svar:', K.exUt);
    r.push('', '---', 'Skillen kommer från AIMonkey. Senaste versionen finns på https://www.aimonkey.se/ai-skills/' + K.slug);
    return r.join('\n');
  }
  function skillMd() {
    return '---\nname: ' + K.skillnamn + '\ndescription: ' + yaml(K.beskrivning.slice(0, 1024)) + '\n---\n\n' + kropp() + '\n';
  }
  function byggPrompt() {
    return 'Skapa en skill åt mig och spara den bland mina skills.\n\n' +
      'Namn: ' + K.skillnamn + '\n' +
      'Beskrivning (när skillen ska användas): ' + K.beskrivning + '\n\n' +
      'Instruktionerna nedan ska stå i skillen exakt som de är skrivna. Fråga mig om något saknas innan du sparar, och säg till när skillen är klar att använda.\n\n' +
      kropp();
  }

  /* ── Zip i webbläsaren (okomprimerad, UTF-8-namn) ── */
  var CRC = (function () {
    var t = [];
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  function zip(filer) {
    var delar = [], central = [], offset = 0;
    var d = new Date();
    var tid = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var dat = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    filer.forEach(function (fil) {
      var namn = utf8(fil.namn), data = fil.data || new Uint8Array(0), mapp = /\/$/.test(fil.namn);
      var crc = crc32(data);
      var lokal = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(tid), u16(dat), u32(crc), u32(data.length), u32(data.length), u16(namn.length), u16(0));
      delar.push(new Uint8Array(lokal), namn, data);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(tid), u16(dat), u32(crc), u32(data.length), u32(data.length), u16(namn.length), u16(0), u16(0), u16(0), u16(0), u32(mapp ? 0x10 : 0), u32(offset))), namn);
      offset += lokal.length + namn.length + data.length;
    });
    var cdStorlek = central.reduce(function (s, x) { return s + x.length; }, 0);
    var slut = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(filer.length), u16(filer.length), u32(cdStorlek), u32(offset), u16(0)));
    return new Blob(delar.concat(central, [slut]), { type: 'application/zip' });
  }
  function laddaNer() {
    var blob = zip([{ namn: K.skillnamn + '/' }, { namn: K.skillnamn + '/SKILL.md', data: utf8(skillMd()) }]);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = K.skillnamn + '.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
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
  var faq = app.querySelector('[data-skill="faq"]');
  var apan = app.querySelector('[data-skill="apan"]');
  if (apan && (!textAv(apan) || apan.querySelector('.apan-tycker .w-dyn-bind-empty'))) apan.classList.add('sk-tom');
  var faqItems = faq ? [].slice.call(faq.querySelectorAll('[data-faq="item"]')) : [];
  if (faq && !faqItems.length) faq.classList.add('sk-tom');
  if (faq) faq.id = 'vanliga-fragor';

  var topp = document.createElement('div');
  topp.className = 'sk-overst';
  topp.innerHTML = '<a class="sk-alla" href="/ai-skills">← Alla AI-skills</a>';
  if (K.etikett) topp.innerHTML += '<span class="sk-etikett">' + esc(K.etikett) + '</span>';
  topp.innerHTML += '<a class="sk-pillar" href="' + ARTIKEL_URL + '">Vad är en AI-skill? →</a>';
  if (namnEl && !namnEl.querySelector('.sk-h1-typ')) {
    var typ = document.createElement('span');
    typ.className = 'sk-h1-typ';
    typ.textContent = 'AI-skill: ';
    namnEl.insertBefore(typ, namnEl.firstChild);
  }
  namnEl.parentNode.insertBefore(topp, namnEl);
  topp.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.classList.contains('sk-alla')) track('skill_mer', { till: '/ai-skills', plats: 'topp' });
  });

  var root = document.createElement('div');
  root.className = 'sk-root';
  (forvem || namnEl).insertAdjacentElement('afterend', root);

  var FORLOPP = [
    { id: 'valt', namn: 'Välj tjänst', mal: 'sk-s1' },
    { id: 'anpassat', namn: 'Anpassa', mal: 'sk-s2' },
    { id: 'hamtat', namn: 'Hämta skillen', mal: 'sk-s3' },
    { id: 'installerat', namn: 'Installera', mal: 'sk-s4' },
    { id: 'testat', namn: 'Testa', mal: 'sk-s5' }
  ];

  function steghuvud(nr, titel, text, id) {
    return '<div class="sk-steghuvud"><span class="sk-stegnr" aria-hidden="true">' + nr + '</span><div><h2 id="' + id + '-rubrik">' + titel + '</h2>' + (text ? '<p>' + text + '</p>' : '') + '</div></div>';
  }
  var exIn = K.exIn ? K.exIn.split('\n')[0] : 'Kan du hjälpa mig med det här?';
  if (exIn.length > 140) exIn = exIn.slice(0, 137).replace(/\s+\S*$/, '') + ' …';
  /* Utan skill: de första reglerna, som man annars skulle skriva varje gång */
  var utanText = K.regler.map(function (r) {
    var aldrig = /^aldrig\s*:/i.test(r);
    var t = r.replace(/^(alltid|aldrig)\s*:\s*/i, '').replace(/[.]$/, '');
    t = t.charAt(0).toLowerCase() + t.slice(1);
    return aldrig ? 'aldrig ' + t : t;
  }).filter(function (t) { return t.length <= 65; }).slice(0, 3).join(', ');
  utanText = utanText ? utanText.charAt(0).toUpperCase() + utanText.slice(1) : 'Skriv kort, i vår ton, aldrig några löften';

  root.innerHTML =
    '<ul class="sk-chips"><li>Klar på 5 minuter</li><li>Gratis</li><li>Funkar i Claude, ChatGPT, Gemini och Copilot</li></ul>' +

    '<section class="sk-forklaring" aria-labelledby="sk-vad">' +
      '<h2 id="sk-vad">Vad är det här?</h2>' +
      '<p>En <strong>AI-skill</strong> är ett sparat arbetssätt för en uppgift du gör ofta. Du installerar den en gång i din AI-tjänst, sedan finns den i alla chattar. AI:n märker själv när skillen behövs och följer receptet, så du slipper klistra in samma regler varje gång. Här anpassar du skillen, laddar ner den och installerar den.</p>' +
      '<div class="sk-jamfor">' +
        '<div class="sk-chatt is-utan"><span class="sk-chatt-rubrik">Utan skill</span>' +
          '<div class="sk-bubbla">' + esc(utanText) + ' … Och så här är det: ' + esc(exIn) + '</div>' +
          '<small>Samma regler. Varje gång.</small></div>' +
        '<div class="sk-chatt is-med"><span class="sk-chatt-rubrik">Med skill</span>' +
          '<div class="sk-bubbla">' + esc(exIn) + '</div>' +
          '<div class="sk-bubbla is-ai">Här är ett förslag enligt din skill …</div>' +
          '<small>AI:n kan receptet redan.</small></div>' +
      '</div>' +
      '<div class="sk-forklaring-fot"><span>Följ stegen nedan, det tar ungefär fem minuter.</span><a href="#vanliga-fragor">Första gången? Läs vanliga frågor ↓</a></div>' +
    '</section>' +

    '<ol class="sk-forlopp" aria-label="Dina steg">' + FORLOPP.map(function (s) { return '<li data-fl="' + s.id + '"><a href="#' + s.mal + '">' + s.namn + '</a></li>'; }).join('') + '</ol>' +

    '<section class="sk-steg" id="sk-s1" data-stegid="valt" aria-labelledby="sk-s1-rubrik">' +
      steghuvud(1, 'Välj din AI-tjänst', 'Guiden nedan anpassas efter tjänsten du använder.', 'sk-s1') +
      '<div class="sk-kort"><div class="sk-tjanster" role="group" aria-label="Välj AI-tjänst">' +
        ORDNING.map(function (id) { return '<button type="button" class="sk-tab" data-tjanst="' + id + '" aria-pressed="false">' + TJANSTER[id].namn + '</button>'; }).join('') +
      '</div><p class="sk-term" data-sk="term"></p></div>' +
    '</section>' +

    '<section class="sk-steg" id="sk-s2" data-stegid="anpassat" aria-labelledby="sk-s2-rubrik">' +
      steghuvud(2, 'Anpassa skillen', 'Det du fyller i skrivs in i skillen, så att AI:n vet vem du är. Allt sparas bara i din webbläsare.', 'sk-s2') +
      '<div class="sk-kort">' +
        (K.om.length ?
        '<div class="sk-val"><p class="sk-valrubrik">Om dig</p><p class="sk-valingress">Fylls i automatiskt i promptgeneratorn, mallarna och projektmallarna också.</p>' +
          '<div class="sk-falt">' + K.om.map(function (o, i) {
            return '<label>' + esc(o.etikett) + '<input data-om="' + i + '" placeholder="' + esc(o.ex ? 'T.ex. ' + o.ex : '') + '"></label>';
          }).join('') + '</div></div>' : '') +
        (K.regler.length ?
        '<div class="sk-val is-mint"><p class="sk-valrubrik">Regler</p><p class="sk-valingress">Ingår i skillen. Klicka ur det som inte passar dig.</p><ul class="sk-reglerlista">' +
          K.regler.map(function (t, i) {
            var m = /^(alltid|aldrig):\s*/i.exec(t);
            var visa = m ? '<em>' + (m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()) + ':</em> ' + esc(t.slice(m[0].length)) : esc(t);
            return '<li><label><input type="checkbox" data-regel="' + i + '"> <span>' + visa + '</span></label></li>';
          }).join('') +
        '</ul></div>' : '') +
        '<details class="sk-forhand"><summary>Visa hela SKILL.md</summary><div class="sk-instr"><div class="sk-instr-topp"><strong>' + esc(K.skillnamn) + '/SKILL.md</strong><span data-sk="tecken"></span></div><pre data-sk="md"></pre></div></details>' +
      '</div>' +
    '</section>' +

    '<section class="sk-steg" id="sk-s3" data-stegid="hamtat" aria-labelledby="sk-s3-rubrik">' +
      steghuvud(3, 'Hämta skillen', 'Välj ett av sätten. Ladda ner om du vill installera själv, eller låt AI:n bygga skillen åt dig i en chatt.', 'sk-s3') +
      '<div class="sk-kort">' +
        '<p class="sk-saknas" data-sk="saknas" role="status"></p>' +
        '<div class="sk-hamta">' +
          '<div class="sk-hamtakort is-forst"><strong>Ladda ner</strong><span>En zip-fil med mappen ' + esc(K.skillnamn) + ' och filen SKILL.md. Den laddar du upp i steg 4.</span><button type="button" class="sk-kopiera" data-sk="ladda">Ladda ner skill (.zip)</button></div>' +
          '<div class="sk-hamtakort"><strong>Låt AI:n bygga den</strong><span>Kopiera en färdig prompt och klistra in den i en chatt. Funkar i alla fyra, även i mobilen.</span><button type="button" class="sk-liten" data-sk="bygg">Kopiera prompten</button></div>' +
        '</div>' +
        '<p class="sk-mdrad"><button type="button" class="sk-textknapp" data-sk="kopieramd">Kopiera bara SKILL.md</button> för att klistra in den som instruktioner i ett projekt, en Custom GPT eller en agent.</p>' +
      '</div>' +
    '</section>' +

    '<section class="sk-steg" id="sk-s4" data-stegid="installerat" aria-labelledby="sk-s4-rubrik">' +
      steghuvud(4, '<span data-sk="s4titel"></span>', 'Öppna tjänsten i en ny flik och följ stegen. Kom tillbaka hit när du är klar.', 'sk-s4') +
      '<div class="sk-kort sk-guide"><ol data-sk="guide"></ol><p class="sk-tips" data-sk="tips"></p>' +
        '<div class="sk-knappar"><a class="sk-oppna is-ljus" data-sk="oppna" target="_blank" rel="noopener"></a><button type="button" class="sk-klarknapp" data-sk="installerat" aria-pressed="false">Klart, skillen är installerad</button></div>' +
      '</div>' +
    '</section>' +

    ((K.testJa || K.testNej) ?
    '<section class="sk-steg" id="sk-s5" data-stegid="testat" aria-labelledby="sk-s5-rubrik">' +
      steghuvud(5, 'Testa skillen', 'Starta en ny chatt och prova båda. Den första ska starta skillen. Den andra ska inte göra det. Startar skillen när den inte borde, skriv beskrivningen tydligare.', 'sk-s5') +
      '<div class="sk-kort"><div class="sk-start">' +
        (K.testJa ? '<div class="sk-startkort is-ja"><div class="sk-startkort-topp"><strong>Ska starta skillen</strong></div><p>' + esc(K.testJa) + '</p><button type="button" class="sk-liten" data-test="ja">Kopiera</button></div>' : '') +
        (K.testNej ? '<div class="sk-startkort is-nej"><div class="sk-startkort-topp"><strong>Ska inte starta skillen</strong></div><p>' + esc(K.testNej) + '</p><button type="button" class="sk-liten" data-test="nej">Kopiera</button></div>' : '') +
      '</div></div>' +
    '</section>' : '') +

    '<section class="sk-steg is-extra" id="sk-s6" aria-labelledby="sk-s6-rubrik">' +
      steghuvud('Extra', 'Gör mer med skillen', 'En skill gör en sak bra. Vill du att AI:n också ska känna till ditt företag, dina priser och dina filer, så samla allt i ett projekt.', 'sk-s6') +
      '<div class="sk-kort sk-mer">' +
        (K.mallSlug ? '<a class="sk-merlank" data-mall="' + esc(K.mallSlug) + '" href="/ai-mallar/' + encodeURIComponent(K.mallSlug) + '"><strong>Gör det steg för steg först</strong><span>' + esc(kort(K.mallNamn) || 'Hela mallen') + ': stegflödet skillen bygger på →</span></a>' : '') +
        '<a class="sk-merlank" href="/projektpaket/smaforetagets-ai-avdelning?source=skill&amp;skill=' + encodeURIComponent(K.slug) + '"><strong>Samla det i ett projekt</strong><span>Projektmallar för ChatGPT, Claude, Gemini och Copilot →</span></a>' +
        '<a class="sk-merlank" href="' + ARTIKEL_URL + '"><strong>Prompt, skill eller projekt?</strong><span>Så väljer du rätt verktyg →</span></a>' +
        '<a class="sk-merlank" href="/ai-skills"><strong>Fler färdiga AI-skills</strong><span>Se alla skills på svenska →</span></a>' +
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
    var id = 'sk-faq-' + i;
    a.id = id;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sk-faq-knapp';
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
      if (!oppen) track('skill_faq', { fraga: fraga.slice(0, 80) });
    });
  });
  if (schema.length) {
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: schema });
    document.head.appendChild(ld);
  }

  /* ── Fälten och reglerna ── */
  [].forEach.call(root.querySelectorAll('[data-om]'), function (inp) {
    var o = K.om[+inp.getAttribute('data-om')];
    inp.value = varde(o);
    inp.addEventListener('input', function () {
      kedja = las(KEDJA, kedja) || kedja;
      kedja.fyll = kedja.fyll || {};
      kedja.mallar = kedja.mallar || {};
      var v = inp.value.trim();
      if (v) kedja.fyll[o.ph] = v; else delete kedja.fyll[o.ph];
      spara(KEDJA, kedja);
      markera('anpassat');
      ritaMd();
    });
    inp.addEventListener('change', function () { if (inp.value.trim()) track('skill_fyll', { falt: o.etikett.slice(0, 40) }); });
  });
  [].forEach.call(root.querySelectorAll('[data-regel]'), function (cb) {
    var t = K.regler[+cb.getAttribute('data-regel')];
    cb.checked = aktiv(t);
    cb.addEventListener('change', function () {
      var i = S.av.indexOf(t);
      if (cb.checked && i !== -1) S.av.splice(i, 1);
      if (!cb.checked && i === -1) S.av.push(t);
      spara('aim_skill_av_' + K.slug, S.av);
      markera('anpassat');
      track('skill_regel', { regel: t.slice(0, 80), pa: cb.checked ? 1 : 0 });
      ritaMd();
    });
  });

  /* ── Rita ── */
  function ritaMd() {
    var md = skillMd();
    $('[data-sk="md"]').textContent = md;
    $('[data-sk="tecken"]').textContent = String(md.length).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' tecken';
    var s = saknas();
    var el = $('[data-sk="saknas"]');
    el.textContent = s.length ? 'Du har inte fyllt i ' + s.map(function (o) { return o.etikett.toLowerCase(); }).join(', ') + '. Det går bra ändå, men då står det [FYLL I] i skillen. Fyll i det i steg 2 eller ändra i skillen efteråt.' : '';
    el.style.display = s.length ? '' : 'none';
  }

  function ritaForlopp() {
    [].forEach.call(root.querySelectorAll('[data-fl]'), function (li) { li.classList.toggle('is-klar', !!S.steg[li.getAttribute('data-fl')]); });
    [].forEach.call(root.querySelectorAll('[data-stegid]'), function (s) { s.classList.toggle('is-klar', !!S.steg[s.getAttribute('data-stegid')]); });
    var b = $('[data-sk="installerat"]');
    if (b) {
      b.setAttribute('aria-pressed', S.steg.installerat ? 'true' : 'false');
      b.textContent = S.steg.installerat ? '✓ Klart, skillen finns' : 'Klart, skillen är installerad';
    }
  }

  function ritaTjanst() {
    var t = TJANSTER[S.tjanst];
    [].forEach.call(root.querySelectorAll('[data-tjanst]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tjanst') === S.tjanst ? 'true' : 'false'); });
    $('[data-sk="term"]').textContent = t.termText;
    $('[data-sk="s4titel"]').textContent = 'Installera skillen i ' + t.namn;
    $('[data-sk="guide"]').innerHTML = t.steg.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    $('[data-sk="tips"]').textContent = 'Bra att veta: ' + t.tips;
    var o = $('[data-sk="oppna"]');
    o.href = t.url; o.textContent = 'Öppna ' + t.namn + ' ↗';
  }

  /* ── Klick ── */
  root.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && root.contains(a)) {
      if (a.hasAttribute('data-mall')) track('skill_mall', { mall: a.getAttribute('data-mall') });
      else if (a.classList.contains('sk-oppna')) track('skill_oppna_tjanst', {});
      else if (a.classList.contains('sk-merlank')) track('skill_mer', { till: a.getAttribute('href').split('?')[0] });
      return;
    }
    var b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    var sk = b.getAttribute('data-sk');
    if (b.hasAttribute('data-tjanst')) {
      S.tjanst = b.getAttribute('data-tjanst');
      spara('aim_paket_tjanst', S.tjanst);
      markera('valt');
      ritaTjanst();
      track('skill_tjanst', {});
    } else if (sk === 'ladda') {
      laddaNer();
      markera('valt'); markera('hamtat');
      b.classList.add('is-kopierad'); b.textContent = 'Nedladdad ✓';
      setTimeout(function () { b.classList.remove('is-kopierad'); b.textContent = 'Ladda ner skill (.zip)'; }, 2200);
      track('skill_ladda_ner', { tomma_falt: saknas().length, regler_av: S.av.length });
    } else if (sk === 'bygg') {
      kopiera(byggPrompt(), b, 'Kopierad ✓', 'Kopiera prompten');
      markera('valt'); markera('hamtat');
      track('skill_kopiera', { typ: 'bygg', tomma_falt: saknas().length, regler_av: S.av.length });
    } else if (sk === 'kopieramd') {
      kopiera(skillMd(), b, 'Kopierad ✓', 'Kopiera bara SKILL.md');
      markera('hamtat');
      track('skill_kopiera', { typ: 'md', tomma_falt: saknas().length, regler_av: S.av.length });
    } else if (sk === 'installerat') {
      if (S.steg.installerat) { delete S.steg.installerat; spara(STEG_KEY, S.steg); ritaForlopp(); }
      else { markera('installerat'); track('skill_installerad', {}); }
    } else if (b.hasAttribute('data-test')) {
      var typ = b.getAttribute('data-test');
      kopiera(typ === 'ja' ? K.testJa : K.testNej, b, 'Kopierad ✓', 'Kopiera');
      markera('testat');
      track('skill_test', { typ: typ });
    }
  });
  var forhand = root.querySelector('.sk-forhand');
  if (forhand) forhand.addEventListener('toggle', function () { if (forhand.open) track('skill_visa_md', {}); });

  ritaTjanst();
  ritaMd();
  ritaForlopp();
  var kalla = '';
  try { kalla = new URLSearchParams(location.search).get('source') || ''; } catch (e) {}
  track('skill_visa', { faq: schema.length, kalla: kalla || (document.referrer.indexOf(location.host) !== -1 ? 'intern' : 'extern') });
})();
