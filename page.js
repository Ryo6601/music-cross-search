// MAIN world で動作。ページの navigator.mediaSession.metadata を読んで
// isolated world の content script に CustomEvent で渡す。
//
// mediaSession.metadata は MediaSession を使うサイト (YouTube Music,
// Spotify Web, Apple Music Web, 最近の YouTube など) が再生中に設定する。
// isolated world からは内容が見えないため、ここで読む必要がある。

(() => {
  const EVENT = "__mcs_track__";

  function readMeta() {
    try {
      const m = navigator.mediaSession && navigator.mediaSession.metadata;
      if (!m) return null;
      const title = (m.title || "").trim();
      const artist = (m.artist || "").trim();
      const album = (m.album || "").trim();
      if (!title) return null;
      return { title, artist: artist || null, album: album || null };
    } catch {
      return null;
    }
  }

  let lastKey = "";
  function tick() {
    const meta = readMeta();
    if (!meta) return;
    const key = `${meta.title}|${meta.artist || ""}|${meta.album || ""}`;
    if (key === lastKey) return;
    lastKey = key;
    document.dispatchEvent(
      new CustomEvent(EVENT, { detail: { ...meta, ts: Date.now() } }),
    );
  }

  // 1.5秒間隔で metadata の変化を監視 (mediaSession には変更イベントがないため polling)
  setInterval(tick, 1500);
  tick();
})();
