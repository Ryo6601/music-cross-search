// ISOLATED world で動作。MAIN world の page.js が dispatch する CustomEvent を
// 受け取って chrome.storage に保存する。
// mediaSession が空のサイト向けに DOM フォールバックも持つ。

const EVENT = "__mcs_track__";

function sourceFromHost() {
  const h = location.hostname;
  if (h.includes("music.youtube.com")) return "youtube-music";
  if (h.includes("youtube.com")) return "youtube";
  if (h.includes("open.spotify.com")) return "spotify";
  if (h.includes("music.apple.com")) return "apple-music";
  return "unknown";
}

function pickText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const t = el?.textContent?.trim();
    if (t) return t;
  }
  return null;
}

function extractFromDom() {
  const host = location.hostname;
  if (host.includes("music.youtube.com")) {
    const title = pickText(["ytmusic-player-bar .title"]);
    const byline = pickText(["ytmusic-player-bar .byline"]);
    return { title, artist: byline?.split("•")[0]?.trim() || null };
  }
  if (host.includes("youtube.com")) {
    return {
      title: pickText([".ytp-title-link", "h1.ytd-watch-metadata"]),
      artist: pickText(["#owner #channel-name a"]),
    };
  }
  if (host.includes("open.spotify.com")) {
    return {
      title: pickText(['[data-testid="context-item-link"]']),
      artist: pickText(['[data-testid="context-item-info-artist"]']),
    };
  }
  if (host.includes("music.apple.com")) {
    return {
      title: pickText([".web-chrome-playback-lcd__song-name-scroll"]),
      artist: pickText([".web-chrome-playback-lcd__sub-copy-scroll"]),
    };
  }
  return { title: null, artist: null };
}

let lastKey = "";
function save(track) {
  if (!track.title) return;
  const key = `${track.title}|${track.artist || ""}`;
  if (key === lastKey) return;
  lastKey = key;
  chrome.storage.local.set({
    currentTrack: {
      ...track,
      source: sourceFromHost(),
      url: location.href,
      updatedAt: Date.now(),
    },
  });
}

// mediaSession 由来
document.addEventListener(EVENT, (e) => {
  const { title, artist, album } = e.detail || {};
  save({ title, artist, album: album || null, via: "mediaSession" });
});

// DOM フォールバック (mediaSession が無い/古い情報のサイト向け)
setInterval(() => {
  const dom = extractFromDom();
  if (dom.title) save({ ...dom, album: null, via: "dom" });
}, 3000);
