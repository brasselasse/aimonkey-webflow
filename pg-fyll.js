/* ============================================================
   AIMonkey — pg-fyll.js
   Delad logik för [PLATSHÅLLARE] → Fyll i-fält, samma regler som
   nya promptgeneratorn (pg-ny.js):

   - parse(text)       → fält i ordning, ett per unik platshållare.
                         Etikett = texten före på raden ("Mål: [..]"),
                         annars platshållaren i normal skiftläge.
   - apply(text, v)    → prompten med ifyllda värden.
   - forifyll(fält)    → värden sparade sedan förra gången
                         (localStorage pg_kedja.fyll, delas med
                         generatorn, mallarna och projektmallarna).
   - sparaFyll(f, v)   → sparar bara korta uppgifter om en själv
                         ([DITT …], [DIN …], företag, produkt).
   - sparaSenaste(...) → samma lista som generatorerna
                         (aimonkey_recent_prompts, max 10).
   - favoriter         → aimonkey_fav_prompts [{slug, namn, sparad}].

   - luckorUI(o)       → "Fyll i luckorna" direkt i ett promptkort
                         (artiklar och stegkort i mallar), se nedan.

   Exponeras som window.AimFyll. Används av prompt-sida.js,
   prompt-inline.js och mall-steg.js.
   pg-ny.js har än så länge en egen kopia av samma regler.
   ============================================================ */
(function () {
  if (window.AimFyll) return;

  var KEDJA = 'pg_kedja';
  var FYLL = { foretag: '[DITT FÖRETAG]', produkt: '[DIN PRODUKT/TJÄNST]' };
  var PH_SRC = '\\[([^\\[\\]\\n]{2,160})\\](?!\\()';   // [text] men inte [länk](url)
  var RE_FORETAG = /^(ditt |vårt |ert )?företag(et|snamn|ets namn)?$/i;
  var RE_EGEN = /^(ditt|din|dina|ert|er|era|vårt|vår|våra|mitt|min|mina) /i;
  var RE_PRODUKT = /^(din |er |vår )?(produkt|tjänst|produkt ?\/ ?tjänst)(en)?$/i;
  var RECENT_KEY = 'aimonkey_recent_prompts', RECENT_MAX = 10;
  var FAV_KEY = 'aimonkey_fav_prompts';

  function las(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function spara(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function phSentence(s) {
    s = s.trim();
    var bokst = s.replace(/[^A-Za-zÅÄÖåäö]/g, '');
    if (bokst && bokst === bokst.toUpperCase()) s = s.toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function parse(text, opt) {
    if (!text) return [];
    opt = opt || {};
    var out = [], sedd = {}, antal = {}, kod = !!opt.kod;
    (text.match(new RegExp(PH_SRC, 'g')) || []).forEach(function (m) { var k = m.slice(1, -1); antal[k] = (antal[k] || 0) + 1; });
    text.split('\n').forEach(function (rad) {
      var re = new RegExp(PH_SRC, 'g'), m;
      while ((m = re.exec(rad))) {
        var k = m[1], bokst = k.replace(/[^A-Za-zÅÄÖåäö]/g, '');
        if (sedd[k] || !bokst || (kod && bokst !== bokst.toUpperCase())) continue;
        sedd[k] = true;
        var exempel = /^\s*(t\.?\s?ex\.?|ex\.|e\.g\.)/i.test(k);
        var fore = rad.slice(0, m.index).replace(/\*\*|__|`/g, '').replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
        var etikett = '';
        if (antal[k] === 1 && /:$/.test(fore)) { etikett = fore.replace(/:$/, '').trim(); if (etikett.length < 2 || etikett.length > 48 || /[\[\]]/.test(etikett)) etikett = ''; }
        if (!etikett) etikett = exempel ? 'Ditt val' : phSentence(k);
        if (etikett.length > 70) etikett = etikett.slice(0, 67) + '…';
        var steg = /fr[åa]n steg (\d+)/i.exec(k);
        out.push({
          key: k, label: etikett,
          hint: exempel ? k : etikett !== phSentence(k) ? phSentence(k) : 'Skriv här …',
          multi: rad.trim() === m[0] || k.length > 40 || /klistra|text|mejl|recension|anteckning|material|beskriv/i.test(k),
          franSteg: steg ? +steg[1] : 0
        });
      }
    });
    return out;
  }

  function varde(v, k) { return ((v && v[k]) || '').trim(); }

  function apply(text, v) {
    if (!text) return text;
    return text.replace(new RegExp(PH_SRC, 'g'), function (m, k) { return varde(v, k) || m; });
  }

  /* Delar texten i bitar: {t, ph:nyckel|null, fylld:bool} — för förhandsvisning */
  function segment(text, v) {
    var re = new RegExp(PH_SRC, 'g'), m, ut = [], last = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) ut.push({ t: text.slice(last, m.index), ph: null });
      var val = varde(v, m[1]);
      ut.push({ t: val || m[0], ph: m[1], fylld: !!val });
      last = re.lastIndex;
    }
    if (last < text.length) ut.push({ t: text.slice(last), ph: null });
    return ut;
  }

  function kedjaFyll() { var k = las(KEDJA, {}) || {}; return k.fyll || {}; }

  /* Förifyll: returnerar {värden, fran: {nyckel: true}} */
  function forifyll(falt) {
    var f = kedjaFyll(), v = {}, fran = {};
    falt.forEach(function (t) {
      var x = f['[' + t.key + ']'] || '';
      if (!x && RE_FORETAG.test(t.key)) x = f[FYLL.foretag] || '';
      if (!x && RE_PRODUKT.test(t.key)) x = f[FYLL.produkt] || '';
      if (x) { v[t.key] = x; fran[t.key] = true; }
    });
    return { varden: v, fran: fran };
  }

  function sparaFyll(t, val) {
    val = (val || '').trim();
    if (t.multi || val.length > 120 || /\n/.test(val)) return;
    if (!RE_EGEN.test(t.key) && !RE_FORETAG.test(t.key) && !RE_PRODUKT.test(t.key)) return;
    var k = las(KEDJA, {}) || {}; k.fyll = k.fyll || {}; k.mallar = k.mallar || {};
    if (val) k.fyll['[' + t.key + ']'] = val; else delete k.fyll['[' + t.key + ']'];
    if (RE_FORETAG.test(t.key)) { if (val) k.fyll[FYLL.foretag] = val; else delete k.fyll[FYLL.foretag]; }
    if (RE_PRODUKT.test(t.key)) { if (val) k.fyll[FYLL.produkt] = val; else delete k.fyll[FYLL.produkt]; }
    spara(KEDJA, k);
  }

  function lasSenaste() { var l = las(RECENT_KEY, []); return Array.isArray(l) ? l.filter(function (p) { return p && p.text; }) : []; }
  function sparaSenaste(text, typ, namn, slug) {
    if (!text || text.length < 10) return;
    var l = lasSenaste().filter(function (p) { return p.text !== text; });
    var forhand = (namn || text.split('\n').filter(function (r) { return r.trim(); })[0] || text).replace(/\s+/g, ' ').trim();
    var post = { id: Date.now(), text: text, preview: forhand.length > 90 ? forhand.slice(0, 90) + '…' : forhand, tasktype: typ || '', created: new Date().toISOString() };
    if (slug) post.slug = slug;
    l.unshift(post);
    spara(RECENT_KEY, l.slice(0, RECENT_MAX));
  }

  function favoriter() { var l = las(FAV_KEY, []); return Array.isArray(l) ? l.filter(function (f) { return f && f.slug; }) : []; }
  function arFavorit(slug) { return favoriter().some(function (f) { return f.slug === slug; }); }
  function vaxlaFavorit(slug, namn) {
    var l = favoriter(), ar = l.some(function (f) { return f.slug === slug; });
    l = ar ? l.filter(function (f) { return f.slug !== slug; }) : [{ slug: slug, namn: namn || slug, sparad: new Date().toISOString() }].concat(l);
    spara(FAV_KEY, l.slice(0, 100));
    return !ar;
  }


  /* ============================================================
     luckorUI — "Fyll i luckorna" direkt i ett promptkort (2026-11-16)
     Används av prompt-inline.js (artiklar) och mall-steg.js (stegkort).
     - Luckorna i prompten blir knappar: klick öppnar rutan och fokuserar fältet.
     - Rutan fälls ut med "Fyll i luckorna" (eller är alltid öppen: o.oppen).
     - Kopiera-knappen: grå (inget ifyllt), ljusgrön (påbörjat), grön (allt ifyllt).
     - Ifylld lucka blinkar till; knappen pulserar en gång när allt är ifyllt.
     o = { text, textEl, kop, kopEtikett, panelEfter, vaxlaEfter, bricka, oppen, kalla }
     Returnerar null om prompten saknar luckor, annars
     { fylld(), etikett(), info(), oppna(key) }.
     ============================================================ */
  var UI_CSS = [
    '.aimf-lucka{font:inherit;line-height:inherit;letter-spacing:inherit;color:#0b1f3b;background:#fff3c4;border:0;margin:0;border-radius:5px;padding:1px 4px;font-weight:600;cursor:pointer;box-shadow:inset 0 -2px 0 #f2c94c;text-align:left;white-space:normal;overflow-wrap:anywhere;-webkit-box-decoration-break:clone;box-decoration-break:clone}',
    '.aimf-lucka:hover{filter:brightness(.95);text-decoration:underline}',
    '.aimf-lucka:focus-visible{outline:2px solid #007863;outline-offset:2px}',
    '.aimf-lucka.is-fylld{background:#d9f7ee;color:#005042;box-shadow:inset 0 -2px 0 #00c9a7}',
    '.aimf-lucka.is-pop{animation:aimfPop .55s ease-out}',
    '.aimf-panel{background:#e5f9f6;border:1.5px solid #00c9a7;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;color:#0b1f3b;text-align:left;margin:4px 0}',
    '.aimf-panel[hidden]{display:none!important}',
    '.aimf-topp{display:flex;align-items:center;gap:14px}',
    '.aimf-rubrik{font-size:18px;font-weight:700;line-height:1.3}',
    '.aimf-prog{flex:1;max-width:220px;height:8px;background:#fff;border:1px solid #b5e8dd;border-radius:999px;overflow:hidden}',
    '.aimf-prog span{display:block;height:100%;width:0;background:#00a383;border-radius:999px;transition:width .4s ease-out}',
    '.aimf-rensa{margin-left:auto;font:inherit;font-size:14px;font-weight:600;color:#005042;background:none;border:0;padding:8px 0;min-height:44px;cursor:pointer;text-decoration:underline}',
    '.aimf-falt{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px 14px}',
    '.aimf-falt label{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600;line-height:1.35;margin:0;color:#0b1f3b}',
    '.aimf-falt label.is-bred{grid-column:1/-1}',
    '.aimf-falt input,.aimf-falt textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;font-weight:400;color:#0b1f3b;background:#fff;border:1.5px solid #c9d3de;border-radius:10px;padding:11px 12px;min-height:46px;margin:0;transition:border-color .2s}',
    '.aimf-falt textarea{min-height:84px;resize:vertical;line-height:1.5}',
    '.aimf-falt input::placeholder,.aimf-falt textarea::placeholder{color:#6b7686}',
    '.aimf-falt .is-ok input,.aimf-falt .is-ok textarea{border-color:#00c9a7}',
    '.aimf-falt input:focus,.aimf-falt textarea:focus{outline:2px solid #007863;outline-offset:1px}',
    '.aimf-falt .is-blink input,.aimf-falt .is-blink textarea{animation:aimfFokus 1s ease-out}',
    '.aimf-hint{margin:0!important;font-size:13px!important;line-height:1.5!important;color:#24453f!important}',
    '.aimf-vaxla{font:inherit;font-size:15px;font-weight:700;line-height:1.3;color:#0b1f3b;background:#fff;border:1.5px solid #c9d3de;border-radius:12px;padding:11px 16px;min-height:46px;cursor:pointer}',
    '.aimf-vaxla:hover{border-color:#0b1f3b}',
    '.aimf-kop{transition:background-color .35s,color .35s,border-color .35s!important}',
    '.aimf-kop.is-tom:not(.is-kopierad):not(.is-copied){background:#e6ebf0!important;color:#3d4a5c!important;border:1.5px solid #c9d3de!important;filter:none}',
    '.aimf-kop.is-delvis:not(.is-kopierad):not(.is-copied){background:#c9f2ea!important;color:#005042!important;border:1.5px solid #00c9a7!important;filter:none}',
    '.aimf-kop.is-klar:not(.is-kopierad):not(.is-copied){background:#007863!important;color:#fff!important;border:1.5px solid #007863!important}',
    '.aimf-kop.is-puls{animation:aimfKlar .7s ease-out}',
    '@keyframes aimfPop{0%{transform:scale(1);background:#9ff0dc}40%{transform:scale(1.08)}100%{transform:scale(1)}}',
    '@keyframes aimfFokus{0%{box-shadow:0 0 0 0 rgba(0,201,167,.7)}100%{box-shadow:0 0 0 10px rgba(0,201,167,0)}}',
    '@keyframes aimfKlar{0%{box-shadow:0 0 0 0 rgba(0,201,167,.6);transform:scale(1)}35%{transform:scale(1.05)}100%{box-shadow:0 0 0 14px rgba(0,201,167,0);transform:scale(1)}}',
    '@media (max-width:600px){.aimf-panel{padding:14px}.aimf-falt{grid-template-columns:1fr}.aimf-vaxla{width:100%}}',
    '@media (prefers-reduced-motion:reduce){.aimf-lucka.is-pop,.aimf-kop.is-puls,.aimf-falt .is-blink input,.aimf-falt .is-blink textarea{animation:none}.aimf-prog span,.aimf-kop{transition:none!important}}'
  ].join('\n');
  function uiStil() {
    if (document.getElementById('aimf-css')) return;
    var st = document.createElement('style'); st.id = 'aimf-css'; st.textContent = UI_CSS; document.head.appendChild(st);
  }
  var uiNr = 0;

  /* Byter [LUCKA] i elementets text mot knappar, utan att röra övrig formatering. */
  function dekorera(el) {
    [].slice.call(el.querySelectorAll('mark, .pm-ph')).forEach(function (m) {
      if (/^\[[^\[\]\n]{2,160}\]$/.test(m.textContent.trim()) && !m.children.length) m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
    });
    el.normalize();
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false), noder = [];
    while (tw.nextNode()) noder.push(tw.currentNode);
    noder.forEach(function (n) {
      if (n.parentNode && n.parentNode.closest && n.parentNode.closest('.aimf-lucka')) return;
      var re = new RegExp(PH_SRC, 'g'), s = n.nodeValue, m, last = 0, frag = null;
      while ((m = re.exec(s))) {
        if (!/[A-Za-zÅÄÖåäö]/.test(m[1])) continue;
        frag = frag || document.createDocumentFragment();
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        var b = document.createElement('button'); b.type = 'button'; b.className = 'aimf-lucka';
        b.setAttribute('data-aimf', m[1]); b.textContent = m[0]; frag.appendChild(b);
        last = re.lastIndex;
      }
      if (frag) { if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last))); n.parentNode.replaceChild(frag, n); }
    });
  }

  function luckorUI(o) {
    var falt = parse(o.text);
    if (!falt.length || !o.textEl) return null;
    uiStil();
    var nr = ++uiNr, v = forifyll(falt).varden, oppen = !!o.oppen, varKlar = false;
    var etikett0 = o.kopEtikett || 'Kopiera prompt';
    dekorera(o.textEl);

    var panel = document.createElement('div');
    panel.className = 'aimf-panel'; panel.id = 'aimf-p' + nr;
    panel.innerHTML = '<div class="aimf-topp"><span class="aimf-rubrik">Fyll i luckorna</span>' +
      '<span class="aimf-prog" role="progressbar" aria-label="Ifyllda luckor" aria-valuemin="0" aria-valuemax="' + falt.length + '"><span></span></span>' +
      '<button type="button" class="aimf-rensa">Rensa</button></div><div class="aimf-falt"></div><p class="aimf-hint"></p>';
    var grid = panel.querySelector('.aimf-falt');
    falt.forEach(function (t, i) {
      var lab = document.createElement('label'), id = 'aimf-' + nr + '-' + i;
      lab.setAttribute('for', id); lab.setAttribute('data-i', i);
      if (t.multi) lab.className = 'is-bred';
      lab.appendChild(document.createTextNode(t.label));
      var inp = document.createElement(t.multi ? 'textarea' : 'input');
      if (!t.multi) inp.type = 'text';
      if (t.multi) inp.rows = 3;
      inp.id = id; inp.placeholder = /^skriv här/i.test(t.hint) ? '' : t.hint;
      inp.value = v[t.key] || '';
      inp.autocomplete = 'off';
      lab.appendChild(inp);
      grid.appendChild(lab);
      inp.addEventListener('input', function () {
        var fore = varde(v, t.key);
        v[t.key] = inp.value;
        var nu = varde(v, t.key);
        uppdatera(fore ? null : (nu ? t.key : null));
      });
      inp.addEventListener('change', function () { sparaFyll(t, inp.value); });
    });
    var ankare = o.panelEfter || o.textEl;
    ankare.parentNode.insertBefore(panel, ankare.nextSibling);

    var vaxla = null;
    if (!o.oppen && o.vaxlaEfter) {
      vaxla = document.createElement('button');
      vaxla.type = 'button'; vaxla.className = 'aimf-vaxla';
      vaxla.setAttribute('aria-controls', panel.id);
      o.vaxlaEfter.parentNode.insertBefore(vaxla, o.vaxlaEfter.nextSibling);
      vaxla.addEventListener('click', function () { satt(!oppen); if (oppen) { var f = grid.querySelector('input,textarea'); if (f) f.focus(); } });
    }
    if (o.kop) o.kop.classList.add('aimf-kop');

    function satt(on) {
      oppen = on; panel.hidden = !on;
      if (vaxla) { vaxla.setAttribute('aria-expanded', on ? 'true' : 'false'); vaxla.textContent = on ? 'Stäng luckorna ▴' : 'Fyll i luckorna ▾'; }
      if (on && o.onOppna) o.onOppna();
    }
    function info() {
      var ifyllda = falt.filter(function (t) { return varde(v, t.key); }).length;
      return { luckor: falt.length, ifyllda: ifyllda, kvar: falt.length - ifyllda };
    }
    function etikett() { return info().kvar === 0 ? 'Kopiera ifylld prompt' : etikett0; }
    function kort(val) { val = val.replace(/\s+/g, ' '); return val.length > 80 ? val.slice(0, 78) + '…' : val; }

    function uppdatera(nyFylld) {
      var I = info();
      [].forEach.call(o.textEl.querySelectorAll('.aimf-lucka'), function (b) {
        var k = b.getAttribute('data-aimf'), val = varde(v, k);
        b.textContent = val ? kort(val) : '[' + k + ']';
        b.classList.toggle('is-fylld', !!val);
        b.setAttribute('aria-label', (val ? 'Ändra ' : 'Fyll i ') + (falt.filter(function (t) { return t.key === k; })[0] || { label: k }).label.toLowerCase());
        if (nyFylld && k === nyFylld) { b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); }
      });
      [].forEach.call(grid.querySelectorAll('label'), function (l) { l.classList.toggle('is-ok', !!varde(v, falt[+l.getAttribute('data-i')].key)); });
      var pr = panel.querySelector('.aimf-prog');
      pr.setAttribute('aria-valuenow', I.ifyllda);
      pr.firstChild.style.width = Math.round(I.ifyllda / I.luckor * 100) + '%';
      panel.querySelector('.aimf-hint').textContent = (I.kvar === 0 ? 'Allt ifyllt. Kopiera, så får du prompten med dina uppgifter.' :
        (I.kvar === 1 ? '1 lucka kvar.' : I.kvar + ' luckor kvar.') + ' Det du inte fyller i kopieras med hakparenteser.') +
        ' Uppgifter om dig och företaget sparas i webbläsaren och fylls i nästa gång.';
      if (o.bricka) o.bricka.textContent = I.ifyllda === 0 ? I.luckor + (I.luckor === 1 ? ' lucka' : ' luckor') + ' att fylla i' : (I.kvar === 0 ? '✓ Allt ifyllt' : I.ifyllda + ' av ' + I.luckor + ' ifyllda');
      if (o.kop) {
        o.kop.classList.toggle('is-tom', I.ifyllda === 0);
        o.kop.classList.toggle('is-delvis', I.ifyllda > 0 && I.kvar > 0);
        o.kop.classList.toggle('is-klar', I.kvar === 0);
        if (!o.kop.classList.contains('is-kopierad') && !o.kop.classList.contains('is-copied')) o.kop.textContent = etikett();
        if (I.kvar === 0 && !varKlar && nyFylld) { o.kop.classList.remove('is-puls'); void o.kop.offsetWidth; o.kop.classList.add('is-puls'); }
      }
      varKlar = I.kvar === 0;
    }

    o.textEl.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.aimf-lucka'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      oppna(b.getAttribute('data-aimf'));
    });
    function oppna(key) {
      if (!oppen) satt(true);
      var i = -1; falt.forEach(function (t, j) { if (t.key === key) i = j; });
      var lab = grid.querySelector('label[data-i="' + i + '"]'); if (!lab) return;
      var f = lab.querySelector('input,textarea');
      lab.classList.remove('is-blink'); void lab.offsetWidth; lab.classList.add('is-blink');
      try { f.focus({ preventScroll: true }); } catch (err) { f.focus(); }
      var r = lab.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight - 20) lab.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (o.kalla) try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'aimf_lucka_klick', kalla: o.kalla }); } catch (err) {}
    }
    panel.querySelector('.aimf-rensa').addEventListener('click', function () {
      falt.forEach(function (t) { v[t.key] = ''; });
      [].forEach.call(grid.querySelectorAll('input,textarea'), function (f) { f.value = ''; });
      varKlar = false; uppdatera(null);
      var f = grid.querySelector('input,textarea'); if (f) f.focus();
    });
    satt(oppen);
    varKlar = info().kvar === 0;
    uppdatera(null);
    /* Om texten ritas om efteråt (t.ex. av prompt-format.js) försvinner knapparna: lägg tillbaka dem. */
    if (window.MutationObserver) {
      var obs = new MutationObserver(function () {
        if (o.textEl.querySelector('.aimf-lucka') || !new RegExp(PH_SRC).test(o.textEl.textContent)) return;
        obs.disconnect(); dekorera(o.textEl); uppdatera(null); obs.observe(o.textEl, { childList: true, subtree: true });
      });
      obs.observe(o.textEl, { childList: true, subtree: true });
    }
    return { fylld: function () { return apply(o.text, v); }, etikett: etikett, info: info, oppna: oppna, oppen: function () { return oppen; } };
  }

  window.AimFyll = {
    PH_SRC: PH_SRC, parse: parse, apply: apply, segment: segment, varde: varde,
    forifyll: forifyll, sparaFyll: sparaFyll,
    lasSenaste: lasSenaste, sparaSenaste: sparaSenaste,
    favoriter: favoriter, arFavorit: arFavorit, vaxlaFavorit: vaxlaFavorit,
    las: las, spara: spara,
    luckorUI: luckorUI, dekorera: dekorera, uiStil: uiStil
  };
})();
