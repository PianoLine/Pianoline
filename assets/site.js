(function () {
  const DRAFT_KEY = "portfolio-editor-draft-v2";
  const root = document.getElementById("site-root");
  const pageType = document.body.dataset.page || "home";
  const previewQuery = new URLSearchParams(window.location.search).get("preview") === "1" ? "?preview=1" : "";

  if (!root || !window.PORTFOLIO_CONTENT) return;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getContent() {
    const useDraft = new URLSearchParams(window.location.search).get("preview") === "1";
    if (!useDraft) return window.PORTFOLIO_CONTENT;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : window.PORTFOLIO_CONTENT;
    } catch (error) {
      return window.PORTFOLIO_CONTENT;
    }
  }

  const content = window.normalizePortfolio(getContent());

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeNumber(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function pathForCurrentPage(path) {
    if (!path) return "";
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    const cleaned = String(path).replace(/^\.\//, "");
    return pageType === "project" ? `../${cleaned}` : cleaned;
  }

  function linkAttributes(url) {
    if (!url) return "";
    const href = pathForCurrentPage(url);
    const external = /^https?:/i.test(href);
    return `href="${escapeHtml(href)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}`;
  }

  function applyTheme() {
    const theme = content.theme || {};
    const style = document.documentElement.style;
    style.setProperty("--accent", theme.accent || "#d3a062");
    style.setProperty("--accent-light", theme.accentLight || "#f3cd96");
    style.setProperty("--teal", theme.teal || "#a6d8cc");
    style.setProperty("--max", `${safeNumber(theme.maxWidth, 1180, 860, 1400)}px`);
    style.setProperty("--section-space", `${safeNumber(theme.sectionSpace, 106, 48, 180)}px`);
    style.setProperty("--project-columns", `repeat(${safeNumber(theme.cardColumns, 2, 1, 3)}, minmax(0, 1fr))`);
    document.body.dataset.cardStyle = theme.cardStyle || "immersive";
  }

  function imageMarkup(media, fallbackLabel, fallbackNote, className = "") {
    if (media?.src) {
      return `<div class="media-placeholder image-populated ${className}"><img src="${escapeHtml(pathForCurrentPage(media.src))}" alt="${escapeHtml(media.alt || fallbackLabel)}"></div>`;
    }
    return `<div class="media-placeholder ${className}"><div class="slot-copy"><b>${escapeHtml(fallbackLabel)}</b><span>${escapeHtml(fallbackNote)}</span></div></div>`;
  }

  function videoMarkup(video) {
    const url = video?.url || "";
    if (!url) return "";
    const source = pathForCurrentPage(url);
    if (/\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(source)) {
      return `<div class="media-placeholder image-populated video-filled"><video controls preload="metadata" playsinline><source src="${escapeHtml(source)}"></video></div>`;
    }
    let youtubeId = "";
    try { const u = new URL(url); const h = u.hostname.toLowerCase(); if (h === "youtu.be") youtubeId = u.pathname.slice(1).split("/")[0]; else if (h === "youtube.com" || h.endsWith(".youtube.com")) youtubeId = u.searchParams.get("v") || u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] || ""; } catch (_) {}
    if (/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return `<a class="media-placeholder video video-link youtube-card" ${linkAttributes(url)}><img src="https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg" alt="" onerror="this.remove()"><span class="youtube-play" aria-hidden="true">▶</span><div class="slot-copy"><b>${escapeHtml(video.label || "查看演示视频")}</b><span>${escapeHtml(video.note || "点击观看视频 ↗")}</span></div></a>`;
    return `<a class="media-placeholder video video-link" ${linkAttributes(url)}><div class="slot-copy"><b>${escapeHtml(video.label || "查看演示视频")}</b><span>${escapeHtml(video.note || "点击在新窗口打开视频")}</span></div></a>`;
  }

  function renderHeader(prefix = "") {
    const name = escapeHtml(content.profile?.name || "作品集");
    return `<header class="topbar"><div class="container topbar-inner"><a class="brand" href="${prefix}index.html${previewQuery}#top" aria-label="回到首页"><span class="brand-mark">PH</span><span>${name} · 作品集</span></a><nav class="nav" aria-label="页面导航"><a href="${prefix}index.html${previewQuery}#about">简介</a><a href="${prefix}index.html${previewQuery}#projects">项目</a><a href="${prefix}index.html${previewQuery}#updates">动态</a><a href="${prefix}index.html${previewQuery}#contact">联系</a></nav></div></header>`;
  }

  function renderFooter(prefix = "") {
    const name = escapeHtml(content.profile?.name || "作品集");
    const year = escapeHtml(content.meta?.year || "2026");
    return `<footer class="footer"><div class="container footer-inner"><span>© ${year} · ${name}</span><span>游戏设计 · VR 交互 · 技术原型</span></div></footer>`;
  }

  function projectCard(project) {
    const image = project.cover?.src ? `<img class="project-card-image" src="${escapeHtml(pathForCurrentPage(project.cover.src))}" alt="${escapeHtml(project.cover.alt || project.title)}">` : "";
    return `<a class="project-card reveal ${project.cover?.src ? "has-image" : ""}" href="projects/${escapeHtml(project.id)}.html${previewQuery}"><span class="project-number">${escapeHtml(project.number)}</span>${image}<div class="project-card-copy"><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.short)}</p><span class="project-link">查看项目详情 <span>↗</span></span></div></a>`;
  }

  function contactItem(label, value, url) {
    if (!value) return "";
    const valueHtml = url ? `<a class="contact-link" ${linkAttributes(url)}>${escapeHtml(value)}</a>` : `<span>${escapeHtml(value)}</span>`;
    return `<div class="contact-item"><strong>${escapeHtml(label)}</strong>${valueHtml}</div>`;
  }

  function visiblePosts() { return (content.posts || []).filter(p => p.visible !== false && p.title).slice().sort((a,b) => (b.date || "").localeCompare(a.date || "")); }
  function postHref(post) { return `posts.html?id=${encodeURIComponent(post.id)}${previewQuery ? "&preview=1" : ""}`; }
  function postSummary(post) { return (post.blocks || []).filter(b => b.type === "text").map(b => b.text || "").join(" ").slice(0, 120); }
  function postCard(post) {
    const image = (post.blocks || []).find(b => b.type === "image" && b.src);
    return `<a class="post-card" href="${postHref(post)}">${image ? `<img src="${escapeHtml(pathForCurrentPage(image.src))}" alt="${escapeHtml(image.caption || post.title)}">` : ""}<div class="post-card-copy"><time>${escapeHtml(post.date || "")}</time><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(postSummary(post))}</p><span>阅读全文 ↗</span></div></a>`;
  }
  function renderPosts() {
    const posts = visiblePosts(), id = new URLSearchParams(location.search).get("id"), post = posts.find(p => p.id === id);
    if (id) {
      const body = post ? `<article class="post-detail"><time>${escapeHtml(post.date || "")}</time><h1>${escapeHtml(post.title)}</h1>${(post.blocks || []).map(b => b.type === "image" && b.src ? `<figure><img src="${escapeHtml(pathForCurrentPage(b.src))}" alt="${escapeHtml(b.caption || "文章图片")}">${b.caption ? `<figcaption>${escapeHtml(b.caption)}</figcaption>` : ""}</figure>` : b.type === "text" ? `<p>${escapeHtml(b.text || "")}</p>` : "").join("")}</article>` : `<h1>没有找到这篇动态</h1>`;
      root.innerHTML = `${renderHeader("")}<main class="container post-page"><a class="back-link" href="posts.html${previewQuery}">← 返回全部动态</a>${body}</main>${renderFooter("")}`;
      if (post) document.title = `${post.title}｜${content.profile?.name || "作品集"}`;
    } else root.innerHTML = `${renderHeader("")}<main class="container post-page"><a class="back-link" href="index.html${previewQuery}#updates">← 返回首页</a><span class="micro-label">动态 / 开发日志</span><h1>全部动态</h1><div class="post-grid">${posts.map(postCard).join("") || "<p>暂时还没有发布动态。</p>"}</div></main>${renderFooter("")}`;
  }
  function renderHome() {
    const profile = content.profile || {};
    const home = content.home || {};
    const contact = content.contact || {};
    const projects = content.projects || [];
    const facts = (profile.facts || []).filter(item => item?.label || item?.value);
    const tags = (profile.tags || []).filter(Boolean);
    const hasProfileText = Boolean(profile.profileTitle || profile.profileCopy || tags.length);
    const profilePanel = hasProfileText ? `<article class="panel reveal"><span class="micro-label">个人信息</span>${profile.profileTitle ? `<h3 class="profile-heading">${escapeHtml(profile.profileTitle)}</h3>` : ""}${profile.profileCopy ? `<p>${escapeHtml(profile.profileCopy)}</p>` : ""}${tags.length ? `<div class="profile-tags">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}</article>` : "";
    const factsPanel = facts.length ? `<aside class="panel dark reveal"><div class="facts">${facts.map(fact => `<div class="fact"><b>${escapeHtml(fact.label)}</b><span>${escapeHtml(fact.value)}</span></div>`).join("")}</div></aside>` : "";
    const aboutSection = profilePanel || factsPanel ? `<section class="section tight" id="about"><div class="container"><div class="section-head reveal"><div><span class="micro-label">01 / 个人简介</span><h2 class="section-title">个人简介</h2></div>${home.aboutIntro ? `<p class="section-intro">${escapeHtml(home.aboutIntro)}</p>` : ""}</div><div class="intro-grid ${factsPanel ? "" : "single"}">${profilePanel}${factsPanel}</div></div></section>` : "";
    const heroVisual = profile.heroImage
      ? `<div class="hero-card hero-image-card"><img src="${escapeHtml(pathForCurrentPage(profile.heroImage))}" alt="${escapeHtml(profile.heroImageAlt || "项目主视觉")}"></div>`
      : `<div class="hero-card"><span class="hero-card-label">作品主视觉</span><div class="hero-card-title">游戏与交互项目</div><div class="hero-card-copy">可在编辑页替换为任意项目截图。</div><span class="placeholder-line"></span><span class="placeholder-line mid"></span><span class="placeholder-line short"></span></div>`;
    const contactRows = [
      contactItem("邮箱", contact.email, contact.email ? `mailto:${contact.email}` : ""),
      contactItem("简历 PDF", contact.resumeUrl, contact.resumeUrl),
      contactItem("视频主页", contact.videoUrl, contact.videoUrl),
      contactItem("代码 / 作品平台", contact.platformUrl, contact.platformUrl)
    ].filter(Boolean).join("");
    const videoNote = contactRows || `<p class="section-intro">联系方式与简历链接待本人补充。</p>`;

    root.innerHTML = `${renderHeader("")}<main id="top"><section class="container hero"><div class="reveal"><span class="eyebrow">${escapeHtml(profile.eyebrow || "游戏设计作品集")}</span><h1>${escapeHtml(profile.name || "")}<br><em>${escapeHtml(profile.headline || "游戏与交互作品集")}</em></h1>${profile.intro ? `<p class="hero-copy">${escapeHtml(profile.intro)}</p>` : ""}<div class="hero-actions"><a class="button primary" href="#projects">查看 ${projects.length} 个项目</a><a class="button" href="#contact">联系方式 / 简历</a></div></div><div class="hero-art reveal" aria-label="作品主视觉"><div class="orb orb-one"></div><div class="orb orb-two"></div><div class="orb orb-three"></div>${heroVisual}</div></section>${aboutSection}<section class="section" id="projects"><div class="container"><div class="section-head reveal"><div><span class="micro-label">02 / 项目作品</span><h2 class="section-title">项目案例</h2></div><p class="section-intro">${escapeHtml(home.projectsIntro || "")}</p></div><div class="project-grid">${projects.map(projectCard).join("")}</div></div></section><section class="section" id="updates"><div class="container"><div class="section-head"><div><span class="micro-label">03 / 动态</span><h2 class="section-title">动态与开发日志</h2></div><a class="button" href="posts.html${previewQuery}">查看全部 ↗</a></div><div class="post-grid">${visiblePosts().slice(0,3).map(postCard).join("") || "<p class=\"section-intro\">还没有发布动态，敬请期待。</p>"}</div></div></section><section class="section" id="contact"><div class="container"><div class="contact-card reveal"><div><span class="micro-label">04 / 联系方式</span><h2>${escapeHtml(contact.heading || "联系方式与简历")}</h2><p>${escapeHtml(contact.intro || "")}</p></div><div class="contact-list">${videoNote}</div></div></div></section></main>${renderFooter("")}`;
  }

  function cardsMarkup(cards, className) {
    return `<div class="${className}">${(cards || []).map(card => `<article class="${className === "role-grid" ? "role-card" : "text-block"}"><b>${escapeHtml(card.title)}</b><p>${escapeHtml(card.text)}</p></article>`).join("")}</div>`;
  }

  function localizedLabel(label) {
    const translations = {
      "PROJECT OVERVIEW": "项目概述",
      "GAMEPLAY FLOW": "玩法流程",
      "IMPLEMENTED CONTENT": "已实现内容",
      "CURRENT STATUS": "当前状态",
      "VR WORKFLOW": "VR 操作流程",
      "BATTLE LOOP": "战斗循环",
      "PROJECT FEATURES": "项目特点",
      "PUZZLE LOOP": "解谜循环",
      "CURRENT PROTOTYPE": "当前原型",
      "NEXT STEP": "下一步方向",
      "PLAYER JOURNEY": "玩家流程",
      "CORE LOOP": "核心循环"
    };
    return String(label || "").replace(/[A-Z][A-Z ]+/g, match => translations[match.trim()] || match);
  }

  function renderResources(resources) {
    if (!resources?.length) return "";
    return `<section class="project-section reveal"><span class="section-label">06 / 相关链接</span><h2>项目链接</h2><div class="resource-list">${resources.map(item => item.url ? `<a class="resource-item" ${linkAttributes(item.url)}><span>${escapeHtml(item.label)}</span><span>打开 ↗</span></a>` : `<div class="resource-item"><span>${escapeHtml(item.label)}</span><span>待添加</span></div>`).join("")}</div></section>`;
  }

  function sectionMarkup(label, title, text, body) {
    return `<section class="project-section reveal"><span class="section-label">${escapeHtml(localizedLabel(label))}</span><h2>${escapeHtml(title || "")}</h2>${text ? `<p>${escapeHtml(text)}</p>` : ""}${body}</section>`;
  }

  function renderProject(project) {
    if (!project) {
      root.innerHTML = `${renderHeader("../")}<main class="container"><section class="project-hero"><a class="back-link" href="../index.html#projects">← 返回项目总览</a><h1>未找到这个项目</h1></section></main>${renderFooter("../")}`;
      return;
    }
    const gallery = (project.gallery || []).map(item => `<figure class="gallery-figure">${imageMarkup(item, item.label || "项目截图", item.note || "")}${item.note || item.label ? `<figcaption>${escapeHtml(item.label)} ${escapeHtml(item.note)}</figcaption>` : ""}</figure>`).join("");
    const purposeSection = sectionMarkup("01 / 项目概述", "项目概述", project.purpose?.text, cardsMarkup(project.purpose?.cards, "text-grid"));
    const flowBody = `<div class="flow">${(project.flow?.items || []).map((item, index) => `<article class="flow-step"><em>步骤 ${String(index + 1).padStart(2, "0")}</em><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.text)}</span></article>`).join("")}</div>`;
    const flowSection = sectionMarkup("02 / 玩法流程", "玩法流程", project.flow?.text, flowBody);
    const contributionSection = sectionMarkup("03 / 原型内容", "原型内容", project.prototypeText, cardsMarkup(project.prototypeCards, "role-grid"));
    const rolesSection = project.multiplayer ? sectionMarkup("04 / 职责分工", "职责分工", "", cardsMarkup(project.roles, "role-grid")) : "";
    const gallerySection = sectionMarkup(`${project.multiplayer ? "05" : "04"} / 截图`, "截图", project.galleryText, `<div class="gallery">${gallery}</div>${videoMarkup(project.video)}`);

    root.innerHTML = `${renderHeader("../")}<main class="container"><section class="project-hero"><a class="back-link" href="../index.html#projects">← 返回项目总览</a><div class="project-title-row reveal"><div><span class="project-kicker">${escapeHtml(project.number)}　·　制作人数：${escapeHtml(project.teamSize)}</span><h1>${escapeHtml(project.title)}</h1></div></div><p class="project-intro reveal">${escapeHtml(project.intro)}</p><div class="meta-grid reveal">${(project.meta || []).filter(item => !/项目状态|人数/.test(item.label)).map(item => `<div class="meta-item"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></div>`).join("")}</div><div class="project-hero-media reveal">${imageMarkup(project.cover, "项目封面", "", "tall")}</div></section>${purposeSection}${flowSection}${contributionSection}${rolesSection}${gallerySection}</main>${renderFooter("../")}`;
  }

  applyTheme();
  document.title = content.meta?.siteTitle || "游戏设计作品集";
  if (pageType === "posts") {
    renderPosts();
  } else if (pageType === "project") {
    const project = (content.projects || []).find(item => item.id === document.body.dataset.projectId);
    if (project) document.title = `${project.title}｜${content.profile?.name || "作品集"}`;
    renderProject(project);
  } else {
    renderHome();
  }

  if (window.initSiteEffects) window.initSiteEffects();
})();

