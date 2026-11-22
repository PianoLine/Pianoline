// Seven logarithmic bands sampled at 16 frames per second. Each byte holds two
// four-bit levels, enough for the short travel of the gramophone's brass reeds.
window.gramophoneSpectrum = (() => {
  const rate = 16384, size = 1024, fps = rate / size;
  const edges = [32, 96, 224, 512, 1024, 2304, 4608, 8192];
  async function analyse(bytes, cancelled = () => false) {
    const context = new OfflineAudioContext(1, 1, rate);
    const buffer = await context.decodeAudioData(bytes);
    const channels = Array.from({length:buffer.numberOfChannels}, (_, i) => buffer.getChannelData(i));
    const frames = Math.ceil(buffer.length / size);
    const packed = new Uint8Array(frames * 4);
    const real = new Float64Array(size), imag = new Float64Array(size);
    const reverse = new Uint16Array(size), taper = new Float64Array(size);
    const cos = new Float64Array(size/2), sin = new Float64Array(size/2);
    for (let i=0;i<size;i++) {
      reverse[i]=(reverse[i>>1]>>1)|((i&1)*(size>>1));
      taper[i]=.5-.5*Math.cos(2*Math.PI*i/(size-1));
      if(i<size/2){ cos[i]=Math.cos(2*Math.PI*i/size); sin[i]=-Math.sin(2*Math.PI*i/size); }
    }
    for(let f=0;f<frames;f++) {
      if(f%128===0){
        if(cancelled()) return null;
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      imag.fill(0);
      for(let i=0;i<size;i++){
        const at=f*size+i;
        let sample=0;
        if(at<buffer.length) for(const channel of channels) sample+=channel[at];
        real[reverse[i]]=sample*taper[i]/channels.length;
      }
      for(let width=2;width<=size;width*=2){
        const half=width/2, stride=size/width;
        for(let start=0;start<size;start+=width) for(let j=0;j<half;j++){
          const a=start+j,b=a+half,k=j*stride;
          const x=real[b]*cos[k]-imag[b]*sin[k], y=real[b]*sin[k]+imag[b]*cos[k];
          real[b]=real[a]-x; imag[b]=imag[a]-y; real[a]+=x; imag[a]+=y;
        }
      }
      for(let band=0;band<7;band++){
        let energy=0;
        for(let k=edges[band]/fps;k<edges[band+1]/fps;k++) energy+=real[k]**2+imag[k]**2;
        const db=10*Math.log10(Math.max(1e-12,energy*8/(size*size)));
        const value=Math.round(15*Math.min(1,Math.max(0,(db+62+band*.8)/54)));
        packed[f*4+(band>>1)]|=value<<((band&1)*4);
      }
    }
    return packed;
  }

  function reader(siteRoot){
    let source="", samples=null, generation=0, scoreFile, pending;
    function loadScores(){
      scoreFile ??= new Promise(resolve=>{
        const script=document.createElement("script");
        script.src=new URL("assets/gramophone-scores.js?v=stream-playback",siteRoot).href;
        script.onload=script.onerror=()=>resolve(window.gramophoneScores || {});
        document.head.append(script);
      });
      return scoreFile;
    }
    async function select(url){
      source=url; samples=null;
      const version=++generation;
      pending?.abort();
      if(!url) return;
      try{
        // A preview blob can replace a shipped song with a file of the same name.
        const key=url.startsWith(siteRoot.href) ? decodeURI(url.slice(siteRoot.href.length)) : "";
        const encoded=key && (await loadScores())[key];
        if(version!==generation) return;
        if(encoded){
          samples=Uint8Array.from(atob(encoded),ch=>ch.charCodeAt(0));
        }else if(!url.startsWith("file:")){
          pending=new AbortController();
          const response=await fetch(url,{signal:pending.signal});
          if(!response.ok || version!==generation) return;
          const data=await analyse(await response.arrayBuffer(),()=>version!==generation);
          if(version===generation) samples=data;
        }
      }catch{ /* An unreadable link can still play through the original audio element. */ }
    }
    return (url,time)=>{
      if(source!==url) select(url);
      if(!samples?.length) return null;
      const position=Math.min(samples.length/4-1,Math.max(0,time*fps-.5));
      const first=Math.floor(position), next=Math.min(first+1,samples.length/4-1), mix=position-first;
      return Array.from({length:7},(_,i)=>{
        const shift=(i&1)*4, column=i>>1;
        const a=(samples[first*4+column]>>shift)&15, b=(samples[next*4+column]>>shift)&15;
        return (a+(b-a)*mix)/15;
      });
    };
  }
  return {analyse, reader};
})();
