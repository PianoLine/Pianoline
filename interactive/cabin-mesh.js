/* All dimensions are in room space. +Y is up, and +Z points toward the visitor. */
window.buildCabinMesh = function buildCabinMesh() {
  const vertices = [];
  const palette = new Map();
  const wicks = [];
  let seed = 31277;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function face(points, paint, grain = 0, emission = 0) {
    if (!palette.has(paint)) {
      const rgb = parseInt(paint, 16);
      palette.set(paint, [rgb >> 16, (rgb >> 8) & 255, rgb & 255]);
    }
    const [r,g,b] = palette.get(paint);
    const [a,c,d] = points;
    const u = c.map((v,i) => v-a[i]), v = d.map((n,i) => n-a[i]);
    const nx = u[1]*v[2]-u[2]*v[1], ny = u[2]*v[0]-u[0]*v[2], nz = u[0]*v[1]-u[1]*v[0];
    const length = Math.hypot(nx,ny,nz) || 1;
    const diffuse = .56 + .31*Math.abs(ny/length) + .19*nx/length + .14*nz/length;
    const shade = diffuse * (1-emission) * (grain === 4 ? 1 : .51) + emission;
    const lit = points.map(([x,y,z]) => {
      const distance = Math.min((x-3.12)**2+(y-2.7)**2+(z-2.45)**2, (x+2.26)**2+(y-2.41)**2+(z+.85)**2);
      const amber = (1-emission) * .67 / (1+distance*.19);
      return [x,y,z, Math.min(1,r/255*(shade+amber)), Math.min(1,g/255*(shade+amber*.70)),
        Math.min(1,b/255*(shade+amber*.30)),grain];
    });
    for (let i=1; i<lit.length-1; i++) vertices.push(...lit[0],...lit[i],...lit[i+1]);
  }
  function box(x,y,z,w,h,d,color,grain=0,yaw=0) {
    const co=Math.cos(yaw), si=Math.sin(yaw);
    const corners = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]
      .map(([i,j,k]) => [x+i*w*.5*co+k*d*.5*si,y+j*h*.5,z-i*w*.5*si+k*d*.5*co]);
    for (const indices of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]]) {
      face(indices.map(i=>corners[i]),color,grain);
    }
  }
  function turned(x,z,levels,sides,paint,emission=0,rotation=.21) {
    const rings=levels.map(([y,r,dx=0])=>Array.from({length:sides},(_,i)=>{
      const a=rotation+2*Math.PI*i/sides;
      return [x+dx+r*Math.cos(a),y,z+r*Math.sin(a)];
    }));
    for (let j=1;j<rings.length;j++) for (let i=0;i<sides;i++) {
      const k=(i+1)%sides;
      face([rings[j-1][i],rings[j][i],rings[j][k],rings[j-1][k]],paint,0,emission);
    }
    face(rings.at(-1).slice().reverse(),paint,0,emission);
  }
  function beam(x1,y1,x2,y2,z,thickness,depth,paint) {
    const len=Math.hypot(x2-x1,y2-y1), dx=-(y2-y1)*thickness/(2*len),dy=(x2-x1)*thickness/(2*len);
    const outline=[[x1+dx,y1+dy],[x1-dx,y1-dy],[x2-dx,y2-dy],[x2+dx,y2+dy]];
    const ring=dz=>outline.map(([x,y])=>[x,y,z+dz]);
    const front=ring(depth/2), back=ring(-depth/2);
    face(front,paint,2); face(back.slice().reverse(),paint,2);
    for(let i=0;i<4;i++){const k=(i+1)%4;face([front[i],back[i],back[k],front[k]],paint,2);}
  }
  // The rear wall has an actual opening. Trees, moon and hills are beyond it.
  face([[-60,-20,-32],[60,-20,-32],[60,30,-32],[-60,30,-32]],"233b3c",0,1);
  const moon = Array.from({length:14},(_,i)=>{
    const a=i*2*Math.PI/14; return [15.9+1.02*Math.cos(a),8.2+1.02*Math.sin(a),-26];
  });
  face(moon,"999f87",0,1);
  for (const [z,count,tint,scale] of [[-22,31,"304f51",1.18],[-14.2,24,"254b48",1],[-8.1,18,"1a3530",.76]]) {
    for (let i=0;i<count;i++) {
      const x=(i-count/2)*1.54+(random()-.5)*.65, h=(4.9+random()*3.35)*scale;
      const base=-1.3, spread=(1+random()*.43)*scale;
      for(let j=0;j<3;j++){
        const y=base+h*(.13+j*.22), rad=spread*(1-j*.23);
        turned(x,z+random()*.15,[[y,rad],[y+h*(.47-j*.045),.018]],5,tint,.58);
      }
    }
  }
  const wood=["523321","483022","533726","493123","583d2a","4d3425"];
  box(-5,3.6,-5.78,14,8.5,.14,"221d17");
  box(9.87,3.6,-5.78,4.34,8.5,.14,"221d17");
  box(4.88,.64,-5.78,6.1,2.48,.14,"221d17");
  box(4.88,7.4,-5.78,6.1,2.58,.14,"221d17");
  for(let row=0;row<14;row++) {
    const y=-.5+row*.6+.3, tint=wood[row%wood.length];
    const spans=(row>=4 && row<11)?[[-12,2.05],[7.7,12]]:[[-12,12]];
    for(const [a,b] of spans) box((a+b)/2,y,-5.5,b-a,.588,.25,tint,1);
  }
  for(const x of [-8.7,8.7]){
    box(x*1.025,3.1,.1,.18,8.2,12,"281e19");
    for(let row=0;row<13;row++) box(x,row*.59-.17,.1,.3,.578,11.5,wood[(row+2)%6],3);
    for(const z of [-4.5,-.2,4.1]) box(x*.986,3.2,z,.47,7.5,.53,"593a26",2);
  }
  box(0,-.62,0,23,.22,13,"30251e",1);
  box(0,6.94,-.5,22,.22,13,"33251e",3);
  for(const x of [-8.2,-3.8,1.89,7.9]) box(x,3.05,-5.12,.30,7.5,.36,"684227",2);
  box(0,6.42,-4.95,20,.36,.58,"7f5130",1);
  beam(-7.95,4.95,-6.35,6.45,-4.9,.26,.38,"815430");
  beam(7.8,4.86,6.05,6.43,-4.9,.29,.41,"805132");
  for(const y of [1.86,6.15]) box(4.88,y,-5.09,6,.26,.68,"9a7148",1);
  box(4.88,3.73,-5.21,5.69,.13,.31,"715539",1);
  for(const x of [2.11,5.04,7.63]) box(x,4,-5.17,.17,4.32,.34,"83613e",2);
  // Shelf contents occupy independent depths and cast small contact shadows.
  const covers=["71423a","65705a","9a7244","425656","84613d","705c4e"];
  for(const x of [-7.8,-4.2]) box(x,2.82,-3.65,.16,4.95,.82,"715035",2);
  for(const y of [.54,1.98,3.55,5.15]) box(-6,y,-3.57,3.95,.15,1.08,"8a5e38",1);
  for(const [y,count] of [[.62,6],[2.06,5],[3.63,8]]) {
    let x=-7.63;
    for(let i=0;i<count;i++){
      const width=.18+random()*.20, h=.65+random()*.59, z=-3.48+random()*.16;
      const cx=x+width/2, yaw=(random()-.5)*.13;
      box(cx,y+h/2,z,width,h,.69,covers[(i+count)%covers.length],0,yaw);
      for(const band of [.14,.81]) box(cx,y+band*h,z+.35,width*.83,.034,.035,"b09460",0,yaw);
      x+=width+.037;
    }
  }
  function bottle(x,y,z,s,paint) {
    turned(x,z,[[y,.29*s],[y+.15*s,.43*s],[y+.69*s,.40*s],[y+.91*s,.17*s],[y+1.17*s,.16*s]],7,paint);
    turned(x,z,[[y+1.16*s,.17*s],[y+1.29*s,.18*s]],7,"9b734c");
  }
  bottle(-4.69,2.06,-3.36,.83,"44665a");
  bottle(-4.77,.62,-3.53,.68,"786245");
  // Broad irregular boards form the table and its exposed front apron.
  for(let i=0;i<10;i++){
    const z=-1.55+i*.80;
    box(0,1.39,z,16.8,.28,.793,["855a37","93613b","805436","936840","855c3b"][i%5],1);
  }
  box(0,1.19,-1.98,16.8,.25,.14,"4c3021",1);
  function book(x,y,z,w,d,h,yaw,color) {
    box(x,y+.034,z,w,.068,d,color,0,yaw);
    box(x,y+h/2,z,w*.966,h-.09,d*.945,"c1a479",0,yaw);
    box(x,y+h-.034,z,w,.068,d,color,0,yaw);
    const ox=-d*.48*Math.sin(yaw), oz=-d*.48*Math.cos(yaw);
    box(x+ox,y+h/2,z+oz,w,h,.07,color,0,yaw);
  }
  book(-5.02,1.53,1.95,1.30,.81,.18,-.15,"784932");
  book(-4.96,1.71,1.95,1.14,.76,.16,.08,"5a6750");
  bottle(-5.17,1.87,1.99,.44,"375e55");
  function candle(x,y,z,r,h) {
    turned(x,z,[[y,r*1.23],[y+.08,r*1.17],[y+.13,r],[y+h-.07,r],[y+h,r*.85]],8,"c29658");
    // Small separate wax ridges hang down over the faceted front.
    for(const [offset,drop] of [[-.38,.21],[.43,.13]]) {
      const ridge=r*.13, front=z+r*.86;
      turned(x+offset*r,front,[[y+h-drop,ridge*.42],[y+h-drop+.045,ridge],[y+h-.028,ridge]],5,"d0a665");
    }
    turned(x,z,[[y+h-.01,r*.73],[y+h+.004,r*.65]],8,"aa804b");
    turned(x,z,[[y+h,.027],[y+h+.085,.018]],5,"35251c");
    wicks.push({x,y:y+h,z,r});
  }
  const clusterStart=vertices.length;
  turned(3.12,2.45,[[1.53,.55],[1.58,.61],[1.65,.55]],9,"755538");
  candle(3.10,1.65,2.36,.146,.79);
  candle(3.32,1.65,2.56,.13,.55);
  candle(2.90,1.65,2.64,.105,.31);
  const clusterEnd=vertices.length;
  candle(-2.26,1.53,-.85,.15,.61);
  candle(6.44,1.99,-4.94,.16,.66);
  // Put moving geometry together so the room stays in its static vertex buffer.
  const flames = wicks.map(({x,y,z,r}, index) => {
    const start=vertices.length;
    turned(x,z,[[y+.055,.025],[y+.18,r*.48],[y+.46,.008,.02]],6,"ffae42",1);
    turned(x,z+.04,[[y+.055,.018],[y+.14,r*.25],[y+.28,.006]],5,"fff2b4",1);
    return {x,y,z,phase:index*2.13,start,end:vertices.length};
  });
  // Tabletop props are local-space solids. The renderer places their feet on the table.
  function part(build) {
    const start = vertices.length;
    build();
    return { start, end: vertices.length };
  }
  function slab(width, depth, bottom, top, bevel, edges, lid) {
    const w = width / 2, d = depth / 2, b = bevel;
    const corners = [[-w+b,-d],[w-b,-d],[w,-d+b],[w,d-b],[w-b,d],[-w+b,d],[-w,d-b],[-w,-d+b]];
    const ring = y => corners.map(([x,z]) => [x,y,z]);
    const low = ring(bottom), high = ring(top);
    for (let i=0; i<8; i++) {
      const j = (i+1)%8;
      face([low[i],low[j],high[j],high[i]],edges,0,.40);
    }
    face(high,lid,0,.55);
  }
  const deckBase = part(() => {
    slab(1.37,1.82,0,.09,.14,"39271c","7c5730");
    slab(1.29,1.73,.09,.125,.10,"ad814a","373a31");
  });
  const leaves = Array.from({length: 7}, () => part(() => {
    slab(1.13,1.56,0,.052,.07,"c7a87a","caaa73");
    slab(1.05,1.48,.052,.062,.05,"68513a","304740");
    const y = .066;
    for (let i=0;i<8;i++) {
      const a = Math.PI*i/4;
      const point = (angle,rx,rz) => [rx*Math.cos(angle),y,rz*Math.sin(angle)];
      const tip = i%2 ? .22 : .36;
      face([[0,y,0],point(a-Math.PI/8,.155,.205),point(a,tip,tip*1.3)],"dab778",0,.82);
      face([[0,y,0],point(a,tip,tip*1.3),point(a+Math.PI/8,.155,.205)],"a98556",0,.65);
    }
  }));
  const bellBase = part(() => {
    turned(0,0,[[0,.62],[.06,.71],[.15,.72],[.22,.63]],12,"754334",.34);
    turned(0,0,[[.16,.70],[.19,.71],[.21,.65]],12,"bc9155",.52);
    turned(0,0,[[.22,.57],[.32,.55],[.35,.47]],12,"503b28",.32);
  });
  const dome = part(() => {
    turned(0,0,[[.29,.57],[.34,.59],[.40,.54],[.53,.48],[.65,.36],[.73,.21],[.75,.08]],12,"c69956",.22);
    turned(0,0,[[.32,.59],[.35,.61],[.38,.56]],12,"d1aa6e",.46);
  });
  const plunger = part(() => {
    turned(0,0,[[.735,.055],[.89,.055]],8,"725934",.46);
    turned(0,0,[[.86,.10],[.89,.16],[.95,.16],[.98,.09]],8,"e0be7b",.50);
  });
  const props = { deckBase, leaves, bellBase, dome, plunger };
  const shadowStart=vertices.length;
  for (const [radius,color,height] of [[.94,"473022",1.534],[.66,"362820",1.536]]) {
    const rim=Array.from({length:14},(_,i)=>{
      const angle=i*Math.PI/7;
      return [radius*Math.cos(angle),height,-1.17+radius*.45*Math.sin(angle)];
    });
    face(rim,color,0,.40);
  }
  const ghostStart=vertices.length;
  // Local paper coordinates. The seam down either side folds back to a closed rear shell.
  const outline=[[0,1.83,0],[-.64,1.38,.05],[-.94,.08,.02],[-.48,.30,.11],
    [-.22,0,.18],[0,.26,.25],[.23,0,.18],[.49,.30,.11],[.94,.08,.02],[.64,1.38,.05]];
  const inset=[[0,1.78,.32],[-.54,1.33,.32],[-.72,.22,.32],[-.47,.39,.32],
    [-.22,.025,.32],[0,.31,.32],[.23,.025,.32],[.47,.39,.32],[.72,.22,.32],[.54,1.33,.32]];
  const paper=(points,color)=>face(points,color,4,.77);
  for(let i=0;i<outline.length;i++) {
    const k=(i+1)%outline.length;
    paper([[0,.89,.32],inset[i],inset[k]],"f0dfbc");
    paper([inset[i],outline[i],outline[k],inset[k]],["d4c4a6","b8a98b","9d917c","d2be98","bba98c","d2be98","dbc69e","c2ad89","d6bf9a","eddbb7"][i]);
    paper([outline[i],[0,.95,-.49],outline[k]],"ac987a");
  }
  for(const sign of [-1,1]){
    const arm=[ [.68,.83,.05],[.97,1.05,-.01],[1.24,.71,.13],[.84,.64,.20],[.98,.78,.31] ]
      .map(([x,y,z])=>[x*sign,y,z]);
    for(const [i,j,k,c] of [[0,1,4,"f3e1bd"],[1,2,4,"e2cdab"],[2,3,4,"c6b28d"],[3,0,4,"d9c5a2"],[0,3,2,"927f67"],[0,2,1,"bfa889"]]) paper([arm[i],arm[j],arm[k]],c);
    const eye=[ [.13,.99],[.22,1.09],[.40,1.21],[.39,1.15],[.49,1.19],[.45,1.12],[.51,1.14],[.23,.97],[.28,1.03] ]
      .map(([x,y])=>[sign*x,y,.331]);
    for(let j=1;j<eye.length-1;j++) paper([eye[0],eye[j],eye[j+1]],"26241d");
  }
  // A tapered ribbon forms the smile across the flat front panel.
  for(let i=0;i<10;i++){
    function lip(t,lower) {
      const arch=Math.sin(t*Math.PI);
      return [(t-.5)*.47,.875-.095*arch-(lower ? .11*arch+.012 : 0),.332];
    }
    paper([lip(i/10,false),lip((i+1)/10,false),lip((i+1)/10,true),lip(i/10,true)],"29251e");
  }
  return {vertices:new Float32Array(vertices),props,flames,clusterStart,clusterEnd,shadowStart,ghostStart};
};
