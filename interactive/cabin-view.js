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
uniform float lightPulse;
uniform vec3 clusterLight;
void main(){
 if(material>4.5){gl_FragColor=vec4(.045,.029,.018,material-5.);return;}
 vec3 c=color;
 if(material>.5 && material<3.5){
   vec2 grain=material<1.5 ? vec2(world.x,world.y+world.z) : material<2.5 ? vec2(world.y,world.x+world.z) : vec2(world.z,world.x+world.y);
   float drift=sin(grain.x*1.2+grain.y*2.4)*.10+sin(grain.x*.45+grain.y*5.)*.12;
   float rings=fract((grain.y+drift)*7.2);
   float broken=sin(grain.x*2.+grain.y*7.)+sin(grain.x*.7-grain.y*3.);
   c*=1.+.040*sin((grain.y+drift)*55.)-.19*step(.82,rings)*smoothstep(-.35,.42,broken);
 }
 if(material<3.5 && world.y<3.12){
   vec3 lamp=world-clusterLight;
   vec3 taper=world-vec3(-2.26,2.36,-.85);
   float pool=.34/(.55+dot(lamp,lamp))+.18/(.48+dot(taper,taper));
   c+=vec3(.86,.40,.105)*pool*(.90+.10*lightPulse);
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
    const cluster=gl.getUniformLocation(program,"clusterLight");
    const light=gl.getUniformLocation(program,"lightPulse");
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST); gl.clearColor(.12,.18,.17,1);
    return (camera,focal,pulse,clusterX,clusterY,clusterZ) => {
      gl.bufferSubData(gl.ARRAY_BUFFER,movingStart*4,movingVertices);
      gl.uniform1f(light,pulse);
      gl.uniform3f(cluster,clusterX,clusterY,clusterZ);
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
        const shadow=mesh[i*7+6]-5;
        const ux=cy/det,uy=-cx/det,vx=-by/det,vy=bx/det, db=xyDepth[j+5]-d,dc=xyDepth[j+8]-d;
        for(let py=top;py<=bottom;py++){
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
            pixels[index]=palette[i/3*4+((px&1)+2*(py&1))];
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
  function prepareOutline(button) {
    const layer=document.createElement("canvas");
    layer.className="prop-outline";
    layer.hidden=true;
    button.querySelector(".control-art").append(layer);
    for(const event of ["pointerenter","pointerleave","focus","blur"]) button.addEventListener(event,schedule);
    new MutationObserver(schedule).observe(button,{attributes:true,attributeFilter:["class"]});
    return {button, layer, ctx:layer.getContext("2d")};
  }
  const deckOutline=prepareOutline(deckButton), bellOutline=prepareOutline(bellButton);
  let remaining = 0, drawAt = -Infinity, returnedAt = -Infinity, bellAt = -Infinity;
  arena.addEventListener("deck-size", event => { remaining = event.detail; schedule(); });
  arena.addEventListener("deck-draw", () => { drawAt = performance.now(); schedule(); });
  arena.addEventListener("deck-return", () => { returnedAt = performance.now(); schedule(); });
  arena.addEventListener("ring-bell", () => { bellAt = performance.now(); schedule(); });

  // Cue each prop once, when it is actually visible; a player's first action takes priority.
  const cueStarted = new Map();
  const cueTimers = new Map();
  function clearCue(button) {
    clearTimeout(cueTimers.get(button));
    cueTimers.delete(button);
    button.classList.remove("prop-cue");
    cueStarted.delete(button);
  }
  const cueObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const button = entry.target;
      clearCue(button);
      if (entry.intersectionRatio < .5) continue;
      cueTimers.set(button,setTimeout(() => {
        cueObserver.unobserve(button);
        if (document.hidden || button.matches(":hover,:focus-visible")) return;
        cueStarted.set(button,performance.now());
        button.classList.add("prop-cue");
        cueTimers.set(button,setTimeout(() => clearCue(button),1250));
      },button === deckButton ? 550 : 2150));
    }
  }, {threshold:.5});
  for (const button of [deckButton,bellButton]) cueObserver.observe(button);
  function endCues() {
    cueObserver.disconnect();
    clearCue(deckButton);
    clearCue(bellButton);
  }
  arena.addEventListener("pointerdown",endCues,{once:true,capture:true});
  document.addEventListener("keydown",endCues,{once:true,capture:true});

  let deckView;
  const leafYaw = i => -.18 + .038*Math.sin(i*3.8);
  const leafHeight = i => .13 + i*.067;

  // Project the four corners of the next card so the returning artwork lands on the stack.
  arena.addEventListener("deck-landing", event => {
    if (!deckView) return;
    const {anchor,camera,focal,w,h} = deckView;
    const bounds = canvas.getBoundingClientRect();
    const layer = Math.min(remaining, props.leaves.length-1);
    const yaw = leafYaw(layer), co = Math.cos(yaw), si = Math.sin(yaw);
    const y = 1.533 + anchor.scale*(leafHeight(layer)+.062);
    event.detail.corners = [[-.565,-.78],[.565,-.78],[.565,.78],[-.565,.78]].map(([u,v]) => {
      const x = anchor.x+anchor.scale*(u*co+v*si);
      const z = anchor.z+anchor.scale*(v*co-u*si);
      const [right,up,depth] = camera.map(row => row[0]*x+row[1]*y+row[2]*z+row[3]);
      return [bounds.left+bounds.width*(.5+focal/w*right/depth),
        bounds.top+bounds.height*(.5-focal/h*up/depth)];
    });
  });

  function placePart(part, base, height=0, yaw=0, tilt=0, visible=true) {
    const co=Math.cos(yaw), si=Math.sin(yaw), ct=Math.cos(tilt), st=Math.sin(tilt);
    const scale=visible ? base.scale : 0;
    for (let i=part.start;i<part.end;i+=7) {
      const x=rest[i], y=rest[i+1], z=rest[i+2];
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
    const returning=button.matches(".over,.returning");
    const highlighted=ctx && (returning || button.classList.contains("prop-cue") || button.matches(":focus-visible") || (hoverInput.matches && button.matches(":hover")));
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
    const kick=seconds<.38 ? (1-seconds/.38)**2 : 0;
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
    const recoil=seconds<.58 ? 2.5*Math.exp(-seconds*7.7)*Math.sin(seconds*16) : 0;
    const tilt=-.38*recoil, co=Math.cos(tilt),si=Math.sin(tilt);
    const hover=.032*Math.sin(sceneTime*2.1);
    // Turn the whole shell slightly toward the moving viewer, with its face printed on the mesh.
    const yaw=Math.atan2(.76*cameraX-actorX,7.65-baseZ);
    const cosYaw=Math.cos(yaw),sinYaw=Math.sin(yaw);
    for(let i=shadowStart;i<ghostStart;i+=7) mesh[i]=rest[i]+actorX;
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(let i=ghostStart;i<mesh.length;i+=7){
      const localX=rest[i],localY=rest[i+1],localZ=rest[i+2];
      const tiltedZ=si*localY+co*localZ;
      const px=mesh[i]=actorX+cosYaw*localX+sinYaw*tiltedZ;
      const py=mesh[i+1]=baseY+hover+.12*recoil+co*localY-si*localZ;
      const pz=mesh[i+2]=baseZ-1.32*recoil-sinYaw*localX+cosYaw*tiltedZ;
      const distance=dot(camera[2],px,py,pz);
      const cx=w/2+focal*dot(camera[0],px,py,pz)/distance;
      const cy=h/2-focal*dot(camera[1],px,py,pz)/distance;
      left=Math.min(left,cx); right=Math.max(right,cx); top=Math.min(top,cy); bottom=Math.max(bottom,cy);
    }
    encounter.style.transform="translate("+left*width/w+"px,"+top*height/h+"px)";
    encounter.style.width=(right-left)*width/w+"px";
    encounter.style.height=(bottom-top)*height/h+"px";
    // On a portrait display bring the candleholder into the right side of the shot.
    const narrow=width<=720;
    const candleScale=narrow ? .52 : 1;
    const clusterX=narrow ? .43*w/focal*6.5 : 3.12;
    const clusterZ=narrow ? .65 : 1.65;
    for(let i=clusterStart;i<clusterEnd;i+=7){
      mesh[i]=clusterX+(rest[i]-3.12)*candleScale;
      mesh[i+1]=1.53+(rest[i+1]-1.53)*candleScale;
      mesh[i+2]=clusterZ+(rest[i+2]-2.45)*candleScale;
    }
    for(const [index,flame] of flames.entries()){
      const scale=index<3 ? candleScale : 1;
      const fx=index<3 ? clusterX+(flame.x-3.12)*scale : flame.x;
      const fz=index<3 ? clusterZ+(flame.z-2.45)*scale : flame.z;
      const wick=1.53+(flame.y-1.53)*scale;
      const t=sceneTime+flame.phase;
      const sway=.105*Math.sin(3.6*t)+.046*Math.sin(8.4*t+.7);
      const pulse=.67*Math.sin(4.7*t)+.33*Math.sin(10.6*t+1);
      for(let i=flame.start;i<flame.end;i+=7){
        const dy=rest[i+1]-flame.y;
        mesh[i]=fx+(rest[i]-flame.x+sway*(dy/.46)**2)*scale;
        mesh[i+2]=fz+(rest[i+2]-flame.z)*scale;
        mesh[i+1]=wick+dy*(1+.13*pulse)*scale;
        mesh[i+3]=Math.min(1,rest[i+3]*(.96+.04*pulse));
        mesh[i+4]=rest[i+4]*(.94+.06*pulse);
      }
      const fy=wick+.2*scale, d=dot(camera[2],fx,fy,fz);
      const cx=(w/2+focal*dot(camera[0],fx,fy,fz)/d)*width/w;
      const cy=(h/2-focal*dot(camera[1],fx,fy,fz)/d)*height/h;
      const size=focal/d*width/w*scale*(1.24+.07*pulse);
      const glow=glows[index];
      glow.style.transform="translate("+cx+"px,"+cy+"px) translate(-50%,-50%)";
      glow.style.width=size+"px"; glow.style.height=size+"px"; glow.style.opacity=.58+.10*pulse;
    }
    const compact=width<=1050;
    const deckAnchor=tablePosition(compact ? .245 : .168, compact ? 3.49 : 4.01, narrow ? .638 : .594,w,focal,width);
    const bellAnchor=tablePosition(compact ? .745 : .835, narrow ? 3.63 : compact ? 3.11 : 3.93, .594,w,focal,width);
    deckView={anchor:deckAnchor,camera,focal,w,h};
    const elapsed=t=>motion.matches ? Infinity : Math.max(0,now-t);
    const drawTime=elapsed(drawAt), returnTime=elapsed(returnedAt), bellTime=elapsed(bellAt);
    const pulse=(t,duration)=>t<duration ? Math.sin(Math.PI*t/duration) : 0;
    const deckCue=pulse(elapsed(cueStarted.get(deckButton) ?? -Infinity),1250);
    const bellCue=pulse(elapsed(cueStarted.get(bellButton) ?? -Infinity),1250);
    const count=Math.min(props.leaves.length,remaining);
    const liftTop=.095*deckCue+.13*pulse(drawTime,250)+.035*pulse(returnTime,210);
    const receive=deckButton.classList.contains("over") && !motion.matches ? .10 : 0;
    const angle=-.18;
    placePart(props.deckShadow,deckAnchor,0,angle);
    placePart(props.bellShadow,bellAnchor);
    placePart(props.deckBase,deckAnchor,0,angle);
    props.leaves.forEach((leaf,i)=>{
      const top=i===count-1;
      placePart(leaf,deckAnchor,leafHeight(i)+(top ? liftTop+receive : 0),
        leafYaw(i),top ? -.12*pulse(drawTime,250) : 0,i<count);
    });
    placePart(props.bellBase,bellAnchor);
    const wobble=.045*Math.sin(2*Math.PI*bellCue)*bellCue + (bellTime<500 ? .12*Math.sin(bellTime*.054)*Math.exp(-bellTime/145) : 0);
    placePart(props.dome,bellAnchor,0,0,wobble);
    placePart(props.plunger,bellAnchor,-.14*pulse(bellTime,190),0,wobble);
    followModel(deckZone,deckOutline,props.deckBase.start,count ? props.leaves[count-1].end : props.deckBase.end,camera,focal,w,h,width,height);
    followModel(bellButton,bellOutline,props.bellBase.start,props.plunger.end,camera,focal,w,h,width,height);
    draw(camera,focal,Math.sin(4.7*sceneTime),clusterX,1.53+1.05*candleScale,clusterZ);
    canvas.classList.add("painted");
    arena.classList.add("modeled");
    if(!motion.matches) {
      if(drawTime<250 || returnTime<240 || bellTime<500 || kick || seconds<.6 || Math.abs(targetX-x)+Math.abs(targetY-y)>.001) schedule();
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
  arena.addEventListener("cabin-hit",()=>{
    if(motion.matches) return;
    hit=performance.now(); schedule();
    navigator.vibrate?.(32);
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
