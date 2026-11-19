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
  const projects = content.projects || [];
  const deck = projects.map((_, i) => i);
  const hand = deck.splice(0, 3);
  const get = id => document.getElementById(id);
  const ghost = get("ghost");
  const pile = get("deck");
  const tray = get("hand");
  const arena = get("arena");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const say = text => { get("speech").textContent = text; };
  let locked = false;
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
      if (get("about").open) get("about").close();
      window.parent.postMessage({ type: "portfolio-section", section: target.hash.slice(1) }, "*");
    });
  });
  const profile = content.profile || {};
  get("title").textContent = profile.name || "作品集";
  get("byline").textContent = profile.eyebrow || profile.headline || "";
  get("about-name").textContent = profile.name ? "你好，我是" + profile.name + "。" : "关于我";
  get("about-copy").textContent = profile.profileCopy || profile.intro || "";
  function navigate(url) {
    (embedded ? window.parent : window).location.href = url;
  }
  function render() {
    get("count").textContent = hand.length + " / 5";
    get("remaining").textContent = deck.length;
    tray.replaceChildren();
    hand.forEach((id, n) => {
      const project = projects[id];
      const wrap = document.createElement("div");
      const offset = n - (hand.length - 1) / 2;
      wrap.className = "card-wrap";
      wrap.style.setProperty("--angle", offset * 3 + "deg");
      wrap.style.setProperty("--lift", Math.abs(offset) * 3 + "px");
      const card = document.createElement("button");
      card.className = "card";
      card.dataset.id = id;
      card.dataset.tone = id % 3;
      card.setAttribute("aria-label", "查看 " + project.title);
      card.innerHTML = '<span class="folio" aria-hidden="true"><span></span><span>✦</span></span><span class="card-image" aria-hidden="true"></span><b></b><small class="card-type"></small>';
      card.querySelector(".folio span").textContent = project.number || String(id + 1).padStart(2, "0");
      card.querySelector("b").textContent = project.title;
      card.querySelector(".card-type").textContent = project.category || "项目作品";
      const cardImage = project.cover?.cardSrc || project.cover?.src;
      if (cardImage) {
        const img = new Image();
        img.alt = "";
        img.draggable = false;
        img.addEventListener("error", () => img.remove(), { once: true });
        img.src = new URL(cardImage, homeUrl).href;
        card.querySelector(".card-image").append(img);
      }
      const back = document.createElement("button");
      back.className = "return-card";
      back.textContent = "放回";
      back.setAttribute("aria-label", "将 " + project.title + " 放回牌库");
      back.onclick = event => putBack(id, event.detail === 0);
      wrap.append(card, back);
      tray.append(wrap);
    });
    if (!hand.length) tray.textContent = deck.length ? "手牌空了，抽一张继续。" : "暂无项目卡。";
  }

  async function fly(card, from, to) {
    if (reduced() || !card.animate) return;
    const clone = card.cloneNode(true);
    clone.classList.add("flying-card");
    clone.setAttribute("aria-hidden", "true");
    clone.tabIndex = -1;
    Object.assign(clone.style, { visibility: "visible", width: to.width + "px", height: to.height + "px", left: to.left + "px", top: to.top + "px", transformOrigin: "0 0" });
    document.body.append(clone);
    const transform = "translate(" + (from.left - to.left) + "px," + (from.top - to.top) + "px) scale(" + from.width / to.width + "," + from.height / to.height + ")";
    try {
      await clone.animate([{ transform, opacity: .65 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "ease-out" }).finished;
    } finally { clone.remove(); }
  }
  pile.onclick = async () => {
    if (locked || pointer) return;
    if (hand.length >= 5) return say("手牌满了，先放回一张吧。");
    if (!deck.length) return say("牌库空了，把手牌放回来再抽吧。");
    locked = true;
    hand.push(deck.shift());
    render();
    const card = tray.lastElementChild.querySelector(".card");
    card.style.visibility = "hidden";
    try { await fly(card, pile.getBoundingClientRect(), card.getBoundingClientRect()); }
    finally { card.style.visibility = ""; locked = false; say("新牌到手，来试试看？"); }
  };
  async function putBack(id, keyboard) {
    if (locked || pointer || !hand.includes(id)) return;
    locked = true;
    const index = hand.indexOf(id);
    const card = tray.children[index].querySelector(".card");
    card.style.visibility = "hidden";
    try { await fly(card, card.getBoundingClientRect(), pile.getBoundingClientRect()); }
    finally {
      hand.splice(index, 1);
      deck.push(id);
      render();
      locked = false;
      say("收到，已经放回牌库了。");
      if (keyboard) (tray.children[Math.min(index, hand.length - 1)]?.querySelector(".card") || pile).focus();
    }
  }
  async function attack(id, delivered = false) {
    if (locked || !hand.includes(id)) return;
    locked = true;
    const source=tray.querySelector('.card[data-id="'+id+'"]');
    if (!delivered && !reduced() && source?.animate) {
      const from=source.getBoundingClientRect(),to=ghost.getBoundingClientRect();
      const thrown=source.cloneNode(true);
      thrown.classList.add("flying-card");
      thrown.setAttribute("aria-hidden","true");
      thrown.tabIndex=-1;
      Object.assign(thrown.style,{left:from.left+"px",top:from.top+"px",width:from.width+"px",height:from.height+"px"});
      document.body.append(thrown);
      const dx=to.left+(to.width-from.width)/2-from.left,dy=to.top+(to.height-from.height)/2-from.top;
      try {
        await thrown.animate([{transform:"scale(1)"},{transform:"translate("+dx+"px,"+dy+"px) scale(.19) rotate(-12deg)"}],
          {duration:230,easing:"cubic-bezier(.28,.55,.58,1)",fill:"forwards"}).finished;
      } catch { /* Complete the hit even if the visual was interrupted. */ }
      finally { thrown.remove(); }
    }
    ghost.classList.add("hurt");
    arena.dispatchEvent(new Event("cabin-hit"));
    say("哎呀，算你赢！翻开这件作品吧。");
    get("transition-title").textContent = projects[id].title;
    const url = new URL("../projects/" + encodeURIComponent(projects[id].id) + ".html", location.href);
    if (preview) url.searchParams.set("preview", "1");
    setTimeout(() => {
      get("transition").classList.add("active");
      setTimeout(() => navigate(url), reduced() ? 0 : 340);
    }, reduced() ? 100 : 620);
  }
  tray.addEventListener("click", event => {
    const card = event.target.closest(".card");
    if (card && event.detail === 0) attack(Number(card.dataset.id));
  });
  tray.addEventListener("pointerdown", event => {
    const card = event.target.closest(".card");
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
  });
  function finish(event) {
    if (pointer?.id !== event.pointerId) return;
    const { card, clone } = pointer;
    pointer = null;
    clone?.remove();
    card.classList.remove("dragging");
    ghost.classList.remove("over");
    pile.classList.remove("over");
    if (event.type !== "pointerup") return;
    const id = Number(card.dataset.id);
    const target = dropTarget(event);
    if (!clone || target === ghost) attack(id, Boolean(clone));
    else if (target === pile) putBack(id, false);
    else say("没打中，再试一次？");
  }
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => tray.addEventListener(type, finish));
  ghost.onclick = () => { if (!locked) get("about").showModal(); };
  get("close").onclick = () => get("about").close();
  get("end").onclick = () => {
    if (locked || pointer) return;
    locked = true;
    say("回合结束，去看看最新动态吧。");
    setTimeout(() => {
      locked = false;
      if (embedded) window.parent.postMessage({ type: "portfolio-section", section: "updates" }, "*");
      else navigate(homeUrl.href + "#updates");
    }, reduced() ? 0 : 350);
  };
  window.addEventListener("pageshow", () => {
    locked = false;
    ghost.classList.remove("hurt");
    get("transition").classList.remove("active");
  });
  render();
  if (embedded) {
    new ResizeObserver(() => window.parent.postMessage({ type: "portfolio-table-height", height: Math.ceil(arena.getBoundingClientRect().height) }, "*")).observe(arena);
  }
})();
