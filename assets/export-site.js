/* 在浏览器中打包当前草稿和网站文件，不需要服务器保存个人信息。 */
(function () {
  const encoder = new TextEncoder();
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let i = 0; i < 8; i++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(bytes) {
    let c = 0xffffffff;
    for (const byte of bytes) c = table[(c ^ byte) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function header(size) { return new Uint8Array(size); }
  function put16(bytes, offset, value) { new DataView(bytes.buffer).setUint16(offset, value, true); }
  function put32(bytes, offset, value) { new DataView(bytes.buffer).setUint32(offset, value >>> 0, true); }
  function zip(files) {
    const local = [], central = [];
    let offset = 0;
    for (const file of files) {
      const name = encoder.encode(file.name), bytes = file.bytes, crc = crc32(bytes);
      const h = header(30);
      put32(h, 0, 0x04034b50); put16(h, 4, 20); put16(h, 6, 0x800);
      put32(h, 14, crc); put32(h, 18, bytes.length); put32(h, 22, bytes.length); put16(h, 26, name.length);
      local.push(h, name, bytes);
      const c = header(46);
      put32(c, 0, 0x02014b50); put16(c, 4, 20); put16(c, 6, 20); put16(c, 8, 0x800);
      put32(c, 16, crc); put32(c, 20, bytes.length); put32(c, 24, bytes.length); put16(c, 28, name.length); put32(c, 42, offset);
      central.push(c, name);
      offset += h.length + name.length + bytes.length;
    }
    const centralSize = central.reduce((sum, item) => sum + item.length, 0);
    const end = header(22);
    put32(end, 0, 0x06054b50); put16(end, 8, files.length); put16(end, 10, files.length); put32(end, 12, centralSize); put32(end, 16, offset);
    return new Blob([...local, ...central, end], { type: "application/zip" });
  }
  window.exportPortfolioWebsite = async function (draft) {
    if (location.protocol === "file:") throw new Error("请使用在线编辑页下载完整网站，本地文件无法读取其他文件");
    const paths = new Set(["index.html", "editor.html", "assets/styles.css", "assets/main.js", "assets/schema.js", "assets/site.js", "assets/editor.js", "assets/export-site.js"]);
    for (const project of draft.projects || []) paths.add(`projects/${project.id}.html`);
    const addLocal = value => {
      if (typeof value === "string" && /^assets\/media\//.test(value)) paths.add(value.split(/[?#]/)[0]);
    };
    addLocal(draft.profile?.heroImage);
    for (const project of draft.projects || []) {
      addLocal(project.cover?.src); addLocal(project.video?.url);
      for (const item of project.gallery || []) addLocal(item.src);
      for (const item of project.resources || []) addLocal(item.url);
    }
    addLocal(draft.contact?.resumeUrl);
    const files = await Promise.all([...paths].map(async path => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`找不到文件 ${path}；请先上传该文件或修改路径`);
      return { name: path, bytes: new Uint8Array(await response.arrayBuffer()) };
    }));
    files.push({ name: "assets/site-content.js", bytes: encoder.encode(`window.PORTFOLIO_CONTENT = ${JSON.stringify(draft, null, 2)};\n`) });
    files.push({ name: ".nojekyll", bytes: new Uint8Array() });
    const url = URL.createObjectURL(zip(files));
    const link = document.createElement("a"); link.href = url; link.download = "portfolio-website.zip";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
})();
