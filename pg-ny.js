/* ============================================================
   AIMonkey — pg-ny.js  (nya enkla promptgeneratorn, TESTVERSION)
   Bygger hela generatorn i ett element: <div data-pgny></div>
   Fristående: rör inte promptgenerator.js eller den gamla sidan.

   Flöde (enligt skissen "Promptgeneratorn – stort och enkelt"):
     1. Uppgift: stort textfält som också söker i mallbiblioteket
        (/prompt-data), exempel, "Bygg min prompt →".
     2. Finjustera · valfritt: ett steg i taget, allt kan hoppas över.
        Text: Läsare → Ton → Roll → Underlag → Format
        Bild: Stil → Ljus och kamera · Video: Stil → Rörelse
        Kod: Språk → Hjälp
     3. Bygget (apan bockar av rader) → 4. Klar.
     Fast knapp längst ned: "Prompten genereras … Visa →" / "Kopiera prompt".
     Live-preview (2026-10-22): på dator (≥1100 px) växer prompten i en spalt
        till höger i Finjustera; på mindre skärmar visar knappen "+1 rad" och
        öppnar prompten i en panel. Ändrade rader lyser grönt en stund.
     Finjustera: "Visa alla inställningar" visar alla steg i en vy (minns valet,
        localStorage pgny_alla). Knappen längst ned: "Din prompt är redo · Visa min prompt".
     Resultatet: "✎ Ändra uppgiften" redigerar uppgiften (eller hela prompten
        för Senaste prompter) och prompten ändras medan man skriver.
     Resultatet: Justera-knappar under prompten (Läsare/Ton/Roll/Längd/Format,
        per typ) som ändrar prompten direkt, och "Apan föreslår" (högst två).
     Fyll i: har uppgiften/mallen [PLATSHÅLLARE] visas ett eget steg med ett
        fält per platshållare. Prompten blir inte klar förrän alla är ifyllda
        (ingen hoppa över). Värden sparas i pg_kedja.fyll och förifylls nästa
        gång (FÖRETAG/PRODUKT kopplas till Underlag-fälten).

   URL-kontraktet stöds: ?brief=&tasktype=&roll=&ton=&malgrupp=&namn=&source=
   (samt sessionStorage pg_imported_* för långa mallar). Med brief hoppar
   flödet direkt till bygget (via Fyll i om det finns platshållare).

   Kedjeläget ?mall=<slug>&steg=N (från stegmallarna och promptsidorna, samma
   kontrakt som gamla generatorn): stegrad överst med prickar och föregående/
   nästa, ruta "Har du fått svaret från AI:n?" under Kopiera. Stegen hämtas från
   /ai-mallar/<slug> och byts utan sidladdning. [KLISTRA IN … FRÅN STEG N],
   kundkortet och "från fas N" fylls med sparade svar (pg_kedja.mallar).
   Kopierat steg markeras klart på mallsidan (aim_mall_klar_<slug>).

   Promptformatet följer det beslutade formatet (2026-10-02): rollen som
   mening, sedan ## Uppgift / ## Kontext / ## Material att utgå från /
   ## Så ska svaret se ut / ## Regler / ## Ta hänsyn till.

   dataLayer (egna namn så att testet inte blandas med gamla generatorn):
   pgny_open, pgny_mall, pgny_bygg, pgny_steg, pgny_visa, pgny_klar,
   pgny_copy, pgny_ai, pgny_projekt, pgny_ny, pgny_andra,
   pgny_fyll_visa (antal, kvar), pgny_fyll (antal, forifyllda),
   pgny_kedja_steg, pgny_kedja_nasta, pgny_kedja_svar, pgny_kedja_autofyll, pgny_kedja_klar
   (mall, steg, antal_steg).
============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-pgny]');
  if (!root) return;

  /* ── Data ── */
  var TYPER = [
    { id: 'skriva', namn: 'Skriva text' }, { id: 'sammanfatta', namn: 'Sammanfatta' },
    { id: 'analysera', namn: 'Analysera' }, { id: 'brainstorma', namn: 'Brainstorma' },
    { id: 'forklara', namn: 'Förklara' }, { id: 'bild', namn: 'Bild' },
    { id: 'video', namn: 'Video' }, { id: 'kod', namn: 'Kod' }
  ];
  /* Gamla generatorns tasktype-värden → nya id:n */
  var TYP_ALIAS = { 'skriva-text': 'skriva', 'skriva text': 'skriva', 'förklara': 'forklara', 'bildprompta': 'bild' };

  function v(list) { return list.map(function (x) { return typeof x === 'string' ? { text: x } : x; }); }
  var STEG = {
    text: [
      { kort: 'Läsare', titel: 'Vem ska läsa det?', hjalp: 'Då vet AI:n vilka ord och vilken nivå som passar.', auto: true, grupper: [
        { key: 'malgrupp', stor: true, val: v([{ text: 'Kunder', sub: 'Befintliga eller nya' }, { text: 'Kollegor', sub: 'Teamet eller hela företaget' }, { text: 'Chefen', sub: 'Eller ledningsgruppen' }, { text: 'Följare', sub: 'Sociala medier eller nyhetsbrev' }, { text: 'Nybörjare', sub: 'Inga förkunskaper' }, { text: 'Bara jag', sub: 'Anteckningar och idéer' }]) },
        { key: 'malgruppEgen', typ: 'text', label: 'Eller beskriv själv', ph: 'T.ex. chefer på små byggföretag', full: true }] },
      { kort: 'Ton', titel: 'Hur ska det låta?', hjalp: 'Välj det som känns mest som du.', auto: true, grupper: [
        { key: 'ton', stor: true, val: v([{ text: 'Vänlig', sub: 'Varmt och personligt' }, { text: 'Professionell', sub: 'Sakligt och förtroendeingivande' }, { text: 'Direkt', sub: 'Kort och rakt på sak' }, { text: 'Kreativ', sub: 'Med glimt i ögat' }, { text: 'Övertygande', sub: 'Får läsaren att agera' }, { text: 'Akademisk', sub: 'Noggrant och resonerande' }]) }] },
      { kort: 'Roll', titel: 'Vem ska AI:n vara?', hjalp: 'En roll gör att svaret låter som från en kunnig person. Hoppa över så väljer apan.', auto: true, grupper: [
        { key: 'roll', full: true, val: v(['Copywriter', 'Marknadsförare', 'Säljare', 'SEO-expert', 'Projektledare', 'Lärare', 'Coach', 'Rekryterare / HR', 'UX-designer', 'Dataanalytiker', 'Programmerare', 'Översättare', 'Jurist']) },
        { key: 'rollEgen', typ: 'text', label: 'Eller skriv en egen roll', ph: 'T.ex. erfaren redovisningskonsult', full: true }] },
      { kort: 'Underlag', titel: 'Vad ska AI:n utgå från?', hjalp: 'Fyll i det du har. Allt är frivilligt, men det är här svaret blir ditt. Företag och produkt sparas i din webbläsare till nästa gång.', grupper: [
        { key: 'foretag', typ: 'text', label: 'Företag', ph: 'T.ex. Bageriet i Gnesta' },
        { key: 'produkt', typ: 'text', label: 'Produkt eller tjänst', ph: 'T.ex. surdegsbröd och catering' },
        { key: 'mottagare', typ: 'text', label: 'Mottagare', ph: 'T.ex. Anna, inköpare' },
        { key: 'nyckelord', typ: 'text', label: 'Nyckelord', ph: 'T.ex. ekologiskt, lokalt' },
        { key: 'material', typ: 'lang', label: 'Material att utgå från', ph: 'Klistra in fakta, siffror, en gammal text eller mötesanteckningar', full: true }] },
      { kort: 'Format', titel: 'Hur ska svaret se ut?', hjalp: 'Välj det som spelar roll, resten sköter apan.', grupper: [
        { key: 'format', label: 'Format', full: true, val: v(['Text', 'Punktlista', 'Numrerad lista', 'Tabell', 'Markdown', 'JSON']) },
        { key: 'langd', label: 'Längd', val: v(['Kort', 'Medel', 'Långt']) },
        { key: 'sprak', label: 'Språk', val: v(['Svenska', 'Engelska']) },
        { key: 'regler', typ: 'multi', label: 'Extra (välj flera)', full: true, val: v(['Inkludera exempel', 'Arbeta steg för steg', 'Ge tre alternativ', 'Bara ren text, inga rubriker', 'Flagga om information saknas, gissa inte', 'Ställ frågor om något är oklart']) },
        { key: 'extra', typ: 'text', label: 'Egna regler', ph: 'T.ex. max 150 ord, inga emojis', full: true }] }
    ],
    bild: [
      { kort: 'Stil', titel: 'Hur ska bilden se ut?', hjalp: 'Välj stil och format. Hoppa över, så väljer bildtjänsten själv.', grupper: [
        { key: 'bstil', label: 'Stil', full: true, val: v(['Fotorealistisk', 'Cinematic', 'Illustration', '3D', 'Minimal']) },
        { key: 'bformat', label: 'Format', full: true, val: v(['1:1 kvadrat', '16:9 liggande', '9:16 stående']) }] },
      { kort: 'Ljus och kamera', titel: 'Ljus och kamera', hjalp: 'Det som får bilden att kännas rätt.', grupper: [
        { key: 'bljus', label: 'Ljus', full: true, val: v(['Mjukt', 'Gyllene timmen', 'Neon', 'Dramatiskt', 'Studio']) },
        { key: 'bkamera', label: 'Kamera', val: v(['Närbild', 'Vidvinkel', 'Porträtt']) },
        { key: 'bregler', typ: 'multi', label: 'Extra', val: v(['Ingen text i bilden']) }] }
    ],
    video: [
      { kort: 'Stil', titel: 'Hur ska videon se ut?', hjalp: 'Välj stil, format och ljus. Hoppa över, så väljer videotjänsten själv.', grupper: [
        { key: 'vstil', label: 'Stil', full: true, val: v(['Realistisk', 'Cinematic', 'Illustration', 'Drömsk', 'Kommersiell']) },
        { key: 'vformat', label: 'Format', val: v(['1:1', '16:9', '9:16']) },
        { key: 'vljus', label: 'Ljus', val: v(['Mjukt', 'Gyllene timmen', 'Neon', 'Mörkt och filmiskt']) }] },
      { kort: 'Rörelse', titel: 'Hur ska det röra sig?', hjalp: 'Kamera och tempo.', grupper: [
        { key: 'vkamera', label: 'Kamerarörelse', full: true, val: v(['Stilla', 'Långsam panorering', 'Åker in', 'Åker ut', 'Handhållen', 'Runt motivet']) },
        { key: 'vtempo', label: 'Mängd rörelse', val: v(['Låg', 'Medel', 'Hög']) },
        { key: 'vregler', typ: 'multi', label: 'Extra', val: v(['Loopbar video']) }] }
    ],
    kod: [
      { kort: 'Språk', titel: 'Vilket språk och vilken miljö?', hjalp: 'Hoppa över om du inte vet, så frågar AI:n.', grupper: [
        { key: 'ksprak', label: 'Språk', full: true, val: v(['JavaScript', 'Python', 'HTML/CSS', 'SQL', 'PHP']) },
        { key: 'kmiljo', typ: 'text', label: 'Miljö eller ramverk', ph: 'T.ex. React, Node', full: true }] },
      { kort: 'Hjälp', titel: 'Vad behöver du hjälp med?', hjalp: 'Och hur vill du ha svaret?', grupper: [
        { key: 'khjalp', label: 'Typ av hjälp', full: true, val: v(['Skriv kod', 'Felsök', 'Förklara', 'Optimera', 'Refaktorera']) },
        { key: 'ksvar', label: 'Svar', val: v(['Bara kod', 'Kod + förklaring', 'Steg för steg']) },
        { key: 'kregler', typ: 'multi', label: 'Extra', val: v(['Hantera edge cases']) }] }
    ]
  };
  /* Underlag efter typ (som gamla generatorns fältförslag) + egna fält */
  var EGNA = { key: 'egna', typ: 'egna', label: 'Egna fält', full: true };
  var UNDERLAG = {
    skriva: STEG.text[3].grupper.concat([EGNA]),
    sammanfatta: [
      { key: 'material', typ: 'lang', label: 'Texten du vill ha sammanfattad', ph: 'Klistra in texten, mötesanteckningarna eller dokumentet', full: true },
      { key: 'fokus', typ: 'text', label: 'Fokusområde', ph: 'T.ex. beslut och nästa steg', full: true }, EGNA],
    analysera: [
      { key: 'material', typ: 'lang', label: 'Det du vill ha analyserat', ph: 'Klistra in siffror, en text, enkätsvar eller ett dokument', full: true },
      { key: 'fokus', typ: 'text', label: 'Fokusområde', ph: 'T.ex. varför försäljningen gick ned i mars', full: true }, EGNA],
    brainstorma: [
      { key: 'amne', typ: 'text', label: 'Ämne', ph: 'T.ex. julkampanj för en lokal bokhandel' },
      { key: 'foretag', typ: 'text', label: 'Företag', ph: 'T.ex. Bageriet i Gnesta' },
      { key: 'material', typ: 'lang', label: 'Bakgrund att utgå från', ph: 'Det AI:n bör veta: budget, tidigare idéer, vad som inte funkat', full: true }, EGNA],
    forklara: [
      { key: 'amne', typ: 'text', label: 'Ämne', ph: 'T.ex. vad en API-nyckel är', full: true },
      { key: 'material', typ: 'lang', label: 'Text att utgå från', ph: 'Klistra in det du vill ha förklarat, t.ex. ett avtal eller en artikel', full: true }, EGNA]
  };
  var KOD_UNDERLAG = { kort: 'Underlag', titel: 'Har du kod eller ett felmeddelande?', hjalp: 'Klistra in det du har, så slipper AI:n gissa. Allt är frivilligt.', grupper: [
    { key: 'kkod', typ: 'lang', label: 'Befintlig kod', ph: 'Klistra in koden det gäller', full: true },
    { key: 'kfel', typ: 'lang', label: 'Felmeddelande', ph: 'Klistra in felet exakt som det står', full: true }, EGNA] };
  STEG.kod.splice(1, 0, KOD_UNDERLAG);
  var stegCache = {};
  function stegFor(typ) {
    if (STEG[typ]) return STEG[typ];
    var u = UNDERLAG[typ] || UNDERLAG.skriva;
    if (!stegCache[typ]) stegCache[typ] = STEG.text.map(function (o, i) {
      if (i !== 3) return o;
      var c = {}; for (var k in o) c[k] = o[k];
      c.grupper = u;
      if (typ !== 'skriva') c.hjalp = 'Fyll i det du har. Allt är frivilligt, men det är här svaret blir ditt.';
      return c;
    });
    return stegCache[typ];
  }
  /* Finns fältet i den här typens steg? (förifyllt företag ska inte smyga in där fältet inte syns) */
  function harFalt(typ, key) { return stegFor(typ).some(function (o) { return o.grupper.some(function (g) { return g.key === key; }); }); }
  function egnaRader(x) { return (Array.isArray(x.egna) ? x.egna : []).filter(function (r) { return r && (r.varde || '').trim(); }); }

  var EXEMPEL = ['Ett mejl till en kund som inte svarat på vår offert', 'Ett LinkedIn-inlägg om vår nya tjänst', 'Sammanfatta mina mötesanteckningar', 'En bild till vår kampanj', 'Förklara AI för min chef'];

  function gissaTyp(t) {
    t = (t || '').toLowerCase();
    if (/\bbild|logga|illustration|\bfoto/.test(t)) return 'bild';
    if (/video|\bfilm|reel/.test(t)) return 'video';
    if (/\bkod\b|javascript|python|\bsql\b|\bhtml|\bcss\b|bugg|felsök|script/.test(t)) return 'kod';
    if (/sammanfatt/.test(t)) return 'sammanfatta';
    if (/analys/.test(t)) return 'analysera';
    if (/idéer|brainstorm/.test(t)) return 'brainstorma';
    if (/förklara/.test(t)) return 'forklara';
    return 'skriva';
  }

  /* ── Promptmotorn (samma språk som gamla generatorn) ── */
  var TONE = {
    'Professionell': 'Skriv på ett professionellt och tydligt sätt.', 'Vänlig': 'Skriv på ett vänligt och lättillgängligt sätt.',
    'Kreativ': 'Skriv kreativt och inspirerande.', 'Akademisk': 'Skriv med en akademisk och formell ton.',
    'Direkt': 'Skriv kortfattat och rakt på sak.', 'Övertygande': 'Skriv övertygande och säljande.'
  };
  var FORMAT = { 'Punktlista': 'Presentera svaret som en punktlista.', 'Numrerad lista': 'Presentera svaret som en numrerad lista.', 'Tabell': 'Presentera svaret i en tabell.', 'Markdown': 'Formatera svaret med tydlig markdown.', 'JSON': 'Svara med giltig JSON.' };
  var LANGD = { 'Kort': 'Håll det kort.', 'Medel': 'Lagom långt, varken kortfattat eller uttömmande.', 'Långt': 'Var utförlig och detaljerad.' };
  var TASK = { skriva: 'Skriv följande: ', sammanfatta: 'Sammanfatta följande: ', analysera: 'Analysera följande: ', brainstorma: 'Brainstorma idéer kring: ', forklara: 'Förklara tydligt: ', bild: 'Bilden ska föreställa: ', video: 'Videon ska visa: ', kod: 'Lös följande programmeringsuppgift: ' };
  var STD_ROLL = { skriva: 'skribent som skriver tydligt, konkret och mänskligt', sammanfatta: 'redaktör som sammanfattar kort och tydligt', analysera: 'analytiker som skiljer på fakta och slutsatser', brainstorma: 'idéutvecklare med många oväntade uppslag', forklara: 'pedagog som förklarar svåra saker enkelt' };

  function rollMening(r) {
    r = (r || '').trim();
    if (!r) return '';
    if (r.length > 1 && r[0] !== r[0].toLowerCase() && r[1] === r[1].toLowerCase()) r = r[0].toLowerCase() + r.slice(1);
    if (/^(en|ett|erfaren) /i.test(r)) return 'Du är ' + r.replace(/^erfaren /i, 'en erfaren ') + '.';
    return 'Du är en erfaren ' + r + '.';
  }
  /* "Ett mejl till …" → "Skriv ett mejl till …"; börjar texten redan med ett
     verb ("Sammanfatta …", "Hjälp mig …") används den som den är. */
  var VERB = /^(skriv|gör|ta fram|sammanfatta|analysera|förklara|brainstorma|hjälp|ge|lista|jämför|översätt|föreslå|planera|skapa|formulera|svara|granska|rätta|förbättra|kom på|hitta|fixa|felsök|debugga|optimera|refaktorera|bygg|koda)\b/i;
  function uppgiftsMening(t, text) {
    var f = text.charAt(0).toLowerCase() + text.slice(1);
    if (VERB.test(text)) return text.charAt(0).toUpperCase() + text.slice(1);
    if (t === 'skriva' && /^(ett|en|några|tre|fem|\d+) /i.test(text)) return 'Skriv ' + f;
    if (t === 'brainstorma' && /^(idéer|förslag)\b/i.test(text)) return 'Ge mig ' + f;
    return (TASK[t] || '') + text;
  }
  function arHelPrompt(c) { return c.length > 150 && c.indexOf('\n') !== -1; }

  /* ── Bild: en färdig bildprompt att klistra in i ChatGPT, Gemini eller Copilot
     (inte en prompt som ber AI:n skriva en bildprompt). Hela bildmallar från
     biblioteket (långa, flera rader) skickas som förut. ── */
  var BSTIL = { 'Fotorealistisk': 'fotorealistisk, som ett riktigt foto', 'Cinematic': 'filmisk, som en stillbild ur en film', 'Illustration': 'tecknad illustration', '3D': '3D-renderad', 'Minimal': 'minimalistisk, med enkla former och mycket luft' };
  var BLJUS = { 'Mjukt': 'mjukt och jämnt', 'Gyllene timmen': 'varmt ljus från en låg sol, gyllene timmen', 'Neon': 'neonljus i starka färger', 'Dramatiskt': 'dramatiskt, med djupa skuggor', 'Studio': 'rent studioljus' };
  var BKAM = { 'Närbild': 'närbild', 'Vidvinkel': 'vidvinkel som visar hela miljön', 'Porträtt': 'porträtt, motivet i fokus och bakgrunden suddig' };
  var BFORM = { '1:1 kvadrat': 'kvadratisk, 1:1', '16:9 liggande': 'liggande, 16:9', '9:16 stående': 'stående, 9:16' };
  var RE_BILDORD = /^(?:skapa|gör|rita|generera|designa|ta fram)?\s*(?:mig\s+)?(?:en|ett)?\s*(bild|foto|fotografi|illustration|logga|logotyp|affisch|ikon|teckning|målning)(?:en|et)?\b\s*(.*)$/i;
  function arBildMall(text) { return !!text && arHelPrompt(text); }
  function bildMotiv(text) {
    var t = text.replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
    var m = t.match(RE_BILDORD);
    if (m) { var ord = m[1].toLowerCase(); return 'Skapa ' + (/^(foto|fotografi)$/.test(ord) ? 'ett' : 'en') + ' ' + ord + (m[2] ? ' ' + m[2] : '') + '.'; }
    if (/^(En|Ett|Några|Två|Tre|Min|Mitt|Mina|Vår|Vårt|Våra|Den|Det|De)\b/.test(t)) t = t.charAt(0).toLowerCase() + t.slice(1);
    return 'Skapa en bild: ' + t + '.';
  }
  /* Hur många ord som beskriver själva motivet (för "Apan föreslår") */
  function bildMotivOrd(text) {
    var t = (text || '').trim(), m = t.match(RE_BILDORD); if (m) t = m[2] || '';
    t = t.replace(/^(till|för)\b.*$/i, '');
    return t.split(/\s+/).filter(Boolean).length;
  }
  function bildPrompt(text, x) {
    var r = [text ? bildMotiv(text) : 'Skapa en bild: [BESKRIV VAD SOM SKA SYNAS PÅ BILDEN].'];
    if (BSTIL[x.bstil]) r.push('Stil: ' + BSTIL[x.bstil] + '.');
    if (BLJUS[x.bljus]) r.push('Ljus: ' + BLJUS[x.bljus] + '.');
    if (BKAM[x.bkamera]) r.push('Bildutsnitt: ' + BKAM[x.bkamera] + '.');
    if (BFORM[x.bformat]) r.push('Format: ' + BFORM[x.bformat] + '.');
    if (Array.isArray(x.bregler) && x.bregler.length) r.push('Ingen text i bilden.');
    return r.join('\n');
  }

  /* ── Video: samma tanke, en färdig videoprompt (Veo i Gemini, Sora, Runway) ── */
  var VSTIL = { 'Realistisk': 'realistisk, som riktig film', 'Cinematic': 'filmisk, som en scen ur en långfilm', 'Illustration': 'animerad illustration', 'Drömsk': 'drömsk och mjuk', 'Kommersiell': 'som en reklamfilm, ren och påkostad' };
  var VLJUS = { 'Mjukt': 'mjukt och jämnt', 'Gyllene timmen': 'varmt ljus från en låg sol, gyllene timmen', 'Neon': 'neonljus i starka färger', 'Mörkt och filmiskt': 'mörkt och filmiskt, med djupa skuggor' };
  var VKAM = { 'Stilla': 'stillastående kamera', 'Långsam panorering': 'kameran panorerar långsamt', 'Åker in': 'kameran åker långsamt in mot motivet', 'Åker ut': 'kameran åker långsamt bakåt från motivet', 'Handhållen': 'handhållen kamera, lite skakig', 'Runt motivet': 'kameran åker runt motivet' };
  var VTEMPO = { 'Låg': 'lugnt, lite rörelse', 'Medel': 'måttligt tempo', 'Hög': 'mycket rörelse och högt tempo' };
  var VFORM = { '1:1': 'kvadratisk, 1:1', '16:9': 'liggande, 16:9', '9:16': 'stående, 9:16' };
  var RE_VIDEOORD = /^(?:skapa|gör|filma|generera|ta fram)?\s*(?:mig\s+)?(?:en|ett)?\s*(video|film|filmklipp|klipp|reel|animering|animation)(?:en|et|n)?\b\s*(.*)$/i;
  function videoMotiv(text) {
    var t = text.replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
    var m = t.match(RE_VIDEOORD);
    if (m) { var ord = m[1].toLowerCase(); return 'Skapa ' + (/^(klipp|filmklipp)$/.test(ord) ? 'ett' : 'en') + ' ' + ord + (m[2] ? ' ' + m[2] : '') + '.'; }
    if (/^(En|Ett|Några|Två|Tre|Min|Mitt|Mina|Vår|Vårt|Våra|Den|Det|De)\b/.test(t)) t = t.charAt(0).toLowerCase() + t.slice(1);
    return 'Skapa en video: ' + t + '.';
  }
  function videoMotivOrd(text) {
    var t = (text || '').trim(), m = t.match(RE_VIDEOORD); if (m) t = m[2] || '';
    t = t.replace(/^(till|för)\b.*$/i, '');
    return t.split(/\s+/).filter(Boolean).length;
  }
  function videoPrompt(text, x) {
    var r = [text ? videoMotiv(text) : 'Skapa en video: [BESKRIV VAD SOM SKA HÄNDA I VIDEON].'];
    if (VSTIL[x.vstil]) r.push('Stil: ' + VSTIL[x.vstil] + '.');
    if (VLJUS[x.vljus]) r.push('Ljus: ' + VLJUS[x.vljus] + '.');
    if (VKAM[x.vkamera]) r.push('Kamera: ' + VKAM[x.vkamera] + '.');
    if (VTEMPO[x.vtempo]) r.push('Rörelse: ' + VTEMPO[x.vtempo] + '.');
    if (VFORM[x.vformat]) r.push('Format: ' + VFORM[x.vformat] + '.');
    if (Array.isArray(x.vregler) && x.vregler.length) r.push('Videon ska gå att loopa sömlöst.');
    return r.join('\n');
  }
  /* Direkt bild- eller videoprompt (inte en hel mall från biblioteket)? */
  function arDirektMedia(S) { return !S.raw && (S.typ === 'bild' || S.typ === 'video') && !arBildMall(applyFills(S.text || '').trim()); }

  function byggPrompt(S) {
    if (S.raw) return S.raw;
    if (S.typ === 'video' && !arBildMall(applyFills(S.text || '').trim())) return videoPrompt(applyFills(S.text || '').trim(), S.svar);
    if (S.typ === 'bild' && !arBildMall(applyFills(S.text || '').trim())) return bildPrompt(applyFills(S.text || '').trim(), S.svar);
    var t = S.typ, x = S.svar, text = applyFills(S.text || '').trim();
    var isBild = t === 'bild', isVideo = t === 'video', isKod = t === 'kod', isMedia = isBild || isVideo;
    var hel = !!text && arHelPrompt(text);
    var egenRoll = hel && /^\s*(du är|agera som|tänk dig att du är|act as|you are)\b/i.test(text);
    var sys = [], out = [], regler = [], kat = [], kontext = [];
    if (isBild) { if (!egenRoll) sys.push('Du är expert på att skriva prompter för AI-bildgeneratorer. Använd visuellt beskrivande språk.'); }
    else if (isVideo) { if (!egenRoll) sys.push('Du är expert på att skriva prompter för AI-videogeneratorer. Beskriv scen, rörelse, tempo, ljus och kamera tydligt.'); }
    else if (isKod) { if (!egenRoll) sys.push(x.rollEgen || x.roll ? rollMening(x.rollEgen || x.roll) + ' Du skriver tydlig och robust kod.' : 'Du är en senior utvecklare som skriver tydlig och robust kod.'); }
    else if (!egenRoll) sys.push(rollMening(x.rollEgen || x.roll || STD_ROLL[t] || STD_ROLL.skriva));
    if (TONE[x.ton] && !isMedia && !isKod) (egenRoll ? out : sys).push(TONE[x.ton]);

    var uppgift = text ? (hel ? text : uppgiftsMening(t, text)) : '[BESKRIV VAD DU VILL HA HJÄLP MED]';

    /* Läsare och underlag hör bara till textuppgifter (inte bild/video/kod) */
    var arText = !isMedia && !isKod;
    var lasare = arText ? [x.malgrupp, x.malgruppEgen].filter(Boolean).join(', ') : '';
    if (lasare) kontext.push('- Läsare: ' + lasare);
    var tt = t || 'skriva';
    function med(key) { return arText && x[key] && harFalt(tt, key); }
    if (med('amne')) kontext.push('- Ämne: ' + x.amne);
    if (med('fokus')) kontext.push('- Fokusområde: ' + x.fokus);
    if (med('foretag') && text.indexOf(x.foretag) === -1) kontext.push('- Företag: ' + x.foretag);
    if (med('produkt') && text.indexOf(x.produkt) === -1) kontext.push('- Produkt/tjänst: ' + x.produkt);
    if (med('mottagare')) kontext.push('- Mottagare: ' + x.mottagare);
    if (med('nyckelord')) kontext.push('- Nyckelord: ' + x.nyckelord);
    if (!isMedia) egnaRader(x).forEach(function (r) { kontext.push('- ' + ((r.namn || '').trim() || 'Övrigt') + ': ' + r.varde.trim()); });
    var material = med('material') ? '"""\n' + x.material.trim() + '\n"""' : '';
    var kodBlock = isKod && x.kkod ? '```\n' + x.kkod.trim() + '\n```' : '', felBlock = isKod && x.kfel ? '```\n' + x.kfel.trim() + '\n```' : '';

    if (!isMedia) out.push('Svara på ' + ((x.sprak || 'Svenska').toLowerCase()) + '.');
    if (FORMAT[x.format]) out.push(FORMAT[x.format]);
    if (LANGD[x.langd]) out.push(LANGD[x.langd]);
    var rg = Array.isArray(x.regler) ? x.regler : [];
    if (rg.indexOf('Inkludera exempel') !== -1) out.push('Inkludera exempel.');
    if (rg.indexOf('Arbeta steg för steg') !== -1) out.push('Arbeta steg för steg.');
    if (rg.indexOf('Ge tre alternativ') !== -1) out.push('Ge tre alternativ.');
    if (rg.indexOf('Ställ frågor om något är oklart') !== -1) regler.push('Ställ frågor om något är oklart.');
    if (rg.indexOf('Flagga om information saknas, gissa inte') !== -1) regler.push('Om du saknar information för att lösa uppgiften, säg det i stället för att gissa.');
    if (rg.indexOf('Bara ren text, inga rubriker') !== -1) regler.push('Svara i ren text, utan rubriker, länkar eller annan formatering förutom radbrytningar.');
    if (x.extra) regler.push(x.extra.trim());

    if (isBild) {
      if (x.bstil) kat.push('Stil: ' + x.bstil);
      if (x.bformat) kat.push('Format: ' + x.bformat);
      if (x.bljus) kat.push('Ljus: ' + x.bljus);
      if (x.bkamera) kat.push('Komposition: ' + x.bkamera);
      if (Array.isArray(x.bregler) && x.bregler.length) kat.push('Ingen text i bilden');
    }
    if (isVideo) {
      if (x.vstil) kat.push('Stil: ' + x.vstil);
      if (x.vformat) kat.push('Format: ' + x.vformat);
      if (x.vljus) kat.push('Ljus: ' + x.vljus);
      if (x.vkamera) kat.push('Kamerarörelse: ' + x.vkamera);
      if (x.vtempo) kat.push('Rörelseintensitet: ' + x.vtempo);
      if (Array.isArray(x.vregler) && x.vregler.length) kat.push('Videon ska vara sömlöst loopbar');
    }
    if (isKod) {
      out.push('Skriv fungerande kod som kan användas direkt.');
      if (x.ksprak) kat.push('Språk: ' + x.ksprak);
      if (x.kmiljo) kat.push('Miljö: ' + x.kmiljo);
      if (x.khjalp) kat.push('Typ av hjälp: ' + x.khjalp);
      if (x.ksvar) kat.push('Svar: ' + x.ksvar);
      if (Array.isArray(x.kregler) && x.kregler.length) kat.push('Hantera edge cases');
      if (!x.ksprak && !x.kmiljo) regler.push('Fråga mig om språk eller miljö är oklart innan du svarar.');
    }
    function lista(a) { return a.map(function (s) { return /^- /.test(s) ? s : '- ' + s; }).join('\n'); }
    var delar = [];
    if (sys.length) delar.push(sys.join(' '));
    /* En hel mall/prompt från biblioteket skickas som den är, utan rubrik */
    delar.push(hel ? uppgift : '## Uppgift\n' + uppgift);
    if (kontext.length) delar.push('## Kontext\n' + kontext.join('\n'));
    if (material) delar.push('## Material att utgå från\n' + material);
    if (kodBlock) delar.push('## Befintlig kod\n' + kodBlock);
    if (felBlock) delar.push('## Felmeddelande\n' + felBlock);
    if (out.length) delar.push('## Så ska svaret se ut\n' + lista(out));
    if (regler.length) delar.push('## Regler\n' + lista(regler));
    if (kat.length) delar.push('## Ta hänsyn till\n' + lista(kat));
    return delar.join('\n\n').trim();
  }

  /* ── Lagring (pg_kedja delas med mallarna och projektmallarna) ── */
  var KEDJA = 'pg_kedja';
  var FYLL = { foretag: '[DITT FÖRETAG]', produkt: '[DIN PRODUKT/TJÄNST]' };
  function las(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function spara(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function kedjaFyll() { var k = las(KEDJA, {}) || {}; return k.fyll || {}; }
  function sparaKedja(key, val) {
    var k = las(KEDJA, {}) || {}; k.fyll = k.fyll || {}; k.mallar = k.mallar || {};
    if (val) k.fyll[FYLL[key]] = val; else delete k.fyll[FYLL[key]];
    spara(KEDJA, k);
  }

  /* ── Platshållare [SÅ HÄR] → Fyll i-steget ── */
  var PH_SRC = '\\[([^\\[\\]\\n]{2,160})\\](?!\\()';   // [text] men inte [länk](url)
  var RE_FORETAG = /^(ditt |vårt |ert )?företag(et|snamn|ets namn)?$/i;
  var RE_EGEN = /^(ditt|din|dina|ert|er|era|vårt|vår|våra|mitt|min|mina) /i;
  var RE_PRODUKT = /^(din |er |vår )?(produkt|tjänst|produkt ?\/ ?tjänst)(en)?$/i;
  function phSentence(s) {
    s = s.trim();
    var bokst = s.replace(/[^A-Za-zÅÄÖåäö]/g, '');
    if (bokst && bokst === bokst.toUpperCase()) s = s.toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  /* Platshållarna i ordning, en per unik text. Etikett = texten före på
     samma rad ("Mål: [..]" → "Mål"), annars platshållaren själv. */
  function phParse(text) {
    if (!text || S.raw) return [];
    var out = [], sedd = {}, antal = {}, kod = S.typ === 'kod';
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
        out.push({ key: k, label: etikett, hint: exempel ? k : etikett !== phSentence(k) ? phSentence(k) : 'Skriv här …',
          multi: rad.trim() === m[0] || k.length > 40 || /klistra|text|mejl|recension|anteckning|material|beskriv|kundkort|fr[åa]n (steg|fas)/i.test(k) });
      }
    });
    return out;
  }
  function fylltVarde(k) { return ((S.fyll && S.fyll[k]) || '').trim(); }
  function applyFills(text) {
    if (!text || S.raw) return text;
    return text.replace(new RegExp(PH_SRC, 'g'), function (m, k) { return fylltVarde(k) || m; });
  }
  function ofyllda() { return phParse(S.text).filter(function (t) { return !fylltVarde(t.key); }); }
  /* Förifyll från det som sparats tidigare (pg_kedja) och Underlag-fälten */
  /* S.forifyllt[key] = varifrån värdet kom: 'svar' (AI-svar från tidigare steg),
     'mall' (ifyllt i ett tidigare steg i samma mall), 'tidigare' (förra gången) */
  function forifyll() {
    var f = kedjaFyll(), antal = 0;
    var mf = K ? (kMin().fyll || {}) : {};
    phParse(S.text).forEach(function (t) {
      if (fylltVarde(t.key)) return;
      var v = '', fran = 'tidigare';
      if (K) { v = kSvarFor(t.key); if (v) fran = 'svar'; else if (!arSvarNyckel(t.key) && mf[t.key]) { v = mf[t.key]; fran = 'mall'; } }
      if (!v) v = f['[' + t.key + ']'] || '';
      if (!v && RE_FORETAG.test(t.key)) v = S.svar.foretag || f[FYLL.foretag] || '';
      if (!v && RE_PRODUKT.test(t.key)) v = S.svar.produkt || f[FYLL.produkt] || '';
      if (!v && /^(ton|tonen|tonläge)$/i.test(t.key) && S.svar.ton) v = S.svar.ton.toLowerCase();
      if (v) { S.fyll[t.key] = v; S.forifyllt[t.key] = fran; if (fran !== 'tidigare') antal++; }
    });
    return antal;
  }
  function sparaFyll(t, val) {
    /* I kedjeläget följer allt man fyller i med till nästa steg i samma mall
       (utom AI-svaren från tidigare steg, som hämtas från rutan "Har du fått svaret") */
    if (K && !arSvarNyckel(t.key) && val.length <= 4000) {
      var st = kLas(), m = kMin(st);
      if (val) m.fyll[t.key] = val; else delete m.fyll[t.key];
      spara(KEDJA, st);
    }
    /* Sparas bara: korta värden om dig själv ([DITT FÖRETAG], [DIN BRANSCH] …).
       Mottagare, ton, mål och inklistrade texter är olika varje gång. */
    if (t.multi || val.length > 120 || /\n/.test(val)) return;
    if (!RE_EGEN.test(t.key) && !RE_FORETAG.test(t.key) && !RE_PRODUKT.test(t.key)) return;
    var k = las(KEDJA, {}) || {}; k.fyll = k.fyll || {}; k.mallar = k.mallar || {};
    if (val) k.fyll['[' + t.key + ']'] = val; else delete k.fyll['[' + t.key + ']'];
    spara(KEDJA, k);
    if (RE_FORETAG.test(t.key)) { S.svar.foretag = val; sparaKedja('foretag', val); }
    if (RE_PRODUKT.test(t.key)) { S.svar.produkt = val; sparaKedja('produkt', val); }
  }

  /* ── Senaste prompter (samma lista som gamla generatorn) ── */
  var RECENT_KEY = 'aimonkey_recent_prompts', RECENT_MAX = 10;
  var TYP_ETIKETT = { 'skriva': 'Skriva text', 'skriva-text': 'Skriva text', 'skriva text': 'Skriva text', 'sammanfatta': 'Sammanfatta', 'analysera': 'Analysera', 'brainstorma': 'Brainstorma', 'forklara': 'Förklara', 'förklara': 'Förklara', 'bild': 'Bild', 'bildprompta': 'Bild', 'video': 'Video', 'kod': 'Kod' };
  function lasSenaste() { var l = las(RECENT_KEY, []); return Array.isArray(l) ? l.filter(function (p) { return p && p.text; }) : []; }
  function sparaSenaste(text, typ, namn) {
    if (!text || text.length < 10) return;
    var l = lasSenaste().filter(function (p) { return p.text !== text; });
    var m = /##\s*Uppgift\s*\n([^\n]+)/.exec(text);
    var forhand = namn ? namn : (m ? m[1] : text.split('\n').filter(function (r) { return r.trim() && !/^#/.test(r); })[0] || text);
    forhand = forhand.replace(/\s+/g, ' ').trim();
    l.unshift({ id: Date.now(), text: text, preview: forhand.length > 90 ? forhand.slice(0, 90) + '…' : forhand, tasktype: typ || '', created: new Date().toISOString() });
    spara(RECENT_KEY, l.slice(0, RECENT_MAX));
  }
  function relTid(iso) {
    var d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isNaN(d)) return '';
    if (d < 60) return 'just nu';
    if (d < 3600) return Math.floor(d / 60) + ' min sedan';
    if (d < 86400) return Math.floor(d / 3600) + ' h sedan';
    if (d < 172800) return 'igår';
    return Math.floor(d / 86400) + ' dagar sedan';
  }

  /* Varifrån kom besökaren? Sajten skickar ingen referrer mellan sidor, så
     prompt-format.js (sajtfootern) sparar sökvägen i sessionStorage pg_from
     vid klick på en länk hit (samma som gamla generatorns pg_open source). */
  var INGANG = (function () {
    var p = '';
    try { p = sessionStorage.getItem('pg_from') || ''; sessionStorage.removeItem('pg_from'); } catch (e) {}
    if (!p) {
      try {
        if (document.referrer) {
          var r = new URL(document.referrer);
          p = r.hostname.replace(/^www\./, '') !== location.hostname.replace(/^www\./, '') ? 'extern' : r.pathname;
        }
      } catch (e) {}
    }
    if (!p) return 'direkt';
    if (p === 'extern') return 'extern';
    if (/^\/(ai-prompter|promptbiblioteket)/.test(p)) return 'biblioteket';
    if (/^\/ai-mallar/.test(p)) return 'mallar';
    if (/^\/artiklar/.test(p)) return 'artiklar';
    if (/^\/ai-for-/.test(p)) return 'temasida';
    if (/^\/projektpaket/.test(p)) return 'projektmall';
    if (/^\/promptgeneratorn/.test(p)) return 'generatorn';
    if (p === '/') return 'startsida';
    return 'sajt';
  })();
  function track(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event, typ: S.typ || '', kalla: S.kalla || 'scratch', ingang: INGANG };
    for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }

  /* ── Tillstånd ── */
  var S = { steg: 'start', text: '', typ: null, typOppen: false, optIdx: 0, svar: {}, rad: 0, kopierad: false, fin: false, sa: false, kalla: 'scratch', mallNamn: '', besokt: {}, raw: '', senAlla: false, senVisa: -1, senRensa: false, senOppen: false, fyll: {}, forifyllt: {}, efterFyll: 'bygger', fyllVisaFel: false, justera: '', ark: '', nya: null, puls: 0, _fore: null, alla: false, redigera: false };
  try { S.alla = localStorage.getItem('pgny_alla') === '1'; } catch (e) {}
  (function () {
    var f = kedjaFyll();
    if (f[FYLL.foretag]) S.svar.foretag = f[FYLL.foretag];
    if (f[FYLL.produkt]) S.svar.produkt = f[FYLL.produkt];
  })();

  /* ── Kedjeläget (?mall=<slug>&steg=N) ── */
  var K = null, KUNDKORT_MALL = 'kundkartlaggaren';
  (function () {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var slug = (q.get('mall') || '').trim().toLowerCase(), n = parseInt(q.get('steg'), 10) || 0;
    if (!/^[a-z0-9-]{2,120}$/.test(slug) || n < 1) return;
    var ch = null; try { ch = JSON.parse(sessionStorage.getItem('pg_chain') || 'null'); } catch (e) {}
    var egen = ch && ch.mall === slug;
    K = { mall: slug, steg: n, mallNamn: egen ? (ch.mallNamn || '') : '', laddad: false,
      steps: egen && ch.steps ? ch.steps.map(function (x) { return { n: +x.steg, titel: x.titel || '' }; }) : [] };
  })();
  function kLas() { var st = las(KEDJA, {}) || {}; st.fyll = st.fyll || {}; st.mallar = st.mallar || {}; return st; }
  function kMin(st) { st = st || kLas(); var m = st.mallar[K.mall] = st.mallar[K.mall] || {}; m.svar = m.svar || {}; m.fyll = m.fyll || {}; return m; }
  function kIdx(n) { for (var i = 0; i < K.steps.length; i++) if (K.steps[i].n === n) return i; return -1; }
  function kKlara() { try { return JSON.parse(localStorage.getItem('aim_mall_klar_' + K.mall) || '[]') || []; } catch (e) { return []; } }
  function kMarkera(n) { var d = kKlara(); if (d.indexOf(n) === -1) { d.push(n); try { localStorage.setItem('aim_mall_klar_' + K.mall, JSON.stringify(d)); } catch (e) {} } }
  function kTrack(ev, extra) { var o = { mall: K.mall, steg: K.steg, antal_steg: K.steps.length }; for (var k in extra) o[k] = extra[k]; track(ev, o); }
  function arSvarNyckel(k) { return /fr[åa]n (steg|fas)\s*\d/i.test(k) || /kundkort/i.test(k); }
  /* AI-svar från tidigare steg ("[KLISTRA IN … FRÅN STEG 1–2]"), kundkortet
     från Kundkartläggaren och "[… FRÅN FAS 2]" från en annan mall i den fasen */
  function kSvarFor(k) {
    if (!K) return '';
    var st = kLas(), mine = kMin(st);
    var m = /fr[åa]n steg\s*(\d+(?:\s*(?:[–-]|,|och)\s*\d+)*)/i.exec(k);
    if (m) {
      var nums = [];
      m[1].split(/\s*(?:,|och)\s*/i).forEach(function (del) {
        var r = /^(\d+)\s*[–-]\s*(\d+)$/.exec(del);
        if (r) { for (var x = +r[1]; x <= +r[2]; x++) nums.push(x); } else nums.push(parseInt(del, 10));
      });
      return nums.filter(function (x) { return x < K.steg && mine.svar[x]; }).map(function (x) { return mine.svar[x]; }).join('\n\n');
    }
    if (/kundkort/i.test(k) && K.mall !== KUNDKORT_MALL) {
      var kk = (st.mallar[KUNDKORT_MALL] || {}).svar || {};
      var sist = Object.keys(kk).map(Number).sort(function (a, b) { return b - a; })[0];
      return sist ? kk[sist] : '';
    }
    var f = /fr[åa]n fas (\d+)/i.exec(k);
    return f ? kFasSvar(st, +f[1], k) : '';
  }
  var SYNONYMER = { roi: 'nytta räkna', kalkyl: 'nytta räkna', affärsnytta: 'nytta', värdeproposition: 'värde', värdeerbjudande: 'värde', kundkort: 'kundkort', pitch: 'pitch', invändning: 'invänd' };
  function kFasSvar(st, fas, k) {
    var best = '', bestPt = -1, bestT = '';
    var BORT = ['klistra', 'eller', 'svaret', 'svar', 'det', 'den', 'dem', 'från', 'och', 'som', 'din', 'ditt', 'dina'];
    var stammar = [];
    k.toLowerCase().replace(/fr[åa]n fas \d+.*$/, '').split(/[^a-zåäö]+/).filter(function (w) { return w.length >= 3 && BORT.indexOf(w) === -1; }).forEach(function (w) {
      stammar.push(w.slice(0, 5));
      Object.keys(SYNONYMER).forEach(function (x) { if (w.indexOf(x) === 0) stammar = stammar.concat(SYNONYMER[x].split(' ')); });
    });
    Object.keys(st.mallar).forEach(function (slug) {
      var m = st.mallar[slug];
      if (slug === K.mall || +m.fas !== fas || !m.svar) return;
      Object.keys(m.svar).map(Number).forEach(function (n) {
        var titel = ((m.titlar || {})[n] || '').toLowerCase();
        var pt = stammar.filter(function (x) { return titel.indexOf(x) > -1; }).length * 100 + n;
        if (pt > bestPt || (pt === bestPt && (m.t || '') > bestT)) { bestPt = pt; best = m.svar[n]; bestT = m.t || ''; }
      });
    });
    return best;
  }
  function sattRoll(roll) {
    if (!roll) return;
    var alla = STEG.text[2].grupper[0].val.map(function (o) { return o.text; });
    var hit = alla.filter(function (r) { return r.toLowerCase() === roll.toLowerCase(); })[0];
    if (hit) S.svar.roll = hit; else S.svar.rollEgen = roll;
  }

  /* URL-kontraktet */
  (function () {
    var p; try { p = new URLSearchParams(location.search); } catch (e) { return; }
    var brief = p.get('brief') || '', tasktype = (p.get('tasktype') || '').toLowerCase(), roll = p.get('roll') || '',
      ton = p.get('ton') || '', malgrupp = p.get('malgrupp') || '', namn = p.get('namn') || '', source = p.get('source') || '';
    try {
      if (!brief && source) {
        brief = sessionStorage.getItem('pg_imported_prompt') || '';
        namn = namn || sessionStorage.getItem('pg_imported_namn') || '';
        tasktype = tasktype || (sessionStorage.getItem('pg_imported_tasktype') || '').toLowerCase();
        roll = roll || sessionStorage.getItem('pg_imported_roll') || '';
        ton = ton || sessionStorage.getItem('pg_imported_ton') || '';
        malgrupp = malgrupp || sessionStorage.getItem('pg_imported_malgrupp') || '';
        ['pg_imported_prompt', 'pg_imported_namn', 'pg_imported_tasktype', 'pg_imported_roll', 'pg_imported_ton', 'pg_imported_malgrupp'].forEach(function (k) { sessionStorage.removeItem(k); });
      }
    } catch (e) {}
    if (tasktype) S.typ = TYP_ALIAS[tasktype] || tasktype;
    sattRoll(roll);
    if (ton) { var tk = Object.keys(TONE).filter(function (k) { return k.toLowerCase() === ton.toLowerCase(); })[0]; if (tk) S.svar.ton = tk; }
    if (malgrupp) S.svar.malgruppEgen = malgrupp;
    if (source) S.kalla = /^(biblioteket|mallar|artiklar)$/.test(source) ? source : 'lank';
    if (brief) {
      S.text = brief; S.mallNamn = namn;
      /* En hel mall (lång, flera rader) utan tasktype är en textprompt. Att gissa
         på den ger fel: "script" eller "bild" någonstans i texten gjorde den till kod/bild */
      if (!S.typ) S.typ = arHelPrompt(brief) ? 'skriva' : gissaTyp(brief);
      S.steg = 'bygger';
      var auto = forifyll();
      if (K && auto) kTrack('pgny_kedja_autofyll', { antal: auto });
      if (ofyllda().length || (K && phParse(S.text).length)) { S.steg = 'fyll'; S.efterFyll = 'bygger'; }
    }
    /* Kedjeläget utan prompt i länken: hämta steget från mallsidan först */
    if (K && !S.text) { S.steg = 'laddar'; S.kalla = 'mallar'; }
  })();

  /* ── Mallbiblioteket (/prompt-data) ── */
  var CAT_MAP = { 'Kodning & Webb': 'kod', 'Vardag': 'brainstorma', 'Kreativitet': 'brainstorma', 'Bildgenerering': 'bild', 'Bild': 'bild' };
  var bibliotek = null, laddar = false, vantar = [];
  function laddaBibliotek(cb) {
    if (bibliotek) return cb(bibliotek);
    vantar.push(cb);
    if (laddar) return;
    laddar = true;
    fetch(location.origin + '/prompt-data').then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      bibliotek = [].slice.call(doc.querySelectorAll('.pg-data-item')).map(function (el) {
        function t(c) { return ((el.querySelector(c) || {}).textContent || '').trim(); }
        var cat = t('.pg-d-cat');
        return { namn: t('.pg-d-name'), cat: cat, slug: t('.pg-d-slug'), prompt: t('.pg-d-prompt'), desc: t('.pg-d-desc'), typ: CAT_MAP[cat] || 'skriva' };
      }).filter(function (p) { return p.namn && p.prompt; });
      laddar = false; vantar.splice(0).forEach(function (f) { f(bibliotek); });
    }).catch(function () { bibliotek = []; laddar = false; vantar.splice(0).forEach(function (f) { f([]); }); });
  }
  var STOPP = /^(och|att|för|med|som|till|det|den|ett|en|om|på|av|jag|vill|vår|vårt|våra|min|mitt|mina|har|kan|inte|från|hur|vad|ska|skriv|gör|ett|nytt|ny|nya)$/;
  function sok(q) {
    if (!bibliotek || !q) return [];
    var ord = q.toLowerCase().split(/[^a-zåäö0-9-]+/).filter(function (w) { return w.length >= 3 && !STOPP.test(w); });
    if (!ord.length) return [];
    return bibliotek.map(function (p) {
      var namn = p.namn.toLowerCase(), rest = (p.desc + ' ' + p.cat).toLowerCase(), pt = 0;
      ord.forEach(function (w) { var st = w.length > 5 ? w.slice(0, w.length - 2) : w; if (namn.indexOf(st) !== -1) pt += 3; else if (rest.indexOf(st) !== -1) pt += 1; });
      return { p: p, pt: pt };
    }).filter(function (x) { return x.pt >= 2; }).sort(function (a, b) { return b.pt - a.pt; }).slice(0, 3).map(function (x) { return x.p; });
  }

  /* ── CSS ── */
  var CSS = [
    '[data-pgny]{--pg-navy:#0b1f3b;--pg-teal:#00c9a7;--pg-teal-d:#00806b;--pg-mint:#e5f9f6;--pg-gul:#ffd23f;--pg-gra:#3d4a5c;--pg-linje:#d3dbe4;color:var(--pg-navy);padding-bottom:140px}',
    '[data-pgny] *{box-sizing:border-box}',
    '.pgn{max-width:880px;margin:0 auto;display:flex;flex-direction:column;gap:32px}',
    '.pgn-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}',
    '.pgn-logo{font-weight:700;font-size:18px;color:var(--pg-teal-d)}',
    '.pgn-stegrad{list-style:none;margin:0;padding:0;display:flex;gap:6px;flex-wrap:wrap}',
    '.pgn-stegrad li{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;padding:6px 12px 6px 6px;border-radius:999px;color:#5b6573}',
    '.pgn-stegrad li i{font-style:normal;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;border:1.5px solid #c9d3de}',
    '.pgn-stegrad li.is-aktiv{background:var(--pg-navy);color:#fff}.pgn-stegrad li.is-aktiv i{background:var(--pg-teal);border-color:var(--pg-teal);color:var(--pg-navy)}',
    '.pgn-stegrad li.is-klar{color:var(--pg-teal-d)}.pgn-stegrad li.is-klar i{background:var(--pg-mint);border-color:var(--pg-mint)}',
    '.pgn h1,.pgn .pgn-h1{margin:0;font-weight:700;font-size:clamp(34px,6vw,64px);line-height:1.04;letter-spacing:-.02em;color:var(--pg-navy)}',
    '.pgn-ingress{margin:0;font-size:20px;line-height:1.5;color:var(--pg-gra)}',
    '.pgn-sek{display:flex;flex-direction:column;gap:26px}',
    '.pgn-rubrik{display:flex;flex-direction:column;gap:12px}',
    '.pgn-ta{width:100%;min-height:200px;resize:vertical;padding:22px 24px;border:2px solid var(--pg-linje);border-radius:24px;background:#fff;font:inherit;font-size:21px;line-height:1.5;color:var(--pg-navy);box-shadow:0 12px 32px rgba(11,31,59,.06)}',
    '.pgn-ta:focus,.pgn-in:focus{outline:none;border-color:var(--pg-teal);box-shadow:0 0 0 6px rgba(0,201,167,.18)}',
    '.pgn-traff{display:flex;flex-direction:column;gap:12px;background:var(--pg-mint);border-radius:24px;padding:20px 22px;animation:pgn-inn .3s ease-out}',
    '.pgn-traff-topp{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px}',
    '.pgn-traff-topp p{margin:0;font-size:20px;font-weight:700}.pgn-traff-topp span{font-size:14px;color:#005042}',
    '.pgn-traff-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}',
    '.pgn-mall{text-align:left;font:inherit;padding:16px 18px;min-height:84px;border-radius:16px;border:2px solid #fff;background:#fff;color:var(--pg-navy);cursor:pointer;display:flex;flex-direction:column;gap:4px;transition:transform .15s,border-color .15s}',
    '.pgn-mall:hover,.pgn-kort:hover{border-color:var(--pg-teal);transform:translateY(-2px)}',
    '.pgn-mall small{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--pg-teal-d)}',
    '.pgn-mall b{font-size:18px;line-height:1.25}.pgn-mall span{font-size:14px;line-height:1.4;color:#4a5668}',
    '.pgn-lank{font-size:15px;font-weight:600;color:var(--pg-teal-d)}',
    '.pgn-ex{display:flex;flex-direction:column;gap:12px}.pgn-ex p{margin:0;font-size:15px;font-weight:600;color:var(--pg-gra)}',
    '.pgn-chips{display:flex;flex-wrap:wrap;gap:10px}',
    '.pgn-chip{font:inherit;font-size:16px;padding:10px 18px;min-height:44px;border-radius:999px;border:1.5px solid #c9d3de;background:#fff;color:var(--pg-navy);cursor:pointer;text-align:left}',
    '.pgn-chip:hover{border-color:var(--pg-teal);background:var(--pg-mint)}',
    '.pgn-chip[aria-pressed="true"]{background:var(--pg-navy);border-color:var(--pg-navy);color:#fff}',
    '.pgn-rad{display:flex;flex-wrap:wrap;align-items:center;gap:16px 20px}',
    '.pgn-gul{font:inherit;font-weight:700;font-size:21px;padding:18px 32px;min-height:62px;border-radius:18px;border:0;background:var(--pg-gul);color:var(--pg-navy);cursor:pointer;box-shadow:0 10px 24px rgba(255,210,63,.35)}',
    '.pgn-gul:hover{filter:brightness(.97)}',
    '.pgn-mork{font:inherit;font-weight:700;font-size:18px;padding:15px 26px;min-height:54px;border-radius:16px;border:0;background:var(--pg-navy);color:#fff;cursor:pointer}',
    '.pgn-ram{font:inherit;font-weight:600;font-size:17px;padding:16px 24px;min-height:56px;border-radius:18px;border:2px solid var(--pg-navy);background:transparent;color:var(--pg-navy);cursor:pointer}',
    '.pgn-text-knapp{font:inherit;font-size:16px;font-weight:600;color:var(--pg-gra);background:none;border:0;text-decoration:underline;cursor:pointer;min-height:44px;padding:0}',
    '.pgn-not{font-size:15px;color:var(--pg-gra)}',
    '.pgn-uppg{display:flex;flex-direction:column;gap:12px;background:#fff;border:1.5px solid #e1e7ee;border-radius:16px;padding:12px 16px}',
    '.pgn-uppg-rad{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;font-size:16px}',
    '.pgn-uppg-rad strong{color:var(--pg-teal-d)}',
    '.pgn-uppg-text{flex:1 1 220px;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '.pgn-typ{font:inherit;font-size:14px;font-weight:600;color:var(--pg-navy);background:#f2f6f9;border:1.5px solid #dbe2ea;border-radius:999px;cursor:pointer;min-height:40px;padding:0 14px}',
    '.pgn-andra{font:inherit;font-size:15px;font-weight:600;color:var(--pg-teal-d);background:none;border:0;cursor:pointer;min-height:40px;padding:0 6px}',
    '.pgn-nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    '.pgn-nav>span{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5b6573;margin-right:4px}',
    '.pgn-nav button{font:inherit;font-size:14px;font-weight:600;padding:8px 14px;min-height:42px;border-radius:999px;cursor:pointer;background:transparent;color:var(--pg-gra);border:1.5px dashed #c9d3de}',
    '.pgn-nav button.is-gjord{background:var(--pg-mint);color:#005042;border:1.5px solid #bfeee5}',
    '.pgn-nav button[aria-current="step"]{background:var(--pg-navy);color:#fff;border:1.5px solid var(--pg-navy)}',
    '.pgn-valfritt{margin:0;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:var(--pg-teal-d)}',
    '.pgn-valfritt em{font-style:normal;background:var(--pg-mint);color:#005042;border-radius:999px;padding:4px 10px;font-size:12px;letter-spacing:.04em;text-transform:uppercase}',
    '.pgn-grupper{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px 18px}',
    '.pgn-grupp{display:flex;flex-direction:column;gap:10px;min-width:0}.pgn-grupp.is-full{grid-column:1/-1}',
    '.pgn-grupp label,.pgn-grupp .pgn-glabel{font-size:15px;font-weight:600;color:var(--pg-gra)}',
    '.pgn-kortgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}',
    '.pgn-kort{font:inherit;text-align:left;cursor:pointer;color:var(--pg-navy);padding:18px 20px;min-height:86px;border-radius:20px;display:flex;flex-direction:column;gap:6px;background:#fff;border:2px solid #dbe2ea;box-shadow:0 8px 20px rgba(11,31,59,.05);transition:transform .15s,border-color .15s}',
    '.pgn-kort b{font-size:20px}.pgn-kort span{font-size:14px;line-height:1.4;color:#4a5668}',
    '.pgn-kort[aria-pressed="true"]{background:var(--pg-navy);border-color:var(--pg-navy);color:#fff}.pgn-kort[aria-pressed="true"] span{color:#cfe9e4}',
    '.pgn-in{width:100%;min-height:52px;padding:12px 16px;border:2px solid var(--pg-linje);border-radius:14px;background:#fff;font:inherit;font-size:17px;color:var(--pg-navy)}',
    'textarea.pgn-in{min-height:140px;resize:vertical;line-height:1.5}',
    '.pgn-bygg{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px;width:100%;max-width:560px}',
    '.pgn-bygg li{display:flex;align-items:center;gap:14px;font-size:19px;background:#fff;border-radius:16px;padding:16px 20px;border:1.5px solid #e1e7ee;animation:pgn-inn .3s ease-out}',
    '.pgn-bock{width:32px;height:32px;border-radius:50%;background:var(--pg-teal);color:var(--pg-navy);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.pgn-prickar{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;gap:3px;flex-shrink:0}',
    '.pgn-prick{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--pg-teal);animation:pgn-puls 1s ease-in-out infinite}',
    '.pgn-prick:nth-child(2){animation-delay:.15s}.pgn-prick:nth-child(3){animation-delay:.3s}',
    '.pgn-prompt{background:#fff;border:2px solid var(--pg-teal);border-radius:24px;padding:26px 28px;box-shadow:0 16px 40px rgba(11,31,59,.08)}',
    '.pgn-prompt pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:17px;line-height:1.65;color:var(--pg-navy)}',
    '.pgn-prompt-topp{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:#5b6573;margin-bottom:12px}',
    '.pgn-ai{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.pgn-ai span{font-size:15px;color:var(--pg-gra);margin-right:4px}',
    '.pgn-ai a{display:inline-flex;align-items:center;font-size:15px;font-weight:600;padding:9px 14px;min-height:42px;border-radius:12px;border:1.5px solid #c9d3de;background:#fff;color:var(--pg-navy);text-decoration:none}',
    '.pgn-ai a:hover{border-color:var(--pg-teal);background:var(--pg-mint)}',
    '.pgn-mini{font-style:normal;font-size:12px;font-weight:700;border-radius:999px;padding:2px 8px;margin-left:6px;background:#eef2f6;color:#5b6573}.pgn-mini.is-med{background:#c9f3ea;color:#005042}',
    '.pgn-gul.is-kopierad{background:var(--pg-mint);color:#005042;box-shadow:none;border:2px solid var(--pg-teal);font-size:18px}',
    '.pgn-nasta{display:flex;flex-direction:column;gap:12px;animation:pgn-inn .35s ease-out}',
    '.pgn .pgn-nasta-rubrik{margin:0;font-weight:700;font-size:20px;color:var(--pg-navy)}.pgn .pgn-nasta-text{margin:0;font-size:15px;color:var(--pg-gra)}',
    '.pgn-nasta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}',
    '.pgn-tj{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:12px 16px;min-height:80px;box-sizing:border-box;border-radius:16px;border:1.5px solid #c9d3de;background:#fff;color:var(--pg-navy);text-decoration:none}',
    '.pgn-tj b{font-size:19px}.pgn-tj:hover{border-color:var(--pg-teal)}',
    '.pgn-tj.is-vanlig{background:var(--pg-gul);border-color:var(--pg-gul);animation:pgn-glow 1.6s ease-in-out infinite}',
    '.pgn-tj-din{font-size:12px;font-weight:700;background:var(--pg-navy);color:var(--pg-gul);border-radius:999px;padding:2px 8px}',
    '.pgn-tj-chip{font-size:13px;font-weight:700;border-radius:999px;padding:4px 10px;white-space:nowrap;background:#eef2f6;color:#5b6573}.pgn-tj-chip.is-med{background:#c9f3ea;color:#005042}',
    '.pgn .pgn-nasta-ok{margin:0;font-size:15px;background:var(--pg-mint);color:#005042;border-radius:12px;padding:10px 14px}',
    '.pgn-bar-ai{gap:8px}.pgn-bar-ai a.pgn-bar{text-decoration:none}',
    '.pgn-bar-mer{pointer-events:auto;font:inherit;font-weight:700;font-size:16px;min-width:58px;min-height:58px;border-radius:999px;border:0;background:var(--pg-navy);color:#fff;cursor:pointer;box-shadow:0 10px 30px rgba(11,31,59,.3)}',
    '@media (max-width:767px){.pgn-nasta-grid{grid-template-columns:1fr 1fr;gap:10px}.pgn-tj{padding:12px;min-height:74px}.pgn-tj b{font-size:17px}.pgn-tj-chip{font-size:11.5px;padding:3px 8px}.pgn .pgn-nasta-rubrik{font-size:19px}}',
    '.pgn-ark-tj{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:17px;padding:14px 16px;min-height:56px;border-radius:14px;border:1.5px solid #dbe2ea;background:#fff;color:var(--pg-navy);text-decoration:none}',
    '.pgn-projekt{display:flex;flex-wrap:wrap;align-items:center;gap:16px 24px;background:var(--pg-mint);border:1.5px solid #bfeee5;border-radius:20px;padding:20px 22px}',
    '.pgn-projekt>div{flex:1 1 340px;min-width:0;display:flex;flex-direction:column;gap:6px}',
    '.pgn-projekt p{margin:0}.pgn-projekt .pgn-p-rubrik{font-size:21px;font-weight:700}.pgn-projekt .pgn-p-text{font-size:16px;line-height:1.5;color:#24433d}',
    '.pgn-projekt a.pgn-p-knapp{font-weight:700;font-size:17px;padding:14px 22px;min-height:52px;display:inline-flex;align-items:center;border-radius:14px;background:var(--pg-teal-d);color:#fff;text-decoration:none;white-space:nowrap}',
    '.pgn-p-val{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.pgn-p-val a{font-size:14px;font-weight:600;color:#005042;border:1.5px solid #bfeee5;background:#fff;border-radius:999px;padding:5px 11px;text-decoration:none}',
    '.pgn-drag{display:flex;flex-direction:column;border-top:1.5px solid #dbe2ea}',
    '.pgn-drag>button{display:flex;justify-content:space-between;align-items:center;font:inherit;font-size:18px;font-weight:600;color:var(--pg-navy);background:none;border:0;border-bottom:1.5px solid #dbe2ea;padding:18px 0;min-height:44px;cursor:pointer;text-align:left}',
    '.pgn-drag>button span:last-child{color:var(--pg-teal-d)}',
    '.pgn-drag-inne{display:flex;flex-direction:column;gap:12px;padding:18px 0;border-bottom:1.5px solid #dbe2ea;font-size:16px;line-height:1.55;color:var(--pg-gra)}',
    '.pgn-drag-inne ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px}',
    '.pgn-apan{display:flex;gap:14px;align-items:flex-start;background:var(--pg-navy);color:#e8edf3;border-radius:20px;padding:20px 22px;font-size:16px;line-height:1.55}',
    '.pgn-apan b{color:#4cd9c1;white-space:nowrap}',
    '.pgn-bar-wrap{position:fixed;left:0;right:0;bottom:20px;display:flex;justify-content:center;padding:0 16px;pointer-events:none;z-index:900}',
    '.pgn-bar{pointer-events:auto;display:flex;align-items:center;gap:16px;font:inherit;font-weight:700;font-size:18px;padding:14px 22px;min-height:60px;border-radius:999px;border:0;cursor:pointer;max-width:100%;background:var(--pg-navy);color:#fff;box-shadow:0 10px 30px rgba(11,31,59,.3);animation:pgn-inn .35s ease-out}',
    '.pgn-bar.is-klar{background:var(--pg-gul);color:var(--pg-navy);animation:pgn-glow 1.6s ease-in-out infinite}',
    '.pgn-bar-mitt{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}',
    '.pgn-bar-spar{display:block;width:200px;max-width:40vw;height:5px;border-radius:5px;background:rgba(255,255,255,.18);overflow:hidden}',
    '.pgn-bar-spar i{display:block;height:5px;border-radius:5px;background:var(--pg-teal);transition:width .4s}',
    '.pgn-bar-hint{font-size:15px;font-weight:600;opacity:.85;white-space:nowrap}',
    '.pgn-bar-hint.pgn-bar-cta{opacity:1;background:var(--pg-gul);color:var(--pg-navy);border-radius:999px;padding:8px 14px;font-weight:700}',
    '.pgn-sr{position:absolute;left:-9999px}',
    '.pgn-sen{display:flex;flex-direction:column;gap:10px;border-top:1.5px solid #dbe2ea;padding-top:22px}',
    '.pgn-sen-topp{display:flex;justify-content:space-between;align-items:center;gap:10px}',
    '.pgn-sen-topp h2{margin:0;font-size:15px!important;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5b6573;line-height:1.3}',
    '.pgn-sen-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
    '.pgn-sen-lista li{background:#fff;border:1.5px solid #e1e7ee;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}',
    '.pgn-sen-rad{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
    '.pgn-sen-text{flex:1 1 260px;min-width:0;font-size:15px;line-height:1.45;color:var(--pg-navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pgn-sen-meta{display:flex;gap:8px;align-items:center;font-size:13px;color:#5b6573;white-space:nowrap}',
    '.pgn-sen-meta em{font-style:normal;background:var(--pg-mint);color:#005042;border-radius:999px;padding:2px 8px;font-weight:600}',
    '.pgn-sen-knappar{display:flex;gap:6px}',
    '.pgn-sen-knappar button,.pgn-sen-mer,.pgn-sen-rensa{font:inherit;font-size:14px;font-weight:600;padding:6px 12px;min-height:36px;border-radius:10px;border:1.5px solid #c9d3de;background:#fff;color:var(--pg-navy);cursor:pointer}',
    '.pgn-sen-knappar button:hover,.pgn-sen-mer:hover{border-color:var(--pg-teal);background:var(--pg-mint)}',
    '.pgn-sen-rensa{border:0;background:none;color:#5b6573;text-decoration:underline;padding:6px 0}',
    '.pgn-sen-rensa.is-saker{color:#b42318}',
    '.pgn-sen-full{margin:0;white-space:pre-wrap;word-wrap:break-word;font:inherit;font-size:14px;line-height:1.55;color:var(--pg-gra);background:#f6f8fa;border-radius:10px;padding:10px 12px;max-height:260px;overflow:auto}',
    '.pgn-gul[aria-disabled="true"]{background:#e6eaef;color:#5b6573;box-shadow:none;cursor:not-allowed}',
    '.pgn-fyll-rakna{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:var(--pg-teal-d);background:var(--pg-mint);border-radius:999px;padding:6px 14px;align-self:flex-start}',
    '.pgn-fyll-rakna.is-klar{background:var(--pg-teal);color:var(--pg-navy)}',
    '.pgn-fyll-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}',
    '.pgn-fyll-falt{display:flex;flex-direction:column;gap:8px;min-width:0}.pgn-fyll-falt.is-full{grid-column:1/-1}',
    '.pgn-fyll-falt label{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:var(--pg-navy)}',
    '.pgn-fyll-falt label i{font-style:normal;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;border:1.5px solid #c9d3de;color:transparent;flex-shrink:0}',
    '.pgn-fyll-falt.is-ifylld label i{background:var(--pg-teal);border-color:var(--pg-teal);color:var(--pg-navy)}',
    '.pgn-fyll-falt.is-fel .pgn-in{border-color:#e0a100;box-shadow:0 0 0 4px rgba(255,210,63,.35)}',
    '.pgn-fyll-falt small{font-size:13px;color:#5b6573}',
    '.pgn-fyll-prev{display:flex;flex-direction:column;gap:8px}',
    '.pgn-fyll-prev>span{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5b6573}',
    '.pgn-fyll-prev pre{margin:0;white-space:pre-wrap;word-wrap:break-word;font:inherit;font-size:15px;line-height:1.6;color:var(--pg-gra);background:#fff;border:1.5px solid #e1e7ee;border-radius:16px;padding:16px 18px;max-height:320px;overflow:auto}',
    '.pgn-fyll-prev mark{background:#fff1bf;color:var(--pg-navy);border-radius:4px;padding:0 3px;font-weight:700}',
    '.pgn-fyll-prev mark.is-ifylld{background:var(--pg-mint);color:#005042}',
    '.pgn-fyll-kvar{font-size:15px;font-weight:600;color:var(--pg-gra)}',
    '.pgn h1[data-fokus]:focus,.pgn h2[data-fokus]:focus{outline:none}',
    /* Live-preview och Justera (2026-10-22) */
    '.pgn-pr{display:block;min-height:1.6em;padding:0 4px;border-radius:6px;overflow-wrap:anywhere;transition:background .6s,color .6s}',
    '.pgn-pr.is-ny{background:#c9f3ea;color:var(--pg-navy)}',
    '@media (min-width:1100px){.pgn.is-bred{max-width:1320px}}',
    '.pgn-optgrid{display:grid;grid-template-columns:minmax(0,1fr);gap:36px;align-items:start}',
    '.pgn-live{display:none}',
    '@media (min-width:1100px){.pgn-optgrid{grid-template-columns:minmax(0,1fr) minmax(380px,440px)}.pgn-live{display:flex;flex-direction:column;gap:10px;position:sticky;top:110px;background:#fff;border:1.5px solid #dbe2ea;border-radius:22px;padding:20px 22px;box-shadow:0 12px 30px rgba(11,31,59,.06);max-height:calc(100vh - 150px);overflow-y:auto;overflow-x:hidden}}',
    '.pgn-live-topp{display:flex;justify-content:space-between;align-items:baseline;gap:8px}',
    '.pgn-live-topp p{margin:0;font-weight:700;font-size:17px}.pgn-live-topp span{font-size:12px;color:#5b6573}',
    '.pgn-live-pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:14.5px;line-height:1.6;color:var(--pg-gra);overflow-x:hidden}',
    '.pgn-live-not{margin:0;font-size:13px;line-height:1.5;color:var(--pg-teal-d);border-top:1px solid #e1e7ee;padding-top:10px}',
    '.pgn-puls{font-size:13px;font-weight:700;background:var(--pg-teal);color:var(--pg-navy);border-radius:999px;padding:4px 10px;white-space:nowrap;animation:pgn-inn .3s ease-out}',
    '.pgn-m{display:none}',
    '@media (max-width:1099px){.pgn-d{display:none}.pgn-m{display:inline}}',
    '.pgn-ark-bak,.pgn-meny-bak{position:fixed;inset:0;background:rgba(11,31,59,.45);border:0;z-index:950;cursor:pointer;padding:0}',
    '.pgn-ark{position:fixed;left:0;right:0;bottom:0;z-index:960;background:#fff;border-radius:22px 22px 0 0;padding:10px 20px 24px;display:flex;flex-direction:column;gap:12px;max-height:82vh;box-shadow:0 -10px 40px rgba(11,31,59,.25);animation:pgn-upp .25s ease-out}',
    '.pgn-ark-grepp{align-self:center;width:44px;height:5px;border-radius:5px;background:#c9d3de}',
    '.pgn-ark-rubrik{margin:0;font-weight:700;font-size:20px}',
    '.pgn-ark .pgn-live-pre{overflow:auto;background:#f6f8fa;border-radius:14px;padding:12px 14px;flex:1 1 auto;min-height:0}',
    '.pgn-ark .pgn-gul,.pgn-ark .pgn-ram{width:100%}',
    '@keyframes pgn-upp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}',
    '.pgn-justera{display:flex;flex-direction:column;gap:12px}',
    '.pgn-justera-rad{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    '.pgn-justera-lbl{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5b6573;margin-right:4px}',
    '.pgn-jknapp{font:inherit;font-size:15px;font-weight:600;padding:9px 14px;min-height:44px;border-radius:999px;cursor:pointer;background:transparent;color:var(--pg-navy);border:1.5px dashed #c9d3de;white-space:nowrap}',
    '.pgn-jknapp span{color:#5b6573;font-weight:500}',
    '.pgn-jknapp.is-satt{background:#fff;border-style:solid}',
    '.pgn-jknapp[aria-expanded="true"]{background:var(--pg-navy);border:1.5px solid var(--pg-navy);color:#fff}.pgn-jknapp[aria-expanded="true"] span{color:#cfe9e4}',
    '.pgn-jknapp:hover{border-color:var(--pg-teal)}',
    '.pgn-jmer{font:inherit;font-size:15px;font-weight:600;color:var(--pg-teal-d);background:none;border:0;cursor:pointer;min-height:44px;padding:0 6px}',
    '.pgn-meny-bak{display:none}.pgn-meny-stang{display:none}',
    '.pgn-meny{background:#fff;border:1.5px solid #dbe2ea;border-radius:18px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 10px 28px rgba(11,31,59,.08);animation:pgn-inn .2s ease-out}',
    '.pgn-meny p{margin:0;font-size:15px;font-weight:600;color:var(--pg-gra)}',
    '.pgn-forslag{background:var(--pg-mint);border:1.5px solid #bfeee5;border-radius:20px;padding:18px 20px;display:flex;flex-direction:column;gap:10px}',
    '.pgn-forslag-rubrik{margin:0;font-weight:700;font-size:18px;color:#005042}',
    '.pgn-forslag-rad{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;background:#fff;border-radius:14px;padding:12px 14px}',
    '.pgn-forslag-rad span{flex:1 1 300px;font-size:15px;line-height:1.5;color:#24433d}',
    '.pgn-forslag-rad button{font:inherit;font-size:14px;font-weight:700;padding:10px 16px;min-height:44px;border-radius:12px;border:0;background:var(--pg-teal-d);color:#fff;cursor:pointer}',
    '@media (max-width:767px){.pgn-justera-rad{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;max-width:100%}.pgn-justera{min-width:0}.pgn-jknapp{flex:0 0 auto;font-size:14px;padding:8px 12px}.pgn-meny-bak{display:block}.pgn-meny{position:fixed;left:0;right:0;bottom:0;z-index:960;border-radius:22px 22px 0 0;max-height:75vh;overflow:auto;padding:18px 20px 28px;box-shadow:0 -10px 40px rgba(11,31,59,.25);animation:pgn-upp .25s ease-out}.pgn-meny .pgn-chips{flex-direction:column}.pgn-meny .pgn-chip{width:100%;min-height:50px}.pgn-meny-stang{display:block;align-self:center}.pgn-forslag-2{display:none!important}}',
    '.pgn-alla-knapp{font:inherit;font-size:14px;font-weight:600;padding:8px 14px;min-height:42px;border-radius:999px;cursor:pointer;background:#fff;color:var(--pg-teal-d);border:1.5px solid #bfeee5;margin-left:auto}',
    '.pgn-alla-knapp:hover{border-color:var(--pg-teal)}',
    '.pgn-alla-topp{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px}',
    '.pgn-alla-sek{display:flex;flex-direction:column;gap:16px;border-top:1.5px solid #dbe2ea;padding-top:22px}',
    '.pgn-alla-sek h3{margin:0;font-size:22px;font-weight:700;color:var(--pg-navy)}',
    '.pgn-red{display:flex;flex-direction:column;gap:10px;background:#fff;border:1.5px solid var(--pg-teal);border-radius:16px;padding:14px 16px}',
    '.pgn-red label{font-size:15px;font-weight:700;color:var(--pg-gra)}',
    '.pgn-red textarea{min-height:110px}',
    '.pgn-red-rad{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}',
    '.pgn-egen{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr) 44px;gap:8px;align-items:center}',
    '.pgn-egen-bort{font:inherit;font-size:16px;width:44px;height:44px;border-radius:12px;border:1.5px solid #c9d3de;background:#fff;color:var(--pg-gra);cursor:pointer}',
    '.pgn-egen-bort:hover{border-color:#b42318;color:#b42318}',
    '.pgn-konfetti{position:fixed;inset:0;pointer-events:none;z-index:1000;overflow:hidden}',
    '.pgn-konfetti i{position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;opacity:.95;animation:pgn-fall 1.6s cubic-bezier(.2,.6,.4,1) forwards}',
    '@keyframes pgn-fall{to{transform:translate3d(var(--dx),105vh,0) rotate(var(--rot));opacity:.9}}',
    '@media (max-width:767px){.pgn-egen{grid-template-columns:minmax(0,1fr) 44px}.pgn-egen input[data-del="varde"]{grid-column:1/2}.pgn-egen-bort{grid-row:1/3;grid-column:2}}',
    '.pgn-kedja{display:flex;flex-direction:column;gap:12px;background:var(--pg-navy);color:#fff;border-radius:22px;padding:18px 22px}',
    '.pgn-kedja-topp{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}',
    '.pgn-kedja-topp a{color:#4cd9c1;font-weight:600;font-size:15px;text-decoration:none}.pgn-kedja-topp a:hover{text-decoration:underline}',
    '.pgn-kedja-topp span{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--pg-gul)}',
    '.pgn-kedja p.pgn-kedja-titel{margin:0;font-size:22px;line-height:1.25;font-weight:700;color:#fff}',
    '.pgn-kedja-prickar{list-style:none;display:flex;gap:6px;margin:0;padding:0;flex-wrap:wrap}',
    '.pgn-kedja-prickar button{width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(255,255,255,.35);background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}',
    '.pgn-kedja-prickar button:hover{border-color:#4cd9c1}.pgn-kedja-prickar button.is-klar{background:#4cd9c1;border-color:#4cd9c1;color:var(--pg-navy)}',
    '.pgn-kedja-prickar button[aria-current="step"]{background:var(--pg-gul);border-color:var(--pg-gul);color:var(--pg-navy);cursor:default}',
    '.pgn-kedja-nav{display:flex;gap:10px;flex-wrap:wrap}',
    '.pgn-kedja-nav button,.pgn-kedja-nav a{font:inherit;font-size:15px;font-weight:600;border-radius:12px;padding:10px 16px;min-height:44px;cursor:pointer;border:1.5px solid rgba(255,255,255,.35);background:transparent;color:#fff;text-align:left;text-decoration:none;display:inline-flex;align-items:center;max-width:100%}',
    '.pgn-kedja-nav button:hover{border-color:#4cd9c1}.pgn-kedja-nav .is-primar{background:var(--pg-gul);border-color:var(--pg-gul);color:var(--pg-navy)}',
    '.pgn-kedja button:disabled{opacity:.5;cursor:wait}',
    '.pgn-svar{display:flex;flex-direction:column;gap:10px;background:#fff;border:2px solid var(--pg-teal);border-radius:20px;padding:20px 22px}',
    '.pgn-svar p{margin:0}.pgn-svar .pgn-svar-rubrik{font-size:20px;font-weight:700}.pgn-svar .pgn-svar-hjalp{font-size:15px;line-height:1.5;color:var(--pg-gra)}',
    '.pgn-svar-sparat{font-size:14px;font-weight:600;color:var(--pg-teal-d);min-height:1.2em}',
    '.pgn-svar .pgn-mork{align-self:flex-start;text-decoration:none;display:inline-flex;align-items:center}',
    '.pgn-fyll-falt small.is-svar{color:var(--pg-teal-d);font-weight:600}',
    '@keyframes pgn-puls{0%,100%{opacity:.3}50%{opacity:1}}',
    '@keyframes pgn-inn{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}',
    '@keyframes pgn-glow{0%,100%{box-shadow:0 10px 30px rgba(11,31,59,.25),0 0 0 0 rgba(0,201,167,.55)}50%{box-shadow:0 10px 30px rgba(11,31,59,.25),0 0 0 12px rgba(0,201,167,0)}}',
    '@media (prefers-reduced-motion:reduce){[data-pgny] *{animation:none!important;transition:none!important}}',
    '@media (max-width:767px){.pgn-kedja{padding:16px;border-radius:18px}.pgn-kedja p.pgn-kedja-titel{font-size:19px}.pgn-kedja-nav>*{flex:1 1 100%;justify-content:center}.pgn{gap:24px}.pgn-ta{font-size:18px;min-height:170px;padding:18px}.pgn-ingress{font-size:17px}.pgn-gul{width:100%;font-size:19px}.pgn-kortgrid{grid-template-columns:1fr 1fr}.pgn-kort{min-height:76px;padding:14px}.pgn-kort b{font-size:17px}.pgn-stegrad li span{display:none}.pgn-stegrad li{padding:6px}.pgn-bar{font-size:16px;padding:12px 18px;gap:12px}.pgn-bar-spar{width:120px}.pgn-prompt{padding:18px}.pgn-prompt pre{font-size:15px}.pgn-apan{flex-direction:column;gap:6px}}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  /* ── Hjälpare ── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function typNamn() { var t = TYPER.filter(function (x) { return x.id === (S.typ || 'skriva'); })[0]; return t ? t.namn : 'Skriva text'; }
  function lista() { return stegFor(S.typ || gissaTyp(S.text)); }
  function harSvar(g) { if (g.typ === 'egna') return egnaRader(S.svar).length > 0; var x = S.svar[g.key]; return Array.isArray(x) ? x.length > 0 : !!x; }
  function stegGjort(o) { return o.grupper.some(harSvar); }
  function sammanfatta(o) {
    var d = [];
    o.grupper.forEach(function (g) { if (g.typ === 'egna') { var n = egnaRader(S.svar).length; if (n) d.push(n + (n === 1 ? ' eget fält' : ' egna fält')); return; } var x = S.svar[g.key]; if (Array.isArray(x)) { if (x.length) d.push(x.length === 1 ? x[0] : x.length + ' val'); } else if (x) d.push(x.length > 24 ? x.slice(0, 24) + '…' : x); });
    return d.join(', ');
  }
  var BOCK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"></path></svg>';
  var PRICKAR = '<span class="pgn-prickar" aria-hidden="true"><span class="pgn-prick"></span><span class="pgn-prick"></span><span class="pgn-prick"></span></span>';

  /* Projektmall-förslag (samma mappning som projekt-puff.js) */
  var PAKET = [
    { slug: 'saljassistenten', namn: 'Säljassistenten' }, { slug: 'smaforetagets-ai-avdelning', namn: 'Småföretagets AI-avdelning' },
    { slug: 'innehallsmaskinen', namn: 'Innehållsmaskinen' }, { slug: 'kundtjanst-for-webbshopen', namn: 'Kundtjänst för webbshopen' },
    { slug: 'klientassistenten', namn: 'Klientassistenten' }
  ];
  var ROLL_PAKET = { 'Säljare': 'saljassistenten', 'Copywriter': 'innehallsmaskinen', 'Marknadsförare': 'innehallsmaskinen', 'SEO-expert': 'innehallsmaskinen', 'Coach': 'klientassistenten' };
  function foreslagetPaket() {
    var s = ROLL_PAKET[S.svar.roll];
    if (!s && /klient|coach|konsult|rådgivning|rådgivare/i.test(S.text)) s = 'klientassistenten';
    if (!s && /kundtjänst|reklamation|retur|kundmejl|kundservice/i.test(S.text)) s = 'kundtjanst-for-webbshopen';
    if (!s && /linkedin|instagram|inlägg|nyhetsbrev|sociala/i.test(S.text)) s = 'innehallsmaskinen';
    if (!s && /offert|sälj|prospekt|kundmöte|invändning/i.test(S.text)) s = 'saljassistenten';
    if (!s && S.svar.foretag) s = 'smaforetagets-ai-avdelning';
    return PAKET.filter(function (p) { return p.slug === s; })[0] || null;
  }

  /* ── Rendering ── */
  function stegrad() {
    if (S.steg === 'laddar') return '';
    var medFyll = S.steg !== 'start' && phParse(S.text).length > 0;
    var idx = medFyll ? { start: 0, fyll: 1, opt: 2, bygger: 3, klar: 3 }[S.steg] : { start: 0, opt: 1, bygger: 2, klar: 2 }[S.steg];
    var namn = medFyll ? ['Uppgift', 'Fyll i', 'Finjustera · valfritt', 'Din prompt'] : ['Uppgift', 'Finjustera · valfritt', 'Din prompt'];
    return '<ol class="pgn-stegrad" aria-label="Var du är">' + namn.map(function (n, i) {
      var cls = i === idx ? 'is-aktiv' : i < idx ? 'is-klar' : '';
      return '<li class="' + cls + '"' + (i === idx ? ' aria-current="step"' : '') + '><i>' + (i < idx ? '✓' : (i + 1)) + '</i><span>' + n + '</span></li>';
    }).join('') + '</ol>';
  }

  function senasteHtml() {
    var l = lasSenaste();
    if (!l.length) return '';
    var visa = S.senAlla ? l : l.slice(0, 3);
    return '<section class="pgn-sen" aria-labelledby="pgn-sen-rubrik"><div class="pgn-sen-topp"><h2 id="pgn-sen-rubrik">Senaste prompter</h2>' +
      '<button type="button" class="pgn-sen-rensa' + (S.senRensa ? ' is-saker' : '') + '" data-senrensa>' + (S.senRensa ? 'Säker? Klicka igen för att rensa' : 'Rensa') + '</button></div>' +
      '<ul class="pgn-sen-lista">' + visa.map(function (p, i) {
        var etikett = TYP_ETIKETT[p.tasktype] || '';
        return '<li><div class="pgn-sen-rad"><span class="pgn-sen-text" title="' + esc(p.preview || '') + '">' + esc(p.preview || p.text.slice(0, 90)) + '</span>' +
          '<span class="pgn-sen-meta">' + (etikett ? '<em>' + esc(etikett) + '</em>' : '') + esc(relTid(p.created)) + '</span>' +
          '<span class="pgn-sen-knappar"><button type="button" data-senvisa="' + i + '" aria-expanded="' + (S.senVisa === i) + '">' + (S.senVisa === i ? 'Dölj' : 'Visa') + '</button>' +
          '<button type="button" data-senoppna="' + i + '">Använd igen</button>' +
          '<button type="button" data-senkopiera="' + i + '">Kopiera</button></span></div>' +
          (S.senVisa === i ? '<pre class="pgn-sen-full">' + esc(p.text) + '</pre>' : '') + '</li>';
      }).join('') + '</ul>' +
      (l.length > 3 ? '<div><button type="button" class="pgn-sen-mer" data-senalla>' + (S.senAlla ? 'Visa färre' : 'Visa alla ' + l.length) + '</button></div>' : '') +
    '</section>';
  }

  /* ── Sparade prompter (★ i biblioteket och på promptsidan, aimonkey_fav_prompts) ── */
  function lasFavoriter() { var l = las('aimonkey_fav_prompts', []); return Array.isArray(l) ? l.filter(function (f) { return f && f.slug; }) : []; }
  function sparadeHtml() {
    var l = lasFavoriter();
    if (!l.length) return '';
    var visa = S.favAlla ? l : l.slice(0, 6);
    return '<section class="pgn-sen" aria-labelledby="pgn-fav-rubrik"><div class="pgn-sen-topp"><h2 id="pgn-fav-rubrik">Dina sparade prompter</h2>' +
      '<a class="pgn-lank" href="/promptbiblioteket?flik=mina">Mina prompter i biblioteket →</a></div>' +
      '<div class="pgn-chips">' + visa.map(function (f) {
        return '<button type="button" class="pgn-chip" data-favoppna="' + esc(f.slug) + '"><span aria-hidden="true" style="color:#e0b100">★</span> ' + esc(f.namn || f.slug) + '</button>';
      }).join('') + '</div>' +
      (l.length > 6 ? '<div><button type="button" class="pgn-sen-mer" data-favalla>' + (S.favAlla ? 'Visa färre' : 'Visa alla ' + l.length) + '</button></div>' : '') +
    '</section>';
  }

  function vyStart() {
    return '<section class="pgn-sek">' +
      '<div class="pgn-rubrik"><h1 tabindex="-1" data-fokus>Vad vill du ha hjälp med?</h1>' +
      '<p class="pgn-ingress">Skriv som du skulle förklara för en kollega. Apan bygger resten.</p></div>' +
      '<label for="pgn-uppgift" class="pgn-sr">Din uppgift</label>' +
      '<textarea id="pgn-uppgift" class="pgn-ta" data-text placeholder="Skriv fritt, eller sök: mejl, offert, recension, LinkedIn …">' + esc(S.text) + '</textarea>' +
      '<div data-traffar></div>' +
      '<div class="pgn-ex"><p data-exrubrik>Eller välj ett exempel</p><div class="pgn-chips">' +
        EXEMPEL.map(function (e, i) { return '<button type="button" class="pgn-chip" data-exempel="' + i + '">' + esc(e) + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="pgn-rad"><button type="button" class="pgn-gul" data-bygg>Bygg min prompt →</button>' +
      '<span class="pgn-not">Gratis, ingen inloggning. Allt efter det här är valfritt.</span></div>' +
      sparadeHtml() + senasteHtml() +
    '</section>';
  }

  function traffarHtml() {
    var q = S.text.trim();
    if (q.length < 3 || q.length > 140) return '';
    var t = sok(q);
    if (!t.length) return '';
    return '<div class="pgn-traff"><div class="pgn-traff-topp"><p>Det finns färdiga mallar för det här</p><span>Hoppar över stegen, allt är ifyllt</span></div>' +
      '<div class="pgn-traff-grid">' + t.map(function (p, i) {
        return '<button type="button" class="pgn-mall" data-mall="' + i + '"><small>' + esc(p.cat || 'Prompt') + '</small><b>' + esc(p.namn) + '</b>' + (p.desc ? '<span>' + esc(p.desc.length > 90 ? p.desc.slice(0, 90) + '…' : p.desc) + '</span>' : '') + '</button>';
      }).join('') + '</div><a class="pgn-lank" href="/promptbiblioteket">Se alla färdiga prompter och mallar →</a></div>';
  }
  var senasteTraffar = [];
  function ritaTraffar() {
    var box = root.querySelector('[data-traffar]');
    if (!box) return;
    var q = S.text.trim();
    senasteTraffar = (q.length >= 3 && q.length <= 140) ? sok(q) : [];
    box.innerHTML = traffarHtml();
    var r = root.querySelector('[data-exrubrik]');
    if (r) r.textContent = senasteTraffar.length ? 'Eller börja från ett exempel' : 'Eller välj ett exempel';
  }

  function uppgBoxHtml() {
    return '<div class="pgn-uppg"><div class="pgn-uppg-rad"><strong>Din uppgift:</strong><span class="pgn-uppg-text">' + esc(S.mallNamn || applyFills(S.text)) + '</span>' +
      '<button type="button" class="pgn-typ" data-typvaxla aria-expanded="' + (S.typOppen ? 'true' : 'false') + '">Typ: ' + esc(typNamn()) + ' ▾</button>' +
      '<button type="button" class="pgn-andra" data-tillstart>Ändra</button></div>' +
      (S.typOppen ? '<div class="pgn-chips">' + TYPER.map(function (t) { return '<button type="button" class="pgn-chip" data-typ="' + t.id + '" aria-pressed="' + (t.id === S.typ) + '">' + t.namn + '</button>'; }).join('') + '</div>' : '') +
    '</div>';
  }
  function vyOpt() {
    var L = lista(), o = L[Math.min(S.optIdx, L.length - 1)], sista = S.optIdx >= L.length - 1;
    if (S.alla) return vyAlla(L);
    var h = '<section class="pgn-sek">' + uppgBoxHtml();
    h += '<nav class="pgn-nav" aria-label="Valfria steg"><span>Valfria steg</span>' + L.map(function (x, i) {
      var akt = i === S.optIdx, gj = stegGjort(x);
      return '<button type="button" data-gaopt="' + i + '"' + (akt ? ' aria-current="step"' : '') + ' class="' + (gj ? 'is-gjord' : '') + '">' + (gj && !akt ? '✓ ' : '') + x.kort + '</button>';
    }).join('') + '<button type="button" class="pgn-alla-knapp" data-alla>Visa alla inställningar</button></nav>';
    h += '<div class="pgn-rubrik"><p class="pgn-valfritt"><em>Valfritt</em>Steg ' + (S.optIdx + 1) + ' av ' + L.length + ' · hoppa över när du vill</p>' +
      '<h2 class="pgn-h1" tabindex="-1" data-fokus>' + esc(o.titel) + '</h2><p class="pgn-ingress">' + esc(o.hjalp) + '</p></div>';
    h += grupperHtml(o);
    h += '<div class="pgn-rad"><button type="button" class="' + (sista ? 'pgn-gul' : 'pgn-mork') + '" data-nasta>' + (sista ? 'Bygg prompten →' : 'Nästa →') + '</button>' +
      '<button type="button" class="pgn-text-knapp" data-hoppa>' + (sista ? 'Hoppa över' : 'Hoppa över det här steget') + '</button></div>';
    return '<div class="pgn-optgrid">' + h + '</section>' + liveHtml() + '</div>';
  }
  /* Alla inställningar i en sammanhängande vy (för den som vill ha kontroll) */
  function vyAlla(L) {
    var h = '<section class="pgn-sek">' + uppgBoxHtml();
    h += '<div class="pgn-alla-topp"><div class="pgn-rubrik"><p class="pgn-valfritt"><em>Valfritt</em>Allt på en gång · fyll i det du vill</p>' +
      '<h2 class="pgn-h1" tabindex="-1" data-fokus>Alla inställningar</h2></div>' +
      '<button type="button" class="pgn-alla-knapp" data-alla>Ett steg i taget</button></div>';
    L.forEach(function (o) {
      h += '<div class="pgn-alla-sek"><h3>' + esc(o.titel) + '</h3>' + grupperHtml(o) + '</div>';
    });
    h += '<div class="pgn-rad"><button type="button" class="pgn-gul" data-allaklar>Bygg prompten →</button></div>';
    return '<div class="pgn-optgrid">' + h + '</section>' + liveHtml() + '</div>';
  }
  function grupperHtml(o) {
    return '<div class="pgn-grupper">' + o.grupper.map(function (g) {
      var t = g.typ || 'val', x = S.svar[g.key], full = g.full || g.stor;
      var inner = '';
      if (t === 'val' || t === 'multi') {
        inner = (g.label ? '<span class="pgn-glabel">' + esc(g.label) + '</span>' : '') +
          '<div class="' + (g.stor ? 'pgn-kortgrid' : 'pgn-chips') + '" role="group"' + (g.label ? ' aria-label="' + esc(g.label) + '"' : '') + '>' + g.val.map(function (v) {
            var vald = t === 'multi' ? (Array.isArray(x) && x.indexOf(v.text) !== -1) : x === v.text;
            if (g.stor) return '<button type="button" class="pgn-kort" data-val="' + esc(g.key) + '" data-v="' + esc(v.text) + '" aria-pressed="' + vald + '"><b>' + esc(v.text) + '</b>' + (v.sub ? '<span>' + esc(v.sub) + '</span>' : '') + '</button>';
            return '<button type="button" class="pgn-chip" data-' + (t === 'multi' ? 'multi' : 'val') + '="' + esc(g.key) + '" data-v="' + esc(v.text) + '" aria-pressed="' + vald + '">' + (t === 'multi' ? (vald ? '✓ ' : '+ ') : '') + esc(v.text) + '</button>';
          }).join('') + '</div>';
      } else if (t === 'egna') {
        var rader = Array.isArray(x) && x.length ? x : [];
        inner = '<span class="pgn-glabel">' + esc(g.label) + '</span>' + rader.map(function (r, i) {
          return '<div class="pgn-egen"><label class="pgn-sr" for="pgn-egen-n' + i + '">Namn på fält ' + (i + 1) + '</label><input id="pgn-egen-n' + i + '" class="pgn-in" data-egen="' + i + '" data-del="namn" placeholder="Namn, t.ex. Deadline" value="' + esc(r.namn || '') + '">' +
            '<label class="pgn-sr" for="pgn-egen-v' + i + '">Värde för fält ' + (i + 1) + '</label><input id="pgn-egen-v' + i + '" class="pgn-in" data-egen="' + i + '" data-del="varde" placeholder="T.ex. fredag 24 oktober" value="' + esc(r.varde || '') + '">' +
            '<button type="button" class="pgn-egen-bort" data-egenbort="' + i + '" aria-label="Ta bort fält ' + (i + 1) + '">✕</button></div>';
        }).join('') + '<div><button type="button" class="pgn-chip" data-egenny>+ Lägg till eget fält</button></div>';
      } else {
        var id = 'pgn-f-' + g.key;
        inner = '<label for="' + id + '">' + esc(g.label) + '</label>' + (t === 'lang'
          ? '<textarea id="' + id + '" class="pgn-in" data-falt="' + g.key + '" placeholder="' + esc(g.ph) + '">' + esc(x || '') + '</textarea>'
          : '<input id="' + id + '" class="pgn-in" data-falt="' + g.key + '" placeholder="' + esc(g.ph) + '" value="' + esc(x || '') + '">');
      }
      return '<div class="pgn-grupp' + (full ? ' is-full' : '') + '">' + inner + '</div>';
    }).join('') + '</div>';
  }

  function fyllPrevHtml(L) {
    var keys = {}; L.forEach(function (t) { keys[t.key] = true; });
    var text = S.text, re = new RegExp(PH_SRC, 'g'), m, ut = '', last = 0;
    while ((m = re.exec(text))) {
      ut += esc(text.slice(last, m.index));
      var v = keys[m[1]] ? fylltVarde(m[1]) : '';
      ut += keys[m[1]] ? (v ? '<mark class="is-ifylld">' + esc(v) + '</mark>' : '<mark>' + esc(m[0]) + '</mark>') : esc(m[0]);
      last = re.lastIndex;
    }
    return ut + esc(text.slice(last));
  }
  function fyllStatus(L) {
    var kvar = L.filter(function (t) { return !fylltVarde(t.key); }).length;
    return { kvar: kvar, klar: L.length - kvar, alla: L.length };
  }
  function vyFyll() {
    var L = phParse(S.text), st = fyllStatus(L), tillKlarVy = S.efterFyll === 'klar';
    var h = '<section class="pgn-sek">';
    /* I kedjeläget visar stegraden redan vilket steg det är */
    if (!K) h += '<div class="pgn-uppg"><div class="pgn-uppg-rad"><strong>' + (S.mallNamn ? 'Mall:' : 'Din uppgift:') + '</strong><span class="pgn-uppg-text">' + esc(S.mallNamn || S.text) + '</span>' +
      '<button type="button" class="pgn-andra" data-tillstart>Ändra</button></div></div>';
    h += '<div class="pgn-rubrik"><h1 tabindex="-1" data-fokus>Fyll i det som är ditt</h1>' +
      '<p class="pgn-ingress">Det är de här luckorna som gör prompten till din. Står det kvar [NAMN] i prompten blir svaret lika generiskt. Prompten blir klar när allt är ifyllt.</p>' +
      '<span class="pgn-fyll-rakna' + (st.kvar ? '' : ' is-klar') + '" data-fyllrakna aria-live="polite">' + st.klar + ' av ' + st.alla + ' ifyllda</span></div>';
    h += '<div class="pgn-fyll-grid">' + L.map(function (t, i) {
      var id = 'pgn-ph-' + i, v = S.fyll[t.key] || '', ok = !!fylltVarde(t.key), fel = S.fyllVisaFel && !ok;
      return '<div class="pgn-fyll-falt' + (t.multi ? ' is-full' : '') + (ok ? ' is-ifylld' : '') + (fel ? ' is-fel' : '') + '" data-phfalt="' + i + '">' +
        '<label for="' + id + '"><i aria-hidden="true">✓</i>' + esc(t.label) + '</label>' +
        (t.multi ? '<textarea id="' + id + '" class="pgn-in" data-ph="' + i + '" placeholder="' + esc(t.hint) + '" required>' + esc(v) + '</textarea>'
                 : '<input id="' + id + '" class="pgn-in" data-ph="' + i + '" placeholder="' + esc(t.hint) + '" value="' + esc(v) + '" required>') +
        (ok && S.forifyllt[t.key] === 'svar' ? '<small class="is-svar">✓ Hämtat från ditt sparade svar. Kolla gärna att det stämmer.</small>'
          : ok && S.forifyllt[t.key] === 'mall' ? '<small>Ifyllt i ett tidigare steg. Ändra om det behövs.</small>'
          : ok && S.forifyllt[t.key] ? '<small>Ifyllt från förra gången. Ändra om det behövs.</small>'
          : !ok && K && arSvarNyckel(t.key) ? '<small>Klistra in AI:ns svar här. Tips: spara svaret i rutan under prompten i förra steget, så fylls det i av sig självt.</small>' : '') + '</div>';
    }).join('') + '</div>';
    h += '<div class="pgn-rad"><button type="button" class="pgn-gul" data-fyllklar aria-disabled="' + (st.kvar ? 'true' : 'false') + '">' + (tillKlarVy ? 'Uppdatera prompten →' : S.efterFyll === 'opt' ? 'Vidare →' : 'Bygg prompten →') + '</button>' +
      '<span class="pgn-fyll-kvar" data-fyllkvar>' + (st.kvar ? 'Fyll i ' + st.kvar + ' fält till' : 'Allt ifyllt!') + '</span></div>';
    h += '<div class="pgn-fyll-prev"><span>Så ser prompten ut</span><pre data-fyllprev>' + fyllPrevHtml(L) + '</pre></div>';
    return h + '</section>';
  }
  /* Uppdatera räknare, förhandsvisning och knapp utan att rita om (fokus kvar) */
  function uppdateraFyll() {
    var L = phParse(S.text), st = fyllStatus(L);
    var r = root.querySelector('[data-fyllrakna]'); if (r) { r.textContent = st.klar + ' av ' + st.alla + ' ifyllda'; r.classList.toggle('is-klar', !st.kvar); }
    var k = root.querySelector('[data-fyllkvar]'); if (k) k.textContent = st.kvar ? 'Fyll i ' + st.kvar + ' fält till' : 'Allt ifyllt!';
    var b = root.querySelector('[data-fyllklar]'); if (b) b.setAttribute('aria-disabled', st.kvar ? 'true' : 'false');
    var p = root.querySelector('[data-fyllprev]'); if (p) p.innerHTML = fyllPrevHtml(L);
    [].forEach.call(root.querySelectorAll('[data-phfalt]'), function (f) {
      var t = L[+f.getAttribute('data-phfalt')]; if (!t) return;
      var ok = !!fylltVarde(t.key); f.classList.toggle('is-ifylld', ok); if (ok) f.classList.remove('is-fel');
    });
    var bar = root.querySelector('[data-bar]');
    if (bar) {
      var s1 = bar.querySelector('.pgn-bar-mitt>span'); if (s1) s1.textContent = barFyllText(st);
      var i1 = bar.querySelector('.pgn-bar-spar i'); if (i1) i1.style.width = barFyllPct(st) + '%';
      var h1 = bar.querySelector('.pgn-bar-hint'); if (h1) h1.textContent = st.kvar ? 'Visa →' : 'Fortsätt →';
    }
  }
  function barFyllText(st) { return st.kvar ? 'Fyll i ' + st.kvar + ' fält till …' : 'Allt ifyllt, fortsätt'; }
  function barFyllPct(st) { return Math.round(10 + 50 * st.klar / Math.max(1, st.alla)); }

  /* ── Live-preview: rader som ändrats lyser grönt en stund ── */
  var pulsTimer = null;
  function snap() { if (S.steg === 'opt' || S.steg === 'klar') S._fore = byggPrompt(S); }
  function efterAndring() {
    if (S._fore == null) return;
    var fore = S._fore.split('\n'), nu = byggPrompt(S).split('\n'), antal = {};
    S._fore = null;
    fore.forEach(function (l) { antal[l] = (antal[l] || 0) + 1; });
    var nya = nu.filter(function (l) { if (!l.trim()) return false; if (antal[l]) { antal[l]--; return false; } return true; });
    if (!nya.length) return;
    S.nya = { rader: nya, till: Date.now() + 1600 }; S.puls = nya.length;
    clearTimeout(pulsTimer);
    pulsTimer = setTimeout(function () {
      S.nya = null; S.puls = 0;
      [].forEach.call(root.querySelectorAll('.pgn-pr.is-ny'), function (e) { e.classList.remove('is-ny'); });
      var pp = root.querySelector('[data-puls]'); if (pp) pp.parentNode.removeChild(pp);
    }, snabb ? 600 : 1600);
  }
  function radHtml(text) {
    var nya = S.nya && Date.now() < S.nya.till ? S.nya.rader.slice() : [];
    return text.split('\n').map(function (l) {
      var i = l.trim() ? nya.indexOf(l) : -1; if (i > -1) nya.splice(i, 1);
      return '<span class="pgn-pr' + (i > -1 ? ' is-ny' : '') + '">' + (l ? esc(l) : ' ') + '</span>';
    }).join('');
  }
  function liveHtml() {
    var pr = byggPrompt(S);
    return '<aside class="pgn-live" aria-label="Din prompt just nu"><div class="pgn-live-topp"><p>Din prompt just nu</p><span data-livetecken>' + pr.length + ' tecken</span></div>' +
      '<pre class="pgn-live-pre" data-live>' + radHtml(pr) + '</pre><p class="pgn-live-not">Grönt = det ditt senaste val lade till.</p></aside>';
  }
  /* Vid skrivande i fält: uppdatera bara spalten/panelen och knappen, så att fokus finns kvar */
  function ritaLive() {
    efterAndring();
    var pr = byggPrompt(S);
    [].forEach.call(root.querySelectorAll('[data-live]'), function (e) { e.innerHTML = radHtml(pr); });
    var t = root.querySelector('[data-livetecken]'); if (t) t.textContent = pr.length + ' tecken';
    var bar = root.querySelector('[data-bar]');
    if (bar && S.puls && !bar.querySelector('[data-puls]')) { var sp = document.createElement('span'); sp.className = 'pgn-puls'; sp.setAttribute('data-puls', ''); sp.textContent = '+' + S.puls + (S.puls === 1 ? ' rad' : ' rader'); var h = bar.querySelector('.pgn-bar-hint'); bar.insertBefore(sp, h); }
  }
  function arkHtml() {
    if (S.ark !== 'prompt' || S.steg !== 'opt') return '';
    return '<button type="button" class="pgn-ark-bak" data-arkstang aria-label="Stäng"></button>' +
      '<div class="pgn-ark" role="dialog" aria-label="Din prompt just nu"><span class="pgn-ark-grepp" aria-hidden="true"></span><p class="pgn-ark-rubrik">Din prompt just nu</p>' +
      '<pre class="pgn-live-pre" data-live>' + radHtml(byggPrompt(S)) + '</pre>' +
      '<button type="button" class="pgn-gul" data-arkklar>Klar, visa min prompt →</button><button type="button" class="pgn-ram" data-arkstang>Tillbaka till valen</button></div>';
  }

  /* ── Justera på resultatsidan ── */
  var JLISTA = { text: ['malgrupp', 'ton', 'roll', 'langd', 'format'], bild: ['bstil', 'bformat', 'bljus'], video: ['vstil', 'vformat', 'vkamera'], kod: ['ksprak', 'khjalp', 'ksvar'] };
  var JNAMN = { malgrupp: 'Läsare', ton: 'Ton', roll: 'Roll', langd: 'Längd', format: 'Format', bstil: 'Stil', bformat: 'Format', bljus: 'Ljus', vstil: 'Stil', vformat: 'Format', vkamera: 'Rörelse', ksprak: 'Språk', khjalp: 'Hjälp', ksvar: 'Svar' };
  var JTOM = { roll: 'Standard', format: 'Text' };
  var JRUBRIK = { langd: 'Hur långt ska svaret vara?', format: 'Hur ska svaret se ut?' };
  function jListaFor() { var t = S.typ || 'skriva'; return JLISTA[t] || JLISTA.text; }
  function jGrupp(key) { var r = null; stegFor(S.typ || 'skriva').forEach(function (o) { o.grupper.forEach(function (g) { if (g.key === key) r = { g: g, o: o }; }); }); return r; }
  function jVarde(key) { if (key === 'roll') return S.svar.rollEgen || S.svar.roll || ''; if (key === 'malgrupp') return S.svar.malgrupp || S.svar.malgruppEgen || ''; return S.svar[key] || ''; }
  function justeraHtml() {
    var ph = phParse(S.text).length;
    var h = '<div class="pgn-justera"><div class="pgn-justera-rad" role="group" aria-label="Justera prompten"><span class="pgn-justera-lbl">Justera</span>';
    jListaFor().forEach(function (k) {
      if (!jGrupp(k)) return;
      var v = jVarde(k), oppen = S.justera === k;
      h += '<button type="button" class="pgn-jknapp' + (v ? ' is-satt' : '') + '" data-justera="' + k + '" aria-expanded="' + oppen + '"><span>' + JNAMN[k] + ':</span> ' + esc(v ? (v.length > 22 ? v.slice(0, 22) + '…' : v) : (JTOM[k] || 'Välj')) + ' ▾</button>';
    });
    h += '<button type="button" class="pgn-jknapp is-satt" data-justera="typ" aria-expanded="' + (S.justera === 'typ') + '"><span>Typ:</span> ' + esc(typNamn()) + ' ▾</button>';
    if (ph) h += '<button type="button" class="pgn-jknapp is-satt" data-tillfyll><span>Ifyllt:</span> ' + ph + ' fält</button>';
    h += '<button type="button" class="pgn-jmer" data-fler>Fler val →</button></div>';
    if (S.justera) {
      var rubrik, alt;
      if (S.justera === 'typ') {
        rubrik = 'Vad ska prompten göra?';
        alt = TYPER.map(function (t) { return '<button type="button" class="pgn-chip" data-jtyp="' + t.id + '" aria-pressed="' + (t.id === (S.typ || 'skriva')) + '">' + t.namn + '</button>'; }).join('');
      } else {
        var jg = jGrupp(S.justera), v0 = jVarde(S.justera);
        rubrik = JRUBRIK[S.justera] || (jg ? jg.o.titel : '');
        alt = jg ? jg.g.val.map(function (o) { var vald = v0 === o.text; return '<button type="button" class="pgn-chip" data-jval="' + esc(o.text) + '" aria-pressed="' + vald + '">' + (vald ? '✓ ' : '') + esc(o.text) + '</button>'; }).join('') : '';
      }
      h += '<button type="button" class="pgn-meny-bak" data-jstang aria-label="Stäng"></button><div class="pgn-meny" role="group" aria-label="' + esc(rubrik) + '"><p>' + esc(rubrik) + '</p><div class="pgn-chips">' + alt + '</div><button type="button" class="pgn-text-knapp pgn-meny-stang" data-jstang>Stäng</button></div>';
    }
    return h + '</div>';
  }
  function jSatt(key, v) {
    var cur = jVarde(key), nytt = cur === v ? '' : v;
    if (key === 'roll') { S.svar.rollEgen = ''; S.svar.roll = nytt; }
    else if (key === 'malgrupp') { S.svar.malgruppEgen = ''; S.svar.malgrupp = nytt; }
    else S.svar[key] = nytt;
  }
  /* "Apan föreslår": högst två saker som saknas, med ett klick */
  function forslagLista() {
    var t = S.typ || 'skriva', x = S.svar, rg = Array.isArray(x.regler) ? x.regler : [], f = [];
    if (t === 'bild') { if (!S.raw && !arBildMall(applyFills(S.text || '').trim()) && bildMotivOrd(applyFills(S.text || '')) < 5) f.push({ id: 'motiv', text: 'Beskriv vad som ska synas: vem eller vad, var och vilken känsla. Ju mer konkret, desto närmare bilden du ser framför dig.', knapp: 'Beskriv bilden' }); if (!x.bstil) f.push({ id: 'bstil', text: 'Välj stil. Foto, illustration eller 3D ger helt olika bilder.', knapp: 'Välj stil' }); if (!x.bformat) f.push({ id: 'bformat', text: 'Välj format, så blir bilden rätt till där den ska användas.', knapp: 'Välj format' }); if (!x.bljus) f.push({ id: 'bljus', text: 'Ljuset gör mycket för känslan i bilden.', knapp: 'Välj ljus' }); }
    else if (t === 'video') { if (!S.raw && !arBildMall(applyFills(S.text || '').trim()) && videoMotivOrd(applyFills(S.text || '')) < 5) f.push({ id: 'motiv', text: 'Beskriv vad som ska hända: vem eller vad, var och vad som rör sig. Ju mer konkret, desto bättre video.', knapp: 'Beskriv videon' }); if (!x.vformat) f.push({ id: 'vformat', text: 'Välj format, liggande eller stående.', knapp: 'Välj format' }); if (!x.vkamera) f.push({ id: 'vkamera', text: 'Säg hur kameran ska röra sig, så känns videon genomtänkt.', knapp: 'Välj rörelse' }); }
    else if (t === 'kod') { if (!x.ksprak) f.push({ id: 'ksprak', text: 'Säg vilket språk koden ska vara i, så slipper AI:n gissa.', knapp: 'Välj språk' }); if (!x.ksvar) f.push({ id: 'ksvar', text: 'Vill du ha bara kod, eller kod med förklaring?', knapp: 'Välj svar' }); }
    else {
      if (!x.malgrupp && !x.malgruppEgen) f.push({ id: 'malgrupp', text: 'Du har inte sagt vem som ska läsa. Då vet AI:n vilka ord och vilken nivå som passar.', knapp: 'Välj läsare' });
      if ((t === 'skriva' || t === 'brainstorma') && rg.indexOf('Ge tre alternativ') === -1) f.push({ id: 'tre', text: 'Be om tre varianter, så väljer du den som låter mest som du.', knapp: 'Lägg till' });
      if (rg.indexOf('Ställ frågor om något är oklart') === -1) f.push({ id: 'fragor', text: 'Låt AI:n fråga om något är oklart i stället för att gissa.', knapp: 'Lägg till' });
      if (!x.langd) f.push({ id: 'langd', text: 'Bestäm längden, så slipper du korta ned svaret efteråt.', knapp: 'Välj längd' });
    }
    return f.slice(0, 2);
  }
  function forslagHtml() {
    var f = forslagLista();
    if (!f.length) return '';
    return '<div class="pgn-forslag"><p class="pgn-forslag-rubrik">Apan föreslår</p>' + f.map(function (x, i) {
      return '<div class="pgn-forslag-rad' + (i ? ' pgn-forslag-2' : '') + '"><span>' + esc(x.text) + '</span><button type="button" data-forslag="' + x.id + '">' + esc(x.knapp) + '</button></div>';
    }).join('') + '</div>';
  }

  /* ── Kedjeläget: stegrad, svarsruta, laddning ── */
  function kBarHtml() {
    if (!K) return '';
    var i = kIdx(K.steg), tot = K.steps.length, har = K.steps[i] || { titel: S.mallNamn || '' };
    var fore = i > 0 ? K.steps[i - 1] : null, nasta = i > -1 && i < tot - 1 ? K.steps[i + 1] : null, klara = kKlara(), av = K.laddad ? '' : ' disabled';
    var href = '/ai-mallar/' + encodeURIComponent(K.mall);
    var h = '<nav class="pgn-kedja" aria-label="Steg i mallen" data-kedjabar><div class="pgn-kedja-topp"><a href="' + href + '">← ' + esc(K.mallNamn || 'Tillbaka till mallen') + '</a>' +
      (tot ? '<span>Steg ' + K.steg + ' av ' + tot + '</span>' : '') + '</div>' +
      '<p class="pgn-kedja-titel">' + esc(har.titel || 'Steg ' + K.steg) + '</p>';
    if (tot > 1) h += '<ol class="pgn-kedja-prickar">' + K.steps.map(function (x) {
      var ar = x.n === K.steg, kl = klara.indexOf(x.n) > -1;
      return '<li><button type="button" data-kga="' + x.n + '" title="Steg ' + x.n + ': ' + esc(x.titel) + '"' + (ar ? ' aria-current="step"' : av) + ' class="' + (kl && !ar ? 'is-klar' : '') + '">' + (kl && !ar ? '✓' : x.n) + '</button></li>';
    }).join('') + '</ol>';
    if (fore || nasta || tot) {
      h += '<div class="pgn-kedja-nav">' + (fore ? '<button type="button" data-kga="' + fore.n + '"' + av + '>← Steg ' + fore.n + '</button>' : '') +
        (nasta ? '<button type="button" class="is-primar" data-kga="' + nasta.n + '"' + av + '>Nästa: ' + esc(nasta.titel) + ' →</button>'
          : tot ? '<a class="is-primar" href="' + href + '">Klart! Tillbaka till mallen →</a>' : '') + '</div>';
    }
    return h + '</nav>';
  }
  function kSvarHtml() {
    var i = kIdx(K.steg), nasta = i > -1 && i < K.steps.length - 1 ? K.steps[i + 1] : null, sparat = kMin().svar[K.steg] || '';
    return '<div class="pgn-svar"><p class="pgn-svar-rubrik">Har du fått svaret från AI:n?</p>' +
      '<p class="pgn-svar-hjalp">' + (nasta ? 'Klistra in det här. Nästa steg som behöver svaret från steg ' + K.steg + ' fylls då i av sig självt.' : 'Klistra in det här, så fylls det i av sig självt i nästa mall som behöver det.') + '</p>' +
      '<label for="pgn-kedjasvar" class="pgn-sr">AI:ns svar i steg ' + K.steg + '</label>' +
      '<textarea id="pgn-kedjasvar" class="pgn-in" data-kedjasvar placeholder="Klistra in AI:ns svar …">' + esc(sparat) + '</textarea>' +
      '<span class="pgn-svar-sparat" data-kedjasparat aria-live="polite">' + (sparat ? '✓ Sparat' : '') + '</span>' +
      (nasta ? '<button type="button" class="pgn-mork" data-kga="' + nasta.n + '"' + (K.laddad ? '' : ' disabled') + '>Nästa steg: ' + esc(nasta.titel) + ' →</button>'
        : K.steps.length ? '<a class="pgn-mork" href="/ai-mallar/' + encodeURIComponent(K.mall) + '">Klart! Tillbaka till mallen →</a>' : '') + '</div>';
  }
  function vyLaddar() {
    return '<section class="pgn-sek"><h1 tabindex="-1" data-fokus>Hämtar steg ' + K.steg + ' i mallen …</h1><ul class="pgn-bygg" aria-live="polite"><li>' + PRICKAR + '<span>Apan letar fram prompten</span></li></ul></section>';
  }
  /* Byt till steg n utan sidladdning */
  function kVisaSteg(n, forsta) {
    var x = K.steps[kIdx(n)];
    if (!x || !x.prompt) return;
    clearTimeout(timer); timer = null;
    if (!forsta) kTrack('pgny_kedja_nasta', { till: n });
    K.steg = n;
    try { history.replaceState(null, '', location.pathname + '?source=mallar&mall=' + encodeURIComponent(K.mall) + '&steg=' + n); } catch (e) {}
    try { sessionStorage.setItem('pg_chain', JSON.stringify({ mall: K.mall, mallNamn: K.mallNamn, steg: n, total: K.steps.length, steps: K.steps.map(function (y) { return { steg: y.n, titel: y.titel }; }) })); } catch (e) {}
    S.text = x.prompt; S.mallNamn = x.titel; S.typ = 'skriva'; S.raw = ''; S.kalla = 'mallar';
    S.fyll = {}; S.forifyllt = {}; S.kopierad = S.harKop = false; S.fin = false; S.optIdx = 0;
    delete S.svar.roll; delete S.svar.rollEgen; delete S.svar.malgruppEgen;
    sattRoll(x.roll); if (x.malgrupp) S.svar.malgruppEgen = x.malgrupp;
    kTrack('pgny_kedja_steg', {});
    var auto = forifyll();
    if (auto) kTrack('pgny_kedja_autofyll', { antal: auto });
    /* Har steget luckor visas Fyll i alltid, även när allt redan fyllts i
       från tidigare steg, så att man ser och kan kolla det som hämtats */
    if (phParse(S.text).length) tillFyll('bygger'); else tillBygg();
  }
  /* Hämta mallsidan: stegens titel, prompt, roll och målgrupp */
  function kHamta() {
    fetch(location.origin + '/ai-mallar/' + encodeURIComponent(K.mall), { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        function t(el, sel) { var e = el.querySelector(sel); return e && !e.classList.contains('w-dyn-bind-empty') ? e.textContent.trim() : ''; }
        var sedd = {};
        var steps = [].slice.call(doc.querySelectorAll('[data-mall-v2="steg"] .stegkort')).map(function (c) {
          var pe = c.querySelector('.stegkort-prompt');
          return { n: parseInt(t(c, '.stegkort-num'), 10) || 0, titel: t(c, '.stegkort-titel'),
            prompt: pe && !pe.classList.contains('w-dyn-bind-empty') ? pe.textContent.replace(/^\s+|\s+$/g, '') : '',
            roll: t(c, '[data-stegkort="roll"]'), malgrupp: t(c, '[data-stegkort="malgrupp"]') };
        }).filter(function (x) { if (!(x.n > 0 && x.titel) || sedd[x.n]) return false; return (sedd[x.n] = true); })
          .sort(function (a, b) { return a.n - b.n; });
        if (!steps.length) return;
        /* Fas + stegrubriker sparas så att senare mallar hittar rätt svar ("från fas 2") */
        var st = kLas(), mine = kMin(st), fasEl = doc.querySelector('[data-mall-meta="fas"]'), fas = fasEl ? parseInt(fasEl.textContent, 10) || 0 : 0;
        if (fas) mine.fas = fas;
        mine.titlar = {}; steps.forEach(function (x) { mine.titlar[x.n] = x.titel; });
        spara(KEDJA, st);
        var h1 = doc.querySelector('h1'), namn = h1 ? h1.textContent.trim() : '';
        K.mallNamn = (namn.split(/\s*[:—–]\s+|\s+-\s+/)[0] || namn || K.mallNamn).trim();
        K.steps = steps;
      })
      .catch(function () {})
      .then(function () {
        K.laddad = K.steps.some(function (x) { return x.prompt; });
        if (!K.laddad) {
          /* Okänd mall: vanlig generator (med prompten från länken om den finns) */
          K = null;
          if (S.steg === 'laddar') S.steg = 'start';
          rita(); return;
        }
        if (S.steg === 'laddar') {
          var x = K.steps[kIdx(K.steg)];
          if (x && x.prompt) kVisaSteg(K.steg, true); else { K.steg = K.steps[0].n; kVisaSteg(K.steg, true); }
          return;
        }
        /* Rita bara om stegraden (och svarsrutan) så att fokus i fälten finns kvar */
        var bar = root.querySelector('[data-kedjabar]');
        if (bar) bar.outerHTML = kBarHtml();
        var sv = root.querySelector('.pgn-svar');
        if (sv && !(document.activeElement && document.activeElement.hasAttribute && document.activeElement.hasAttribute('data-kedjasvar'))) sv.outerHTML = kSvarHtml();
      });
  }

  var RADER = ['Apan läser din uppgift', 'Väljer rätt roll åt AI:n', 'Lägger till läsare, ton och underlag', 'Formar hur svaret ska se ut'];
  function vyBygger() {
    return '<section class="pgn-sek"><h1 tabindex="-1" data-fokus>Apan bygger din prompt …</h1><ul class="pgn-bygg" aria-live="polite">' +
      RADER.slice(0, Math.min(S.rad + 1, 4)).map(function (t, i) {
        return '<li>' + (i < S.rad ? '<span class="pgn-bock">' + BOCK + '</span>' : PRICKAR) + '<span>' + t + '</span></li>';
      }).join('') + '</ul></section>';
  }

  function vyKlar() {
    var prompt = byggPrompt(S), L = lista(), pk = foreslagetPaket();
    var arBild = arDirektMedia(S) && S.typ === 'bild', arVideo = arDirektMedia(S) && S.typ === 'video';
    var h = '<section class="pgn-sek">';
    h += '<div class="pgn-rubrik"><h1 tabindex="-1" data-fokus>' + (arBild ? 'Din bildprompt är klar!' : arVideo ? 'Din videoprompt är klar!' : 'Din prompt är klar!') + '</h1><p class="pgn-ingress">' + (S.raw ? 'Kopiera den och klistra in i ChatGPT, Claude, Gemini eller Copilot.' : arBild ? 'Klistra in den i ChatGPT, Gemini eller Copilot, så skapas bilden direkt. Justera den här nedanför.' : arVideo ? 'Klistra in den i en videotjänst, till exempel Gemini (Veo), Sora eller Runway. Justera den här nedanför.' : 'Kopiera den, eller justera den här nedanför. Den ändras direkt.') + '</p></div>';
    if (S.redigera) {
      h += '<div class="pgn-red"><label for="pgn-red">' + (S.raw ? 'Redigera prompten' : 'Din uppgift') + '</label>' +
        '<textarea id="pgn-red" class="pgn-in" data-uppgift>' + esc(S.raw || S.text) + '</textarea>' +
        '<div class="pgn-red-rad"><button type="button" class="pgn-mork" data-redklar>Klar</button><span class="pgn-not">Prompten nedanför ändras medan du skriver.</span></div></div>';
    } else {
      h += '<div class="pgn-uppg"><div class="pgn-uppg-rad"><strong>' + (S.raw ? 'Prompt:' : 'Din uppgift:') + '</strong><span class="pgn-uppg-text">' + esc(S.raw ? 'Från dina senaste prompter' : (S.mallNamn || applyFills(S.text))) + '</span>' +
        '<button type="button" class="pgn-andra" data-redigera>' + (S.raw ? '✎ Redigera prompten' : '✎ Ändra uppgiften') + '</button></div></div>';
    }
    h += '<div class="pgn-prompt"><div class="pgn-prompt-topp"><span>' + (S.raw ? 'Från dina senaste prompter' : S.mallNamn ? 'Från mallen ' + esc(S.mallNamn) : esc(typNamn())) + '</span><span data-tecken>' + prompt.length + ' tecken</span></div><pre data-prompt>' + radHtml(prompt) + '</pre></div>';
    if (!S.raw) h += justeraHtml();
    h += '<div class="pgn-rad"><button type="button" class="pgn-gul' + (S.harKop ? ' is-kopierad' : '') + '" data-kopiera>' + (S.kopierad ? '✓ Kopierad!' : S.harKop ? '✓ Kopierad · kopiera igen' : 'Kopiera prompt') + '</button>' +
      '<button type="button" class="pgn-ram" data-borjaom>' + (K ? 'Lämna mallen' : 'Gör en ny') + '</button></div>';
    h += aiHtml(prompt);
    if (K) h += kSvarHtml();
    if (!S.raw) h += forslagHtml();

    if (!K) h += '<div class="pgn-projekt"><div><p class="pgn-p-rubrik">Gör du sånt här ofta?</p>' +
      '<p class="pgn-p-text">Spara ditt företag, din ton och dina regler som ett projekt i din AI-tjänst. Då slipper du skriva det varje gång.</p>' +
      (pk ? '' : '<div class="pgn-p-val">' + PAKET.map(function (p) { return '<a href="/projektpaket/' + p.slug + '?source=generator" data-projekt="' + p.slug + '">' + esc(p.namn) + '</a>'; }).join('') + '</div>') +
      '</div>' + (pk ? '<a class="pgn-p-knapp" href="/projektpaket/' + pk.slug + '?source=generator" data-projekt="' + pk.slug + '">Projektmall: ' + esc(pk.namn) + ' →</a>' : '') + '</div>';
    h += '<div class="pgn-drag">';
    h += '<button type="button" data-vaxla="sa" aria-expanded="' + S.sa + '"><span>Så funkar prompten</span><span>' + (S.sa ? '−' : '+') + '</span></button>';
    if (S.sa && arBild) h += '<div class="pgn-drag-inne"><ul>' +
      '<li><strong>Motiv:</strong> vad som ska synas. Ju mer konkret (vem, var, vad som händer), desto närmare bilden du ser framför dig.</li>' +
      '<li><strong>Stil:</strong> foto, illustration eller 3D avgör hela känslan.</li>' +
      '<li><strong>Ljus och bildutsnitt:</strong> det som skiljer en levande bild från en platt.</li>' +
      '<li><strong>Format:</strong> rätt mått direkt, för Instagram, webben eller en affisch.</li>' +
      '<li><strong>Midjourney?</strong> Där fungerar engelska bäst. Be ChatGPT översätta prompten först.</li></ul></div>';
    else if (S.sa && arVideo) h += '<div class="pgn-drag-inne"><ul>' +
      '<li><strong>Motiv:</strong> vad som ska hända. Vem eller vad, var och vad som rör sig.</li>' +
      '<li><strong>Stil och ljus:</strong> realistiskt, filmiskt eller animerat avgör hela känslan.</li>' +
      '<li><strong>Kamera och rörelse:</strong> det som gör att videon känns regisserad och inte slumpad.</li>' +
      '<li><strong>Format:</strong> stående 9:16 för Reels och TikTok, liggande 16:9 för YouTube och webben.</li>' +
      '<li><strong>Tips:</strong> videotjänsterna gör korta klipp, oftast några sekunder. Beskriv en scen i taget.</li></ul></div>';
    else if (S.sa) h += '<div class="pgn-drag-inne"><ul>' +
      '<li><strong>Roll:</strong> AI:n får veta vem den ska vara, så att svaret låter som en kunnig person och inte som en robot.</li>' +
      '<li><strong>Uppgift och läsare:</strong> ju tydligare vem det är till, desto bättre träffar texten.</li>' +
      '<li><strong>Underlag:</strong> fakta, siffror eller en gammal text. Det är där svaret blir ditt.</li>' +
      '<li><strong>Svarsformat:</strong> format, längd och regler gör att du slipper skriva om svaret.</li></ul></div>';
    var antalSen = lasSenaste().length;
    if (antalSen) {
      h += '<button type="button" data-vaxla="senOppen" aria-expanded="' + S.senOppen + '"><span>Senaste prompter (' + antalSen + ')</span><span>' + (S.senOppen ? '−' : '+') + '</span></button>';
      if (S.senOppen) h += '<div class="pgn-drag-inne">' + senasteHtml() + '</div>';
    }
    h += '</div>';
    h += '<div class="pgn-apan"><b>Apan tycker:</b><span>' + (/\[[A-ZÅÄÖ]/.test(prompt) ? 'Byt ut texten inom hakparentes innan du skickar. Det tar tio sekunder och gör svaret dubbelt så bra.' : (S.raw ? 'Blev svaret nästan rätt? Svara AI:n med vad som ska ändras i stället för att börja om. Andra försöket är ofta det bästa.' : 'Testa en knapp i taget och se vad som händer med prompten. Så lär du dig vad som gör en prompt bra, nästan utan att märka det.')) + '</span></div>';
    return h + '</section>';
  }

  /* ── AI-tjänsterna: direkt under Kopiera. Efter Kopiera blir de nästa steg,
     och den tjänst man valde senast ligger först (localStorage pgny_ai). ── */
  var AI_TJ = {
    chatgpt: { namn: 'ChatGPT', url: 'https://chatgpt.com/', q: true },
    claude: { namn: 'Claude', url: 'https://claude.ai/new', q: true },
    gemini: { namn: 'Gemini', url: 'https://gemini.google.com/app' },
    copilot: { namn: 'Copilot', url: 'https://m365.cloud.microsoft/chat' },
    sora: { namn: 'Sora', url: 'https://sora.com/' },
    runway: { namn: 'Runway', url: 'https://app.runwayml.com/' }
  };
  var Q_MAX = 6000;   // längre prompter får inte plats i länken
  function aiVanlig() { var v = las('pgny_ai', ''); return AI_TJ[v] ? v : ''; }
  function aiLista() {
    var media = arDirektMedia(S) ? S.typ : '';
    var ids = media === 'video' ? ['gemini', 'sora', 'runway'] : media === 'bild' ? ['chatgpt', 'gemini', 'copilot'] : ['chatgpt', 'claude', 'gemini', 'copilot'];
    var v = aiVanlig(), i = ids.indexOf(v);
    if (i > 0) { ids.splice(i, 1); ids.unshift(v); }
    return ids;
  }
  function aiMed(id, prompt) { return !!AI_TJ[id].q && prompt.length <= Q_MAX; }
  function aiUrl(id, prompt) { return AI_TJ[id].url + (aiMed(id, prompt) ? '?q=' + encodeURIComponent(prompt) : ''); }
  function aiHtml(prompt) {
    var ids = aiLista(), v = aiVanlig(), media = arDirektMedia(S) ? S.typ : '';
    function lank(id, cls, inne) { return '<a class="' + cls + '" href="' + esc(aiUrl(id, prompt)) + '" target="_blank" rel="noopener" data-ai="' + id + '">' + inne + '</a>'; }
    if (!S.harKop) {
      return '<div class="pgn-ai"><span>Sen öppnar du:</span>' + ids.map(function (id) {
        var med = aiMed(id, prompt);
        return lank(id, '', esc(AI_TJ[id].namn) + ' ↗<em class="pgn-mini' + (med ? ' is-med' : '') + '">' + (med ? '⚡ ifylld' : 'klistra in') + '</em>');
      }).join('') + '</div>';
    }
    var medN = ids.filter(function (id) { return aiMed(id, prompt); }).map(function (id) { return AI_TJ[id].namn; });
    var text = !medN.length ? 'Prompten ligger i urklipp. Klistra in den med Ctrl+V (Cmd+V på Mac).'
      : v ? 'Din vanliga tjänst ligger först. ⚡ = prompten klistras in åt dig.'
      : '⚡ ' + medN.join(' och ') + ' får prompten ifylld. I ' + (ids.length - medN.length > 1 ? 'de andra' : 'den andra') + ' klistrar du in den själv.';
    var rubrik = media === 'bild' ? 'Nästa steg: skapa bilden&nbsp;→' : media === 'video' ? 'Nästa steg: skapa videon&nbsp;→' : 'Nästa steg: klistra in i din AI-tjänst&nbsp;→';
    var h = '<div class="pgn-nasta" data-nastaai><p class="pgn-nasta-rubrik">' + rubrik + '</p><p class="pgn-nasta-text">' + text + '</p><div class="pgn-nasta-grid">';
    h += ids.map(function (id) {
      var med = aiMed(id, prompt), ar = id === v;
      return lank(id, 'pgn-tj' + (ar ? ' is-vanlig' : ''), '<b>' + esc(AI_TJ[id].namn) + ' ↗</b>' + (ar ? '<span class="pgn-tj-din">Din vanliga</span>' : '') +
        '<span class="pgn-tj-chip' + (med ? ' is-med' : '') + '">' + (med ? '⚡ Klistras in åt dig' : 'Klistra in själv') + '</span>');
    }).join('');
    h += '</div>';
    if (S.aiOppnad && AI_TJ[S.aiOppnad]) {
      var n = AI_TJ[S.aiOppnad].namn;
      h += '<p class="pgn-nasta-ok" role="status">✓ ' + (aiMed(S.aiOppnad, prompt) ? n + ' öppnas i en ny flik med prompten ifylld.' : n + ' öppnas i en ny flik. Klistra in med Ctrl+V (Cmd+V på Mac) och tryck Enter.') + '</p>';
    }
    return h + '</div>';
  }
  /* Mobilens panel "Öppna i …" (från ▾ i den fasta knappen) */
  function aiArkHtml() {
    if (S.ark !== 'ai' || S.steg !== 'klar') return '';
    var prompt = byggPrompt(S);
    return '<button type="button" class="pgn-ark-bak" data-arkstang aria-label="Stäng"></button>' +
      '<div class="pgn-ark" role="dialog" aria-label="Öppna i AI-tjänst"><span class="pgn-ark-grepp" aria-hidden="true"></span><p class="pgn-ark-rubrik">Öppna i …</p>' +
      aiLista().map(function (id) { var med = aiMed(id, prompt); return '<a class="pgn-ark-tj" href="' + esc(aiUrl(id, prompt)) + '" target="_blank" rel="noopener" data-ai="' + id + '" data-aifran="panel"><b>' + esc(AI_TJ[id].namn) + ' ↗</b><span class="pgn-tj-chip' + (med ? ' is-med' : '') + '">' + (med ? '⚡ Klistras in åt dig' : 'Klistra in själv') + '</span></a>'; }).join('') +
      '<button type="button" class="pgn-ram" data-arkstang>Stäng</button></div>';
  }

  function barHtml() {
    if (S.steg === 'start' || S.steg === 'laddar') return '';
    var L = lista(), klar = S.steg === 'klar';
    if (S.steg === 'fyll') {
      var fs = fyllStatus(phParse(S.text));
      return '<div class="pgn-bar-wrap"><button type="button" class="pgn-bar" data-bar>' + PRICKAR +
        '<span class="pgn-bar-mitt"><span>' + barFyllText(fs) + '</span><span class="pgn-bar-spar"><i style="width:' + barFyllPct(fs) + '%"></i></span></span>' +
        '<span class="pgn-bar-hint">' + (fs.kvar ? 'Visa →' : 'Fortsätt →') + '</span></button></div>';
    }
    if (klar && S.harKop) {
      var pr = byggPrompt(S), id0 = aiLista()[0];
      return '<div class="pgn-bar-wrap pgn-bar-ai"><a class="pgn-bar is-klar" href="' + esc(aiUrl(id0, pr)) + '" target="_blank" rel="noopener" data-ai="' + id0 + '" data-aifran="knappen">' +
        '<span class="pgn-bar-mitt"><span>Öppna i ' + esc(AI_TJ[id0].namn) + ' ↗' + (aiMed(id0, pr) ? ' ⚡' : '') + '</span></span></a>' +
        '<button type="button" class="pgn-bar-mer" data-aiark aria-label="Välj en annan AI-tjänst">▾</button></div>';
    }
    var pct = S.steg === 'opt' ? Math.round(20 + 55 * (S.optIdx + (stegGjort(L[S.optIdx] || { grupper: [] }) ? 1 : 0)) / L.length) : S.steg === 'bygger' ? 78 + S.rad * 5 : 100;
    var text = klar ? (S.kopierad ? 'Kopierad ✓' : 'Kopiera prompt') : S.steg === 'opt' ? 'Din prompt är redo' : (S.rad >= 3 ? 'Din prompt är nästan klar …' : 'Prompten genereras …');
    var opt = S.steg === 'opt';
    return '<div class="pgn-bar-wrap"><button type="button" class="pgn-bar' + (klar ? ' is-klar' : '') + '" data-bar>' +
      (klar || opt ? '' : PRICKAR) +
      '<span class="pgn-bar-mitt"><span>' + text + '</span>' + (klar ? '' : '<span class="pgn-bar-spar"><i style="width:' + pct + '%"></i></span>') + '</span>' +
      (!klar && S.steg === 'opt' && S.puls && S.nya && Date.now() < S.nya.till ? '<span class="pgn-puls" data-puls>+' + S.puls + (S.puls === 1 ? ' rad' : ' rader') + '</span>' : '') +
      (klar ? '' : S.steg === 'opt' ? '<span class="pgn-bar-hint pgn-bar-cta"><span class="pgn-d">Visa min prompt →</span><span class="pgn-m">Visa min prompt ↑</span></span>' : '<span class="pgn-bar-hint">Visa →</span>') + '</button></div>';
  }

  var forraSteg = null;
  function rita() {
    efterAndring();
    if (S.steg !== 'opt' && S.ark !== 'ai') S.ark = '';
    if (S.steg !== 'klar' && S.ark === 'ai') S.ark = '';
    if (S.steg !== 'klar') { S.justera = ''; S.redigera = false; }
    var vy = S.steg === 'laddar' ? vyLaddar() : S.steg === 'start' ? vyStart() : S.steg === 'fyll' ? vyFyll() : S.steg === 'opt' ? vyOpt() : S.steg === 'bygger' ? vyBygger() : vyKlar();
    root.innerHTML = '<div class="pgn' + (S.steg === 'opt' ? ' is-bred' : '') + '"><div class="pgn-top"><span class="pgn-logo">Promptgeneratorn</span>' + stegrad() + '</div>' + kBarHtml() + vy + '</div>' + barHtml() + arkHtml() + aiArkHtml();
    if (S.steg === 'start') { ritaTraffar(); }
    var nyckel = S.steg + ':' + S.optIdx;
    if (forraSteg !== null && forraSteg !== nyckel) {
      var f = root.querySelector('[data-fokus]');
      /* Fyll i-steget: fokus i första tomma fältet (inte på mobil, där tangentbordet skymmer) */
      if (S.steg === 'fyll' && window.matchMedia && window.matchMedia('(min-width: 768px)').matches) {
        var tom = [].filter.call(root.querySelectorAll('[data-ph]'), function (x) { return !x.value.trim(); })[0];
        if (tom) f = tom;
      }
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
      var top = root.getBoundingClientRect().top + window.pageYOffset - 90;
      if (window.pageYOffset > top) window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    forraSteg = nyckel;
    if (S.steg === 'bygger') tick();
  }

  /* ── Bygget ── */
  var timer = null;
  var snabb = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick() {
    if (timer) return;
    timer = setTimeout(function () {
      timer = null;
      if (S.steg !== 'bygger') return;
      S.rad++;
      if (S.rad > 4) { tillKlar(); return; }
      rita();
    }, snabb ? 150 : 600);
  }
  function tillBygg() {
    if (!S.raw) { forifyll(); if (ofyllda().length) { tillFyll('bygger'); return; } }
    S.steg = 'bygger'; S.rad = 0; S.kopierad = S.harKop = false; S.typOppen = false; rita();
  }
  function tillFyll(efter) {
    forifyll();
    S.steg = 'fyll'; S.efterFyll = efter; S.fyllVisaFel = false; S.typOppen = false;
    track('pgny_fyll_visa', { antal: phParse(S.text).length, kvar: ofyllda().length });
    rita();
  }
  /* "Bygg prompten →" i Fyll i: går bara vidare när allt är ifyllt */
  function fyllKlar() {
    var kvar = ofyllda();
    if (kvar.length) {
      S.fyllVisaFel = true;
      var L = phParse(S.text), idx = -1;
      L.forEach(function (t, i) { if (idx === -1 && t.key === kvar[0].key) idx = i; });
      [].forEach.call(root.querySelectorAll('[data-phfalt]'), function (f) { var t = L[+f.getAttribute('data-phfalt')]; if (t && !fylltVarde(t.key)) f.classList.add('is-fel'); });
      var el = root.querySelector('[data-ph="' + idx + '"]');
      if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } el.scrollIntoView({ block: 'center', behavior: snabb ? 'auto' : 'smooth' }); }
      return;
    }
    var L2 = phParse(S.text);
    track('pgny_fyll', { antal: L2.length, forifyllda: L2.filter(function (t) { return S.forifyllt[t.key]; }).length });
    if (S.efterFyll === 'opt') { S.steg = 'opt'; S.optIdx = 0; rita(); }
    else if (S.efterFyll === 'klar') { S.steg = 'klar'; S.kopierad = S.harKop = false; rita(); }
    else tillBygg();
  }
  function tillKlar() {
    clearTimeout(timer); timer = null;
    S.steg = 'klar'; S.rad = 0;
    track('pgny_klar', { tecken: byggPrompt(S).length, steg_ifyllda: lista().filter(stegGjort).length });
    rita();
  }
  function nastaFran(i, hoppad) {
    var L = lista();
    track('pgny_steg', { steg: L[i] ? L[i].kort : '', hoppad: hoppad ? 1 : 0 });
    if (i + 1 < L.length) { S.optIdx = i + 1; S.typOppen = false; rita(); } else tillBygg();
  }

  /* ── Kopiera ── */
  /* Konfetti i sajtens färger när prompten kopieras (inte med reducerad rörelse) */
  function konfetti() {
    if (snabb) return;
    var w = document.createElement('div'); w.className = 'pgn-konfetti'; w.setAttribute('aria-hidden', 'true');
    var farg = ['#00c9a7', '#ffd23f', '#4cd9c1', '#0b1f3b', '#e5f9f6'];
    for (var i = 0; i < 70; i++) {
      var c = document.createElement('i');
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.background = farg[i % farg.length];
      c.style.setProperty('--dx', ((Math.random() - .5) * 240) + 'px');
      c.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      c.style.animationDelay = (Math.random() * .35) + 's';
      c.style.animationDuration = (1.2 + Math.random() * .9) + 's';
      w.appendChild(c);
    }
    document.body.appendChild(w);
    setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 2800);
  }
  function kopiera() {
    var text = byggPrompt(S);
    konfetti();
    function klart() { S.kopierad = true; S.harKop = true; S.aiOppnad = ''; track('pgny_visa', { vad: 'nasta_ai' }); rita(); setTimeout(function () { if (S.kopierad) { S.kopierad = false; rita(); } }, 2200); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(klart, function () { fallback(); klart(); });
    else { fallback(); klart(); }
    if (!S.raw) sparaSenaste(text, S.typ, S.mallNamn);
    if (K && !S.raw) {
      kMarkera(K.steg);
      if (K.steps.length && kIdx(K.steg) === K.steps.length - 1) kTrack('pgny_kedja_klar', {});
    }
    track('pgny_copy', { tecken: text.length, steg_ifyllda: lista().filter(stegGjort).length, fran_senaste: S.raw ? 1 : 0 });
  }

  /* ── Händelser ── */
  var svarTimer = null, kSvarTrackat = {};
  root.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-text')) { S.text = el.value; S.mallNamn = ''; if (!bibliotek) laddaBibliotek(ritaTraffar); else ritaTraffar(); return; }
    if (el.hasAttribute('data-kedjasvar') && K) {
      clearTimeout(svarTimer);
      var lab = root.querySelector('[data-kedjasparat]'); if (lab) lab.textContent = '';
      svarTimer = setTimeout(function () {
        var v = el.value.trim(), st = kLas(), mine = kMin(st);
        if (v) mine.svar[K.steg] = v; else delete mine.svar[K.steg];
        mine.t = new Date().toISOString();
        spara(KEDJA, st);
        if (lab) lab.textContent = v ? '✓ Sparat' : '';
        if (v && !kSvarTrackat[K.steg]) { kSvarTrackat[K.steg] = true; kTrack('pgny_kedja_svar', {}); }
      }, 400);
      return;
    }
    if (el.hasAttribute('data-ph')) {
      var t5 = phParse(S.text)[+el.getAttribute('data-ph')]; if (!t5) return;
      S.fyll[t5.key] = el.value; delete S.forifyllt[t5.key];
      sparaFyll(t5, el.value.trim());
      uppdateraFyll(); return;
    }
    if (el.hasAttribute('data-uppgift')) {
      S._fore = byggPrompt(S);
      if (S.raw) S.raw = el.value; else S.text = el.value;
      S.kopierad = S.harKop = false;
      efterAndring();
      var pr2 = byggPrompt(S), pre = root.querySelector('[data-prompt]'); if (pre) pre.innerHTML = radHtml(pr2);
      var tk = root.querySelector('[data-tecken]'); if (tk) tk.textContent = pr2.length + ' tecken';
      return;
    }
    if (el.hasAttribute('data-egen') || el.hasAttribute('data-falt')) S._fore = byggPrompt(S);
    if (el.hasAttribute('data-egen')) {
      var ei = +el.getAttribute('data-egen'), del = el.getAttribute('data-del');
      S.svar.egna = Array.isArray(S.svar.egna) ? S.svar.egna : [];
      S.svar.egna[ei] = S.svar.egna[ei] || { namn: '', varde: '' };
      S.svar.egna[ei][del] = el.value;
      var nav2 = root.querySelector('.pgn-nav');
      if (nav2) { var L3 = lista(); [].forEach.call(nav2.querySelectorAll('[data-gaopt]'), function (b) { b.classList.toggle('is-gjord', stegGjort(L3[+b.getAttribute('data-gaopt')])); }); }
      ritaLive(); return;
    }
    if (el.hasAttribute('data-falt')) {
      var k = el.getAttribute('data-falt');
      S.svar[k] = el.value;
      if (FYLL[k]) sparaKedja(k, el.value.trim());
      var nav = root.querySelector('.pgn-nav');
      if (nav) { var L = lista(); [].forEach.call(nav.querySelectorAll('[data-gaopt]'), function (b) { var o = L[+b.getAttribute('data-gaopt')]; var gj = stegGjort(o); b.classList.toggle('is-gjord', gj); }); }
      ritaLive();
    }
  });
  root.addEventListener('focusin', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-text')) laddaBibliotek(function () {}); });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (S.ark || S.justera)) { var k0 = S.justera; S.ark = ''; S.justera = ''; rita(); var tb = k0 && root.querySelector('[data-justera="' + k0 + '"]'); if (tb) tb.focus(); return; }
    /* Enter i ett Fyll i-fält: nästa tomma fält, eller vidare när allt är ifyllt */
    if (e.target.hasAttribute && e.target.hasAttribute('data-ph') && e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      var falt = [].slice.call(root.querySelectorAll('[data-ph]')), nasta = falt.slice(falt.indexOf(e.target) + 1).concat(falt).filter(function (x) { return !x.value.trim(); })[0];
      if (nasta) nasta.focus(); else fyllKlar();
      return;
    }
    if (e.target.hasAttribute && e.target.hasAttribute('data-text') && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); root.querySelector('[data-bygg]').click(); }
  });
  root.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && root.contains(a)) {
      if (a.hasAttribute('data-ai')) {
        var aid = a.getAttribute('data-ai'), pr2 = byggPrompt(S), var2 = aiVanlig();
        track('pgny_ai', { tjanst: aid, vad: (a.getAttribute('data-aifran') || (S.harKop ? 'nasta' : 'fore')) + (aid === var2 ? '_vanlig' : ''), kalla: S.kalla });
        spara('pgny_ai', aid);
        /* Tjänster som inte tar emot prompten i länken: lägg den i urklipp ändå */
        if (!aiMed(aid, pr2) && navigator.clipboard && navigator.clipboard.writeText) { try { navigator.clipboard.writeText(pr2); } catch (e10) {} }
        if (S.steg === 'klar') setTimeout(function () { S.harKop = true; S.aiOppnad = aid; S.ark = ''; rita(); }, 50);
      }
      if (a.hasAttribute('data-projekt')) track('pgny_projekt', { paket: a.getAttribute('data-projekt') });
      return;
    }
    var b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute('data-bar')) return;
    snap();
    if (b.hasAttribute('data-justera')) { var jk = b.getAttribute('data-justera'); S.justera = S.justera === jk ? '' : jk; rita(); var fm = root.querySelector('.pgn-meny .pgn-chip'); if (fm && S.justera) { try { fm.focus({ preventScroll: true }); } catch (e3) {} } return; }
    if (b.hasAttribute('data-jstang')) { S.justera = ''; rita(); return; }
    if (b.hasAttribute('data-jval')) {
      var jkey = S.justera; jSatt(jkey, b.getAttribute('data-jval'));
      S.justera = ''; S.kopierad = S.harKop = false; track('pgny_andra', { vad: 'justera_' + jkey }); rita();
      var tb2 = root.querySelector('[data-justera="' + jkey + '"]'); if (tb2) { try { tb2.focus({ preventScroll: true }); } catch (e4) {} }
      return;
    }
    if (b.hasAttribute('data-jtyp')) { S.typ = b.getAttribute('data-jtyp'); S.justera = ''; S.kopierad = S.harKop = false; track('pgny_andra', { vad: 'justera_typ' }); rita(); return; }
    if (b.hasAttribute('data-fler')) { track('pgny_andra', { vad: 'fler_val' }); S.steg = 'opt'; S.optIdx = 0; S.typOppen = false; rita(); return; }
    if (b.hasAttribute('data-forslag')) {
      var fid = b.getAttribute('data-forslag'); track('pgny_andra', { vad: 'forslag_' + fid });
      if (fid === 'tre' || fid === 'fragor') { var rg2 = Array.isArray(S.svar.regler) ? S.svar.regler.slice() : []; rg2.push(fid === 'tre' ? 'Ge tre alternativ' : 'Ställ frågor om något är oklart'); S.svar.regler = rg2; S.kopierad = S.harKop = false; rita(); return; }
      if (fid === 'motiv') { S.redigera = true; S.justera = ''; rita(); var tm = root.querySelector('[data-uppgift]'); if (tm) { try { tm.focus(); tm.setSelectionRange(tm.value.length, tm.value.length); } catch (e9) {} } return; }
      S.justera = fid; rita(); var fm2 = root.querySelector('.pgn-meny .pgn-chip'); if (fm2) { try { fm2.focus({ preventScroll: true }); } catch (e5) {} } return;
    }
    if (b.hasAttribute('data-arkstang')) { S.ark = ''; rita(); return; }
    if (b.hasAttribute('data-aiark')) { S.ark = 'ai'; track('pgny_visa', { vad: 'ai_panel' }); rita(); var fa = root.querySelector('.pgn-ark-tj'); if (fa) { try { fa.focus({ preventScroll: true }); } catch (e11) {} } return; }
    if (b.hasAttribute('data-alla')) { S.alla = !S.alla; try { localStorage.setItem('pgny_alla', S.alla ? '1' : ''); } catch (e7) {} track('pgny_andra', { vad: S.alla ? 'alla_pa' : 'alla_av' }); rita(); return; }
    if (b.hasAttribute('data-allaklar')) { track('pgny_steg', { steg: 'alla', hoppad: 0 }); tillBygg(); return; }
    if (b.hasAttribute('data-redigera')) { S.redigera = true; S.justera = ''; rita(); var tr = root.querySelector('[data-uppgift]'); if (tr) { try { tr.focus(); tr.setSelectionRange(tr.value.length, tr.value.length); } catch (e8) {} } return; }
    if (b.hasAttribute('data-redklar')) { S.redigera = false; track('pgny_andra', { vad: 'uppgift' }); if (!S.raw && ofyllda().length) { tillFyll('klar'); return; } rita(); return; }
    if (b.hasAttribute('data-arkklar')) { S.ark = ''; tillBygg(); return; }
    if (b.hasAttribute('data-exempel')) {
      S.text = EXEMPEL[+b.getAttribute('data-exempel')]; S.typ = null; S.mallNamn = '';
      var ta = root.querySelector('[data-text]'); if (ta) { ta.value = S.text; ta.focus(); }
      ritaTraffar(); return;
    }
    if (b.hasAttribute('data-bygg')) {
      S.raw = '';
      if (!S.text.trim()) { var t2 = root.querySelector('[data-text]'); if (t2) { t2.focus(); t2.setAttribute('placeholder', 'Skriv först vad du vill ha hjälp med, t.ex. ett mejl till en kund …'); } return; }
      S.typ = S.typ || gissaTyp(S.text); S.optIdx = 0; S.besokt = {};
      track('pgny_bygg', { tecken: S.text.length });
      forifyll();
      if (ofyllda().length) { tillFyll('opt'); return; }
      S.steg = 'opt'; rita(); return;
    }
    if (b.hasAttribute('data-favalla')) { S.favAlla = !S.favAlla; rita(); return; }
    if (b.hasAttribute('data-favoppna')) {
      var fslug = b.getAttribute('data-favoppna');
      track('pgny_sparad', { prompt: fslug });
      laddaBibliotek(function (lista) {
        var fp = lista.filter(function (x) { return x.slug === fslug; })[0];
        if (!fp) { location.href = '/ai-prompter/' + encodeURIComponent(fslug); return; }
        S.text = fp.prompt; S.mallNamn = fp.namn; S.typ = fp.typ; S.kalla = 'sparad';
        tillBygg();
      });
      return;
    }
    if (b.hasAttribute('data-mall')) {
      var p = senasteTraffar[+b.getAttribute('data-mall')]; if (!p) return;
      S.text = p.prompt; S.mallNamn = p.namn; S.typ = p.typ; S.kalla = 'sok';
      track('pgny_mall', { mall: p.slug || p.namn });
      tillBygg(); return;
    }
    if (b.hasAttribute('data-kga') && K) {
      /* Spara svaret direkt om man klickar vidare inom 400 ms */
      var tsv = root.querySelector('[data-kedjasvar]');
      if (tsv) { clearTimeout(svarTimer); var st2 = kLas(), mi2 = kMin(st2), vv = tsv.value.trim(); if (vv) mi2.svar[K.steg] = vv; else delete mi2.svar[K.steg]; mi2.t = new Date().toISOString(); spara(KEDJA, st2); }
      kVisaSteg(+b.getAttribute('data-kga')); return;
    }
    if (b.hasAttribute('data-fyllklar')) { fyllKlar(); return; }
    if (b.hasAttribute('data-tillfyll')) { track('pgny_andra', { vad: 'fyll' }); tillFyll('klar'); return; }
    if (b.hasAttribute('data-typvaxla')) { S.typOppen = !S.typOppen; rita(); return; }
    if (b.hasAttribute('data-typ')) { S.typ = b.getAttribute('data-typ'); S.optIdx = 0; S.typOppen = false; track('pgny_andra', { vad: 'typ' }); rita(); return; }
    if (b.hasAttribute('data-tillstart')) { S.steg = 'start'; S.raw = ''; rita(); var t3 = root.querySelector('[data-text]'); if (t3) t3.focus(); return; }
    if (b.hasAttribute('data-gaopt')) { if (S.steg === 'klar') track('pgny_andra', { vad: 'steg' }); S.steg = 'opt'; S.optIdx = +b.getAttribute('data-gaopt'); S.typOppen = false; rita(); return; }
    if (b.hasAttribute('data-val')) {
      var key = b.getAttribute('data-val'), val = b.getAttribute('data-v');
      var L = lista(), o = L[S.optIdx];
      var vald = S.svar[key] === val;
      S.svar[key] = vald ? '' : val;
      if (key === 'rollEgen') {}
      /* Steg med ett enda val (Läsare/Ton/Roll) går vidare automatiskt */
      if (!vald && !S.alla && o && o.auto && o.grupper[0].key === key) { rita(); setTimeout(function () { nastaFran(S.optIdx, false); }, snabb ? 0 : 260); return; }
      rita(); return;
    }
    if (b.hasAttribute('data-egenny')) {
      S.svar.egna = Array.isArray(S.svar.egna) ? S.svar.egna : [];
      S.svar.egna.push({ namn: '', varde: '' }); rita();
      var nya = root.querySelector('[data-egen="' + (S.svar.egna.length - 1) + '"][data-del="namn"]'); if (nya) nya.focus();
      return;
    }
    if (b.hasAttribute('data-egenbort')) { S.svar.egna.splice(+b.getAttribute('data-egenbort'), 1); rita(); return; }
    if (b.hasAttribute('data-multi')) {
      var k2 = b.getAttribute('data-multi'), v2 = b.getAttribute('data-v');
      var arr = Array.isArray(S.svar[k2]) ? S.svar[k2].slice() : [];
      var i = arr.indexOf(v2); if (i === -1) arr.push(v2); else arr.splice(i, 1);
      S.svar[k2] = arr; rita(); return;
    }
    if (b.hasAttribute('data-senvisa')) { var iv = +b.getAttribute('data-senvisa'); S.senVisa = S.senVisa === iv ? -1 : iv; rita(); return; }
    if (b.hasAttribute('data-senalla')) { S.senAlla = !S.senAlla; S.senVisa = -1; rita(); return; }
    if (b.hasAttribute('data-senrensa')) {
      if (!S.senRensa) { S.senRensa = true; rita(); setTimeout(function () { if (S.senRensa) { S.senRensa = false; rita(); } }, 4000); return; }
      try { localStorage.removeItem(RECENT_KEY); } catch (er) {}
      S.senRensa = false; S.senVisa = -1; S.senOppen = false; track('pgny_senaste', { vad: 'rensa' }); rita(); return;
    }
    if (b.hasAttribute('data-senkopiera')) {
      var pk2 = lasSenaste()[+b.getAttribute('data-senkopiera')]; if (!pk2) return;
      var txt = pk2.text;
      var lyckat = function () { b.textContent = 'Kopierad ✓'; setTimeout(function () { b.textContent = 'Kopiera'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(lyckat, lyckat); else lyckat();
      track('pgny_senaste', { vad: 'kopiera' }); return;
    }
    if (b.hasAttribute('data-senoppna')) {
      var pk3 = lasSenaste()[+b.getAttribute('data-senoppna')]; if (!pk3) return;
      clearTimeout(timer); timer = null;
      S.raw = pk3.text; S.typ = TYP_ALIAS[pk3.tasktype] || pk3.tasktype || 'skriva'; if (!TYP_ETIKETT[S.typ]) S.typ = 'skriva';
      S.steg = 'klar'; S.kopierad = S.harKop = false; S.fin = false; S.senOppen = false; S.senVisa = -1; S.mallNamn = '';
      track('pgny_senaste', { vad: 'anvand' }); rita(); return;
    }
    if (b.hasAttribute('data-nasta')) { nastaFran(S.optIdx, false); return; }
    if (b.hasAttribute('data-hoppa')) { nastaFran(S.optIdx, true); return; }
    if (b.hasAttribute('data-kopiera')) { kopiera(); return; }
    if (b.hasAttribute('data-borjaom')) {
      var bevara = { foretag: S.svar.foretag, produkt: S.svar.produkt };
      S.steg = 'start'; S.text = ''; S.typ = null; S.svar = {}; S.mallNamn = ''; S.kopierad = S.harKop = false; S.fin = false; S.sa = false; S.kalla = 'scratch'; S.raw = ''; S.senVisa = -1; S.senRensa = false; S.senOppen = false; S.fyll = {}; S.forifyllt = {};
      if (bevara.foretag) S.svar.foretag = bevara.foretag; if (bevara.produkt) S.svar.produkt = bevara.produkt;
      if (K) { K = null; try { history.replaceState(null, '', location.pathname); sessionStorage.removeItem('pg_chain'); } catch (e2) {} }
      track('pgny_ny', {}); rita(); var t4 = root.querySelector('[data-text]'); if (t4) t4.focus(); return;
    }
    if (b.hasAttribute('data-vaxla')) { var w = b.getAttribute('data-vaxla'); S[w] = !S[w]; rita(); return; }
  });
  /* Fasta knappen ligger också i root */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bar]');
    if (!b) return;
    if (S.steg === 'klar') kopiera();
    else if (S.steg === 'fyll') fyllKlar();
    else if (S.steg === 'bygger') tillKlar();
    else if (S.steg === 'opt' && window.matchMedia && window.matchMedia('(max-width: 1099px)').matches) { S.ark = 'prompt'; track('pgny_visa', { fran_steg: (lista()[S.optIdx] || {}).kort || '', vad: 'panel' }); rita(); var ak = root.querySelector('[data-arkklar]'); if (ak) { try { ak.focus({ preventScroll: true }); } catch (e6) {} } }
    else { track('pgny_visa', { fran_steg: (lista()[S.optIdx] || {}).kort || '' }); tillBygg(); }
  });

  track('pgny_open', { med_brief: S.text ? 1 : 0, platshallare: phParse(S.text).length, kedja: K ? 1 : 0 });
  rita();
  if (K) { if (S.text) kTrack('pgny_kedja_steg', {}); kHamta(); }
})();
