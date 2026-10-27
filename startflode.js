/* ============================================================
   AIMonkey — startflode.js
   Startsidan "välj yrke först" (designen "Startsidan – välj yrke först").

   Två lägen. data-sf-lage="hybrid" på roten: yrkeschipsen ligger i den
   befintliga heron och guiden (steg 2–3) visas först när ett yrke väljs.
   Annars (helsida): steg 1 ligger som riktiga element i Webflow: H1, ingress och åtta
   yrkeslänkar <a data-sf-roll="…" href="/ai-for-…">. Utan JS leder
   länkarna till yrkets pillarsida. Med JS väljer de yrke i stället, och
   skriptet ritar steg 2 (tre vägar) och steg 3 (prompter, flöde eller
   AI-team) i [data-sf="steg2"] och [data-sf="steg3"].

   Valet sparas i adressen (?yrke=…&vag=…) så att en vy går att länka till.
   Prompterna hämtar namn, beskrivning och prompttext från /prompt-data.
   Använder pg-fyll.js (window.AimFyll) för fältantal och "senast kopierade"
   om det finns.

   Mätning (GTM-triggern ^pb_): pb_start_roll, pb_start_vag,
   pb_start_kopiera, pb_start_oppna, pb_start_sok.
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimSf) return;
  var ROT = document.querySelector('[data-sf="rot"]');
  if (!ROT) return;
  window.__aimSf = true;

  /* ---------- Innehåll per yrke ---------- */
  var SKILL = {
    mail: ['Mailmästaren', 'Svarar på mejl i din ton, varje gång.', '/ai-skills/mailmastaren'],
    brand: ['Brand Voice', 'Lär AI:n att låta som du.', '/ai-skills/brand-voice'],
    recension: ['Recensionssvararen', 'Svarar på recensioner i din ton.', '/ai-skills/recensionssvararen'],
    mote: ['Möteskartan', 'Agenda före mötet, beslut och ansvariga efter.', '/ai-skills/moteskartan'],
    kundtjanst: ['Kundtjänst-mästaren', 'Svarar kunder snabbt med rätt ton.', '/ai-skills/kundtjanst-mastaren'],
    sprak: ['Språkgranskaren', 'Rättar och stramar upp dina texter.', '/ai-skills/sprakgranskaren']
  };
  /* fas: [etikett, namn, mall, länk, snart] */
  var R = {
    saljare: {
      namn: 'Säljare', namnLiten: 'säljare', pillar: ['AI för säljare', '/ai-for-saljare'],
      ingress: 'Har du ett mejl som ska ut nu, en hel säljprocess att vässa eller vill du ha en säljassistent som kan dina kunder?',
      prompter: ['sammanfatta-saljmote-till-crm', 'cold-mejl-utifran-kundkort', 'tre-svar-pa-saljinvandning', 'winback-mejl-till-inaktiv-kund'],
      flode: { namn: 'Säljarresan', meta: '6 faser · 10 stegmallar',
        text: 'Sex faser i den ordning en affär faktiskt går. Svaret från ett steg följer med till nästa, och dina uppgifter fylls i automatiskt.',
        cta: ['Börja med fas 1: Kundkartläggaren →', '/ai-mallar/kundkartlaggaren'], lank: ['Se hela säljarresan', '/ai-for-saljare#resan'],
        faser: [['Fas 1', 'Kartlägg kunden', 'Kundkartläggaren', '/ai-mallar/kundkartlaggaren'],
          ['Fas 2', 'Anpassa erbjudandet', 'Erbjudandeformaren', '/ai-mallar/erbjudandeformaren'],
          ['Fas 3', 'Kontakta kunden', 'Cold outreach-sekvensen', '/ai-mallar/cold-outreach-sekvensen'],
          ['Fas 4', 'Mötet', 'Presentationsberättaren + Invändningshanteraren', '/ai-for-saljare#fas-4'],
          ['Fas 5', 'Offert och förhandling', 'Pitch-polisheraren + Prisförhandlaren', '/ai-for-saljare#fas-5'],
          ['Fas 6', 'Efter affären', 'Säljmötes-uppföljaren', '/ai-mallar/saljmotes-uppfoljaren']] },
      paket: [['Säljassistenten', 'En AI som kan ditt erbjudande, dina kunder och din säljprocess.', 'CRM, mejl, kalender', '/projektpaket/saljassistenten']],
      skills: ['mail', 'brand'], teamMeta: 'Säljassistenten + 2 AI-skills',
      apan: 'Börja med fas 1, även om det kliar i fingrarna att skicka mejl direkt. Ett bra kundkort gör att allt efter det skriver sig nästan självt.'
    },
    smaforetagare: {
      namn: 'Småföretagare', namnLiten: 'småföretagare', pillar: ['AI för småföretagare', '/ai-for-smaforetagare'],
      ingress: 'Du gör allt själv, så tiden är det viktiga. Vill du lösa en sak nu, ta en avdelning i taget eller ge AI:n koll på hela företaget?',
      prompter: ['svar-pa-google-recension', 'vanlig-betalningspaminnelse', 'lokal-seo-text-for-tjanstefotag', 'mandagsplan-med-ai'],
      flode: { namn: 'Din AI-avdelning', meta: '6 delar · en i taget',
        text: 'Sex delar av företaget, en i taget. Har du bara en kvart i veckan? Börja med del 4, kunderna.',
        cta: ['Börja med del 1: Din företagsprofil →', '/ai-mallar/brand-voice-byggaren'], lank: ['Se hela AI-avdelningen', '/ai-for-smaforetagare#resan'],
        faser: [['Del 1', 'Din företagsprofil', 'Brand Voice-byggaren', '/ai-mallar/brand-voice-byggaren'],
          ['Del 2', 'Bli synlig', 'Lokala kunder via Google', '/ai-mallar/lokala-kunder-via-google'],
          ['Del 3', 'Sälj', 'Kundkartläggaren', '/ai-mallar/kundkartlaggaren'],
          ['Del 4', 'Ta hand om kunderna', 'Recensionssvararen', '/ai-mallar/recensionssvararen'],
          ['Del 5', 'Ekonomi och admin', 'Adminhjälpen', '/ai-mallar/adminhjalpen'],
          ['Del 6', 'Planera och växa', 'Veckoplaneraren', '/ai-mallar/veckoplaneraren']] },
      paket: [['Småföretagets AI-avdelning', 'En AI som kan ditt företag, dina tjänster och din ton.', 'dokument, mejl, kalender', '/projektpaket/smaforetagets-ai-avdelning'],
        ['Kundtjänst för webbshopen', 'Svarar kunder snabbt med rätt info om beställningar.', 'webbutiken, mejl', '/projektpaket/kundtjanst-for-webbshopen']],
      skills: ['recension', 'brand', 'mail'], teamMeta: '2 projektmallar + 3 AI-skills',
      apan: 'Gör Brand Voice-byggaren först. Den tar en halvtimme och gör att allt AI:n skriver därefter låter som ditt företag, inte som en robot.'
    },
    marknad: {
      namn: 'Marknadsförare', namnLiten: 'marknadsförare', pillar: ['AI för marknadsföring', '/ai-for-marknadsforing-sociala-medier'],
      ingress: 'Ett inlägg som ska ut i dag, en hel månads innehåll eller en innehållsmaskin som rullar på?',
      prompter: ['linkedin-inlagg-som-skapar-engagemang', 'instagram-bildtext-med-cta', 'skriv-engagerande-nyhetsbrev', 'youtube-manus-fran-a-till-o'],
      flode: { namn: 'Marknadsförarresan', meta: '6 faser · 4 stegmallar',
        text: 'Från din röst till en kampanj som syns. De fyra första faserna är stegflöden där svaret följer med till nästa steg.',
        cta: ['Börja med fas 1: Brand Voice-byggaren →', '/ai-mallar/brand-voice-byggaren'], lank: ['Se hela marknadsförarresan', '/ai-for-marknadsforing-sociala-medier#resan'],
        faser: [['Fas 1', 'Röst och målgrupp', 'Brand Voice-byggaren', '/ai-mallar/brand-voice-byggaren'],
          ['Fas 2', 'Planera innehållet', '30 dagars innehållsmaskin', '/ai-mallar/30-dagars-innehallsmaskin-for-sociala-medier'],
          ['Fas 3', 'Nyhetsbrevet', 'Nyhetsbrevs-maskinen', '/ai-mallar/nyhetsbrevs-maskinen'],
          ['Fas 4', 'Kampanjen', 'Kampanjarkitekten', '/ai-mallar/kampanjarkitekten-fran-kundpsykologi-till-konverterande-annonser'],
          ['Fas 5', 'Annonsera', 'Meta och Google Ads', '/ai-mallar/ai-for-meta-ads-och-google-ads-2026', 1],
          ['Fas 6', 'Synas på Google', 'SEO-artikeln', '/ai-mallar/seo-artikeln-fran-sokordsanalys-till-top-1-pa-google', 1]] },
      paket: [['Innehållsmaskinen', 'En AI som planerar och skriver innehåll i din ton.', 'Canva, dokument', '/projektpaket/innehallsmaskinen']],
      skills: ['brand', 'sprak'], teamMeta: 'Innehållsmaskinen + 2 AI-skills',
      apan: 'Innehållsmaskinen är min favorit här. När AI:n väl kan din ton går ett veckoinlägg på fem minuter i stället för en timme.'
    },
    chef: {
      namn: 'Chef och teamledare', namnLiten: 'chefer', pillar: ['AI för chefer', '/ai-for-chefer'],
      ingress: 'En agenda till mötet om tio minuter, ett bättre sätt att leda teamet eller en assistent för hela ledarjobbet?',
      prompter: ['skapa-motesagenda', 'ge-konstruktiv-feedback-medarbetare', 'morgonsortering-av-inkorgen', 'far-jag-gora-det-har-med-ai'],
      flode: { namn: 'Chefsresan', meta: '6 faser · 4 stegmallar',
        text: 'Från rekrytering till resultat. Rekrytering, onboarding, möten och återkoppling är stegflöden där svaret följer med till nästa steg.',
        cta: ['Börja med fas 1: Rekryterings-paketet →', '/ai-mallar/rekryterings-paketet'], lank: ['Se hela chefsresan', '/ai-for-chefer#resan'],
        faser: [['Fas 1', 'Rekrytera', 'Rekryterings-paketet', '/ai-mallar/rekryterings-paketet'],
          ['Fas 2', 'Ta emot nya', 'Onboarding-arkitekten', '/ai-mallar/onboarding-arkitekten'],
          ['Fas 3', 'Möten', 'Möteskartan', '/ai-mallar/moteskartan'],
          ['Fas 4', 'Återkoppling', 'Återkopplings-mallen', '/ai-mallar/aterkopplings-mallen-konstruktiv-feedback-till-team'],
          ['Fas 5', 'Följ upp resultaten', 'KPI-rapporten', '/ai-mallar/kpi-rapporten-fran-excel-kaos-till-chefsklar-rapport', 1],
          ['Fas 6', 'AI i teamet', 'AI-policyn', '/ai-mallar/ai-policyn', 1]] },
      paket: [], snartNamn: 'Ledarassistenten',
      skills: ['mail', 'mote'], teamMeta: 'Projektmall på väg · 2 AI-skills', teamSnart: true,
      apan: 'Börja med Möteskartans första steg: behövs mötet alls? Det enklaste sättet att spara tid är mötet som aldrig blev av.'
    },
    skribent: {
      namn: 'Skribent och kreatör', namnLiten: 'kreatörer', pillar: ['AI för skapande', '/ai-for-skapande-bildgenerering'],
      ingress: 'En bild eller text nu, ett eget sätt att jobba med AI eller en AI som kan din stil?',
      prompter: ['skriv-i-min-rost-daglig-anvandning', 'generera-midjourney-prompt-for-realistiskt-portratt', 'youtube-manus-fran-a-till-o', 'skriv-hooks-for-inlagg'],
      flode: { namn: 'Skribent och kreatör', meta: '1 stegmall i dag · fler på väg',
        text: 'Din röst är grunden för allt annat. Resten av resan byggs nu, men mallarna går redan att använda.',
        cta: ['Börja med Brand Voice-byggaren →', '/ai-mallar/brand-voice-byggaren'], lank: ['Se allt för skapande', '/ai-for-skapande-bildgenerering'],
        faser: [['Fas 1', 'Din röst', 'Brand Voice-byggaren', '/ai-mallar/brand-voice-byggaren'],
          ['Fas 2', 'Research', 'Research-mästaren', '/ai-mallar/research-mastaren', 1],
          ['Fas 3', 'Din bildstil', 'Stil-profileren', '/ai-mallar/stil-profileren', 1],
          ['Fas 4', 'Publicera och synas', 'SEO-artikeln', '/ai-mallar/seo-artikeln-fran-sokordsanalys-till-top-1-pa-google', 1]] },
      paket: [], snartNamn: 'Skrivverkstaden',
      skills: ['brand', 'sprak'], teamMeta: 'Projektmall på väg · 2 AI-skills', teamSnart: true,
      apan: 'Lägg tio minuter på din röstprofil innan du ber AI:n skriva något. Annars får du text som låter som alla andras.'
    },
    plugg: {
      namn: 'Student och plugg', namnLiten: 'studenter', pillar: ['Pluggcoachen', '/ai-mallar/pluggcoachen'],
      ingress: 'En snabb förklaring nu, en plan inför tentan eller en pluggkompis som kan din kurs?',
      prompter: ['studieplan-for-en-kurs-eller-tentamen', 'skapa-flashcards-for-plugg', 'forklara-nagot-svart-enkelt', 'skapa-ett-prov-eller-quiz-med-ratta-svar'],
      flode: { namn: 'Pluggcoachen', meta: 'Guide i dag · stegflöde på väg',
        text: 'Pluggcoachen finns som guide och blir snart ett stegflöde.',
        cta: ['Öppna Pluggcoachen →', '/ai-mallar/pluggcoachen'], lank: ['Se alla mallar', '/ai-mallar'],
        faser: [['Steg 1', 'Planera terminen', 'Pluggcoachen', '/ai-mallar/pluggcoachen', 1],
          ['Steg 2', 'Förstå materialet', 'Pluggcoachen', '/ai-mallar/pluggcoachen', 1],
          ['Steg 3', 'Öva inför tentan', 'Pluggcoachen', '/ai-mallar/pluggcoachen', 1]] },
      paket: [], snartNamn: 'Pluggkompisen',
      skills: ['sprak', 'mail'], teamMeta: 'Pluggkompisen kommer snart', teamSnart: true,
      apan: 'Låt AI:n förhöra dig i stället för att sammanfatta åt dig. Det är när du själv måste svara som det fastnar.'
    },
    ny: {
      namn: 'Ny på AI', namnLiten: 'nybörjare', pillar: ['AI för nybörjare', '/ai-for-nyborjare'],
      ingress: 'Ingen fara, alla började här. Testa en prompt nu, följ nybörjarresan eller vänta med AI-teamet tills du kommit igång.',
      prompter: ['planera-veckans-middagar', 'skriv-mejl-fran-stickord', 'forsta-krangligt-brev-avtal', 'lat-ai-fraga-tillbaka'],
      flode: { namn: 'Nybörjarresan', meta: '5 faser · börja på 15 minuter',
        text: 'En liten uppgift om dagen. Efter en vecka vet du vad AI är bra på, och vad du ska dubbelkolla.',
        cta: ['Börja med fas 1: Startrutinen →', '/ai-mallar/nyborjarens-ai-startrutin'], lank: ['Se hela nybörjarresan', '/ai-for-nyborjare#resan'],
        faser: [['Fas 1', 'Första veckan', 'Nybörjarens AI-startrutin', '/ai-mallar/nyborjarens-ai-startrutin'],
          ['Fas 2', 'Ställ frågan rätt', 'Fråge-mallen', '/ai-mallar/fragemallen-stall-fragan-ratt'],
          ['Fas 3', 'Lita lagom', 'Faktakollen', '/ai-mallar/faktakollen'],
          ['Fas 4', 'Gör AI:n till din', 'Brand Voice-byggaren', '/ai-mallar/brand-voice-byggaren'],
          ['Fas 5', 'Välj din väg', 'Hitta ditt yrke', '/ai-for-nyborjare#fas-5']] },
      paket: [], snartNamn: 'Vänta lite med den här',
      snartText: 'Ett AI-team gör mest nytta när du vet vad du vill använda AI till. Kör nybörjarresan först, och kom tillbaka efter första veckan.',
      skills: ['brand'], teamMeta: 'Rekommenderas efter första veckan', teamSnart: true,
      apan: 'Du kan inte göra fel här. Det värsta som händer är ett dåligt svar, och då frågar du bara igen.'
    },
    annat: {
      namn: 'Något annat', namnLiten: 'dig', pillar: ['Promptgeneratorn', '/promptgeneratorn'],
      ingress: 'Hittar du inte ditt yrke? Välj hur du vill jobba, så tar Promptgeneratorn hand om resten.',
      generator: true,
      prompter: ['skriv-mejl-fran-stickord', 'mandagsplan-med-ai', 'forklara-nagot-svart-enkelt'],
      flode: { namn: 'Populära flöden', meta: 'Stegflöden för mejl, möten och planering',
        text: 'Bläddra bland stegflödena och välj det som liknar ditt jobb mest.',
        cta: ['Se alla mallar →', '/ai-mallar'], lank: ['Öppna Promptgeneratorn', '/promptgeneratorn'],
        faser: [['Populärt', 'Mejl', 'Mailmästaren', '/ai-mallar/mailmastaren'],
          ['Populärt', 'Möten', 'Möteskartan', '/ai-mallar/moteskartan'],
          ['Populärt', 'Planering', 'Veckoplaneraren', '/ai-mallar/veckoplaneraren'],
          ['Populärt', 'Kunder', 'Recensionssvararen', '/ai-mallar/recensionssvararen']] },
      paket: [['Småföretagets AI-avdelning', 'Funkar som grund för de flesta jobb. Byt ut texterna mot ditt.', 'dokument, mejl, kalender', '/projektpaket/smaforetagets-ai-avdelning']],
      skills: ['mail', 'brand', 'sprak'], teamMeta: 'Projektmall + 3 AI-skills',
      apan: 'Saknar du ditt yrke? Skriv det i generatorn. Det du skriver där hjälper oss att välja vilket yrke vi bygger härnäst.'
    }
  };
  var APAN_START = 'Du behöver inte veta vad du letar efter. Säg vad du jobbar med, så pekar jag ut tre bra ställen att börja på. Banan på det.';

  /* ---------- Stil ---------- */
  var CSS = [
    '.sf{color:#0b1f3b}',
    '.sf-wrap{max-width:1230px;margin:0 auto;padding:0 32px;box-sizing:border-box}',
    '.sf-hero{background:linear-gradient(160deg,#eaf5f8 0%,#d7e6f1 100%)}',
    '.sf-hero-in{display:flex;flex-wrap:wrap;align-items:flex-start;gap:32px;padding-top:44px;padding-bottom:52px}',
    '.sf-hero-text{flex:999 1 600px;min-width:0;display:flex;flex-direction:column;gap:18px}',
    '.sf-hero-bild{flex:1 1 360px;min-width:0;display:flex;justify-content:center}',
    '.sf-hero-bild img{width:100%;max-width:440px;height:auto;border-radius:28px}',
    '.sf-stegrad{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:8px}',
    '.sf-stegrad li{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;padding:6px 14px 6px 6px;border-radius:999px;background:rgba(255,255,255,.7);color:#33435a;margin:0}',
    '.sf-stegrad li span{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:13px;background:#dfe6ee;color:#33435a}',
    '.sf-stegrad li.is-akt{background:#0b1f3b;color:#fff}',
    '.sf-stegrad li.is-akt span{background:#ffd23f;color:#0b1f3b}',
    '.sf-stegrad li.is-klar span{background:#00a085;color:#fff}',
    '.sf h1.sf-h1{margin:0;font-size:64px;font-weight:700;letter-spacing:-1.5px;line-height:1.02;color:#0b1f3b}',
    '.sf-h1 em{font-style:normal;color:#00a085}',
    '.sf-ingress{margin:0;font-size:19px;line-height:1.55;color:#33435a;max-width:600px}',
    '.sf-roller{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:10px;margin-top:4px}',
    '.sf-roll{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;min-height:84px;padding:14px 16px;border-radius:16px;cursor:pointer;color:#0b1f3b;text-decoration:none;border:2px solid transparent;background:#fff;box-shadow:0 4px 14px -10px rgba(11,31,59,.3);box-sizing:border-box;transition:border-color .15s}',
    '.sf-roll:hover{border-color:#00a085;color:#0b1f3b}',
    '.sf-roll[aria-checked="true"]{border-color:#00a085;background:#e5f9f6;box-shadow:0 8px 20px -10px rgba(0,121,107,.5)}',
    '.sf-roll-namn{font-weight:700;font-size:17px;line-height:1.2}',
    '.sf-roll-kort{font-size:13px;line-height:1.4;color:#4a5a70}',
    '.sf-sok{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:6px 0 0}',
    '.sf-sok label{font-size:15px;font-weight:600;color:#33435a;margin:0}',
    '.sf-sok-falt{display:flex;gap:6px;background:#fff;border-radius:12px;padding:5px;flex:1 1 300px;max-width:460px;box-shadow:0 6px 18px -10px rgba(11,31,59,.25)}',
    '.sf-sok input{flex-grow:1;min-width:0;border:0;outline:none;font:inherit;font-size:15px;padding:9px 10px;background:transparent;color:#0b1f3b;margin:0;height:auto}',
    '.sf-sok button{background:#0b1f3b;color:#fff;border:0;border-radius:9px;padding:0 16px;font:inherit;font-weight:600;font-size:14px;cursor:pointer}',
    '.sf-sek-steg{padding-top:56px;padding-bottom:8px}',
    '.sf-tom{border:2px dashed #c9d3df;border-radius:22px;padding:36px 28px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}',
    '.sf-etikett{font-size:13px;font-weight:700;letter-spacing:1px;color:#00796b;text-transform:uppercase}',
    '.sf-tom .sf-etikett{color:#5b6b80}',
    '.sf-tom strong{font-size:26px}',
    '.sf-tom p,.sf-steg-text{margin:0;color:#4a5a70;font-size:16px;line-height:1.55}',
    '.sf-steg-huvud{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:22px}',
    '.sf-steg-huvud>div{display:flex;flex-direction:column;gap:8px}',
    '.sf h2.sf-h2{margin:0;font-size:40px;line-height:1.1;color:#0b1f3b}',
    '.sf h2.sf-h2-3{font-size:34px;line-height:1.15}',
    '.sf-byt{background:transparent;border:0;font:inherit;font-weight:600;font-size:15px;color:#005042;cursor:pointer;padding:10px 0;text-decoration:underline}',
    '.sf-vagar{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}',
    '.sf-vag{display:flex;flex-direction:column;align-items:flex-start;gap:10px;text-align:left;padding:22px;border-radius:22px;cursor:pointer;font:inherit;color:#0b1f3b;min-height:236px;border:2px solid #e3e7ee;background:#fff;transition:box-shadow .15s}',
    '.sf-vag:hover{box-shadow:0 12px 28px -10px rgba(11,31,59,.22)}',
    '.sf-vag[aria-checked="true"]{border-color:#00a085;background:#f2fcfa}',
    '.sf-pillrad{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.sf-pill{font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#005042;background:#e5f9f6;padding:4px 10px;border-radius:999px}',
    '.sf-pill-snart{color:#6b4e00;background:#fff3c4;letter-spacing:0;text-transform:none}',
    '.sf-vag-titel{font-weight:700;font-size:24px;line-height:1.15}',
    '.sf-vag-text{font-size:15px;line-height:1.5;color:#4a5a70}',
    '.sf-vag-meta{font-size:14px;font-weight:600;border-top:1px solid #e3e7ee;padding-top:12px;margin-top:auto;align-self:stretch}',
    '.sf-sek-3{padding-top:44px;padding-bottom:8px;scroll-margin-top:90px}',
    '.sf-ruta{background:#fff;border:1px solid #e3e7ee;border-radius:26px;padding:32px;display:flex;flex-direction:column;gap:22px}',
    '.sf-ruta>header{display:flex;flex-direction:column;gap:8px}',
    '.sf-kortrad{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;text-align:left}',
    '.sf-kortrad .st-kort{height:100%}',
    '.sf-kortrad .st-knappar{flex-wrap:wrap}',
    '.sf-kortrad .st-prim{flex:1 1 160px;white-space:nowrap;padding:0 12px;min-width:0}',
    '.sf-kortrad .st-sek{flex:1 1 auto}',
    '.sf-kortrad .st-sek{min-height:44px;padding:0 14px;border-radius:10px;border:1.5px solid #cfd6e0;background:#fff;color:#0b1f3b;font:inherit;font-size:14px;font-weight:600;cursor:pointer}',
    '.sf-kortrad .st-sek:hover{border-color:#00a085}',
    '.sf-gen{background:#0b1f3b!important;color:#fff}',
    '.sf-gen .st-kort-lank,.sf-gen .st-kort-titel{color:#fff!important}',
    '.sf-gen .st-kort-desc{color:#c9d6e6!important}',
    '.sf-faser{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}',
    '.sf-fas{margin:0}',
    '.sf-fas a{display:flex;flex-direction:column;gap:6px;height:100%;box-sizing:border-box;padding:18px;border-radius:16px;border:1.5px solid #d5ece8;background:#fff;color:#0b1f3b;text-decoration:none;transition:border-color .15s}',
    '.sf-fas a:hover{border-color:#00a085}',
    '.sf-fas:first-child a{background:#e5f9f6}',
    '.sf-fas.is-snart a{border-style:dashed;border-color:#c9d3df;background:#fafbfc}',
    '.sf-fas-etikett{font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#00796b}',
    '.sf-fas-namn{font-weight:700;font-size:18px;line-height:1.25}',
    '.sf-fas-mall{font-size:14px;color:#4a5a70;line-height:1.45}',
    '.sf-fas .sf-pill-snart{align-self:flex-start;font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px}',
    '.sf-cta-rad{display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center}',
    '.sf-cta{background:#00a085;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:600;font-size:16px}',
    '.sf-cta:hover{background:#00796b;color:#fff}',
    '.sf-lank{font-weight:600;font-size:15px;color:#005042}',
    '.sf-team{display:flex;flex-wrap:wrap;gap:16px}',
    '.sf-team-paket{flex:1 1 360px;min-width:0;background:#0b1f3b;color:#fff;border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:14px}',
    '.sf-team-paket .sf-etikett{color:#ffd23f;font-size:12px;letter-spacing:.8px}',
    '.sf-paket{display:flex;flex-direction:column;gap:6px}',
    '.sf-paket strong{font-size:24px;line-height:1.2}',
    '.sf-paket a{color:#fff;text-decoration:none}',
    '.sf-paket span{font-size:14px;color:#c9d6e6;line-height:1.5}',
    '.sf-gul{align-self:flex-start;background:#ffd23f;color:#0b1f3b!important;text-decoration:none;padding:13px 20px;border-radius:12px;font-weight:700;font-size:15px}',
    '.sf-gul-lank{align-self:flex-start;color:#ffd23f!important;font-weight:600;font-size:15px}',
    '.sf-team-skills{flex:1 1 360px;min-width:0;border:1.5px solid #e3e7ee;border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:12px}',
    '.sf-team-skills .sf-etikett{font-size:12px;letter-spacing:.8px}',
    '.sf-team-skills ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}',
    '.sf-team-skills li{display:flex;flex-direction:column;gap:3px;padding-bottom:10px;border-bottom:1px solid #eef1f5;margin:0}',
    '.sf-team-skills li a{font-weight:700;font-size:17px;color:#0b1f3b;text-decoration:none}',
    '.sf-team-skills li a:hover{color:#00796b}',
    '.sf-team-skills li span{font-size:14px;color:#4a5a70}',
    '.sf-fot{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;border-top:1px solid #eef1f5;padding-top:18px}',
    '.sf-fot span{font-size:14px;color:#4a5a70}',
    '.sf-fot a{font-weight:700;font-size:15px;color:#005042}',
    '.sf-apan-sek{padding-top:56px;padding-bottom:72px}',
    '.sf-apan{margin:0;background:#0b1f3b;color:#fff;border-radius:24px;padding:28px 30px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;border:0}',
    '.sf-apan img{width:72px;height:72px;object-fit:cover;border-radius:50%}',
    '.sf-apan-text{flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:6px}',
    '.sf-apan-text strong{font-size:20px;color:#ffd23f}',
    '.sf-apan-text p{margin:0;font-size:16px;line-height:1.6;color:#e6edf5}',
    '.sf a:focus-visible,.sf button:focus-visible{outline:3px solid #4cd9c1;outline-offset:2px}',
    '.sf-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;max-width:min(560px,calc(100vw - 32px));padding:14px 18px;border-radius:14px;background:#0b1f3b;color:#fff;box-shadow:0 12px 32px -8px rgba(0,0,0,.4);font-size:15px}',
    '.sf-toast[hidden]{display:none}',
    '.sf-guide{display:none}',
    '.sf-guide.is-open{display:block;background:#f5f6fa}',
    '.sf-guide .sf-sek-steg{padding-top:48px}',
    '.sf-yrken{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px}',
    '.sf-yrken .st-pop-chip[aria-checked="true"]{background:#0b1f3b;color:#fff;border-color:#0b1f3b}',
    '.sf-toast div{display:flex;flex-direction:column;gap:2px;flex:1 1 220px}',
    '.sf-toast span{color:#ced2d7;font-size:14px}',
    '.sf-toast a{color:#ffd23f;font-weight:600;text-decoration:none;white-space:nowrap}',
    '@media (max-width:767px){',
    '.sf-wrap{padding:0 16px}',
    '.sf-hero-bild{display:none}',
    '.sf-hero-in{padding-top:28px;padding-bottom:36px}',
    '.sf h1.sf-h1{font-size:42px;letter-spacing:-1px}',
    '.sf-ingress{font-size:17px}',
    '.sf-roller{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.sf-roll{min-height:0;padding:12px}',
    '.sf-roll-namn{font-size:16px}',
    '.sf h2.sf-h2{font-size:30px}',
    '.sf h2.sf-h2-3{font-size:26px}',
    '.sf-vagar,.sf-kortrad,.sf-faser{grid-template-columns:1fr}',
    '.sf-vag{min-height:0}',
    '.sf-ruta{padding:20px;border-radius:20px}',
    '.sf-kortrad .st-knappar{flex-wrap:wrap}',
    '.sf-kortrad .st-prim{flex:1 1 100%}',
    '.sf-kortrad .st-sek{flex:1 1 auto}',
    '.sf-team-paket,.sf-team-skills{flex-basis:100%}',
    '}'
  ].join('');

  /* ---------- Hjälpare ---------- */
  var F = window.AimFyll || null, DATA = null, laddar = null, toastEl, toastTimer;
  var S = { roll: '', vag: '' };
  var HYBRID = ROT.getAttribute('data-sf-lage') === 'hybrid';
  var el2 = ROT.querySelector('[data-sf="steg2"]'), el3 = ROT.querySelector('[data-sf="steg3"]');
  var apanP = ROT.querySelector('[data-sf="apan"]'), stegrad = ROT.querySelector('[data-sf="stegrad"]');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(event, extra) { window.dataLayer = window.dataLayer || []; var o = { event: event, sida: location.pathname }; for (var k in extra) o[k] = extra[k]; window.dataLayer.push(o); }
  function kortKat(k) { return String(k || '').split(/\s+(?:och|&)\s+/)[0]; }

  function hamtaData() {
    if (DATA) return Promise.resolve(DATA);
    if (laddar) return laddar;
    laddar = fetch('/prompt-data', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html'), d = {}, n = 0;
      [].forEach.call(doc.querySelectorAll('.pg-data-item'), function (it) {
        function t(c) { var e = it.querySelector(c); return e ? e.textContent : ''; }
        var slug = t('.pg-d-slug').trim(); if (!slug) return;
        n++;
        d[slug] = { namn: t('.pg-d-name').trim(), slug: slug, desc: t('.pg-d-desc').trim(), kat: t('.pg-d-cat').trim(), prompt: t('.pg-d-prompt').replace(/\r\n?/g, '\n').trim() };
      });
      d.__antal = n; DATA = d; return d;
    })['catch'](function () { laddar = null; return {}; });
    return laddar;
  }

  function tillKlipp(text, ok, fel) {
    function fallback() {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); var r = document.execCommand('copy'); document.body.removeChild(ta); r ? ok() : fel();
      } catch (e) { fel(); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }
  function toast(titel, text, lankar) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'sf-toast'; toastEl.setAttribute('role', 'status'); toastEl.hidden = true; document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<div><strong>' + esc(titel) + '</strong>' + (text ? '<span>' + esc(text) + '</span>' : '') + '</div>' +
      (lankar || []).map(function (l) { var ext = /^https?:/.test(l.href); return '<a href="' + esc(l.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l.namn) + (ext ? ' ↗' : ' →') + '</a>'; }).join('');
    toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4500);
  }

  /* ---------- Rendering ---------- */
  var VAGAR = [
    { id: 'prompt', tid: 'Har du 5 minuter?', titel: 'Prompta direkt' },
    { id: 'flode', tid: 'Har du en eftermiddag?', titel: 'Följ ett flöde' },
    { id: 'team', tid: 'Vill du bygga ett system?', titel: 'Sätt upp ditt AI-team' }
  ];
  function vagInfo(v, r) {
    if (v.id === 'prompt') return { text: 'De vanligaste prompterna för ' + r.namnLiten + '. Fyll i det som är ditt och kopiera.', meta: (r.prompter.length + (r.generator ? 1 : 0)) + ' prompter att börja med', rubrik: 'Fyll i och kopiera. Klart på fem minuter.' };
    if (v.id === 'flode') return { text: 'Prompter som hänger ihop, steg för steg. Svaret från ett steg följer med till nästa.', meta: r.flode.namn + ' · ' + r.flode.meta, rubrik: r.flode.namn + ', steg för steg' };
    return { text: 'Ett projekt med dina uppgifter och AI-skills som kan ditt jobb. Gör det en gång, spara tid varje vecka.', meta: r.teamMeta, snart: !!r.teamSnart, rubrik: r.teamSnart ? 'Ditt AI-team, steg för steg' : 'Ditt AI-team, klart på 10 minuter' };
  }

  function ritaStegrad() {
    if (!stegrad) return;
    var nu = !S.roll ? 1 : (!S.vag ? 2 : 3);
    [].forEach.call(stegrad.querySelectorAll('li'), function (li, i) {
      var n = i + 1, sp = li.querySelector('span');
      li.classList.toggle('is-akt', n === nu); li.classList.toggle('is-klar', n < nu);
      if (n === nu) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      if (sp) sp.textContent = n < nu ? '✓' : String(n);
    });
  }

  function ritaRoller() {
    [].forEach.call(document.querySelectorAll('[data-sf-roll]'), function (a) {
      a.setAttribute('aria-checked', a.getAttribute('data-sf-roll') === S.roll ? 'true' : 'false');
    });
  }

  function ritaSteg2() {
    var r = R[S.roll];
    if (!r && HYBRID) { el2.innerHTML = ''; return; }
    if (!r) {
      el2.innerHTML = '<div class="sf-tom"><span class="sf-etikett">Steg 2</span><strong>Hur vill du jobba?</strong>' +
        '<p>Välj ett yrke ovanför, så dyker tre vägar upp här: prompta direkt, följ ett flöde eller sätt upp ditt AI-team.</p></div>';
      return;
    }
    el2.innerHTML = '<div class="sf-steg-huvud"><div><span class="sf-etikett">Steg 2 · ' + esc(r.namn) + '</span>' +
      '<h2 class="sf-h2">Hur vill du jobba?</h2><p class="sf-steg-text">' + esc(r.ingress) + '</p></div>' +
      '<button type="button" class="sf-byt" data-sf-gor="byt">Byt yrke</button></div>' +
      '<div class="sf-vagar" role="radiogroup" aria-label="Välj väg">' + VAGAR.map(function (v) {
        var i = vagInfo(v, r);
        return '<button type="button" role="radio" class="sf-vag" data-sf-vag="' + v.id + '" aria-checked="' + (S.vag === v.id) + '">' +
          '<span class="sf-pillrad"><span class="sf-pill">' + esc(v.tid) + '</span>' + (i.snart ? '<span class="sf-pill sf-pill-snart">Kommer snart</span>' : '') + '</span>' +
          '<span class="sf-vag-titel">' + esc(v.titel) + '</span><span class="sf-vag-text">' + esc(i.text) + '</span>' +
          '<span class="sf-vag-meta">' + esc(i.meta) + '</span></button>';
      }).join('') + '</div>';
  }

  function promptKort(p) {
    var falt = F && F.parse ? F.parse(p.prompt, {}).length : 0;
    var url = '/ai-prompter/' + encodeURIComponent(p.slug);
    return '<article class="st-kort" data-sf-slug="' + esc(p.slug) + '">' +
      '<div class="st-etiketter">' + (p.kat ? '<span class="st-e">' + esc(kortKat(p.kat)) + '</span>' : '') +
        (falt ? '<span class="st-e st-e-falt">' + falt + ' fält att fylla i</span>' : '') + '</div>' +
      '<h3 class="st-kort-titel"><a class="st-kort-lank" href="' + url + '">' + esc(p.namn) + '</a></h3>' +
      (p.desc ? '<p class="st-kort-desc">' + esc(p.desc) + '</p>' : '') +
      '<div class="st-knappar"><a class="st-prim" href="' + url + '">Fyll i och kopiera →</a>' +
        (p.prompt ? '<button type="button" class="st-sek" data-sf-gor="kopiera">Kopiera</button>' : '') + '</div></article>';
  }
  function genKort() {
    return '<article class="st-kort sf-gen"><div class="st-etiketter"><span class="st-e">Promptgeneratorn</span></div>' +
      '<h3 class="st-kort-titel"><a class="st-kort-lank" href="/promptgeneratorn">Bygg en egen prompt i generatorn</a></h3>' +
      '<p class="st-kort-desc">Skriv vad du vill göra, så får du en färdig expertprompt på svenska.</p>' +
      '<div class="st-knappar"><a class="st-prim" href="/promptgeneratorn">Öppna generatorn →</a></div></article>';
  }

  function innehallPrompt(r) {
    var html = '<div class="sf-kortrad" data-sf="kort">' + (r.generator ? genKort() : '') + '</div>';
    setTimeout(function () {
      hamtaData().then(function (d) {
        var box = el3.querySelector('[data-sf="kort"]'); if (!box || S.vag !== 'prompt' || R[S.roll] !== r) return;
        box.innerHTML = (r.generator ? genKort() : '') + r.prompter.map(function (s) { return d[s] ? promptKort(d[s]) : ''; }).join('');
      });
    }, 0);
    return html;
  }
  function innehallFlode(r) {
    var f = r.flode;
    return '<p class="sf-steg-text">' + esc(f.text) + '</p>' +
      '<ol class="sf-faser">' + f.faser.map(function (x) {
        return '<li class="sf-fas' + (x[4] ? ' is-snart' : '') + '"><a href="' + esc(x[3]) + '" data-sf-mal="fas">' +
          '<span class="sf-fas-etikett">' + esc(x[0]) + '</span><span class="sf-fas-namn">' + esc(x[1]) + '</span>' +
          '<span class="sf-fas-mall">' + esc(x[2]) + '</span>' + (x[4] ? '<span class="sf-pill-snart">Byggs som stegflöde</span>' : '') + '</a></li>';
      }).join('') + '</ol>' +
      '<div class="sf-cta-rad"><a class="sf-cta" href="' + esc(f.cta[1]) + '" data-sf-mal="cta">' + esc(f.cta[0]) + '</a>' +
      '<a class="sf-lank" href="' + esc(f.lank[1]) + '" data-sf-mal="resa">' + esc(f.lank[0]) + ' →</a></div>';
  }
  function innehallTeam(r) {
    var vanster = r.paket.length ?
      r.paket.map(function (p) {
        return '<div class="sf-paket"><strong><a href="' + esc(p[3]) + '?source=start" data-sf-mal="paket">' + esc(p[0]) + '</a></strong><span>' + esc(p[1]) + '</span><span>Kopplingar: ' + esc(p[2]) + '</span></div>';
      }).join('') + '<a class="sf-gul" href="' + esc(r.paket[0][3]) + '?source=start" data-sf-mal="paket">Visa mig hur →</a>'
      :
      '<div class="sf-paket"><strong>' + esc(r.snartNamn) + '</strong><span>' + esc(r.snartText || 'Projektmallen för ditt yrke är på väg. Fram till dess kan du börja med Småföretagets AI-avdelning och byta ut texterna.') + '</span></div>' +
      (r.snartText ? '<a class="sf-gul-lank" href="' + esc(r.flode.cta[1]) + '" data-sf-mal="cta">' + esc(r.flode.cta[0]) + '</a>' :
        '<a class="sf-gul-lank" href="/projektpaket/smaforetagets-ai-avdelning?source=start" data-sf-mal="paket">Se Småföretagets AI-avdelning →</a>');
    return '<p class="sf-steg-text">Ett projekt är AI:ns arbetsrum: den kommer ihåg ditt företag, din ton och dina filer. En AI-skill är en färdighet AI:n plockar fram själv när den behövs. Gör det en gång, spara tid varje vecka.</p>' +
      '<div class="sf-team"><div class="sf-team-paket"><span class="sf-etikett">' + (r.paket.length ? 'Projektmall · klart på 10 minuter' : 'Projektmall · kommer snart') + '</span>' + vanster + '</div>' +
      '<div class="sf-team-skills"><span class="sf-etikett">AI-skills som passar</span><ul>' + r.skills.map(function (k) {
        var s = SKILL[k]; return '<li><a href="' + s[2] + '" data-sf-mal="skill">' + esc(s[0]) + ' →</a><span>' + esc(s[1]) + '</span></li>';
      }).join('') + '</ul><a class="sf-lank" href="/ai-termer/ai-skill">Vad är en AI-skill?</a></div></div>';
  }

  function ritaSteg3() {
    var r = R[S.roll];
    if (!r || !S.vag) { el3.innerHTML = ''; el3.hidden = true; return; }
    var v = VAGAR.filter(function (x) { return x.id === S.vag; })[0], i = vagInfo(v, r);
    var kropp = S.vag === 'prompt' ? innehallPrompt(r) : S.vag === 'flode' ? innehallFlode(r) : innehallTeam(r);
    el3.hidden = false;
    el3.innerHTML = '<div class="sf-ruta"><header><span class="sf-etikett">Steg 3 · ' + esc(r.namn) + ' · ' + esc(v.titel) + '</span>' +
      '<h2 class="sf-h2 sf-h2-3">' + esc(i.rubrik) + '</h2></header>' + kropp +
      '<div class="sf-fot"><span>Vill du se allt för ' + esc(r.namnLiten) + ' på ett ställe?</span><a href="' + esc(r.pillar[1]) + '" data-sf-mal="pillar">' + esc(r.pillar[0]) + ' →</a></div></div>';
  }

  function ritaApan() { if (apanP) apanP.textContent = R[S.roll] ? R[S.roll].apan : APAN_START; }

  function rita(scrolla) {
    if (HYBRID) ROT.classList.toggle('is-open', !!S.roll);
    ritaStegrad(); ritaRoller(); ritaSteg2(); ritaSteg3(); ritaApan();
    try {
      var u = new URL(location.href);
      if (S.roll) u.searchParams.set('yrke', S.roll); else u.searchParams['delete']('yrke');
      if (S.vag) u.searchParams.set('vag', S.vag); else u.searchParams['delete']('vag');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
    if (scrolla) {
      var mal = scrolla === 3 ? el3 : el2;
      var red = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var top = mal.getBoundingClientRect().top;
      if (HYBRID || top > window.innerHeight * 0.6 || top < 0) mal.scrollIntoView({ behavior: red ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ---------- Händelser ---------- */
  document.addEventListener('click', function (e) {
    var roll = e.target.closest('[data-sf-roll]');
    if (roll && R[roll.getAttribute('data-sf-roll')]) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; /* ny flik: låt länken gå till pillarsidan */
      e.preventDefault();
      var id = roll.getAttribute('data-sf-roll');
      S.roll = id; S.vag = '';
      track('pb_start_roll', { roll: id });
      hamtaData();
      rita(2);
      return;
    }
    var vag = e.target.closest('[data-sf-vag]');
    if (vag) {
      S.vag = vag.getAttribute('data-sf-vag');
      track('pb_start_vag', { roll: S.roll, vag: S.vag });
      rita(3);
      return;
    }
    var gor = e.target.closest('[data-sf-gor]');
    if (gor && gor.getAttribute('data-sf-gor') === 'byt') {
      var forra = S.roll; S.roll = ''; S.vag = ''; rita(0);
      var a = document.querySelector('[data-sf-roll="' + forra + '"]') || document.querySelector('[data-sf-roll]');
      if (a) { a.scrollIntoView({ block: 'center' }); a.focus({ preventScroll: true }); }
      return;
    }
    if (gor && gor.getAttribute('data-sf-gor') === 'kopiera') {
      var k = gor.closest('[data-sf-slug]'), slug = k && k.getAttribute('data-sf-slug'), p = DATA && DATA[slug];
      var sida = '/ai-prompter/' + slug;
      if (!p || !p.prompt) { location.href = sida; return; }
      var n = F && F.parse ? F.parse(p.prompt, {}).length : 1;
      tillKlipp(p.prompt, function () {
        if (F && F.sparaSenaste) F.sparaSenaste(p.prompt, '', p.namn, slug);
        gor.textContent = 'Kopierad ✓'; setTimeout(function () { gor.textContent = 'Kopiera'; }, 2000);
        var q = encodeURIComponent(p.prompt);
        if (n) toast('Kopierad med hakparenteser', 'Byt ut [DET SOM STÅR SÅ HÄR] innan du skickar, eller fyll i fälten på promptsidan.', [{ namn: 'Fyll i på promptsidan', href: sida }]);
        else toast('Kopierad! Klistra in i din AI', p.namn, [{ namn: 'ChatGPT', href: 'https://chatgpt.com/?q=' + q }, { namn: 'Claude', href: 'https://claude.ai/new?q=' + q }]);
        track('pb_start_kopiera', { roll: S.roll, prompt: slug, falt: n });
      }, function () { toast('Det gick inte att kopiera här', 'Öppna prompten och kopiera den därifrån.', [{ namn: 'Öppna prompten', href: sida }]); });
      return;
    }
    var lank = e.target.closest('a[href]');
    if (lank && el3.contains(lank)) {
      var kort = lank.closest('[data-sf-slug]');
      track('pb_start_oppna', { roll: S.roll, vag: S.vag, mal: kort ? 'prompt' : (lank.getAttribute('data-sf-mal') || 'lank'), href: lank.getAttribute('href') });
    }
  });

  /* Pilar i yrkesgruppen och vägvalet (radiogrupp) */
  document.addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(e.key) < 0) return;
    var grupp = e.target.closest('[role="radiogroup"]'); if (!grupp) return;
    var alla = [].slice.call(grupp.querySelectorAll('[role="radio"]')), i = alla.indexOf(e.target); if (i < 0) return;
    e.preventDefault();
    var n = alla[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + alla.length) % alla.length];
    n.focus();
  });

  /* ---------- Sök ---------- */
  function byggSok() {
    var plats = ROT.querySelector('[data-sf="sok"]'); if (!plats) return;
    plats.innerHTML = '<form class="sf-sok" role="search" action="/promptbiblioteket" method="get">' +
      '<label for="sf-sok-in">Vet du redan vad du vill göra?</label>' +
      '<div class="sf-sok-falt"><input id="sf-sok-in" name="q" type="search" autocomplete="off" placeholder="Sök bland alla prompter">' +
      '<button type="submit">Sök</button></div></form>';
    var form = plats.querySelector('form');
    form.addEventListener('submit', function (e) {
      var q = form.q.value.trim();
      if (!q) { e.preventDefault(); location.href = '/promptbiblioteket'; return; }
      track('pb_start_sok', { q: q.slice(0, 80) });
    });
    /* Antalet prompter i platshållaren hämtas först när någon går in i sökrutan */
    form.q.addEventListener('focus', function () {
      hamtaData().then(function (d) { if (d.__antal > 50) form.q.placeholder = 'Sök bland ' + d.__antal + ' prompter'; });
    }, { once: true });
  }

  /* ---------- Start ---------- */
  function init() {
    F = window.AimFyll || F;
    if (!document.querySelector('link[href*="startsida.css"]')) { var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
    [].forEach.call(document.querySelectorAll('[data-sf-roll]'), function (a) { a.setAttribute('role', 'radio'); a.setAttribute('aria-checked', 'false'); });
    var g = document.querySelector('[data-sf="roller"]'); if (g) { g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-label', 'Välj yrke'); }
    el3.setAttribute('id', 'steg-3'); el2.setAttribute('id', 'steg-2');
    try {
      var u = new URLSearchParams(location.search), y = u.get('yrke'), v = u.get('vag');
      if (R[y]) { S.roll = y; if (v && VAGAR.some(function (x) { return x.id === v; })) S.vag = v; }
    } catch (e) {}
    byggSok();
    rita(0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
