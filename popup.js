const SERVICES = [
  {
    id: "youtube-music",
    label: "YouTube Music で検索",
    url: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "spotify",
    label: "Spotify で検索",
    url: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  },
  {
    id: "apple-music",
    label: "Apple Music で検索",
    url: (q) => `https://music.apple.com/search?term=${encodeURIComponent(q)}`,
  },
  {
    id: "youtube",
    label: "YouTube で検索",
    url: (q) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  },
];

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function openTab(url) {
  chrome.tabs.create({ url });
}

function createLinkButton({ label, onClick, className = "btn" }) {
  const a = document.createElement("a");
  a.className = className;
  a.href = "#";
  a.textContent = label;
  a.addEventListener("click", (e) => {
    e.preventDefault();
    onClick(a);
  });
  return a;
}

// ---------- アーティスト情報パネル ----------

function renderArtistInfo(info, body) {
  const wiki = info.wikipedia;
  const bioHtml = wiki
    ? `
      <div class="section-title">
        紹介 <span class="section-sub">Wikipedia (${escapeHtml(wiki.lang)})</span>
      </div>
      <div class="bio-text">${escapeHtml(wiki.extract)}</div>
      ${
        wiki.url
          ? `<a class="bio-link" href="${escapeHtml(wiki.url)}" data-url="${escapeHtml(wiki.url)}">Wikipedia で続きを読む →</a>`
          : ""
      }
    `
    : "";

  body.innerHTML = `
    <div class="artist-head">
      ${info.image ? `<img class="artist-image" src="${escapeHtml(info.image)}" alt="">` : '<div class="artist-image"></div>'}
      <div class="artist-meta">
        <div class="artist-name">${escapeHtml(info.name)}</div>
      </div>
    </div>
    ${bioHtml}
  `;

  body.querySelectorAll("[data-url]").forEach((el) => {
    const url = el.dataset.url;
    if (!url) return;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openTab(url);
    });
  });
}

async function loadArtistInfo({ artistHint }) {
  const panel = document.getElementById("artistPanel");
  const body = document.getElementById("artistBody");
  panel.classList.add("open");
  body.innerHTML = '<div class="panel-status">読み込み中…</div>';

  try {
    const res = await chrome.runtime.sendMessage({
      type: "GET_ARTIST_INFO",
      artistHint,
    });
    if (!res?.ok) {
      body.innerHTML = `<div class="panel-status err">取得失敗: ${escapeHtml(res?.error || "不明")}</div>`;
      return;
    }
    renderArtistInfo(res.info, body);
  } catch (e) {
    body.innerHTML = `<div class="panel-status err">エラー: ${escapeHtml(e.message || String(e))}</div>`;
  }
}

// ---------- メイン描画 ----------

async function render() {
  const { currentTrack } = await chrome.storage.local.get("currentTrack");
  const trackEl = document.getElementById("track");
  const linksEl = document.getElementById("links");

  if (!currentTrack || !currentTrack.title) return;

  const { title, artist, source, via } = currentTrack;
  trackEl.innerHTML = `
    <div class="title">${escapeHtml(title)}</div>
    ${artist ? `<div class="artist">${escapeHtml(artist)}</div>` : ""}
    <div class="source">取得元: ${escapeHtml(source)}${via ? ` (${escapeHtml(via)})` : ""}</div>
  `;

  const query = artist ? `${artist} ${title}` : title;
  linksEl.innerHTML = "";

  for (const s of SERVICES) {
    if (s.id === source) continue;
    const btn = createLinkButton({
      label: s.label,
      onClick: () => openTab(s.url(query)),
    });
    linksEl.appendChild(btn);
  }

  if (artist) {
    const toggleBtn = createLinkButton({
      label: "👤 アーティスト情報を表示",
      className: "btn toggle",
      onClick: (btn) => {
        const panel = document.getElementById("artistPanel");
        if (panel.classList.contains("open")) {
          panel.classList.remove("open");
          btn.textContent = "👤 アーティスト情報を表示";
        } else {
          btn.textContent = "👤 アーティスト情報を非表示";
          loadArtistInfo({ artistHint: artist });
        }
      },
    });
    linksEl.appendChild(toggleBtn);
  }
}

render();
