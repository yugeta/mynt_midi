# API配布パッケージ構築ガイド

作成日: 2026-06-27
対象: 外部プロジェクト同梱用 `api/` ディレクトリ生成

## 目的

`src/js/api/mynt-api.js` は単体完結ではなく、`src/js/midi/` 配下モジュールに依存する。
外部配布時の取りこぼし防止のため、同梱用の最小構成を毎回同じ手順で生成する。

## 生成コマンド

```sh
sh ./scripts/build-api-package.sh
```

この手順は Node.js / npm を前提にしない。

## 同期チェックコマンド

```sh
sh ./scripts/check-api-package.sh
```

このコマンドは `api/` 配下が最新ソースから生成された内容と一致しているか検証する。
不一致の場合は失敗し、再生成を促す。

## pre-commit フック導入

初回のみ実行:

```sh
sh ./scripts/install-git-hooks.sh
chmod +x ./scripts/build-api-package.sh ./scripts/check-api-package.sh ./scripts/install-git-hooks.sh ./.githooks/pre-commit
```

これにより commit 時に `scripts/check-api-package.sh` が自動実行される。
`api/` が古い場合はコミットを中断する。

## 生成物

```text
api/
  main.js
  modules/
    mynt-api.js
    parser.js
    player.js
    json-converter.js
```

## スクリプトの役割

`./scripts/build-api-package.sh` は次を実行する。

1. 生成先 `api/` を毎回クリーン作成
2. `src/js/api/mynt-api.js` を `api/modules/mynt-api.js` としてコピー
3. `../midi/` import を `./` に自動置換
4. `api/main.js` を生成（`api/modules/mynt-api.js` を import する薄いエントリ）
5. 必要依存3ファイルを `api/modules/` へコピー
6. import置換漏れを検証し、失敗時は終了

`./scripts/check-api-package.sh` は次を実行する。

1. 一時ディレクトリに期待される `api/` 生成結果を再現
2. 既存 `api/` と比較
3. 差分がある場合はエラー終了

`./scripts/install-git-hooks.sh` は次を実行する。

1. Git 設定 `core.hooksPath` を `.githooks` に設定
2. バージョン管理された pre-commit を有効化

## バージョンアップ時の必須作業

API/再生基盤を更新した場合、以下は必須。

1. `src/js/api/mynt-api.js` の import 先が増えたら `scripts/build-api-package.sh` のコピー対象を更新
2. `src/js/api/mynt-api.js` の import 記法変更があれば、同スクリプトの置換ルールを更新
3. 上記変更に応じて `scripts/check-api-package.sh` の比較対象リストを更新
4. `sh ./scripts/build-api-package.sh` を実行して `api/` を再生成
5. `sh ./scripts/check-api-package.sh` を実行して同期状態を確認
6. 外部検証ページで `api/main.js` 読み込み確認
7. `docs/api-manual.md` の仕様差分（メソッド/オプション/制約）を更新

## 運用ルール

1. `api/` 配下ファイルは手編集しない（常に再生成）
2. `api/` は生成物として `.gitignore` 管理し、必要時に再生成する
3. 仕様変更PRでは `scripts/build-api-package.sh` と `scripts/check-api-package.sh` 更新有無をチェック項目にする
4. APIバージョン変更時はこのドキュメントの日付と更新履歴を追記する

## 備考

将来的に依存が増える場合は、配布方式を「バンドル単一ファイル化」に切り替えることを検討する。
