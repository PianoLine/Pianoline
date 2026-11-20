(() => {
  const params = new URLSearchParams(location.search);
  const preview = params.has("preview");
  const embedded = params.has("embed") && window.parent !== window;
  let content = window.PORTFOLIO_CONTENT;
  if (preview) {
    try {
      content = JSON.parse(localStorage.getItem("portfolio-editor-draft-v2")) || content;
    } catch (_) { /* The published content is available offline. */ }
  }
  const portfolio = window.normalizePortfolio(content);
  if (!embedded) window.setupSiteMusic(portfolio.playlist, preview, new URL("../", location.href));
  const projects = portfolio.projects || [];
  const deck = projects.map((_, i) => i);
  function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  const hand = [];
  const spent = [];
  function saveTable(orderedDeck = deck) {
    try {
      const ids = indices => indices.map(index => projects[index].id);
      sessionStorage.setItem(tableKey, JSON.stringify({ hand: ids(hand), deck: ids(orderedDeck), spent: ids(spent) }));
    } catch { /* The table also works without browser storage. */ }
  }
  function restoreTable() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(tableKey));
      if (!Array.isArray(saved?.hand) || !Array.isArray(saved.deck) || saved.hand.length > 5) return false;
      const indices = new Map(projects.map((project, index) => [project.id, index]));
      const savedSpent = saved.spent === undefined ? [] : saved.spent;
      if (!Array.isArray(savedSpent)) return false;
      const all = [...saved.hand, ...saved.deck, ...savedSpent];
      const known = new Set(all);
      if (known.size !== all.length) return false;
      const existing = ids => ids.filter(id => indices.has(id)).map(id => indices.get(id));
      const added = deck.filter(index => !known.has(projects[index].id));
      spent.push(...existing(savedSpent));
      hand.push(...existing(saved.hand));
      deck.splice(0, deck.length, ...existing(saved.deck), ...added);
      return true;
    } catch { return false; }
  }
  const resumed = resumeTable && restoreTable();
  if (!resumed) shuffleDeck();
  const get = id => document.getElementById(id);
  const ghost = get("ghost");
  const pile = get("deck");
  const tray = get("hand");
  const arena = get("arena");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const speech = get("speech");
  const voice = get("ghost-voice");
  const greeting = voice.textContent;
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("zh") : null;
  let farewell = false, spokenLine = "", speechFrame = 0;
  let welcomeTimer;
  let speechVisible = true;
  function say(text, leaving = false, audible = true) {
    clearTimeout(welcomeTimer);
    farewell = leaving;
    if (text === spokenLine) return 0;
    spokenLine = text;
    voice.textContent = text;
    cancelAnimationFrame(speechFrame);
    if (reduced() || document.hidden) {
      speech.textContent = text;
      if (audible && speechVisible) tableAudio.glyph(text[0]);
      return 0;
    }
    speech.replaceChildren();
    const glyphs = segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
    const beat = leaving ? 24 : 38;
    let elapsed = 0;
    const starts = glyphs.map(glyph => {
      const start = elapsed;
      elapsed += beat + (/[，、。！？…]/u.test(glyph) ? beat * 2 : 0);
      return start;
    });
    const began = performance.now();
    let index = 0;
    function reveal(now) {
      const previous = index;
      while (index < glyphs.length && starts[index] <= now - began) {
        const glyph = document.createElement("span");
        glyph.className = "speech-glyph";
        glyph.textContent = glyphs[index++];
        speech.append(glyph);
      }
      if (index > previous && audible && speechVisible) tableAudio.glyph(glyphs[index - 1]);
      if (index < glyphs.length) speechFrame = requestAnimationFrame(reveal);
    }
    reveal(began);
    return (starts.at(-1) || 0) + 140;
  }
  if (resumeTable) {
    say(greeting);
  } else {
    const lineTime = say("这里是我的小屋");
    welcomeTimer = setTimeout(() => say(greeting), lineTime + 1100);
  }
  function randomLine(lines) {
    const choices = lines.filter(line => line !== spokenLine);
    return choices[Math.floor(Math.random() * choices.length)];
  }
  arena.addEventListener("candle-toggle", ({ detail: { lit, count, total } }) => {
    if (farewell) return;
    if (!lit && count === total - 2) say("我喜欢这个感觉");
    if (!lit && count === 0) say("啊哈哈哈！现在我可是“黑暗之魂”");
    if (lit && count === 3) say("你怎么又给弄亮了…");
    if (lit && count === total) say("呃呃…好刺眼…");
  });
  arena.addEventListener("mousedown", event => {
    if (event.button === 0 && event.target.closest("button")) event.preventDefault();
  });
  function restoreGreeting() {
    if (farewell) say(greeting, false, false);
  }
  new IntersectionObserver(([entry]) => {
    speechVisible = entry.isIntersecting;
    if (!speechVisible) restoreGreeting();
  }).observe(speech);
  window.addEventListener("pagehide", restoreGreeting);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) restoreGreeting();
  });
  let locked = true;
  let pointer = null;

  const homeUrl = new URL("../index.html", location.href);
  if (preview) homeUrl.searchParams.set("preview", "1");
  document.querySelectorAll('a[href^="../index.html"]').forEach(link => {
    const target = new URL(homeUrl);
    target.hash = link.hash;
    link.href = target;
    if (embedded && target.hash) link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      window.parent.postMessage({ type: "portfolio-section", section: target.hash.slice(1) }, "*");
    });
  });
  const profile = content.profile || {};
  get("title").textContent = profile.name || "作品集";
  get("byline").textContent = profile.eyebrow || profile.headline || "";
  const openingNote = get("opening-note");
  openingNote.textContent = (profile.intro || "").trim();
  openingNote.hidden = !openingNote.textContent;

  function navigate(url) {
    (embedded ? window.parent : window).location.href = url;
  }
  const prints = new Map();
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const inkLevels = [28, 51, 88, 135, 180, 219, 248];

  async function printCover(image) {
    await image.decode();
    const canvas = document.createElement("canvas");
    // Keep the source aspect ratio so both layers share the same crop at any card size.
    const scale = Math.min(1, 100 / Math.min(image.naturalWidth, image.naturalHeight),
      360 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let pixels;
    try {
      pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      // File previews and cross-origin artwork can still display the small raster.
      if (error.name === "SecurityError") return canvas;
      throw error;
    }
    const { data } = pixels;
    const tones = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < tones.length; i++) {
      const p = i * 4;
      tones[i] = Math.round(.299 * data[p] + .587 * data[p+1] + .114 * data[p+2]);
    }
    const sorted = tones.slice().sort();
    const dark = Math.min(58, sorted[Math.floor(sorted.length * .03)]);
    const light = Math.max(156, sorted[Math.floor(sorted.length * .97)]);
    for (let i = 0; i < tones.length; i++) {
      const x = i % canvas.width, y = Math.floor(i / canvas.width);
      const dither = ((bayer[(y % 4) * 4 + x % 4] + .5) / 16 - .5) * .2;
      const last = inkLevels.length - 1;
      const tone = (tones[i] - dark) / (light - dark);
      // Reserve sparse paper cuts for middle shadows so highlights and lettering stay clear.
      const cut = tone > .20 && tone < .53 && (x + 2 * y) % 11 === 0 ? .42 : 0;
      const level = Math.round(tone * last + dither + cut);
      const ink = inkLevels[Math.max(0, Math.min(last, level))];
      data.fill(ink, i * 4, i * 4 + 3);
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  }

  // Animated card copies share the same print, including while a cover is loading.
  customElements.define("card-print", class extends HTMLElement {
    async connectedCallback() {
      const image = this.querySelector("img");
      if (!image) return;
      const src = image.src;
      if (!prints.has(src)) prints.set(src, printCover(image).catch(() => null));
      const print = await prints.get(src);
      if (!print || !this.isConnected) return;
      const copy = print.cloneNode();
      copy.getContext("2d").drawImage(print, 0, 0);
      this.replaceChildren(copy, image);
    }
  });

  function createHandSlot(id) {
    const project = projects[id];
    const wrap = document.createElement("div");
    wrap.className = "card-wrap";
    wrap.dataset.id = id;
    const face = document.createElement("div");
    face.className = "hand-face";
    const card = document.createElement("button");
    card.className = "card";
    card.dataset.id = id;
    card.tabIndex = -1;
    card.setAttribute("aria-label", "查看 " + project.title);
    card.innerHTML = '<b></b><card-print class="card-image" aria-hidden="true"></card-print><span class="folio"><span class="card-number"></span><small class="card-type"></small></span>';
    card.querySelector("b").textContent = project.title;
    card.querySelector(".card-number").textContent = project.number || String(id + 1).padStart(2, "0");
    card.querySelector(".card-type").textContent = project.category || "项目作品";
    const cardImage = project.cover?.cardSrc || project.cover?.src;
    if (cardImage) {
      const image = new Image();
      image.alt = "";
      image.draggable = false;
      image.src = new URL(cardImage, homeUrl).href;
      card.querySelector("card-print").append(image);
    }
    face.append(card);
    wrap.append(face);
    return wrap;
  }

  function updateDeck(count = deck.length) {
    get("remaining").textContent = count;
    arena.dispatchEvent(new CustomEvent("deck-size", { detail: count }));
  }

  function render(animate = true) {
    // Removing even one flex item immediately re-centres every surviving slot.
    // Capture the entire visible fan before changing any children or cancelling a slide.
    const slots = new Map(Array.from(tray.children, slot => [Number(slot.dataset.id), slot]));
    const previous = new Map();
    for (const [id, slot] of slots) previous.set(id, slot.getBoundingClientRect().left);
    for (const [id, slot] of slots) {
      slot.getAnimations().forEach(animation => animation.cancel());
      if (!hand.includes(id)) {
        slot.remove();
        slots.delete(id);
      }
    }
    tray.classList.toggle("hand-empty", !hand.length && projects.length > 0);
    if (!hand.length) {
      tray.textContent = projects.length ? "手牌为空，抽一张以继续" : "暂无项目卡。";
      if (spent.length === projects.length && spent.length) tray.textContent = "牌已用尽，点击怀表重新发牌";
      return;
    }
    if (!slots.size) tray.replaceChildren();
    hand.forEach((id, n) => {
      const slot = slots.get(id) || createHandSlot(id);
      const offset = n - (hand.length - 1) / 2;
      slot.style.setProperty("--angle", offset * 5 + "deg");
      slot.style.setProperty("--lift", offset * offset * 2.5 + "px");
      if (!slot.parentNode) tray.append(slot);
    });
    if (!animate || reduced()) return;
    for (const [id, slot] of slots) {
      const dx = previous.get(id) - slot.getBoundingClientRect().left;
      if (Math.abs(dx) <= 1) continue;
      slot.animate([{ translate: dx+"px" }, { translate: "0px" }],
        { duration: 440, easing: "cubic-bezier(.38,.08,.27,1)", fill: "backwards" });
    }
  }

  async function fly(card, from, to, action, dragged = false, duration = action === "draw" ? 390 : 255) {
    if (reduced() || !card.animate) return;
    const drawing = action === "draw";
    const clone = card.cloneNode(true);
    clone.classList.remove("dragging");
    clone.classList.add("flying-card");
    clone.setAttribute("aria-hidden", "true");
    clone.tabIndex = -1;
    const width = card.offsetWidth, height = card.offsetHeight;
    const face = new DOMMatrix(getComputedStyle(card.parentElement).transform);
    const angle = Math.atan2(face.b, face.a) * 180 / Math.PI;
    const scale = Math.hypot(face.a,face.b);
    const dx = from.left + from.width/2 - to.left - to.width/2;
    const dy = from.top + from.height/2 - to.top - to.height/2;
    const arc = Math.min(60, 12 + Math.hypot(dx,dy)*.09);
    Object.assign(clone.style, { visibility: "visible", width: width+"px", height: height+"px",
      left: to.left+(to.width-width)/2+"px", top: to.top+(to.height-height)/2+"px", transformOrigin: "center" });
    document.body.append(clone);
    const startX = drawing || dragged ? from.width/width : scale;
    const startY = drawing || dragged ? from.height/height : scale;
    const endX = scale;
    const endY = scale;
    const startAngle = drawing ? -9 : dragged ? -6 : angle;
    const endAngle = angle;
    const pose = (x,y,sx,sy,r) =>
      "translate("+x+"px,"+y+"px) rotate("+r+"deg) scale("+sx+","+sy+")";
    try {
      await clone.animate([
        {transform:pose(dx,dy,startX,startY,startAngle)},
        {offset:.54, transform:pose(dx*.43,dy*.43-arc,(startX+endX)*.51,(startY+endY)*.51,(startAngle+endAngle)/2-4)},
        {transform:pose(0,0,endX,endY,endAngle)}
      ], {duration, easing:"cubic-bezier(.24,.62,.32,1)"}).finished;
    } finally { clone.remove(); }
  }
  async function dealOne() {
    arena.dispatchEvent(new Event("deck-draw"));
    hand.push(deck.shift());
    saveTable();
    updateDeck();
    render();
    const card = tray.lastElementChild.querySelector(".card");
    card.style.visibility = "hidden";
    try { await fly(card, pile.querySelector(".control-art").getBoundingClientRect(), card.getBoundingClientRect(), "draw"); }
    finally { card.style.visibility = ""; }
  }
  async function dealHand() {
    const batch = deck.splice(0, 3);
    hand.push(...batch);
    saveTable();
    render();
    const cards = Array.from(tray.querySelectorAll(".card"));
    cards.forEach(card => { card.style.visibility = "hidden"; });
    const flights = cards.map(async (card, i) => {
      if (i && !reduced()) await new Promise(resolve => setTimeout(resolve, i * 85));
      updateDeck(deck.length + cards.length - i - 1);
      arena.dispatchEvent(new Event("deck-draw"));
      try {
        await fly(card, pile.querySelector(".control-art").getBoundingClientRect(), card.getBoundingClientRect(), "draw", false, 200);
      } finally { card.style.visibility = ""; }
    });
    await Promise.all(flights);
  }
  pile.onclick = async () => {
    if (locked || pointer) return;
    if (hand.length >= 5) return say("游戏王的卡牌上限有6张，但是我们不是游戏王");
    if (!deck.length) return say("这个时候应该出现一个冒骷髅头的牌");
    locked = true;
    try { await dealOne(); say("神之一手！…我是说魂之一手"); }
    finally { locked = false; }
  };
  function cardCorners(element, transformedElement) {
    const rect = element.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(transformedElement).transform);
    const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
    return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v]) => {
      const x=u*element.offsetWidth/2, y=v*element.offsetHeight/2;
      return [cx+matrix.a*x+matrix.c*y, cy+matrix.b*x+matrix.d*y];
    });
  }

  // Map the flat artwork onto a perspective quadrilateral in the iframe viewport.
  function fitCardPlane(corners, width, height) {
    const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = corners;
    const ax=x1-x2, ay=y1-y2, bx=x3-x2, by=y3-y2;
    const ex=x0-x1+x2-x3, ey=y0-y1+y2-y3;
    const determinant=ax*by-bx*ay;
    const g=Math.abs(determinant)>1e-6 ? (ex*by-bx*ey)/determinant : 0;
    const h=Math.abs(determinant)>1e-6 ? (ax*ey-ex*ay)/determinant : 0;
    return "matrix3d("+[
      (x1*(1+g)-x0)/width, (y1*(1+g)-y0)/width, 0, g/width,
      (x3*(1+h)-x0)/height, (y3*(1+h)-y0)/height, 0, h/height,
      0,0,1,0, x0,y0,0,1
    ].join(",")+")";
  }

  async function returnToDeck(card, draggedCorners, delay = 0, duration = draggedCorners ? 430 : 485) {
    if (reduced()) return;
    const start = draggedCorners || cardCorners(card, card.parentElement);
    const width = card.offsetWidth, height = card.offsetHeight;
    const flight = document.createElement("div");
    flight.className = "return-flight";
    flight.setAttribute("aria-hidden","true");
    flight.inert = true;
    flight.style.width = width+"px";
    flight.style.height = height+"px";
    const sides = document.createElement("div");
    sides.className = "flight-sides";
    const front = card.cloneNode(true);
    front.classList.remove("dragging");
    const back = document.createElement("div");
    back.className = "flight-back";
    sides.append(front, back);
    for (const edge of ["left", "right", "top", "bottom"]) {
      const strip = document.createElement("span");
      strip.className = "paper-edge " + edge;
      sides.append(strip);
    }
    const stock = document.createElement("div");
    stock.className = "flight-stock";
    stock.append(sides);
    flight.append(stock);
    flight.style.transform = fitCardPlane(start,width,height);
    document.body.append(flight);
    const began = performance.now();
    try {
      await new Promise(resolve => {
        function frame(now) {
          const t = reduced() ? 1 : Math.max(0,Math.min(1,(now-began-delay)/duration));
          const alignAt = .52;
          const approach = Math.min(1, t / alignAt);
          const travel = approach * approach * (3 - 2 * approach);
          const slide = Math.max(0, (t - alignAt) / (1 - alignAt));
          const inserted = slide * (2 - slide);
          const target = {};
          arena.dispatchEvent(new CustomEvent("deck-landing", {detail: target}));
          const art = pile.querySelector(".control-art");
          const end = target.corners || cardCorners(art, art);
          // Match velocity at the seam: approach the near lip, then feed under it.
          const tangent = 2 * alignAt / (1 - alignAt);
          const depth = travel * (1 - inserted) + tangent * approach ** 2 * (1 - approach);
          const arc = Math.sin(Math.PI * approach) ** 2 * (draggedCorners ? 12 : 22);
          const quad = start.map(([x, y], i) => {
            const leftSide = i === 0 || i === 3;
            const rear = end[leftSide ? 0 : 1];
            const near = end[leftSide ? 3 : 2];
            return [x + (end[i][0] - x) * travel + (near[0] - rear[0]) * depth,
              y + (end[i][1] - y) * travel + (near[1] - rear[1]) * depth - arc];
          });
          if (slide && deck.length) flight.style.clipPath = "inset(" + inserted * 100 + "% 0 0 0)";
          flight.style.transform = fitCardPlane(quad,width,height);
          const flip = Math.max(0,Math.min(1,(t-.025)/.46));
          sides.style.transform = "rotateY("+(180*flip*flip*(3-2*flip))+"deg)";
          if (t<1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    } finally { flight.remove(); }
  }

  let returnFeedbackTimer;
  async function putBack(id, draggedCorners) {
    if (locked || pointer || !hand.includes(id)) return;
    locked = true;
    tableAudio.play("slide");
    clearTimeout(returnFeedbackTimer);
    pile.classList.add("returning");
    const index = hand.indexOf(id);
    const card = tray.children[index].querySelector(".card");
    const flight = returnToDeck(card, draggedCorners);
    tray.classList.add("regrouping");
    hand.splice(index, 1);
    saveTable([...deck, id]);
    render();
    try { await flight; }
    finally {
      deck.push(id);
      updateDeck();
      arena.dispatchEvent(new Event("deck-return"));
      returnFeedbackTimer=setTimeout(() => pile.classList.remove("returning"), 70);
      tray.classList.remove("regrouping");
      locked = false;
    }
  }
  const shuffleButton = get("shuffle");
  shuffleButton.disabled = !projects.length;
  shuffleButton.onclick = async () => {
    if (locked || pointer || !projects.length) return;
    locked = true;
    tableAudio.play("wind");
    shuffleButton.setAttribute("aria-busy", "true");
    arena.classList.add("shuffling");
    try {
      const flights = Array.from(tray.querySelectorAll(".card"), (card, index) =>
        returnToDeck(card, null, index * 27, 238));
      const collected = hand.splice(0);
      render();
      await Promise.all(flights);
      deck.push(...collected, ...spent.splice(0));
      shuffleDeck();
      updateDeck();
      arena.dispatchEvent(new Event("deck-shuffle"));
      if (!reduced()) await new Promise(resolve => setTimeout(resolve, 330));
      await dealHand();
      say("并非时间倒流");
    } finally {
      arena.classList.remove("shuffling");
      shuffleButton.removeAttribute("aria-busy");
      locked = false;
    }
  };
  let projectExitTimer;
  let playingProject = false;
  let playedCard = null;
  let liftedCard, portal;
  let leavingThroughPortal = false;
  function clearPortal() {
    for (const layer of [liftedCard, portal]) {
      layer?.getAnimations().forEach(animation => animation.cancel());
      layer?.remove();
    }
    arena.classList.remove("entering-card");
    liftedCard = portal = null;
  }

  async function enterCard(source, url, lineTime) {
    const bounds = source.getBoundingClientRect();
    const face = new DOMMatrix(getComputedStyle(source.parentElement).transform);
    const angle = Math.atan2(face.b, face.a) * 180 / Math.PI;
    const zoom = Math.min(1.65, innerHeight * .60 / source.offsetHeight, innerWidth * .78 / source.offsetWidth);
    const x = innerWidth * .5 - (bounds.left + bounds.width / 2);
    const y = innerHeight * .54 - (bounds.top + bounds.height / 2);
    liftedCard = source.cloneNode(true);
    liftedCard.classList.add("flying-card", "played-cover");
    liftedCard.setAttribute("aria-hidden", "true");
    Object.assign(liftedCard.style, {
      left: (bounds.left + (bounds.width - source.offsetWidth) / 2) + "px",
      top: (bounds.top + (bounds.height - source.offsetHeight) / 2) + "px",
      width: source.offsetWidth + "px", height: source.offsetHeight + "px",
      filter: getComputedStyle(source).filter
    });
    document.body.append(liftedCard);
    source.classList.add("played");
    arena.classList.add("entering-card");
    try {
      const startScale = Math.hypot(face.a, face.b);
      const lean = Math.max(-7, Math.min(7, x / 28));
      await liftedCard.animate([
        {transform: "perspective(900px) rotate(" + angle + "deg) scale(" + startScale + ")",
          easing: "cubic-bezier(.18,.64,.28,1)"},
        {offset: .68, transform: "perspective(900px) translate(" + x*.92 + "px," + (y-5) + "px) rotateY(" + lean + "deg) scale(" + zoom*.92 + ")",
          easing: "cubic-bezier(.26,.38,.58,1)"},
        {transform: "perspective(900px) translate(" + x + "px," + y + "px) rotateY(0deg) scale(" + zoom + ")"}
      ], {duration: Math.max(345, lineTime + 75), fill: "forwards"}).finished;

      const art = liftedCard.querySelector(".card-image");
      const frame = art.getBoundingClientRect();
      // The artwork crosses the iframe edge so the header also disappears into the picture.
      let host = document, offsetX = 0, offsetY = 0;
      if (embedded && window.frameElement) {
        const iframe = window.frameElement;
        const origin = iframe.getBoundingClientRect();
        host = iframe.ownerDocument;
        offsetX = origin.left + iframe.clientLeft;
        offsetY = origin.top + iframe.clientTop;
      }
      const image = art.querySelector("img");
      portal = host.createElement("div");
      portal.dataset.cardDeparture = "";
      portal.setAttribute("aria-hidden", "true");
      Object.assign(portal.style, {
        position: "fixed", inset: "0", zIndex: "2000", pointerEvents: "none",
        overflow: "hidden", background: "#211e17"
      });
      host.body.append(portal);
      const view = portal.getBoundingClientRect();
      const scale = frame.width / art.offsetWidth;
      const left = offsetX + frame.left + art.clientLeft * scale;
      const top = offsetY + frame.top + art.clientTop * scale;
      const width = art.clientWidth * scale, height = art.clientHeight * scale;
      const right = view.width - left - width, bottom = view.height - top - height;
      // The final pose lives in the DOM, including while the browser retires the iframe.
      const timing = {duration: 365, endDelay: 34, easing: "cubic-bezier(.37,.08,.23,1)", fill: "backwards"};

      // Move the picture uniformly while its window opens from portrait to landscape.
      // Matching the source crop here keeps details in place as they cross the paper edge.
      if (image?.naturalWidth) {
        const picture = host.createElement("img");
        picture.alt = "";
        picture.src = image.currentSrc || image.src;
        portal.append(picture);
        const startFit = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const endFit = Math.max(view.width / image.naturalWidth, view.height / image.naturalHeight);
        // Use the uncropped source plane: wide covers can extend outside both windows.
        const planeWidth = image.naturalWidth * endFit, planeHeight = image.naturalHeight * endFit;
        Object.assign(picture.style, {position: "absolute", display: "block", maxWidth: "none", width: planeWidth + "px", height: planeHeight + "px",
          left: (view.width - planeWidth)/2 + "px", top: (view.height - planeHeight)/2 + "px", transform: "scale(1.035)"});
        const dx = left + width/2 - view.width/2, dy = top + height/2 - view.height/2;
        picture.animate([
          {transform: "translate(" + dx + "px," + dy + "px) scale(" + startFit / endFit + ")"},
          {transform: "translate(0,0) scale(1.035)"}
        ], timing);
      }
      await portal.animate([
        {clipPath: "inset(" + top + "px " + right + "px " + bottom + "px " + left + "px)", filter: liftedCard.style.filter},
        {clipPath: "inset(0px 0px 0px 0px)", filter: "brightness(1)"}
      ], timing).finished;
    } catch { /* Navigation also works when an animation is interrupted. */ }
    if (playedCard === null) return;
    leavingThroughPortal = Boolean(portal);
    try { sessionStorage.setItem("portfolio-card-entry", "portal:" + url.href); } catch (_) {}
    navigate(url);
  }

  function playCard(id, delivered) {
    if (locked || !hand.includes(id)) return;
    locked = true;
    playingProject = true;
    playedCard = id;
    // Commit the move once. Keep its visible slot through the exit animation.
    spent.push(...hand.splice(hand.indexOf(id), 1));
    saveTable();
    const source = tray.querySelector('.card[data-id="'+id+'"]');
    const project = projects[id];
    const url = new URL(window.portfolioProjectPath(project, preview), homeUrl);

    if (!delivered) {
      tableAudio.play("lift");
      const lineTime = say(randomLine(["拜拜~", "神秘的传送魔法"]), true);
      if (reduced() || !source.animate) {
        projectExitTimer = setTimeout(() => navigate(url), Math.max(330, lineTime + 120));
      } else {
        enterCard(source, url, lineTime);
      }
      return;
    }

    source.classList.add("played");
    const damage = 36 + Math.floor(Math.random() * 19);
    ghost.dataset.impact = "drag";
    ghost.querySelector(".hit").textContent = "−" + damage;
    ghost.classList.add("hurt");
    arena.dispatchEvent(new CustomEvent("cabin-hit", {detail: {mode: "drag", damage}}));
    const lineTime = say(randomLine(["呃啊！我该让你交点罚款…", "有点疼…"]), true);
    const transition = get("transition");
    const image = get("transition-image");
    const cover = project.cover?.src || project.cover?.cardSrc;
    const point = ghost.getBoundingClientRect(), scene = arena.getBoundingClientRect();
    transition.style.setProperty("--deal-x", (point.left + point.width / 2 - scene.left - scene.width / 2) + "px");
    transition.style.setProperty("--deal-y", (point.top + point.height / 2 - scene.top - scene.height / 2) + "px");
    get("transition-title").textContent = project.title;
    image.hidden = !cover;
    image.onerror = () => { image.hidden = true; };
    if (cover) image.src = new URL(cover, homeUrl).href;
    projectExitTimer = setTimeout(() => {
      if (reduced()) { navigate(url); return; }
      transition.classList.add("active");
      projectExitTimer = setTimeout(() => {
        try { sessionStorage.setItem("portfolio-card-entry", url.href); } catch (_) {}
        navigate(url);
      }, 480);
    }, Math.max(reduced() ? 330 : 460, lineTime + 140));
  }
  tray.addEventListener("pointerdown", event => {
    const card = event.target.closest(".card-wrap")?.querySelector(".card");
    if (!card || pointer || locked || !event.isPrimary || event.button !== 0) return;
    pointer = { card, id: event.pointerId, x: event.clientX, y: event.clientY, clone: null };
    card.setPointerCapture(event.pointerId);
  });
  function dropTarget(event) {
    return [ghost, pile].find(target => {
      const rect = target.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
  }
  tray.addEventListener("pointermove", event => {
    if (pointer?.id !== event.pointerId) return;
    if (!pointer.clone) {
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) <= 7) return;
      pointer.clone = pointer.card.cloneNode(true);
      pointer.clone.classList.add("drag-clone");
      pointer.clone.tabIndex = -1;
      pointer.clone.setAttribute("aria-hidden", "true");
      document.body.append(pointer.clone);
      pointer.card.classList.add("dragging");
      say("不要甩到家具！");
    }
    pointer.clone.style.left = event.clientX + "px";
    pointer.clone.style.top = event.clientY + "px";
    const target = dropTarget(event);
    ghost.classList.toggle("over", target === ghost);
    pile.classList.toggle("over", target === pile);
    pointer.clone.classList.toggle("return-target", target === pile);
  });
  async function finish(event) {
    if (pointer?.id !== event.pointerId) return;
    const { card, clone } = pointer;
    pointer = null;
    const droppedFrom = clone?.getBoundingClientRect();
    const draggedCorners = clone && cardCorners(clone,clone);
    clone?.remove();
    card.classList.remove("dragging");
    ghost.classList.remove("over");
    pile.classList.remove("over");
    if (event.type !== "pointerup") return;
    const id = Number(card.dataset.id);
    const target = dropTarget(event);
    if (!clone || target === ghost) playCard(id, Boolean(clone));
    else if (target === pile) putBack(id, draggedCorners);
    else {
      locked = true;
      card.style.visibility = "hidden";
      try { await fly(card, droppedFrom, card.getBoundingClientRect(), "recover", true); }
      finally { card.style.visibility = ""; locked = false; }
    }
  }
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => tray.addEventListener(type, finish));
  const chatter = [
    "我要是有实体就自己把蜡烛吹灭了",
    "别看了，我的袖口可藏不了牌",
    "右边那几本书有魔法的力量…",
    "是不是该换个装扮？"
  ];
  ghost.onclick = () => {
    if (!locked && !pointer) say(randomLine(chatter));
  };
  get("end").onclick = () => {
    if (locked || pointer) return;
    locked = true;
    arena.dispatchEvent(new Event("ring-bell"));
    const lineTime = say("回合结束，去看看最新动态吧。", true);
    setTimeout(() => {
      locked = false;
      if (embedded) window.parent.postMessage({ type: "portfolio-section", section: "updates" }, "*");
      else navigate(homeUrl.href + "#updates");
    }, Math.max(540, lineTime + 140));
  };
  window.addEventListener("pagehide", () => {
    clearTimeout(projectExitTimer);
    // The outgoing document may still be displayed until the project paints.
    if (!leavingThroughPortal) clearPortal();
    playedCard = null;
  });
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    say(greeting);
    if (playingProject) {
      clearPortal();
      leavingThroughPortal = false;
      render(false);
      playingProject = false;
      locked = false;
    }
    tray.querySelector(".played")?.classList.remove("played");
    ghost.classList.remove("hurt");
    get("transition").classList.remove("active");
  });
  // Cue each prop once, when it is actually visible; a player's first action takes priority.
  const cueTimers = new Map();
  function clearCue(button) {
    clearTimeout(cueTimers.get(button));
    cueTimers.delete(button);
    button.classList.remove("prop-cue");
    delete button.dataset.cueStart;
  }
  const cueObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const button = entry.target;
      clearCue(button);
      if (entry.intersectionRatio < .5) continue;
      cueTimers.set(button,setTimeout(() => {
        cueObserver.unobserve(button);
        if (document.hidden || button.matches(":hover")) return;
        button.dataset.cueStart = performance.now();
        button.classList.add("prop-cue");
        cueTimers.set(button,setTimeout(() => clearCue(button),1250));
      },button === pile ? 550 : 2150));
    }
  }, {threshold:.5});
  arena.addEventListener("opening-dealt", () => {
    for (const button of [pile,get("end")]) cueObserver.observe(button);
  }, {once:true});
  function endCues() {
    cueObserver.disconnect();
    clearCue(pile);
    clearCue(get("end"));
  }
  arena.addEventListener("pointerdown",endCues,{once:true,capture:true});

  updateDeck();
  if (resumed) {
    render();
    locked = false;
  } else requestAnimationFrame(() => requestAnimationFrame(async () => {
    try { await dealHand(); }
    finally {
      locked = false;
      if (projects.length) arena.dispatchEvent(new Event("opening-dealt"));
    }
  }));
  if (embedded) {
    new ResizeObserver(() => window.parent.postMessage({ type: "portfolio-table-height", height: Math.ceil(arena.getBoundingClientRect().height) }, "*")).observe(arena);
  }
})();
