// Short, original mono samples generated locally. All timings below are in seconds.
const tableAudio = (() => {
  const arena = document.getElementById("arena");
  const button = document.getElementById("sound-toggle");
  const preference = "portfolio-table-sound";
  const Context = window.AudioContext || window.webkitAudioContext;
  const clips = new Map();
  const active = new Set();
  const sampleRate = 24000;
  const tau = 2 * Math.PI;
  let enabled = false;
  let context, master;
  try { enabled = localStorage.getItem(preference) === "on"; } catch { /* Optional preference. */ }

  function updateButton() {
    button.setAttribute("aria-pressed", String(enabled));
    button.querySelector(".sound-state").textContent = enabled ? "音效 开" : "音效 关";
  }
  function unlock() {
    if (!enabled || !Context || document.hidden) return;
    try {
      if (!context) {
        context = new Context();
        master = context.createGain();
        master.gain.value = .76;
        master.connect(context.destination);
      }
      if (context.state !== "running") context.resume().catch(() => {});
    } catch { /* Audio is optional for the table. */ }
  }

  function sample(duration, wave) {
    const buffer = context.createBuffer(1, Math.ceil(duration * sampleRate), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const edge = Math.min(1, t / .002, (duration - t) / .005);
      data[i] = wave(t) * edge;
    }
    return buffer;
  }
  // A quiet fibre stroke and a few irregular releases of the bent card edge.
  function cardStock(duration, friction, contacts) {
    let soft = 0, grain = 0;
    const flex = 390 + 125 * Math.random();
    const slip = .92 + .15 * Math.random();
    return sample(duration, t => {
      const air = Math.random() * 2 - 1;
      soft += .12 * (air - soft);
      grain += .48 * (air - grain);
      const stroke = Math.sin(Math.PI * t / duration) ** 2;
      let sound = friction * stroke * (grain - soft);
      for (const [offset, pressure] of contacts) {
        const age = t - offset * slip;
        if (age < 0) continue;
        const bite = (1 - Math.exp(-age / .0009)) * Math.exp(-age / .006);
        sound += pressure * bite * (1.7 * grain + .22 * Math.sin(tau * flex * age)
          + .10 * Math.sin(tau * 2.63 * flex * age));
      }
      return sound;
    });
  }
  function rewind() {
    // The hand eases to a stop in 330 ms. Space the gear teeth by angle, not time.
    const turn = .330, teeth = 12;
    const ticks = Array.from({length: teeth}, (_, i) => turn * (1 - Math.sqrt(1 - (i + 1) / teeth)));
    return sample(.364, t => {
      let sound = 0;
      for (let i = 0; i < teeth; i++) {
        const before = ticks[i] - t;
        if (before < 0 || before > .026) continue;
        // A tick played tail-first draws inward and closes abruptly on each tooth.
        const hz = i % 2 ? 1990 : 2470;
        sound += .17 * Math.min(1, before / .0012) * (ring(before, hz, .0058)
          + .5 * ring(before, hz * 1.83, .0038));
      }
      if (t < turn) {
        const p = t / turn;
        const gearPhase = tau * 510 * turn * (p - .5 * p * p);
        sound += .055 * Math.sin(Math.PI * p) * (Math.sin(gearPhase) + .36 * Math.sin(gearPhase * 3));
      } else {
        sound += .13 * ring(t - turn, 1340, .006);
      }
      return sound;
    });
  }
  function ring(t, hz, decay) {
    return Math.sin(tau * hz * t) * Math.exp(-t / decay);
  }
  function makeClip(name) {
    switch (name) {
      case "draw": return cardStock(.120, .18, [[.017,.18], [.056,.84], [.067,.32]]);
      case "lift": return cardStock(.064, .11, [[.006,.72], [.018,.24]]);
      case "slide": return cardStock(.158, .24, [[.024,.20], [.084,.34], [.119,.14]]);
      case "cut": return cardStock(.079, .12, [[.008,.49], [.021,.36], [.039,.20]]);
      case "seat": return cardStock(.050, .05, [[.003,.68], [.012,.22]]);
      case "rewind": return rewind();
      case "wind": return sample(.10, t =>
        .23 * ring(t, 1680, .009) + .16 * ring(t, 680, .018) +
        (t > .030 ? .14 * ring(t - .030, 1220, .012) : 0));
      case "bell": return sample(.96, t =>
        .213 * ring(t, 1872, .22) + .049 * ring(t, 1875, .27)
        + .168 * ring(t, 3560, .078) + .105 * ring(t, 5240, .024) + .047 * ring(t, 6920, .008));
      case "ghost-hit": {
        let fibre = 0;
        return sample(.18, t => {
          fibre += .58 * (2 * Math.random() - 1 - fibre);
          const slap = (.49 * fibre + .15 * Math.sin(tau * 440 * t)) * Math.exp(-t / .012);
          // A second fold flexes back just after contact, under the spoken reaction.
          const recoil = Math.max(0, t - .027);
          const phase = tau * (365 * recoil + 720 * recoil * recoil);
          const bend = (1 - Math.exp(-recoil / .006)) * Math.exp(-recoil / .034);
          return slap + bend * (.12 * Math.sin(phase) + .046 * Math.sin(2.4 * phase) + .14 * fibre);
        });
      }
      case "voice": return sample(.066, t => {
        // A hummed vowel opens gently, then falls away before the next glyph.
        const phase=tau*(218*t + .38*(1-Math.exp(-t/.016)) - 76*t*t);
        const vowel=.116*Math.sin(phase)+.063*Math.sin(2*phase+.10)
          +.034*Math.sin(3*phase)+.016*Math.exp(-t/.028)*Math.sin(5*phase);
        const envelope=(1-Math.exp(-t/.008))*Math.exp(-t/.039)*Math.min(1,(.066-t)/.018);
        return vowel*envelope;
      });
    }
  }

  function play(name, rate = 1, delay = 0) {
    if (!enabled || !master || document.hidden) return;
    const isCard = ["draw", "lift", "slide", "cut", "seat"].includes(name);
    const key = isCard ? name + Math.floor(Math.random() * 3) : name;
    if (!clips.has(key)) clips.set(key, makeClip(name));
    const source = context.createBufferSource();
    source.buffer = clips.get(key);
    source.playbackRate.value = rate;
    source.connect(master);
    active.add(source);
    source.onended = () => { active.delete(source); source.disconnect(); };
    source.start(context.currentTime + delay);
  }
  let nextDealTime = 0;
  function silence() {
    nextDealTime = 0;
    for (const source of active) source.stop();
    active.clear();
  }
  function glyph(char) {
    if (char && /[\p{L}\p{N}]/u.test(char)) {
      play("voice", .97 + (char.codePointAt(0) % 7) * .014);
    }
  }

  button.hidden = !Context;
  updateButton();
  arena.addEventListener("pointerdown", unlock, {capture: true});
  button.addEventListener("click", () => {
    enabled = !enabled;
    updateButton();
    try { localStorage.setItem(preference, enabled ? "on" : "off"); } catch { /* Optional. */ }
    if (enabled) { unlock(); play("wind"); } else silence();
  });
  arena.addEventListener("deck-draw", () => {
    if (!enabled || !context || document.hidden) return;
    const at = Math.max(nextDealTime, context.currentTime);
    play("draw", .96 + Math.random() * .08, at - context.currentTime);
    nextDealTime = at + .075;
  });
  arena.addEventListener("deck-return", () => play("seat"));
  arena.addEventListener("deck-shuffle", () => {
    if (!enabled || !context || document.hidden) return;
    play("rewind");
    nextDealTime = context.currentTime + .330;
    for (const [n, rate] of [1.08, .95, 1.16].entries()) play("cut", rate, n * .110);
  });
  arena.addEventListener("ring-bell", () => play("bell"));
  arena.addEventListener("cabin-hit", () => play("ghost-hit", .97 + .06 * Math.random()));
  window.addEventListener("pagehide", silence);
  document.addEventListener("visibilitychange", () => { if (document.hidden) silence(); });
  window.addEventListener("pageshow", () => {
    try { enabled = localStorage.getItem(preference) === "on"; } catch { /* Optional. */ }
    updateButton();
  });
  return {play, glyph};
})();
