(() => {
  const mirror = document.getElementById("skin-mirror");
  const encounter = document.querySelector(".encounter");
  const character = encounter.querySelector("#ghost");
  const portrait = encounter.querySelector(".ghost-portrait");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const embedded = window.parent !== window && new URLSearchParams(location.search).has("embed");
  const layers = portrait.querySelector(".skin-layers");
  const veil = createGoldenVeil();
  const mist = veil.canvas;
  mist.className = "skin-mist";
  mist.hidden = true;
  mist.setAttribute("aria-hidden", "true");
  portrait.append(mist);
  let sheetReady, busy = false, desired = "celadon";
  function loadBrocade() {
    if (!sheetReady) {
      const sheet = new Image();
      sheet.className = "brocade-sheet";
      sheet.src = "art/celadon-brocade-sheet.png?v=brocade-artist-d8123951";
      sheet.alt = "";
      sheet.draggable = false;
      sheetReady = sheet.decode().then(() => {
        if (sheet.naturalWidth !== 640 || sheet.naturalHeight !== 2688) throw Error("白色人偶图集尺寸不符");
        for (const layer of portrait.querySelectorAll(".portrait-layer:not(.portrait-embers)")) {
          layer.append(sheet.cloneNode());
        }
      }).catch(error => { sheetReady = undefined; throw error; });
    }
    return sheetReady;
  }
  function request(type, skin) {
    if (embedded) window.parent.postMessage({type, skin}, "*");
    else window.dispatchEvent(new CustomEvent(type, {detail:{skin}}));
  }
  function showSkin(skin) {
    const name = window.portfolioSkinNames[skin];
    encounter.dataset.skin = skin;
    character.title = name;
    character.setAttribute("aria-label", "和" + name + "聊天，或把作品卡拖给她");
  }
  async function reflect(state) {
    if (busy || !["brocade","celadon"].includes(state?.skin)) return;
    desired = state.skin;
    if (desired === "brocade") {
      try { await loadBrocade(); } catch { return; }
    }
    if (!busy && encounter.dataset.skin !== desired) showSkin(desired);
  }
  window.addEventListener("portfolio-music-state", e => reflect(e.detail));
  window.addEventListener("message", e => {
    if (embedded && e.source === window.parent && e.data?.type === "portfolio-music-state") reflect(e.data);
  });
  request("portfolio-music-query");

  function reveal(next) {
    const commit = () => {
      desired = next;
      showSkin(next);
      request("portfolio-change-skin", next);
    };
    if (!veil.available || reduced.matches || document.hidden) { commit(); return; }
    return new Promise(resolve => {
      const start = performance.now();
      let committed = false, last = -100;
      veil.paint(0);
      mist.hidden = false;
      function frame(now) {
        const t = Math.min(1,(now-start)/veil.duration);
        if (t>=1 || reduced.matches || document.hidden) {
          if (!committed) commit();
          mist.hidden = true;
          layers.style.removeProperty("opacity");
          resolve();
          return;
        }
        if (now-last>=40) {
          last=now;
          layers.style.opacity = String(veil.paint(t));
          if (!committed && t >= .50) { committed=true; commit(); }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }
  mirror.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    try {
      const next = encounter.dataset.skin === "brocade" ? "celadon" : "brocade";
      if (next === "brocade") await loadBrocade();
      await reveal(next);
    } catch (error) { console.warn("角色皮肤加载失败", error); }
    finally { busy=false; }
  });
})();
