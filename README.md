# E資格 学習アプリ

E資格（JDLA Deep Learning for ENGINEER）の学習アプリです。教本（体系的な読み物）を軸に、確認問題、間隔反復による復習、計算ドリル、模試、成績分析までを 1 つにまとめてあります。学習記録はブラウザの localStorage にのみ保存され、外部には送信されません。

`fe_exam_app`（基本情報技術者試験の学習アプリ）の土台を引き継いで作られています。画面の作り・記法・運用の作法はそちらと共通です。

> **現状** アプリの仕組みは完成していますが、**教本と問題の中身はこれから書きます。** 入門編 4 節と線形代数 1 節、確認問題 4 問、計算ドリル 2 種類だけが入っています。書き方は [CLAUDE.md](CLAUDE.md) を参照してください。

## 起動

```
npm install     # 初回のみ
npm run dev     # http://localhost:5173 が開く（開発用・自動リロードあり）
npm run build   # 本番ビルド（出力は dist/）
npm run preview # http://localhost:4173 でビルド済みのものを配信
npm run check   # データの整合性チェック（教本・問題・ドリル）
```

デスクトップにショートカットを作る場合は次を実行します。実体は [scripts/launch.ps1](scripts/launch.ps1) で、必要なら自動でビルドし直したうえでローカルサーバを起動します。

```powershell
# ★ リポジトリの直下で実行してください。ここから絶対パスを組み立てます。
$root = (Get-Location).Path
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'E資格 学習アプリ.lnk'))
$lnk.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$lnk.Arguments = "-ExecutionPolicy Bypass -NoProfile -File `"$root\scripts\launch.ps1`""
$lnk.WorkingDirectory = $root
$lnk.IconLocation = "$root\scripts\app.ico,0"
$lnk.Save()
```

## iPhone / Android で使う

PWA なので、ホーム画面に追加するとアドレスバーのないアプリとして起動し、一度開いたページはオフラインでも読めます。

**iPhone（Safari で開くこと。Chrome では追加できません）**

1. 公開 URL を Safari で開く
2. 画面下部の共有ボタン（□に↑）をタップ
3. メニューを下にたどって「ホーム画面に追加」

**Android** … Chrome のメニューから「アプリをインストール」または「ホーム画面に追加」。

オフライン保存（Service Worker）は **HTTPS でのみ有効**です。同じ Wi-Fi 内で `http://192.168.x.x:5173` を開く方法でも閲覧はできますが、オフライン保存は効かず、PC 側でサーバを動かしておく必要があります。

学習記録は端末ごとに保存され、PC とスマートフォンでは共有されません。設定画面のエクスポート／インポートで移せます。

## GitHub Pages へ公開する

`.github/workflows/deploy.yml` を用意してあります。`main` ブランチへ push するたびに自動でビルドして公開されます。

初回だけ次の手順が必要です。

```powershell
git remote add origin https://github.com/<ユーザ名>/<リポジトリ名>.git
git push -u origin main
```

その後、GitHub のリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に変更します。数分後に `https://<ユーザ名>.github.io/<リポジトリ名>/` で公開されます。

`vite.config.ts` の `base` は `'./'`（相対パス）なので、リポジトリ名がどうであってもサブディレクトリ配信で正しく動きます。

公開リポジトリにするので、**コミットの署名には GitHub の noreply アドレスを使ってください**（実メールアドレスは履歴に永久に残ります）。

## 画面

| 画面 | 内容 |
| --- | --- |
| ホーム | 進捗、試験日カウントダウン、1 日のノルマ、弱点分野、「もう一度読みたい節」 |
| 教本 | 分野順に読む本編。全文検索・栞・理解度 3 段階の記録つき |
| 体験ツール | 対話ウィジェットの一覧（`src/components/widgets/` にファイルを置くと自動で有効になる） |
| 確認問題 | 四肢択一。分野別／出題数指定／誤答優先。1 問ごとに解説と教本への導線 |
| 計算ドリル | 出題のたびに数値が変わる自動生成問題。手順だけが身に付くようにしている |
| 直前チェック | 全節の「まとめ」「試験のポイント」「よくある勘違い」を抜き出した一覧 |
| 復習 | SM-2 を簡略化した間隔反復。誤答は自動的にここへ回る |
| 模試 | 時間制限つきの通し演習（100 問 120 分ほか） |
| 成績分析 | 分野別の正答率、日別の推移、模試の履歴 |
| 設定 | 試験日、テーマ、学習記録のエクスポート／インポート |

## キーボード操作

| 画面 | 操作 |
| --- | --- |
| 確認問題・復習 | `1`〜`4` で選択、`Enter` で解答／次の問題へ |
| 教本 | `←` `→` で前後の節へ |
| 模試 | `1`〜`4` で選択、`←` `→` で問題を移動 |

## ディレクトリ

```
src/
  data/
    categories.ts       分野（シラバスの大分類・中分類）
    drills.ts           計算ドリルの生成器
    textbook/           教本の本文
    questions/          確認問題
  lib/
    markdown.tsx        本文の描画（Markdown サブセット＋図＋数式＋一問一答）
    math.tsx            数式表示（依存ゼロの簡易実装）
    digest.ts           本文から要点を抜き出す（直前チェックシートの元）
    router.ts           ハッシュルータ
    srs.ts              間隔反復（SM-2 の簡略版）
    search.ts           全文検索
    stats.ts            成績集計
    storage.ts          localStorage への保存
  components/
    widgets/            対話ウィジェット（置くだけで自動登録される）
  pages/                各画面
scripts/
  check.ts              データの整合性チェック（npm run check）
  launch.ps1            ローカル起動用のランチャ
```

## 技術的な前提

- React 18 + Vite 5 + TypeScript（strict、未使用変数もエラー）
- **ランタイム依存は React だけ。** ルータも Markdown も数式も自前で、外部通信は一切しない
- 学習記録は localStorage のみ。サーバもアカウントもない
- Service Worker によるオフライン対応（HTTPS でのみ有効）
