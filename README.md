# Music Cross Search

YouTube / YouTube Music / Spotify Web / Apple Music Web で再生中の曲を取得し、他サービスで横断検索できる Chrome 拡張機能。アーティスト情報は Wikipedia から取得して画面遷移なしで表示。

## 読み込み方法

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このディレクトリを選択

## 使い方

1. 対応サイトで音楽を再生
2. ツールバーの拡張機能アイコンをクリック → 現在の曲と他サービスへの検索リンクが並ぶ
3. 「👤 アーティスト情報を表示」をクリック → ポップアップ内に Wikipedia の紹介文と画像が展開表示

## アーティスト情報パネル

- アーティスト画像 (Wikipedia サムネ、円形表示)
- アーティスト名
- 紹介文 (日本語 Wikipedia 優先、無ければ英語版)
- Wikipedia ページへの直リンク

OAuth/API キー不要。MediaWiki action API を使ってあいまい検索しているので、表記揺れにある程度強い。

## 右クリックメニュー

- **ページ上のテキストを選択して右クリック** → `「選択テキスト」で検索` サブメニューから各サービスを選択
- **ツールバーアイコンを右クリック** → `再生中の曲で検索` サブメニューから各サービスを選択

## キーボードショートカット

| 既定キー | アクション |
|---|---|
| `Alt+Shift+M` | ポップアップを開く |
| `Alt+Shift+S` | Spotify で検索 |
| `Alt+Shift+Y` | YouTube Music で検索 |
| `Alt+Shift+A` | Apple Music で検索 |
| 未割当 | YouTube で検索 (`chrome://extensions/shortcuts` で割り当て可) |

- 曲が検出できない時はツールバーアイコンに「?」バッジを2.5秒表示
- `chrome://extensions/shortcuts` で各キーを自由に変更可能

## 構成

| ファイル | 役割 |
|---|---|
| `manifest.json` | MV3 定義 |
| `page.js` (MAIN world) | `navigator.mediaSession.metadata` を polling 監視 |
| `content.js` (ISOLATED world) | CustomEvent を受けて storage 保存。DOM フォールバック付き |
| `background.js` | Wikipedia 取得 + ショートカット + 右クリックメニュー |
| `popup.html` / `popup.js` | UI (検索リンク + アーティスト情報パネル) |

## 既知の制約

- デスクトップアプリ版 (Spotify/Apple Music ネイティブ) からは取得不可 (Web 版が必要)
- 各サイトの DOM 構造が変わるとセレクタの修正が必要
- 全サービスは検索ページにジャンプ (曲の直接ページにはジャンプしない)

## 今後の拡張余地

- 複数タブでの再生検出 (`chrome.tabs` API でアクティブタブを優先)
- Wikipedia 以外の音楽メタデータ (MusicBrainz / Last.fm) との併用
- リスナー数・関連アーティスト表示
