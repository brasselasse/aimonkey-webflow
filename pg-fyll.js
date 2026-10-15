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

   Exponeras som window.AimFyll. Används av prompt-sida.js.
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

  window.AimFyll = {
    PH_SRC: PH_SRC, parse: parse, apply: apply, segment: segment, varde: varde,
    forifyll: forifyll, sparaFyll: sparaFyll,
    lasSenaste: lasSenaste, sparaSenaste: sparaSenaste,
    favoriter: favoriter, arFavorit: arFavorit, vaxlaFavorit: vaxlaFavorit,
    las: las, spara: spara
  };
})();
