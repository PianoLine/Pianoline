window.normalizePortfolio = function (value) {
  const data = JSON.parse(JSON.stringify(value));
  data.theme ??= {};
  data.theme.homeMaxWidth ??= Math.max(1760, Number(data.theme.maxWidth) || 0);
  data.posts = Array.isArray(data.posts) ? data.posts : [];
  for (const post of data.posts) { post.blocks = Array.isArray(post.blocks) ? post.blocks : []; post.visible = post.visible !== false; }
  for (const project of data.projects || []) {
    // Earlier saves included completion as a slash-separated category tag.
    project.category = String(project.category || "").split(/\s*[/／|｜]\s*/)
      .map(tag => tag.trim())
      .filter(tag => tag && !/^(?:已完成|未完成|已完结|开发中|进行中|待完成|已完成项目|未完成项目|completed?|unfinished|in progress|wip)$/i.test(tag))
      .join(" / ");
    const oldTeam = (project.meta || []).find(item => /人数|制作人数/.test(item.label));
    project.teamSize = project.teamSize ?? oldTeam?.value ?? "待填写";
    project.multiplayer = project.multiplayer ?? /团队|多人/.test(project.teamSize);
    project.roles = project.roles || [];
    project.prototypeCards = project.prototypeCards || [...(project.contribution?.cards || []), ...(project.reflection?.cards || [])];
    project.prototypeText = project.prototypeText ?? project.contribution?.text ?? "";
    project.purpose = project.purpose || {text:"",cards:[]};
    project.flow = project.flow || {text:"",items:[]};
    project.gallery = project.gallery || [];
    project.video = project.video || {url:"", file:"", originalUrl:"", label:"演示视频", note:""};
    project.meta = project.meta || [];
  }
  return data;
};

