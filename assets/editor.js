(function () {
  const root = document.getElementById("editor-root");
  const status = document.querySelector(".editor-status");
  const KEY = "portfolio-editor-draft-v2";
  const published = window.normalizePortfolio(window.PORTFOLIO_CONTENT);
  let draft;
  try { draft = window.normalizePortfolio(JSON.parse(localStorage.getItem(KEY) || "null") || published); }
  catch (_) { draft = window.normalizePortfolio(published); }
  let timer;
  const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  const get = path => path.split(".").reduce((o,k) => o?.[k], draft);
  function set(path, value) { const keys = path.split("."); const last = keys.pop(); keys.reduce((o,k)=>o[k],draft)[last]=value; }
  function field(path, label, type="text", help="") {
    const value=get(path), attr=`data-path="${esc(path)}"`;
    if(type==="checkbox") return `<label class="editor-check"><input type="checkbox" ${attr} ${value ? "checked" : ""}> ${esc(label)}</label>`;
    if(type==="textarea") return `<label class="editor-field full"><span>${esc(label)}</span><textarea ${attr} rows="3">${esc(value)}</textarea>${help ? `<small>${esc(help)}</small>` : ""}</label>`;
    return `<label class="editor-field"><span>${esc(label)}</span><input type="${type}" ${attr} value="${esc(value)}">${help ? `<small>${esc(help)}</small>` : ""}</label>`;
  }
  function group(title, description, fields) { return `<section class="editor-group"><div class="editor-group-head"><h2>${esc(title)}</h2><p>${esc(description)}</p></div><div class="editor-grid">${fields}</div></section>`; }
  function cards(path, label) {
    const list=get(path) || [];
    return `<div class="editor-mini-grid">${list.map((item,i)=>`<div class="editor-mini-card"><strong>${esc(label)} ${i+1}</strong>${field(`${path}.${i}.title`,"标题")}${field(`${path}.${i}.text`,"内容","textarea")}<div class="editor-card-actions"><button type="button" class="button subtle" data-delete="${esc(path)}" data-index="${i}">删除</button></div></div>`).join("")}</div><button type="button" class="button editor-add" data-add="${esc(path)}">＋ 添加${esc(label)}</button>`;
  }
  function projectEditor(p,i) {
    const b=`projects.${i}`;
    const meta=p.meta.map((m,j)=> /项目状态|人数/.test(m.label) ? "" : `${field(`${b}.meta.${j}.label`,"信息名称")}${field(`${b}.meta.${j}.value`,"信息内容")}`).join("");
    const gallery=p.gallery.map((image,j)=>`<div class="editor-mini-card"><strong>截图 ${j+1}</strong>${field(`${b}.gallery.${j}.src`,"图片路径")}${field(`${b}.gallery.${j}.alt`,"图片替代文字")}${field(`${b}.gallery.${j}.label`,"截图标题")}${field(`${b}.gallery.${j}.note`,"截图说明","textarea")}</div>`).join("");
    return `<details class="editor-project" data-project="${i}"><summary><span><b>${esc(p.number)} / ${esc(p.title)}</b><small>项目编辑</small></span><span>展开编辑</span></summary><div class="editor-project-body">
      <div class="editor-subgroup"><h3>项目基本信息</h3><div class="editor-grid">${field(`${b}.number`,"项目序号")}${field(`${b}.title`,"项目名称")}${field(`${b}.teamSize`,"制作人数小标签","text","例如：1 人、3 人或团队项目")}${field(`${b}.multiplayer`,"多人项目：显示职责分工","checkbox")}${field(`${b}.short`,"首页卡片简介","textarea")}${field(`${b}.intro`,"项目页开头简介","textarea")}${meta}${field(`${b}.cover.src`,"封面图片路径")}${field(`${b}.cover.alt`,"封面图片说明")}</div></div>
      <div class="editor-subgroup"><h3>1. 项目概述</h3><div class="editor-grid">${field(`${b}.purpose.text`,"概述说明","textarea")}</div>${cards(`${b}.purpose.cards`,"概述卡片")}</div>
      <div class="editor-subgroup"><h3>2. 玩法流程</h3><div class="editor-grid">${field(`${b}.flow.text`,"流程说明","textarea")}</div>${cards(`${b}.flow.items`,"流程步骤")}</div>
      <div class="editor-subgroup"><h3>3. 原型内容</h3><div class="editor-grid">${field(`${b}.prototypeText`,"板块说明","textarea")}</div>${cards(`${b}.prototypeCards`,"原型卡片")}</div>
      <div class="editor-subgroup"><h3>4. 职责分工</h3><p>仅勾选上方“多人项目”时显示在项目页。</p>${cards(`${b}.roles`,"职责卡片")}</div>
      <div class="editor-subgroup"><h3>截图与视频</h3><div class="editor-grid">${field(`${b}.galleryText`,"截图区说明","textarea")}${field(`${b}.video.url`,"视频链接或 MP4 路径")}${field(`${b}.video.label`,"视频标题")}${field(`${b}.video.note`,"视频说明")}</div><div class="editor-mini-grid">${gallery}</div></div>
      </div></details>`;
  }
  function render(openProjects=[]) {
    const basics=field("meta.siteTitle","浏览器标签标题")+field("profile.name","姓名 / 昵称")+field("profile.eyebrow","顶部小标签")+field("profile.headline","首页主标题")+field("profile.intro","首页简介","textarea")+field("profile.heroImage","首页图片路径")+field("profile.heroImageAlt","首页图片说明")+field("profile.profileTitle","个人定位")+field("profile.profileCopy","个人简介正文","textarea")+field("home.aboutIntro","简介区说明","textarea")+field("home.projectsIntro","项目区说明","textarea");
    const contact=field("contact.heading","联系区标题")+field("contact.intro","联系区说明","textarea")+field("contact.email","邮箱")+field("contact.resumeUrl","简历 PDF 链接")+field("contact.videoUrl","视频主页链接")+field("contact.platformUrl","作品平台链接");
    const appearance=field("theme.accent","强调色","color")+field("theme.accentLight","强调浅色","color")+field("theme.teal","辅助色","color")+field("theme.cardColumns","桌面项目卡片列数（1–3）","number")+field("theme.maxWidth","内容最大宽度（像素）","number")+field("theme.sectionSpace","上下留白（像素）","number");
    const tags=(draft.profile.tags||[]).map((_,i)=>field(`profile.tags.${i}`,`技能标签 ${i+1}`)).join("");
    root.innerHTML=group("个人信息","修改首页文字和个人介绍。",basics)+group("联系方式与简历","只填写愿意公开的信息。",contact)+group("视觉与排版","调整网站颜色和桌面排版。",appearance)+group("技能标签","留空的标签不会显示。",tags)+`<section class="editor-group"><div class="editor-group-head"><h2>项目作品</h2><p>展开项目后填写制作人数，并按五个板块修改内容。</p></div><div class="editor-project-list">${draft.projects.map(projectEditor).join("")}</div></section>`;
    for(const i of openProjects) root.querySelector(`details[data-project="${i}"]`)?.setAttribute("open","");
  }
  function save(message="草稿已保存到当前浏览器") { localStorage.setItem(KEY,JSON.stringify(draft)); status.textContent=message; }
  root.addEventListener("input",event=>{ const e=event.target, path=e.dataset.path; if(!path)return; set(path,e.type==="checkbox"?e.checked:e.type==="number"?Number(e.value):e.value); clearTimeout(timer); timer=setTimeout(()=>save("已自动保存草稿"),400); });
  root.addEventListener("click",event=>{
    const button=event.target.closest("button"); if(!button)return;
    const path=button.dataset.add || button.dataset.delete; if(!path)return;
    const opened=[...root.querySelectorAll("details[data-project][open]")].map(d=>d.dataset.project);
    if(button.dataset.add) get(path).push({title:"",text:""});
    else get(path).splice(Number(button.dataset.index),1);
    save(); render(opened);
  });
  document.querySelector(".editor-actions").addEventListener("click",event=>{
    const action=event.target.dataset.action;
    if(action==="save") save();
    if(action==="preview") { save("已保存草稿并打开预览"); window.open("index.html?preview=1","_blank","noopener"); }
    if(action==="download") {
      const blob=new Blob([`window.PORTFOLIO_CONTENT = ${JSON.stringify(draft,null,2)};\n`],{type:"text/javascript;charset=utf-8"});
      const url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download="site-content.js";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);save("已下载内容文件");
    }
    if(action==="website") { save("正在整理完整网站……");window.exportPortfolioWebsite(draft).then(()=>status.textContent="完整网站已下载").catch(error=>status.textContent=`导出失败：${error.message}`); }
    if(action==="reset" && window.confirm("确定恢复当前已发布版本？本浏览器草稿会被覆盖。")){draft=window.normalizePortfolio(published);localStorage.removeItem(KEY);render();status.textContent="已恢复已发布版本";}
  });
  render();
})();
