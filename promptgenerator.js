/* ============================================================
   D-PRE. LÄS URL-PARAMETRAR DIREKT (innan DOMContentLoaded)
   Så att värdena finns redo när DOM är klar.
   ============================================================ */
var pgImport = (function () {
  var params   = new URLSearchParams(window.location.search);
  var brief    = params.get("brief") || params.get("prompt"); // "prompt" = legacy
  var tasktype = params.get("tasktype") || "";
  var roll     = params.get("roll")     || "";
  var ton      = params.get("ton")      || "";
  var malgrupp = params.get("malgrupp") || "";
  var namn     = params.get("namn")     || "";
  var source   = params.get("source");  // "biblioteket" = sessionStorage-läge

  /* Fallback: lång brief sparad i sessionStorage */
  if (!brief && source === "biblioteket") {
    try {
      brief    = sessionStorage.getItem("pg_imported_prompt")   || "";
      namn     = namn     || sessionStorage.getItem("pg_imported_namn")     || "";
      tasktype = tasktype || sessionStorage.getItem("pg_imported_tasktype") || "";
      roll     = roll     || sessionStorage.getItem("pg_imported_roll")     || "";
      ton      = ton      || sessionStorage.getItem("pg_imported_ton")      || "";
      malgrupp = malgrupp || sessionStorage.getItem("pg_imported_malgrupp") || "";
      ["pg_imported_prompt","pg_imported_namn","pg_imported_tasktype",
       "pg_imported_roll","pg_imported_ton","pg_imported_malgrupp"]
        .forEach(function (k) { sessionStorage.removeItem(k); });
    } catch (e) { /* sessionStorage ej tillgänglig */ }
  }

  return (brief || tasktype)
    ? { brief: brief, tasktype: tasktype, roll: roll,
        ton: ton, malgrupp: malgrupp, namn: namn }
    : null;
})();

document.addEventListener("DOMContentLoaded", function () {

  /* ============================================================
     1. STATE + DOM-REFERENSER
     ============================================================ */
  let currentStepId    = "step-1";
  let hasFirstContent  = false;
  let saveRecentPrompt = function() {}; // fylls i av Section H
  const allSteps       = Array.from(document.querySelectorAll(".form-step"));
  const progressFill   = document.getElementById("progress-fill");
  const restartBtn     = document.getElementById("restart-form");
  const copyBtn        = document.getElementById("copy-prompt-preview");
  const previewWrap    = document.getElementById("prompt-preview-wrapper");
  const previewRaw     = document.getElementById("prompt-preview-raw");
  const advancedBtn    = document.getElementById("show-advanced");
  const advancedSec    = document.getElementById("advanced-section");
  const lengthSlider   = document.getElementById("length-slider");
  const toolLinks      = document.querySelector(".ai-tool-links");
  const dataRowsContainer = document.getElementById("data-rows");
  const chipContainer     = document.getElementById("data-chip-suggestions");
  const addRowBtn         = document.getElementById("add-data-row");
  const previews = {
    system:   document.getElementById("preview-system"),
    task:     document.getElementById("preview-task"),
    output:   document.getElementById("preview-output"),
    rules:    document.getElementById("preview-rules"),
    category: document.getElementById("preview-category"),
  };
  /* Klick på preview-task expanderar till full text */
  if (previews.task) {
    previews.task.addEventListener("click", function () {
      if (previews.task.getAttribute("data-typing") === "true") return;
      previews.task.classList.toggle("is-expanded");
    });
  }

  /* Output-format: lägg till "Text" (löpande text) som ett sjätte,
     förvalt alternativ längst till vänster i Output-raden.
     Byggs i JS (samma mönster som Snabbfälten i Data-steget) i stället
     för i Designer, eftersom Webflows egen konvertering av ett inklistrat
     radio-element bröt den dolda input/synlig-pill-strukturen som de
     andra fem alternativen bygger på.
     Motsvarar tidigare beteende när inget var valt: ingen formatinstruktion
     läggs till i prompten, se buildBlocks() ovan. */
  (function () {
    const anyRadio = document.querySelector('input[name="output-format"]');
    if (!anyRadio) return;
    const group = anyRadio.closest(".radio2_component");
    if (!group || document.getElementById("text")) return;

    const wrap = document.createElement("div");
    wrap.className = "button-gradient";
    wrap.innerHTML =
      '<label class="checkbox2_field w-radio">' +
        '<div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox2_button w-radio-input"></div>' +
        '<input type="radio" name="output-format" id="text" data-name="output-format" value="text" ' +
               'style="opacity:0;position:absolute;z-index:-1">' +
        '<span class="radio2_label w-form-label">Text</span>' +
      '</label>';
    group.insertBefore(wrap, group.firstChild);

    if (!document.querySelector('input[name="output-format"]:checked')) {
      const textRadio = document.getElementById("text");
      textRadio.checked = true;
      textRadio.dispatchEvent(new Event("change", { bubbles: true }));
    }
  })();

  const genericFlow  = ["step-1", "step-4", "step-5", "step-riktlinjer"];
  const specialSteps = ["step-image", "step-video", "step-code"];
  const MEDIA_TYPES  = ["bild", "bildprompta", "video", "kod"]; // används av avsnitt C

  /* ============================================================
     2. SMÅHJÄLPARE
     ============================================================ */
  const $val = (sel, fb = "") => document.querySelector(sel)?.value?.trim() || fb;
  const $check = (sel) => !!document.querySelector(sel)?.checked;
  const checkedValue = (name, fb = "") =>
    document.querySelector(`input[name="${name}"]:checked`)?.value?.trim() || fb;
  const checkedLabel = (name, fb = "") => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    if (!el) return fb;
    return (el.nextElementSibling?.innerText || el.closest("label")?.innerText || fb).trim();
  };
  const sliderLength = () => {
    if (!lengthSlider || lengthSlider.dataset.touched !== "true") return "";
    return { 1: "kort", 2: "medel", 3: "detaljerad" }[lengthSlider.value] || "";
  };
  if (lengthSlider) {
    ["input", "pointerdown", "keydown"].forEach((evt) =>
      lengthSlider.addEventListener(evt, () => { lengthSlider.dataset.touched = "true"; })
    );
  }

  /* ============================================================
     3. STEP-NAVIGATION + PROGRESS
     ============================================================ */
  function getStepFlow() {
    return specialSteps.includes(currentStepId) ? ["step-1", currentStepId] : genericFlow;
  }
  function showStep(stepId) {
    currentStepId = stepId;
    allSteps.forEach((s) => (s.style.display = s.id === stepId ? "block" : "none"));
    updateProgress();
    updateLivePreview();
    if (typeof autoGrowAll === "function") autoGrowAll(); // avsnitt F0 — mät fält som nu blivit synliga
  }
  function updateProgress() {
    if (!progressFill) return;
    const flow = getStepFlow();
    const i    = flow.indexOf(currentStepId);
    progressFill.style.width =
      (flow.length <= 1 || i === -1) ? "0%" : `${(i / (flow.length - 1)) * 100}%`;
  }
  /* Exponera showStep globalt så Section S kan navigera */
  window.pgShowStep = showStep;

  function goNext() {
    if (currentStepId === "step-1") {
      const t = checkedValue("task-type", "").toLowerCase();
      if (t === "bild" || t === "bildprompta") return showStep("step-image");
      if (t === "video")                        return showStep("step-video");
      if (t === "kod")                          return showStep("step-code");
      return showStep("step-4");
    }
    const i = genericFlow.indexOf(currentStepId);
    if (i !== -1 && i < genericFlow.length - 1) showStep(genericFlow[i + 1]);
  }
  function goPrev() {
    if (specialSteps.includes(currentStepId)) return showStep("step-1");
    const i = genericFlow.indexOf(currentStepId);
    if (i > 0) showStep(genericFlow[i - 1]);
  }

  /* ============================================================
     4. PROMPT-BUILDER
     ============================================================ */
  function buildPromptData() {
    return {
      taskType:      checkedValue("task-type", "").toLowerCase(),
      brief:         $val("#brief-input"),
      roll:          checkedLabel("Roll"),
      customRole:    $val("#custom-role-input"),
      malgrupp:      $val("#malgrupp-input"),
      pasteMaterial: $val("#paste-material-input"),
      dataRows:      getDataRows(),
      ton:           checkedValue("Ton"),
      outputFormat:  checkedValue("output-format"),
      language:      checkedValue("language-select"),
      length:        sliderLength(),
      constraints:   $val("#constraints-input"),
      askQuestions:  $check("#ask-questions"),
      useExamples:   $check("#use-examples"),
      stepByStep:    $check("#step-by-step"),
      threeOptions:  $check("#three-options"),
      fallbackInfo:  $check("#fallback-info"),
      plainTextOnly: $check("#plain-text-only"),
      imageSubject:  $val("#image-subject"),
      imageStyle:    checkedValue("image-style"),
      aspectRatio:   checkedValue("aspect-ratio"),
      lighting:      checkedValue("lighting"),
      camera:        checkedValue("camera"),
      detailLevel:   checkedValue("detail-level"),
      noTextImage:   $check("#no-text-image"),
      videoScene:    $val("#video-scene"),
      videoStyle:    checkedValue("video-style"),
      cameraMovement:checkedValue("camera-movement"),
      videoAspect:   checkedValue("video-aspect"),
      videoDuration: checkedValue("video-duration"),
      motionLevel:   checkedValue("motion-level"),
      videoLighting: checkedValue("video-lighting"),
      loopVideo:     $check("#loop-video"),
      codeTask:      $val("#code-task"),
      codeLanguage:  checkedValue("code-language"),
      framework:     $val("#framework-input"),
      codeHelp:      checkedValue("code-help"),
      codeOutput:    checkedValue("code-output"),
      codeEdgeCases: $check("#code-edge-cases"),
    };
  }
  /* Promptformat (uppdaterat 2026-10-02): naturlig svenska i stället för
     SYSTEM/UPPGIFT/OUTPUT/REGLER/KATEGORI. Rollen först som en löpande
     mening, sedan markdown-rubriker (## …) och punktlistor — fungerar lika
     bra i ChatGPT, Claude och Gemini. */
  const TONE = {
    professionell: "Skriv på ett professionellt och tydligt sätt.",
    vänlig:        "Skriv på ett vänligt och lättillgängligt sätt.",
    kreativ:       "Skriv kreativt och inspirerande.",
    akademisk:     "Skriv med en akademisk och formell ton.",
    direkt:        "Skriv kortfattat och rakt på sak.",
    övertygande:   "Skriv övertygande och säljande.",
  };
  const FORMAT = {
    bullet:   "Presentera svaret som en punktlista.",
    numbered: "Presentera svaret som en numrerad lista.",
    table:    "Presentera svaret i en tabell.",
    markdown: "Formatera svaret med tydlig markdown.",
    json:     "Svara med giltig JSON.",
  };
  const LENGTH = {
    kort:       "Håll det kort.",
    medel:      "Lagom långt – varken kortfattat eller uttömmande.",
    detaljerad: "Var utförlig och detaljerad.",
  };
  const TASK = {
    "skriva text": (c) => `Skriv följande: ${c}`,
    "skriva-text": (c) => `Skriv följande: ${c}`,
    analysera:     (c) => `Analysera följande: ${c}`,
    sammanfatta:   (c) => `Sammanfatta följande: ${c}`,
    brainstorma:   (c) => `Brainstorma idéer kring: ${c}`,
    förklara:      (c) => `Förklara tydligt: ${c}`,
    forklara:      (c) => `Förklara tydligt: ${c}`,
    bild:          (c) => `Bilden ska föreställa: ${c}`,
    bildprompta:   (c) => `Bilden ska föreställa: ${c}`,
    video:         (c) => `Videon ska visa: ${c}`,
    kod:           (c) => `Lös följande programmeringsuppgift: ${c}`,
  };
  /* "Marknadsförare" → "marknadsförare" mitt i meningen, men förkortningar
     (SEO-expert, UX-designer, "… / HR") behåller sina versaler. */
  function roleText(r) {
    r = (r || "").trim();
    if (r.length > 1 && r[0] !== r[0].toLowerCase() && r[1] === r[1].toLowerCase())
      r = r[0].toLowerCase() + r.slice(1);
    return r;
  }
  /* En hel mall/prompt i brief-rutan (lång + radbrytningar) skickas som
     den är — utan "Skriv följande:" framför. */
  function isFullPrompt(c) {
    return c.length > 150 && c.indexOf("\n") !== -1;
  }
  function buildBlocks(d) {
    const isImage = d.taskType === "bild" || d.taskType === "bildprompta";
    const isVideo = d.taskType === "video";
    const isCode  = d.taskType === "kod";
    const isMedia = isImage || isVideo;
    const sys = [], out = [], rules = [], cat = [];
    if (isImage)      sys.push("Du är expert på att skriva prompter för AI-bildgeneratorer.", "Använd visuellt beskrivande språk.");
    else if (isVideo) sys.push("Du är expert på att skriva prompter för AI-videogeneratorer.", "Beskriv scen, rörelse, tempo, ljus och kamera tydligt.");
    else if (isCode)  sys.push("Du är en senior utvecklare som skriver tydlig och robust kod.");
    else {
      const role = roleText(d.customRole || d.roll);
      if (role) sys.push(/^(en|ett) /i.test(role) ? `Du är ${role}.` : `Du är en erfaren ${role}.`);
    }
    if (TONE[d.ton]) sys.push(TONE[d.ton]);
    /* Media-typer använder BARA sitt eget fält — aldrig den (dolda) briefen
       från steg 1, annars kunde gammal text smyga in i bild/video/kod-prompten.
       Briefen förs i stället över till mediafältet i avsnitt I. */
    const content = (isImage ? d.imageSubject
                  : isVideo ? d.videoScene
                  : isCode  ? d.codeTask
                  : d.brief) || "";
    let taskMain = "";
    if (content) {
      const fn = TASK[d.taskType];
      taskMain = (!isMedia && !isCode && isFullPrompt(content)) ? content
               : fn ? fn(content) : content;
    }
    /* Kontext: dynamiska namn/värde-fält + målgrupp som punktlista. */
    const contextLines = [];
    if (Array.isArray(d.dataRows)) {
      d.dataRows.forEach((r) => {
        if (r.value) contextLines.push(`- ${r.label || "Info"}: ${r.value}`);
      });
    }
    if (d.malgrupp) contextLines.push(`- Mottagare: ${d.malgrupp}`);
    const context  = contextLines.join("\n");
    const material = d.pasteMaterial ? `"""\n${d.pasteMaterial}\n"""` : "";

    /* Svarsspråk gäller inte bild/video — där ska prompten skrivas på engelska. */
    if (d.language && !isMedia) out.push(`Svara på ${d.language}.`);
    if (d.outputFormat && d.outputFormat !== "text")
      out.push(FORMAT[d.outputFormat] || `Format: ${d.outputFormat}.`);
    if (d.length)        out.push(LENGTH[d.length] || `Längd: ${d.length}.`);
    if (d.useExamples)   out.push("Inkludera exempel.");
    if (d.stepByStep)    out.push("Arbeta steg för steg.");
    if (d.threeOptions)  out.push("Ge tre alternativ.");
    if (isImage) out.push("Skriv en färdig bildprompt på engelska som jag kan klistra in i en bildgenerator (t.ex. Midjourney eller DALL·E).");
    if (isVideo) out.push("Skriv en färdig videoprompt på engelska som jag kan klistra in i en videogenerator (t.ex. Sora, Runway eller Veo).");
    if (isCode)  out.push("Skriv fungerande kod som kan användas direkt.");
    if (d.askQuestions) rules.push("Ställ frågor om något är oklart.");
    if (d.fallbackInfo) rules.push('Om du saknar tillräcklig information för att slutföra uppgiften, skriv "Otillräcklig information för att slutföra uppgiften" i stället för att gissa.');
    if (d.plainTextOnly) rules.push("Svara i ren text, utan rubriker, länkar eller annan formatering förutom radbrytningar vid behov.");
    if (d.constraints)  rules.push(d.constraints);
    if (isImage) {
      if (d.imageStyle)  cat.push(`Stil: ${d.imageStyle}`);
      if (d.aspectRatio) cat.push(`Format: ${d.aspectRatio}`);
      if (d.lighting)    cat.push(`Ljus: ${d.lighting}`);
      if (d.camera)      cat.push(`Komposition: ${d.camera}`);
      if (d.detailLevel) cat.push(`Detaljnivå: ${d.detailLevel}`);
      if (d.noTextImage) cat.push("Ingen text i bilden");
    }
    if (isVideo) {
      if (d.videoStyle)      cat.push(`Stil: ${d.videoStyle}`);
      if (d.cameraMovement)  cat.push(`Kamerarörelse: ${d.cameraMovement}`);
      if (d.videoAspect)     cat.push(`Format: ${d.videoAspect}`);
      if (d.videoDuration)   cat.push(`Längd: ${d.videoDuration}`);
      if (d.motionLevel)     cat.push(`Rörelseintensitet: ${d.motionLevel}`);
      if (d.videoLighting)   cat.push(`Ljus: ${d.videoLighting}`);
      if (d.loopVideo)       cat.push("Videon ska vara sömlöst loopbar");
    }
    if (isCode) {
      if (d.codeLanguage)  cat.push(`Språk: ${d.codeLanguage}`);
      if (d.framework)     cat.push(`Miljö: ${d.framework}`);
      if (d.codeHelp)      cat.push(`Typ av hjälp: ${d.codeHelp}`);
      if (d.codeOutput)    cat.push(`Output: ${d.codeOutput}`);
      if (d.codeEdgeCases) cat.push("Hantera edge cases");
    }
    const bullets = (arr) => arr.map((s) => (s.indexOf("\n") === -1 ? `- ${s}` : s)).join("\n");

    /* Preview-blocket "Uppgift" visar uppgift + kontext + material ihop. */
    const taskPreview = [
      taskMain,
      context  ? `Kontext:\n${context}` : "",
      material ? `Material att utgå från:\n${material}` : "",
    ].filter(Boolean).join("\n\n");

    return {
      system:   sys.join(" "),
      task:     taskPreview,
      output:   bullets(out),
      rules:    bullets(rules),
      category: bullets(cat),
      /* Delarna separat för buildRaw() */
      taskMain, context, material,
    };
  }
  function buildRaw(b) {
    const parts = [];
    if (b.system)   parts.push(b.system);
    if (b.taskMain) parts.push(`## Uppgift\n${b.taskMain}`);
    if (b.context)  parts.push(`## Kontext\n${b.context}`);
    if (b.material) parts.push(`## Material att utgå från\n${b.material}`);
    if (b.output)   parts.push(`## Så ska svaret se ut\n${b.output}`);
    if (b.rules)    parts.push(`## Regler\n${b.rules}`);
    if (b.category) parts.push(`## Ta hänsyn till\n${b.category}`);
    return parts.join("\n\n").trim();
  }

  /* ============================================================
     4B. DATA-STEG: DYNAMISKA SNABBFÄLT (Namn/Värde)
     Låter användaren lägga till egna namn/värde-par (t.ex.
     "Företag: Acme AB") som renderas som ett Kontext-block i
     UPPGIFT-sektionen. Föreslagna etiketter varierar med task-type.
     ============================================================ */
  const DATA_SUGGESTIONS = {
    "skriva text": ["Företag", "Produkt/tjänst", "Mottagare", "Nyckelord"],
    "skriva-text": ["Företag", "Produkt/tjänst", "Mottagare", "Nyckelord"],
    analysera:     ["Källa/dokument", "Fokusområde"],
    sammanfatta:   ["Källa/dokument", "Fokusområde"],
    brainstorma:   ["Ämne", "Målgrupp"],
    förklara:      ["Ämne", "Målgrupp"],
    forklara:      ["Ämne", "Målgrupp"],
    kod:           ["Språk/ramverk", "Befintlig kod", "Felmeddelande"],
  };
  const DEFAULT_DATA_SUGGESTIONS = ["Företag", "Produkt/tjänst", "Mottagare", "Nyckelord"];

  function createDataRow(prefLabel) {
    const row = document.createElement("div");
    row.className = "pg-data-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "pg-row-label";
    labelInput.placeholder = "Etikett, t.ex. Företag";
    if (prefLabel) labelInput.value = prefLabel;

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.className = "pg-row-value";
    valueInput.placeholder = "Värde";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "pg-row-remove";
    removeBtn.setAttribute("aria-label", "Ta bort fält");
    removeBtn.textContent = "×";

    [labelInput, valueInput].forEach((inp) => {
      inp.addEventListener("input",  updateLivePreview);
      inp.addEventListener("change", updateLivePreview);
    });
    removeBtn.addEventListener("click", () => {
      row.remove();
      updateLivePreview();
    });

    row.appendChild(labelInput);
    row.appendChild(valueInput);
    row.appendChild(removeBtn);
    return row;
  }

  function addDataRow(prefLabel, focusValue) {
    if (!dataRowsContainer) return;
    const row = createDataRow(prefLabel);
    dataRowsContainer.appendChild(row);
    if (focusValue) {
      const v = row.querySelector(".pg-row-value");
      if (v) v.focus();
    }
    updateLivePreview();
  }

  function getDataRows() {
    if (!dataRowsContainer) return [];
    return Array.from(dataRowsContainer.querySelectorAll(".pg-data-row"))
      .map((row) => ({
        label: row.querySelector(".pg-row-label")?.value.trim() || "",
        value: row.querySelector(".pg-row-value")?.value.trim() || "",
      }))
      .filter((r) => r.value);
  }

  /* Chip-förslagen ritas om bara när task-type faktiskt ändras,
     så de inte flimrar om vid varje tangenttryckning i andra fält. */
  let lastChipTaskType = null;
  function renderDataChips() {
    if (!chipContainer) return;
    const t = checkedValue("task-type", "").toLowerCase();
    if (t === lastChipTaskType) return;
    lastChipTaskType = t;
    const suggestions = DATA_SUGGESTIONS[t] || DEFAULT_DATA_SUGGESTIONS;
    chipContainer.innerHTML = "";
    suggestions.forEach((label) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "pg-chip";
      chip.textContent = "+ " + label;
      chip.addEventListener("click", () => addDataRow(label, true));
      chipContainer.appendChild(chip);
    });
  }
  if (addRowBtn) {
    addRowBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addDataRow();
    });
  }

  /* ============================================================
     5. TYPEWRITER-EFFEKT
     ============================================================ */
  const typeStates = new WeakMap();
  let activeTypers = 0;
  function typeInto(el, target) {
    if (!el) return;
    let st = typeStates.get(el);
    if (!st) { st = { timer: null, active: false }; typeStates.set(el, st); }
    if (st.timer) clearTimeout(st.timer);
    function step() {
      const cur = el.textContent;
      if (cur === target) {
        if (st.active) { st.active = false; activeTypers = Math.max(0, activeTypers - 1); }
        el.removeAttribute("data-typing");
        st.timer = null;
        /* Scrolla tillbaka till toppen när typing är klar */
        if (el.id === "preview-task") setTimeout(function () { el.scrollTop = 0; }, 350);
        updateTypingState();
        return;
      }
      let i = 0;
      const m = Math.min(cur.length, target.length);
      while (i < m && cur[i] === target[i]) i++;
      let next, delay;
      if (i < cur.length) {
        next = cur.slice(0, Math.max(0, cur.length - 8));
        delay = 4;
      } else {
        const remain = target.length - i;
        const chunk  = 5;
        next  = target.slice(0, i + chunk);
        delay = 10;
      }
      el.textContent = next;
      /* Auto-scroll nerifrån under typing så animationen alltid syns */
      if (el.id === "preview-task") el.scrollTop = el.scrollHeight;
      el.setAttribute("data-typing", "true");
      st.timer = setTimeout(step, delay);
    }
    if (!st.active) { st.active = true; activeTypers++; }
    st.timer = setTimeout(step, 0);
    updateTypingState();
  }
  function updateTypingState() {
    if (!previewWrap) return;
    previewWrap.classList.toggle("is-typing", activeTypers > 0);
  }
  function setBlockVisibility(el, hasContent) {
    if (!el) return;
    const block = el.closest("[data-preview-block]") || el.parentElement;
    if (block) block.setAttribute("data-has-content", hasContent ? "true" : "false");
  }

  /* ============================================================
     6. UPPDATERA LIVE PREVIEW  (+  anropa A & C nedan)
     ============================================================ */
  function updateLivePreview() {
    const data   = buildPromptData();
    const blocks = buildBlocks(data);
    const raw    = buildRaw(blocks);
    Object.entries(previews).forEach(([key, el]) => {
      if (!el) return;
      const target = blocks[key] || "";
      setBlockVisibility(el, target.length > 0);
      typeInto(el, target);
    });
    if (previewRaw) previewRaw.value = raw;
    if (!hasFirstContent && raw.length > 0 && previewWrap) {
      hasFirstContent = true;
      previewWrap.classList.add("first-content-pulse");
      setTimeout(() => previewWrap.classList.remove("first-content-pulse"), 1300);
    }
    if (hasFirstContent && raw.length === 0) hasFirstContent = false;

    // ── A: Uppdatera checkmarks ──
    updateChecks();
    // ── C: Uppdatera header-synlighet (bild/video/kod) ──
    updateHeaderVisibility();
    // ── 4B: Uppdatera chip-förslag om task-type ändrats ──
    renderDataChips();
    // ── R: "Prompten är redo"-feedback ──
    updateReadyState(data);
  }

  /* ============================================================
     R. "PROMPTEN ÄR REDO"-FEEDBACK + TOM-KOPIERING + SLIDER
     Användare trodde att alla steg måste fyllas i. Så fort det finns
     en beskrivning (≥ 10 tecken i brief- eller mediafältet) visas:
       - en statusrad i preview-kortet ovanför Kopiera
       - en kort rad under "Nästa steg" i steg 1–3 (viktigast på
         mobil, där preview ligger långt ner) med "Visa prompt"-länk
     Klick på Kopiera med tom prompt ger feedback i stället för
     ingenting. Längd-slidern visas dämpad tills den rörts (den
     påverkar inte prompten förrän dess).
     OBS: allt här är var/function-deklarationer — updateLivePreview()
     anropar updateReadyState() och kan köras innan avsnittet nåtts.
     ============================================================ */
  var READY_MIN_CHARS = 10;
  var readyStatusEl   = null;
  var readyHintEls    = [];

  function promptDescription(d) {
    var t = d.taskType;
    if (t === "bild" || t === "bildprompta") return d.imageSubject;
    if (t === "video") return d.videoScene;
    if (t === "kod")   return d.codeTask;
    return d.brief;
  }
  function isPromptReady(d) {
    return (promptDescription(d) || "").trim().length >= READY_MIN_CHARS;
  }

  function injectReadyStyles() {
    if (document.getElementById("pg-ready-style")) return;
    var st = document.createElement("style");
    st.id = "pg-ready-style";
    st.textContent =
      ".pg-ready-status{font-size:.85rem;line-height:1.35;margin:4px 0 10px;padding:8px 12px;border-radius:10px;" +
        "background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);transition:background .25s,color .25s}" +
      ".pg-ready-status.is-ready{background:rgba(0,201,167,.14);color:#39ff8a}" +
      ".pg-ready-status.is-error{background:rgba(255,92,92,.14);color:#ff8a8a}" +
      "html.pg-light-page .pg-ready-status{background:rgba(17,24,39,.04);color:rgba(26,31,41,.6)}" +
      "html.pg-light-page .pg-ready-status.is-ready{background:rgba(0,201,167,.12);color:#00866f}" +
      "html.pg-light-page .pg-ready-status.is-error{background:rgba(220,38,38,.08);color:#b91c1c}" +
      ".pg-ready-hint{display:none;margin-top:10px;font-size:.85rem;text-align:right;color:#39ff8a}" +
      "html.pg-light-page .pg-ready-hint{color:#00866f}" +
      ".pg-ready-hint.is-visible{display:block}" +
      ".pg-ready-hint a{color:inherit;text-decoration:underline;cursor:pointer;margin-left:4px;font-weight:600}" +
      "@keyframes pgShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}" +
      ".pg-shake{animation:pgShake .4s ease}" +
      ".pg-slider-wrap.pg-untouched{opacity:.55;transition:opacity .2s}" +
      ".pg-slider-wrap.pg-untouched:hover{opacity:.8}" +
      /* Sök-dropdownen hamnade under pillsen: #pg-start och formuläret delar
         stacking context (båda z-index 1) och formuläret ritas senare. */
      "#pg-start{z-index:30!important}" +
      /* Expandera-knappen: texten syntes igenom (12 % bakgrund) — tätare yta + blur */
      ".pg-brief-expand-btn{background:rgba(9,32,52,.82)!important;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}" +
      "html.pg-light-page .pg-brief-expand-btn{background:rgba(234,250,246,.9)!important}" +
      /* Mall-bannern ligger nu överst i preview-kortet */
      "#prompt-preview-wrapper .pg-search-banner{margin:4px 0 12px}" +
      /* Kompakt startrad (avsnitt E) */
      "#pg-start.pg-start-compact>.margin-bottom,#pg-start.pg-start-compact>.selection-grid{display:none!important}" +
      ".pg-start-bar{display:none}" +
      "#pg-start.pg-start-compact .pg-start-bar{display:flex;align-items:center;gap:12px;width:100%;text-align:left;" +
        "padding:8px 8px 8px 10px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);animation:pgBarIn .25s ease}" +
      ".pg-start-bar-search{flex:1;min-width:0}" +
      ".pg-start-bar-search .pg-search-wrap{margin:0}" +
      ".pg-start-bar-reset{flex:none;white-space:nowrap;background:none;border:0;padding:8px 12px;font:inherit;font-size:.9rem;" +
        "font-weight:600;color:#39ff8a;cursor:pointer;border-radius:8px}" +
      ".pg-start-bar-reset:hover{background:rgba(57,255,138,.1)}" +
      "html.pg-light-page #pg-start.pg-start-compact .pg-start-bar{background:rgba(255,255,255,.75);border-color:rgba(17,24,39,.08);box-shadow:0 4px 20px rgba(17,24,39,.06)}" +
      "html.pg-light-page .pg-start-bar-reset{color:#00866f}" +
      "html.pg-light-page .pg-start-bar-reset:hover{background:rgba(0,201,167,.1)}" +
      "@keyframes pgBarIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}";
    document.head.appendChild(st);
  }

  function scrollToPreview() {
    if (!previewWrap) return;
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    previewWrap.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    previewWrap.classList.remove("is-highlighted");
    void previewWrap.offsetWidth;
    previewWrap.classList.add("is-highlighted");
    setTimeout(function () { previewWrap.classList.remove("is-highlighted"); }, 1700);
  }

  function ensureReadyElements() {
    if (readyStatusEl || !copyBtn) return;
    injectReadyStyles();
    var actions = copyBtn.parentElement;
    readyStatusEl = document.createElement("div");
    readyStatusEl.className = "pg-ready-status";
    readyStatusEl.setAttribute("role", "status");
    readyStatusEl.setAttribute("aria-live", "polite");
    actions.parentElement.insertBefore(readyStatusEl, actions);

    ["step-1", "step-4", "step-5"].forEach(function (id) {
      var group = document.querySelector("#" + id + " .button-group");
      if (!group) return;
      var hint = document.createElement("div");
      hint.className = "pg-ready-hint";
      hint.innerHTML = "✓ Prompten är redo! Kopiera nu eller förfina i nästa steg.";
      var link = document.createElement("a");
      link.textContent = "Visa prompt";
      link.href = "#prompt-preview-wrapper";
      link.addEventListener("click", function (e) { e.preventDefault(); scrollToPreview(); });
      hint.appendChild(link);
      group.parentElement.insertBefore(hint, group.nextSibling);
      readyHintEls.push(hint);
    });
  }

  function updateReadyState(d) {
    ensureReadyElements();
    var ready = isPromptReady(d || buildPromptData());
    /* Ett felmeddelande (tom kopiering) står kvar en stund — men bara
       tills prompten faktiskt blivit redo. */
    if (ready && readyStatusEl) readyStatusEl.classList.remove("is-error");
    if (readyStatusEl && !readyStatusEl.classList.contains("is-error")) {
      readyStatusEl.classList.toggle("is-ready", ready);
      readyStatusEl.textContent = ready
        ? "✓ Prompten är redo att kopiera – resten av stegen är valfria."
        : "Skriv vad du vill ha hjälp med för att skapa din prompt.";
    }
    readyHintEls.forEach(function (h) { h.classList.toggle("is-visible", ready); });

    /* Slider: dämpad tills rörd */
    var sliderWrap = lengthSlider && lengthSlider.closest(".pg-slider-wrap");
    if (sliderWrap) sliderWrap.classList.toggle("pg-untouched", lengthSlider.dataset.touched !== "true");
  }

  function nudgeEmptyPrompt() {
    ensureReadyElements();
    if (readyStatusEl) {
      readyStatusEl.classList.remove("is-ready");
      readyStatusEl.classList.add("is-error");
      readyStatusEl.textContent = "Det finns ingen prompt att kopiera än – börja med att skriva vad du vill ha hjälp med.";
      setTimeout(function () { readyStatusEl.classList.remove("is-error"); updateReadyState(); }, 3500);
    }
    if (copyBtn) {
      copyBtn.classList.remove("pg-shake"); void copyBtn.offsetWidth; copyBtn.classList.add("pg-shake");
    }
    /* För användaren till rätt beskrivningsfält */
    var t = checkedValue("task-type", "").toLowerCase();
    var map = { bild: ["step-image", "image-subject"], bildprompta: ["step-image", "image-subject"],
                video: ["step-video", "video-scene"], kod: ["step-code", "code-task"] };
    var target = map[t] || ["step-1", "brief-input"];
    setTimeout(function () {
      showStep(target[0]);
      var f = document.getElementById(target[1]);
      if (f) { f.scrollIntoView({ behavior: "smooth", block: "center" }); f.focus({ preventScroll: true }); }
    }, 600);
  }

  /* ============================================================
     7. EVENT-LISTENERS
     ============================================================ */
  document.querySelectorAll(".next-button").forEach((b) =>
    b.addEventListener("click", (e) => { e.preventDefault(); goNext(); })
  );
  document.querySelectorAll(".prev-button").forEach((b) =>
    b.addEventListener("click", (e) => { e.preventDefault(); goPrev(); })
  );
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input",  updateLivePreview);
    el.addEventListener("change", updateLivePreview);
  });

  /* ============================================================
     8. KOPIERA + CONFETTI 🎉
     ============================================================ */
  function fireConfetti() {
    if (typeof confetti !== "function") return;
    const colors = ["#39FF8A", "#00C9A8", "#1B5BFF", "#00C8FF", "#FFD93B"];
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.65 }, colors });
    setTimeout(() => confetti({ particleCount: 50, angle: 60,  spread: 55, origin: { x: 0, y: 0.7 }, colors }), 150);
    setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors }), 250);
  }
  /* Kopiera till urklipp med fallback (execCommand) om Clipboard-API:t
     avvisas — t.ex. utan fokus eller på vissa mobilwebbläsare. */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    }
    legacyCopy(text);
  }
  function legacyCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) { /* ignoreras */ }
  }
  if (copyBtn) {
    copyBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const text = previewRaw?.value?.trim() || "";
      /* Avsnitt R: utan beskrivning finns ingen uppgift att kopiera (prompten
         är aldrig helt tom längre — "Svara på svenska" är förvalt). */
      if (!text || !(promptDescription(buildPromptData()) || "").trim()) { nudgeEmptyPrompt(); return; }
      /* Spara + feedback sker ALLTID — oberoende av om urklippet lyckas.
         (Tidigare låg detta inuti clipboard.then(), så om writeText
          avvisades sparades prompten aldrig i Senaste prompter.) */
      /* Byt bara texten i .copy-text — att sätta copyBtn.textContent
         raderade kopieringsikonen permanent efter första klicket. */
      const label = copyBtn.querySelector("#copy-text, .copy-text") || copyBtn;
      if (!label.dataset.pgOriginal) label.dataset.pgOriginal = label.textContent;
      label.textContent = "Kopierad! 🎉";
      fireConfetti();
      if (toolLinks) toolLinks.classList.add("is-revealed");
      saveRecentPrompt(text, checkedValue("task-type", "").toLowerCase());
      setTimeout(() => (label.textContent = label.dataset.pgOriginal), 1800);
      copyToClipboard(text);
    });
  }

  /* ============================================================
     9. AVANCERAT + RESTART
     ============================================================ */
  if (advancedBtn && advancedSec) {
    advancedBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const open = advancedSec.style.display === "block";
      advancedSec.style.display = open ? "none" : "block";
      advancedBtn.textContent   = open ? "Visa avancerade inställningar" : "Dölj avancerade inställningar";
      updateLivePreview();
    });
  }
  if (restartBtn) {
    restartBtn.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelectorAll("input[type='text'], textarea").forEach((el) => (el.value = ""));
      document.querySelectorAll("input[type='radio'], input[type='checkbox']").forEach((el) => {
        el.checked = false;
        // bubbles: false — samma anledning som i avsnitt 11: Webflows egen
        // delegerade change-lyssnare på document lägger annars tillbaka
        // "w--redirected-checked" ovillkorligen. Våra egna lyssnare (avsnitt
        // 11:s change-handler + updateLivePreview) sitter direkt på elementet
        // och nås oavsett.
        el.dispatchEvent(new Event("change", { bubbles: false }));
      });
      document.querySelectorAll("select").forEach((el) => (el.selectedIndex = 0));
      if (advancedSec) advancedSec.style.display = "none";
      if (advancedBtn) advancedBtn.textContent = "Visa avancerade inställningar";
      if (toolLinks)   toolLinks.classList.remove("is-revealed");
      if (lengthSlider) delete lengthSlider.dataset.touched;
      if (dataRowsContainer) dataRowsContainer.innerHTML = "";
      lastChipTaskType = null;
      hasFirstContent = false;
      applyDefaults(); // Text + Svenska förvalda igen
      /* Mall-bannern hör till den gamla prompten — bort med den */
      var libBanner = document.getElementById("pg-search-banner");
      if (libBanner) { libBanner.classList.remove("is-visible"); libBanner.innerHTML = ""; }
      /* Visa startkorten igen — man börjar om och väljer väg på nytt */
      if (window.pgExpandStart) window.pgExpandStart();
      showStep("step-1");
      updateLivePreview();
    });
  }

  /* ============================================================
     10. "VISA PROMPT"-HIGHLIGHT
     ============================================================ */
  document.querySelectorAll('#show-prompt-btn, [data-action="show-prompt"]').forEach((btn) => {
    btn.addEventListener("click", function () {
      if (!previewWrap) return;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      previewWrap.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      previewWrap.classList.remove("is-highlighted");
      void previewWrap.offsetWidth;
      previewWrap.classList.add("is-highlighted");
      setTimeout(() => previewWrap.classList.remove("is-highlighted"), 1700);
    });
  });

  /* ============================================================
     11. RADIO TOGGLE (klick igen för att avmarkera)
     ============================================================ */
  document.querySelectorAll(".checkbox2_field").forEach((label) => {
    const input = label.querySelector('input[type="radio"]');
    if (!input) return;
    label.addEventListener("mousedown", () => {
      input.dataset.wasChecked = input.checked ? "true" : "false";
    });
    label.addEventListener("keydown", (e) => {
      if ((e.key === " " || e.key === "Enter") && input.checked)
        input.dataset.wasChecked = "true";
    });
    label.addEventListener("click", () => {
      requestAnimationFrame(() => {
        if (input.dataset.wasChecked === "true") {
          input.checked = false;
          label.querySelector(".checkbox2_button")?.classList.remove("w--redirected-checked");
          // OBS: bubbles MÅSTE vara false här. Webflows eget (jQuery-delegerade)
          // change-lyssnarskript på document fångar annars detta och lägger
          // tillbaka "w--redirected-checked" ovillkorligen — det antar att en
          // radioknapp bara kan avge "change" när den BLIR vald (vilket stämmer
          // för native radioknappar, men inte för vår manuella avmarkering).
          // Så länge eventet inte bubblar förbi input når det aldrig document,
          // men når fortfarande både vår egen "change"-lyssnare direkt nedan
          // och updateLivePreview (avsnitt 7), som båda sitter direkt på inputen.
          input.dispatchEvent(new Event("change", { bubbles: false }));
        }
        input.dataset.wasChecked = "";
      });
    });
    input.addEventListener("change", () => {
      const btn = label.querySelector(".checkbox2_button");
      if (!btn) return;
      btn.classList.toggle("w--redirected-checked", input.checked);
    });
  });

  /* ============================================================
     12. LENGTH-SLIDER (gradient + aktiv label)
     ============================================================ */
  (function () {
    if (!lengthSlider) return;
    const labels = document.querySelector(".length-labels")?.querySelectorAll("span, div") || [];
    const update = () => {
      const min = +lengthSlider.min, max = +lengthSlider.max, val = +lengthSlider.value;
      lengthSlider.style.setProperty("--val", `${((val - min) / (max - min)) * 100}%`);
      labels.forEach((el, i) => el.classList.toggle("is-active", i + 1 === val));
    };
    lengthSlider.addEventListener("input", update);
    update();
  })();

  /* ============================================================
     A. STEP-CHECKMARKS
     Klart-villkor per top-level header-index (0-baserat).
     Kallas från updateLivePreview() — ingen separat observer.
     ============================================================ */
  const stepConditions = [
    /* 0 – Steg 1: Uppgift (task-type + brief) */
    /* Vid bild/video/kod är brief-fältet dolt (avsnitt I) — då räcker valet. */
    () => !!document.querySelector('input[name="task-type"]:checked') &&
          (MEDIA_TYPES.includes(checkedValue("task-type", "").toLowerCase()) ||
           $val("#brief-input").length >= 3),
    /* 1 – Steg 2: Roll & ton */
    () => (!!document.querySelector('input[name="Roll"]:checked') ||
           $val("#custom-role-input").length > 0) &&
          !!document.querySelector('input[name="Ton"]:checked'),
    /* 2 – Steg 3: Data (målgrupp, snabbfält eller inklistrat material) */
    () => $val("#malgrupp-input").length > 0 ||
          $val("#paste-material-input").length > 0 ||
          getDataRows().length > 0,
    /* 3 – Steg 4: Riktlinjer — inget hårt krav, alla fält är valfria */
    () => currentStepId === "step-riktlinjer" ||
          genericFlow.indexOf(currentStepId) > genericFlow.indexOf("step-riktlinjer"),
  ];

  // Hämta container robust. OBS: id:t "wf-form-Contact-1-Form" sitter numera
  // på wrapper-diven (.contact1_form-block), inte på <form>, så det går inte
  // att lita på. Rätt container är den som steg-headers ligger direkt i —
  // utgå därför från första headerns förälder. Fallbacks för säkerhets skull.
  const firstStepHeader = document.querySelector(".form-step-header");
  const form           = (firstStepHeader && firstStepHeader.parentElement)
                      || document.querySelector("form.pg-steps")
                      || document.querySelector("form");
  // Top-level headers (direkta barn av containern)
  const stepHeaders    = form
    ? Array.from(form.querySelectorAll(":scope > .form-step-header"))
    : [];

  // Lägg till checkmark-ikon i varje header
  stepHeaders.forEach((header) => {
    const check = document.createElement("span");
    check.className = "pg-step-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML =
      '<svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    header.appendChild(check);
  });

  function updateChecks() {
    stepHeaders.forEach((header, i) => {
      const done = stepConditions[i] ? stepConditions[i]() : false;
      header.classList.toggle("step-is-complete", done);
    });
  }

  /* ============================================================
     B. KLICKBARA HEADERS
     Använder befintlig showStep() — ingen duplicerad logik.
     nextElementSibling = alltid stegets form-step-div.
     ============================================================ */
  stepHeaders.forEach((header) => {
    header.classList.add("pg-header-clickable");
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");

    const handleClick = () => {
      const target = header.nextElementSibling;
      if (target && target.classList.contains("form-step")) {
        showStep(target.id);
        // Mjuk scroll till formulärets topp
        const container = document.getElementById("form-container") || target;
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    header.addEventListener("click", handleClick);
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); }
    });
  });

  /* ============================================================
     C. DÖLJ .pg-text-step HEADERS VID BILD/VIDEO/KOD-LÄGE
     Kallas från updateLivePreview() vid varje ändring.
     Kräver att Webflow-klassen pg-text-step lagts på headers 2–6.
     ============================================================ */
  function updateHeaderVisibility() {
    if (!form) return;
    const taskType = checkedValue("task-type", "").toLowerCase();
    const isMedia  = MEDIA_TYPES.includes(taskType);
    form.querySelectorAll(":scope > .form-step-header.pg-text-step").forEach((h) => {
      h.style.display = isMedia ? "none" : "";
    });
  }

  /* ============================================================
     I. BRIEF-FÄLTET VID BILD/VIDEO/KOD
     Bild/video/kod har egna beskrivningsfält i sina steg. Tidigare
     visades ändå "Vad vill du ha hjälp med?" i steg 1, och det som
     skrevs där försvann (användaren fick skriva samma sak två gånger).
     Nu: brief-fältet döljs när en media-typ är vald, och redan
     inskriven text förs över till mediafältet om det är tomt.
     Briefen lämnas kvar orörd, så byter man tillbaka till en
     texttyp finns texten kvar där.
     ============================================================ */
  const briefInput = document.getElementById("brief-input");
  const briefWrap  = briefInput ? briefInput.closest(".form_field-wrapper") : null;
  const MEDIA_FIELD = {
    bild: "image-subject", bildprompta: "image-subject",
    video: "video-scene", kod: "code-task",
  };
  function syncBriefForTaskType() {
    if (!briefWrap) return;
    const t      = checkedValue("task-type", "").toLowerCase();
    const target = MEDIA_FIELD[t] ? document.getElementById(MEDIA_FIELD[t]) : null;
    briefWrap.style.display = target ? "none" : "";
    if (target && briefInput.value.trim() && !target.value.trim()) {
      target.value = briefInput.value.trim();
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  /* Lyssnar direkt på varje radio — når även de icke-bubblande
     change-events som avmarkering (avsnitt 11) och "Skapa ny" skickar. */
  document.querySelectorAll('input[name="task-type"]').forEach((r) =>
    r.addEventListener("change", () => { syncBriefForTaskType(); updateLivePreview(); })
  );

  /* ============================================================
     D. URL-PARAMETRAR — importera prompt från biblioteket
     pgImport är satt av D-PRE ovanför DOMContentLoaded.
     Integreras med showStep() + updateLivePreview() så att
     navigation, progress och live preview alla hänger med.
     ============================================================ */
  function handleImportedPrompt() {
    if (!pgImport) return;

    const dec = (s) => s ? decodeURIComponent(s) : "";

    const brief    = dec(pgImport.brief);
    const tasktype = dec(pgImport.tasktype).toLowerCase();
    const roll     = dec(pgImport.roll);
    const ton      = dec(pgImport.ton).toLowerCase();
    const malgrupp = dec(pgImport.malgrupp);
    const namn     = dec(pgImport.namn) || "Prompt-biblioteket";

    /* ── Steg 1: Task-type (radio) ── */
    if (tasktype) {
      const radio = document.querySelector(`input[name="task-type"][value="${tasktype}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    /* ── Steg 1: Brief → rätt fält baserat på task-type ──
       Bild/video/kod får INTE #brief-input — briefen
       ska till det specifika fältet för det steget.   */
    var mediaInputMap = {
      bild        : "image-subject",
      bildprompta : "image-subject",
      video       : "video-scene",
      kod         : "code-task"
    };
    var briefFieldId = mediaInputMap[tasktype] || "brief-input";
    const ta = document.getElementById(briefFieldId);
    if (ta && brief) {
      ta.value = brief;
      ta.dispatchEvent(new Event("input",  { bubbles: true }));
      ta.dispatchEvent(new Event("change", { bubbles: true }));
    }

    /* ── Steg 2: Ton (radio, del av Roll & ton) ── */
    if (ton) {
      const radio = document.querySelector(`input[name="Ton"][value="${ton}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    /* ── Steg 2: Roll — testa radio först, annars custom-fält ── */
    if (roll) {
      const radio = document.querySelector(`input[name="Roll"][value="${roll}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const customEl = document.getElementById("custom-role-input");
        if (customEl) {
          customEl.value = roll;
          customEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    }

    /* ── Steg 3: Målgrupp (del av Data) ── */
    const malgruppEl = document.getElementById("malgrupp-input");
    if (malgruppEl && malgrupp) {
      malgruppEl.value = malgrupp;
      malgruppEl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    /* ── Navigera till rätt steg beroende på task-type ── */
    var mediaStepMap = { bild: "step-image", bildprompta: "step-image", video: "step-video", kod: "step-code" };
    var targetStep = mediaStepMap[tasktype] || "step-1";
    showStep(targetStep);

    /* ── Mjuk scroll → det ifyllda input-fältet ── */
    setTimeout(function () {
      if (ta) ta.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    /* ── GA4-event ── */
    if (window.gtag) {
      gtag("event", "prompt_imported_from_library", {
        prompt_name : namn,
        tasktype    : tasktype,
        has_roll    : !!roll,
        has_ton     : !!ton,
        has_malgrupp: !!malgrupp,
      });
    }
  }

  /* ============================================================
     13. INIT
     ============================================================ */
  /* Förval: Output = Text, Språk = Svenska (synligt valda pills).
     Körs vid init och efter "Skapa ny" — rör inget som redan är valt. */
  function applyDefaults() {
    ["text", "svenska"].forEach(function (id) {
      var r = document.getElementById(id);
      if (!r || r.type !== "radio") return;
      if (document.querySelector('input[name="' + r.name + '"]:checked')) return;
      r.checked = true;
      // bubbles:false — samma skäl som i avsnitt 11 (Webflows document-lyssnare)
      r.dispatchEvent(new Event("change", { bubbles: false }));
    });
    /* Synka pill-utseendet med faktiskt val. "Text"-pillen skapas och väljs
       överst i filen, innan avsnitt 11:s lyssnare finns — den var vald men
       såg aldrig vald ut. */
    document.querySelectorAll('.checkbox2_field input[type="radio"]').forEach(function (i) {
      var btn = i.closest(".checkbox2_field").querySelector(".checkbox2_button");
      if (btn) btn.classList.toggle("w--redirected-checked", i.checked);
    });
  }
  applyDefaults();

  /* Preview: samma ordning och namn som den kopierade prompten
     (Designer har Uppgift → System → Output → Extra regler → Kategori). */
  (function () {
    var blockOf = function (el) { return el && (el.closest("[data-preview-block]") || el.parentElement); };
    var sysB = blockOf(previews.system), taskB = blockOf(previews.task);
    if (sysB && taskB && sysB.parentElement === taskB.parentElement)
      taskB.parentElement.insertBefore(sysB, taskB);
    var LABELS = { system: "Roll & ton", task: "Uppgift", output: "Så ska svaret se ut",
                   rules: "Regler", category: "Ta hänsyn till" };
    Object.keys(LABELS).forEach(function (k) {
      var lbl = blockOf(previews[k]) && blockOf(previews[k]).querySelector(".pg-prompt-label");
      if (lbl) lbl.textContent = LABELS[k];
    });
  })();

  showStep("step-1");
  updateLivePreview(); // kör även updateChecks() + updateHeaderVisibility()

  /* Hantera URL-import sist (efter att step-1 är visat och DOM är redo) */
  handleImportedPrompt();
  syncBriefForTaskType(); // rätt synlighet även om en typ redan är vald vid laddning

  /* ============================================================
     E. STARTVAL "Hur vill du börja?" + GATED-LÄGE (valfritt)
     Byggs helt i Webflow; JS hakar bara in beteendet.
       - Sektion  #pg-start         valblocket. data-gated="true" = gated.
       - Wrapper  .pg-steps         formuläret; döljs tills val görs.
       - Preview  #prompt-preview-wrapper  döljs också tills val görs.
       - Progress .progress-wrapper   döljs tills val görs; fästs överst (fixed).
       - Extra    .pg-gated         valfri klass på annat som ska döljas.
       - Kort A   #pg-start-scratch  knappen "Bygg från scratch".
     Sökrutan (Kort B) monteras i #pg-template-search av avsnitt S.
     Degraderar tyst: saknas elementen beter sig sidan som förut.
     ============================================================ */
  (function initStartGate() {
    var startBlock = document.getElementById('pg-start');
    var gated      = !!startBlock && startBlock.getAttribute('data-gated') === 'true';

    /* Styling för progressbar (fixed), "Senaste prompter" (fullbredd) och
       gated-låset ligger i promptgenerator.css. Här sköts bara beteendet. */

    /* Lås gaten: markera <html> så CSS kan dölja även dynamiskt skapade element */
    if (gated) document.documentElement.classList.add('pg-gated-locked');

    /* Allt som ska döljas tills ett val görs: formuläret (.pg-steps),
       preview-kortet (#prompt-preview-wrapper), progressbaren samt egna .pg-gated. */
    var gatedEls   = document.querySelectorAll('.pg-steps, #prompt-preview-wrapper, .progress-wrapper, .pg-gated');

    /* Inline display slår Webflows flex-klasser säkert; '' återställer originalet */
    function setHidden(hide) {
      gatedEls.forEach(function (el) { el.style.display = hide ? 'none' : ''; });
    }
    /* Visa allt + lås upp gaten (så Senaste prompter kan visas) */
    function showSteps() {
      if (!gated) return;
      setHidden(false);
      document.documentElement.classList.remove('pg-gated-locked');
      setTimeout(autoGrowAll, 0); // fält kan ha fyllts (URL-import) medan de var dolda
    }

    /* ── Kompakt startrad ──
       När en väg valts (Starta, mall, URL-import) fälls "Hur vill du börja?"
       + de två korten ihop till en smal rad: sökrutan ("Byt till en mall…")
       + "Börja om". Sökrutan FLYTTAS in i raden (samma element, samma
       sök-logik) och tillbaka till Kort B när korten visas igen.
       "Börja om" och "Skapa ny" (restart) visar korten igen. */
    var startBar = null, SEARCH_PH = null;
    function ensureStartBar() {
      if (startBar || !startBlock) return startBar;
      startBar = document.createElement('div');
      startBar.className = 'pg-start-bar';
      var slot = document.createElement('div');
      slot.className = 'pg-start-bar-search';
      var again = document.createElement('button');
      again.type = 'button';
      again.className = 'pg-start-bar-reset';
      again.innerHTML = '↺ Börja om';
      again.addEventListener('click', function () {
        var rb = document.getElementById('restart-form');
        if (rb) rb.click(); else expandStart();   // restart anropar expandStart()
        startBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      startBar.appendChild(slot);
      startBar.appendChild(again);
      startBlock.appendChild(startBar);
      return startBar;
    }
    function moveSearch(toBar) {
      var sw = document.querySelector('.pg-search-wrap');
      if (!sw) return false;
      var input = sw.querySelector('.pg-search-input');
      if (input && SEARCH_PH === null) SEARCH_PH = input.placeholder;
      if (toBar) {
        ensureStartBar().querySelector('.pg-start-bar-search').appendChild(sw);
        if (input) input.placeholder = 'Byt till en mall…';
      } else {
        var mount = document.getElementById('pg-template-search');
        if (mount) mount.appendChild(sw);
        if (input && SEARCH_PH !== null) input.placeholder = SEARCH_PH;
      }
      var dd = sw.querySelector('.pg-search-dropdown');
      if (dd) dd.classList.remove('is-open');
      return true;
    }
    function collapseStart() {
      if (!startBlock || startBlock.classList.contains('pg-start-compact')) return;
      ensureStartBar();
      startBlock.classList.add('pg-start-compact');
      if (!moveSearch(true)) setTimeout(function () { moveSearch(true); }, 0); // sökrutan byggs senare (avsnitt S)
    }
    function expandStart() {
      if (!startBlock || !startBlock.classList.contains('pg-start-compact')) return;
      startBlock.classList.remove('pg-start-compact');
      moveSearch(false);
    }
    window.pgCollapseStart = collapseStart;
    window.pgExpandStart   = expandStart;

    /* ── Linjera korten mot formulär/preview-rutnätet ──
       Korten delade 1:1 medan formulär + preview under delar 2:1 → gapet
       mellan korten låg inte i linje. Kopiera .pg_grid:s faktiska kolumner
       och gap (följer Designer); enkolumnigt (mobil/tablet) lämnas orört. */
    function alignStartGrid() {
      var sg = startBlock && startBlock.querySelector('.selection-grid');
      var pg = document.querySelector('.pg_grid');
      if (!sg || !pg) return;
      var cs = getComputedStyle(pg);
      var cols = cs.gridTemplateColumns.split(' ').filter(Boolean);
      if (cs.display === 'grid' && cols.length === 2 && pg.offsetWidth) {
        sg.style.gridTemplateColumns = cols.map(function (c) { return parseFloat(c) + 'fr'; }).join(' ');
        sg.style.columnGap = cs.columnGap;
      } else {
        sg.style.gridTemplateColumns = '';
        sg.style.columnGap = '';
      }
    }
    alignStartGrid();
    window.addEventListener('resize', alignStartGrid);

    /* Väljer en väg: visa innehållet, scrolla till formuläret, logga i GA4 */
    function chooseMode(mode) {
      showSteps();
      collapseStart();
      alignStartGrid(); // .pg_grid kan ha varit dold (gated) vid första mätningen
      var fc = document.getElementById('form-container');
      if (fc) fc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.gtag) gtag('event', 'pg_start_mode', { start_mode: mode });
    }
    /* Exponera så sök-modulen (selectPrompt) kan anropa den vid mall-val */
    window.pgRevealSteps = chooseMode;

    /* Gated: dölj formulär + preview tills ett val görs */
    if (gated) setHidden(true);

    /* Landade med URL-param/import → mall-vägen redan vald: visa direkt.
       Låser även upp gaten; handleImportedPrompt() sköter scroll till fältet. */
    if (gated && pgImport) showSteps();
    if (pgImport) collapseStart(); // länk med förifyllt formulär = väg redan vald

    /* Kort A "Bygg från scratch" */
    var scratchBtn = document.getElementById('pg-start-scratch');
    if (scratchBtn) {
      scratchBtn.addEventListener('click', function (e) {
        if (gated) e.preventDefault(); /* icke-gated: låt href="#form-container" scrolla */
        chooseMode('scratch');
      });
    }
  })();

  /* ============================================================
     H. SENASTE PROMPTER — localStorage
     Sparar varje kopierad prompt. Renderar en lista
     med de senaste 10 under prompt-preview-wrappern.
     ============================================================ */
  (function () {
    const RECENT_KEY  = 'aimonkey_recent_prompts';
    const RECENT_MAX  = 10;
    const TASK_LABELS = {
      'skriva-text': 'Skriva text', 'skriva text': 'Skriva text',
      analysera: 'Analysera', sammanfatta: 'Sammanfatta',
      brainstorma: 'Brainstorma', förklara: 'Förklara', forklara: 'Förklara',
      bild: 'Bild', bildprompta: 'Bildprompt', video: 'Video', kod: 'Kod',
    };

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function relTime(iso) {
      const d = (Date.now() - new Date(iso).getTime()) / 1000;
      if (d < 60)     return 'just nu';
      if (d < 3600)   return Math.floor(d / 60) + ' min sedan';
      if (d < 86400)  return Math.floor(d / 3600) + ' h sedan';
      if (d < 172800) return 'igår';
      return Math.floor(d / 86400) + ' dagar sedan';
    }
    function loadList() {
      try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch(e) { return []; }
    }

    /* Exponeras till yttre scope så copy-knappen kan anropa den */
    saveRecentPrompt = function (text, tasktype) {
      if (!text || text.length < 10) return;
      try {
        const list     = loadList().filter(function(p){ return p.text !== text; });
        const preview  = text.length > 90 ? text.slice(0, 90) + '…' : text;
        list.unshift({ id: Date.now(), text: text, preview: preview,
                       tasktype: tasktype || '', created: new Date().toISOString() });
        localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
        renderRecent();
      } catch(e) {}
    };

    function renderRecent() {
      const list = loadList();
      let wrap   = document.getElementById('pg-recent-wrap');

      if (!list.length) {
        if (wrap) wrap.style.display = 'none';
        return;
      }
      if (!wrap) {
        wrap    = document.createElement('div');
        wrap.id = 'pg-recent-wrap';
        const ref = previewWrap || document.getElementById('prompt-preview-wrapper');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(wrap, ref.nextSibling);
        else document.body.appendChild(wrap);
      }
      wrap.style.display = '';

      wrap.innerHTML =
        '<div class="pg-recent-header">' +
          '<span class="pg-recent-title">Senaste prompter</span>' +
          '<button type="button" class="pg-recent-clear">Rensa</button>' +
        '</div>' +
        '<ul class="pg-recent-list">' +
          list.map(function(p) {
            const lbl = TASK_LABELS[p.tasktype] || p.tasktype || '';
            return (
              '<li class="pg-recent-item">' +
                '<div class="pg-recent-preview">' + escHtml(p.preview) + '</div>' +
                '<div class="pg-recent-meta">' +
                  (lbl ? '<span class="pg-recent-badge">' + escHtml(lbl) + '</span>' : '') +
                  '<span class="pg-recent-time">' + relTime(p.created) + '</span>' +
                '</div>' +
                '<button type="button" class="pg-recent-copy" data-full="' +
                  encodeURIComponent(p.text) + '">Kopiera</button>' +
              '</li>'
            );
          }).join('') +
        '</ul>';

      wrap.querySelector('.pg-recent-clear').addEventListener('click', function() {
        try { localStorage.removeItem(RECENT_KEY); } catch(e) {}
        renderRecent();
      });
      wrap.querySelectorAll('.pg-recent-copy').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const text = decodeURIComponent(btn.getAttribute('data-full') || '');
          if (!text) return;
          navigator.clipboard.writeText(text).then(function() {
            const orig = btn.textContent;
            btn.textContent = 'Kopierad!';
            btn.classList.add('is-copied');
            setTimeout(function() { btn.textContent = orig; btn.classList.remove('is-copied'); }, 2000);
          });
        });
      });
    }

    /* Rendera på sidladdning (visar historik från föregående besök) */
    renderRecent();
  })();

  /* ── F0. Självväxande textareas (brief + bild + video + kod) ──
     Rutan börjar på sin Designer-höjd och växer med innehållet upp till
     ett tak (min(420px, 55% av fönsterhöjden)); därefter scroll. Dolda
     fält (inaktiva steg) går inte att mäta — de räknas om när steget
     visas (showStep → autoGrowAll) och vid varje input/change. */
  var AUTO_GROW_IDS = ['brief-input', 'image-subject', 'video-scene', 'code-task'];
  function autoGrow(ta) {
    if (!ta || !ta.offsetParent) return;           // dold → mät senare
    if (!ta.dataset.pgMinH) ta.dataset.pgMinH = String(ta.offsetHeight);
    var minH = +ta.dataset.pgMinH;
    var maxH = Math.max(minH, Math.min(420, Math.round(window.innerHeight * 0.55)));
    var border = ta.offsetHeight - ta.clientHeight;
    ta.style.height = minH + 'px';                 // nollställ innan mätning
    var needed = ta.scrollHeight + border;
    ta.style.height = Math.min(Math.max(needed, minH), maxH) + 'px';
    ta.style.overflowY = needed > maxH ? 'auto' : 'hidden';
  }
  function autoGrowAll() {
    if (!AUTO_GROW_IDS) return; // showStep() vid init körs innan denna rad nåtts
    AUTO_GROW_IDS.forEach(function (id) { autoGrow(document.getElementById(id)); });
  }
  AUTO_GROW_IDS.forEach(function (id) {
    var ta = document.getElementById(id);
    if (!ta) return;
    ta.style.transition = 'height .12s ease';
    ta.addEventListener('input',  function () { autoGrow(ta); });
    ta.addEventListener('change', function () { autoGrow(ta); });
  });
  window.addEventListener('resize', autoGrowAll);

  /* ── F. Expanderbara textareas: brief + bild + video + kod ── */
  (function () {
    /* Fältdefinitioner: id → rubrik i modalen */
    var FIELDS = [
      { id: 'brief-input',   title: 'Vad behöver du hjälp med?' },
      { id: 'image-subject', title: 'Beskriv din bild'          },
      { id: 'video-scene',   title: 'Beskriv din video'         },
      { id: 'code-task',     title: 'Beskriv din koduppgift'    },
    ];

    /* Skapa en delad modal — återanvänds för alla fält */
    var modal = document.createElement('div');
    modal.className = 'pg-brief-modal';
    modal.innerHTML =
      '<div class="pg-brief-modal-inner">' +
        '<div class="pg-brief-modal-header">' +
          '<p class="pg-brief-modal-title"></p>' +
          '<button type="button" class="pg-brief-modal-close" title="Stäng">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<textarea class="pg-brief-modal-ta" placeholder="Skriv här…"></textarea>' +
        '<div class="pg-brief-modal-footer">' +
          '<span class="pg-brief-modal-hint">Escape eller klicka utanför för att stänga</span>' +
          '<button type="button" class="pg-brief-modal-save">Spara &amp; stäng</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var modalTitle = modal.querySelector('.pg-brief-modal-title');
    var modalTa    = modal.querySelector('.pg-brief-modal-ta');
    var closeBtn   = modal.querySelector('.pg-brief-modal-close');
    var saveBtn    = modal.querySelector('.pg-brief-modal-save');
    var activeTA   = null; /* håller koll på vilket fält som är öppet */

    function openModal(ta, title) {
      activeTA             = ta;
      modalTitle.textContent = title;
      modalTa.placeholder  = ta.getAttribute('placeholder') || 'Skriv här…';
      modalTa.value        = ta.value;
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(function () {
        modalTa.focus();
        modalTa.selectionStart = modalTa.selectionEnd = modalTa.value.length;
      }, 180);
    }

    function closeModal() {
      if (activeTA) {
        activeTA.value = modalTa.value;
        activeTA.dispatchEvent(new Event('input',  { bubbles: true }));
        activeTA.dispatchEvent(new Event('change', { bubbles: true }));
      }
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      activeTA = null;
    }

    closeBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click',  closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    /* Initiera varje fält */
    FIELDS.forEach(function (field) {
      var ta = document.getElementById(field.id);
      if (!ta) return;

      /* Tillåt scrollning i fältet */
      ta.style.overflowY     = 'auto';
      ta.style.resize        = 'none';
      ta.style.paddingBottom = '44px';

      /* Wrapper för knapp-positionering */
      var taWrap = document.createElement('div');
      taWrap.className = 'pg-brief-wrap';
      ta.parentNode.insertBefore(taWrap, ta);
      taWrap.appendChild(ta);

      /* Expand-knapp med synlig label */
      var expandBtn = document.createElement('button');
      expandBtn.type      = 'button';
      expandBtn.className = 'pg-brief-expand-btn';
      expandBtn.title     = 'Öppna i helskärm';
      expandBtn.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="15 3 21 3 21 9"/>' +
          '<polyline points="9 21 3 21 3 15"/>' +
          '<line x1="21" y1="3" x2="14" y2="10"/>' +
          '<line x1="3" y1="21" x2="10" y2="14"/>' +
        '</svg>' +
        '<span class="pg-brief-expand-label">Expandera</span>';
      taWrap.appendChild(expandBtn);

      expandBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openModal(ta, field.title);
      });
    });
  })();

  /* ============================================================
     S. PROMPTBIBLIOTEK-SÖK
     Sökruta ovanför formuläret.
     Hämtar live-data från /prompt-data (Webflow Collection List).
     Uppdateras automatiskt varje gång du publicerar CMS-ändringar.
     ============================================================ */
  (function () {
    var DATA_URL = '/prompt-data';
    var cachedPrompts = null;

    /* Kategori → task-type-mappning */
    var CAT_MAP = {
      'Skrivande & Kommunikation':        'skriva-text',
      'Företag & Produktivitet':          'skriva-text',
      'E-post':                           'skriva-text',
      'Marknadsföring & Sociala Medier':  'skriva-text',
      'Kodning & Webb':                   'kod',
      'Vardag':                           'brainstorma',
      'Kreativitet':                      'brainstorma',
      'Bildgenerering':                   'bild',
      'Bild':                             'bild',
      'Allmänt':                          'skriva-text',
    };

    /* ── Bygg sök-UI ── */
    var wrap = document.createElement('div');
    wrap.className = 'pg-search-wrap';
    wrap.innerHTML =
      '<div class="pg-search-inner">' +
        '<svg class="pg-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
        '<input type="search" class="pg-search-input" id="pg-search-input" ' +
          'placeholder="Sök en färdig mall — fyller i alla steg åt dig" autocomplete="off" />' +
        '<button class="pg-search-clear" id="pg-search-clear" type="button" ' +
          'aria-label="Rensa sökning" style="display:none">✕</button>' +
      '</div>' +
      '<ul class="pg-search-dropdown" id="pg-search-dropdown" role="listbox" ' +
        'aria-label="Sökresultat från promptbiblioteket"></ul>' +
      '<div class="pg-search-banner" id="pg-search-banner"></div>';

    /* Föredra explicit mount-punkt i Kort B (#pg-template-search) om den finns.
       Annars faller vi tillbaka på den befintliga kedjan nedan (oförändrad),
       så nuvarande sida fungerar exakt som förut om diven saknas. */
    var inserted = false;
    var mount = document.getElementById('pg-template-search');
    if (mount) { mount.appendChild(wrap); inserted = true; }

    /* Infoga efter rubriken "Skapa bättre AI-prompter..." och före progress-baren */
    var headingEl = Array.from(document.querySelectorAll('p')).find(function (el) {
      return el.textContent && el.textContent.includes('Skapa bättre AI-prompter');
    });
    if (headingEl) {
      var headingWrap = headingEl.parentElement; /* div.margin-bottom.margin-small */
      if (headingWrap && headingWrap.parentElement) {
        headingWrap.parentElement.insertBefore(wrap, headingWrap.nextSibling);
        inserted = true;
      }
    }
    /* Fallback: före progress-baren */
    if (!inserted) {
      var progressWrap = document.querySelector('.progress-wrapper');
      if (progressWrap && progressWrap.parentElement) {
        progressWrap.parentElement.insertBefore(wrap, progressWrap);
        inserted = true;
      }
    }
    /* Sista fallback: före första form-steget */
    if (!inserted) {
      var firstStep = document.querySelector('.form-step');
      if (firstStep && firstStep.parentElement) {
        firstStep.parentElement.insertBefore(wrap, firstStep);
      }
    }

    var searchInput    = document.getElementById('pg-search-input');
    var dropdown       = document.getElementById('pg-search-dropdown');
    var clearBtn       = document.getElementById('pg-search-clear');
    var banner         = document.getElementById('pg-search-banner');
    /* Flytta "Startad från biblioteket"-bannern överst i preview-kortet
       (under rubriken "Live preview"), där den hör ihop med prompten. */
    (function () {
      var top = document.querySelector('#prompt-preview-wrapper .pg_preview_top');
      if (banner && top && top.parentNode) top.parentNode.insertBefore(banner, top.nextSibling);
    })();
    if (!searchInput) return;

    var activeIdx      = -1;
    var currentResults = [];

    /* ── Hämta + tolka prompt-data från Webflow-sidan ── */
    function loadPrompts(cb) {
      if (cachedPrompts) { cb(cachedPrompts); return; }
      fetch(DATA_URL)
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var parser = new DOMParser();
          var doc    = parser.parseFromString(html, 'text/html');
          cachedPrompts = Array.from(doc.querySelectorAll('.pg-data-item')).map(function (el) {
            var name = (el.querySelector('.pg-d-name')   || {}).textContent || '';
            var cat  = (el.querySelector('.pg-d-cat')    || {}).textContent || '';
            var slug = (el.querySelector('.pg-d-slug')   || {}).textContent || '';
            var pt   = (el.querySelector('.pg-d-prompt') || {}).textContent || '';
            var desc = (el.querySelector('.pg-d-desc')   || {}).textContent || '';
            return {
              name:     name.trim(),
              category: cat.trim(),
              slug:     slug.trim(),
              prompt:   pt.trim(),
              desc:     desc.trim(),
              tasktype: CAT_MAP[cat.trim()] || 'skriva-text',
            };
          }).filter(function (p) { return p.name; });
          cb(cachedPrompts);
        })
        .catch(function () { cachedPrompts = []; cb([]); });
    }

    /* ── Sökning: matchar titel och kategori ── */
    function doSearch(q, data) {
      var ql = q.toLowerCase().trim();
      /* I mobilens bottenark (avsnitt M): tomt sökord = bläddra bland alla */
      if (ql.length < 2) return sheetOpen ? data.slice() : [];
      return data.filter(function (p) {
        return p.name.toLowerCase().includes(ql) ||
               p.category.toLowerCase().includes(ql);
      }).sort(function (a, b) {
        var ai = a.name.toLowerCase().indexOf(ql);
        var bi = b.name.toLowerCase().indexOf(ql);
        if (ai >= 0 && bi < 0) return -1;
        if (bi >= 0 && ai < 0) return 1;
        return 0;
      }).slice(0, sheetOpen ? 60 : 8);
    }

    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ── Rendera dropdown ── */
    function renderDropdown(results) {
      dropdown.innerHTML = '';
      activeIdx      = -1;
      currentResults = results;
      if (!results.length) {
        if (sheetOpen && searchInput.value.trim().length >= 2) {
          dropdown.innerHTML = '<li class="pg-search-empty">Inga mallar matchar – prova ett annat ord</li>';
          dropdown.classList.add('is-open');
        } else {
          dropdown.classList.remove('is-open');
        }
        return;
      }
      results.forEach(function (p, i) {
        var li = document.createElement('li');
        li.className = 'pg-search-item';
        li.setAttribute('role', 'option');
        var descText = p.desc || '';
        li.innerHTML =
          '<div class="pg-search-item-left">' +
            '<span class="pg-search-item-name">' + esc(p.name) + '</span>' +
            (descText ? '<span class="pg-search-item-desc">' + esc(descText) + '</span>' : '') +
          '</div>' +
          '<span class="pg-search-item-cat">'  + esc(p.category) + '</span>';
        li.addEventListener('mousedown', function (e) {
          e.preventDefault();
          selectPrompt(p);
        });
        dropdown.appendChild(li);
      });
      dropdown.classList.add('is-open');
    }

    /* ── Välj prompt: fyll formuläret + navigera ── */
    function selectPrompt(p) {
      /* 1. Sätt task-type radio */
      var radio = document.querySelector('input[name="task-type"][value="' + p.tasktype + '"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      /* 2. Fyll rätt fält baserat på uppgiftstyp */
      var fieldId = (p.tasktype === 'bild' || p.tasktype === 'bildprompta') ? 'image-subject' :
                    p.tasktype === 'video' ? 'video-scene' :
                    p.tasktype === 'kod'   ? 'code-task'   : 'brief-input';
      var ta = document.getElementById(fieldId);
      if (ta) {
        ta.value = p.prompt;
        ta.dispatchEvent(new Event('input',  { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
      /* 3. Navigera till rätt steg */
      var target = (p.tasktype === 'bild' || p.tasktype === 'bildprompta') ? 'step-image' :
                   p.tasktype === 'video' ? 'step-video' :
                   p.tasktype === 'kod'   ? 'step-code'  : 'step-1';
      if (window.pgShowStep) window.pgShowStep(target);
      /* 3b. Gated-läge: visa stegen om de är dolda + logga att mall-vägen valdes */
      if (window.pgRevealSteps) window.pgRevealSteps('template');
      /* 4. Visa banner */
      banner.innerHTML =
        '🐒 <strong>Startad från biblioteket:</strong> ' + esc(p.name) +
        ' &mdash; anpassa fälten och tryck Nästa.' +
        ' <a href="/ai-prompter/' + esc(p.slug) + '" target="_blank" ' +
        'class="pg-search-banner-link">Se original ↗</a>';
      banner.classList.add('is-visible');
      /* 5. Rensa + stäng */
      dropdown.classList.remove('is-open');
      searchInput.value  = '';
      clearBtn.style.display = 'none';
      currentResults     = [];
      if (sheetOpen) closeSheet();
    }

    /* ── Event-lyssnare ── */
    var debTimer;
    searchInput.addEventListener('input', function () {
      var q = searchInput.value;
      clearBtn.style.display = q ? '' : 'none';
      clearTimeout(debTimer);
      if (q.length < 2 && !sheetOpen) { dropdown.classList.remove('is-open'); return; }
      debTimer = setTimeout(function () {
        loadPrompts(function (data) { renderDropdown(doSearch(q, data)); });
      }, 160);
    });

    searchInput.addEventListener('focus', function () {
      if (searchInput.value.length >= 2 && currentResults.length) {
        dropdown.classList.add('is-open');
      }
    });

    searchInput.addEventListener('keydown', function (e) {
      var items = dropdown.querySelectorAll('.pg-search-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        if (currentResults[activeIdx]) selectPrompt(currentResults[activeIdx]);
        return;
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('is-open');
        if (sheetOpen) closeSheet();
        return;
      }
      items.forEach(function (li, i) { li.classList.toggle('is-active', i === activeIdx); });
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) dropdown.classList.remove('is-open');
    });

    clearBtn.addEventListener('click', function () {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      dropdown.classList.remove('is-open');
      currentResults = [];
      searchInput.focus();
    });

    /* Förhämta data tyst i bakgrunden 800ms efter laddning */
    setTimeout(function () { loadPrompts(function () {}); }, 800);

    /* ============================================================
       M. MOBIL: SÖKRESULTAT SOM BOTTENARK
       På mobil (≤ 767 px) öppnar ett tryck i sökrutan ett ark som glider
       upp nerifrån i full bredd. Sök-wrappen (input + lista) FLYTTAS in
       i arket — samma sök-logik — och tillbaka när arket stängs. Tomt
       sökord = bläddra bland alla mallar. Stängs vid val, ✕, tryck
       utanför, svep nedåt på handtaget eller Escape. Desktop orört.
       ============================================================ */
    var sheetMQ = window.matchMedia('(max-width: 767px)');
    var sheet = null, sheetPanel = null, sheetBody = null;
    var sheetOpen = false, sheetHome = null;

    function injectSheetStyles() {
      if (document.getElementById('pg-sheet-style')) return;
      var st = document.createElement('style');
      st.id = 'pg-sheet-style';
      st.textContent =
        'html.pg-sheet-lock,html.pg-sheet-lock body{overflow:hidden!important}' +
        '.pg-sheet{position:fixed;inset:0;z-index:100000;pointer-events:none}' +
        '.pg-sheet.is-open{pointer-events:auto}' +
        '.pg-sheet-backdrop{position:absolute;inset:0;background:rgba(4,12,24,.55);opacity:0;transition:opacity .25s ease}' +
        '.pg-sheet.is-open .pg-sheet-backdrop{opacity:1}' +
        '.pg-sheet-panel{position:absolute;left:0;right:0;bottom:0;height:90vh;display:flex;flex-direction:column;' +
          'background:#0f2238;color:#f5f6fa;border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.35);' +
          'transform:translateY(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1);padding:0 16px env(safe-area-inset-bottom)}' +
        '.pg-sheet.is-open .pg-sheet-panel{transform:translateY(0)}' +
        '.pg-sheet-grab{padding:10px 0 4px;touch-action:none;cursor:grab}' +
        '.pg-sheet-handle{width:40px;height:5px;border-radius:3px;background:rgba(255,255,255,.25);margin:0 auto 10px}' +
        '.pg-sheet-head{display:flex;align-items:center;justify-content:space-between}' +
        '.pg-sheet-title{font-weight:700;font-size:1.05rem}' +
        '.pg-sheet-close{background:rgba(255,255,255,.08);border:0;color:inherit;width:34px;height:34px;border-radius:50%;font-size:15px;cursor:pointer}' +
        '.pg-sheet-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding-bottom:16px}' +
        '.pg-sheet .pg-search-wrap{margin:0}' +
        '.pg-sheet .pg-search-inner{position:sticky;top:0;z-index:2;padding:10px 0;background:#0f2238}' +
        '.pg-sheet .pg-search-dropdown{display:block!important;position:static!important;max-height:none!important;' +
          'overflow:visible!important;box-shadow:none!important;border:0!important;background:transparent!important;margin:0!important;padding:0!important}' +
        '.pg-sheet .pg-search-item{padding:14px 4px!important;border-bottom:1px solid rgba(255,255,255,.07)}' +
        '.pg-search-empty{list-style:none;padding:24px 8px;text-align:center;opacity:.6}' +
        'html.pg-light-page .pg-sheet-panel{background:#ffffff;color:#1a1f29}' +
        'html.pg-light-page .pg-sheet .pg-search-inner{background:#ffffff}' +
        'html.pg-light-page .pg-sheet-handle{background:rgba(17,24,39,.18)}' +
        'html.pg-light-page .pg-sheet-close{background:rgba(17,24,39,.06)}' +
        'html.pg-light-page .pg-sheet .pg-search-item{border-bottom-color:rgba(17,24,39,.07)}';
      document.head.appendChild(st);
    }

    function buildSheet() {
      injectSheetStyles();
      sheet = document.createElement('div');
      sheet.className = 'pg-sheet';
      sheet.innerHTML =
        '<div class="pg-sheet-backdrop"></div>' +
        '<div class="pg-sheet-panel" role="dialog" aria-modal="true" aria-label="Färdiga mallar">' +
          '<div class="pg-sheet-grab">' +
            '<div class="pg-sheet-handle"></div>' +
            '<div class="pg-sheet-head"><span class="pg-sheet-title">Färdiga mallar</span>' +
            '<button type="button" class="pg-sheet-close" aria-label="Stäng">✕</button></div>' +
          '</div>' +
          '<div class="pg-sheet-body"></div>' +
        '</div>';
      document.body.appendChild(sheet);
      sheetPanel = sheet.querySelector('.pg-sheet-panel');
      sheetBody  = sheet.querySelector('.pg-sheet-body');
      sheet.querySelector('.pg-sheet-backdrop').addEventListener('click', closeSheet);
      sheet.querySelector('.pg-sheet-close').addEventListener('click', closeSheet);

      /* Svep nedåt på handtaget/rubriken för att stänga */
      var grab = sheet.querySelector('.pg-sheet-grab'), y0 = null, dy = 0;
      grab.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; dy = 0; sheetPanel.style.transition = 'none'; }, { passive: true });
      grab.addEventListener('touchmove', function (e) {
        if (y0 === null) return;
        dy = Math.max(0, e.touches[0].clientY - y0);
        sheetPanel.style.transform = 'translateY(' + dy + 'px)';
      }, { passive: true });
      grab.addEventListener('touchend', function () {
        sheetPanel.style.transition = ''; sheetPanel.style.transform = '';
        if (dy > 90) closeSheet();
        y0 = null; dy = 0;
      });
    }

    /* Anpassa höjd/position efter synliga ytan (tangentbordet på iOS/Android) */
    function fitSheet() {
      if (!sheetOpen || !sheetPanel) return;
      var vv = window.visualViewport;
      if (!vv) return;
      sheetPanel.style.height = Math.round(vv.height * 0.9) + 'px';
      sheetPanel.style.bottom = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) + 'px';
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitSheet);
      window.visualViewport.addEventListener('scroll', fitSheet);
    }

    function openSheet() {
      if (sheetOpen) return;
      if (!sheet) buildSheet();
      sheetHome = { parent: wrap.parentNode, next: wrap.nextSibling, ph: searchInput.placeholder };
      searchInput.placeholder = 'Sök bland mallarna…';   // den långa kapas i arket
      sheetOpen = true;                       // före flytt: focus-lyssnaren ska inte öppna igen
      sheetBody.appendChild(wrap);
      sheet.classList.add('is-open');
      document.documentElement.classList.add('pg-sheet-lock');
      fitSheet();
      searchInput.focus({ preventScroll: true });   // flytten tappar fokus — återställ
      loadPrompts(function (data) { renderDropdown(doSearch(searchInput.value, data)); });
    }

    function closeSheet() {
      if (!sheetOpen) return;
      sheetOpen = false;
      sheet.classList.remove('is-open');
      document.documentElement.classList.remove('pg-sheet-lock');
      /* Tillbaka till där sökrutan låg — om inte avsnitt E redan flyttat den
         (mallval fäller ihop startkorten och flyttar sökrutan till raden). */
      if (sheet.contains(wrap) && sheetHome && sheetHome.parent) {
        sheetHome.parent.insertBefore(wrap, sheetHome.next && sheetHome.next.parentNode === sheetHome.parent ? sheetHome.next : null);
        searchInput.placeholder = sheetHome.ph;   // annars har avsnitt E redan satt rätt text
      }
      dropdown.classList.remove('is-open');
      if (document.activeElement === searchInput) searchInput.blur();
      sheetPanel.style.height = ''; sheetPanel.style.bottom = '';
    }
    window.pgCloseSearchSheet = closeSheet;

    searchInput.addEventListener('focus', function () {
      if (sheetMQ.matches && !sheetOpen) openSheet();
    });
  })();
});
