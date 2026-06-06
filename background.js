// 各サービスの検索 URL ビルダー
const SEARCH_URLS = {
  spotify: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  "youtube-music": (q) =>
    `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
  "apple-music": (q) =>
    `https://music.apple.com/search?term=${encodeURIComponent(q)}`,
  youtube: (q) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
};

// ---------- バッジでフィードバック ----------

let badgeTimer = null;
function flashBadge(text, color = "#d33", ms = 2500) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  if (badgeTimer) clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => chrome.action.setBadgeText({ text: "" }), ms);
}

async function getCurrentTrack() {
  const { currentTrack } = await chrome.storage.local.get("currentTrack");
  if (!currentTrack?.title) return null;
  return currentTrack;
}

function buildQuery(track) {
  return track.artist ? `${track.artist} ${track.title}` : track.title;
}

// ---------- Wikipedia (紹介文) ----------

async function fetchWikipediaSearchResults(lang, query, limit = 5) {
  // 検索 + 抜粋 + サムネイル + URL を 1 リクエストで取得 (上位 N 件)
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  const params = {
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrlimit: String(limit),
    gsrnamespace: "0",
    prop: "extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    pithumbsize: "200",
    inprop: "url",
    origin: "*",
  };
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return [];

  // MediaWiki が返す検索順 (index) でソート
  return Object.values(pages)
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .filter((p) => p.extract)
    .map((p) => ({
      lang,
      title: p.title,
      extract: p.extract,
      thumbnail: p.thumbnail?.source || null,
      url: p.fullurl || null,
    }));
}

// タイトル照合のための正規化
// (大文字小文字を統一し、空白・括弧・記号を除去)
function normalizeForMatch(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\.\,\(\)\[\]（）「」『』【】・]/g, "")
    .trim();
}

// 検索結果のタイトルが検索キーワードと一致するか
// (どちらかがどちらかを含むなら一致とみなす)
function titleMatchesSearch(title, searchName) {
  const t = normalizeForMatch(title);
  const s = normalizeForMatch(searchName);
  if (!t || !s) return false;
  return t.includes(s) || s.includes(t);
}

// 「これは音楽家の記事である」と思える単語が抜粋に含まれているか
const MUSIC_KW_JA =
  /歌手|ミュージシャン|バンド|シンガー|アイドル|ラッパー|音楽グループ|声優|作曲家|アーティスト|ロックグループ|楽団|演奏家|ピアニスト|ギタリスト|ドラマー/;
const MUSIC_KW_EN =
  /\b(musician|singer|band|artist|rapper|composer|songwriter|vocalist|guitarist|drummer|pianist|DJ|music\s+group|recording\s+artist|hip[\s-]?hop|rock\s+group)\b/i;

function isMusicRelated(text, lang) {
  if (!text) return false;
  return lang === "ja" ? MUSIC_KW_JA.test(text) : MUSIC_KW_EN.test(text);
}

const MUSIC_HINT = {
  ja: "(歌手 OR ミュージシャン OR バンド)",
  en: "(musician OR singer OR band)",
};

async function getWikipediaArtist(name) {
  // パス1: 音楽コンテキスト付きで上位 5 件を取得し、
  //        タイトルが検索名と一致しているもののうち music-related なものを採用
  for (const lang of ["ja", "en"]) {
    try {
      const results = await fetchWikipediaSearchResults(
        lang,
        `${name} ${MUSIC_HINT[lang]}`,
        5,
      );
      const titleMatches = results.filter((r) =>
        titleMatchesSearch(r.title, name),
      );
      for (const r of titleMatches) {
        if (isMusicRelated(r.extract, lang)) return r;
      }
    } catch (e) {
      console.warn(`[MCS] Wikipedia hinted ${lang} failed:`, e);
    }
  }

  // パス2: プレーン検索でタイトル一致を探す
  //        music-related ならベスト、無ければタイトル一致の先頭で妥協
  for (const lang of ["ja", "en"]) {
    try {
      const results = await fetchWikipediaSearchResults(lang, name, 5);
      const titleMatches = results.filter((r) =>
        titleMatchesSearch(r.title, name),
      );
      const musicHit = titleMatches.find((r) =>
        isMusicRelated(r.extract, lang),
      );
      if (musicHit) return musicHit;
      if (titleMatches.length > 0) return titleMatches[0];
    } catch (e) {
      console.warn(`[MCS] Wikipedia plain ${lang} failed:`, e);
    }
  }

  // タイトル一致するものが何も見つからなければ null
  // (誤検出した別人の情報を出すよりは「情報なし」の方が UX 上望ましい)
  return null;
}

async function getArtistInfo({ artistHint }) {
  if (!artistHint) throw new Error("アーティスト名が取得できませんでした");
  const wiki = await getWikipediaArtist(artistHint).catch(() => null);
  if (!wiki) throw new Error("Wikipedia でアーティスト情報が見つかりません");
  return {
    name: wiki.title || artistHint,
    image: wiki.thumbnail || null,
    wikipedia: wiki,
  };
}

// ---------- コンテキストメニュー ----------

const MENU_ITEMS = [
  { id: "spotify", title: "Spotify で検索" },
  { id: "youtube-music", title: "YouTube Music で検索" },
  { id: "apple-music", title: "Apple Music で検索" },
  { id: "youtube", title: "YouTube で検索" },
];

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "mcs-selection-parent",
      title: '「%s」で検索',
      contexts: ["selection"],
    });
    for (const item of MENU_ITEMS) {
      chrome.contextMenus.create({
        id: `mcs-selection-${item.id}`,
        parentId: "mcs-selection-parent",
        title: item.title,
        contexts: ["selection"],
      });
    }

    chrome.contextMenus.create({
      id: "mcs-current-parent",
      title: "再生中の曲で検索",
      contexts: ["action"],
    });
    for (const item of MENU_ITEMS) {
      chrome.contextMenus.create({
        id: `mcs-current-${item.id}`,
        parentId: "mcs-current-parent",
        title: item.title,
        contexts: ["action"],
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(setupContextMenus);
chrome.runtime.onStartup.addListener(setupContextMenus);

function runSearch(target, query) {
  if (SEARCH_URLS[target]) {
    chrome.tabs.create({ url: SEARCH_URLS[target](query) });
  }
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  const id = String(info.menuItemId);

  let query = null;
  if (id.startsWith("mcs-selection-")) {
    query = info.selectionText?.trim();
  } else if (id.startsWith("mcs-current-")) {
    const track = await getCurrentTrack();
    if (track) query = buildQuery(track);
  }

  if (!query) {
    flashBadge("?", "#888");
    return;
  }

  const target = id.replace(/^mcs-(selection|current)-/, "");
  runSearch(target, query);
});

// ---------- ショートカット ----------

chrome.commands.onCommand.addListener(async (command) => {
  const track = await getCurrentTrack();
  if (!track) {
    flashBadge("?", "#888");
    return;
  }
  const query = buildQuery(track);

  const mapping = {
    "open-spotify": "spotify",
    "open-youtube-music": "youtube-music",
    "open-apple-music": "apple-music",
    "open-youtube": "youtube",
  };
  const target = mapping[command];
  if (!target) return;
  if (track.source === target) return; // 同サービスでは何もしない
  runSearch(target, query);
});

// ---------- メッセージング ----------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GET_ARTIST_INFO") {
    (async () => {
      try {
        const info = await getArtistInfo({ artistHint: msg.artistHint });
        sendResponse({ ok: true, info });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    })();
    return true;
  }
});
