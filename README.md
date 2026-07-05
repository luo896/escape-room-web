# 四つの欠片 — 2D 脱出ゲーム

ブラウザで遊べる、短編ポイント＆クリック形式の脱出ゲームです。
失踪した妹・澪の書斎を調べ、四つの記憶の欠片を集めます。

## 遊び方

1. `index.html` をブラウザで開くか、ローカルサーバーを起動します。
2. 部屋の中で光っている四つの物を調べます。
3. 四つの鍵の欠片が揃うと扉が開きます。
4. 開いた扉をクリックするとクリアです。

## 現在の機能

- 日文の短編ストーリーと四つの記憶ログ
- CSS で描画した整理済みの一部屋
- Web Audio API による環境音楽、発見音、開扉音
- 音声 ON/OFF、ヒント、リセット
- キーボード操作とモバイルレイアウト

## ローカル起動

```bash
cd /Users/yuan/escape-room-web
python3 -m http.server 8000
```

その後、ブラウザで `http://localhost:8000` を開きます。

## 公開方法

すべて静的ファイルなので、GitHub Pages、Cloudflare Pages、Netlify、
Vercel、itch.io などにそのまま配置できます。ビルド工程は不要です。

### GitHub Pages

1. GitHub に新しいリポジトリを作成します。
2. このフォルダのファイルを `main` ブランチへ push します。
3. Repository Settings → Pages を開きます。
4. Deploy from a branch、`main`、`/ (root)` を選択します。

数分後に `https://ユーザー名.github.io/リポジトリ名/` で公開されます。

### Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create を開きます。
2. GitHub リポジトリを接続します。
3. Framework preset は `None`、Build command は空欄にします。
4. Build output directory は `/` にします。
5. Deploy を実行します。

## ファイル

- `index.html` — ゲーム画面とダイアログ
- `styles.css` — 部屋のイラスト、演出、モバイル対応
- `game.js` — 調査進捗、物語、音声、扉、ヒント、リセット処理
