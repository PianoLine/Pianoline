window.initSiteEffects = function initSiteEffects() {
  const header = document.querySelector('.topbar');
  const updateHeader = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 10);
  };

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true, once: false });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));
};

// A return to the table uses the same dimmer on both sides of the navigation.
(function setupTableReturn() {
  const page = document.body.dataset.page;
  const home = page === "home";
  if (!home && page !== "project" && page !== "posts") return;
  const siteHome = new URL(page === "project" ? "../index.html" : "index.html", location.href);
  const key = "portfolio-return:" + siteHome.pathname;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const tones = [
    { opacity: 0, backgroundColor: "transparent" },
    { opacity: .8, backgroundColor: "rgba(16, 16, 15, .25)", offset: .55 },
    { opacity: 1, backgroundColor: "#10100f" }
  ];
  let curtain, readyTimer;
  function cover() {
    curtain = document.createElement("div");
    curtain.className = "table-return-curtain";
    curtain.setAttribute("aria-hidden", "true");
    document.body.append(curtain);
    return curtain;
  }
  function clear() {
    clearTimeout(readyTimer);
    if (!curtain) return;
    curtain.getAnimations().forEach(animation => animation.cancel());
    curtain.remove();
    curtain = null;
  }
  window.addEventListener("pagehide", () => {
    clear();
    if (!home) {
      try { sessionStorage.setItem(key, "1"); } catch { /* Storage is optional. */ }
    }
  });

  if (!home) {
    document.addEventListener("click", async event => {
      const link = event.target.closest("a.back-link, a.brand");
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || link.target && link.target !== "_self") return;
      const url = new URL(link.href);
      if (url.pathname !== siteHome.pathname || url.origin !== siteHome.origin || url.hash !== "#top" ||
          motion.matches || !Element.prototype.animate) return;
      event.preventDefault();
      if (curtain) return;
      const fade = cover().animate(tones, {duration: 190, easing: "ease-in", fill: "both"});
      try { await fade.finished; } catch { return; }
      location.assign(url.href);
    });
    return;
  }

  function startReturn(cached) {
    const navigation = performance.getEntriesByType("navigation")[0];
    let fromPortfolio = false;
    try {
      fromPortfolio = sessionStorage.getItem(key) === "1";
      sessionStorage.removeItem(key);
    } catch { /* Use the referring page when storage is unavailable. */ }
    if (!fromPortfolio && document.referrer) {
      const from = new URL(document.referrer);
      fromPortfolio = from.origin === siteHome.origin && (from.pathname === new URL("posts.html", siteHome).pathname ||
        from.pathname.startsWith(new URL("projects/", siteHome).pathname));
    }
    if (!fromPortfolio || motion.matches || !Element.prototype.animate ||
        (!cached && (navigation?.type === "reload" || (navigation?.type !== "back_forward" && location.hash !== "#top")))) return;
    const layer = cover();
    const reveal = () => {
      if (curtain !== layer || layer.getAnimations().length) return;
      clearTimeout(readyTimer);
      const fade = layer.animate(tones, {duration: 420, direction: "reverse", easing: "ease-in", fill: "both"});
      fade.onfinish = clear;
    };
    if (cached) { reveal(); return; }
    const frame = document.querySelector(".interactive-frame");
    frame?.addEventListener("load", reveal, {once: true});
    readyTimer = setTimeout(reveal, 650);
  }
  // site.js creates the table frame synchronously before DOMContentLoaded.
  document.addEventListener("DOMContentLoaded", () => startReturn(false), {once: true});
  window.addEventListener("pageshow", event => { if (event.persisted) startReturn(true); });
})();
