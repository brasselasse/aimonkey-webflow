/* ============================================================
   AIMonkey — faq.js 1.0.0 (site-skript, sidfoten)
   Gemensamt beteende för FAQ-listorna (Relume faq5:
   .faq_accordion > .faq5_question + .faq5_answer).

   1. Dragspel: Webflow-interaktionen sätter svaret till höjd 0 och
      öppnar det vid klick. På sidor där interaktionen saknas (svaret
      har ingen inline-höjd när sidan laddats) kopplar skriptet samma
      beteende själv. Sidor där interaktionen finns rörs inte.
   2. FAQPage-schema: om sidan har FAQ-frågor men inget FAQPage-schema
      läggs ett till, byggt av frågorna och svaren i HTML:en.
   Utseendet ligger i Webflow-klasserna, inte här.
============================================================ */
(function () {
  'use strict';

  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  function koppla(item) {
    var q = item.querySelector('.faq5_question');
    var a = item.querySelector('.faq5_answer');
    if (!q || !a || item.hasAttribute('data-faq-js')) return;
    if (a.style.height !== '') return; /* Webflow-interaktionen styr redan */
    item.setAttribute('data-faq-js', '');
    var ikon = q.querySelector('.faq_icon-wrapper');
    a.style.height = '0px';
    a.style.transition = 'height .3s ease';
    if (ikon) ikon.style.transition = 'transform .3s ease';
    q.setAttribute('role', 'button');
    q.setAttribute('tabindex', '0');
    q.setAttribute('aria-expanded', 'false');
    function vaxla() {
      var oppen = q.getAttribute('aria-expanded') === 'true';
      if (oppen) {
        a.style.height = a.scrollHeight + 'px';
        requestAnimationFrame(function () { a.style.height = '0px'; });
      } else {
        a.style.height = a.scrollHeight + 'px';
        a.addEventListener('transitionend', function slut() {
          if (q.getAttribute('aria-expanded') === 'true') a.style.height = 'auto';
          a.removeEventListener('transitionend', slut);
        });
      }
      q.setAttribute('aria-expanded', oppen ? 'false' : 'true');
      if (ikon) ikon.style.transform = oppen ? '' : 'rotate(45deg)';
    }
    q.addEventListener('click', vaxla);
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); vaxla(); }
    });
  }

  function schema(items) {
    var finns = [].some.call(document.querySelectorAll('script[type="application/ld+json"]'), function (s) {
      return s.textContent.indexOf('FAQPage') !== -1;
    });
    if (finns) return;
    var poster = [];
    items.forEach(function (it) {
      var q = txt(it.querySelector('.faq5_question .text-weight-bold, .faq5_question'));
      var a = txt(it.querySelector('.faq5_answer'));
      if (q && a) poster.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
    });
    if (!poster.length) return;
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: poster });
    document.head.appendChild(s);
  }

  function kor() {
    var items = [].slice.call(document.querySelectorAll('.faq_accordion'));
    if (!items.length) return;
    items.forEach(koppla);
    schema(items);
  }

  /* Vänta tills Webflow-interaktionerna har satt sina startlägen. */
  function start() { setTimeout(kor, 300); }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
