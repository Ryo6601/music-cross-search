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

// ---------- YouTube アーティスト名の補正 ----------

// 主要レコードレーベル。これらがチャンネル名だった場合、アーティスト名としては破棄する。
const LABEL_PATTERNS = [
  /^Universal Music/i,
  /^Sony Music/i,
  /^Warner Music/i,
  /^Avex(\s|$|\b)/i,
  /^Pony Canyon/i,
  /^Toy.?s?\s*Factory/i,
  /^Victor Entertainment/i,
  /^Nippon Columbia/i,
  /^King Records/i,
  /^Lantis/i,
  /^Epic Records/i,
  /^Defstar Records/i,
  /^Space Shower/i,
  /^Atlantic Records/i,
  /^Capitol Records/i,
  /^Republic Records/i,
  /^Columbia Records/i,
  /^Interscope/i,
  /^Def Jam/i,
  /^RCA Records/i,
  /^EMI(\s|$)/i,
  /\b(レコード|レコーズ|ミュージックジャパン)$/,
];

function isLabel(name) {
  if (!name) return false;
  return LABEL_PATTERNS.some((re) => re.test(name));
}

function normalizeYouTubeChannel(name) {
  if (!name) return null;
  let n = name.trim();
  // YouTube が自動生成する「○○ - Topic」チャンネル
  n = n.replace(/\s*-\s*Topic\s*$/i, "");
  // VEVO 接尾辞 (例: LadyGagaVEVO → LadyGaga)
  n = n.replace(/VEVO\s*$/i, "").trim();
  // Official Channel / Official YouTube Channel 等の装飾語を末尾から削除
  n = n.replace(/\s*(Official\s+(YouTube\s+)?Channel|公式チャンネル)\s*$/i, "").trim();
  if (!n) return null;
  // レーベル系なら null を返してフォールバックを促す
  if (isLabel(n)) return null;
  return n;
}

// 動画タイトルからアーティスト名を推定する。
// 装飾語を除去 → 区切り文字 (- / 「」) でパース。
function extractArtistFromYouTubeTitle(title) {
  if (!title) return null;
  let t = title;

  // (), 【】, [] で囲まれた装飾を除去 (MV / Official Music Video / Lyric Video など)
  t = t.replace(/\s*[\(（\[\【].*?[\)）\]\】]\s*/g, " ");
  // feat. / ft. 以降を削除
  t = t.replace(/\s+(feat\.?|ft\.?|featuring)\s+.+$/i, "");
  // MV / PV / Music Video が単独で末尾に残ってたら削除
  t = t.replace(/\s*[-_]\s*(Music\s+Video|Official\s+(MV|Music\s+Video|Audio|Video|Lyric\s+Video)|Lyric\s+Video|MV|PV)\s*$/i, "");
  t = t.replace(/\s+/g, " ").trim();

  // パターン1: "アーティスト「曲名」" (日本語の最頻形式)
  let m = t.match(/^(.+?)\s*[「『]/);
  if (m && m[1].trim().length > 0 && m[1].trim().length < 60) {
    return m[1].trim();
  }

  // パターン2: "アーティスト - 曲名" / "曲名 - アーティスト" (英語/日本語共通)
  m = t.match(/^(.+?)\s*[-‐−–—ー]\s*(.+)$/);
  if (m) {
    const left = m[1].trim();
    const right = m[2].trim();
    // 「」がある側を曲名扱い、無い側をアーティストにする
    const leftHasBrackets = /[「『【]/.test(left);
    const rightHasBrackets = /[「『【]/.test(right);
    if (leftHasBrackets && !rightHasBrackets) return right;
    if (rightHasBrackets && !leftHasBrackets) return left;
    // 判定不能 → 左側 (多数派) を返す
    return left;
  }

  // パターン3: "曲名 / アーティスト" (日本語の伝統的なクレジット形式)
  m = t.match(/^(.+?)\s*\/\s*(.+)$/);
  if (m) return m[2].trim(); // 後半をアーティストとする

  // パターン4: "Song by Artist"
  m = t.match(/^(.+?)\s+by\s+(.+)$/i);
  if (m) return m[2].trim();

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
    const title = pickText([".ytp-title-link", "h1.ytd-watch-metadata"]);
    const rawChannel = pickText(["#owner #channel-name a"]);
    const cleanChannel = normalizeYouTubeChannel(rawChannel);
    const fromTitle = extractArtistFromYouTubeTitle(title);
    // 優先順位: クリーンなチャンネル名 > タイトル抽出 > 生のチャンネル名
    const artist = cleanChannel || fromTitle || rawChannel;
    return { title, artist };
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
