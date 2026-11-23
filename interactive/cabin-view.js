(async () => {
  const arena = document.getElementById("arena");
  if (!arena) return;
  const encounter=arena.querySelector(".encounter");
  const hemEdge=document.getElementById("dream-table-edge");
  const stage=arena.querySelector(".stage");
  let canvas = document.createElement("canvas");
  canvas.className = "cabin-view";
  canvas.setAttribute("aria-hidden", "true");
  arena.prepend(canvas);
  const roomKey=tableKey+":room";
  let room="cabin";
  try { if(resumeTable && sessionStorage.getItem(roomKey)==="castle") room="castle"; }
  catch { /* The room still switches without session storage. */ }
  let rest,props,flames,clusterOrigin,clusterStart,clusterEnd,shadowStart,moon,moonDisc,clouds;
  let mesh,movingVertices,windowVertices,vertexCount,objectIds,trays,projected;
  let geometry;
  function loadRoom(){
    const lowDetail=matchMedia("(pointer:coarse) and (max-width:1000px)").matches;
    ({vertices:rest,props,flames,clusterOrigin,clusterStart,clusterEnd,shadowStart,moon,moonDisc,clouds}=window.buildCabinMesh(room,lowDetail,bookPrints));
    mesh=rest.slice();
    movingVertices=mesh.subarray(clusterStart);
    windowVertices=mesh.subarray(moonDisc.start,clouds.at(-1)?.end ?? moonDisc.end);
    vertexCount=mesh.length/7;
    projected=new Float32Array(vertexCount*2);
    objectIds=new Uint8Array(vertexCount);
    trays=[...new Set(flames.map(f=>f.tray))];
    const silhouettes=[
      ...trays,...flames.map(f=>({start:f.waxStart,end:f.waxEnd})),
      {start:props.deckBase.start,end:props.leaves.at(-1).end},
      {start:props.bellBase.start,end:props.plunger.end},
      {start:props.watchCase.start,end:props.watchHand.end},
      {start:props.gramBase.start,end:props.gramRecord.end},
      props.shelf,...props.books
    ];
    silhouettes.forEach(({start,end},i)=>objectIds.fill(i+1,start/7,end/7));
    geometry={mesh,objectIds,vertexCount,room,moonDisc,windowVertices,clusterStart,movingVertices};
    try { sessionStorage.setItem(roomKey,room); } catch { /* Optional resume state. */ }
  }
  const bookPrints = await window.portfolioBookPrintsReady;
  loadRoom();
  const glows=flames.map(()=>{
    const glow=document.createElement("canvas");
    glow.width=96;glow.height=112;
    glow.className="candle-halo";
    glow.setAttribute("aria-hidden","true");
    arena.prepend(glow);
    return glow;
  });
  // The live halos and the outgoing photograph use the same transparent light sprites.
  function updateRoomLighting(){
    if(arena.dataset.room===room) return;
    const castle=room==="castle";
    for(const glow of glows){
      const ctx=glow.getContext("2d");
      const x=glow.width/2,y=glow.height/2;
      const gradient=ctx.createRadialGradient(x,y,0,x,y,Math.hypot(x,y));
      gradient.addColorStop(0,castle?"#b2ffe76b":"#ffcd7766");
      gradient.addColorStop(castle ? .23 : .22,castle?"#45deb943":"#fa963039");
      gradient.addColorStop(.50,castle?"#2997a51a":"#d5651412");
      gradient.addColorStop(.72,"transparent");
      ctx.clearRect(0,0,glow.width,glow.height);
      ctx.save();
      ctx.beginPath();ctx.ellipse(x,y,x,y,0,0,2*Math.PI);ctx.clip();
      ctx.fillStyle=gradient;ctx.fillRect(0,0,glow.width,glow.height);
      ctx.restore();
    }
    arena.dataset.room=room;
  }
  const lampData=new Float32Array(flames.length*4); // world-space xyz and current intensity
  const candleKey=tableKey+":candles";
  let candlesLit=flames.map(()=>true);
  function saveCandles(){
    try { sessionStorage.setItem(candleKey,JSON.stringify(candlesLit)); }
    catch { /* Keep the live controls usable when storage is unavailable. */ }
  }
  if(resumeTable){
    try {
      const saved=JSON.parse(sessionStorage.getItem(candleKey));
      if(Array.isArray(saved) && saved.length===flames.length && saved.every(on=>typeof on==="boolean")) candlesLit=saved;
    } catch { /* Older visits may have no saved lighting. */ }
  }else saveCandles();
  const brightness=candlesLit.map(Number);
  let roomLight=brightness.reduce((sum,n)=>sum+n,0)/brightness.length;
  let exteriorLight=1;
  document.documentElement.style.setProperty("--candle-light",roomLight.toFixed(3));
  // World X/Z, footprint radius, and intensity of the overhead selection light.
  const spotlight=new Float32Array([0,0,1,0]);
  const shaftAim=new Float32Array(3); // X/Z drift per unit height, and the height of the focal point.

  // The same perspective camera drives both renderers. Row 2 is positive camera depth.
  const eyeHeight=3.53, eyeZ=7.32, restPitch=-.137;
  const actorZ=-1.17, horizonY=1.66;
  const pitchSin=Math.sin(restPitch), pitchCos=Math.cos(restPitch);
  const backDepth=(horizonY-eyeHeight)*pitchSin-(actorZ-eyeZ)*pitchCos;
  const backUp=(horizonY-eyeHeight)*pitchCos+(actorZ-eyeZ)*pitchSin;
  const eye=new Float32Array(3);
  function cameraRows(x, y, kick, time) {
    const yaw = -.041*x + .013*kick*Math.sin(time*83);
    const pitch = restPitch - .031*y + .023*kick*Math.cos(time*72);
    const roll = .014*kick*Math.sin(time*66);
    eye.set([x*.76 + .15*kick*Math.cos(time*89), eyeHeight-y*.28 + .095*kick*Math.sin(time*97), eyeZ+.16*kick]);
    const sy=Math.sin(yaw), cy=Math.cos(yaw), sp=Math.sin(pitch), cp=Math.cos(pitch);
    const right=[cy,0,sy], up=[-sy*sp,cp,cy*sp], forward=[sy*cp,sp,-cy*cp];
    const cr=Math.cos(roll), sr=Math.sin(roll);
    const axes=[right.map((v,i)=>v*cr+up[i]*sr), up.map((v,i)=>v*cr-right[i]*sr), forward];
    return axes.map(axis=>[...axis,-axis.reduce((sum,v,i)=>sum+v*eye[i],0)]);
  }

  // Both renderers use the same ivory metal finish. Sample the cool window and the live
  // candle lights along the view ray reflected by each facet of the rolled rim and dish.
  function shadeSilverTrays(){
    for(const {start,end,floor} of trays){
      for(let i=start;i<end;i+=7){
        const x=mesh[i],y=mesh[i+1],z=mesh[i+2];
        const nx=rest[i+3],ny=rest[i+4],nz=rest[i+5];
        const vx=eye[0]-x,vy=eye[1]-y,vz=eye[2]-z;
        const invView=1/Math.hypot(vx,vy,vz);
        const twiceDot=2*(nx*vx+ny*vy+nz*vz);
        const rx=(twiceDot*nx-vx)*invView,ry=(twiceDot*ny-vy)*invView,rz=(twiceDot*nz-vz)*invView;
        const windowLight=Math.pow(Math.max(0,.38*rx+.32*ry-.87*rz),12);
        let glint=0, incident=0;
        for(let k=0;k<lampData.length;k+=4){
          const dx=lampData[k]-x,dy=lampData[k+1]-y,dz=lampData[k+2]-z;
          const distanceSquared=dx*dx+dy*dy+dz*dz;
          const invDistance=1/Math.sqrt(distanceSquared);
          const alignment=Math.max(0,(rx*dx+ry*dy+rz*dz)*invDistance);
          const facing=Math.max(0,(nx*dx+ny*dy+nz*dz)*invDistance);
          incident+=facing*lampData[k+3]/(.32+distanceSquared);
          glint+=Math.pow(alignment,12)*lampData[k+3]/(.68+distanceSquared);
        }
        // The matte ivory well catches local candlelight. The rolled edge keeps a little polish.
        const localLight=incident/(.75+incident);
        const diffuse=(.42+.22*Math.max(0,ny))*(.16+.34*roomLight+.50*localLight);
        const polish=rest[i+1]>floor+.020 ? 1 : .32;
        const reflection=polish*glint/(1+glint);
        if(room==="castle"){
          mesh[i+3]=.55*diffuse+.18*polish*windowLight+.28*reflection;
          mesh[i+4]=.78*diffuse+.29*polish*windowLight+.48*reflection;
          mesh[i+5]=.76*diffuse+.31*polish*windowLight+.44*reflection;
        }else{
          mesh[i+3]=238/255*diffuse+.044*polish*windowLight+.16*reflection;
          mesh[i+4]=217/255*diffuse+.047*polish*windowLight+.12*reflection;
          mesh[i+5]=159/255*diffuse+.054*polish*windowLight+.07*reflection;
        }
      }
    }
  }

  function gpuRenderer(gl) {
    function compile(type, source) {
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER, `attribute vec3 position,tint; attribute float grain,objectId;
uniform vec4 right,up,forward; uniform vec2 scale;
varying vec3 world,color; varying float material,id;
void main(){
 vec4 p=vec4(position,1.); float depth=dot(p,forward);
 gl_Position=vec4(dot(p,right)*scale.x,dot(p,up)*scale.y,1.0025*depth-.20025,depth);
 world=position; color=tint; material=grain; id=objectId;
}`);
    const fragment = compile(gl.FRAGMENT_SHADER, `precision mediump float;
varying vec3 world,color; varying float material;
uniform vec4 lamps[5];
uniform float roomLight;
uniform float exteriorLight;
uniform vec3 candleColor;
uniform vec4 spotlight;
uniform vec3 shaftAim;
uniform sampler2D visibility;
uniform vec2 texel;
bool outlinedBy(vec2 uv,vec2 center){
 vec2 neighbor=texture2D(visibility,uv).rg;
 return neighbor.r>0. && abs(neighbor.r-center.r)>.002 && neighbor.g>=center.g;
}
void main(){
 if(material>4.5){gl_FragColor=vec4(.045,.029,.018,(material-5.)*(.36+.64*roomLight));return;}
 vec2 uv=gl_FragCoord.xy*texel, center=texture2D(visibility,uv).rg;
 if(outlinedBy(uv+vec2(texel.x,0.),center) || outlinedBy(uv-vec2(texel.x,0.),center) ||
    outlinedBy(uv+vec2(0.,texel.y),center) || outlinedBy(uv-vec2(0.,texel.y),center)){
   gl_FragColor=vec4(0.,0.,0.,1.);return;
 }
 vec3 c=color;
 if(material>.5 && material<3.5){
   vec2 grain=material<1.5 ? vec2(world.x,world.y+world.z) : material<2.5 ? vec2(world.y,world.x+world.z) : vec2(world.z,world.x+world.y);
   float drift=sin(grain.x*1.2+grain.y*2.4)*.10+sin(grain.x*.45+grain.y*5.)*.12;
   float rings=fract((grain.y+drift)*7.2);
   float broken=sin(grain.x*2.+grain.y*7.)+sin(grain.x*.7-grain.y*3.);
   c*=1.+.040*sin((grain.y+drift)*55.)-.19*step(.82,rings)*smoothstep(-.35,.42,broken);
 }
 if(material>3.6 && material<3.9){
   vec2 p=vec2(world.x+.40*world.z,world.y+.72*world.z);
   float strata=sin(p.x*3.1+p.y*6.+1.4*sin(p.y*2.8)+.7*sin(p.x*4.));
   c*=.98+.055*strata+.040*smoothstep(.91,.99,strata);
 }
 float night=1.-roomLight;
 if(material< -4.5 || (material< -2.5 && material> -3.5)){
   // Silver reflections and the emissive flame already carry their display colour.
 }else if(material< -1.5 && material> -2.5){
   c=mix(c,vec3(.93,.94,.80),night*night*night);
 }else if(material< -.5 && material> -1.5){
   c*=exteriorLight;
 }else{
   float possible=0., active=0.;
   for(int i=0;i<5;i++){
     vec3 delta=world-lamps[i].xyz;
     float weight=1./(.42+dot(delta,delta));
     possible+=weight;
     active+=weight*lamps[i].w;
   }
   float lit=.56*active/possible+.44*roomLight;
   c*=vec3(.07,.095,.14)+vec3(.93,.905,.86)*lit;
   if(material<3.5) c+=candleColor*active;
   if(material< -3.5) c+=vec3(.055,.066,.065)*night;
   if(spotlight.w>0. && world.y>=1.51){
     float radius=max(spotlight.z*.45,spotlight.z-.19*(world.y-1.53));
     vec2 offset=(world.xz-spotlight.xy-shaftAim.xy*(world.y-shaftAim.z))/radius;
     float falloff=max(0.,1.-dot(offset,offset));
     c+=(color*vec3(.77,.68,.50)+vec3(.052,.043,.029))*falloff*falloff*spotlight.w;
   }
 }
 vec2 px=floor(gl_FragCoord.xy);
 float d=mod(px.x,2.)*.5+mod(px.y,2.)*.25-.375;
 c=floor(c*43.+.5+d*.68)/43.;
 gl_FragColor=vec4(c,1.);
}`);
    // Only the nearest solid surface contributes an ID. Translucent footprints cast no outline.
    const maskFragment=compile(gl.FRAGMENT_SHADER,`precision mediump float;
varying float material,id;
void main(){
 if(material>4.5) discard;
 gl_FragColor=vec4(id,min(1.,4.*gl_FragCoord.w),0.,1.);
}`);
    function link(fragmentShader){
      const p=gl.createProgram();
      gl.attachShader(p,vertex); gl.attachShader(p,fragmentShader);
      ["position","tint","grain","objectId"].forEach((name,i)=>gl.bindAttribLocation(p,i,name));
      gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
      gl.deleteShader(fragmentShader);
      return p;
    }
    const program=link(fragment), maskProgram=link(maskFragment);
    gl.deleteShader(vertex);
    const buffers=new Map();
    for(let i=0;i<4;i++) gl.enableVertexAttribArray(i);
    let bound=null;
    function bindGeometry(scene){
      if(bound===scene) return;
      let pair=buffers.get(scene);
      if(!pair){
        pair={vertices:gl.createBuffer(),ids:gl.createBuffer()};
        buffers.set(scene,pair);
        gl.bindBuffer(gl.ARRAY_BUFFER,pair.vertices);
        gl.bufferData(gl.ARRAY_BUFFER,scene.mesh,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,pair.ids);
        gl.bufferData(gl.ARRAY_BUFFER,scene.objectIds,gl.STATIC_DRAW);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,pair.ids);
      gl.vertexAttribPointer(3,1,gl.UNSIGNED_BYTE,true,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,pair.vertices);
      gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);
      gl.vertexAttribPointer(1,3,gl.FLOAT,false,28,12);
      gl.vertexAttribPointer(2,1,gl.FLOAT,false,28,24);
      bound=scene;
    }
    const mask=gl.createTexture(), depth=gl.createRenderbuffer(), target=gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D,mask);
    for(const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,name,gl.NEAREST);
    for(const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,mask,0);
    gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
    let maskWidth=0, maskHeight=0;
    function cameraUniforms(p){
      const rows=["right","up","forward"].map(name=>gl.getUniformLocation(p,name));
      const scale=gl.getUniformLocation(p,"scale");
      return (camera,focal)=>{
        gl.useProgram(p);
        camera.forEach((row,i)=>gl.uniform4fv(rows[i],row));
        gl.uniform2f(scale,2*focal/canvas.width,2*focal/canvas.height);
      };
    }
    const setMaskCamera=cameraUniforms(maskProgram), setSceneCamera=cameraUniforms(program);
    const texel=gl.getUniformLocation(program,"texel");
    const lamps=gl.getUniformLocation(program,"lamps[0]");
    const ambient=gl.getUniformLocation(program,"roomLight");
    const exterior=gl.getUniformLocation(program,"exteriorLight");
    const candleColor=gl.getUniformLocation(program,"candleColor");
    const spot=gl.getUniformLocation(program,"spotlight");
    const aim=gl.getUniformLocation(program,"shaftAim");
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    function renderRoom(camera,focal,scene=geometry,lighting){
      bindGeometry(scene);
      const {room,vertexCount}=scene;
      if(!lighting){
        gl.bufferSubData(gl.ARRAY_BUFFER,scene.moonDisc.start*4,scene.windowVertices);
        gl.bufferSubData(gl.ARRAY_BUFFER,scene.clusterStart*4,scene.movingVertices);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,target);
      if(canvas.width!==maskWidth || canvas.height!==maskHeight){
        maskWidth=canvas.width; maskHeight=canvas.height;
        gl.bindTexture(gl.TEXTURE_2D,mask);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,maskWidth,maskHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
        gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,maskWidth,maskHeight);
      }
      gl.bindTexture(gl.TEXTURE_2D,null);
      gl.viewport(0,0,maskWidth,maskHeight);
      gl.disable(gl.BLEND); gl.disable(gl.DITHER);
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      setMaskCamera(camera,focal);
      gl.drawArrays(gl.TRIANGLES,0,vertexCount);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.bindTexture(gl.TEXTURE_2D,mask);
      setSceneCamera(camera,focal);
      gl.uniform2f(texel,1/maskWidth,1/maskHeight);
      gl.enable(gl.BLEND); gl.enable(gl.DITHER);
      gl.uniform4fv(lamps,lighting?.lamps ?? lampData);
      gl.uniform1f(ambient,lighting?.ambient ?? roomLight);
      gl.uniform1f(exterior,lighting?.exterior ?? exteriorLight);
      if(room==="castle") gl.uniform3f(candleColor,.012,.083,.066);
      else gl.uniform3f(candleColor,.083,.040,.010);
      gl.uniform4fv(spot,spotlight);
      gl.uniform3fv(aim,shaftAim);
      gl.clearColor(.12,.18,.17,1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES,0,vertexCount);
    }
    renderRoom.release=scene=>{
      const pair=buffers.get(scene);
      if(!pair) return;
      gl.deleteBuffer(pair.vertices); gl.deleteBuffer(pair.ids); buffers.delete(scene);
      if(bound===scene) bound=null;
    };
    return renderRoom;
  }

  // Software depth-buffer rasterizer for machines without WebGL. It uses the actual room mesh.
  function softwareRenderer(ctx,{mesh,objectIds,room,vertexCount}=geometry) {
    let image, pixels, depths, visibleIds;
    let lights,ambient,exterior;
    const xyDepth=new Float32Array(vertexCount*3);
    const pack=(r,g,b)=> (255<<24) | (b<<16) | (g<<8) | r;
    const palette=new Uint32Array(vertexCount/3*4);
    const litTones=new Uint32Array(4);
    function shadeTriangle(i,material,x,y,z){
      if(material===-5){
        const k=i*7;
        const channel=j=>Math.round(85*(mesh[k+j]+mesh[k+7+j]+mesh[k+14+j]));
        litTones.fill(pack(channel(3),channel(4),channel(5)));
        return;
      }
      let red=1,green=1,blue=1,addR=0,addG=0,addB=0;
      const night=1-ambient;
      if(material===-2){
        const glow=night**3;
        red=green=blue=1-glow;
        addR=237*glow; addG=240*glow; addB=204*glow;
      }else if(material===-1){
        red=green=blue=exterior;
      }else if(material>=0 || material===-4){
        let total=0,active=0;
        for(let k=0;k<lights.length;k+=4){
          const dx=x-lights[k],dy=y-lights[k+1],dz=z-lights[k+2];
          const weight=1/(.42+dx*dx+dy*dy+dz*dz);
          total+=weight; active+=weight*lights[k+3];
        }
        const lit=.56*active/total+.44*ambient;
        red=.07+.93*lit; green=.095+.905*lit; blue=.14+.86*lit;
        if(material<3.5){
          addR=(room==="castle"?3:21.2)*active;
          addG=(room==="castle"?21.2:10.2)*active;
          addB=(room==="castle"?16.8:2.55)*active;
        }
        if(material===-4){addR+=14*night;addG+=17*night;addB+=17*night;}
        if(spotlight[3]>0 && y>=1.51){
          const radius=Math.max(spotlight[2]*.45,spotlight[2]-.19*(y-1.53));
          const dx=x-spotlight[0]-shaftAim[0]*(y-shaftAim[2]), dz=z-spotlight[1]-shaftAim[1]*(y-shaftAim[2]);
          const falloff=Math.max(0,1-(dx*dx+dz*dz)/(radius*radius));
          const amount=falloff*falloff*spotlight[3];
          red+=.77*amount; green+=.68*amount; blue+=.50*amount;
          addR+=13.3*amount; addG+=11*amount; addB+=7.4*amount;
        }
      }
      for(let t=0;t<4;t++){
        const c=palette[i/3*4+t];
        litTones[t]=pack(Math.min(255,(c&255)*red+addR),Math.min(255,(c>>>8&255)*green+addG),Math.min(255,(c>>>16&255)*blue+addB));
      }
    }
    for(let i=0;i<vertexCount;i+=3){
      const k=i*7;
      for(let tone=0;tone<4;tone++){
        const channels=[3,4,5].map(j=>Math.max(0,Math.min(255,Math.round((mesh[k+j]+mesh[k+j+7]+mesh[k+j+14])*85+(tone-1.5)*2))));
        palette[i/3*4+tone]=pack(...channels);
      }
    }
    return ([right,up,forward],focal,scene,lighting) => {
      lights=lighting?.lamps ?? lampData;
      ambient=lighting?.ambient ?? roomLight;
      exterior=lighting?.exterior ?? exteriorLight;
      const w=canvas.width,h=canvas.height;
      if (!image || image.width!==w || image.height!==h){
        image=ctx.createImageData(w,h); pixels=new Uint32Array(image.data.buffer); depths=new Float32Array(w*h);
        visibleIds=new Uint8Array(w*h);
      }
      pixels.fill(pack(35,53,51)); depths.fill(0); visibleIds.fill(0);
      for(let i=0;i<vertexCount;i++){
        const k=i*7,j=i*3,x=mesh[k],y=mesh[k+1],z=mesh[k+2];
        const d=1/(forward[0]*x+forward[1]*y+forward[2]*z+forward[3]);
        xyDepth[j]=w/2+(right[0]*x+right[1]*y+right[2]*z+right[3])*focal*d;
        xyDepth[j+1]=h/2-(up[0]*x+up[1]*y+up[2]*z+up[3])*focal*d;
        xyDepth[j+2]=d;
      }
      for(let i=0;i<vertexCount;i+=3){
        const j=i*3, x=xyDepth[j],y=xyDepth[j+1],d=xyDepth[j+2];
        const bx=xyDepth[j+3]-x,by=xyDepth[j+4]-y,cx=xyDepth[j+6]-x,cy=xyDepth[j+7]-y;
        const det=bx*cy-by*cx;
        if(Math.abs(det)<.08 || Math.min(d,xyDepth[j+5],xyDepth[j+8])<=0) continue;
        const left=Math.max(0,Math.floor(Math.min(x,x+bx,x+cx))), rightX=Math.min(w-1,Math.ceil(Math.max(x,x+bx,x+cx)));
        const top=Math.max(0,Math.floor(Math.min(y,y+by,y+cy))), bottom=Math.min(h-1,Math.ceil(Math.max(y,y+by,y+cy)));
        const k=i*7,material=mesh[k+6];
        const shadow=(material-5)*(.36+.64*ambient);
        const sampleAcross=material>=0 && material<4.5 && (rightX-left)*(bottom-top)>2200;
        if(shadow<=0 && !sampleAcross) shadeTriangle(i,material,
          (mesh[k]+mesh[k+7]+mesh[k+14])/3,(mesh[k+1]+mesh[k+8]+mesh[k+15])/3,(mesh[k+2]+mesh[k+9]+mesh[k+16])/3);
        const ux=cy/det,uy=-cx/det,vx=-by/det,vy=bx/det, db=xyDepth[j+5]-d,dc=xyDepth[j+8]-d;
        for(let py=top;py<=bottom;py++){
          let nextSample=left;
          let u=(left+.5-x)*ux+(py+.5-y)*uy, v=(left+.5-x)*vx+(py+.5-y)*vy;
          for(let px=left;px<=rightX;px++,u+=ux,v+=vx){
            if(u<0 || v<0 || u+v>1) continue;
            const index=py*w+px, z=d+u*db+v*dc;
            if(z<=depths[index]) continue;
            depths[index]=z;
            if(shadow>0) {
              const base=pixels[index], keep=1-shadow;
              pixels[index]=pack((base&255)*keep+11*shadow,((base>>>8)&255)*keep+7*shadow,((base>>>16)&255)*keep+5*shadow);
              continue;
            }
            visibleIds[index]=objectIds[i];
            if(sampleAcross && px>=nextSample){
              const a=(1-u-v)*d/z,b=u*xyDepth[j+5]/z,c=v*xyDepth[j+8]/z;
              shadeTriangle(i,material,a*mesh[k]+b*mesh[k+7]+c*mesh[k+14],
                a*mesh[k+1]+b*mesh[k+8]+c*mesh[k+15],a*mesh[k+2]+b*mesh[k+9]+c*mesh[k+16]);
              nextSample=px+12;
            }
            pixels[index]=litTones[(px&1)+2*(py&1)];
          }
        }
      }
      const black=pack(0,0,0);
      function outlineNeighbor(source,neighbor){
        if(visibleIds[source]!==visibleIds[neighbor] && depths[source]>=depths[neighbor]){
          pixels[neighbor]=black;
        }
      }
      for(let i=0;i<visibleIds.length;i++){
        if(!visibleIds[i]) continue;
        if(i%w>0) outlineNeighbor(i,i-1);
        if(i%w<w-1) outlineNeighbor(i,i+1);
        if(i>=w) outlineNeighbor(i,i-w);
        if(i+w<visibleIds.length) outlineNeighbor(i,i+w);
      }
      ctx.putImageData(image,0,0);
    };
  }

  let draw, gpu=false;
  function makeRenderer(){
    const gl=canvas.getContext("webgl",{antialias:false,alpha:false,powerPreference:"low-power"});
    if(gl){
      try { draw=gpuRenderer(gl); gpu=true; return; }
      catch(error){ console.warn("Cabin renderer:",error.message); }
      const fresh=canvas.cloneNode(false);
      canvas.replaceWith(fresh); canvas=fresh;
    }
    const ctx=canvas.getContext("2d",{alpha:false});
    if(ctx) draw=softwareRenderer(ctx);
  }
  makeRenderer();
  if(!draw){ canvas.remove(); arena.classList.add("scene-unavailable"); arena.dispatchEvent(new Event("cabin-painted")); return; }

  const motion=matchMedia("(prefers-reduced-motion: reduce)");
  let targetX=0,targetY=0,x=0,y=0,hit=-Infinity,frame=0,previous=0,visible=true;
  let idleTimer;
  function schedule(){
    clearTimeout(idleTimer);
    if(!frame && visible && !document.hidden) frame=requestAnimationFrame(render);
  }
  const deckButton = document.getElementById("deck");
  const boardSlots = [...arena.querySelectorAll(".board-slot")];
  const mirrorButton = document.getElementById("skin-mirror");
  const deckZone = deckButton.closest(".deckzone");
  const bellButton = document.getElementById("end");
  const hoverInput=matchMedia("(hover: hover)");
  const moonButton=document.getElementById("window-moon");
  const portrait=encounter.querySelector(".ghost-portrait");
  let roomRequested=false, tear=null;
  const tearDuration=1750;
  const tearSurfaces="#speech:not([hidden]), .hand-face, .board-slot > .card";
  let heldControls=[];
  function setRoomLock(active){
    if(arena.classList.contains("room-tearing")===active) return;
    arena.classList.toggle("room-tearing",active);
    if(active){
      heldControls=[...document.querySelectorAll(".standalone, .arena button, .arena a, .book-spine, .board-slot")]
        .filter(el=>!el.inert && !el.closest("#hand"));
      heldControls.forEach(el=>{el.inert=true;});
      for(const card of arena.querySelectorAll("#hand .card")) card.tabIndex=0;
      arena.dispatchEvent(new Event("room-tear-start"));
      spotlight[3]=0;
    }else{
      heldControls.forEach(el=>{el.inert=false;});
      heldControls=[];
      for(const card of arena.querySelectorAll("#hand .card")) card.tabIndex=-1;
    }
    if(window.parent!==window) window.parent.postMessage({type:"portfolio-room-tear",active},"*");
  }
  function tearBand(y,h){
    const row=y/4,noise=Math.sin(row*78.23)*437.17,grain=noise-Math.floor(noise);
    return {grain,jag:.044*Math.sin(y/h*14)+.022*Math.sin(row*.67)+.023*(grain-.5)};
  }
  // The two rooms share live cards and speech. Slide a perforated alpha mask across
  // their own painted surfaces so text can keep typing and hand hit areas stay put.
  function makeTearMask(w,h){
    const mask=document.createElement("canvas");
    mask.width=3*w; mask.height=h;
    const ctx=mask.getContext("2d");
    ctx.fillStyle="white";
    for(let y=0;y<h;y+=4){
      const {grain,jag}=tearBand(y,h);
      const edge=Math.round(w*(1.5+jag));
      ctx.fillRect(0,y,edge-Math.round(.10*w),4);
      ctx.fillRect(edge,y,mask.width-edge,4);
      for(let n=1;n<=3;n++){
        const gap=Math.round(w*(.009+.018*grain)*n),chip=Math.round(w*(.012+.008*grain)/n);
        ctx.fillRect(edge-gap-chip,y,chip,4);
      }
    }
    return 'url("'+mask.toDataURL()+'")';
  }
  function maskTableSurfaces(front){
    const view=canvas.getBoundingClientRect();
    for(const el of arena.querySelectorAll(tearSurfaces)){
      const rect=el.getBoundingClientRect();
      if(!rect.width || !rect.height) continue;
      const sx=el.offsetWidth/rect.width, sy=el.offsetHeight/rect.height;
      el.style.setProperty("--tear-size",3*view.width*sx+"px "+view.height*sy+"px");
      el.style.setProperty("--tear-offset",(view.left+(front-1.5)*view.width-rect.left)*sx+"px "+(view.top-rect.top)*sy+"px");
    }
  }
  function finishRoomTear(){
    tear?.layer.remove();
    if(tear) tear.draw.release?.(tear.geometry);
    tear=null;
    roomRequested=false;
    portrait.style.removeProperty("clip-path");
    arena.style.removeProperty("--tear-mask");
    for(const el of arena.querySelectorAll("#speech,.hand-face,.board-slot > .card")){
      el.style.removeProperty("--tear-size");
      el.style.removeProperty("--tear-offset");
    }
    setRoomLock(false);
  }
  function capturePortrait(){
    // Flatten only the artwork in its current pose; the speech bubble is a sibling.
    const frame=document.createElement("canvas"), paint=document.createElement("canvas");
    frame.width=frame.height=paint.width=paint.height=128;
    const actor=frame.getContext("2d"), brush=paint.getContext("2d");
    const bounds=portrait.getBoundingClientRect();
    if(!actor || !brush || !bounds.width || !bounds.height) return null;
    let hasBase=false;
    for(const layer of portrait.querySelectorAll(".portrait-layer")){
      const style=getComputedStyle(layer);
      if(Number(style.opacity)===0) continue;
      const image=layer.classList.contains("lit") ? layer.querySelector(".lit-portrait") :
        [...layer.querySelectorAll("img")].find(img=>img.naturalWidth && img.getClientRects().length);
      if(!image) continue;
      if(layer.classList.contains("portrait-ink")) hasBase=true;
      const rect=image.getBoundingClientRect();
      brush.clearRect(0,0,128,128);
      brush.save();
      if(style.clipPath!=="none" && hemEdge){
        const clip=new Path2D();
        for(const [i,p] of Array.from(hemEdge.points).entries()){
          if(i===0) clip.moveTo(p.x,p.y); else clip.lineTo(p.x,p.y);
        }
        clip.closePath();
        const arms=hemEdge.parentNode.querySelector("path");
        if(arms) clip.addPath(new Path2D(arms.getAttribute("d")));
        brush.clip(clip);
      }
      brush.imageSmoothingEnabled=false;
      brush.filter=getComputedStyle(image).filter;
      const scaleX=(image.naturalWidth || image.width)/rect.width;
      const scaleY=(image.naturalHeight || image.height)/rect.height;
      brush.drawImage(image,(bounds.left-rect.left)*scaleX,(bounds.top-rect.top)*scaleY,
        bounds.width*scaleX,bounds.height*scaleY,0,0,128,128);
      brush.restore();
      actor.save();
      actor.filter=style.filter;actor.globalAlpha=Number(style.opacity);
      actor.drawImage(paint,0,0);actor.restore();
    }
    if(!hasBase) return null;
    const sprites=[{image:frame,x:0,y:0,w:1,h:1,
      opacity:Number(getComputedStyle(portrait.querySelector(".skin-layers")).opacity),filter:"none"}];
    const mist=portrait.querySelector(".skin-mist");
    if(mist && !mist.hidden){
      const image=mist.cloneNode(false), rect=mist.getBoundingClientRect();
      image.getContext("2d").drawImage(mist,0,0);
      sprites.push({image,x:(rect.left-bounds.left)/bounds.width,y:(rect.top-bounds.top)/bounds.height,
        w:rect.width/bounds.width,h:rect.height/bounds.height,opacity:1,filter:getComputedStyle(mist).filter});
    }
    return sprites;
  }
  function refreshOutgoing(state,camera,focal){
    const {still,copy,halo,lamps,sprites}=state;
    if(still.width!==canvas.width || still.height!==canvas.height){
      still.width=state.layer.width=canvas.width;
      still.height=state.layer.height=canvas.height;
      arena.style.setProperty("--tear-mask",makeTearMask(still.width,still.height));
    }
    copy.drawImage(canvas,0,0);
    copy.save();
    copy.globalCompositeOperation="screen";
    for(const {point,radius,opacity} of lamps){
      if(!opacity) continue;
      const [cx,cy,depth]=camera.map(row=>row[0]*point[0]+row[1]*point[1]+row[2]*point[2]+row[3]);
      const size=radius*focal/depth;
      copy.globalAlpha=opacity;
      copy.drawImage(halo,still.width/2+focal*cx/depth-.43*size,still.height/2-focal*cy/depth-.5*size,.86*size,size);
    }
    copy.restore();
    if(sprites){
      const bounds=portrait.getBoundingClientRect(),view=canvas.getBoundingClientRect();
      copy.save();
      copy.scale(still.width/view.width,still.height/view.height);
      copy.translate(bounds.left-view.left,bounds.top-view.top);
      copy.imageSmoothingEnabled=false;
      for(const sprite of sprites){
        copy.globalAlpha=sprite.opacity;copy.filter=sprite.filter;
        copy.drawImage(sprite.image,sprite.x*bounds.width,sprite.y*bounds.height,sprite.w*bounds.width,sprite.h*bounds.height);
      }
      copy.restore();
    }
    state.camera=camera;
    state.focal=focal;
  }
  function captureRoom(camera,focal){
    const still=document.createElement("canvas"), layer=document.createElement("canvas");
    still.width=layer.width=canvas.width;
    still.height=layer.height=canvas.height;
    const copy=still.getContext("2d"), ink=layer.getContext("2d");
    if(!copy || !ink) return null;
    const halo=glows[0].cloneNode(false);
    halo.getContext("2d").drawImage(glows[0],0,0);
    const forward=camera[2], pixelScale=canvas.width/canvas.clientWidth;
    const lamps=glows.map((glow,i)=>{
      const point=lampData.slice(i*4,i*4+3);
      const depth=forward[0]*point[0]+forward[1]*point[1]+forward[2]*point[2]+forward[3];
      return {point,radius:parseFloat(glow.style.height)*pixelScale*depth/focal,opacity:Number(glow.style.opacity)};
    });
    const state={still,layer,copy,ink,draw,geometry,halo,lamps,sprites:capturePortrait(),started:null,
      lighting:{lamps:lampData.slice(),ambient:roomLight,exterior:exteriorLight}};
    refreshOutgoing(state,camera,focal);
    if(state.sprites) portrait.style.clipPath="inset(0 100% 0 0)";
    ink.drawImage(still,0,0);
    layer.className="room-tear";
    layer.setAttribute("aria-hidden","true");
    canvas.after(layer);
    arena.style.setProperty("--tear-mask",makeTearMask(still.width,still.height));
    maskTableSurfaces(-.22);
    return state;
  }
  function paintTear(now){
    const {still,ink,sprites}=tear;
    if(tear.started===null) tear.started=now;
    const t=Math.min(1,(now-tear.started)/tearDuration);
    if(t===1 || motion.matches){
      finishRoomTear();
      return;
    }
    const w=still.width,h=still.height;
    const front=(t*t*(3-2*t)*1.42-.22)*w;
    maskTableSurfaces(front/w);
    ink.clearRect(0,0,w,h);
    function strip(x,y,width,height,shift){
      if(width<=0) return;
      ink.drawImage(still,x,y,width,height,x+shift,y,width,height);
    }
    for(let y=0;y<h;y+=4){
      const height=Math.min(4,h-y),{grain,jag}=tearBand(y,h);
      const edge=front+w*jag;
      const cut=Math.round(Math.max(0,Math.min(w,edge)));
      const pull=Math.round(w*.048*t*t*(.6+grain));
      strip(cut,y,w-cut,height,pull);
      for(let n=1;n<=3;n++){
        const gap=Math.round(w*(.009+.018*grain)*n);
        const fragment=Math.max(0,Math.round(w*(.012+.008*grain)/n));
        const x=Math.round(edge-gap-fragment);
        if(x>=0 && x+fragment<=w) strip(x,y,fragment,height,pull+Math.round(gap*.32));
      }
    }
    // Reveal the live character behind the trailing fragments of the captured one.
    if(sprites){
      const bounds=portrait.getBoundingClientRect(),view=canvas.getBoundingClientRect();
      const right=bounds.right-(view.left+(front/w-.105)*view.width);
      if(right<=0) portrait.style.removeProperty("clip-path");
      else portrait.style.clipPath="inset(0 "+Math.min(bounds.width,right)+"px 0 0)";
    }
  }
  const labelMoon=()=>{
    moonButton.setAttribute("aria-label",room==="castle" ? "回到小屋" : "进入城堡");
  };
  labelMoon();
  function switchRoom(){
    if(roomRequested || tear) return;
    roomRequested=true;
    setRoomLock(true);
    schedule();
  }
  let moonTouch=null, lastMoonTap=-Infinity;
  moonButton.addEventListener("pointerdown",event=>{
    if(event.pointerType==="touch" && event.isPrimary) moonTouch={id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  moonButton.addEventListener("pointercancel",()=>{moonTouch=null;});
  moonButton.addEventListener("pointerup",event=>{
    if(moonTouch?.id!==event.pointerId) return;
    const tapped=Math.hypot(event.clientX-moonTouch.x,event.clientY-moonTouch.y)<10;
    moonTouch=null;
    if(tapped){lastMoonTap=performance.now();switchRoom();}
  });
  moonButton.addEventListener("click",event=>{
    // Some touch browsers omit the compatibility click after a drag or rotation.
    if(event.detail && performance.now()-lastMoonTap<600) return;
    switchRoom();
  });
  function prepareOutline(button, host = button.querySelector(".control-art")) {
    const layer=document.createElement("canvas");
    layer.className="prop-outline";
    layer.hidden=true;
    host.append(layer);
    for(const event of ["pointerenter","pointerleave"]) button.addEventListener(event,schedule);
    new MutationObserver(schedule).observe(button,{attributes:true,attributeFilter:["class"]});
    return {button, layer, ctx:layer.getContext("2d")};
  }
  const deckOutline=prepareOutline(deckButton), bellOutline=prepareOutline(bellButton);
  const shuffleButton=document.getElementById("shuffle");
  const shuffleOutline=prepareOutline(shuffleButton);
  const shaft=document.createElement("i");
  shaft.className="table-light-shaft";
  shaft.setAttribute("aria-hidden","true");
  shaft.hidden=true;
  arena.insertBefore(shaft,encounter);
  let lastSpot=-1;
  const candleNames=["高蜡烛","中等高度的蜡烛","矮蜡烛","桌边的蜡烛","窗边的蜡烛"];
  const volumes=props.books.map(book=>{
    const target=document.createElement(book.musicBook ? "button" : "span");
    target.className="book-spine";
    if(book.musicBook){
      target.type="button";
      target.tabIndex=-1;
      target.addEventListener("click",()=>requestMusic(book.musicBook));
    } else target.setAttribute("role","img");
    target.setAttribute("aria-label",book.label);
    arena.insertBefore(target,encounter);
    const outline=prepareOutline(target,arena);
    outline.layer.classList.add("book-outline");
    let guard;
    if(book.guard){
      guard=document.createElement("span");
      guard.className="book-guard";
      guard.setAttribute("aria-hidden","true");
      arena.insertBefore(guard,encounter);
    }
    return {book,target,outline,guard,pull:0,selected:false};
  });
  const gram=document.createElement("button");
  gram.type="button";
  gram.className="gramophone";
  gram.setAttribute("aria-label","留声机，随机播放一首");
  arena.insertBefore(gram,encounter);
  // Keep the caption outside the projected polygon that clips the button.
  const gramTip=document.createElement("span");
  gramTip.className="prop-tip gram-tip";
  gramTip.id="gram-tip";
  gramTip.setAttribute("role","tooltip");
  gramTip.textContent="点击以切换音乐";
  gram.setAttribute("aria-describedby",gramTip.id);
  gram.after(gramTip);
  const gramOutline=prepareOutline(gram,arena);
  gramOutline.layer.classList.add("gram-outline");
  const note=document.createElement("canvas");
  note.className="horn-note";
  note.width=9; note.height=9;
  note.hidden=true;
  note.setAttribute("aria-hidden","true");
  arena.insertBefore(note,encounter);
  const ink=note.getContext("2d");
  const noteGlyphs=[
    ["   ##","   ###","   # ##","   #","   #"," ###","####"," ##"],
    ["   #####","   #####","   #   #","   #   #","   #   #"," ### ###","#### ###"," ##"],
    ["    #","    ##","    ###","    # #","    #","  ###"," ####","  ##"]
  ];
  const bandLevels=new Float32Array(7), reedHeights=new Float32Array(7);
  let lastMeterQuery=-Infinity, lastSample=-Infinity, bassFloor=0, strongBeat=false;
  function receiveBands(bands){
    if(!spinning) return;
    if(!Array.isArray(bands) || bands.length!==7){bandLevels.fill(0);strongBeat=false;return;}
    bandLevels.set(bands);
    const now=performance.now(), bass=.65*bandLevels[0]+.35*bandLevels[1];
    strongBeat=now-lastSample<400 && bass>.31 && bass>bassFloor+.075;
    bassFloor+=(bass-bassFloor)*(1-Math.exp(-Math.max(1,now-lastSample)/380));
    lastSample=now;
  }
  let nextNote=0, noteStart=-Infinity, noteDrift=0;
  function drawHornNote(now,projectLocal){
    if(!spinning || motion.matches || !ink){note.hidden=true; return;}
    if(strongBeat && now>=nextNote){
      noteStart=now;
      nextNote=now+1600;
      noteDrift=.23+Math.random()*.24;
      ink.clearRect(0,0,note.width,note.height);
      ink.fillStyle="#dbc28a";
      const glyph=noteGlyphs[Math.floor(Math.random()*noteGlyphs.length)];
      glyph.forEach((row,y)=>{
        for(let x=0;x<row.length;x++) if(row[x]==="#") ink.fillRect(x,y,1,1);
      });
    }
    const t=(now-noteStart)/850;
    note.hidden=t>=1;
    if(note.hidden) return;
    const [mx,my,mz]=props.hornMouth;
    const [px,py]=projectLocal([mx+.16+t*noteDrift,my+.13+.57*t,mz+.18]);
    const size=1+Math.max(1,Math.min(3,Math.round((projectLocal([mx,my,mz])[1]-projectLocal([mx,my+1,mz])[1])/55)));
    note.style.width=note.style.height=(note.width*size)+"px";
    note.style.transform="translate("+Math.round(px-note.width*size/2)+"px,"+Math.round(py-note.height*size/2)+"px)";
    note.style.opacity=(.48+.24*roomLight)*Math.min(1,t/.18,(1-t)/.26);
  }
  let spinning=false, recordAngle=0;
  const embeddedTable=window.parent!==window && new URLSearchParams(location.search).has("embed");
  function requestMusic(action){
    if(embeddedTable) window.parent.postMessage({type:action},"*");
    else window.dispatchEvent(new Event(action));
  }
  function reflectMusic(state){
    gram.disabled=!state.available;
    if(state.playing!==spinning){
      note.hidden=true;
      noteStart=-Infinity;
      nextNote=0; bassFloor=0; strongBeat=false; lastSample=-Infinity;
      bandLevels.fill(0);
    }
    spinning=state.playing;
    schedule();
  }
  window.addEventListener("message",event=>{
    if(embeddedTable && event.source===window.parent && event.data?.type==="portfolio-music-state") reflectMusic(event.data);
    if(embeddedTable && event.source===window.parent && event.data?.type==="portfolio-music-levels") receiveBands(event.data.bands);
  });
  window.addEventListener("portfolio-music-state",event=>reflectMusic(event.detail));
  window.addEventListener("portfolio-music-levels",event=>receiveBands(event.detail.bands));
  gram.onclick=()=>{
    requestMusic("portfolio-music-shuffle");
    arena.dispatchEvent(new Event("record-change"));
  };
  requestMusic("portfolio-music-query");
  window.addEventListener("pageshow",()=>requestMusic("portfolio-music-query"));
  const litProps=[deckButton,shuffleButton,bellButton,gram,...volumes.map(volume=>volume.target)];
  const candleOutlines=flames.map((_,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.tabIndex=-1;
    button.className="candle-switch";
    // Candle order within the holder is back to front, matching the mesh depth.
    button.style.zIndex=index<3 ? "5" : "3";
    button.setAttribute("aria-label",candleNames[index]);
    button.setAttribute("aria-pressed",String(candlesLit[index]));
    button.addEventListener("click",()=>{
      candlesLit[index]=!candlesLit[index];
      button.setAttribute("aria-pressed",String(candlesLit[index]));
      saveCandles();
      arena.dispatchEvent(new CustomEvent("candle-toggle", {
        detail: {lit: candlesLit[index], count: candlesLit.filter(Boolean).length, total: candlesLit.length}
      }));
      schedule();
    });
    arena.insertBefore(button,encounter);
    const outline=prepareOutline(button,arena);
    outline.layer.classList.add("candle-outline");
    outline.layer.setAttribute("aria-hidden","true");
    return outline;
  });
  let heavyHit = false;
  let remaining = Number(document.getElementById("remaining").textContent), drawAt = -Infinity, returnedAt = -Infinity, bellAt = -Infinity, shuffleAt = -Infinity;
  arena.addEventListener("deck-size", event => { remaining = event.detail; schedule(); });
  arena.addEventListener("deck-draw", () => { drawAt = performance.now(); schedule(); });
  arena.addEventListener("deck-shuffle", () => { shuffleAt = performance.now(); schedule(); });
  arena.addEventListener("deck-return", () => { returnedAt = performance.now(); schedule(); });
  arena.addEventListener("ring-bell", () => { bellAt = performance.now(); schedule(); });

  let deckView, stackLift = 0, watchTilt = 0;
  const leafYaw = i => -.18 + .038*Math.sin(i*3.8);
  const leafHeight = i => .13 + i*.067;

  // Project the bottom slot so returning cards can slide underneath the existing stack.
  arena.addEventListener("deck-landing", event => {
    if (!deckView) return;
    const {anchor,camera,focal,w,h} = deckView;
    const bounds = canvas.getBoundingClientRect();
    const yaw = leafYaw(0), co = Math.cos(yaw), si = Math.sin(yaw);
    const y = 1.533 + anchor.scale*(leafHeight(0)+.012);
    event.detail.corners = [[-.565,-.78],[.565,-.78],[.565,.78],[-.565,.78]].map(([u,v]) => {
      const x = anchor.x+anchor.scale*(u*co+v*si);
      const z = anchor.z+anchor.scale*(v*co-u*si);
      const [right,up,depth] = camera.map(row => row[0]*x+row[1]*y+row[2]*z+row[3]);
      return [bounds.left+bounds.width*(.5+focal/w*right/depth),
        bounds.top+bounds.height*(.5-focal/h*up/depth)];
    });
  });

  function placePart(part, base, height=0, yaw=0, tilt=0, visible=true, spin=0) {
    const co=Math.cos(yaw), si=Math.sin(yaw), ct=Math.cos(tilt), st=Math.sin(tilt);
    const cosSpin=Math.cos(spin), sinSpin=Math.sin(spin);
    const scale=visible ? base.scale : 0;
    for (let i=part.start;i<part.end;i+=7) {
      const x=rest[i]*cosSpin+rest[i+2]*sinSpin, y=rest[i+1], z=rest[i+2]*cosSpin-rest[i]*sinSpin;
      const rz=z*ct+y*st;
      mesh[i]=base.x+scale*(x*co+rz*si);
      mesh[i+1]=1.533+scale*(height+y*ct-z*st);
      mesh[i+2]=base.z+scale*(rz*co-x*si);
    }
  }
  // Depth and size are room units. Only the horizontal framing adapts to screen width.
  function tablePosition(fraction, z, scale, w, focal, width) {
    const sp=pitchSin, cp=pitchCos, dy=1.53-eyeHeight;
    const baseDepth=dy*sp-(z-eyeZ)*cp;
    // On ultrawide screens keep the props within arm's reach in the visible strip of table.
    const wide=Math.max(1,width/1920);
    if(wide>1) {
      const back=backUp/backDepth;
      const slope=back+((dy*cp+(z-eyeZ)*sp)/baseDepth-back)/wide;
      z=eyeZ+dy*(slope*sp-cp)/(sp+slope*cp);
    }
    const depth=dy*sp-(z-eyeZ)*cp;
    scale*=depth/(baseDepth*wide);
    return { x:(fraction-.5)*w*depth/focal, z, scale };
  }

  // Fit the native button to the rendered silhouette, including the raised bell knob.
  function followModel(control, outline, first, last, camera, focal, w, h, width, height) {
    const {button,layer,ctx}=outline;
    const returning=button === deckButton && button.matches(".over,.returning");
    const highlighted=ctx && !roomRequested && !tear && (returning || button.classList.contains("prop-cue") || (hoverInput.matches && button.matches(":hover")) || button.matches(".book-spine:active"));
    // Candles have separate wick hit targets; only project wax for a visible outline.
    if(control===layer && !highlighted){ layer.hidden=true; return; }
    const [r,u,f]=camera;
    let left=Infinity, top=Infinity, right=-Infinity, bottom=-Infinity;
    for(let i=first;i<last;i+=7) {
      const x=mesh[i], y=mesh[i+1], z=mesh[i+2];
      const d=f[0]*x+f[1]*y+f[2]*z+f[3];
      const px=width*(.5+focal/w*(r[0]*x+r[1]*y+r[2]*z+r[3])/d);
      const py=height*(.5-focal/h*(u[0]*x+u[1]*y+u[2]*z+u[3])/d);
      if(highlighted) {
        const j=(i-first)/7*2;
        projected[j]=px; projected[j+1]=py;
      }
      left=Math.min(left,px); right=Math.max(right,px);
      top=Math.min(top,py); bottom=Math.max(bottom,py);
    }
    const hitWidth=Math.max(44,right-left+4);
    const hitHeight=Math.max(44,bottom-top+4);
    const cx=(left+right)/2;
    const tipCenter=Math.min(width-80,Math.max(80,cx));
    control.style.setProperty("--tip-shift",(tipCenter-cx)+"px");
    control.style.left=(left+right)/2+"px";
    control.style.top=bottom+2-hitHeight+"px";
    control.style.setProperty("--prop-width", hitWidth+"px");
    control.style.setProperty("--prop-height", hitHeight+"px");

    layer.hidden=!highlighted;
    if(!highlighted) return;
    const dpr=Math.min(2,window.devicePixelRatio || 1);
    const lw=Math.ceil(hitWidth*dpr), lh=Math.ceil(hitHeight*dpr);
    if(layer.width!==lw || layer.height!==lh) { layer.width=lw; layer.height=lh; }
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,lw,lh);
    const sx=lw/hitWidth, sy=lh/hitHeight;
    ctx.setTransform(sx,0,0,sy,(hitWidth/2-cx)*sx,(hitHeight-bottom-2)*sy);

    // Stroke the projected triangles and remove their union, leaving only the outside edge.
    const path=new Path2D();
    for(let j=0;j<(last-first)/7*2;j+=6) {
      const ax=projected[j], ay=projected[j+1], bx=projected[j+2], by=projected[j+3];
      const cx=projected[j+4], cy=projected[j+5];
      const forward=(bx-ax)*(cy-ay)>(by-ay)*(cx-ax);
      path.moveTo(ax,ay);
      if(forward) { path.lineTo(bx,by); path.lineTo(cx,cy); }
      else { path.lineTo(cx,cy); path.lineTo(bx,by); }
      path.closePath();
    }
    ctx.lineJoin="round";
    ctx.lineWidth=returning ? 3.8 : 2.8;
    ctx.strokeStyle=returning ? "#e57260" : "#e8c574";
    ctx.stroke(path);
    ctx.globalCompositeOperation="destination-out";
    ctx.fill(path);
    ctx.globalCompositeOperation="source-over";
  }
  // Convex silhouette of the projected wax, wick and flame, with a small screen-space margin.
  function fitCandleButton(button, project, fx, base, wick, fz, trayRadius, radius, flameHeight, sway, pad) {
    const points=[];
    for(const [y,r,shift] of [[base,trayRadius,0],[wick,radius,0],[wick+flameHeight,.025,sway]]){
      for(let side=0;side<8;side++){
        const a=side*Math.PI/4, cos=Math.cos(a), sin=Math.sin(a);
        const [x,py]=project(fx+shift+r*cos,y,fz+r*sin);
        points.push([x,py]);
      }
    }
    fitHitPolygon(button,points,pad);
  }
  function convexHull(points){
    points.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
    function half(sequence){
      const edge=[];
      for(const p of sequence){
        while(edge.length>=2){
          const a=edge[edge.length-2],b=edge[edge.length-1];
          if((b[0]-a[0])*(p[1]-a[1])>(b[1]-a[1])*(p[0]-a[0])) break;
          edge.pop();
        }
        edge.push(p);
      }
      edge.pop();
      return edge;
    }
    return half(points).concat(half(points.reverse()));
  }
  function fitHitPolygon(button,points,pad){
    const hull=convexHull(points);
    const left=Math.min(...hull.map(p=>p[0])), right=Math.max(...hull.map(p=>p[0]));
    const top=Math.min(...hull.map(p=>p[1])), bottom=Math.max(...hull.map(p=>p[1]));
    const width=right-left, height=bottom-top;
    button.style.left=(left-pad)+"px";
    button.style.top=(top-pad)+"px";
    button.style.width=(width+2*pad)+"px";
    button.style.height=(height+2*pad)+"px";
    button.style.clipPath="polygon("+hull.map(([x,y])=>
      ((x-left)/width*100).toFixed(1)+"% "+((y-top)/height*100).toFixed(1)+"%").join(",")+")";
    return hull;
  }

  // Account for the sticky site header while the visitor scrolls partway down the table.
  const hostFrame=window.frameElement;
  if(hostFrame){
    const host=hostFrame.ownerDocument;
    const header=host.querySelector(".topbar");
    function updateVisibleTop(){
      const headerBottom=header?.getBoundingClientRect().bottom || 0;
      arena.style.setProperty("--visible-top",Math.max(0,headerBottom-hostFrame.getBoundingClientRect().top)+"px");
    }
    host.defaultView.addEventListener("scroll",updateVisibleTop,{passive:true});
    host.defaultView.addEventListener("resize",updateVisibleTop);
    updateVisibleTop();
  }
  // Smoothly interpolate between gusts of different strengths, sampled once per wick.
  function airCurrent(time){
    const cell=Math.floor(time), f=time-cell;
    const sample=n=>{
      const hash=Math.sin(n*127.1+311.7)*43758.5453;
      return 2*(hash-Math.floor(hash))-1;
    };
    const a=sample(cell);
    return a+(sample(cell+1)-a)*f*f*(3-2*f);
  }
  function render(now){
    frame=0;
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width || !height || !visible || document.hidden) return;
    const landscape=document.documentElement.classList.contains("phone-landscape");
    const narrow=width<=720 || landscape;
    // Keep small props legible on dense phone screens. Budget total pixels
    // so portrait and landscape can use the same framebuffer capacity.
    const resolution=narrow
      ? Math.min(window.devicePixelRatio || 1, gpu ? 1.5 : 1,
          Math.sqrt((gpu ? 860*530 : 510*330)/(width*height)))
      : Math.min(.64,(gpu?860:510)/width,(gpu?530:330)/height);
    const w=Math.max(1,Math.round(width*resolution)),h=Math.max(1,Math.round(height*resolution));
    if(canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; }
    const delta=Math.min(100,previous ? now-previous : 16);
    const step=1-Math.exp(-Math.min(48,delta)/80);
    if(spinning) recordAngle=(recordAngle+delta*.001*2.6)%(2*Math.PI);
    previous=now;
    x+=(targetX-x)*step; y+=(targetY-y)*step;
    const seconds=Math.max(0,(now-hit)/1000);
    const shakeTime=heavyHit ? .32 : .15;
    const kick=seconds<shakeTime ? (heavyHit ? .86 : .22)*(1-seconds/shakeTime)**2 : 0;
    const focal=landscape ? Math.min(w*.46,stage.offsetHeight*1.9*h/height) : narrow ? Math.max(w*.71,Math.min(w*.98,stage.offsetHeight*1.67*h/height)) : Math.min(h*1.47,Math.max(h*1.01,w*.545));
    const cameraX=x*Math.min(1,width/1000);
    const camera=cameraRows(cameraX,y*.78,kick,kick ? seconds : 0);
    // Shift the horizon as the mobile hand wraps; the far edge of the table stays in the stage.
    const dot=(row,px,py,pz)=>row[0]*px+row[1]*py+row[2]*pz+row[3];
    const neutralY=h/2-focal*backUp/backDepth;
    const lift=(neutralY-(stage.offsetHeight+(narrow ? -12 : 8))*h/height)/focal;
    camera[1]=camera[1].map((v,i)=>v+lift*camera[2][i]);
    const actorX=narrow && !landscape ? .07*w/focal*backDepth : 0;
    const sceneTime=motion.matches ? 0 : now*.001;
    const recoil=seconds<.58 ? (heavyHit ? 2.7 : .50)*Math.exp(-seconds*7.7)*Math.sin(seconds*16) : 0;
    for(let i=shadowStart;i<mesh.length;i+=7) mesh[i]=rest[i]+actorX;
    // Project the elbows and crown. The portrait box hugs the opaque 84 × 121 px of the master.
    const footY=1.535+.12*recoil, footZ=actorZ-1.32*recoil;
    // Leave room above the hair for the speech bubble on short or ultrawide screens.
    const headroom=stage.offsetHeight-(landscape ? 32 : narrow ? 64 : 52);
    const tilt=-.38*recoil, actorHeight=Math.min(narrow ? 3.12 : 3.62,headroom*h/height*backDepth/focal);
    const topY=footY+actorHeight*Math.cos(tilt), topZ=footZ+actorHeight*Math.sin(tilt);
    const footDepth=dot(camera[2],actorX,footY,footZ), topDepth=dot(camera[2],actorX,topY,topZ);
    const foot=height*(.5-focal/h*dot(camera[1],actorX,footY,footZ)/footDepth);
    const crown=height*(.5-focal/h*dot(camera[1],actorX,topY,topZ)/topDepth);
    const center=width*(.5+focal/w*dot(camera[0],actorX,footY,footZ)/footDepth);
    encounter.style.left=center+"px";
    encounter.style.top=crown+"px";
    encounter.style.setProperty("--actor-top",crown+"px");
    encounter.style.setProperty("--actor-x",center+"px");
    encounter.style.setProperty("--prop-height",(foot-crown)+"px");
    encounter.style.setProperty("--prop-width",(foot-crown)*84/121+"px");
    // Leave room between the candle cluster and the gramophone on portrait displays.
    const candleScale=narrow ? .85 : 1;
    const clusterZ=narrow ? -.74 : clusterOrigin.z;
    const clusterX=narrow ? -.245*w/focal*(eyeZ-clusterZ) : clusterOrigin.x;
    for(let i=clusterStart;i<clusterEnd;i+=7){
      mesh[i]=clusterX+(rest[i]-clusterOrigin.x)*candleScale;
      mesh[i+1]=1.53+(rest[i+1]-1.53)*candleScale;
      mesh[i+2]=clusterZ+(rest[i+2]-clusterOrigin.z)*candleScale;
    }
    const project=(px,py,pz)=>{
      const d=dot(camera[2],px,py,pz);
      return [width*(.5+focal/w*dot(camera[0],px,py,pz)/d),
        height*(.5-focal/h*dot(camera[1],px,py,pz)/d)];
    };
    // Keep the moon in the inner pane on phones, where the outer pane falls outside the viewport.
    const moonDX=narrow && !landscape ? -5.65 : 0;
    for(let i=moonDisc.start;i<moonDisc.end;i+=7) mesh[i]=rest[i]+moonDX;
    clouds.forEach(({start,end},layer)=>{
      const drift=(sceneTime*(.32+layer*.23)+layer*2)%10;
      for(let i=start;i<end;i+=7) mesh[i]=rest[i]+drift;
    });
    fitHitPolygon(moonButton,moon.map(([mx,my,mz])=>project(mx+moonDX,my,mz)),narrow ? 13 : 5);
    moonButton.hidden=false;
    // Convert the projected table edge to the portrait's native 128 px grid.
    const [edgeA,edgeB]=props.tableRearEdge.map(point=>project(...point));
    const pixelSize=(foot-crown)/121;
    const edgeSlope=(edgeB[1]-edgeA[1])/(edgeB[0]-edgeA[0]);
    const centerRow=5+(edgeA[1]+(center-edgeA[0])*edgeSlope-crown)/pixelSize;
    const edgePoints="0,0 128,0 128,"+(centerRow+64*edgeSlope).toFixed(2)+" 0,"+(centerRow-64*edgeSlope).toFixed(2);
    if(hemEdge.getAttribute("points")!==edgePoints) hemEdge.setAttribute("points",edgePoints);
    props.playerSlots.forEach((quad, index) => {
      const slot = boardSlots[index];
      const corners = quad.map(point => project(...point));
      slot.style.transform = fitCardPlane(corners, 160, 224);
    });
    // On narrow screens the title occupies the lower left wall.
    const portraitLayout=narrow && !landscape;
    const mirrorDX=portraitLayout ? 1.15 : 0;
    const mirrorDY=portraitLayout ? 1.86+Math.max(0,390-width)/70 : 0;
    fitHitPolygon(mirrorButton,props.mirrorRim.map(([x,y,z])=>project(x+mirrorDX,y+mirrorDY,z)),narrow ? 8 : 0);
    mirrorButton.hidden=false;
    for(let i=props.mirror.start;i<props.mirror.end;i+=7){
      mesh[i]=rest[i]+mirrorDX;
      mesh[i+1]=rest[i+1]+mirrorDY;
    }
    let changingLight=false;
    let portraitLight=0, availableLight=0, leftWarmth=0, rightWarmth=0;
    for(const [index,flame] of flames.entries()){
      const outline=candleOutlines[index];
      const button=outline.button;
      const target=Number(candlesLit[index]);
      brightness[index]+=(target-brightness[index])*(motion.matches ? 1 : step);
      if(Math.abs(target-brightness[index])<.006) brightness[index]=target;
      else changingLight=true;
      const power=brightness[index];
      const scale=index<3 ? candleScale : narrow && index===3 ? .82 : 1;
      let fx=index<3 ? clusterX+(flame.x-clusterOrigin.x)*scale : flame.x;
      const fz=index<3 ? clusterZ+(flame.z-clusterOrigin.z)*scale : narrow && index===3 ? -.83 : flame.z;
      if(index>=3) {
        // Keep the solitary candles within the narrower camera framing.
        const limit=(eyeZ-flame.z)*w/focal*(narrow ? .442 : .40);
        fx=Math.max(-limit,Math.min(limit,fx));
        if(narrow && index===3) fx=.245*w/focal*(eyeZ-fz);
        for(let i=flame.tray.shadow.start;i<flame.waxEnd;i+=7){
          mesh[i]=fx+(rest[i]-flame.x)*scale;
          mesh[i+1]=1.53+(rest[i+1]-1.53)*scale;
          mesh[i+2]=fz+(rest[i+2]-flame.z)*scale;
        }
      }
      const wick=1.53+(flame.y-1.53)*scale;
      const t=sceneTime*(1+.035*index)+flame.phase;
      const draftTime=sceneTime*.94+flame.x*.18+flame.z*.12;
      const lean=.085*airCurrent(draftTime)+.057*airCurrent(2.3*t);
      // Air disturbs the belly first. The tip follows a moment later and can curl back.
      const sway=.085*airCurrent(draftTime-.14)+.057*airCurrent(2.3*t-.32)+.042*airCurrent(4.6*t+17);
      const pulse=.70*airCurrent(3*t+9)+.30*Math.sin(7*t+1);
      const stretch=1+.105*pulse-.48*Math.abs(sway), breadth=1-.10*pulse;
      for(let i=flame.start;i<flame.end;i+=7){
        const dy=rest[i+1]-flame.y;
        const bend=Math.max(0,(dy-.063)/(flame.flameHeight-.063));
        const offset=bend*bend*sway+2*bend*(1-bend)*lean;
        mesh[i]=fx+((rest[i]-flame.x)*breadth+offset)*scale*power;
        mesh[i+2]=fz+(rest[i+2]-flame.z)*breadth*scale*power;
        mesh[i+1]=wick+(.063+(dy-.063)*stretch)*scale*power;
        mesh[i+3]=Math.min(1,rest[i+3]*(.96+.04*pulse));
        mesh[i+4]=rest[i+4]*(.94+.06*pulse);
      }
      const lightX=fx+(.44*lean+.11*sway)*scale*power;
      const fy=wick+(.063+.137*stretch)*scale*power, d=dot(camera[2],lightX,fy,fz);
      const [cx,cy]=project(lightX,fy,fz);
      const size=focal/d*width/w*scale*(1.24+.07*pulse);
      const glow=glows[index];
      glow.style.transform="translate("+cx+"px,"+cy+"px) translate(-50%,-50%)";
      glow.style.width=size*.86+"px"; glow.style.height=size+"px"; glow.style.opacity=power*(.54+.08*pulse);
      const k=index*4;
      lampData[k]=lightX; lampData[k+1]=fy; lampData[k+2]=fz;
      lampData[k+3]=power*(1+.065*pulse);
      // Use the same flickering lamps as the wood. Weight nearby flames at face height more strongly.
      const dx=fx-actorX, dy=fy-(footY+actorHeight*.65), dz=fz-footZ;
      const weight=1/(1.5+dx*dx+dy*dy+dz*dz);
      const energy=weight*lampData[k+3];
      availableLight+=weight;
      portraitLight+=energy;
      const rightShare=.5+.5*dx/Math.sqrt(dx*dx+dz*dz+.01);
      leftWarmth+=energy*(1-rightShare);
      rightWarmth+=energy*rightShare;
      const flameHeight=Math.max(.11,(.063+(flame.flameHeight-.063)*stretch)*power)*scale;
      // The shared dish has no switch of its own. Each wick keeps its individual hit area.
      const baseRadius=index<3 ? 1.23*flame.r : flame.tray.radius;
      fitCandleButton(button,project,fx,wick-(flame.h+.040)*scale,wick,fz,baseRadius*scale,flame.r*scale,
        flameHeight,sway*scale*power,narrow ? 4 : 5);
      followModel(outline.layer,outline,flame.waxStart,flame.waxEnd,camera,focal,w,h,width,height);
    }
    const light=brightness.reduce((sum,n)=>sum+n,0)/brightness.length;
    if(light!==roomLight){
      roomLight=light;
      document.documentElement.style.setProperty("--candle-light",light.toFixed(3));
    }
    exteriorLight=1+.76*(1-roomLight);
    const exposure=Math.min(1,.65*portraitLight/availableLight+.35*roomLight);
    encounter.style.setProperty("--portrait-light",exposure.toFixed(3));
    encounter.style.setProperty("--portrait-sepia",(.12+.22*exposure).toFixed(3));
    portraitPainter.setLight(exposure,Math.min(.42,leftWarmth/availableLight*.64),
      Math.min(.42,rightWarmth/availableLight*.64),room==="castle");
    const dark=Math.max(0,1-exposure/.80);
    encounter.style.setProperty("--red-glow",(dark*dark*(3-2*dark)).toFixed(3));
    const compact=width<=1050;
    const deckAnchor=tablePosition(narrow ? .19 : compact ? .235 : .125, narrow ? 3.5 : compact ? 2.87 : 3.76, compact ? .55 : .52,w,focal,width);
    const shuffleAnchor=tablePosition(landscape ? .31 : narrow ? .50 : compact ? .43 : .245, narrow ? 3.72 : compact ? 3.13 : 3.83, narrow ? .5 : .55,w,focal,width);
    const bellAnchor=tablePosition(narrow ? .80 : compact ? .72 : .735, narrow ? 3.57 : compact ? 3.45 : 3.66, narrow ? .52 : .594,w,focal,width);
    const gramAnchor=tablePosition(narrow ? .115 : .202, narrow ? 1.60 : 1.67,narrow ? .54 : .90,w,focal,width);
    const gramYaw=.15, gc=Math.cos(gramYaw), gs=Math.sin(gramYaw);
    placePart(props.gramShadow,gramAnchor,0,gramYaw);
    placePart(props.gramBase,gramAnchor,0,gramYaw);
    if(spinning && now-lastMeterQuery>=(motion.matches ? 120 : 60)){
      lastMeterQuery=now;
      requestMusic("portfolio-music-meter-query");
    }
    let reedsMoving=false;
    props.gramReeds.forEach((reed,i)=>{
      const target=spinning && now-lastSample<450 ? bandLevels[i] : 0;
      const step=1-Math.exp(-delta/(target>reedHeights[i] ? 35 : 115));
      reedHeights[i]+=(target-reedHeights[i])*step;
      if(Math.abs(target-reedHeights[i])<.008) reedHeights[i]=target;
      else reedsMoving=true;
      placePart(reed,gramAnchor,0,gramYaw);
      for(let k=reed.start;k<reed.end;k+=7){
        const height=props.reedFoot+(rest[k+1]-props.reedFoot)*(.13+.87*reedHeights[i]);
        mesh[k+1]=1.533+height*gramAnchor.scale;
      }
    });
    placePart(props.gramRecord,gramAnchor,0,gramYaw,0,true,recordAngle);
    const projectGram=([gx,gy,gz])=>project(gramAnchor.x+(gx*gc+gz*gs)*gramAnchor.scale,
      1.533+gy*gramAnchor.scale,gramAnchor.z+(gz*gc-gx*gs)*gramAnchor.scale);
    const gramHull=fitHitPolygon(gram,props.gramHit.map(projectGram),2);
    const [hornX]=projectGram(props.hornMouth);
    gramTip.style.left=Math.min(width-70,Math.max(70,hornX))+"px";
    gramTip.style.top=Math.min(...gramHull.map(p=>p[1]))+"px";
    drawHornNote(now,projectGram);
    followModel(gramOutline.layer,gramOutline,props.gramBase.start,props.gramRecord.end,camera,focal,w,h,width,height);
    const shelfAnchor=tablePosition(narrow ? .88 : .924, narrow ? 1.78 : compact ? 2.62 : 3.12,
      narrow ? .54 : Math.min(1.06,width/1370)*.88,w,focal,width);
    const shelfYaw=narrow ? -.68 : -1.36, co=Math.cos(shelfYaw), si=Math.sin(shelfYaw);
    placePart(props.shelf,shelfAnchor,0,shelfYaw);
    let bookMoving=false;
    for(const volume of volumes){
      const {book,target}=volume;
      const hover=!roomRequested && !tear && ((hoverInput.matches && target.matches(":hover")) || target.matches(":active"));
      if(hover && !volume.selected && volume.pull < .5) arena.dispatchEvent(new Event("book-pull"));
      volume.selected=hover;
      const goal=hover ? 1 : 0;
      volume.pull+=(goal-volume.pull)*(motion.matches ? 1 : step*.85);
      if(Math.abs(goal-volume.pull)<.003) volume.pull=goal;
      else bookMoving=true;
      const scale=shelfAnchor.scale, lean=.13*volume.pull;
      const heel=book.depth*.5*Math.sin(lean)+(book.print ? .26 : .12)*volume.pull;
      const x=shelfAnchor.x+book.offset*co*scale, z=shelfAnchor.z-book.offset*si*scale;
      // Keep the entire swept cover clear of the bell, even on intermediate aspect ratios.
      const reach=book.depth*.5+book.height*Math.sin(.13);
      const radius=.72*bellAnchor.scale+.07;
      const leftRoom=((x-bellAnchor.x-radius)/scale-book.width*.5*co)/-si-reach;
      const backRoom=((bellAnchor.z-z-radius)/scale+book.width*.5*si)/co-reach;
      const slide=volume.pull*Math.max(0,Math.min(book.print ? 1.15 : .76,Math.max(leftRoom,backRoom)));
      placePart(book,{x:x+si*slide*scale,z:z+co*slide*scale,scale},.18+heel,shelfYaw,lean);
      const coverDepth=.08*book.depth, coverHeight=.56*book.height;
      const coverZ=slide+coverDepth*Math.cos(lean)+coverHeight*Math.sin(lean);
      volume.lightAnchor={x:x+(co*book.width*.5+si*coverZ)*scale,
        z:z+(-si*book.width*.5+co*coverZ)*scale,scale,
        y:1.533+(.18+heel+coverHeight*Math.cos(lean)-coverDepth*Math.sin(lean))*scale};
      // Include the resting spine while it is pulled out, keeping a stationary pointer attached.
      const resting=[], pulled=[];
      for(const dx of [-book.width/2,book.width/2]) for(const dy of [0,book.height]){
        for(const dz of [-book.depth/2,book.depth/2]){
          resting.push(project(x+scale*(co*dx+si*dz),1.533+scale*(dy+.18),z+scale*(co*dz-si*dx)));
          if(volume.pull){
            const pulledZ=slide+dz*Math.cos(lean)+dy*Math.sin(lean);
            const pulledY=.18+heel+dy*Math.cos(lean)-dz*Math.sin(lean);
            pulled.push(project(x+scale*(co*dx+si*pulledZ),1.533+scale*pulledY,z+scale*(co*pulledZ-si*dx)));
          }
        }
      }
      const hit=fitHitPolygon(target,volume.pull ? resting.concat(pulled) : resting,0);
      volume.silhouette=volume.pull ? convexHull(pulled) : hit;
      if(volume.guard){
        volume.guardRim=fitHitPolygon(volume.guard,book.guard.map(([gx,gy,gz])=>project(
          shelfAnchor.x+(gx*co+gz*si)*scale,1.533+gy*scale,shelfAnchor.z+(gz*co-gx*si)*scale)),0);
      }
    }
    // Mask the yellow edge where a closer volume hides the selected cover.
    for(const [index,{book,outline}] of volumes.entries()){
      followModel(outline.layer,outline,book.start,book.end,camera,focal,w,h,width,height);
      if(outline.layer.hidden) continue;
      const ctx=outline.ctx;
      ctx.globalCompositeOperation="destination-out";
      const occluders=volumes.slice(index+1).map(v=>v.silhouette)
        .concat(volumes.slice(index).map(v=>v.guardRim).filter(Boolean));
      for(const rim of occluders){
        ctx.beginPath();
        ctx.moveTo(...rim[0]);
        for(let i=1;i<rim.length;i++) ctx.lineTo(...rim[i]);
        ctx.fill();
      }
      ctx.globalCompositeOperation="source-over";
    }
    deckView={anchor:deckAnchor,camera,focal,w,h};
    const elapsed=t=>motion.matches ? Infinity : Math.max(0,now-t);
    const drawTime=elapsed(drawAt), returnTime=elapsed(returnedAt), bellTime=elapsed(bellAt);
    const pulse=(t,duration)=>t<duration ? Math.sin(Math.PI*t/duration) : 0;
    const deckCue=pulse(elapsed(Number(deckButton.dataset.cueStart ?? -Infinity)),1250);
    const bellCue=pulse(elapsed(Number(bellButton.dataset.cueStart ?? -Infinity)),1250);
    const count=Math.min(props.leaves.length,remaining);
    const liftTop=.095*deckCue+.13*pulse(drawTime,250)+.035*pulse(returnTime,210);
    const liftTarget=deckButton.matches(".over,.returning") && !motion.matches ? .095 : 0;
    stackLift += (liftTarget-stackLift)*step;
    if (Math.abs(liftTarget-stackLift)<.001) stackLift=liftTarget;
    const shuffleTime=elapsed(shuffleAt);
    const cutting=shuffleTime<330;
    const cut=cutting ? Math.sin(shuffleTime*Math.PI/110) : 0;
    const rewind=cutting ? 2*Math.PI*(1-(1-shuffleTime/330)**2) : 0;
    const angle=-.18;
    const dialYaw=.34;
    placePart(props.watchShadow,shuffleAnchor,0,dialYaw);
    placePart(props.deckShadow,deckAnchor,0,angle);
    placePart(props.bellShadow,bellAnchor);
    placePart(props.deckBase,deckAnchor,0,angle);
    props.leaves.forEach((leaf,i)=>{
      const top=i===count-1;
      const upper=i>=Math.ceil(count/2);
      const spread=upper ? 1 : -.46;
      const packet=cut ? {...deckAnchor,x:deckAnchor.x+cut*spread*.46*deckAnchor.scale} : deckAnchor;
      placePart(leaf,packet,leafHeight(i)+stackLift+(top ? liftTop : 0)+(upper ? Math.abs(cut)*.17 : 0),
        leafYaw(i)+cut*spread*.22,top ? -.12*pulse(drawTime,250) : 0,i<count);
    });
    const watchTarget=(!roomRequested && !tear && hoverInput.matches && shuffleButton.matches(":hover")) ? 1.17 : 0;
    watchTilt+=(watchTarget-watchTilt)*(motion.matches ? 1 : step);
    if(Math.abs(watchTarget-watchTilt)<.003) watchTilt=watchTarget;
    // Rotate around the front rim so the case keeps contact with the wood.
    const reach=.54*(1-Math.cos(watchTilt))*shuffleAnchor.scale;
    const pivot={...shuffleAnchor,x:shuffleAnchor.x+reach*Math.sin(dialYaw),z:shuffleAnchor.z+reach*Math.cos(dialYaw)};
    const rise=Math.max(0,.54*Math.sin(watchTilt)-.04*Math.cos(watchTilt));
    placePart(props.watchCase,pivot,rise,dialYaw,watchTilt);
    placePart(props.watchHand,pivot,rise,dialYaw,watchTilt,true,-.93+rewind);
    placePart(props.bellBase,bellAnchor);
    const wobble=.045*Math.sin(2*Math.PI*bellCue)*bellCue + (bellTime<500 ? .12*Math.sin(bellTime*.054)*Math.exp(-bellTime/145) : 0);
    placePart(props.dome,bellAnchor,0,0,wobble);
    placePart(props.plunger,bellAnchor,-.14*pulse(bellTime,190),0,wobble);
    followModel(deckZone,deckOutline,props.deckBase.start,count ? props.leaves[count-1].end : props.deckBase.end,camera,focal,w,h,width,height);
    followModel(shuffleButton,shuffleOutline,props.watchCase.start,props.watchHand.end,camera,focal,w,h,width,height);
    followModel(bellButton,bellOutline,props.bellBase.start,props.plunger.end,camera,focal,w,h,width,height);
    const over=hoverInput.matches ? litProps.findIndex(button=>button.matches(":hover")) : -1;
    const selected=roomRequested || tear ? -1 : deckButton.matches(".over") ? 0 : over>=0 ? over :
      litProps.findIndex(button=>button.matches(":active"));
    const amount=selected<0 ? 0 : Math.max(0,1-roomLight/.72);
    if(selected>=0 && selected!==lastSpot){
      lastSpot=selected;
      spotlight[3]=0;
    }
    const strength=spotlight[3]+(amount-spotlight[3])*(motion.matches ? 1 : step);
    const spotMoving=Math.abs(amount-strength)>.003;
    spotlight[3]=spotMoving ? strength : amount;
    shaft.hidden=spotlight[3]===0;
    if(!shaft.hidden){
      const volume=volumes[lastSpot-4];
      shaft.classList.toggle("reading-shaft",Boolean(volume));
      const anchor=volume ? volume.lightAnchor : [deckAnchor,pivot,bellAnchor,gramAnchor][lastSpot];
      const radius=anchor.scale*(volume ? .58 : lastSpot===0 ? 1.65 : 1.28);
      spotlight[0]=anchor.x; spotlight[1]=anchor.z; spotlight[2]=radius;

      // Project the top and foot of the same cone so the shaft follows camera parallax.
      const footY=volume ? anchor.y : 1.53;
      shaftAim[0]=volume ? .31*co : 0;
      shaftAim[1]=volume ? -.31*si : 0;
      shaftAim[2]=footY;
      const topY=footY+radius*(volume ? 4.7 : 3.7);
      const bottomDepth=dot(camera[2],anchor.x,footY,anchor.z);
      const [bottomX,bottomY]=project(anchor.x,footY,anchor.z);
      const [topX,top]=project(anchor.x+shaftAim[0]*(topY-footY),topY,anchor.z+shaftAim[1]*(topY-footY));
      const length=Math.max(1,bottomY-top);
      const spread=radius*focal*width/(w*bottomDepth);
      shaft.style.left=(bottomX-spread)+"px"; shaft.style.top=top+"px";
      shaft.style.width=2*spread+"px"; shaft.style.height=length+"px";
      shaft.style.transform="skewX("+Math.atan((bottomX-topX)/length)+"rad)";
      shaft.style.setProperty("--spread",Math.atan(spread/(length*1.35))+"rad");
      shaft.style.opacity=spotlight[3];
    }
    shadeSilverTrays();
    // Reproject the frozen outgoing room only when the view moves. Both passes use
    // the same lens, while the tear itself stays in screen coordinates.
    if(tear && (tear.still.width!==w || tear.still.height!==h || focal!==tear.focal ||
      camera.some((row,i)=>row.some((v,j)=>Math.abs(v-tear.camera[i][j])>.00001)))){
      tear.draw(camera,focal,tear.geometry,tear.lighting);
      refreshOutgoing(tear,camera,focal);
    }
    draw(camera,focal);
    updateRoomLighting();
    if(roomRequested){
      roomRequested=false;
      if(!motion.matches) tear=captureRoom(camera,focal);
      if(!tear) draw.release?.(geometry);
      room=room==="castle" ? "cabin" : "castle";
      loadRoom();
      volumes.forEach((volume,i)=>{volume.book=props.books[i];});
      if(!gpu) draw=softwareRenderer(canvas.getContext("2d"));
      labelMoon();
      if(!tear) setRoomLock(false);
      schedule();
      return;
    }
    if(tear){
      paintTear(now);
      if(tear){schedule();return;}
    }
    canvas.classList.add("painted");
    if (!arena.classList.contains("modeled")) {
      arena.classList.add("modeled");
      arena.dispatchEvent(new Event("cabin-painted"));
    }
    if((spinning || reedsMoving) && motion.matches) idleTimer=setTimeout(schedule,80);
    else if(!motion.matches) {
      if(bookMoving || spotMoving || changingLight || watchTilt!==watchTarget || stackLift!==liftTarget || cutting || drawTime<250 || returnTime<240 || bellTime<500 || kick || seconds<.6 || Math.abs(targetX-x)+Math.abs(targetY-y)>.001) schedule();
      else idleTimer=setTimeout(schedule,narrow ? (gpu ? 70 : 135) : (gpu ? 50 : 105));
    }
  }
  function center(){targetX=targetY=0; schedule();}
  const input=arena;
  input.addEventListener("pointermove",event=>{
    if(motion.matches || event.pointerType!=="mouse") return;
    // Let a reader cross individual spines without the whole shelf drifting under the pointer.
    if(event.target.closest(".book-spine")) { targetX=x; targetY=y; return; }
    const bounds=canvas.getBoundingClientRect();
    if(!bounds.width || !bounds.height) return;
    const clamp=n=>Math.max(-1,Math.min(1,n));
    targetX=clamp(2*(event.clientX-bounds.left)/bounds.width-1);
    targetY=clamp(2*(event.clientY-bounds.top)/bounds.height-1);
    schedule();
  },{passive:true});
  input.addEventListener("pointerleave",center);
  arena.addEventListener("cabin-hit",event=>{
    heavyHit=event.detail.mode==="drag";
    if(motion.matches) return;
    hit=performance.now(); schedule();
    navigator.vibrate?.(heavyHit ? 36 : 12);
  });
  motion.addEventListener("change",()=>{x=y=targetX=targetY=0;hit=-Infinity;schedule();});
  new ResizeObserver(schedule).observe(canvas);
  function releaseHiddenRoom(){
    if(roomRequested || tear) finishRoomTear();
  }
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)schedule();else releaseHiddenRoom();}).observe(canvas);
  document.addEventListener("visibilitychange",()=>{if(document.hidden) releaseHiddenRoom();else schedule();});
  window.addEventListener("pagehide",releaseHiddenRoom);
  window.addEventListener("pageshow",()=>{hit=-Infinity;previous=0;center();});
  canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();releaseHiddenRoom();canvas.classList.remove("painted");visible=false;});
  canvas.addEventListener("webglcontextrestored",()=>{makeRenderer();visible=true;schedule();});
  schedule();
})();
