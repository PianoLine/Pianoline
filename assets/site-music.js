window.setupSiteMusic = function (playlist, preview, siteRoot) {
  const panel = document.querySelector(".site-music");
  const tracks = playlist.filter(track => track.src.trim());
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "背景音乐");
  panel.innerHTML = `<button type="button" class="music-toggle" aria-label="背景音乐" aria-pressed="false"><span class="music-note" aria-hidden="true">♫</span><span class="music-state">音乐 关</span></button>
    <div class="track-info" hidden><span class="now-playing" role="status"></span><div class="track-timeline"><input class="track-seek" type="range" min="0" max="0" value="0" step="1" disabled aria-label="播放进度"><span class="track-time">0:00 / --:--</span></div></div>`;
  const toggle = panel.querySelector(".music-toggle");
  const label = panel.querySelector(".music-state");
  const title = panel.querySelector(".now-playing");
  const slider = panel.querySelector(".track-seek");
  const clock = panel.querySelector(".track-time");
  let rotating = false;
  function publishMusic() {
    const state = {type:"portfolio-music-state", available:tracks.length > 0, playing:rotating};
    document.querySelector(".interactive-frame")?.contentWindow?.postMessage(state, "*");
    window.dispatchEvent(new CustomEvent(state.type, {detail:state}));
  }
  window.addEventListener("message", event => {
    const scene = document.querySelector(".interactive-frame");
    if (!scene || event.source !== scene.contentWindow ||
        !(event.origin === location.origin || (location.protocol === "file:" && event.origin === "null"))) return;
    if (event.data?.type === "portfolio-music-query") publishMusic();
    if (event.data?.type === "portfolio-music-shuffle") playRandomTrack();
  });
  window.addEventListener("portfolio-music-query", publishMusic);
  window.addEventListener("portfolio-music-shuffle", playRandomTrack);
  publishMusic();
  if (!tracks.length) {
    toggle.disabled = true;
    toggle.title = "歌单为空";
    return;
  }

  panel.querySelector(".track-info").hidden = false;
  const audio = document.createElement("audio");
  for (const event of ["playing","pause","waiting","ended","emptied","error"]) {
    audio.addEventListener(event, () => {
      rotating = event === "playing" && !audio.paused;
      publishMusic();
    });
  }
  panel.append(audio);
  audio.preload = "metadata";
  audio.loop = tracks.length === 1;
  const level = .35;
  const fadeMs = 360;
  audio.volume = 0;
  const key = "portfolio-table-v1:" + siteRoot.pathname + (preview ? ":preview" : "") + ":music";
  let index = 0, wanted = false, offset = 0, dragging = false;
  // null means ordered playback; an empty list means this shuffle has been exhausted.
  let remaining = null;
  const sources = tracks.map(track => track.src);
  const trackKeys = sources.map(src => {
    try { return new URL(src.trim(), siteRoot).href; }
    catch { return src.trim(); }
  });
  const uniqueTracks = [...new Set(trackKeys)];
  let trackId = 0, playId = 0, fadeTimer = 0, sourceReady, objectUrl = "", localCopy;
  let seekId = 0, pendingSeek = null;
  let destination = "";

  function format(seconds) {
    const whole = Math.floor(seconds);
    return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
  }

  function timeline() {
    const duration = audio.duration;
    const known = Number.isFinite(duration) && duration > 0;
    slider.disabled = !known;
    slider.max = known ? String(duration) : "0";
    const time = dragging ? Number(slider.value) : pendingSeek ?? (offset || audio.currentTime || 0);
    if (!dragging) slider.value = String(time);
    const elapsed = format(known ? Math.min(time, duration) : time);
    clock.textContent = elapsed + " / " + (known ? format(duration) : "--:--");
    slider.setAttribute("aria-valuetext", clock.textContent);
  }

  function display(error = "") {
    label.textContent = wanted ? "音乐 开" : "音乐 关";
    toggle.setAttribute("aria-pressed", String(wanted));
    toggle.title = error || (wanted ? "关闭背景音乐" : "开启背景音乐");
    const track = tracks[index];
    const filename = track.src.split(/[?#]/)[0].split("/").pop().replace(/\.[^.]+$/, "");
    const name = track.title?.trim() || filename || "背景音乐";
    if (title.textContent !== name) title.textContent = name;
    title.title = name;
    timeline();
  }

  function save() {
    try {
      sessionStorage.setItem(key, JSON.stringify({src: tracks[index].src,
        shuffle: remaining === null ? null : {played: uniqueTracks.filter(key => !remaining.includes(key))},
        time: pendingSeek ?? (offset || audio.currentTime || 0), playing: wanted && !audio.paused, destination}));
    } catch { /* Browser storage is optional. */ }
  }

  function fade(to, done) {
    clearInterval(fadeTimer);
    const from = audio.volume, start = performance.now();
    // Reverse an interrupted fade from its current volume.
    const duration = fadeMs * Math.abs(to - from) / level;
    function tick() {
      const t = duration ? Math.min(1, (performance.now() - start) / duration) : 1;
      audio.volume = Math.max(0, Math.min(level, from + (to - from) * t));
      if (t < 1) return;
      clearInterval(fadeTimer);
      done?.();
    }
    fadeTimer = setInterval(tick, 16);
    tick();
  }

  async function start() {
    const token = ++playId;
    wanted = true;
    clearInterval(fadeTimer);
    display();
    try {
      await sourceReady;
      if (token !== playId) return;
      await audio.play();
      if (token === playId) fade(level);
    } catch {
      if (token !== playId) return;
      wanted = false;
      audio.pause();
      audio.volume = 0;
      display("无法开始播放，请检查音频或再点一次音乐开关");
    }
  }

  function stop() {
    ++playId;
    wanted = false;
    display();
    fade(0, () => { audio.pause(); save(); });
  }

  function selectTrack() {
    const token = ++trackId;
    ++playId;
    ++seekId;
    clearInterval(fadeTimer);
    dragging = false;
    pendingSeek = localCopy = null;
    audio.pause();
    audio.volume = 0;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = "";
    const path = tracks[index].src.trim();
    sourceReady = (async () => {
      const file = preview ? await window.playlistFiles.get(path) : null;
      if (token !== trackId) return;
      objectUrl = file ? URL.createObjectURL(file) : "";
      audio.src = objectUrl || new URL(path, siteRoot).href;
      audio.load();
    })();
    display();
    if (wanted) start();
  }

  async function seek(seconds) {
    const token = ++seekId;
    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const time = Math.max(0, Math.min(seconds, duration));
    pendingSeek = time;
    timeline();
    try {
      const ranges = audio.seekable;
      const canSeek = Array.from({length:ranges.length}, (_, i) => time >= ranges.start(i) && time <= ranges.end(i)).some(Boolean);
      const url = new URL(audio.src);
      // Simple static preview servers may ignore Range requests and seek back to zero.
      if (!canSeek && time > 0 && !objectUrl && url.origin === location.origin && /^https?:$/.test(url.protocol)) {
        localCopy ??= fetch(url).then(response => {
          if (!response.ok) throw new Error("Audio unavailable");
          return response.blob();
        });
        const blob = await localCopy;
        if (token !== seekId) return;
        objectUrl = URL.createObjectURL(blob);
        audio.src = objectUrl;
        audio.currentTime = time;
        if (wanted) start();
      } else audio.currentTime = time;
    } catch {
      if (token === seekId) { localCopy = null; slider.title = "暂时无法跳到此位置"; }
    } finally {
      if (token === seekId) { pendingSeek = null; timeline(); }
    }
  }

  function restore(cached) {
    destination = "";
    wanted = false;
    offset = 0;
    remaining = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key));
      const found = tracks.findIndex(track => track.src === saved?.src);
      if (found >= 0) {
        index = found;
        const shuffle = saved.shuffle;
        if (Array.isArray(shuffle?.played)) {
          remaining = uniqueTracks.filter(key => !shuffle.played.includes(key));
        } else if (Array.isArray(shuffle?.remaining) && Array.isArray(shuffle.sources)) {
          // Migrate the previous index-based bag, including after a playlist reorder.
          const played = shuffle.sources.filter((_, i) => !shuffle.remaining.includes(i));
          const playedKeys = new Set(played.map(src => new URL(src, siteRoot).href));
          remaining = uniqueTracks.filter(key => !playedKeys.has(key));
        }
        offset = Math.max(0, Number(saved.time) || 0);
        const nav = performance.getEntriesByType("navigation")[0]?.type;
        // Only continue an already playing track across an internal navigation.
        const from = document.referrer && new URL(document.referrer);
        const fromSite = from && from.origin === siteRoot.origin && from.pathname.startsWith(siteRoot.pathname);
        wanted = saved.playing === true && (cached || nav === "back_forward" ||
          (nav !== "reload" && (fromSite || saved.destination === location.href)));
      }
    } catch { /* Direct visits start quietly. */ }
    audio.loop = remaining === null && tracks.length === 1;
    selectTrack();
  }

  toggle.addEventListener("click", () => { if (wanted) stop(); else start(); });
  function advanceTrack() {
    if (remaining === null) {
      index = (index + 1) % tracks.length;
    } else {
      const choices = remaining.length > 1 ? remaining.filter(key => key !== trackKeys[index]) : remaining;
      const next = choices[Math.floor(Math.random() * choices.length)];
      remaining.splice(remaining.indexOf(next), 1);
      index = trackKeys.indexOf(next);
    }
    offset = 0;
    selectTrack();
  }
  function playRandomTrack() {
    if (!tracks.length) return;
    if (remaining === null || !remaining.length) {
      const alreadyPlaying = remaining === null && (!audio.paused || audio.played.length > 0 || offset > 0);
      remaining = uniqueTracks.filter(key => !alreadyPlaying || key !== trackKeys[index]);
      audio.loop = false;
      if (uniqueTracks.length === 1 && !audio.paused) {
        remaining = [];
        if (!wanted) start();
        return;
      }
      if (!remaining.length) remaining = uniqueTracks.slice();
    }
    wanted = true;
    advanceTrack();
  }
  slider.addEventListener("input", () => { dragging = true; timeline(); });
  slider.addEventListener("change", () => { dragging = false; seek(Number(slider.value)); });
  slider.addEventListener("pointercancel", () => { dragging = false; timeline(); });
  audio.addEventListener("loadedmetadata", () => {
    const time = offset;
    offset = 0;
    if (time > 0) seek(time);
    else timeline();
  });
  for (const event of ["timeupdate", "durationchange", "seeked"]) audio.addEventListener(event, timeline);
  audio.addEventListener("ended", () => {
    if (!wanted) return;
    if (remaining?.length === 0) {
      wanted = false;
      display();
      save();
    } else advanceTrack();
  });
  // Local HTML pages do not send a referrer. Match the outgoing navigation exactly.
  window.navigation?.addEventListener("navigate", event => { destination = event.destination.url; });
  window.addEventListener("pagehide", () => {
    save();
    ++playId;
    ++seekId;
    ++trackId;
    clearInterval(fadeTimer);
    audio.pause();
    audio.volume = 0;
  });
  window.addEventListener("pageshow", event => { if (event.persisted) restore(true); });
  restore(false);
};
