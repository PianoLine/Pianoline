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
  const projects = window.normalizePortfolio(content).projects || [];
  const deck = projects.map((_, i) => i);
  function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  const hand = [];
  function saveTable(orderedDeck = deck) {
    try {
      const ids = indices => indices.map(index => projects[index].id);
      sessionStorage.setItem(tableKey, JSON.stringify({ hand: ids(hand), deck: ids(orderedDeck) }));
    } catch { /* The table also works without browser storage. */ }
  }
  function restoreTable() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(tableKey));
      if (!Array.isArray(saved?.hand) || !Array.isArray(saved.deck) || saved.hand.length > 5) return false;
      const indices = new Map(projects.map((project, index) => [project.id, index]));
      const all = [...saved.hand, ...saved.deck];
      if (all.length !== projects.length || new Set(all).size !== all.length || !all.every(id => indices.has(id))) return false;
      hand.push(...saved.hand.map(id => indices.get(id)));
      deck.splice(0, deck.length, ...saved.deck.map(id => indices.get(id)));
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
  const greeting = speech.textContent;
  let farewell = false;
  const say = (text, leaving = false) => {
    speech.textContent = text;
    farewell = leaving;
  };
  function restoreGreeting() {
    if (farewell) say(greeting);
  }
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) restoreGreeting();
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
  const inkLevels = [23, 46, 73, 101, 130, 160, 189, 216, 241];

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
      const level = Math.round((tones[i] - dark) / (light - dark) * last + dither);
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
    card.setAttribute("aria-keyshortcuts", "Delete");
    card.setAttribute("aria-label", "查看 " + project.title);
    card.innerHTML = '<span class="folio" aria-hidden="true"><span></span><span>✦</span></span><card-print class="card-image" aria-hidden="true"></card-print><b></b><small class="card-type"></small>';
    card.querySelector(".folio span").textContent = project.number || String(id + 1).padStart(2, "0");
    card.querySelector("b").textContent = project.title;
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

  function render(removedIndex = -1, animate = true) {
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
    if (!hand.length) {
      tray.textContent = deck.length || removedIndex >= 0 ? "手牌空了，抽一张继续。" : "暂无项目卡。";
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
    if (hand.length >= 5) return say("手牌满了，先放回一张吧。");
    if (!deck.length) return say("牌库空了，把手牌放回来再抽吧。");
    locked = true;
    try { await dealOne(); say("新牌到手，来试试看？"); }
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
  async function putBack(id, keyboard, draggedCorners) {
    if (locked || pointer || !hand.includes(id)) return;
    locked = true;
    clearTimeout(returnFeedbackTimer);
    pile.classList.add("returning");
    const index = hand.indexOf(id);
    const card = tray.children[index].querySelector(".card");
    const flight = returnToDeck(card, draggedCorners);
    tray.classList.add("regrouping");
    hand.splice(index, 1);
    saveTable([...deck, id]);
    render(index);
    try { await flight; }
    finally {
      deck.push(id);
      updateDeck();
      arena.dispatchEvent(new Event("deck-return"));
      returnFeedbackTimer=setTimeout(() => pile.classList.remove("returning"), 70);
      tray.classList.remove("regrouping");
      locked = false;
      say("收到，已经放回牌库了。");
      if (keyboard) (tray.children[Math.min(index, hand.length - 1)]?.querySelector(".card") || pile).focus();
    }
  }
  const shuffleButton = get("shuffle");
  shuffleButton.disabled = !projects.length;
  shuffleButton.onclick = async () => {
    if (locked || pointer || !projects.length) return;
    locked = true;
    shuffleButton.setAttribute("aria-busy", "true");
    arena.classList.add("shuffling");
    try {
      const flights = Array.from(tray.querySelectorAll(".card"), (card, index) =>
        returnToDeck(card, null, index * 27, 238));
      const collected = hand.splice(0);
      render();
      await Promise.all(flights);
      deck.push(...collected);
      shuffleDeck();
      updateDeck();
      arena.dispatchEvent(new Event("deck-shuffle"));
      if (!reduced()) await new Promise(resolve => setTimeout(resolve, 330));
      await dealHand();
      say("洗好啦，看看这手牌！");
    } finally {
      arena.classList.remove("shuffling");
      shuffleButton.removeAttribute("aria-busy");
      locked = false;
    }
  };
  let projectExitTimer;
  let playingProject = false;
  let hitCard = null;
  async function attack(id, delivered = false) {
    if (locked || !hand.includes(id)) return;
    locked = true;
    playingProject = true;
    const source=tray.querySelector('.card[data-id="'+id+'"]');
    if (!delivered && !reduced() && source?.animate) {
      const from=source.getBoundingClientRect(),to=ghost.getBoundingClientRect();
      const thrown=source.cloneNode(true);
      thrown.classList.add("flying-card", "played-cover");
      thrown.setAttribute("aria-hidden","true");
      thrown.tabIndex=-1;
      Object.assign(thrown.style,{left:from.left+"px",top:from.top+"px",width:from.width+"px",height:from.height+"px"});
      document.body.append(thrown);
      source.classList.add("played");
      const dx=to.left+(to.width-from.width)/2-from.left,dy=to.top+(to.height-from.height)/2-from.top;
      try {
        await thrown.animate([
          {transform:"scale(1)"},
          {offset:.40, transform:"translate("+dx*.38+"px,"+(dy*.38-24)+"px) scale(.77) rotate(-6deg)"},
          {transform:"translate("+dx+"px,"+dy+"px) scale(.19) rotate(-12deg)"}
        ], {duration:255,easing:"cubic-bezier(.3,.54,.6,1)",fill:"forwards"}).finished;
      } catch { /* Complete the hit even if the visual was interrupted. */ }
      finally { thrown.remove(); }
    }
    if (!playingProject) return;
    hitCard = id;
    source?.classList.add("played");
    const mode = delivered ? "drag" : "tap";
    const damage = delivered ? 36 + Math.floor(Math.random() * 19) : 12 + Math.floor(Math.random() * 13);
    ghost.dataset.impact = mode;
    ghost.querySelector(".hit").textContent = "−" + damage;
    ghost.classList.add("hurt");
    arena.dispatchEvent(new CustomEvent("cabin-hit", {detail: {mode, damage}}));
    say("哎呀，算你赢！翻开这件作品吧。", true);

    const project = projects[id];
    const url = new URL("../projects/" + encodeURIComponent(project.id) + ".html", location.href);
    if (preview) url.searchParams.set("preview", "1");
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
    }, reduced() ? 330 : delivered ? 460 : 350);
  }
  tray.addEventListener("click", event => {
    const card = event.target.closest(".card");
    if (card && event.detail === 0) attack(Number(card.dataset.id));
  });
  tray.addEventListener("keydown", event => {
    const card = event.target.closest(".card");
    if (card && event.key === "Delete" && !event.repeat) {
      event.preventDefault();
      putBack(Number(card.dataset.id), true);
    }
  });
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
      say("等等……有话好说！");
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
    if (!clone || target === ghost) attack(id, Boolean(clone));
    else if (target === pile) putBack(id, false, draggedCorners);
    else {
      say("没打中，再试一次？");
      locked = true;
      card.style.visibility = "hidden";
      try { await fly(card, droppedFrom, card.getBoundingClientRect(), "recover", true); }
      finally { card.style.visibility = ""; locked = false; }
    }
  }
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => tray.addEventListener(type, finish));
  const chatter = [
    "你坐稳啦？这张桌子有点晃。",
    "我没有袖子，藏不了牌。",
    "别吹蜡烛，我还想看看你的下一张牌。",
    "看中哪件作品了？把那张牌递给我吧。"
  ];
  let nextLine = 0;
  ghost.onclick = () => {
    if (locked || pointer) return;
    say(chatter[nextLine]);
    nextLine = (nextLine + 1) % chatter.length;
  };
  get("end").onclick = () => {
    if (locked || pointer) return;
    locked = true;
    arena.dispatchEvent(new Event("ring-bell"));
    say("回合结束，去看看最新动态吧。", true);
    setTimeout(() => {
      locked = false;
      if (embedded) window.parent.postMessage({ type: "portfolio-section", section: "updates" }, "*");
      else navigate(homeUrl.href + "#updates");
    }, 540);
  };
  const propButtons = [pile, shuffleButton, get("end")];
  for (const button of propButtons) {
    for (const event of ["pointerenter", "focus"]) {
      button.addEventListener(event, () => button.classList.remove("tip-dismissed"));
    }
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") propButtons.forEach(button => button.classList.add("tip-dismissed"));
  });
  window.addEventListener("pagehide", () => {
    clearTimeout(projectExitTimer);
    if (hitCard === null) return;
    // Keep the visible fan still through the hit and project reveal.
    const index = hand.indexOf(hitCard);
    hand.splice(index, 1);
    deck.push(hitCard);
    hitCard = null;
    saveTable();
    updateDeck();
    render(index, false);
  });
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    if (playingProject) {
      playingProject = false;
      locked = false;
      say(greeting);
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
        if (document.hidden || button.matches(":hover,:focus-visible")) return;
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
  document.addEventListener("keydown",endCues,{once:true,capture:true});

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
