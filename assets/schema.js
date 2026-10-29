window.normalizePortfolio = function (value) {
  const data = JSON.parse(JSON.stringify(value));
  for (const project of data.projects || []) {
    const oldTeam = (project.meta || []).find(item => /人数|制作人数/.test(item.label));
    project.teamSize = project.teamSize ?? oldTeam?.value ?? "待填写";
    project.multiplayer = project.multiplayer ?? /团队|多人/.test(project.teamSize);
    project.roles = project.roles || [];
    project.prototypeCards = project.prototypeCards || [...(project.contribution?.cards || []), ...(project.reflection?.cards || [])];
    project.prototypeText = project.prototypeText ?? project.contribution?.text ?? "";
    project.purpose = project.purpose || {text:"",cards:[]};
    project.flow = project.flow || {text:"",items:[]};
    project.gallery = project.gallery || [];
    project.meta = project.meta || [];
  }
  return data;
};
