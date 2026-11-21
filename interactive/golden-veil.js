// The 128px portrait sits at (32, 12) inside this 192 × 164 effect.
window.createGoldenVeil = function () {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 164;
  const ctx = canvas.getContext("2d");
  const pixels = ctx?.createImageData(canvas.width, canvas.height);
  const hash = n => {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const noise = Float32Array.from({length:4096}, (_, i) => hash(i + 83));
  const tones = [[47,43,31],[66,56,34],[85,70,40],[108,88,47],[134,108,56],
    [161,131,70],[184,154,88],[204,177,111],[221,198,139],[235,218,170]];
  const clamp = x => Math.max(0, Math.min(1, x));
  function ease(x) {
    const v = clamp(x);
    return v*v*(3-2*v);
  }
  function cloud(x, y) {
    const ix=Math.floor(x), iy=Math.floor(y);
    const fx=x-ix, fy=y-iy, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy);
    const row=(iy&63)*64, next=((iy+1)&63)*64, a=ix&63, b=(ix+1)&63;
    const near=noise[row+a]*(1-u)+noise[row+b]*u;
    const far=noise[next+a]*(1-u)+noise[next+b]*u;
    return near+(far-near)*v;
  }
  function paint(t) {
    const gathering=ease(t/.43), fade=1-ease((t-.54)/.46);
    const data=pixels.data;
    data.fill(0);
    for(let y=1; y<canvas.height-1; y++){
      const height=(139-y)/132;
      // Let wisps die out before the texture ends, even at the crown.
      const verticalFade=ease(y/18)*ease((canvas.height-1-y)/15);
      for(let x=8; x<canvas.width-8; x++){
        const dx=x-96, warp=cloud(x*.037+5,y*.023+t*1.42);
        const crown=10+24*(Math.abs(dx)/65)**3;
        const drift=(warp-.5)*23;
        const depth=Math.min(63-Math.abs(dx)+drift, y-crown+drift, 140-y+drift*.8);
        if(depth<=-16) continue;
        const rise=clamp((gathering*(1.37+.14*warp)-height)*2.8);
        if(rise===0) continue;
        // The fibres keep drifting as the entire veil loses opacity.
        const flowX=x+18*(warp-.5)+7*Math.sin(y*.047+t*2+dx*.024);
        const broad=cloud(flowX*.090+2,y*.018+t*1.6);
        const fine=cloud(flowX*.20+6*broad,y*.027+t*2.30);
        const ribbon=(1-Math.abs(2*fine-1))**4;
        // Dense folds thin at different distances. Only faint, broken threads
        // persist outside the body, so no continuous bright contour forms.
        const body=ease((depth+(broad-.5)*12+5)/33);
        const wisp=ease((depth+16)/30)*(.08+.35*ribbon)*broad;
        const feather=body+(1-body)*wisp;
        const density=feather*verticalFade*rise*gathering*fade;
        const light=(.56*broad+.19*warp+.28*ribbon)*(.76+.24*body);
        const shade=tones[Math.min(tones.length-1,Math.floor(light*tones.length))];
        const i=(y*canvas.width+x)*4;
        data[i]=shade[0]; data[i+1]=shade[1]; data[i+2]=shade[2];
        data[i+3]=Math.round(255*density*(.70+.30*broad));
      }
    }
    ctx.putImageData(pixels,0,0);
    ctx.globalAlpha=gathering*fade*.7;
    ctx.fillStyle="#dec58a";
    for(let i=0; i<15; i++){
      const travel=(t*.64+hash(i+103))%1, side=i%2?1:-1;
      const x=96+side*(12+hash(i+19)*43)+2*Math.sin(i+travel*8);
      ctx.fillRect(Math.round(x),Math.round(136-travel*117),1,i%4===0?2:1);
    }
    ctx.globalAlpha=1;
    return t<.50 ? 1-ease((t-.24)/.22) : 1-fade;
  }
  return {canvas, available:Boolean(ctx), duration:2240, paint};
};
