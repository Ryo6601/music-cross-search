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

async function fetchWikipediaSearchSummary(lang, name) {
  // 検索 + 抜粋 + サムネイル + URL を 1 リクエストで取得
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  const params = {
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: name,
    gsrlimit: "1",
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
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page?.extract) return null;
  return {
    lang,
    title: page.title,
    extract: page.extract,
    thumbnail: page.thumbnail?.source || null,
    url: page.fullurl || null,
  };
}

async function getWikipediaArtist(name) {
  // 日本語版を優先。ヒットしなければ英語版にフォールバック。
  for (const lang of ["ja", "en"]) {
    try {
      const result = await fetchWikipediaSearchSummary(lang, name);
      if (result?.extract) return result;
    } catch (e) {
      console.warn(`[MCS] Wikipedia ${lang} failed:`, e);
    }
  }
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
