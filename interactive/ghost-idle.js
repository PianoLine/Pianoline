// Each eyelid pose has seven cloth phases. Hands and eyes share one resting glow row per eyelid pose.
(() => {
  const ghost = document.getElementById("ghost");
  const portrait = ghost.querySelector(".ghost-portrait");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  // The lower folds crest after the shoulder and settle last.
  const breath = [[0, 750], [1, 310], [2, 310], [3, 455], [4, 455], [5, 575], [6, 655]];
  // A small windup, a quick first strike, a shorter second knock and a trailing fingertip.
  const knocks = [[1, 95], [2, 100], [3, 125], [4, 55], [0, 170],
    [1, 65], [2, 90], [4, 55], [0, 0]];
  let loaded = false, inView = false, onPage = true, running = false;
  let sheetsRequested = false;
  const arena = ghost.closest(".arena");
  let breathTimer, tapTimer, blinkTimer;
  let breathRow = 0, lid = 0;

  function showFace() {
    portrait.style.setProperty("--pose-y", (lid * breath.length + breathRow) * -100 + "%");
    portrait.style.setProperty("--ember-y", (lid * 3) * -100 + "%");
  }

  function breathe(step) {
    const [row, duration] = breath[step];
    breathRow = row;
    showFace();
    breathTimer = setTimeout(() => breathe((step + 1) % breath.length), duration);
  }

  function waitForTap() {
    tapTimer = setTimeout(() => {
      if (Math.random() < .65) tap(0);
      else waitForTap();
    }, 5200 + Math.random() * 4400);
  }

  function tap(step) {
    const [column, duration] = knocks[step];
    portrait.style.setProperty("--pose-x", column * -100 + "%");
    if (step + 1 === knocks.length) waitForTap();
    else tapTimer = setTimeout(() => tap(step + 1), duration);
  }

  function waitForBlink() {
    blinkTimer = setTimeout(() => blink(0), 2850 + Math.random() * 3650);
  }

  function blink(step) {
    const frames = [[1, 50], [2, 85], [1, 70], [0, 0]];
    const [nextLid, duration] = frames[step];
    lid = nextLid;
    showFace();
    if (step + 1 === frames.length) waitForBlink();
    else blinkTimer = setTimeout(() => blink(step + 1), duration);
  }

  function updateIdle() {
    const visible = inView && onPage && !document.hidden && !motion.matches;
    if (visible && !sheetsRequested && (arena.classList.contains("modeled") || !arena.querySelector(".cabin-view"))) {
      sheetsRequested = true;
      // Give the resting portrait and the first room frame a paint before decoding the animation.
      requestAnimationFrame(() => {
        if (window.requestIdleCallback) window.requestIdleCallback(loadIdleSheets, {timeout: 1200});
        else setTimeout(loadIdleSheets, 0);
      });
    }
    const active = loaded && visible && !ghost.matches(".over, .hurt");
    if (running === active) return;
    running = active;
    portrait.classList.toggle("idle-playing", active);
    clearTimeout(breathTimer);
    clearTimeout(tapTimer);
    clearTimeout(blinkTimer);
    lid = breathRow = 0;
    portrait.style.removeProperty("--pose-x");
    portrait.style.removeProperty("--pose-y");
    portrait.style.removeProperty("--ember-y");
    if (active) {
      breathe(0);
      waitForTap();
      waitForBlink();
    }
  }

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateIdle();
  }).observe(portrait);
  new MutationObserver(updateIdle).observe(ghost, {attributes: true, attributeFilter: ["class"]});
  motion.addEventListener("change", updateIdle);
  arena.addEventListener("cabin-painted", updateIdle, {once: true});
  document.addEventListener("visibilitychange", updateIdle);
  window.addEventListener("pagehide", () => { onPage = false; updateIdle(); });
  window.addEventListener("pageshow", () => { onPage = true; updateIdle(); });
  // Local HTML can display ordinary images even where URL-based CSS masks are blocked.
  const resting = portrait.querySelector(".portrait-ink img");
  for (const layer of portrait.querySelectorAll(".warm-left, .warm-right")) {
    layer.append(resting.cloneNode());
  }
  async function loadIdleSheets() {
    if (!inView || !onPage || document.hidden || motion.matches) {
      sheetsRequested = false;
      return;
    }
    try {
      await Promise.all(Array.from(portrait.querySelectorAll(".portrait-layer"), loadLayer));
      loaded = true;
      updateIdle();
    } catch { /* Keep the resting portrait. */ }
  }
  async function loadLayer(layer) {
    const sheet = new Image();
    sheet.className = "idle-sheet";
    sheet.alt = "";
    sheet.draggable = false;
    sheet.fetchPriority = "low";
    const isGlow = layer.classList.contains("portrait-embers");
    sheet.src = isGlow
      ? "art/celadon-idle-expression.png?v=eyelids" : "art/celadon-idle.png?v=anchored-arms";
    await sheet.decode();
    if (sheet.naturalWidth !== 640 || sheet.naturalHeight !== (isGlow ? 1152 : 2688)) throw new Error("Unexpected portrait sheet size");
    layer.append(sheet);
  }
})();
