#!/usr/bin/env bash
# Chrome Web Store にアップロードする ZIP を生成する。
# 配布に不要なファイル(README/CHECKLIST/build.sh/tools/dist/.git 等)を除外。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# manifest からバージョンを取り出してファイル名に使う
VERSION="$(node -e "console.log(require('./manifest.json').version)")"
OUT_DIR="dist"
OUT="$OUT_DIR/music-cross-search-${VERSION}.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT"

# 配布に含めるファイル
FILES=(
  manifest.json
  background.js
  content.js
  page.js
  popup.html
  popup.js
  icons
)

# アイコンが無ければ先に生成
if [ ! -f icons/icon128.png ]; then
  echo "▶ icons/ が無いので生成します"
  node tools/gen-icons.mjs
fi

echo "▶ パッケージング: $OUT"
zip -r "$OUT" "${FILES[@]}" -x '*.DS_Store' >/dev/null

echo ""
echo "✓ 完了: $OUT"
echo "  サイズ: $(du -h "$OUT" | cut -f1)"
echo "  ファイル数: $(unzip -l "$OUT" | tail -1 | awk '{print $2}')"
