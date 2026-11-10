# ツール一覧

個人用に作ってきた9つのWebツールを1つのリポジトリにまとめたものです。トップの `index.html` が一覧ページで、各ツールはフォルダごとに独立して動きます。ビルドは不要です。

| フォルダ | ツール | 元のリポジトリ |
| --- | --- | --- |
| `kiroku-calendar/` | きろくカレンダー | kiroku-calendar |
| `okozukai/` | お小遣い帳 | okozukai |
| `meibo/` | 名簿 | Meibo |
| `sitememo/` | サイトメモ | sitememo |
| `teiki-oshirase/` | 配布タイマー | TeikiOshirase |
| `otoku-checker/` | おとくチェック | otoku-checker |
| `pdf-merge/` | PDF結合 | pdf-merge |
| `upscale-site/` | 画像サイズ拡大ツール | upscale-site |
| `png/` | PNG ZIP Renamer | png |

各ツールの詳しい説明は、それぞれのフォルダの `README.md` にあります。

## 保存データについて

データはどのツールもブラウザ内（localStorage / IndexedDB）にだけ保存されます。保存先はドメイン（`taipak5000.github.io`）単位で決まるため、元の `taipak5000.github.io/<リポジトリ名>/` で使っていたデータは、同じブラウザで新しいURLを開けばそのまま読み込まれます。保存キーはツールごとに別の名前なので、1つのリポジトリにまとめても互いに上書きしません。

ただしiPhone・iPadの「ホーム画面に追加」したアプリは、Safariとは別の保存領域を持ちます。古いアイコンで使っていたデータは、古いアイコンから開いたときにしか見えません。移行期間中は古いリポジトリを新しいURLへの転送ページにしてあるので、古いアイコンを開けば新しいURLに移り、データもそのまま見えます。新しいアイコンに切り替える場合は、古いアイコン側で各ツールの書き出し・同期コード機能を使ってデータを保存し、新しいアイコン側で読み込み直してください。古いリポジトリを削除すると転送ページも消え、古いアイコンは開けなくなります。削除はデータを移し終えてからにしてください。

## ツールを追加するとき

1. フォルダを1つ作り、その中に `index.html` を置く
2. トップの `index.html` の一覧に1行追加する
3. Service Workerを使う場合は `CACHE_NAME` を他のツールと重ならない名前にし、方式は stale-while-revalidate にする

## テスト

```bash
cd otoku-checker && npm test
```
