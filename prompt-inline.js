/* ============================================================
   AIMonkey — prompter i artiklar och mallar (prompt-inline.js)
   2026-11-09

   Gör om prompterna i brödtexten (.prompt-wrapper, från {{...}} eller
   inbäddad HTML) till:
   - Hel prompt (minst 40 ord): kort med rubrik, kategori, gula luckor,
     "N luckor att fylla i", Kopiera, "Fyll i med Promptgeneratorn →"
     och "Öppna promptsidan →" till /ai-prompter/<slug>.
   - Kort exempel (under 40 ord): en citatrad med en liten Kopiera.

   Rubrik, kategori och promptsida hämtas från /prompt-data genom att
   promptens text jämförs (utan blanksteg, utan skiftläge). En prompt som
   får en egen post i Prompters kopplas alltså automatiskt.

   Stegkort (mall-steg.js) och dolda prompter rörs inte.
   Live sedan 2026-11-09. Stäng av för felsökning med ?promptkort=0.
   dataLayer: pin_kopiera { prompt, typ }, pin_generator { prompt }.
============================================================ */
(function () {
  'use strict';
  /* Avstängning för felsökning: ?promptkort=0 */
  if (/[?&]promptkort=0/.test(location.search)) return;

  var GRANS = 40;
  var PD_KEY = 'pin_pd_v1';

  function track(ev, data) {
    try { window.dataLayer = window.dataLayer || []; var o = { event: ev }; for (var k in data) o[k] = data[k]; window.dataLayer.push(o); } catch (e) {}
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function nyckel(s) { return String(s || '').replace(/\s+/g, '').replace(/[”“"]/g, '').toLowerCase(); }
  function ord(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }
  function luckor(s) {
    var m = String(s).match(/\[[^\]\n]{1,80}\]/g) || [], u = [];
    m.forEach(function (x) { if (u.indexOf(x.toUpperCase()) < 0) u.push(x.toUpperCase()); });
    return u.length;
  }
  function markera(s) {
    return esc(s).replace(/\[([^\]\n]{1,80})\]/g, '<mark>[$1]</mark>').replace(/\n/g, '<br>');
  }

  /* Text ur .code-container med radbrytningar och listor (samma logik som mallarnas promptText). */
  function promptText(el) {
    if (!el) return '';
    function walk(node) {
      var out = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        var n = node.childNodes[i];
        if (n.nodeType === 3) { out += n.nodeValue.replace(/\s+/g, ' '); continue; }
        if (n.nodeType !== 1) continue;
        var tag = n.tagName;
        if (tag === 'BR') out += '\n';
        else if (tag === 'UL' || tag === 'OL') {
          var num = 0; out += '\n';
          for (var j = 0; j < n.children.length; j++) {
            var li = n.children[j]; if (li.tagName !== 'LI') continue; num++;
            out += (tag === 'OL' ? num + '. ' : '- ') + walk(li).trim() + '\n';
          }
          out += '\n';
        } else if (/^(P|DIV|H[1-6]|BLOCKQUOTE|LI)$/.test(tag)) out += '\n' + walk(n) + '\n';
        else out += walk(n);
      }
      return out;
    }
    return walk(el).replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function kopiera(text, knapp, etikett) {
    function ok() {
      knapp.classList.add('is-kopierad'); knapp.textContent = '✓ Kopierad';
      setTimeout(function () { knapp.classList.remove('is-kopierad'); knapp.textContent = etikett; }, 2500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { reserv(); });
    } else reserv();
    function reserv() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* /prompt-data → { nyckel: { namn, kat, slug, text } }, sparas i sessionStorage en timme. */
  function hamtaData() {
    try {
      var c = JSON.parse(sessionStorage.getItem(PD_KEY) || 'null');
      if (c && Date.now() - c.t < 3600000) return Promise.resolve(c.d);
    } catch (e) {}
    return fetch('/prompt-data', { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html'), d = {};
      [].forEach.call(doc.querySelectorAll('.pg-data-item'), function (it) {
        function f(c) { var e = it.querySelector(c); return e ? e.textContent.trim() : ''; }
        var text = f('.pg-d-prompt'); if (!text) return;
        d[nyckel(text)] = { namn: f('.pg-d-name'), kat: f('.pg-d-cat'), slug: f('.pg-d-slug'), text: text };
      });
      try { sessionStorage.setItem(PD_KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      return d;
    }).catch(function () { return {}; });
  }

  var CSS = [
    '.pin-kort{background:#fff;border:1px solid #dbe2ea;border-radius:20px;padding:22px 24px;margin:28px 0;display:flex;flex-direction:column;gap:14px;box-shadow:0 8px 22px rgba(11,31,59,.06);color:#0b1f3b;text-align:left}',
    '.pin-topp{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}',
    '.pin-eyebrow{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#00806b;line-height:1.4}',
    '.pin-titel{display:block;font-size:21px;line-height:1.25;font-weight:700;margin-top:4px;color:#0b1f3b}',
    '.pin-luckor{flex:0 0 auto;font-size:13px;font-weight:700;color:#00806b;background:#e5f9f6;border:1.5px solid #00c9a7;border-radius:999px;padding:5px 12px;white-space:nowrap;line-height:1.4}',
    '.pin-text{background:#f6f8fb;border-radius:14px;padding:16px 18px;font-size:16px;line-height:1.7;color:#24324a;overflow:hidden;position:relative;overflow-wrap:break-word}',
    '.pin-text mark,.pin-ex-text mark{background:#fff3c4;color:#0b1f3b;border-radius:5px;padding:1px 4px;font-weight:600}',
    '.pin-text.is-ihop{max-height:250px}.pin-text.is-ihop::after{content:"";position:absolute;left:0;right:0;bottom:0;height:64px;background:linear-gradient(rgba(246,248,251,0),#f6f8fb)}',
    '.pin-visa{align-self:flex-start;font:inherit;font-size:14px;font-weight:700;color:#00806b;background:none;border:0;padding:0;cursor:pointer;margin-top:-4px}',
    '.pin-knappar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}',
    '.pin-kop{font:inherit;font-size:15px;font-weight:700;line-height:1.3;background:#00806b;color:#fff;border:1.5px solid #00806b;border-radius:12px;padding:12px 20px;cursor:pointer}',
    '.pin-kop:hover{filter:brightness(1.08)}',
    '.pin-kop.is-kopierad{background:#e5f9f6;color:#005042;border-color:#00c9a7;filter:none}',
    '.pin-kort a.pin-gen{font-size:15px;font-weight:700;line-height:1.3;color:#0b1f3b;background:#fff;border:1.5px solid #c9d3de;border-radius:12px;padding:11px 16px;text-decoration:none!important}',
    '.pin-kort a.pin-gen:hover{border-color:#0b1f3b}',
    '.pin-kort a.pin-mer{margin-left:auto;font-size:14px;font-weight:700;color:#00806b;text-decoration:none!important}',
    '.pin-kort a.pin-mer:hover{text-decoration:underline!important}',
    '.pin-ex{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #dbe2ea;border-left:4px solid #00c9a7;border-radius:12px;padding:12px 12px 12px 16px;margin:20px 0}',
    '.pin-ex-text{flex:1;font-size:16px;color:#0b1f3b;line-height:1.55;overflow-wrap:break-word}',
    '.pin-kop.pin-kop-liten{flex:0 0 auto;font-size:13px;padding:7px 14px;border-radius:999px;background:#f2f6f9;color:#3d4a5c;border:1px solid #dbe2ea}',
    '.pin-kop.pin-kop-liten.is-kopierad{background:#e5f9f6;color:#005042;border-color:#00c9a7}',
    'li:has(> .pin-klar){background-image:none!important;padding-left:0!important}li:has(> .pin-klar) .pin-ex{margin:10px 0}',
    '@media (max-width:600px){.pin-kort{padding:16px;border-radius:18px}.pin-topp{flex-direction:column;gap:8px}.pin-titel{font-size:18px}.pin-text{font-size:15px;padding:14px}',
    '.pin-knappar{flex-direction:column;align-items:stretch}.pin-kop,.pin-kort a.pin-gen{width:100%;text-align:center;box-sizing:border-box}.pin-kort a.pin-mer{margin:2px auto 0}}'
  ].join('\n');

  function stil() {
    if (document.getElementById('pin-css')) return;
    var s = document.createElement('style'); s.id = 'pin-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function generatorLank(text, namn) {
    var base = '/promptgeneratorn';
    if (text.length > 1500) return base + '?source=mallar&namn=' + encodeURIComponent(namn || '');
    return base + '?brief=' + encodeURIComponent(text) + '&namn=' + encodeURIComponent(namn || '') + '&source=artikel';
  }

  function bygg(w, data) {
    var cc = w.querySelector('.code-container'); if (!cc) return;
    var text = promptText(cc); if (!text) return;
    /* innerText saknar listmarkörerna (1. / -) som promptText lägger till, och det var
       så promptposterna skapades. Matcha på båda. */
    var rå = (cc.innerText || cc.textContent || '').trim();
    var traff = data[nyckel(text)] || data[nyckel(rå)] || null;
    var n = Math.min(ord(text), ord(rå) || ord(text));
    if (traff && traff.text) text = traff.text;
    var id = traff ? traff.slug : '';
    w.removeAttribute('style'); w.classList.add('pin-klar');

    if (n < GRANS && !traff) {
      w.innerHTML = '<div class="pin-ex"><span class="pin-ex-text">”' + markera(text) + '”</span>' +
        '<button type="button" class="pin-kop pin-kop-liten">Kopiera</button></div>';
      var kb = w.querySelector('.pin-kop');
      kb.addEventListener('click', function () { kopiera(text, kb, 'Kopiera'); track('pin_kopiera', { prompt: '', typ: 'kort' }); });
      return;
    }

    var namn = traff ? traff.namn : '';
    var l = luckor(text);
    var html = '<div class="pin-kort">' +
      '<div class="pin-topp"><div><span class="pin-eyebrow">Prompt' + (traff && traff.kat ? ' · ' + esc(traff.kat) : '') + '</span>' +
      (namn ? '<b class="pin-titel">' + esc(namn) + '</b>' : '') + '</div>' +
      (l ? '<span class="pin-luckor">' + l + (l === 1 ? ' lucka' : ' luckor') + ' att fylla i</span>' : '') + '</div>' +
      '<div class="pin-text">' + markera(text) + '</div>' +
      '<div class="pin-knappar"><button type="button" class="pin-kop">Kopiera prompt</button>' +
      '<a class="pin-gen" href="' + esc(generatorLank(text, namn || document.title)) + '">' + (l ? 'Fyll i med Promptgeneratorn →' : 'Anpassa i Promptgeneratorn →') + '</a>' +
      (id ? '<a class="pin-mer" href="/ai-prompter/' + esc(id) + '">Öppna promptsidan →</a>' : '') +
      '</div></div>';
    w.innerHTML = html;

    var tx = w.querySelector('.pin-text');
    if (tx.scrollHeight > 320) {
      tx.classList.add('is-ihop');
      var v = document.createElement('button'); v.type = 'button'; v.className = 'pin-visa'; v.textContent = 'Visa hela prompten ↓';
      tx.parentNode.insertBefore(v, tx.nextSibling);
      v.addEventListener('click', function () { tx.classList.remove('is-ihop'); v.remove(); });
    }
    var kb2 = w.querySelector('.pin-kop');
    kb2.addEventListener('click', function () { kopiera(text, kb2, 'Kopiera prompt'); track('pin_kopiera', { prompt: id, typ: 'hel' }); });
    var gen = w.querySelector('.pin-gen');
    gen.addEventListener('click', function () {
      track('pin_generator', { prompt: id });
      if (text.length > 1500) {
        try {
          sessionStorage.setItem('pg_imported_prompt', text);
          sessionStorage.setItem('pg_imported_namn', namn || document.title);
          ['tasktype', 'roll', 'ton', 'malgrupp'].forEach(function (k) { sessionStorage.setItem('pg_imported_' + k, ''); });
        } catch (e) {}
      }
    });
  }

  function start() {
    var alla = [].filter.call(document.querySelectorAll('.prompt-wrapper'), function (w) {
      return !w.classList.contains('pin-klar') && !w.closest('[class*="stegkort"],[data-stegkort]') && w.offsetParent !== null && w.querySelector('.code-container');
    });
    if (!alla.length) return;
    stil();
    hamtaData().then(function (d) { alla.forEach(function (w) { try { bygg(w, d); } catch (e) {} }); });
  }

  if (document.readyState === 'complete') setTimeout(start, 50);
  else window.addEventListener('load', function () { setTimeout(start, 50); });
})();
