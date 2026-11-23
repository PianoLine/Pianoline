// A small two-tone seal over a layered landscape, printed at native pixel size.
window.designProjectCard = function designProjectCard(project) {
  const motifs = [
    [/\bvr\b|虚拟现实|头显/i, ["..+++++++++..",".++.......++.","++..ooo.ooo++","++..ooo.ooo++",".++++...++++."]],
    [/三消|消除|match.?3|解谜|puzzle/i, [".....+++.....","....++oo+....","...++oooo+...","..+++++++++..","...++ooo++...","....++o++....",".....+++.....","......+......"]],
    [/锻造|铁匠|forg|smith/i, [".......++++++","++.....+oooo+","++++++++oooo+","..++++++++++.",".....+++++...","......+++....","....+++++++.."]],
    [/卡牌|桌游|card|回合/i, ["..+++++++....","..+ooooo++++.","..+o+++o+oo+.","..+oo+oo+oo+.","..+ooooo+oo+.","..+++++++oo+.",".....+++++++."]],
    [/博物馆|遗迹|museum|relic/i, ["......+......","....+++++....","..+++++++++..",".+++++++++++.","..++..+..++..","..++..+..++..","..++..+..++..",".+++++++++++."]],
    [/电梯|建筑|塔|elevator|tower/i, ["....++..++...","....++++++...","....+o++o+...","....++++++...","....+o++o+...","....++++++...","...++++++++.."]],
    [null, ["......+......",".....+o+.....",".....+o+.....","..+++ooo+++..",".+ooooooooo+.","..+++ooo+++..",".....+o+.....",".....+o+.....","......+......"]]
  ];
  const subject = [project.title, project.category, project.short].join(" ");
  let seed = 2166136261;
  for (const letter of project.id + "|" + subject) seed = Math.imul(seed ^ letter.codePointAt(0), 16777619);
  function random(max) {
    seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
    return Math.floor(seed / 4294967296 * max);
  }
  const palettes = [
    ["#263e47","#48706c","#95b29a","#f0d8a4"],
    ["#3d3048","#74506a","#bc8b7e","#f4dcae"],
    ["#293750","#516989","#93a9b3","#ffe3ac"],
    ["#40362f","#876445","#c6a473","#f3dfac"]
  ];
  const [ink,shadow,haze,paper] = palettes[random(palettes.length)];
  const canvas = document.createElement("canvas");
  canvas.width=88; canvas.height=80;
  const ctx=canvas.getContext("2d");
  function rect(x,y,w,h,color) {
    ctx.fillStyle=color;
    ctx.fillRect(x,y,w,h);
  }
  rect(0,0,88,80,ink);
  for (let i=0;i<64;i++) rect(random(88),random(50),1,1,haze);
  const moonX=38+random(13), moonY=32+random(5);
  for (let dy=-21;dy<=21;dy++) {
    const dx=Math.floor(Math.sqrt(21*21-dy*dy));
    rect(moonX-dx,moonY+dy,2*dx+1,1,paper);
  }
  for (const [base,color] of [[56,haze],[64,shadow],[74,ink]]) {
    let height=base-random(14);
    for(let x=0;x<88;x+=8) {
      const next=base-random(14);
      for(let step=0;step<8;step++) {
        const y=Math.round(height+(next-height)*step/8);
        rect(x+step,y,1,80-y,color);
      }
      height=next;
    }
  }
  const [,glyph]=motifs.find(([pattern])=>!pattern || pattern.test(subject));
  glyph.forEach((line,y)=>Array.from(line).forEach((pixel,x)=>{
    if(pixel!==".") rect(moonX+(x-6)*2,moonY+2*y-glyph.length,2,2,pixel==="+"?ink:shadow);
  }));
  for (const x of [5,82]) for (const y of [5,74]) {
    rect(x<44?x:x-6,y,7,1,paper);
    rect(x,y<40?y:y-6,1,7,paper);
  }
  return canvas.toDataURL("image/png");
};
