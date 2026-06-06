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

// アーティスト文字列を保守的に分割。"Simon & Garfunkel" や "AC/DC" は壊さないよう
// `&` や `/` は分割しない。`feat.` 系・カンマ・全角読点だけ拾う。
function splitArtistString(str) {
  if (!str) return [];
  return str
    .split(/\s+(?:feat\.?|ft\.?|featuring|with)\s+/i)
    .flatMap((p) => p.split(/\s*[,、]\s*/))
    .map((s) => s.trim())
    .filter(Boolean);
}

// Spotify Web Player は複数アーティストを個別の <a> として持っているので
// それを直接読めれば一番正確
function getArtistsFromLinks(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return null;
  const links = container.querySelectorAll("a");
  if (links.length === 0) return null;
  const names = Array.from(links)
    .map((a) => a.textContent?.trim())
    .filter(Boolean);
  return names.length > 0 ? names : null;
}

function extractFromDom() {
  const host = location.hostname;
  if (host.includes("music.youtube.com")) {
    const title = pickText(["ytmusic-player-bar .title"]);
    const byline = pickText(["ytmusic-player-bar .byline"]);
    const artistPart = byline?.split("•")[0]?.trim() || null;
    return { title, artist: artistPart };
  }
  if (host.includes("youtube.com")) {
    return {
      title: pickText([".ytp-title-link", "h1.ytd-watch-metadata"]),
      artist: pickText(["#owner #channel-name a"]),
    };
  }
  if (host.includes("open.spotify.com")) {
    // 個別 <a> 要素から各アーティスト名を取得 (一番正確)
    const artists =
      getArtistsFromLinks('[data-testid="context-item-info-artist"]') || [];
    const fallbackArtist = pickText([
      '[data-testid="context-item-info-artist"]',
    ]);
    return {
      title: pickText(['[data-testid="context-item-link"]']),
      artist: artists.length > 0 ? artists.join(", ") : fallbackArtist,
      artists,
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
  // 既に track.artists があれば優先 (Spotify DOM 由来など)、無ければ
  // artist 文字列から分割して導出
  const artists =
    Array.isArray(track.artists) && track.artists.length > 0
      ? track.artists
      : splitArtistString(track.artist);
  const key = `${track.title}|${track.artist || ""}`;
  if (key === lastKey) return;
  lastKey = key;
  chrome.storage.local.set({
    currentTrack: {
      ...track,
      artists,
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
