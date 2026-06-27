# Player API Preview 仕様・設計

作成日: 2026-06-27
対象: [player](../player) 配下に作る API 再生プレビュー機能

実装状況: 初期フェーズ実装済

## 1. 目的

この機能の目的は次の3点。

1. API の再生テスト
2. 登録済み JSON データの確認
3. 本番での再生を再現

API の呼び出し先は配布エントリ [api/main.js](../api/main.js) を前提とする。

## 2. スコープ（初期フェーズ）

初期フェーズでは、次を実装対象とする。

1. [data](../data) 配下の `.json` 一覧を UI で選択可能にする
2. 再生ボタン押下で再生する
3. 停止ボタン押下で停止する
4. API プレビューに必要なオプションを最低限切り替え可能にする

初期フェーズでは「自動連続再生」「高度な波形可視化」は対象外。

## 3. 機能要件

### 3.1 データ一覧

1. 対象フォルダは [data](../data)
2. 拡張子 `.json` のみ一覧化
3. リスト切り替えで再生対象を変更

備考:

- ブラウザのみでディレクトリ一覧を保証取得できない場合があるため、運用としては `data/index.json` マニフェスト方式を採用する
- 開発サーバーがディレクトリリスティング対応なら代替可能だが、仕様上はマニフェストを正とする

### 3.2 再生プレビュー

1. 再生開始: ボタン押下で `MyntMidi.bindPlay()` または `MyntMidi.playJson()` を実行
2. 停止: 停止ボタンで `MyntMidi.stop()`
3. ループ: ON/OFF 切り替え
4. F.O.（Fade Out）: ON/OFF 切り替え
5. 再生開始/終了/停止/エラーの状態表示

### 3.3 イベントと初期化

1. `DOMContentLoaded` 後に要素解決して初期化
2. play 対象要素が見つからない場合は初期化失敗扱い
3. dispose 可能なイベント登録方式を採用

## 4. 画面仕様（初期）

初期 UI は最小構成とする。

1. JSON 選択セレクトボックス
2. 再生ボタン
3. 停止ボタン
4. ループチェック
5. F.O. チェック
6. ステータス表示（ready / playing / stopped / ended / error）

想定配置先:

- [player/index.html](../player/index.html)
- [player/main.js](../player/main.js)
- [player/style.css](../player/style.css)

実装済み配置:

- [player/index.html](../player/index.html)
- [player/main.js](../player/main.js)
- [player/style.css](../player/style.css)
- [data/index.json](../data/index.json)

## 5. API 利用方針

### 5.1 利用 API

1. [api/main.js](../api/main.js) を import
2. 再生制御は `MyntMidi.bindPlay()` を第一候補
3. 例外時は `onError` で UI に反映

### 5.2 再生オプション（初期）

1. `loop`（boolean）
2. `fadeOut`（boolean）
3. `fadeOutSec`（number, 既定 0.08）

## 6. データ取得設計

### 6.1 推奨方式（マニフェスト）

`data/index.json` を読み込み、表示対象ファイルを取得する。

例:

```json
{
  "files": [
    "コイン.json"
  ]
}
```

読み込み時は `data/${filename}` を fetch する。

### 6.2 代替方式（将来）

1. サーバー側 API で一覧を返す
2. 開発時のみディレクトリリスティングをパース

## 7. モジュール設計

初期設計では機能を2層に分ける。

1. UI 層（選択・ボタン・表示）
2. Playback 層（MyntMidi 呼び出し、状態管理）

Playback 層責務:

1. 現在選択中 JSON の保持
2. bindPlay 再バインド（曲切替時）
3. 再生中状態の同期
4. エラーハンドリング

## 8. 状態遷移

状態は次の5つ。

1. `ready`
2. `playing`
3. `stopped`
4. `ended`
5. `error`

遷移:

1. 初期化成功で `ready`
2. 再生開始で `playing`
3. 停止ボタンで `stopped`
4. 自然終了で `ended`
5. 例外発生で `error`

## 9. 実装ステップ（提案）

1. [player/index.html](../player/index.html) の骨組み作成
2. [player/main.js](../player/main.js) で `DOMContentLoaded` 初期化
3. `data/index.json` 読み込み処理作成
4. 選択 JSON と `bindPlay()` の連動実装
5. ステータス表示とエラーハンドリング追加
6. [sample/html/coin-play-button.html](../sample/html/coin-play-button.html) と同等再生確認

## 10. 受け入れ条件

1. [data](../data) 内 JSON を選択切替して再生できる
2. ループ ON/OFF が反映される
3. F.O. ON/OFF が反映される
4. 停止ボタンで停止できる
5. ステータスが `ready/playing/stopped/ended/error` で更新される
6. [api/main.js](../api/main.js) のみ import して動作する
