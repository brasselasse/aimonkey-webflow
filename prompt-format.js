/* ============================================================
   AIMonkey — prompt-format.js
   Renderar markdown i promptbibliotekets prompter (CMS-fältet
   "Prompt-text" är plain text med **fetstil**, ```kodblock```,
   listor och tabeller) som riktig rich text.

   - Gäller alla .prompt-copy-text.prompt-copy (promptbiblioteket,
     prompter-sidor, startsidan och "AI för …"-sidorna).
   - Originaltexten sparas i data-pm-raw. "Kopiera" får alltid
     originalet (markdown funkar bra i ChatGPT/Claude/Gemini):
     vid klick på .kopiera-prompt växlas texten tillbaka till rå
     text precis innan sidans egen kopiera-kod läser den, och
     återställs direkt efteråt.
   - "Anpassa" påverkas inte (läser data-brief från CMS).
   - Finsweet/CMS-loader: nya items renderas via MutationObserver.
   ============================================================ */
(function () {
  if (window.__aimPromptFormat) return;
  window.__aimPromptFormat = true;

  var SEL = '.prompt-copy-text.prompt-copy';

  var css =
    '.pm-md{white-space:normal!important}' +
    '.pm-md .pm-p{margin:0 0 .75em}' +
    '.pm-md>:last-child{margin-bottom:0!important}' +
    '.pm-md .pm-h{margin:.2em 0 .5em;font-weight:700}' +
    '.pm-md strong{font-weight:700;color:inherit}' +
    '.pm-md .pm-ul,.pm-md .pm-ol{margin:0 0 .75em;padding-left:1.3em}' +
    '.pm-md .pm-ul{list-style:disc}.pm-md .pm-ol{list-style:decimal}' +
    '.pm-md li{margin:.15em 0;padding:0}' +
    '.pm-md code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em;background:rgba(0,0,0,.06);padding:.1em .35em;border-radius:4px}' +
    '.pm-md .pm-pre{margin:0 0 .75em;padding:.7em .9em;background:rgba(0,0,0,.06);border-radius:8px;white-space:pre-wrap;overflow-x:auto;font-size:inherit}' +
    '.pm-md .pm-pre code{background:none;padding:0}' +
    '.pm-md .pm-table{border-collapse:collapse;margin:0 0 .75em;font-size:.92em;display:block;overflow-x:auto;max-width:100%}' +
    '.pm-md .pm-table th,.pm-md .pm-table td{border:1px solid rgba(0,0,0,.14);padding:.3em .6em;text-align:left;vertical-align:top}' +
    '.pm-md .pm-table th{font-weight:700}' +
    '.pm-md .pm-ph{background:rgba(0,201,167,.16);border-radius:4px;padding:0 .2em;box-decoration-break:clone;-webkit-box-decoration-break:clone}' +
    '.pm-raw{white-space:pre-wrap!important}';

  function addStyle() {
    if (document.getElementById('pm-style')) return;
    var s = document.createElement('style');
    s.id = 'pm-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inline(s) {
    var codes = [];
    s = esc(s).replace(/`([^`\n]+)`/g, function (m, c) {
      codes.push(c);
      return '\u0000' + (codes.length - 1) + '\u0000';
    });
    s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    /* Oavslutad ** i början av raden (skrivfel i CMS) → fetstil radens ut */
    s = s.replace(/^\*\*([^*\n]+)$/, '<strong>$1</strong>');
    s = s.replace(/\[([^\[\]\n]{1,160})\]/g, '<span class="pm-ph">[$1]</span>');
    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) {
      return '<code>' + codes[+i] + '</code>';
    });
  }

  function cells(row) {
    return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) {
      return c.trim();
    });
  }

  function table(rows) {
    var isSep = function (r) { return /^\|[\s:|-]+\|$/.test(r) && r.indexOf('-') !== -1; };
    var html = '<table class="pm-table">', head = rows.length > 1 && isSep(rows[1]);
    rows.forEach(function (r, idx) {
      if (isSep(r)) return;
      var tag = head && idx === 0 ? 'th' : 'td';
      html += '<tr>' + cells(r).map(function (c) {
        return '<' + tag + '>' + inline(c) + '</' + tag + '>';
      }).join('') + '</tr>';
    });
    return html + '</table>';
  }

  var RX = {
    fence:  /^\s*```/,
    head:   /^(#{1,6})\s+(.*)$/,
    row:    /^\|.*\|$/,
    bullet: /^\s*[-*•]\s+/,
    num:    /^\s*(\d+)[.)]\s+/
  };

  function render(md) {
    var lines = md.replace(/\r\n?/g, '\n').split('\n');
    var out = [], para = [], i = 0, t, m, items;
    function flush() {
      if (para.length) out.push('<p class="pm-p">' + para.map(inline).join('<br>') + '</p>');
      para = [];
    }
    while (i < lines.length) {
      t = lines[i].trim();
      if (RX.fence.test(t)) {
        flush();
        var buf = [];
        i++;
        while (i < lines.length && !RX.fence.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push('<pre class="pm-pre"><code>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }
      if (!t) { flush(); i++; continue; }
      if ((m = t.match(RX.head))) { flush(); out.push('<p class="pm-h">' + inline(m[2]) + '</p>'); i++; continue; }
      if (RX.row.test(t)) {
        flush();
        var rows = [];
        while (i < lines.length && RX.row.test(lines[i].trim())) rows.push(lines[i++].trim());
        out.push(table(rows));
        continue;
      }
      if (RX.bullet.test(t)) {
        flush();
        items = [];
        while (i < lines.length && RX.bullet.test(lines[i])) items.push(lines[i++].replace(RX.bullet, ''));
        out.push('<ul class="pm-ul">' + items.map(function (x) { return '<li>' + inline(x.trim()) + '</li>'; }).join('') + '</ul>');
        continue;
      }
      if ((m = t.match(RX.num))) {
        flush();
        var start = +m[1];
        items = [];
        while (i < lines.length && RX.num.test(lines[i])) items.push(lines[i++].replace(RX.num, ''));
        out.push('<ol class="pm-ol"' + (start !== 1 ? ' start="' + start + '"' : '') + '>' +
          items.map(function (x) { return '<li>' + inline(x.trim()) + '</li>'; }).join('') + '</ol>');
        continue;
      }
      para.push(t);
      i++;
    }
    flush();
    return out.join('');
  }

  function renderEl(el) {
    var raw = el.hasAttribute('data-pm-raw') ? el.getAttribute('data-pm-raw') : el.textContent;
    if (!raw || !raw.trim()) return;
    el.setAttribute('data-pm-raw', raw);
    el.setAttribute('data-pm', '1');
    el.innerHTML = render(raw.trim());
    el.classList.add('pm-md');
    el.classList.remove('pm-raw');
  }

  function renderAll(root) {
    var els = (root || document).querySelectorAll(SEL);
    for (var k = 0; k < els.length; k++) {
      var el = els[k];
      /* Ny, eller klonad/återställd av någon annan (innehållet ändrat) */
      if (!el.hasAttribute('data-pm') || !el.classList.contains('pm-md')) {
        if (el.hasAttribute('data-pm') && !el.classList.contains('pm-raw')) el.removeAttribute('data-pm-raw');
        if (!el.classList.contains('pm-raw')) renderEl(el);
      }
    }
  }

  function toRaw(el) {
    el.classList.remove('pm-md');
    el.classList.add('pm-raw');
    el.textContent = el.getAttribute('data-pm-raw') || '';
  }

  /* Kopiera: rå text till sidans egen kopiera-hanterare.
     Window-capture körs före document-capture-hanterarna. */
  window.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.kopiera-prompt');
    if (!btn) return;
    var scope = btn.closest('.w-dyn-item') || btn.closest('.prompt-container') || document;
    var els = scope.querySelectorAll(SEL + '[data-pm]');
    if (!els.length) els = document.querySelectorAll(SEL + '[data-pm]');
    var list = Array.prototype.slice.call(els);
    list.forEach(toRaw);
    setTimeout(function () { list.forEach(renderEl); }, 0);
  }, true);

  /* Ctrl/Cmd+C på markerad text ger också läsbar text (ingen åtgärd behövs). */

  var timer;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { renderAll(); }, 80);
  }

  function start() {
    addStyle();
    renderAll();
    if (window.MutationObserver && document.body) {
      new MutationObserver(function (muts) {
        for (var j = 0; j < muts.length; j++) {
          if (muts[j].addedNodes && muts[j].addedNodes.length) { schedule(); return; }
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.aimRenderPrompts = renderAll;
  window.aimPromptMarkdown = render;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
