window.playlistFiles = (() => {
  const folder = "assets/media/music/";
  let opening;
  function open() {
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open("portfolio-music-files-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("files");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => { opening = null; throw error; });
    return opening;
  }
  async function importFile(file) {
    const db = await open();
    const filename = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-") || "track";
    const path = folder + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + "-" + filename;
    await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").add(file, path);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
    return path;
  }
  async function get(path) {
    if (!path.startsWith(folder)) return;
    // Published site files also work when the browser does not allow local storage.
    try {
      const db = await open();
      return await new Promise((resolve, reject) => {
        const request = db.transaction("files").objectStore("files").get(path);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch { return; }
  }
  return {importFile, get};
})();
