(() => {
  const mirror = document.getElementById("skin-mirror");
  const encounter = document.querySelector(".encounter");
  const portrait = encounter.querySelector(".ghost-portrait");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const embedded = window.parent !== window && new URLSearchParams(location.search).has("embed");
  const mist = document.createElement("canvas");
  mist.className = "skin-mist";
  mist.width = 108;
  mist.height = 112;
  mist.hidden = true;
  mist.setAttribute("aria-hidden", "true");
  encounter.append(mist);
  const ctx = mist.getContext("2d");
  const pixels = ctx?.createImageData(mist.width, mist.height);
  const tones = [[49,55,57], [65,76,77], [88,103,101], [119,134,126], [151,158,141]];
  let sheetReady, busy = false, desired = "celadon";
  function loadBrocade() {
    if (!sheetReady) {
      const sheet = new Image();
      sheet.className = "brocade-sheet";
      sheet.src = "art/celadon-brocade-sheet.png?v=anchored-arms";
      sheet.alt = "";
      sheet.draggable = false;
      sheetReady = sheet.decode().then(() => {
        if (sheet.naturalWidth !== 640 || sheet.naturalHeight !== 2688) throw Error("织金披肩图集尺寸不符");
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
  async function reflect(state) {
    if (busy || !["brocade","celadon"].includes(state?.skin)) return;
    desired = state.skin;
    if (desired === "brocade") {
      try { await loadBrocade(); } catch { return; }
    }
    if (!busy) encounter.dataset.skin = desired;
  }
  window.addEventListener("portfolio-music-state", e => reflect(e.detail));
  window.addEventListener("message", e => {
    if (embedded && e.source === window.parent && e.data?.type === "portfolio-music-state") reflect(e.data);
  });
  request("portfolio-music-query");

  // Overlapping bands travel at different heights. Quantized shades and
  // two-pixel edge steps keep the mist on the same grid as the sprite.
  function paint(t, cover) {
    const {width, height} = mist;
    const data = pixels.data;
    data.fill(0);
    for (let y = 0; y < height; y++) {
      const v = (y + .5) / height;
      for (let x = 0; x < width; x++) {
        const u = (x + .5) / width;
        let density = -1;
        for (let band = 0; band < 5; band++) {
          const side = band % 2 ? 1 : -1;
          const cx = .5 + side * (1-cover) * .40 + .035*Math.sin(band*2.2+t*4);
          const cy = .19 + band*.169 - .06*t + .13*Math.max(0,2*t-1) + .027*Math.sin(9*u+band+t*4);
          const dx = (u-cx)/(.11+.32*cover), dy=(v-cy)/(.048+.145*cover);
          density = Math.max(density,1-dx*dx-dy*dy);
        }
        const edge = density + .105*Math.sin(27*u+14*v-4*t) + .052*Math.sin(42*v-16*u);
        if (edge <= 0) continue;
        const light = edge*.57 + .18*Math.sin(24*v+4*u-5*t) + .21*(1-v);
        const shade = tones[Math.min(4,Math.max(0,Math.floor(light*5)))];
        const i = (y*width+x)*4;
        data[i]=shade[0]; data[i+1]=shade[1]; data[i+2]=shade[2];
        data[i+3]=Math.round(255*Math.min(1,cover*3)*Math.min(1,.52+edge*2));
      }
    }
    ctx.putImageData(pixels,0,0);
  }
  function reveal(next) {
    const commit = () => {
      encounter.dataset.skin = desired = next;
      request("portfolio-change-skin", next);
    };
    if (!ctx || reduced.matches || document.hidden) { commit(); return; }
    return new Promise(resolve => {
      const start = performance.now();
      let committed = false, last = -100;
      mist.hidden = false;
      function frame(now) {
        const t = Math.min(1,(now-start)/900);
        if (t>=1 || reduced.matches || document.hidden) {
          if (!committed) commit();
          mist.hidden = true;
          portrait.style.removeProperty("opacity");
          resolve();
          return;
        }
        if (now-last>=40) {
          last=now;
          const cover = Math.min(1,t/.43,(1-t)/.43);
          paint(t,cover);
          portrait.style.opacity = String(Math.max(0,Math.min(1,(1-cover)*4)));
          if (!committed && t >= .44) { committed=true; commit(); }
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
