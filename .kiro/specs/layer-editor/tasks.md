# タスク: レイヤーエディタシステム

## Phase 1: データモデル + レイヤーパネルUI

- [x] 1. LayerModelの実装
  - [x] 1.1 `src/js/midi/layer-model.js` を作成し、レイヤーデータの管理（layers配列、activeLayerId、nextId、カラーパレット）を実装する
  - [x] 1.2 `init(midiString, oscillatorType)` メソッドを実装し、既存のtextareaとオシレータタイプからデフォルトレイヤーを生成する
  - [x] 1.3 `addLayer()` メソッドを実装し、一意のid生成、デフォルト値設定、カラーパレットからの色割り当てを行う
  - [x] 1.4 `removeLayer(id)` メソッドを実装し、最後の1レイヤーの削除を拒否するガードを含める
  - [x] 1.5 `setActive(id)` / `updateLayer(id, props)` メソッドを実装する
  - [x] 1.6 `onChange(callback)` によるイベント通知機構を実装する
- [x] 2. レイヤーパネルUIの実装
  - [x] 2.1 `src/css/layer.css` を作成し、レイヤーパネルのスタイル（行レイアウト、カラーインジケーター、ボタン、スライダー）を定義する
  - [x] 2.2 `src/css/style.css` に `layer.css` のimportを追加する
  - [x] 2.3 `src/js/ui/layer-panel.js` を作成し、レイヤーパネルのDOM生成（パネルコンテナ、レイヤー追加ボタン）を実装する
  - [x] 2.4 `renderRow(layer)` メソッドを実装し、各レイヤー行（カラーインジケーター、名前、オシレータ選択、ミュート/ソロボタン、音量スライダー、削除ボタン）を生成する
  - [x] 2.5 レイヤー行クリックでアクティブレイヤーを切り替えるイベントハンドラを実装する
  - [x] 2.6 レイヤー追加・削除ボタンのイベントハンドラを実装する
  - [x] 2.7 オシレータタイプ変更・音量スライダー・ミュート/ソロボタンのイベントハンドラを実装する
  - [x] 2.8 `render()` メソッドを実装し、LayerModelの変更時にパネル全体を再描画する
- [x] 3. アクティブレイヤーとtextareaの連動
  - [x] 3.1 `src/js/controller/string-input.js` を修正し、アクティブレイヤー切替時にtextareaの内容を更新する処理を追加する
  - [x] 3.2 textarea入力時にアクティブレイヤーのmidiStringを更新する処理を追加する
  - [x] 3.3 textarea変更時にエディタのノート表示を更新する処理を維持する
- [x] 4. ヘッダーのオシレータタイプ選択の移行
  - [x] 4.1 `src/index.html` のヘッダーからオシレータタイプ選択の`input-group`を非表示にする（CSSまたはJS）
  - [x] 4.2 `src/js/ui/element.js` の `oscillator_type` getterをアクティブレイヤーのoscillatorTypeを返すように修正する
- [x] 5. main.jsへの統合
  - [x] 5.1 `src/js/main.js` にLayerPanelのimportと初期化を追加する（Editorの前に初期化）

## Phase 2: レイヤーごとの独立再生

- [x] 6. MidiPlayerのレイヤー対応
  - [x] 6.1 `src/js/midi/player.js` に `playLayers(layers)` メソッドを追加し、各レイヤーに独立したオシレータ+ゲインチェーンを生成する
  - [x] 6.2 各レイヤーのoscillatorTypeとvolume（0〜100→0.0〜1.0変換）を適用する処理を実装する
  - [x] 6.3 再生可能レイヤーのフィルタリングロジック（solo優先、mute除外）を実装する
  - [x] 6.4 `src/js/controller/controls.js` の `click_play` を修正し、LayerModelからレイヤー情報を取得して `playLayers()` を呼び出す

## Phase 3: エディタカラーコード表示 + JSON対応

- [x] 7. ピアノロールエディタのカラーコード表示
  - [x] 7.1 `src/js/ui/editor.js` に `renderAllLayers()` メソッドを追加し、全レイヤーのノートを描画する
  - [x] 7.2 ノートDOM要素に `data-layer-id` 属性と、レイヤーカラーに基づくスタイル（border-color, background-color）を適用する
  - [x] 7.3 アクティブレイヤーのノートを不透明、それ以外を半透明（opacity 0.3）で表示する処理を実装する
  - [x] 7.4 アクティブレイヤーのノートのみ編集可能にし、他レイヤーのノートへのクリック・ドラッグを無視する処理を実装する
  - [x] 7.5 `src/css/editor.css` にレイヤーカラー対応のノートスタイルを追加する
- [x] 8. JSON Import/Exportのレイヤー対応
  - [x] 8.1 `src/js/midi/json-converter.js` に `exportLayers(layers)` メソッドを追加し、format_version "2.0" のJSON文字列を生成する
  - [x] 8.2 `importLayers(jsonStr)` メソッドを追加し、v2.0形式のlayers配列からレイヤーデータを復元する
  - [x] 8.3 `detectFormat(jsonStr)` メソッドを追加し、layers配列の有無でフォーマットバージョンを判定する
  - [x] 8.4 旧形式JSON（v1.0）のインポート時に単一レイヤーとして変換する後方互換処理を実装する
  - [x] 8.5 `src/js/controller/json-io.js` のImport/Exportフローを修正し、LayerModelと連携する
