/* All dimensions are in room space. +Y is up, and +Z points toward the visitor. */
window.buildCabinMesh = function buildCabinMesh(room="cabin") {
  const castle=room==="castle";
  const vertices = [];
  const palette = new Map();
  const wicks = [];
  const clusterOrigin={x:-2.48,z:-.55}, singleCandle={x:2.15,z:.68};
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
      // Silver uses this space for its facet normal until the renderer computes its reflections.
      if(grain===-5) return [x,y,z,nx/length,ny/length,nz/length,grain];
      const distance = Math.min((x-clusterOrigin.x)**2+(y-2.7)**2+(z-clusterOrigin.z)**2,
        (x-singleCandle.x)**2+(y-2.41)**2+(z-singleCandle.z)**2);
      const amber = (1-emission) * .67 / (1+distance*.19);
      return [x,y,z, Math.min(1,r/255*(shade+amber*(castle ? .38 : 1))), Math.min(1,g/255*(shade+amber*(castle ? 1 : .70))),
        Math.min(1,b/255*(shade+amber*(castle ? .88 : .30))),grain];
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
  function turned(x,z,levels,sides,paint,emission=0,rotation=.21,material=0) {
    const rings=levels.map(([y,r,dx=0])=>Array.from({length:sides},(_,i)=>{
      const a=rotation+2*Math.PI*i/sides;
      return [x+dx+r*Math.cos(a),y,z+r*Math.sin(a)];
    }));
    for (let j=1;j<rings.length;j++) for (let i=0;i<sides;i++) {
      const k=(i+1)%sides;
      face([rings[j-1][i],rings[j][i],rings[j][k],rings[j-1][k]],paint,material,emission);
    }
    face(rings.at(-1).slice().reverse(),paint,material,emission);
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
  face([[-60,-20,-32],[60,-20,-32],[60,30,-32],[-60,30,-32]],castle ? "382532" : "233b3c",0,1);
  const moon = Array.from({length:14},(_,i)=>{
    const a=i*2*Math.PI/14; return [15.9+1.02*Math.cos(a),7.78+1.02*Math.sin(a),-26];
  });
  const moonDisc=part(()=>face(moon,castle ? "945553" : "a6ad94",0,1));
  const clouds=[];
  // Bound the sightlines through the rear opening for the full eye travel, including camera shake.
  // Projection of an axis-aligned tree box onto the wall reaches its extrema at these endpoints.
  function visibleThroughWindow(x,z,radius,bottom,top){
    let left=Infinity,right=-Infinity,low=Infinity,high=-Infinity;
    for(const eyeZ of [7.31,7.47]) for(const depth of [z-radius,z+radius]){
      const t=(eyeZ+5.78)/(eyeZ-depth);
      left=Math.min(left,-.91*(1-t)+(x-radius)*t);
      right=Math.max(right,.91*(1-t)+(x+radius)*t);
      low=Math.min(low,3.20*(1-t)+bottom*t);
      high=Math.max(high,3.86*(1-t)+top*t);
    }
    return right>=2.0 && left<=7.71 && high>=1.86 && low<=6.16;
  }
  if(!castle) for (const [z,count,tint,scale] of [[-22,31,"304f51",1.18],[-14.2,24,"254b48",1],[-8.1,18,"1a3530",.76]]) {
    for (let i=0;i<count;i++) {
      const x=(i-count/2)*1.54+(random()-.5)*.65, h=(4.9+random()*3.35)*scale;
      const base=-1.3, spread=(1+random()*.43)*scale;
      const visible=visibleThroughWindow(x,z,spread+.15,base,base+h);
      for(let j=0;j<3;j++){
        const y=base+h*(.13+j*.22), rad=spread*(1-j*.23);
        const treeZ=z+random()*.15;
        if(visible) turned(x,treeZ,[[y,rad],[y+h*(.47-j*.045),.018]],5,tint,.58);
      }
    }
  }
  if(castle){
    // Distant battlements break the horizon above three overlapping banks of mist.
    for(const [x,y,w] of [[9,5.0,.85],[11.4,5.75,1.12],[18.7,5.05,.85]]){
      turned(x,-24,[[y-3,w*.52],[y,w*.52],[y+.10,w*.65],[y+.24,w*.63]],8,"4a3644",.65);
      turned(x,-24,[[y+.24,w*.70],[y+1.16,.09],[y+1.48,.015]],8,"332a38",.70);
      box(x,y-.27,-24+w*.51,.10,.37,.04,"ae745e");
    }
    for(const [layer,z,y,paint,crest] of [[0,-22,4.1,"593843","68434b"],[1,-16,3.25,"65414b","794e53"],[2,-10,2.42,"412f3c","593c46"]]){
      clouds.push(part(()=>{
        // The profile repeats every ten units, so each bank can travel continuously.
        const edge=x=>{
          const a=x*2*Math.PI/10;
          return y+.34*Math.sin(a+layer)+.16*Math.cos(2*a-layer)+.09*Math.sin(3*a+.6*layer);
        };
        for(let x=-10;x<28;x+=.5){
          const a=edge(x), b=edge(x+.5);
          face([[x,-4,z],[x+.5,-4,z],[x+.5,b,z],[x,a,z]],paint,0,1);
          face([[x,a,z],[x+.5,b,z],[x+.5,b+.06,z],[x,a+.06,z]],crest,0,1);
        }
      }));
    }
  }
  // Negative material tags identify scenery and features with their own night light.
  for (let i=6;i<vertices.length;i+=7) vertices[i]=-1;
  const wood=["523321","483022","533726","493123","583d2a","4d3425"];
  if(!castle){
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
  }else{
    const stones=["516869","657c78","546f71","6c827a","597473","617e7b"];
    box(-5,3.55,-5.91,14,9,.3,"334d50");
    box(10,3.55,-5.91,4.6,9,.3,"334d50");
    box(4.85,.62,-5.91,5.76,2.52,.3,"334d50");
    box(4.85,7.53,-5.91,5.76,1.56,.3,"334d50");
    for(let row=0;row<13;row++){
      const lower=-.74+row*.75, upper=lower+.73;
      for(let x=-13+(row%2)*.87;x<12;x+=1.74){
        const spans=upper<=1.87 || lower>=6.75 ? [[-12,12]] : [[-12,1.98],[7.72,12]];
        for(const [lo,hi] of spans){
          const a=Math.max(x,lo),b=Math.min(x+1.71,hi);
          if(b>a+.04){
            const paint=stones[Math.floor(random()*stones.length)];
            box((a+b)/2,(lower+upper)/2,-5.64,b-a,.73,.25,paint,3.75);
            face([[a,upper,-5.505],[b,upper,-5.505],[b-.025,upper-.032,-5.493],[a+.024,upper-.026,-5.493]],paint,3.75,.41);
          }
        }
      }
    }
    for(const side of [-1,1]){
      box(side*8.8,3.5,0,.45,8.5,13,"496366");
      for(const z of [-3.3,.4,4]) box(side*8.52,3.4,z,.52,8.2,.65,"73857e");
    }
    box(0,-.60,0,23,.22,14,"465556");
    box(0,7.26,0,22,.3,14,"354e55");
    // Recessed arch with individual wedge stones, a raised keystone and a deep inner reveal.
    const arch=(a,r,z)=>[4.85+r*Math.cos(a),3.91+r*.88*Math.sin(a),z];
    for(let i=0;i<15;i++){
      const a=i*Math.PI/15,b=(i+1)*Math.PI/15,outer=i===7 ? 3.34 : 3.14;
      const p=arch(a,2.82,-5.62),q=arch(b,2.82,-5.62);
      face([p,q,[q[0],6.81,-5.62],[p[0],6.81,-5.62]],"536c6c");
      face([arch(a,2.82,-5.65),arch(b,2.82,-5.65),arch(b,2.82,-5.17),arch(a,2.82,-5.17)],"718780");
      face([arch(a+.005,2.82,-5.17),arch(b-.005,2.82,-5.17),arch(b-.005,outer,-5.17),arch(a+.005,outer,-5.17)],i===7?"afbaa5":stones[(i+2)%6],0,.34);
    }
    for(const x of [1.87,7.83,-.65,-7.9]){
      box(x,2.8,-5.37,.48,5.8,.48,"657c78");
      for(const [y,w,h] of [[1.0,.59,.15],[3.90,.68,.19],[4.06,.57,.12]]) box(x,y,-5.35,w,h,.60,"9ba99a");
    }
    box(4.86,1.86,-5.13,6.38,.26,.85,"91a196");
    // A split-tail woven hanging and moon embroidery, beside the mirror.
    {
      const x=-.02;
      box(x,5.65,-5.23,1.23,.075,.08,"b7a878");
      face([[x-.52,5.59,-5.24],[x+.52,5.59,-5.24],[x+.52,3.65,-5.24],[x,3.24,-5.24],[x-.52,3.65,-5.24]],"275d5c",0,.30);
      for(const side of [-1,1]) box(x+side*.46,4.66,-5.20,.028,1.8,.03,"a49368");
      const stitch=(dx,y)=>[x+dx,y,-5.18];
      face([stitch(0,5.15),stitch(.19,4.73),stitch(0,4.33),stitch(-.19,4.73)],"b4ae88",0,.64);
      face([stitch(0,5.02),stitch(.105,4.73),stitch(0,4.46),stitch(-.105,4.73)],"365f60",0,.34);
    }
  }
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
  const firstBoardZ=-1.55, boardDepth=.793, boardY=1.39, boardHeight=.28;
  const tableRearEdge=[-1,1].map(x=>[x,boardY+boardHeight/2,firstBoardZ-boardDepth/2]);
  for(let i=0;i<10;i++){
    const z=firstBoardZ+i*.80;
    const boards=castle ? ["446465","496b68","436464","506e69","466864"] : ["855a37","93613b","805436","936840","855c3b"];
    box(0,boardY,z,16.8,boardHeight,castle ? .799 : boardDepth,boards[i%5],castle ? 3.75 : 1);
  }
  box(0,1.19,-1.98,16.8,.25,.14,"4c3021",1);
  // Faded brass-coloured lines follow the boards, in the same depth pass as the props.
  function tableLine(x1,z1,x2,z2,width=.048) {
    x1*=.83; x2*=.83;
    z1=.04+.78*z1; z2=.04+.78*z2;
    const dx=x2-x1, dz=z2-z1, k=width/(2*Math.hypot(dx,dz));
    const ox=-dz*k, oz=dx*k, y=1.539;
    face([[x1+ox,y,z1+oz],[x2+ox,y,z2+oz],[x2-ox,y,z2-oz],[x1-ox,y,z1-oz]],"b08a60",1);
  }
  // A single row spans the clear space between the dealer and the hand.
  const playerSlots = [];
  const far = -.30, near = 2.31, halfWidth = .56;
  for (const x of [-1.43, 0, 1.43]) {
    for (const side of [-1, 1]) {
      const edge = x + side * halfWidth;
      tableLine(edge, far + .10, edge, near - .10, .057);
      for (const z of [far, near]) tableLine(x + side * .10, z, edge - side * .055, z, .08);
    }
    playerSlots.push([[x-halfWidth,far],[x+halfWidth,far],[x+halfWidth,near],[x-halfWidth,near]]
      .map(([u,v]) => [.83*u, 1.545, .04+.78*v]));
  }
  const dividerZ = near + .22;
  for (const side of [-1, 1]) {
    tableLine(side*.20, dividerZ, side*2.11, dividerZ, .032);
    tableLine(0, dividerZ-.095, side*.12, dividerZ, .031);
    tableLine(side*.12, dividerZ, 0, dividerZ+.095, .031);
  }
  function book(x,y,z,w,d,h,yaw,color) {
    box(x,y+.034,z,w,.068,d,color,0,yaw);
    box(x,y+h/2,z,w*.966,h-.09,d*.945,"c1a479",0,yaw);
    box(x,y+h-.034,z,w,.068,d,color,0,yaw);
    const ox=-d*.48*Math.sin(yaw), oz=-d*.48*Math.cos(yaw);
    box(x+ox,y+h/2,z+oz,w,h,.07,color,0,yaw);
  }
  book(-5.46,1.53,.48,1.30,.81,.18,-.15,"784932");
  book(-5.40,1.71,.48,1.14,.76,.16,.08,"5a6750");
  // Leave bare tabletop between the books, the ink bottle behind them and the player.
  const inkX=-5.58, inkZ=-.74;
  const inkFoot=Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4;
    return [inkX+.025+.19*Math.cos(a),1.533,inkZ+.02+.16*Math.sin(a)];
  });
  face(inkFoot,"523a28",1);
  bottle(inkX,1.534,inkZ,.44,"375e55");
  function silverTray(x,base,z,radius) {
    const floor=base+.040;
    const footprint=Array.from({length:24},(_,i)=>{
      const angle=.21+i*Math.PI/12;
      return [radius*.92*Math.cos(angle),radius*.92*Math.sin(angle)];
    });
    const shadow=contactShadow(footprint,-.035*radius,.055*radius,x,base,z);
    const profile=castle ? [[base,radius*.68],[base+.024,radius*.73],[base+.043,radius*.90],[base+.09,radius],[base+.105,radius*.98],[base+.098,radius*.91],[floor,radius*.79],[floor,radius*.36]] : [[base,radius*.68],[base+.017,radius*.74],
      [base+.050,radius*.98],[base+.067,radius],[base+.082,radius*.985],
      [base+.084,radius*.94],[floor,radius*.78],[floor,radius*.36]];
    const geometry=part(()=>turned(x,z,profile,castle ? 12 : 24,"aeb5ba",0,.21,-5));
    return {...geometry,radius,floor,shadow};
  }
  function candle(x,z,r,h,tray) {
    const y=tray.floor;
    const waxStart=vertices.length;
    turned(x,z,[[y,r*1.23],[y+.08,r*1.17],[y+.13,r],[y+h-.07,r],[y+h,r*.85]],castle ? 10 : 8,castle ? "b3cab1" : "c29658");
    // Small separate wax ridges hang down over the faceted front.
    for(const [offset,drop] of [[-.38,.21],[.43,.13]]) {
      const ridge=r*.13, front=z+r*.86;
      turned(x+offset*r,front,[[y+h-drop,ridge*.42],[y+h-drop+.045,ridge],[y+h-.028,ridge]],5,castle ? "d4d6bb" : "d0a665");
    }
    turned(x,z,[[y+h-.01,r*.73],[y+h+.004,r*.65]],8,"aa804b");
    turned(x,z,[[y+h,.027],[y+h+.085,.018]],5,"35251c");
    for(let i=waxStart+6;i<vertices.length;i+=7) vertices[i]=-4;
    wicks.push({x,y:y+h,z,r,h,tray,waxStart,waxEnd:vertices.length});
  }
  const clusterStart=vertices.length;
  const sharedTray=silverTray(clusterOrigin.x,1.53,clusterOrigin.z,.72);
  candle(clusterOrigin.x-.02,clusterOrigin.z-.17,.110,.79,sharedTray);
  candle(clusterOrigin.x+.26,clusterOrigin.z+.15,.098,.55,sharedTray);
  candle(clusterOrigin.x-.26,clusterOrigin.z+.21,.079,.31,sharedTray);
  const clusterEnd=vertices.length;
  const tableTray=silverTray(singleCandle.x,1.53,singleCandle.z,.36);
  candle(singleCandle.x,singleCandle.z,.113,.61,tableTray);
  const windowTray=silverTray(5.54,1.99,-5.09,.32);
  candle(5.54,-5.09,.120,.66,windowTray);
  // Put moving geometry together so the room stays in its static vertex buffer.
  const flames = wicks.map((wick, index) => {
    const {x,y,z,r}=wick;
    const start=vertices.length;
    const flameHeight=.32+r;
    turned(x,z,[[y+.063,r*.15],[y+.105,r*.43],[y+.17,r*.62],[y+.25,r*.45],[y+.32,r*.22],[y+flameHeight,.003]],7,"ffffff",1,.21,-3);
    // A luminous belly and a coloured envelope on the same surface also read at low resolution.
    const base=castle ? [.12,.55,.66] : [.88,.37,.09];
    const edge=castle ? [.18,.90,.76] : [1,.61,.15];
    const core=castle ? [.84,1,.94] : [1,.96,.74];
    for(let i=start;i<vertices.length;i+=7){
      const dy=vertices[i+1]-y;
      const blend=Math.min(1,Math.max(0,(dy-.063)/.10));
      const hot=Math.max(0,1-Math.abs(dy-.18)/.17)*Math.max(0,Math.min(1,.55+(vertices[i+2]-z)/r));
      for(let c=0;c<3;c++){
        const tint=base[c]+(edge[c]-base[c])*blend;
        vertices[i+3+c]=tint+(core[c]-tint)*hot;
      }
    }
    return {...wick,flameHeight,phase:index*2.13,start,end:vertices.length};
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
  // Thin translucent footprints let the table grain show through the candle shadows.
  function contactShadow(outline, dx, dz, originX=0, base=0, originZ=0) {
    return part(() => {
      for(const [size,offset,y,opacity] of [[1.13,1,.002,.24],[1.03,.30,.004,.39]]) {
        const rim=outline.map(([x,z])=>[originX+x*size+dx*offset,base+y,originZ+z*size+dz*offset]);
        face(rim,"100b07",5+opacity,1);
      }
    });
  }
  const deckShadow=contactShadow([[-.57,-.91],[.57,-.91],[.69,-.79],[.69,.79],[.57,.91],[-.57,.91],[-.69,.79],[-.69,-.79]],-.18,.09);
  const bellShadow=contactShadow(Array.from({length:14},(_,i)=>{
    const a=i*Math.PI/7; return [.71*Math.cos(a),.71*Math.sin(a)];
  }),.21,.23);
  const watchShadow=contactShadow(Array.from({length:24},(_,i)=>{
    const a=i*Math.PI/12; return [.54*Math.cos(a),.54*Math.sin(a)];
  }),-.07,.045);
  const deckBase = part(() => {
    if(castle) slab(1.46,1.91,0,.065,.22,"526b67","b3ad86");
    slab(1.37,1.82,0,.09,.14,"39271c","7c5730");
    slab(1.29,1.73,.09,.125,.10,"ad814a","373a31");
  });
  // The visible stack tops out at ten layers. The deck still holds every project.
  const leaves = Array.from({length: 10}, () => part(() => {
    slab(1.13,1.56,0,.052,.07,"c7a87a","caaa73");
    slab(1.05,1.48,.052,.062,.05,"68513a","304740");
    const y = .066;
    // Corner rules leave the dark cloth and compass readable from the player's angle.
    for(const sx of [-1,1]) for(const sz of [-1,1]) {
      const ink=(x,z)=>[sx*x,y,sz*z];
      face([ink(.44,.63),ink(.44,.40),ink(.42,.41),ink(.42,.61)],"c3a46c",0,.72);
      face([ink(.44,.63),ink(.21,.63),ink(.22,.61),ink(.42,.61)],"c3a46c",0,.72);
    }
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
    if(castle) turned(0,0,[[.32,.65],[.38,.61],[.47,.55]],8,"90b6a7",.55);
    turned(0,0,[[.29,.57],[.34,.59],[.40,.54],[.53,.48],[.65,.36],[.73,.21],[.75,.08]],12,"c69956",.22);
    turned(0,0,[[.32,.59],[.35,.61],[.38,.56]],12,"d1aa6e",.46);
  });
  const plunger = part(() => {
    turned(0,0,[[.735,.073],[.89,.073]],8,"b38b51",.5);
    turned(0,0,[[.86,.10],[.89,.16],[.95,.16],[.98,.09]],8,"e0be7b",.50);
  });
  // Pocket watch face lies in the local XZ plane; twelve o'clock points toward -Z.
  const watchCase=part(()=>{
    if(castle) turned(0,0,[[.03,.58],[.12,.58],[.15,.52]],8,"829e92",.48);
    turned(0,0,[[0,.46],[.04,.54],[.11,.56],[.165,.52],[.17,.48]],24,"ba8d48",.56);
    turned(0,0,[[.171,.47],[.178,.455]],24,"f0ddaf",.80);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6, major=i%3===0;
      box(.384*Math.sin(a),.186,-.384*Math.cos(a),major?.034:.021,.012,major?.085:.048,"4d3926",0,-a);
    }
    // Ridged winding crown and a hollow bow with an actual opening.
    box(0,.085,-.55,.085,.075,.15,"976733");
    box(0,.09,-.625,.18,.12,.09,"d3ae67");
    for(let i=0;i<14;i++){
      const a=i*2*Math.PI/14, b=(i+1)*2*Math.PI/14;
      const point=(angle,r,y)=>[r*Math.cos(angle),y,-.75+r*Math.sin(angle)];
      const rim=(r,y)=>[point(a,r,y),point(b,r,y)];
      const [outerA,outerB]=rim(.145,.106), [innerA,innerB]=rim(.105,.106);
      face([outerA,outerB,innerB,innerA],"e0bf78",0,.7);
      face([outerB,outerA,...rim(.145,.066)],"a17541",0,.5);
      face([innerA,innerB,...rim(.105,.066).reverse()],"886038",0,.5);
    }
    box(-.095,.201,-.075,.047,.016,.275,"3a302a",0,.90);
  });
  const watchHand=part(()=>{
    face([[-.025,.217,.066],[-.021,.217,-.22],[0,.217,-.34],[.021,.217,-.22],[.025,.217,.066]],"3d342b",0,.57);
    turned(0,0,[[.22,.044],[.246,.033]],8,"946430",.6);
  });
  const gramShadow=contactShadow([[-.55,-.41],[.55,-.41],[.55,.41],[-.55,.41]],-.12,.08);
  const gramHit=[];
  const hornMouth=[.19,1.34,.10];
  const gramBase=part(()=>{
    slab(1.24,1.01,.02,.11,.09,"4c3327","81593b");
    slab(1.16,.94,.11,.30,.055,"684534","886344");
    slab(1.22,.99,.30,.35,.07,"a4814d","534735");
    // A brass bezel with a recessed, dark bed on the audience-facing panel.
    box(0,.205,.475,1.01,.186,.016,"8d7145");
    box(0,.205,.486,.961,.157,.012,"29231c");
    turned(-.44,-.29,[[.35,.105],[.41,.11],[.45,.073],[.87,.064]],8,"a78149",.31);
    // An open, scalloped horn: its throat and widening inner facets are visible from the table.
    const rings=[[-.44,.81,-.29,.066],[-.40,.94,-.26,.085],[-.31,1.02,-.20,.12],
      [-.17,1.10,-.12,.19],[.005,1.22,-.025,.32],[...hornMouth,.47]];
    const sides=castle ? 10 : 12;
    const ring=([x,y,z,r],inner,lip)=>Array.from({length:sides},(_,i)=>{
      const a=i*Math.PI*2/sides, scallop=lip && i%2 ? (castle ? .78 : .94) : 1;
      const u=r*Math.cos(a)*inner*scallop,v=r*Math.sin(a)*inner*scallop;
      return [x+.73*u-.32*v,y+.89*v,z-.68*u-.34*v];
    });
    const outer=rings.map((s,i)=>ring(s,1,i===rings.length-1));
    const inner=rings.map((s,i)=>ring(s,.93,i===rings.length-1));
    gramHit.push(...outer[0],...outer.at(-1));
    for(const x of [-.59,.59]) for(const z of [-.47,.47]) {
      gramHit.push([x,.02,z],[x,.35,z]);
    }
    for(let j=1;j<rings.length;j++) for(let i=0;i<sides;i++){
      const k=(i+1)%sides;
      face([outer[j-1][i],outer[j][i],outer[j][k],outer[j-1][k]],castle ? (i%2 ? "73988c":"99b6a1") : i%3===0?"bd9858":"987540",0,.27);
      face([inner[j-1][k],inner[j][k],inner[j][i],inner[j-1][i]],j<3?"4c3522":i%2?"a47e43":"8c693a",0,.19);
      if(j===rings.length-1) face([outer[j][i],inner[j][i],inner[j][k],outer[j][k]],"d1ae6d",0,.48);
    }
    face(inner[0],"282219");
    turned(.41,-.28,[[.35,.07],[.55,.055]],8,"9e7c4c");
    box(.35,.545,-.08,.045,.04,.43,"b09461",0,-.28);
    box(.29,.51,.12,.082,.075,.075,"a98e60");
  });
  const reedFootY=.138;
  const gramReeds=Array.from({length:7},(_,band)=>part(()=>{
    const x=(band-3)*.13;
    const strip=(halfWidth,low,high,z,paint,shine)=>face([
      [x-halfWidth,low,z],[x+halfWidth,low,z],[x+halfWidth,high,z],[x-halfWidth,high,z]
    ],paint,0,shine);
    strip(.040,reedFootY,reedFootY+.130,.496,"bb965d",.55);
    strip(.040,reedFootY+.104,reedFootY+.130,.497,"e1bc76",.72);
  }));
  const gramRecord=part(()=>{
    turned(0,0,[[.355,.425],[.375,.44],[.396,.435]],24,"292a28",.36);
    turned(0,0,[[.397,.135],[.403,.135]],16,"a17442",.43);
    turned(0,0,[[.405,.025],[.443,.016]],8,"bbac84",.47);
    // Uneven arc lengths and a paper label mark make slow rotation readable at pixel scale.
    for(const [r,a,arc] of [[.39,.2,1.0],[.31,.46,.73],[.36,3.5,.54]]){
      for(let n=0;n<5;n++){
        const p=(radius,t)=>[radius*Math.cos(t),.398,radius*Math.sin(t)];
        const t=a+n*arc/5,u=t+arc/5;
        face([p(r,t),p(r,u),p(r-.012,u),p(r-.012,t)],"6b6759",0,.46);
      }
    }
    box(.072,.407,.02,.058,.006,.025,"e0c48a");
  });
  // Stretch only the cabinet's middle course; everything above its lip moves up intact.
  function cabinetY(y){
    return y+.5*Math.max(0,Math.min(.30,y)-.11);
  }
  for(let i=gramBase.start+1;i<gramRecord.end;i+=7) vertices[i]=cabinetY(vertices[i]);
  for(const point of gramHit) point[1]=cabinetY(point[1]);
  hornMouth[1]=cabinetY(hornMouth[1]);
  const reedFoot=cabinetY(reedFootY);
  // From the right edge, the open shelf faces across the table. The backboard and feet
  // extend behind the books; the low lip leaves a clear path to pull a volume out.
  const {bloodborne,nightreign}=window.portfolioBookPrints;
  const bindings=[
    {width:.20,height:1.44,color:"526e63",label:"青绿色布面书"},
    {width:.23,height:1.29,color:"874e45",label:"酒红色皮面书",print:bloodborne,musicBook:"portfolio-red-book-click"},
    {width:.17,height:1.12,color:"566477",label:"灰蓝色小册",print:nightreign,musicBook:"portfolio-blue-book-click"}
  ];
  const bookGap=.13;
  const rowWidth=bindings.reduce((sum,book)=>sum+book.width,0)+bookGap*(bindings.length-1);
  const bookend=rowWidth/2+.15;
  const shelfWidth=2*bookend+.18;
  // The upright cheeks sit just outside the red and blue covers. Their bevel
  // and open front leave a strip of binding to catch with the pointer.
  const guards=bindings.map((book,i)=>{
    if(i===0) return null;
    const edge=rowWidth/2-bindings.slice(i+1).reduce((sum,b)=>sum+b.width+bookGap,0);
    const x=edge+.026, h=i===2 ? .84 : .75, back=-.54, front=.43;
    const profile=[[.18,back],[h+.18,back],[h+.18,front-.13],[h+.08,front],[.18,front]];
    return [x,x+.052].map(px=>profile.map(([y,z])=>[px,y,z]));
  });
  const shelf=part(()=>{
    if(castle) for(const side of [-1,1]){
      const x=side*(shelfWidth/2-.07);
      turned(x,-.80,[[.15,.09],[1.50,.064],[1.59,.10],[1.72,.012]],6,"9da994",.45);
    }
    box(0,.09,-.12,shelfWidth,.18,1.65,"745039",1);
    box(0,.145,.708,shelfWidth+.02,.055,.035,"b08a5a",1);
    box(0,.83,-.85,shelfWidth-.06,1.46,.13,"664838",1);
    box(0,1.57,-.85,shelfWidth+.01,.075,.18,"986e49",1);
    for(const guard of guards.filter(Boolean)){
      const [inside,outside]=guard;
      face(inside,"695039",2);
      face([...outside].reverse(),"896448",2);
      for(let i=0;i<inside.length;i++){
        const j=(i+1)%inside.length;
        face([inside[i],inside[j],outside[j],outside[i]],i===1||i===2 ? "b58b5b" : "715039",1);
      }
    }
  });
  let bookLeft=-rowWidth/2;
  const books=bindings.map(({width,height,color,label,musicBook,print},index)=>{
    const offset=bookLeft+width/2;
    bookLeft+=width+bookGap;
    const depth=1.05, front=depth/2, foil="d5b47b";
    const geometry=part(()=>{
      box(0,height/2,-.02,width-.032,height-.06,depth-.09,"cfb992");
      for(const side of [-1,1]) box(side*(width/2-.009),height/2,0,.018,height,depth,color);
      box(0,height/2,front-.035,width,height,.07,color);
      if(castle) for(const level of [.07,.93]) box(0,height*level,front,width*.99,.07,.105,"a5ab8e");
      for(const level of [.12,.19,.80,.85]){
        box(0,height*level,front+.002,width*.88,.018,.013,foil);
      }
      const y=height*.54, z=front+.014, r=width*.24;
      const points=Array.from({length:index%2 ? 4 : 8},(_,i)=>{
        const a=2*Math.PI*i/(index%2 ? 4 : 8), radius=i%2 && !(index%2) ? r*.46 : r;
        return [radius*Math.sin(a),y+radius*1.35*Math.cos(a),z];
      });
      face(points,foil,0,.42);
      box(0,height*.39,z,width*.43,.014,.012,foil);
      // Pressed border on the broad cover becomes visible as the book tilts out.
      const coverX=width/2+.002, frameHalfHeight=height*.415, frameStroke=.018;
      for(const edge of [-1,1]){
        box(coverX,height/2,edge*depth*.40,.008,height*.83,.018,"ae9168");
        box(coverX,height/2+edge*frameHalfHeight,0,.008,frameStroke,depth*.80,"ae9168");
      }
      if(print){
        // Paint on the outward (+X) leather board. Local +Z points to the viewer's left.
        const pixel=depth*.76/64, surface=width/2+.0035, middle=height*.50;
        for(const [col,row,cols,rows] of print.rectangles){
          const left=(32-col)*pixel, right=left-cols*pixel;
          // Extend the solid sky to the inside of this cover’s top rail.
          const top=row===0 ? middle+frameHalfHeight-frameStroke/2 : middle+(32-row)*pixel;
          const bottom=middle+(32-row-rows)*pixel;
          face([[surface,top,left],[surface,bottom,left],[surface,bottom,right],[surface,top,right]],print.ink);
        }
      }
    });
    return {...geometry,offset,width,height,depth,label,musicBook,guard:guards[index]?.flat()};
  });
  // A pinned cord and stepped brass bezel stand proud of the back wall.
  const mirrorX=-2.62, mirrorY=3.90, mirrorZ=-5.36;
  const mirrorWidth=.78;
  const mirrorPoint=([x,y],depth)=>[mirrorX+x*mirrorWidth,mirrorY+y,mirrorZ+depth];
  const octagon=[[-.36,.71],[.36,.71],[.65,.42],[.65,-.42],[.36,-.71],[-.36,-.71],[-.65,-.42],[-.65,.42]];
  const rim=(scale,depth)=>octagon.map(([x,y])=>mirrorPoint([x*scale,y*scale],depth));
  const mirror=part(()=>{
    beam(mirrorX-.35*mirrorWidth,mirrorY+.67,mirrorX,mirrorY+.96,mirrorZ+.052,.024,.020,"947451");
    beam(mirrorX,mirrorY+.96,mirrorX+.35*mirrorWidth,mirrorY+.67,mirrorZ+.052,.024,.020,"6b5940");
    box(mirrorX,mirrorY+.96,mirrorZ+.06,.078,.065,.050,"a07f50");
    const bevels=[rim(.97,.015),rim(1,.10),rim(.944,.15),rim(.883,.15),rim(.85,.105)];
    const brass=["665138","ba955a","927547","65523e"];
    for(let j=0;j<bevels.length-1;j++) for(let i=0;i<8;i++){
      const k=(i+1)%8;
      face([bevels[j][i],bevels[j][k],bevels[j+1][k],bevels[j+1][i]],brass[j],0,.18);
    }
    face(bevels.at(-1),"586765",0,.21);
    // Two silvery facets and a broken candle glint in smoked glass.
    const glass=(points,paint)=>face(points.map(p=>mirrorPoint(p,.111)),paint,0,.21);
    glass([[-.52,.31],[-.28,.57],[.14,.57],[-.52,-.15]],"687575");
    glass([[-.43,-.35],[.35,.50],[.40,.45],[-.40,-.39]],"60706e");
    glass([[-.24,-.33],[-.18,-.27],[-.15,-.34],[-.20,-.43]],"9a8967");
    glass([[-.22,-.46],[-.17,-.43],[-.18,-.49]],"7a7660");
  });
  const props = { tableRearEdge, playerSlots, mirror, mirrorRim:rim(1,.10), deckShadow, bellShadow, watchShadow, deckBase, leaves, bellBase, dome, plunger, watchCase, watchHand, gramShadow, gramBase, gramReeds, reedFoot, gramRecord, gramHit, hornMouth, shelf, books };
  const shadowStart=vertices.length;
  for (const [radius,color,height] of [[.78,"473022",1.534],[.52,"362820",1.536]]) {
    const rim=Array.from({length:14},(_,i)=>{
      const angle=i*Math.PI/7;
      return [radius*Math.cos(angle),height,-1.17+radius*.45*Math.sin(angle)];
    });
    face(rim,color,0,.40);
  }
  return {vertices:new Float32Array(vertices),props,flames,clusterOrigin,clusterStart,clusterEnd,shadowStart,moon,moonDisc,clouds};
};

// Map the flat artwork onto a perspective quadrilateral in the iframe viewport.
  window.fitCardPlane = function (corners, width, height) {
    const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = corners;
    const ax=x1-x2, ay=y1-y2, bx=x3-x2, by=y3-y2;
    const ex=x0-x1+x2-x3, ey=y0-y1+y2-y3;
    const determinant=ax*by-bx*ay;
    const g=Math.abs(determinant)>1e-6 ? (ex*by-bx*ey)/determinant : 0;
    const h=Math.abs(determinant)>1e-6 ? (ax*ey-ex*ay)/determinant : 0;
    return "matrix3d("+[
      (x1*(1+g)-x0)/width, (y1*(1+g)-y0)/width, 0, g/width,
      (x3*(1+h)-x0)/height, (y3*(1+h)-y0)/height, 0, h/height,
      0,0,1,0, x0,y0,0,1
    ].join(",")+")";
  };
