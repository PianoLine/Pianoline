window.setupSiteMusic = function (playlists, preview, siteRoot, resumeSkin) {
  const panel = document.querySelector(".site-music");
  const scope = "portfolio-table-v1:" + siteRoot.pathname + (preview ? ":preview" : "");
  let skin = "celadon", playlist = "celadon", bookClicks = 0;
  let tracks = [], sources = [], trackKeys = [], uniqueTracks = [];
  function restoreSelection(resume) {
    bookClicks = 0;
    try {
      if (!resume) {
        sessionStorage.removeItem(scope + ":skin");
        sessionStorage.removeItem(scope + ":playlist");
      }
      const savedSkin = sessionStorage.getItem(scope + ":skin");
      skin = Object.hasOwn(window.portfolioSkinNames, savedSkin) ? savedSkin : "celadon";
      const savedList = sessionStorage.getItem(scope + ":playlist");
      playlist = savedList === skin ? skin : "celadon";
    } catch {}
  }
  restoreSelection(resumeSkin);
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "背景音乐");
  panel.innerHTML = `<button type="button" class="music-toggle" aria-label="背景音乐" aria-pressed="false"><span class="music-note" aria-hidden="true">♫</span><span class="music-state">音乐 关</span></button>
    <div class="track-info" hidden><span class="now-playing" role="status"></span><div class="track-timeline"><input class="track-seek" type="range" min="0" max="0" value="0" step="1" disabled aria-label="播放进度"><span class="track-time">0:00 / --:--</span></div></div>`;
  const toggle = panel.querySelector(".music-toggle");
  const label = panel.querySelector(".music-state");
  const title = panel.querySelector(".now-playing");
  const slider = panel.querySelector(".track-seek");
  const clock = panel.querySelector(".track-time");
  const readBands = window.gramophoneSpectrum?.reader(siteRoot);
  function publishBands(){
    const bands=rotating && !audio.paused && readBands ? readBands(audio.src,audio.currentTime) : null;
    const state={type:"portfolio-music-levels",bands:bands?.map(n=>n*audio.volume/level) || null};
    document.querySelector(".interactive-frame")?.contentWindow?.postMessage(state,"*");
    window.dispatchEvent(new CustomEvent(state.type,{detail:state}));
  }
  let rotating = false;
  function publishMusic() {
    const state = {type:"portfolio-music-state", skin, available:tracks.length > 0, playing:rotating};
    document.querySelector(".interactive-frame")?.contentWindow?.postMessage(state, "*");
    window.dispatchEvent(new CustomEvent(state.type, {detail:state}));
  }
  window.addEventListener("message", event => {
    const scene = document.querySelector(".interactive-frame");
    if (!scene || event.source !== scene.contentWindow ||
        !(event.origin === location.origin || (location.protocol === "file:" && event.origin === "null"))) return;
    if (event.data?.type === "portfolio-music-query") publishMusic();
    if (event.data?.type === "portfolio-music-meter-query") publishBands();
    if (event.data?.type === "portfolio-music-shuffle") playRandomTrack();
    if (event.data?.type === "portfolio-blue-book-click") clickMusicBook("brocade");
    if (event.data?.type === "portfolio-red-book-click") clickMusicBook("dream");
    if (event.data?.type === "portfolio-change-skin") changeSkin(event.data.skin);
  });
  window.addEventListener("portfolio-music-query", publishMusic);
  window.addEventListener("portfolio-music-meter-query", publishBands);
  window.addEventListener("portfolio-music-shuffle", playRandomTrack);
  window.addEventListener("portfolio-blue-book-click", () => clickMusicBook("brocade"));
  window.addEventListener("portfolio-red-book-click", () => clickMusicBook("dream"));
  window.addEventListener("portfolio-change-skin", event => changeSkin(event.detail.skin));

  const level = .35;
  const fadeMs = 360;
  const retiringPlayers = new Set();
  let audio = createPlayer();

  function createPlayer(previous) {
    const player = document.createElement("audio");
    player.preload = "metadata";
    player.volume = 0;
    if (previous) previous.before(player);
    else panel.append(player);
    for (const type of ["playing","pause","waiting","ended","emptied","error","loadedmetadata","timeupdate","durationchange","seeked"]) {
      player.addEventListener(type, onMediaEvent);
    }
    return player;
  }

  const musicKey = () => scope + ":music" + (playlist === "celadon" ? "" : ":" + playlist);
  let index = 0, wanted = false, offset = 0, dragging = false;
  // null plays in order. An empty shuffle bag starts a new round on the next advance.
  let remaining = null;
  function loadList() {
    tracks = (playlists[playlist] || []).filter(track => track.src.trim());
    sources = tracks.map(track => track.src);
    trackKeys = sources.map(src => {
      try { return new URL(src.trim(), siteRoot).href; }
      catch { return src.trim(); }
    });
    uniqueTracks = [...new Set(trackKeys)];
    toggle.disabled = !tracks.length;
    panel.querySelector(".track-info").hidden = !tracks.length;
  }
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

  function display(error = "", needsGesture = false) {
    label.textContent = needsGesture ? "点击打开音乐" : (wanted ? "音乐 开" : "音乐 关");
    toggle.classList.toggle("needs-gesture", needsGesture);
    toggle.setAttribute("aria-label", needsGesture ? label.textContent : "背景音乐");
    toggle.setAttribute("aria-pressed", String(wanted));
    if (!tracks.length) {
      toggle.title = "当前歌单为空";
      title.textContent = "";
      return;
    }
    toggle.title = error || (wanted ? "关闭背景音乐" : "开启背景音乐");
    const track = tracks[index];
    const filename = track.src.split(/[?#]/)[0].split("/").pop().replace(/\.[^.]+$/, "");
    const name = track.title?.trim() || filename || "背景音乐";
    if (title.textContent !== name) title.textContent = name;
    title.title = name;
    timeline();
  }

  function save() {
    if (!tracks.length) return;
    try {
      sessionStorage.setItem(musicKey(), JSON.stringify({src: tracks[index].src,
        shuffle: remaining === null ? null : {played: uniqueTracks.filter(key => !remaining.includes(key))},
        time: pendingSeek ?? (offset || audio.currentTime || 0), playing: wanted && !audio.paused, destination}));
    } catch { /* Browser storage is optional. */ }
  }

  function rampVolume(player, to, done) {
    const from = player.volume;
    const duration = fadeMs * Math.abs(to - from) / level;
    if (!duration) { done?.(); return 0; }
    const start = performance.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      player.volume = Math.max(0, Math.min(level, from + (to - from) * t));
      if (t === 1) { clearInterval(timer); done?.(); }
    }, 16);
    return timer;
  }

  function fade(to, done) {
    clearInterval(fadeTimer);
    fadeTimer = rampVolume(audio, to, done);
  }

  function crossfadeFromCurrentPlayer() {
    const previous = audio;
    const previousUrl = objectUrl;
    objectUrl = "";
    clearInterval(fadeTimer);
    audio = createPlayer(previous);
    let timer = 0;
    function finish() {
      clearInterval(timer);
      previous.pause();
      previous.removeAttribute("src");
      previous.load();
      previous.remove();
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      retiringPlayers.delete(finish);
    }
    retiringPlayers.add(finish);
    if (previous.paused) finish();
    else timer = rampVolume(previous, 0, finish);
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
    } catch (error) {
      if (token !== playId) return;
      wanted = false;
      audio.pause();
      audio.volume = 0;
      if (error?.name === "NotAllowedError") display("浏览器已阻止播放，点击打开音乐", true);
      else display("无法开始播放，请检查音频或再点一次音乐开关");
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
    if (!tracks.length) {
      audio.removeAttribute("src");
      audio.load();
      display();
      return;
    }
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

  function restore(cached, newListPlaying = null) {
    destination = "";
    wanted = false;
    offset = 0;
    remaining = null;
    index = 0;
    try {
      const saved = newListPlaying !== null ? null : JSON.parse(sessionStorage.getItem(musicKey()));
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
    if (newListPlaying !== null) wanted = newListPlaying && tracks.length > 0;
    audio.loop = (remaining === null ? tracks.length : uniqueTracks.length) === 1;
    selectTrack();
  }

  function changeSkin(next) {
    if (!Object.hasOwn(window.portfolioSkinNames, next) || next === skin) return;
    bookClicks = 0;
    skin = next;
    try { sessionStorage.setItem(scope + ":skin", skin); } catch {}
    if (playlist !== "celadon") switchPlaylist("celadon", wanted);
    else publishMusic();
  }

  function clickMusicBook(bookSkin) {
    if (skin !== bookSkin || playlist === bookSkin) return;
    bookClicks++;
    if (bookClicks < 3) return;
    bookClicks = 0;
    switchPlaylist(bookSkin, true);
  }

  function switchPlaylist(next, playing) {
    save();
    playlist = next;
    try { sessionStorage.setItem(scope + ":playlist", playlist); } catch {}
    rotating = false;
    crossfadeFromCurrentPlayer();
    loadList();
    restore(false, playing);
    publishMusic();
  }

  toggle.addEventListener("click", () => { if (wanted) stop(); else start(); });
  function advanceTrack() {
    if (remaining === null) {
      index = (index + 1) % tracks.length;
    } else {
      if (!remaining.length) remaining = uniqueTracks.slice();
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
    if (remaining === null) {
      audio.loop = uniqueTracks.length === 1;
      const alreadyPlaying = !audio.paused || audio.played.length > 0 || offset > 0;
      remaining = uniqueTracks.filter(key => !alreadyPlaying || key !== trackKeys[index]);
    }
    if (uniqueTracks.length === 1 && !audio.paused) {
      if (!wanted) start();
      return;
    }
    wanted = true;
    advanceTrack();
  }
  slider.addEventListener("input", () => { dragging = true; timeline(); });
  slider.addEventListener("change", () => { dragging = false; seek(Number(slider.value)); });
  slider.addEventListener("pointercancel", () => { dragging = false; timeline(); });
  function onMediaEvent(event) {
    if (event.currentTarget !== audio) return;
    switch (event.type) {
      case "loadedmetadata": {
        const time = offset;
        offset = 0;
        if (time > 0) seek(time);
        else timeline();
        break;
      }
      case "timeupdate":
      case "durationchange":
      case "seeked":
        timeline();
        break;
      default:
        rotating = event.type === "playing" && !audio.paused;
        publishMusic();
        if (event.type === "ended" && wanted) advanceTrack();
    }
  }
  // Local HTML pages do not send a referrer. Match the outgoing navigation exactly.
  window.navigation?.addEventListener("navigate", event => { destination = event.destination.url; });
  window.addEventListener("pagehide", () => {
    save();
    for (const finish of retiringPlayers) finish();
    ++playId;
    ++seekId;
    ++trackId;
    clearInterval(fadeTimer);
    audio.pause();
    audio.volume = 0;
  });
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    restoreSelection(true);
    loadList();
    restore(true);
    publishMusic();
  });
  loadList();
  restore(false);
  publishMusic();
  return () => wanted;
};
