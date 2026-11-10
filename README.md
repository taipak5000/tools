# ツール一覧

個人用に作ってきたWebツールを1つのリポジトリにまとめたものです。トップの `index.html` がハブで、開くと前回使っていたツールが出ます。スマホでは画面下のバー、パソコンでは左のサイドバーからツールを切り替えます。ホーム画面に追加するときのアイコンは、「すべて」またはサイドバーの「ホーム画面のアイコン」から選べます（画像は `icons/`）。一度開いたツールは裏で開いたままなので、切り替えても入力中の状態が残ります。ビルドは不要です。

| フォルダ | ツール | 元のリポジトリ |
| --- | --- | --- |
| `kiroku-calendar/` | きろくカレンダー | kiroku-calendar |
| `okozukai/` | お小遣い帳 | okozukai |
| `meibo/` | 名簿 | Meibo |
| `sitememo/` | サイトメモ | sitememo |
| `teiki-oshirase/` | 配布タイマー | TeikiOshirase |
| `otoku-checker/` | おとくチェック | otoku-checker |
| `files/` | ファイル変換（下の3つをタブで切り替える） | — |
| `pdf-merge/` | PDF結合 | pdf-merge |
| `upscale-site/` | 画像サイズ拡大ツール | upscale-site |
| `png/` | PNG ZIP Renamer | png |

各ツールの詳しい説明は、それぞれのフォルダの `README.md` にあります。

## 保存データについて

データはどのツールもブラウザ内（localStorage / IndexedDB）にだけ保存されます。保存先はドメイン（`taipak5000.github.io`）単位で決まるため、元の `taipak5000.github.io/<リポジトリ名>/` で使っていたデータは、同じブラウザで新しいURLを開けばそのまま読み込まれます。保存キーはツールごとに別の名前なので、1つのリポジトリにまとめても互いに上書きしません。

iPhone・iPadの「ホーム画面に追加」したアイコンは、Safariとは別の保存領域を持ちます。新しいアイコンに切り替えるときは、各ツールの書き出し・同期コード機能でデータを移してください。

## 共通の部品（`shared/`）

- `theme.css`: 配色をiOS風にそろえる上書き用スタイル。各ツールのスタイルの後ろで読み込む
- `backup.js`: 全ツールのデータ（localStorage と IndexedDB、写真などのBlobを含む）を1つのJSONに書き出し・復元する。ハブの「バックアップ」から使う
- `hub-bridge.js`: 自前の下部タブバーがあるツール（名簿・お小遣い帳）用。ハブの中で開いたとき、タブバーに「ツール」ボタンを足し、ハブ側の下部バーを隠してメニューが2段にならないようにする

## ツールを追加するとき

1. フォルダを1つ作り、その中に `index.html` を置く
2. トップの `index.html` にある `TOOLS` に1行追加する
3. 配色をそろえるなら `../shared/theme.css` を読み込む。画面下にタブバーを持つツールなら `../shared/hub-bridge.js` も読み込む
4. Service Workerを使う場合は `CACHE_NAME` を他のツールと重ならない名前にし、方式は stale-while-revalidate にする

## テスト

```bash
cd otoku-checker && npm test
```
