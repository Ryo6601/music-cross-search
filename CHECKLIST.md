# Chrome Web Store 公開前チェックリスト

## 1. 開発者アカウント

- [ ] [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) に Google アカウントでログイン
- [ ] $5 の一回限り登録料を支払い
- [ ] 開発者プロフィール (公開連絡先メール) を設定

## 2. 必須アセット

- [x] アイコン 16/48/128 PNG (`icons/icon{16,48,128}.png`)
- [ ] スクリーンショット 1280×800 または 640×400 (最低1枚、最大5枚)
  - 推奨: 拡張機能ポップアップを使っている画面
  - 推奨: アーティスト情報パネルを開いた画面
  - 推奨: 右クリックメニュー使用中の画面
- [ ] プロモタイル 440×280 (任意だが Featured 候補になる場合は必須)
- [x] プライバシーポリシー (`PRIVACY.md`)
  - [ ] GitHub Pages または Notion 等で **公開 URL** にする

## 3. ストア記載項目

### 拡張機能の名前
- 短い名前 (45字以内): `Music Cross Search`
- 商標を含めない (例: `Spotify Music Cross Search` は NG)

### 説明文 (説明欄)
日本語+英語の両方を用意推奨。要約 (140字) と詳細説明の2段構成。

### カテゴリ
- 推奨: `生産性向上ツール (Productivity)` または `エンターテイメント (Entertainment)`

### 言語
- 推奨: 日本語 (主) + English

## 4. manifest.json チェック

- [x] `manifest_version: 3`
- [x] `version` がセマンティック (例: `0.9.0`)
- [x] `name` / `description` 設定済み
- [x] `icons` 設定済み
- [x] `permissions` は必要最小限
  - `storage`: ローカルストレージへの保存
  - `contextMenus`: 右クリックメニュー
- [x] `host_permissions` は必要最小限
  - `*.youtube.com` / `open.spotify.com` / `music.apple.com`: 再生中の曲を取得
  - `*.wikipedia.org`: アーティスト紹介文取得

## 5. 権限の正当化文 (審査でほぼ聞かれる)

審査時のフォームに以下を貼り付け:

### Single purpose description
> A browser extension that detects the currently playing music on YouTube, YouTube Music, Spotify Web, and Apple Music Web, and allows the user to search the same track across other music services. It can also display artist information from Wikipedia without leaving the popup.

### Permission justification
- **storage**: To persist the currently playing track information across popup open/close events.
- **contextMenus**: To allow the user to right-click selected text or the extension icon and search music services.
- **host_permissions (youtube.com, open.spotify.com, music.apple.com)**: To read the currently playing track from each music service's web player via `navigator.mediaSession.metadata` and DOM selectors.
- **host_permissions (wikipedia.org)**: To query the Wikipedia public API for artist biography text.

### Remote code usage
> No remote code execution. All JavaScript is bundled.

## 6. 動作確認

- [ ] YouTube で動作 (動画ページで mediaSession 取得)
- [ ] YouTube Music で動作
- [ ] Spotify Web Player で動作
- [ ] Apple Music Web で動作
- [ ] アーティスト情報パネルが Wikipedia 日本語版で表示
- [ ] 英語版にフォールバックして表示できることを確認
- [ ] 右クリックメニュー (テキスト選択時) が機能
- [ ] 右クリックメニュー (拡張機能アイコン) が機能
- [ ] ショートカット 4 種 (Alt+Shift+M/S/Y/A) が機能
- [ ] 別言語ブラウザ (英語ロケール) でも壊れない
- [ ] アンインストール → 再インストールで挙動が変わらない

## 7. パッケージング

```bash
./build.sh
# → dist/music-cross-search-X.Y.Z.zip
```

- [ ] ZIP に開発用ファイル (`tools/`, `build.sh`, `*.md`, `dist/`) が含まれていない
- [ ] 不要なファイル (`.DS_Store`, `.git/`) が含まれていない

## 8. 公開設定

- 公開範囲を選ぶ:
  - **限定公開 (Unlisted)**: URL を知ってる人だけ。**最初はこれを推奨**
  - **公開 (Public)**: ストア検索でヒット
  - **非公開 (Private)**: 指定メールアドレス所持者のみ

- 配信地域: 全世界 or 特定の国

## 9. 提出後

- 審査期間: 通常 1〜3 営業日 (権限が多いと長引く)
- 却下された場合は具体的な理由が返ってくる → 修正して再提出
- 承認後: アイテム URL が発行される。これを共有

## 10. 公開後の運用

- [ ] レビュー・サポート問い合わせの受け先を決める (GitHub Issues / Discussions など)
- [ ] バージョン更新時は manifest の `version` をバンプして再 ZIP → ダッシュボードから更新提出
- [ ] 重大な変更 (新しい権限の追加) は再審査が必要
