// Read each PNG at native resolution. Merge identical pixel runs into flat faces
// so both renderers can light and occlude the ink with the rest of the book.
async function loadBookPrint(name, leather) {
  const image = new Image();
  image.src = new URL("art/" + name + ".png", document.baseURI).href;
  await image.decode();
  const canvas = document.createElement("canvas");
  const w = canvas.width = image.naturalWidth, h = canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  let pixels;
  try {
    pixels = ctx.getImageData(0, 0, w, h);
  } catch (error) {
    if (error.name !== "SecurityError" || location.protocol !== "file:") throw error;
    // Some browsers isolate adjacent local files. Use the same lossless PNG bytes
    // in their double-click preview; online and localhost always read the PNG itself.
    image.src = "data:image/png;base64," + offlineBookPNGs[name];
    await image.decode();
    canvas.width = image.naturalWidth; // Reset the canvas origin before reading.
    ctx.drawImage(image, 0, 0);
    pixels = ctx.getImageData(0, 0, w, h);
  }
  const {data} = pixels;
  function colorAt(x, y) {
    const i = (y*w+x)*4;
    if (!data[i+3]) return -1;
    return (data[i]<<16) | (data[i+1]<<8) | data[i+2];
  }
  const rectangles = [];
  let previous = new Map();
  for (let y=0; y<h; y++) {
    const current = new Map();
    for (let x=0; x<w;) {
      const left=x, color=colorAt(x++, y);
      while (x<w && colorAt(x,y)===color) x++;
      if (color===leather || color<0) continue;
      const key = left + "/" + x + "/" + color;
      const above = previous.get(key);
      if (above) {
        above[3]++;
        current.set(key, above);
      } else {
        const rect = [left,y,x-left,1,color.toString(16).padStart(6,"0")];
        rectangles.push(rect);
        current.set(key, rect);
      }
    }
    previous = current;
  }
  return {width:w,height:h,rectangles};
}
// Generated from the adjacent images by sync-interactive.ps1.
const offlineBookPNGs = {"bloodborne":"iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAADI0lEQVR42u1aS24CMQxtI9+FA7Bjz7bX6s3YcQBu00Wk1PhvJzMMEqOq4jPx+PNsPyd8//5cb4/713tel9O5fb359THgY8C2BlxO54MbAJNFoL94YR0DW7/b497/22EJWqLFs2D/0ArKXrflphTlMg0h/eZxA6RUiaRESptsBLhWbZXvRYX6iyWV4HI6iz5trqE9DbLPuz3uXcKS/O76iKLacve/vg/wSM17cTv713figfv+Rz4p4ydkgJYohWzjei9MaNkAI1EKKBoZPGTWXOOuAlFF0ixEG7R63z/H3/KFM0Emy8Huc/H2xNnEYCJD5vikoKtmNriqY43xs0VGhJdjHjVuXp4DYKBcrKc2cmwV43lseBPHJEHmjMZMwMODTpBga+kCgQiszAOiNti7BDx2RnHgpRriVCMTCc8IUbyrREClZX9bwnLjypVlarht4n2pSmfPZVxjY6wRn2sr0wxtguyFsH+RFBVcQ5pJiErMBxd3Lh4czQaxwxjuw5SnRcZc9yvXeJzuM2ndl2PbmmhW3AaxCnGZkw14kEIelkailq0S4hKDBbp9igCSTxcOndZclXVhaqYTs2L4W/v2qRNHKDtxHn+7ZBA1ICcygO/fn6sR6zincHmv5oICc8FIAQN/NfyI2gctNPTWloAWuIgx8wN0ECf+PMAHYtcYre2LA2R8xIvQaXmgISBLGRP3Lq7XGj8rTmR2PdYYG9kycQf/5Vtdia1FzO81AneIrcWZ4SNCitZuRbZaoXC3JJZfmkmtLCs4anFrMfzw1t2GEDJ2tQwzgjDI1k0iudX4c/CRI+Pt/caZitRS0K+d1ohw4j2nBiQIugE/W2urkfPJrAvceeiJjQZF2AkQZ8L2JnFQMtS2k3a+DB4OWe03OmiJuExkMS2Vr2XtU6TIzWY8Z8I+sNmuSbeU9vZm03Y5EDqlnC/zy3mOOxX9l1FbddIEePUsn0BmaQhPQkgtEHmEMbBHfn2Tijk/clYbmSudn0ZGBlzyIypyCljAsGDA1pV+7QU11rBDncltqxgRP0ghqpO5+YK9qRfgII7cb1fiaNfbG/AHyjIuieqd4FYAAAAASUVORK5CYII=","nightreign":"iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAADKklEQVR42u1a200EMQw8In9TEXXwj0QPlEMzVEQFfCwKkR/jcZIFTtoVH+g2l7Wd8YztvYfn17fPj/fbfV6PTy/tdufX5cDlwOUAl+xVcuBXHn87HVDbTeye8vJoN0PiwIaGH78Sm9RJXn/Aysb4vVHp+p7HCazv/NtJfFjcw79+wm1jaEE62s9VAkQLUjA3Jm9wnKrpqNZ3IKkn2lR0zZAJZrRh+/x4T2OPF4Md+l03QK1EF3YL+0lkx4h7nACurdHxCnbagjX6pAfJHvdorv1/kYjKEOoWdEMPo8ewuQlqgeeCqsqtbYJtOh4UtGxcu2PKbVfIANAnTyBKLAti9U//osuS4GRI68eVkmZw5IMKfHrXNW6MOl8UjStbSiBgX8XoFlEj3raojUWjMLa6xB+d7FwFlSpJpNlSypg0kEAyU1nEcC+XEhMFZj9f8EhFuIz1uOPZU8y5nOgWZMdKRVaACaK07E+ULdYDWEdFpWV9spFS2SIWkXxpSfo24lhZHNUpfK4/PL++RbfnfCglKFOKYqZq4PZcuzT2XLbLAaBfLeaA4lbVLVq2Yn10SlL6sq3JXEOxIG603nfAqqlKNRtXvjXhrQeZPVoloLpS1S8wLro7VyGDttP6I2kXNjYukcpYPpmm4whmEYoSFgLtiA2Msn6UZxI5UeGQ54DCfVTlunbbbnB65DaR3wIU3q1PbFKCbLPrSc3ivyIu+GyxRe5excyi9T6EGGmLirCUnaqHkK5sGwM21vpnv7pdKqfdbh0n7rQgpE+XOfwBlTmDaoBEtDRmePoJuuSIf8jCiZSIlg5GIzesCJz6PqrQ1ANJriYGaND4d2SYtdoK7vFkJTqTXfMiJGQlwiYdA/3NnPXHXQGCuh3TUX0aHRQzmxB3ZnheOm4p7Ebf5OyoMwy7wkjCjKbP+63EOp82Rjt2/SzgjNa+gVLJ/iyAZ25ynnUj3mqWxyrpWxmcXjduvJ7KYvoq3xktptNFvtHhTwmMTBgPfxwoCdkWH6a3HZd9OzAhZCf5UCUADaFFy3aJCf97Ctll/UbTS4Mt5wT+m+n42uDA317XD18vBxavL0h8rHAjL9JcAAAAAElFTkSuQmCC"};
window.portfolioBookPrintsReady = Promise.all([
  loadBookPrint("bloodborne", 0x874e45),
  loadBookPrint("nightreign", 0x566477)
].map(request => request.catch(error => {
  console.warn("Book cover:", error.message);
  return null;
})));
