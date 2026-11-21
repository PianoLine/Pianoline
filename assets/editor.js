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
  function group(id, title, description, fields) { return `<section id="${id}" class="editor-group"><div class="editor-group-head"><h2>${esc(title)}</h2><p>${esc(description)}</p></div><div class="editor-grid">${fields}</div></section>`; }
  function cards(path, label) {
    const list=get(path) || [];
    return `<div class="editor-mini-grid">${list.map((item,i)=>`<div class="editor-mini-card"><strong>${esc(label)} ${i+1}</strong>${field(`${path}.${i}.title`,"标题")}${field(`${path}.${i}.text`,"内容","textarea")}<div class="editor-card-actions"><button type="button" class="button subtle" data-delete="${esc(path)}" data-index="${i}">删除</button></div></div>`).join("")}</div><button type="button" class="button editor-add" data-add="${esc(path)}">＋ 添加${esc(label)}</button>`;
  }
  function projectEditor(p,i) {
    const b=`projects.${i}`;
    const meta=p.meta.map((m,j)=> /项目状态|人数/.test(m.label) ? "" : `${field(`${b}.meta.${j}.label`,"信息名称")}${field(`${b}.meta.${j}.value`,"信息内容")}`).join("");
    const gallery=p.gallery.map((image,j)=>`<div class="editor-mini-card"><strong>截图 ${j+1}</strong>${field(`${b}.gallery.${j}.src`,"图片路径")}${field(`${b}.gallery.${j}.alt`,"图片替代文字")}${field(`${b}.gallery.${j}.label`,"截图标题")}${field(`${b}.gallery.${j}.note`,"截图说明","textarea")}</div>`).join("");
    return `<details class="editor-project" data-project="${i}"><summary><span><b>${esc(p.number)} / ${esc(p.title)}</b><small>项目编辑</small></span><span>展开编辑</span></summary><div class="editor-project-body">
      <div class="editor-subgroup"><h3>项目基本信息</h3><div class="editor-grid">${field(`${b}.number`,"项目序号")}${field(`${b}.title`,"项目名称")}${field(`${b}.category`,"手牌与项目列表标签","text","例如 UE5 / VR")}${field(`${b}.teamSize`,"制作人数小标签","text","例如：1 人、3 人或团队项目")}${field(`${b}.multiplayer`,"多人项目：显示职责分工","checkbox")}${field(`${b}.short`,"首页卡片简介","textarea")}${field(`${b}.intro`,"项目页开头简介","textarea")}${meta}${field(`${b}.cover.src`,"封面图片路径")}${field(`${b}.cover.alt`,"封面图片说明")}${field(`${b}.cover.cardSrc`,"手牌与列表缩略图（可选）","text","留空时使用项目封面")}</div></div>
      <div class="editor-subgroup"><h3>1. 项目概述</h3><div class="editor-grid">${field(`${b}.purpose.text`,"概述说明","textarea")}</div>${cards(`${b}.purpose.cards`,"概述卡片")}</div>
      <div class="editor-subgroup"><h3>2. 玩法流程</h3><div class="editor-grid">${field(`${b}.flow.text`,"流程说明","textarea")}</div>${cards(`${b}.flow.items`,"流程步骤")}</div>
      <div class="editor-subgroup"><h3>3. 原型内容</h3><div class="editor-grid">${field(`${b}.prototypeText`,"板块说明","textarea")}</div>${cards(`${b}.prototypeCards`,"原型卡片")}</div>
      <div class="editor-subgroup"><h3>4. 职责分工</h3><p>仅勾选上方“多人项目”时显示在项目页。</p>${cards(`${b}.roles`,"职责卡片")}</div>
      <div class="editor-subgroup"><h3>截图与视频</h3><div class="editor-grid">${field(`${b}.galleryText`,"截图区说明","textarea")}${field(`${b}.video.file`,"站内视频文件路径","text","例如 assets/media/videos/example.mp4")}${field(`${b}.video.url`,"原视频链接或旧的视频路径","text","可填写 YouTube 链接；站内文件优先播放")}${field(`${b}.video.originalUrl`,"额外的原视频链接（可选）")}${field(`${b}.video.label`,"视频标题")}${field(`${b}.video.note`,"视频说明")}</div><div class="editor-mini-grid">${gallery}</div><button type="button" class="button editor-add" data-add="${b}.gallery">＋ 添加截图</button></div>
      </div></details>`;
  }
  function postsEditor() {
    return `<section id="posts" class="editor-group"><div class="editor-group-head"><h2>动态与开发日志</h2><p>按阅读顺序添加文字和图片，勾选「公开显示」的动态会出现在首页和日志页。</p></div>${draft.posts.map((post,i) => `<details class="editor-project" data-post="${i}"><summary><span><b>${esc(post.title || "未命名动态")}</b><small>${esc(post.date || "未设置日期")}</small></span><span>展开编辑</span></summary><div class="editor-project-body"><div class="editor-grid">${field(`posts.${i}.title`,"标题")}${field(`posts.${i}.date`,"发布日期","date")}${field(`posts.${i}.visible`,"公开显示这条动态","checkbox")}</div><p>按顺序添加文字或图片；长文可拆成多段，再插入图片。</p>${post.blocks.map((block,j) => `<div class="editor-mini-card post-block"><strong>${block.type === "image" ? "图片" : "文字"} ${j+1}</strong>${block.type === "image" ? `${field(`posts.${i}.blocks.${j}.src`,"图片路径或网址","text","也可以使用下方按钮选择电脑里的图片")}${field(`posts.${i}.blocks.${j}.caption`,"图片说明")}<label class="editor-field"><span>选择图片（建议单张小于 1 MB）</span><input type="file" accept="image/*" data-image-post="${i}" data-image-block="${j}"></label>${block.src ? `<img class="editor-post-image" src="${esc(block.src)}" alt="图片预览">` : ""}` : field(`posts.${i}.blocks.${j}.text`,"正文","textarea")}<div class="editor-card-actions"><button type="button" class="button subtle" data-post-action="up" data-post-index="${i}" data-block-index="${j}">上移</button><button type="button" class="button subtle" data-post-action="down" data-post-index="${i}" data-block-index="${j}">下移</button><button type="button" class="button subtle" data-post-action="delete-block" data-post-index="${i}" data-block-index="${j}">删除</button></div></div>`).join("")}<div class="editor-card-actions"><button class="button" type="button" data-post-action="text" data-post-index="${i}">＋ 添加文字</button><button class="button" type="button" data-post-action="image" data-post-index="${i}">＋ 添加图片</button><button class="button subtle" type="button" data-post-action="delete-post" data-post-index="${i}">删除这条动态</button></div></div></details>`).join("")}<button class="button editor-add" type="button" data-post-action="add">＋ 新增动态</button></section>`;
  }
  let playlistPath = "playlist";
  function playlistEditor() {
    const list = draft[playlistPath];
    const rows = list.map((track, i) => `<div class="editor-mini-card">
      <strong>曲目 ${i + 1}</strong><div class="editor-grid">
      ${field(`${playlistPath}.${i}.title`, "曲名")}${field(`${playlistPath}.${i}.src`, "音乐文件路径或音频直链")}
      </div><div class="editor-card-actions">
      <button type="button" class="button subtle" data-track-action="up" data-index="${i}" ${i === 0 ? "disabled" : ""}>上移</button>
      <button type="button" class="button subtle" data-track-action="down" data-index="${i}" ${i === list.length - 1 ? "disabled" : ""}>下移</button>
      <button type="button" class="button subtle" data-track-action="delete" data-index="${i}">删除</button>
      </div></div>`).join("");
    return `<section id="playlist" class="editor-group"><div class="editor-group-head"><h2>背景音乐歌单</h2>
      <p>歌单按顺序循环。点击留声机后随机循环，每轮内每首只播一次。</p></div>
      <p>把音频放进 <code>assets/media/music/守望人/</code> 、<code>assets/media/music/白色人偶/</code> 或 <code>assets/media/music/梦庭人偶/</code>。选择整个 <code>music</code> 文件夹即可补入新歌，根目录的曲目归守望人。</p>
      <div class="editor-card-actions"><button type="button" class="button" data-track-action="folder">同步音乐文件夹</button><input class="music-folder" type="file" webkitdirectory multiple hidden><button type="button" class="button" data-track-action="download">下载 site-content.js</button></div>
      <label class="editor-field"><span>角色皮肤</span><select class="playlist-skin"><option value="playlist">${window.portfolioSkinNames.celadon}</option><option value="brocadePlaylist" ${playlistPath === "brocadePlaylist" ? "selected" : ""}>${window.portfolioSkinNames.brocade}</option><option value="dreamPlaylist" ${playlistPath === "dreamPlaylist" ? "selected" : ""}>${window.portfolioSkinNames.dream}</option></select></label>
      <div class="editor-mini-grid">${rows}</div><div class="editor-card-actions">
      <button type="button" class="button" data-track-action="import">导入音频到整站 ZIP</button>
      <input class="track-import" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac,.aac,.opus" multiple hidden>
      <button type="button" class="button" data-track-action="add">＋ 添加音乐地址</button></div>
      <p>同步文件夹后，用下载的 site-content.js 替换 assets/site-content.js。发布时一起上传新增音频。使用「导入音频到整站 ZIP」的文件仅存于浏览器，需随 ZIP 发布。</p></section>`;
  }
  function refreshPlaylist() {
    root.querySelector("#playlist").outerHTML = playlistEditor();
  }
  function render(openProjects=[], openPosts=[]) {
    const basics = [
      field("meta.siteTitle","浏览器标签标题"), field("profile.name","首页姓名"),
      field("profile.eyebrow","姓名下方的职业方向"), field("profile.headline","首页辅助标题"),
      field("profile.intro","职业下方短文","textarea","显示在牌桌上的职业名称和「浏览项目」之间，支持换行。留空可隐藏。"),
      field("profile.profileTitle","简介区标题"), field("profile.profileCopy","个人简介正文","textarea","显示在首页的个人简介区域。"),
      field("home.aboutIntro","简介区引言","textarea"), field("home.projectsIntro","项目区引言","textarea")
    ].join("");
    const contact=field("contact.heading","联系区标题")+field("contact.intro","联系区说明","textarea")+field("contact.email","邮箱")+field("contact.resumeUrl","简历 PDF 链接")+field("contact.videoUrl","视频主页链接")+field("contact.platformUrl","作品平台链接");
    const appearance=field("theme.accent","强调色","color")+field("theme.accentLight","强调浅色","color")+field("theme.teal","辅助色","color")+field("theme.cardColumns","桌面项目卡片列数（1–3）","number")+field("theme.homeMaxWidth","首页栏目最大宽度（像素）","number")+field("theme.maxWidth","内容内页最大宽度（像素）","number")+field("theme.sectionSpace","上下留白（像素）","number");
    const tags=(draft.profile.tags||[]).map((_,i)=>field(`profile.tags.${i}`,`技能标签 ${i+1}`)).join("");
    const projects = `<section id="projects" class="editor-group"><div class="editor-group-head"><h2>项目作品</h2><p>每个项目自动生成一张作品卡。卡面使用项目名称、类别和缩略图。</p></div><div class="editor-project-list">${draft.projects.map(projectEditor).join("")}</div><button type="button" class="button editor-add" data-new-project>＋ 新增项目</button></section>`;
    root.innerHTML = [
      group("profile","首页与简介","编辑访客在桌边和个人简介区看到的文字。",basics+tags),
      projects, playlistEditor(), postsEditor(), group("contact","联系方式与简历","填写希望展示给访客的信息。",contact),
      group("appearance","颜色与排版","设置内容页面的强调色、列表列数和宽度。木屋灯光由互动场景单独控制。",appearance)
    ].join("");
    for(const i of openPosts) root.querySelector(`details[data-post="${i}"]`)?.setAttribute("open", "");
    for(const i of openProjects) root.querySelector(`details[data-project="${i}"]`)?.setAttribute("open","");
  }
  function save(message="草稿已保存到当前浏览器") { try { localStorage.setItem(KEY,JSON.stringify(draft)); status.textContent=message; return true; } catch (_) { status.textContent="浏览器存储空间不足，请先下载内容文件备份，并减少或压缩图片。"; return false; } }
  root.addEventListener("input",event=>{
    const e=event.target, path=e.dataset.path;
    if (!path) return;
    set(path,e.type==="checkbox"?e.checked:e.type==="number"?Number(e.value):e.value);
    const details = e.closest("details[data-project]");
    if (details && /\.(title|number)$/.test(path) && path.split(".").length === 3) {
      const project = draft.projects[details.dataset.project];
      details.querySelector("summary b").textContent = project.number + " / " + project.title;
    }
    clearTimeout(timer); timer=setTimeout(()=>save("已自动保存草稿"),400); });
  root.addEventListener("click",event=>{
    const button=event.target.closest("button"); if(!button)return;
    if (button.dataset.trackAction) {
      const list = draft[playlistPath], i = Number(button.dataset.index);
      switch (button.dataset.trackAction) {
        case "folder": root.querySelector(".music-folder").click(); return;
        case "download": downloadContent(); return;
        case "import": root.querySelector(".track-import").click(); return;
        case "add": list.push({title:"", src:""}); break;
        case "delete": list.splice(i, 1); break;
        case "up": [list[i-1], list[i]] = [list[i], list[i-1]]; break;
        case "down": [list[i+1], list[i]] = [list[i], list[i+1]]; break;
      }
      save(); refreshPlaylist(); return;
    }
    if (button.hasAttribute("data-new-project")) {
      const index = draft.projects.length;
      const number = Math.max(0, ...draft.projects.map(p => parseInt(p.number, 10) || 0)) + 1;
      const project = {
        id: "project-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
        sharedPage: true, number: String(number).padStart(2, "0"), title: "新项目",
        category: "", teamSize: "", multiplayer: false, short: "", intro: "",
        cover: {src: "", alt: "", cardSrc: ""}, meta: [{label: "使用引擎", value: ""}],
        gallery: []
      };
      draft.projects.push(window.normalizePortfolio({projects: [project]}).projects[0]);
      save("已新增项目和作品卡");
      const list = root.querySelector(".editor-project-list");
      list.insertAdjacentHTML("beforeend", projectEditor(draft.projects[index], index));
      list.lastElementChild.open = true;
      const title = list.lastElementChild.querySelector(`[data-path="projects.${index}.title"]`);
      title.focus();
      title.select();
      return;
    }
    const action=button.dataset.postAction;
    if(action) {
      const openedProjects=[...root.querySelectorAll("details[data-project][open]")].map(d=>d.dataset.project);
      let openedPosts=[...root.querySelectorAll("details[data-post][open]")].map(d=>Number(d.dataset.post));
      const i=Number(button.dataset.postIndex), j=Number(button.dataset.blockIndex);
      if(action==="add") { const d=new Date(); const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; draft.posts.unshift({id:`post-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,title:"",date,visible:true,blocks:[{type:"text",text:""}]}); openedPosts=[0,...openedPosts.map(x=>x+1)]; }
      else if(action==="delete-post") { if(!confirm("确定删除这条动态吗？"))return; draft.posts.splice(i,1); openedPosts=openedPosts.filter(x=>x!==i).map(x=>x>i?x-1:x); }
      else { const blocks=draft.posts[i].blocks; if(action==="text")blocks.push({type:"text",text:""}); if(action==="image")blocks.push({type:"image",src:"",caption:""}); if(action==="delete-block")blocks.splice(j,1); if(action==="up" && j>0)[blocks[j-1],blocks[j]]=[blocks[j],blocks[j-1]]; if(action==="down" && j<blocks.length-1)[blocks[j+1],blocks[j]]=[blocks[j],blocks[j+1]]; }
      save(); render(openedProjects,openedPosts); return;
    }
    const path=button.dataset.add || button.dataset.delete; if(!path)return;
    const opened=[...root.querySelectorAll("details[data-project][open]")].map(d=>d.dataset.project);
    if(button.dataset.add) get(path).push(path.endsWith(".gallery") ? {src:"",alt:"",label:"",note:""} : {title:"",text:""});
    else get(path).splice(Number(button.dataset.index),1);
    const postOpen=[...root.querySelectorAll("details[data-post][open]")].map(d=>d.dataset.post);
    save(); render(opened,postOpen);
  });
  root.addEventListener("change", event => {
    const input=event.target; if (!input.dataset.imagePost || !input.files?.[0]) return;
    const file=input.files[0], i=Number(input.dataset.imagePost), j=Number(input.dataset.imageBlock);
    if(file.size>1024*1024 && !confirm("这张图片超过 1 MB，可能占满浏览器草稿空间。建议压缩后使用，仍要继续吗？")) { input.value=""; return; }
    const reader=new FileReader(); reader.onload=()=>{ if(!draft.posts[i]?.blocks[j])return; draft.posts[i].blocks[j].src=reader.result; save(); render([...root.querySelectorAll("details[data-project][open]")].map(d=>d.dataset.project),[...root.querySelectorAll("details[data-post][open]")].map(d=>d.dataset.post)); }; reader.readAsDataURL(file);
  });
  function syncMusicFolder(files) {
    if (!files.length) return;
    if (files[0].webkitRelativePath.split("/")[0] !== "music") {
      status.textContent = "请选择项目中 assets/media/music 文件夹。";
      return;
    }
    const groups = new Map([
      [window.portfolioSkinNames.celadon, draft.playlist],
      [window.portfolioSkinNames.brocade, draft.brocadePlaylist],
      [window.portfolioSkinNames.dream, draft.dreamPlaylist]
    ]);
    const known = new Map([...groups].map(([name, list]) => [name, new Set(list.map(track => {
      try { return new URL(track.src, document.baseURI).href; } catch { return track.src; }
    }))]));
    const counts = new Map([...groups.keys()].map(name => [name, 0]));
    const sorted = [...files].sort((a,b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath, "zh-CN", {numeric:true}));
    for (const file of sorted) {
      if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|ogg|wav|flac|aac|opus|weba)$/i.test(file.name)) continue;
      const parts = file.webkitRelativePath.split("/");
      const name = parts.length === 2 ? window.portfolioSkinNames.celadon : parts[1];
      if (!groups.has(name)) continue;
      const path = "assets/media/" + parts.map(part => part.replace(/[%?#]/g, encodeURIComponent)).join("/");
      const key = new URL(path, document.baseURI).href;
      if (known.get(name).has(key)) continue;
      groups.get(name).push({title:file.name.replace(/\.[^.]+$/, ""), src:path});
      known.get(name).add(key);
      counts.set(name, counts.get(name) + 1);
    }
    save([...counts].map(([name, count]) => name + "新增 " + count + " 首").join("，"));
    refreshPlaylist();
  }

  root.addEventListener("change", async event => {
    if (event.target.matches(".music-folder")) {
      syncMusicFolder(event.target.files);
      event.target.value = "";
      return;
    }
    if (event.target.matches(".playlist-skin")) {
      playlistPath = event.target.value;
      refreshPlaylist();
      return;
    }
    if (!event.target.matches(".track-import")) return;
    const files = Array.from(event.target.files);
    if (!files.length) return;
    const currentDraft = draft;
    const list = draft[playlistPath];
    let added = 0;
    try {
      for (const file of files) {
        const src = await window.playlistFiles.importFile(file);
        if (draft !== currentDraft) return;
        list.push({title: file.name.replace(/\.[^.]+$/, ""), src});
        added++;
      }
      save(`已导入 ${added} 首音乐`);
    } catch {
      save(`已导入 ${added} 首。文件保存失败，请检查浏览器存储空间，或改用音频直链。`);
    }
    refreshPlaylist();
  });
  function downloadContent() {
    const blob = new Blob(["window.PORTFOLIO_CONTENT = " + JSON.stringify(draft, null, 2) + ";\n"], {type:"text/javascript;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "site-content.js";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    save("已下载 site-content.js");
  }
  document.querySelector(".editor-actions").addEventListener("click",event=>{
    const action=event.target.dataset.action;
    if(action==="save") save();
    if(action==="preview" && save("已保存草稿并打开预览")) { window.open("index.html?preview=1","_blank","noopener"); }
    if(action==="download") downloadContent();
    if(action==="website") { save("正在整理完整网站……");window.exportPortfolioWebsite(draft).then(()=>status.textContent="完整网站已下载").catch(error=>status.textContent=`导出失败：${error.message}`); }
    if(action==="reset" && window.confirm("确定还原到当前网站文件中的内容？本浏览器草稿会被覆盖。")){clearTimeout(timer);draft=window.normalizePortfolio(published);render();save("已还原到网站文件版本");}
  });
  render();
})();

