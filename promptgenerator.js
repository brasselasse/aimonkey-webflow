/* Confetti loader */
(function(){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";document.head.appendChild(s);})();

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

  const genericFlow  = ["step-1", "step-2", "step-3", "step-4", "step-5", "step-checkpoint"];
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
    /* Öppna avancerade inställningar automatiskt vid steg 6 */
    if (stepId === "step-checkpoint" && advancedSec && advancedSec.style.display !== "block") {
      advancedSec.style.display = "block";
      if (advancedBtn) advancedBtn.textContent = "Dölj avancerade inställningar";
    }
    updateProgress();
    updateLivePreview();
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
      return showStep("step-2");
    }
    const i = genericFlow.indexOf(currentStepId);
    if (i !== -1 && i < genericFlow.length - 1) showStep(genericFlow[i + 1]);
  }
  document.getElementById("goto-prompt")?.addEventListener("click", (e) => {
    e.preventDefault();
    buildAndShowFinalPrompt();
  });
  document.getElementById("goto-advanced")?.addEventListener("click", (e) => {
    e.preventDefault();
    goNext();
  });
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
      ton:           checkedValue("Ton"),
      outputFormat:  checkedValue("output-format"),
      language:      checkedValue("language-select"),
      length:        sliderLength(),
      constraints:   $val("#constraints-input"),
      askQuestions:  $check("#ask-questions"),
      useExamples:   $check("#use-examples"),
      stepByStep:    $check("#step-by-step"),
      threeOptions:  $check("#three-options"),
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
  const TONE = {
    professionell: "Skriv på ett professionellt och tydligt sätt.",
    vänlig:        "Skriv på ett vänligt och lättillgängligt sätt.",
    kreativ:       "Skriv kreativt och inspirerande.",
    akademisk:     "Skriv med en akademisk och formell ton.",
    direkt:        "Skriv kortfattat och rakt på sak.",
    övertygande:   "Skriv övertygande och säljande.",
  };
  const FORMAT = {
    bullet:   "Presentera svaret som punktlista.",
    numbered: "Presentera svaret som numrerad lista.",
    table:    "Presentera svaret i tabellform.",
    markdown: "Presentera svaret i tydlig markdown.",
    json:     "Presentera svaret som JSON.",
  };
  const TASK = {
    "skriva text": (c) => `Skriv text utifrån följande brief: ${c}`,
    "skriva-text": (c) => `Skriv text utifrån följande brief: ${c}`,
    analysera:     (c) => `Analysera följande: ${c}`,
    sammanfatta:   (c) => `Sammanfatta följande: ${c}`,
    brainstorma:   (c) => `Brainstorma idéer utifrån följande: ${c}`,
    förklara:      (c) => `Förklara följande på ett tydligt sätt: ${c}`,
    forklara:      (c) => `Förklara följande på ett tydligt sätt: ${c}`,
    bild:          (c) => `Skapa en bildprompt baserat på följande: ${c}`,
    bildprompta:   (c) => `Skapa en bildprompt baserat på följande: ${c}`,
    video:         (c) => `Skapa en videoprompt baserat på följande: ${c}`,
    kod:           (c) => `Lös följande programmeringsuppgift: ${c}`,
  };
  function buildBlocks(d) {
    const isImage = d.taskType === "bild" || d.taskType === "bildprompta";
    const isVideo = d.taskType === "video";
    const isCode  = d.taskType === "kod";
    const sys = [], task = [], out = [], rules = [], cat = [];
    if (isImage)      sys.push("Agera som en expert på AI-bildprompter.", "Använd visuellt beskrivande språk.");
    else if (isVideo) sys.push("Agera som en expert på AI-videoprompter.", "Beskriv scen, rörelse, tempo, ljus och kamera tydligt.");
    else if (isCode)  sys.push("Agera som en senior utvecklare som skriver tydlig och robust kod.");
    else {
      const role = d.customRole || d.roll;
      if (role) sys.push(`Agera som en erfaren ${role}.`);
    }
    if (TONE[d.ton]) sys.push(TONE[d.ton]);
    const content = (isImage && d.imageSubject) || (isVideo && d.videoScene) || (isCode && d.codeTask) || d.brief;
    if (content) {
      const fn = TASK[d.taskType];
      task.push(fn ? fn(content) : `Hjälp mig med följande: ${content}`);
    }
    if (d.malgrupp)      task.push(`Målgruppen är: ${d.malgrupp}.`);
    if (d.language)      out.push(`Svara på ${d.language}.`);
    if (d.outputFormat)  out.push(FORMAT[d.outputFormat] || `Format: ${d.outputFormat}.`);
    if (d.length)        out.push(`Längd: ${d.length}.`);
    if (d.useExamples)   out.push("Inkludera exempel.");
    if (d.stepByStep)    out.push("Arbeta steg för steg.");
    if (d.threeOptions)  out.push("Ge tre alternativ.");
    if (isImage) out.push("Skriv en färdig bildprompt som kan användas direkt.");
    if (isVideo) out.push("Skriv en färdig videoprompt som kan användas direkt.");
    if (isCode)  out.push("Skriv fungerande kod som kan användas direkt.");
    if (d.askQuestions) rules.push("Ställ frågor om något är oklart.");
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
    return {
      system:   sys.join("\n"),
      task:     task.join("\n"),
      output:   out.join("\n"),
      rules:    rules.join("\n"),
      category: cat.join("\n"),
    };
  }
  function buildRaw(b) {
    const parts = [];
    if (b.system)   parts.push("SYSTEM",   b.system,   "");
    if (b.task)     parts.push("UPPGIFT",  b.task,     "");
    if (b.output)   parts.push("OUTPUT",   b.output,   "");
    if (b.rules)    parts.push("REGLER",   b.rules,    "");
    if (b.category) parts.push("KATEGORI", b.category);
    return parts.join("\n").trim();
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
  if (copyBtn) {
    copyBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const text = previewRaw?.value?.trim() || "";
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = "Kopierad! 🎉";
        fireConfetti();
        if (toolLinks) toolLinks.classList.add("is-revealed");
        saveRecentPrompt(text, checkedValue("task-type", "").toLowerCase());
        setTimeout(() => (copyBtn.textContent = original), 1800);
      });
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
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      document.querySelectorAll("select").forEach((el) => (el.selectedIndex = 0));
      if (advancedSec) advancedSec.style.display = "none";
      if (advancedBtn) advancedBtn.textContent = "Visa avancerade inställningar";
      if (toolLinks)   toolLinks.classList.remove("is-revealed");
      if (lengthSlider) delete lengthSlider.dataset.touched;
      hasFirstContent = false;
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
          input.dispatchEvent(new Event("change", { bubbles: true }));
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
    /* 0 – Steg 1: Typ av uppgift */
    () => !!document.querySelector('input[name="task-type"]:checked'),
    /* 1 – Steg 2: Brief */
    () => ($val("#brief-input").length >= 3),
    /* 2 – Steg 3: Ton */
    () => !!document.querySelector('input[name="Ton"]:checked'),
    /* 3 – Steg 4: Roll */
    () => !!document.querySelector('input[name="Roll"]:checked') ||
          $val("#custom-role-input").length > 0,
    /* 4 – Steg 5: Målgrupp */
    () => $val("#malgrupp-input").length > 0,
    /* 5 – Steg 6: Klar när step-checkpoint är aktivt steg */
    () => currentStepId === "step-checkpoint" ||
          genericFlow.indexOf(currentStepId) > genericFlow.indexOf("step-checkpoint"),
  ];

  // Hämta de top-level headers (direkta barn av formuläret)
  const form           = document.getElementById("wf-form-Contact-1-Form");
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

    /* ── Steg 2: Brief → rätt fält baserat på task-type ──
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

    /* ── Steg 3: Ton (radio) ── */
    if (ton) {
      const radio = document.querySelector(`input[name="Ton"][value="${ton}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    /* ── Steg 4: Roll — testa radio först, annars custom-fält ── */
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

    /* ── Steg 5: Målgrupp ── */
    const malgruppEl = document.getElementById("malgrupp-input");
    if (malgruppEl && malgrupp) {
      malgruppEl.value = malgrupp;
      malgruppEl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    /* ── Navigera till rätt steg beroende på task-type ── */
    var mediaStepMap = { bild: "step-image", bildprompta: "step-image", video: "step-video", kod: "step-code" };
    var targetStep = mediaStepMap[tasktype] || "step-2";
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
  showStep("step-1");
  updateLivePreview(); // kör även updateChecks() + updateHeaderVisibility()

  /* Hantera URL-import sist (efter att step-1 är visat och DOM är redo) */
  handleImportedPrompt();

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
      'Bildgenerering':                   'bildprompta',
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
          'placeholder="Sök bland 160+ färdiga prompter…" autocomplete="off" />' +
        '<button class="pg-search-clear" id="pg-search-clear" type="button" ' +
          'aria-label="Rensa sökning" style="display:none">✕</button>' +
      '</div>' +
      '<ul class="pg-search-dropdown" id="pg-search-dropdown" role="listbox" ' +
        'aria-label="Sökresultat från promptbiblioteket"></ul>' +
      '<div class="pg-search-banner" id="pg-search-banner"></div>';

    /* Infoga efter rubriken "Skapa bättre AI-prompter..." och före progress-baren */
    var inserted = false;
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
            return {
              name:     name.trim(),
              category: cat.trim(),
              slug:     slug.trim(),
              prompt:   pt.trim(),
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
      if (ql.length < 2) return [];
      return data.filter(function (p) {
        return p.name.toLowerCase().includes(ql) ||
               p.category.toLowerCase().includes(ql);
      }).sort(function (a, b) {
        var ai = a.name.toLowerCase().indexOf(ql);
        var bi = b.name.toLowerCase().indexOf(ql);
        if (ai >= 0 && bi < 0) return -1;
        if (bi >= 0 && ai < 0) return 1;
        return 0;
      }).slice(0, 8);
    }

    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ── Rendera dropdown ── */
    function renderDropdown(results) {
      dropdown.innerHTML = '';
      activeIdx      = -1;
      currentResults = results;
      if (!results.length) { dropdown.classList.remove('is-open'); return; }
      results.forEach(function (p, i) {
        var li = document.createElement('li');
        li.className = 'pg-search-item';
        li.setAttribute('role', 'option');
        li.innerHTML =
          '<span class="pg-search-item-name">' + esc(p.name) + '</span>' +
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
                   p.tasktype === 'kod'   ? 'step-code'  : 'step-2';
      if (window.pgShowStep) window.pgShowStep(target);
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
    }

    /* ── Event-lyssnare ── */
    var debTimer;
    searchInput.addEventListener('input', function () {
      var q = searchInput.value;
      clearBtn.style.display = q ? '' : 'none';
      clearTimeout(debTimer);
      if (q.length < 2) { dropdown.classList.remove('is-open'); return; }
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
  })();
});