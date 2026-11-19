(() => {
  const arena = document.getElementById("arena");
  if (!arena) return;
  const encounter=arena.querySelector(".encounter");
  const stage=arena.querySelector(".stage");
  let canvas = document.createElement("canvas");
  canvas.className = "cabin-view";
  canvas.setAttribute("aria-hidden", "true");
  arena.prepend(canvas);
  const {vertices:rest,props,flames,clusterStart,clusterEnd,shadowStart,ghostStart}=window.buildCabinMesh();
  const mesh=rest.slice();
  const movingStart=clusterStart;
  const movingVertices=mesh.subarray(movingStart);
  const glows=flames.map(()=>{
    const glow=document.createElement("i");
    glow.className="candle-halo";
    glow.setAttribute("aria-hidden","true");
    arena.prepend(glow);
    return glow;
  });
  const vertexCount = mesh.length / 7;
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
  document.documentElement.style.setProperty("--candle-light",roomLight.toFixed(3));
  // World X/Z, footprint radius, and intensity of the overhead selection light.
  const spotlight=new Float32Array([0,0,1,0]);

  // The same perspective camera drives both renderers. Row 2 is positive camera depth.
  function cameraRows(x, y, kick, time) {
    const yaw = -.041*x + .013*kick*Math.sin(time*83);
    const pitch = -.151 - .031*y + .023*kick*Math.cos(time*72);
    const roll = .014*kick*Math.sin(time*66);
    const eye = [x*.76 + .15*kick*Math.cos(time*89), 3.73-y*.28 + .095*kick*Math.sin(time*97), 7.65+.16*kick];
    const sy=Math.sin(yaw), cy=Math.cos(yaw), sp=Math.sin(pitch), cp=Math.cos(pitch);
    const right=[cy,0,sy], up=[-sy*sp,cp,cy*sp], forward=[sy*cp,sp,-cy*cp];
    const cr=Math.cos(roll), sr=Math.sin(roll);
    const axes=[right.map((v,i)=>v*cr+up[i]*sr), up.map((v,i)=>v*cr-right[i]*sr), forward];
    return axes.map(axis=>[...axis,-axis.reduce((sum,v,i)=>sum+v*eye[i],0)]);
  }

  function gpuRenderer(gl) {
    function compile(type, source) {
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER, `attribute vec3 position,tint; attribute float grain;
uniform vec4 right,up,forward; uniform vec2 scale;
varying vec3 world,color; varying float material;
void main(){
 vec4 p=vec4(position,1.); float depth=dot(p,forward);
 gl_Position=vec4(dot(p,right)*scale.x,dot(p,up)*scale.y,1.0025*depth-.20025,depth);
 world=position; color=tint; material=grain;
}`);
    const fragment = compile(gl.FRAGMENT_SHADER, `precision mediump float;
varying vec3 world,color; varying float material;
uniform vec4 lamps[5];
uniform float roomLight;
uniform vec4 spotlight;
void main(){
 if(material>4.5){gl_FragColor=vec4(.045,.029,.018,(material-5.)*(.36+.64*roomLight));return;}
 vec3 c=color;
 if(material>.5 && material<3.5){
   vec2 grain=material<1.5 ? vec2(world.x,world.y+world.z) : material<2.5 ? vec2(world.y,world.x+world.z) : vec2(world.z,world.x+world.y);
   float drift=sin(grain.x*1.2+grain.y*2.4)*.10+sin(grain.x*.45+grain.y*5.)*.12;
   float rings=fract((grain.y+drift)*7.2);
   float broken=sin(grain.x*2.+grain.y*7.)+sin(grain.x*.7-grain.y*3.);
   c*=1.+.040*sin((grain.y+drift)*55.)-.19*step(.82,rings)*smoothstep(-.35,.42,broken);
 }
 float night=1.-roomLight;
 if(material< -2.5 && material> -3.5){
   // The visible flame itself is emissive.
 }else if(material< -1.5 && material> -2.5){
   c=mix(c,vec3(.93,.94,.80),night*night*night);
 }else if(material< -.5 && material> -1.5){
   c*=1.+.76*night;
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
   if(material<3.5) c+=vec3(.083,.040,.010)*active;
   if(material< -3.5) c+=vec3(.055,.066,.065)*night;
   if(spotlight.w>0. && world.y>=1.51){
     float radius=max(spotlight.z*.45,spotlight.z-.19*(world.y-1.53));
     vec2 offset=(world.xz-spotlight.xy)/radius;
     float falloff=max(0.,1.-dot(offset,offset));
     c+=(color*vec3(.77,.68,.50)+vec3(.052,.043,.029))*falloff*falloff*spotlight.w;
   }
 }
 vec2 px=floor(gl_FragCoord.xy);
 float d=mod(px.x,2.)*.5+mod(px.y,2.)*.25-.375;
 c=floor(c*43.+.5+d*.68)/43.;
 gl_FragColor=vec4(c,1.);
}`);
    const program=gl.createProgram();
    gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.DYNAMIC_DRAW);
    for(const [name,size,offset] of [["position",3,0],["tint",3,12],["grain",1,24]]){
      const attr=gl.getAttribLocation(program,name);
      gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr,size,gl.FLOAT,false,28,offset);
    }
    const rows=["right","up","forward"].map(name=>gl.getUniformLocation(program,name));
    const scale=gl.getUniformLocation(program,"scale");
    const lamps=gl.getUniformLocation(program,"lamps[0]");
    const ambient=gl.getUniformLocation(program,"roomLight");
    const spot=gl.getUniformLocation(program,"spotlight");
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST); gl.clearColor(.12,.18,.17,1);
    return (camera,focal) => {
      gl.bufferSubData(gl.ARRAY_BUFFER,movingStart*4,movingVertices);
      gl.uniform4fv(lamps,lampData);
      gl.uniform1f(ambient,roomLight);
      gl.uniform4fv(spot,spotlight);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      camera.forEach((row,i)=>gl.uniform4fv(rows[i],row));
      gl.uniform2f(scale,2*focal/canvas.width,2*focal/canvas.height);
      gl.drawArrays(gl.TRIANGLES,0,vertexCount);
    };
  }

  // Software depth-buffer rasterizer for machines without WebGL. It uses the actual room mesh.
  function softwareRenderer(ctx) {
    let image, pixels, depths;
    const xyDepth=new Float32Array(vertexCount*3);
    const pack=(r,g,b)=> (255<<24) | (b<<16) | (g<<8) | r;
    const palette=new Uint32Array(vertexCount/3*4);
    const litTones=new Uint32Array(4);
    function shadeTriangle(i,material,x,y,z){
      let red=1,green=1,blue=1,addR=0,addG=0,addB=0;
      const night=1-roomLight;
      if(material===-2){
        const glow=night**3;
        red=green=blue=1-glow;
        addR=237*glow; addG=240*glow; addB=204*glow;
      }else if(material===-1){
        red=green=blue=1+.76*night;
      }else if(material>=0 || material===-4){
        let total=0,active=0;
        for(let k=0;k<lampData.length;k+=4){
          const dx=x-lampData[k],dy=y-lampData[k+1],dz=z-lampData[k+2];
          const weight=1/(.42+dx*dx+dy*dy+dz*dz);
          total+=weight; active+=weight*lampData[k+3];
        }
        const lit=.56*active/total+.44*roomLight;
        red=.07+.93*lit; green=.095+.905*lit; blue=.14+.86*lit;
        if(material<3.5){addR=21.2*active;addG=10.2*active;addB=2.55*active;}
        if(material===-4){addR+=14*night;addG+=17*night;addB+=17*night;}
        if(spotlight[3]>0 && y>=1.51){
          const radius=Math.max(spotlight[2]*.45,spotlight[2]-.19*(y-1.53));
          const dx=x-spotlight[0], dz=z-spotlight[1];
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
    return ([right,up,forward],focal) => {
      const w=canvas.width,h=canvas.height;
      if (!image || image.width!==w || image.height!==h){
        image=ctx.createImageData(w,h); pixels=new Uint32Array(image.data.buffer); depths=new Float32Array(w*h);
      }
      pixels.fill(pack(35,53,51)); depths.fill(0);
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
        const shadow=(material-5)*(.36+.64*roomLight);
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
  if(!draw){ canvas.remove(); return; }

  const motion=matchMedia("(prefers-reduced-motion: reduce)");
  let targetX=0,targetY=0,x=0,y=0,hit=-Infinity,frame=0,previous=0,visible=true;
  let idleTimer;
  function schedule(){
    clearTimeout(idleTimer);
    if(!frame && visible && !document.hidden) frame=requestAnimationFrame(render);
  }
  const deckButton = document.getElementById("deck");
  const deckZone = deckButton.closest(".deckzone");
  const bellButton = document.getElementById("end");
  const hoverInput=matchMedia("(hover: hover)");
  const projected=new Float32Array(mesh.length/7*2);
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
  const litProps=[deckButton,shuffleButton,bellButton];
  const shaft=document.createElement("i");
  shaft.className="table-light-shaft";
  shaft.setAttribute("aria-hidden","true");
  shaft.hidden=true;
  arena.prepend(shaft);
  let lastSpot=-1;
  const candleNames=["烛台上的高蜡烛","烛台上的中蜡烛","烛台上的矮蜡烛","桌边的蜡烛","窗边的蜡烛"];
  const candleOutlines=flames.map((_,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.tabIndex=-1;
    button.className="candle-switch";
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
  const ghostButton = encounter.querySelector(".ghost");
  const ghostOutline = prepareOutline(ghostButton, ghostButton);
  let heavyHit = false;
  let remaining = 0, drawAt = -Infinity, returnedAt = -Infinity, bellAt = -Infinity, shuffleAt = -Infinity;
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
    const sp=Math.sin(-.151), cp=Math.cos(-.151), dy=1.53-3.73;
    const baseDepth=dy*sp-(z-7.65)*cp;
    // On ultrawide screens keep the props within arm's reach in the visible strip of table.
    const wide=Math.max(1,width/1920);
    if(wide>1) {
      const back=(-2.07*cp-8.82*sp)/(-2.07*sp+8.82*cp);
      const slope=back+((dy*cp+(z-7.65)*sp)/baseDepth-back)/wide;
      z=7.65+dy*(slope*sp-cp)/(sp+slope*cp);
    }
    const depth=dy*sp-(z-7.65)*cp;
    scale*=depth/(baseDepth*wide);
    return { x:(fraction-.5)*w*depth/focal, z, scale };
  }

  // Fit the native button to the rendered silhouette, including the raised bell knob.
  function followModel(control, outline, first, last, camera, focal, w, h, width, height) {
    const {button,layer,ctx}=outline;
    const returning=button === deckButton && button.matches(".over,.returning");
    const highlighted=ctx && (button === ghostButton ? button.matches(".over") : returning || button.classList.contains("prop-cue") || (hoverInput.matches && button.matches(":hover")));
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
    ctx.lineWidth=button === ghostButton ? 4 : returning ? 3.8 : 2.8;
    ctx.strokeStyle=returning ? "#e57260" : "#e8c574";
    ctx.stroke(path);
    ctx.globalCompositeOperation="destination-out";
    ctx.fill(path);
    ctx.globalCompositeOperation="source-over";
  }
  function render(now){
    frame=0;
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width || !height || !visible || document.hidden) return;
    const resolution=Math.min(.64,(gpu?860:510)/width,(gpu?530:330)/height);
    const w=Math.max(1,Math.round(width*resolution)),h=Math.max(1,Math.round(height*resolution));
    if(canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; }
    const step=1-Math.exp(-Math.min(48,previous ? now-previous : 16)/80);
    previous=now;
    x+=(targetX-x)*step; y+=(targetY-y)*step;
    const seconds=Math.max(0,(now-hit)/1000);
    const shakeTime=heavyHit ? .32 : .15;
    const kick=seconds<shakeTime ? (heavyHit ? .86 : .22)*(1-seconds/shakeTime)**2 : 0;
    const focal=width<=720 ? Math.max(w*.66,stage.offsetHeight*1.92*h/height) : Math.max(h*.94,w*.50);
    const cameraX=x*Math.min(1,width/1000);
    const camera=cameraRows(cameraX,y*.78,kick,kick ? seconds : 0);
    // Shift the horizon as the mobile hand wraps; the far edge of the table stays in the stage.
    const dot=(row,px,py,pz)=>row[0]*px+row[1]*py+row[2]*pz+row[3];
    const baseY=1.66, baseZ=-1.17;
    const depth=(baseY-3.73)*Math.sin(-.151)-(baseZ-7.65)*Math.cos(-.151);
    const neutralUp=(baseY-3.73)*Math.cos(-.151)+(baseZ-7.65)*Math.sin(-.151);
    const neutralY=h/2-focal*neutralUp/depth;
    const lift=(neutralY-(stage.offsetHeight-38)*h/height)/focal;
    camera[1]=camera[1].map((v,i)=>v+lift*camera[2][i]);
    const actorX=width<=720 ? .223*w/focal*depth : 0;
    const sceneTime=motion.matches ? 0 : now*.001;
    const recoil=seconds<.58 ? (heavyHit ? 2.7 : .50)*Math.exp(-seconds*7.7)*Math.sin(seconds*16) : 0;
    const roll=!heavyHit && seconds<.4 ? .27*Math.exp(-seconds*9)*Math.sin(seconds*25) : 0;
    const rollCos=Math.cos(roll), rollSin=Math.sin(roll);
    const tilt=-.38*recoil, co=Math.cos(tilt),si=Math.sin(tilt);
    const hover=.032*Math.sin(sceneTime*2.1);
    // Turn the whole shell slightly toward the moving viewer, with its face printed on the mesh.
    const yaw=Math.atan2(.76*cameraX-actorX,7.65-baseZ);
    const cosYaw=Math.cos(yaw),sinYaw=Math.sin(yaw);
    for(let i=shadowStart;i<ghostStart;i+=7) mesh[i]=rest[i]+actorX;
    for(let i=ghostStart;i<mesh.length;i+=7){
      const localX=rest[i]*rollCos-(rest[i+1]-.85)*rollSin;
      const localY=.85+rest[i]*rollSin+(rest[i+1]-.85)*rollCos;
      const localZ=rest[i+2], tiltedZ=si*localY+co*localZ;
      mesh[i]=actorX+cosYaw*localX+sinYaw*tiltedZ;
      mesh[i+1]=baseY+hover+.12*recoil+co*localY-si*localZ;
      mesh[i+2]=baseZ-1.32*recoil-sinYaw*localX+cosYaw*tiltedZ;
    }
    followModel(encounter,ghostOutline,ghostStart,mesh.length,camera,focal,w,h,width,height);
    // On a portrait display bring the candleholder into the right side of the shot.
    const narrow=width<=720;
    const candleScale=narrow ? .83 : 1;
    const clusterX=narrow ? .32*w/focal*5.0 : 3.12;
    const clusterZ=narrow ? 2.65 : 1.65;
    for(let i=clusterStart;i<clusterEnd;i+=7){
      mesh[i]=clusterX+(rest[i]-3.12)*candleScale;
      mesh[i+1]=1.53+(rest[i+1]-1.53)*candleScale;
      mesh[i+2]=clusterZ+(rest[i+2]-2.45)*candleScale;
    }
    let changingLight=false;
    for(const [index,flame] of flames.entries()){
      const outline=candleOutlines[index];
      const button=outline.button;
      const target=Number(candlesLit[index]);
      brightness[index]+=(target-brightness[index])*(motion.matches ? 1 : step);
      if(Math.abs(target-brightness[index])<.006) brightness[index]=target;
      else changingLight=true;
      const power=brightness[index];
      const scale=index<3 ? candleScale : 1;
      let fx=index<3 ? clusterX+(flame.x-3.12)*scale : flame.x;
      if(index>=3) {
        // Keep the solitary candles within the narrower camera framing.
        const limit=(7.65-flame.z)*w/focal*(narrow ? .442 : .40);
        fx=Math.max(-limit,Math.min(limit,fx));
        if(narrow && index===3) fx=.012*w/focal*(7.65-flame.z);
        for(let i=flame.waxStart;i<flame.waxEnd;i+=7) mesh[i]=rest[i]+fx-flame.x;
      }
      const fz=index<3 ? clusterZ+(flame.z-2.45)*scale : flame.z;
      const wick=1.53+(flame.y-1.53)*scale;
      const t=sceneTime+flame.phase;
      const sway=.105*Math.sin(3.6*t)+.046*Math.sin(8.4*t+.7);
      const pulse=.67*Math.sin(4.7*t)+.33*Math.sin(10.6*t+1);
      for(let i=flame.start;i<flame.end;i+=7){
        const dy=rest[i+1]-flame.y;
        mesh[i]=fx+(rest[i]-flame.x+sway*(dy/.46)**2)*scale*power;
        mesh[i+2]=fz+(rest[i+2]-flame.z)*scale*power;
        mesh[i+1]=wick+dy*(1+.13*pulse)*scale*power;
        mesh[i+3]=Math.min(1,rest[i+3]*(.96+.04*pulse));
        mesh[i+4]=rest[i+4]*(.94+.06*pulse);
      }
      const fy=wick+.2*scale, d=dot(camera[2],fx,fy,fz);
      const cx=(w/2+focal*dot(camera[0],fx,fy,fz)/d)*width/w;
      const cy=(h/2-focal*dot(camera[1],fx,fy,fz)/d)*height/h;
      const size=focal/d*width/w*scale*(1.24+.07*pulse);
      const glow=glows[index];
      glow.style.transform="translate("+cx+"px,"+cy+"px) translate(-50%,-50%)";
      glow.style.width=size+"px"; glow.style.height=size+"px"; glow.style.opacity=power*(.58+.10*pulse);
      const k=index*4;
      lampData[k]=fx; lampData[k+1]=fy; lampData[k+2]=fz;
      lampData[k+3]=power*(1+.065*pulse);
      // The hit target spans the wax and wick even when the flame is gone.
      const base=wick-flame.h*scale, baseDepth=dot(camera[2],fx,base,fz);
      const bottom=(h/2-focal*dot(camera[1],fx,base,fz)/baseDepth)*height/h;
      const radius=focal/d*width/w*scale;
      button.style.left=cx+"px"; button.style.top=(cy-.18*radius)+"px";
      button.style.width=Math.max(22,2.25*flame.r*radius)+"px";
      button.style.height=Math.max(24,(bottom-cy)*(narrow && index<3 ? .45 : 1)+.18*radius)+"px";
      button.style.zIndex=index<3 ? (index===2 ? 4 : 3) : 2;
      followModel(outline.layer,outline,flame.waxStart,flame.waxEnd,camera,focal,w,h,width,height);
    }
    const light=brightness.reduce((sum,n)=>sum+n,0)/brightness.length;
    if(light!==roomLight){
      roomLight=light;
      document.documentElement.style.setProperty("--candle-light",light.toFixed(3));
    }
    const compact=width<=1050;
    const deckAnchor=tablePosition(compact ? .235 : .125, narrow ? 3.49 : compact ? 2.96 : 4.01, compact ? .55 : .52,w,focal,width);
    const shuffleAnchor=tablePosition(narrow ? .48 : compact ? .43 : .245, narrow ? 3.72 : compact ? 3.25 : 4.06, narrow ? .48 : .55,w,focal,width);
    const bellAnchor=tablePosition(compact ? .745 : .835, narrow ? 3.63 : compact ? 3.11 : 3.93, .594,w,focal,width);
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
    const watchTarget=(hoverInput.matches && shuffleButton.matches(":hover")) ? 1.17 : 0;
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
    const selected=deckButton.matches(".over") ? 0 : over>=0 ? over :
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
      const anchor=lastSpot===0 ? deckAnchor : lastSpot===1 ? pivot : bellAnchor;
      const radius=anchor.scale*(lastSpot===0 ? 1.65 : 1.28);
      spotlight[0]=anchor.x; spotlight[1]=anchor.z; spotlight[2]=radius;

      // Project the top and foot of the same cone so the shaft follows camera parallax.
      const topY=1.53+radius*3.7;
      const bottomDepth=dot(camera[2],anchor.x,1.53,anchor.z);
      const topDepth=dot(camera[2],anchor.x,topY,anchor.z);
      const bottomX=width*(.5+focal/w*dot(camera[0],anchor.x,1.53,anchor.z)/bottomDepth);
      const bottomY=height*(.5-focal/h*dot(camera[1],anchor.x,1.53,anchor.z)/bottomDepth);
      const topX=width*(.5+focal/w*dot(camera[0],anchor.x,topY,anchor.z)/topDepth);
      const top=height*(.5-focal/h*dot(camera[1],anchor.x,topY,anchor.z)/topDepth);
      const length=Math.max(1,bottomY-top);
      const spread=radius*focal*width/(w*bottomDepth);
      shaft.style.left=(bottomX-spread)+"px"; shaft.style.top=top+"px";
      shaft.style.width=2*spread+"px"; shaft.style.height=length+"px";
      shaft.style.transform="skewX("+Math.atan((bottomX-topX)/length)+"rad)";
      shaft.style.setProperty("--spread",Math.atan(spread/(length*1.35))+"rad");
      shaft.style.opacity=spotlight[3];
    }
    draw(camera,focal);
    canvas.classList.add("painted");
    arena.classList.add("modeled");
    if(!motion.matches) {
      if(spotMoving || changingLight || watchTilt!==watchTarget || stackLift!==liftTarget || cutting || drawTime<250 || returnTime<240 || bellTime<500 || kick || seconds<.6 || Math.abs(targetX-x)+Math.abs(targetY-y)>.001) schedule();
      else idleTimer=setTimeout(schedule,gpu ? 50 : 105);
    }
  }
  function center(){targetX=targetY=0; schedule();}
  const input=arena;
  input.addEventListener("pointermove",event=>{
    if(motion.matches || event.pointerType!=="mouse") return;
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
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)schedule();}).observe(canvas);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.addEventListener("pageshow",()=>{hit=-Infinity;previous=0;center();});
  canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();canvas.classList.remove("painted");visible=false;});
  canvas.addEventListener("webglcontextrestored",()=>{makeRenderer();visible=true;schedule();});
  schedule();
})();
