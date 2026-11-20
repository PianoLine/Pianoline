window.setupSiteMusic = function (playlist, preview, siteRoot) {
  const panel = document.querySelector(".site-music");
  const tracks = playlist.filter(track => track.src.trim());
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "背景音乐");
  panel.innerHTML = `<button type="button" class="music-toggle" aria-label="背景音乐" aria-pressed="false"><span class="music-note" aria-hidden="true">♫</span><span class="music-state">音乐 关</span></button>
    <span class="track-controls" hidden><button type="button" aria-label="上一首" title="上一首" data-step="-1"><i></i></button><button type="button" aria-label="下一首" title="下一首" data-step="1"><i></i></button></span>`;
  const toggle = panel.querySelector(".music-toggle");
  const label = panel.querySelector(".music-state");
  panel.querySelector(".track-controls").hidden = tracks.length < 2;
  if (!tracks.length) {
    toggle.disabled = true;
    toggle.title = "歌单为空";
    toggle.setAttribute("aria-label", "背景音乐，歌单为空");
    return;
  }

  const audio = document.createElement("audio");
  panel.append(audio);
  audio.preload = "none";
  audio.volume = .35;
  audio.loop = tracks.length === 1;
  const preference = "portfolio-table-music";
  const positionKey = "portfolio-table-v1:" + siteRoot.pathname + (preview ? ":preview" : "") + ":music";
  let index = 0, offset = 0, wanted = false, loaded = -1, temporaryUrl = "", revision = 0;
  let pending = false, blocked = false;

  function savePosition() {
    const time = loaded === index && audio.readyState ? audio.currentTime : offset;
    try { sessionStorage.setItem(positionKey, JSON.stringify({src: tracks[index].src, time})); } catch {}
  }

  function restore() {
    try {
      wanted = localStorage.getItem(preference) === "on";
      const saved = JSON.parse(sessionStorage.getItem(positionKey));
      const found = tracks.findIndex(track => track.src === saved?.src);
      if (found >= 0) {
        index = found;
        offset = Math.max(0, Number(saved.time) || 0);
        if (loaded === index) audio.currentTime = offset;
      }
    } catch { /* Storage is optional. */ }
    display();
    if (wanted) play();
  }

  function display(message = "") {
    const on = !audio.paused && wanted;
    label.textContent = on ? "音乐 开" : "音乐 关";
    toggle.setAttribute("aria-pressed", String(on));
    toggle.title = message || tracks[index].title || "背景音乐";
  }

  function remember(enabled) {
    wanted = enabled;
    try { localStorage.setItem(preference, enabled ? "on" : "off"); } catch {}
  }

  async function play() {
    const token = ++revision;
    blocked = false;
    pending = true;
    try {
      if (loaded !== index) {
        const path = tracks[index].src.trim();
        const file = preview ? await window.playlistFiles.get(path) : null;
        if (token !== revision) return;
        if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
        temporaryUrl = file ? URL.createObjectURL(file) : "";
        audio.src = temporaryUrl || new URL(path, siteRoot).href;
        loaded = index;
        if (offset > 0) audio.currentTime = offset;
      }
      await audio.play();
      if (token === revision) display();
    } catch (error) {
      if (token !== revision) return;
      blocked = error.name === "NotAllowedError";
      if (blocked) display("点击继续播放背景音乐");
      else { loaded = -1; remember(false); display("播放失败，请检查音频地址或切换曲目"); }
    } finally {
      if (token === revision) pending = false;
    }
  }

  function changeTrack(step) {
    ++revision;
    pending = blocked = false;
    audio.pause();
    index = (index + step + tracks.length) % tracks.length;
    loaded = -1;
    offset = 0;
    savePosition();
    display();
    if (wanted) play();
  }

  toggle.addEventListener("click", () => {
    if (wanted && (pending || !audio.paused)) {
      remember(false);
      ++revision;
      pending = blocked = false;
      audio.pause();
      savePosition();
      display();
    } else { remember(true); play(); }
  });
  panel.querySelectorAll("[data-step]").forEach(button => {
    button.addEventListener("click", () => changeTrack(Number(button.dataset.step)));
  });
  document.addEventListener("click", event => {
    if (blocked && wanted && !panel.contains(event.target)) play();
  });
  audio.addEventListener("ended", () => { if (wanted) changeTrack(1); });
  window.addEventListener("pagehide", () => {
    savePosition();
    ++revision;
    pending = blocked = false;
    audio.pause();
  });
  window.addEventListener("pageshow", event => { if (event.persisted) restore(); });
  restore();
};
