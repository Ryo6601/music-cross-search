# プライバシーポリシー / Privacy Policy

最終更新日 / Last updated: 2026-06-04

---

## 日本語

### 取り扱うデータ

このブラウザ拡張機能 (以下「本拡張機能」) は以下のデータをユーザーのブラウザ内で取り扱います。

1. **再生中の曲の情報** (曲名・アーティスト名・取得元サービス)
   - YouTube、YouTube Music、Spotify Web、Apple Music Web のいずれかのウェブページで本拡張機能が読み取った情報
   - 取得は `navigator.mediaSession.metadata` および各サイトの DOM を介して行われます

2. **アーティスト名検索クエリ** (アーティスト情報パネル使用時のみ)
   - Wikipedia の公開 API へ検索クエリとして送信されます

### データの保存場所

- 上記 1 はブラウザのローカルストレージ (`chrome.storage.local`) にのみ保存され、開発者または第三者には一切送信されません
- ブラウザを閉じても保存されますが、拡張機能を削除すると消去されます

### 外部送信

- 本拡張機能はユーザーのデータを開発者のサーバーに送信しません
- アーティスト情報パネルを使用した場合に限り、アーティスト名のみが Wikipedia (`*.wikipedia.org`) の公開 API へ HTTPS で送信されます。これは認証情報なしの匿名リクエストです
- Wikipedia 側でのデータ取り扱いは [Wikimedia 財団のプライバシーポリシー](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy) に従います

### 検索リンクの動作

各音楽サービス (YouTube/Spotify/Apple Music) の「検索」ボタンをクリックした場合、新規タブで該当サービスの検索ページを開くのみです。本拡張機能から各サービスに対し追跡情報やユーザー識別情報を送信することはありません。

### 解析・トラッキング

- アクセス解析、エラー収集、広告配信などのトラッキング機能は一切含まれていません

### 連絡先

ご質問は GitHub Issues までお寄せください。

---

## English

### Data handled

This browser extension ("the Extension") handles the following data within the user's browser:

1. **Currently playing track information** (track name, artist name, source service)
   - Read from YouTube, YouTube Music, Spotify Web, or Apple Music Web pages
   - Obtained via `navigator.mediaSession.metadata` and the DOM of each site

2. **Artist search queries** (only when using the artist info panel)
   - Sent to Wikipedia's public API as search queries

### Where data is stored

- Item 1 is stored only in browser local storage (`chrome.storage.local`) and is never transmitted to the developer or any third party
- Data persists across browser sessions but is removed when the Extension is uninstalled

### External transmission

- The Extension does not transmit user data to any developer-operated server
- When the artist info panel is used, only the artist name is sent to Wikipedia (`*.wikipedia.org`) via HTTPS as an anonymous, unauthenticated request
- Wikipedia handles this data according to the [Wikimedia Foundation Privacy Policy](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy)

### Search link behavior

Clicking a "Search" button for any music service (YouTube / Spotify / Apple Music) opens the corresponding service's search page in a new tab. The Extension does not transmit tracking information or user identifiers to those services.

### Analytics / tracking

- The Extension does not contain any analytics, error reporting, advertising, or tracking functionality

### Contact

Please file issues via GitHub Issues.
