// Shade one native-resolution sprite before the browser scales it onto the table.
function createPortraitLight(portrait) {
  const ink = portrait.querySelector(".portrait-ink");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  canvas.className = "lit-portrait";
  const ctx = canvas.getContext("2d");
  ink.append(canvas);

  let image, column = 0, row = 0;
  let exposure = 1, left = .22, right = .24, castle = false;
  function paint() {
    if (!ctx || !image?.complete || !image.naturalWidth) return;
    ctx.clearRect(0, 0, 128, 128);
    const drawPose = () => ctx.drawImage(image, column * 128, row * 128, 128, 128, 0, 0, 128, 128);
    drawPose();
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(0,0,0,${1 - (.13 + .73 * exposure)})`;
    ctx.fillRect(0, 0, 128, 128);
    // Soft light carries the candle colour while preserving the sprite's ink and highlights.
    ctx.globalCompositeOperation = "soft-light";
    const rgb = castle ? "125,242,209" : "255,178,99";
    const tint = ctx.createLinearGradient(0, 58, 128, 70);
    tint.addColorStop(0, `rgba(${rgb},${left})`);
    tint.addColorStop(.48, `rgba(${rgb},0)`);
    tint.addColorStop(1, `rgba(${rgb},${right})`);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 128, 128);
    ctx.globalCompositeOperation = "destination-in";
    drawPose();
    ctx.restore();
    ink.classList.add("lit");
  }
  return {
    setFrame(next, x, y) {
      if (!next?.complete || !next.naturalWidth) return;
      if (image === next && column === x && row === y && ink.classList.contains("lit")) return;
      image = next;
      column = x;
      row = y;
      paint();
    },
    setLight(value, leftLight, rightLight, inCastle) {
      // Sub-percent flicker is below the colour precision of the artwork.
      const round = n => Math.round(n * 100) / 100;
      const e = round(value), l = round(leftLight), r = round(rightLight);
      if (e === exposure && l === left && r === right && inCastle === castle) return;
      exposure = e;
      left = l;
      right = r;
      castle = inCastle;
      paint();
    }
  };
}

const portraitPainter = createPortraitLight(document.querySelector(".ghost-portrait"));
