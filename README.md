# Firefox-Extention_Bizin-Em-All

このリポジトリは、
`Chrome-Extention_Bizin-Em-ALL` の機能を
Firefox でそのまま利用できるように再実装した拡張機能です。

## 機能

- 全ページで強制的に Bizin Gothic 系フォントを適用
- `Material Icons` 系フォントは除外して表示崩れを防止
- ポップアップの ON/OFF 切り替えで即時反映
- ON/OFF 状態をローカル保存し、再訪問時にも維持

## ファイル構成

- `manifest.json` ... Firefox 向け WebExtension 定義
- `content.js` ... ページ注入時にフォントを適用する本体ロジック
- `popup.html` / `popup.js` / `popup.css` ... トグル UI
- `icons/` ... 拡張アイコン（16/32/48/128）
- `tests/` ... Node のテスト (`node --test`)
- `package.json` ... テスト実行用

## 動作確認

```bash
npm test
```

## Firefox への読み込み手順

1. `npm install` は不要です（テスト実行時のみ Node で動作）
2. Firefox の `about:debugging#/runtime/this-firefox` を開く
3. 「一時的なアドオンを読み込む」からこのディレクトリを指定
4. 既定のポップアップから ON/OFF が切り替えられることを確認

## 開発メモ

`chrome.storage` 系 API を利用しているため、`local` ストレージの既定値・更新イベントの扱いは
Chrome 版と同一です。
