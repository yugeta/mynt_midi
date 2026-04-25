# 実装計画: MYNT MIDI API モジュール

## 概要

既存コアモジュール（MidiParser, MidiPlayer, JsonConverter, LayerModel）をファサードパターンで統合し、
`window.MyntMidi` として外部公開する API モジュールを段階的に実装する。
テストは Vitest + fast-check を使用し、AudioContext はモック化する。

## タスク

- [x] 1. テスト環境のセットアップ
  - Vitest と fast-check をインストールし、テスト設定ファイルを作成する
  - ブラウザ ES Modules 環境に対応した Vitest 設定（`vitest.config.js`）を作成する
  - AudioContext / OscillatorNode / GainNode のモックユーティリティを `tests/mocks/audio-context.js` に作成する
  - _Requirements: 全体_

- [x] 2. API モジュールのコア構造と再生機能
  - [x] 2.1 ファサードモジュールの骨格を作成する
    - `src/js/api/mynt-api.js` を新規作成する
    - 既存モジュール（MidiParser, MidiPlayer, JsonConverter）を import する
    - 内部状態変数（`_isPlaying`, `_loopTimerId`, `_currentHandle`, `_loopRemaining`）を定義する
    - エラー生成ヘルパー `createError(code, message)` を実装する
    - バリデーションヘルパー `_validateOptions(options)` を実装する（oscillatorType 4種チェック、volume 0〜100 範囲チェック）
    - `version` プロパティを定義する
    - `window.MyntMidi` にオブジェクトを公開する
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 `play(midiString, options)` を実装する
    - 入力バリデーション（空文字列/undefined → EMPTY_INPUT エラー）
    - オプションバリデーション（oscillatorType, volume）
    - AudioContext 利用可能性チェック（AUDIO_NOT_SUPPORTED エラー）
    - 既存再生の停止（排他制御）
    - `MidiParser.get_code()` でパースし、結果が空なら INVALID_MIDI_STRING エラー
    - `MidiPlayer.play()` を呼び出して再生
    - PlaybackHandle（`{ status, looping, stop() }`）を生成して Promise で返す
    - 再生終了時に `_isPlaying` と handle.status を更新する
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 2.3 Property 1 のプロパティテストを書く
    - **Property 1: play() は有効なMIDI文字列に対して有効な PlaybackHandle を返す**
    - カスタム MIDI 文字列ジェネレーターを使用する
    - resolved Promise の構造（status, looping, stop）を検証する
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.4 Property 2 のプロパティテストを書く
    - **Property 2: play() は volume オプションを正しく伝播する**
    - 0〜100 の整数ジェネレーターを使用する
    - MidiPlayer.play() に渡される volume 値をモックで検証する
    - **Validates: Requirements 2.4**

  - [ ]* 2.5 Property 8 のプロパティテストを書く
    - **Property 8: 不正なオプション値はエラーを返す**
    - 不正な oscillatorType ジェネレーターと範囲外 volume ジェネレーターを使用する
    - rejected Promise のエラー構造（code, message）を検証する
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 3. JSON 再生とデータ変換
  - [x] 3.1 `playJson(json, options)` を実装する
    - JSON文字列の場合は `JSON.parse()` で解析する
    - `JsonConverter.detectFormat()` でフォーマット判定する
    - JSON_Format の場合: `JsonConverter.toMidiString()` で変換後に `play()` を呼び出す
    - Layers_JSON の場合: `JsonConverter.importLayers()` で変換後に `MidiPlayer.playLayers()` を呼び出す
    - 不正な JSON 構造（notes/bpm 欠落）は INVALID_JSON エラーを返す
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 データ変換メソッドを実装する
    - `jsonToMidi(json)`: `JsonConverter.toMidiString()` のラッパー
    - `midiToJson(midiString)`: `JsonConverter.toJson()` のラッパー
    - `validate(midiString)`: `MidiParser.get_code()` でパースし、結果に応じて `{ valid, noteCount }` または `{ valid, error }` を返す
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 3.3 Property 3 のプロパティテストを書く
    - **Property 3: playJson() は有効な JSON_Format を変換して再生する**
    - カスタム JSON_Format ジェネレーターを使用する
    - JsonConverter.toMidiString() と MidiPlayer.play() の呼び出しを検証する
    - **Validates: Requirements 3.1**

  - [ ]* 3.4 Property 6 のプロパティテストを書く
    - **Property 6: validate() の noteCount はパーサー出力と一致する**
    - カスタム MIDI 文字列ジェネレーターを使用する
    - validate() の noteCount と MidiParser.get_code().length の一致を検証する
    - **Validates: Requirements 6.3**

  - [ ]* 3.5 Property 7 のプロパティテストを書く
    - **Property 7: JSON ラウンドトリップは音楽データを保存する**
    - カスタム JSON_Format ジェネレーターを使用する
    - `midiToJson(jsonToMidi(json))` の音符数と pitch の一致を検証する（duration は ±1% 誤差許容）
    - **Validates: Requirements 6.5**

  - [ ]* 3.6 Property 9 のプロパティテストを書く
    - **Property 9: 不正な JSON 構造はエラーを返す**
    - notes 配列を持たないオブジェクト、bpm 欠落オブジェクトのジェネレーターを使用する
    - rejected Promise のエラー構造（code, message）を検証する
    - **Validates: Requirements 3.4, 7.4**

- [x] 4. チェックポイント - コア機能の確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. ループ再生と再生制御
  - [x] 5.1 ループ再生を実装する
    - `play()` / `playJson()` の `options.loop` が true の場合、`MidiPlayer._schedule()` の戻り値 `duration` を使い `setTimeout(callback, duration * 1000)` で再スケジュールする
    - `options.loopCount` が指定された場合、`_loopRemaining` をデクリメントし、0 になったら停止する
    - PlaybackHandle の `looping` プロパティを適切に設定する
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 5.2 `stop()` と `isPlaying()` を実装する
    - `stop()`: `clearTimeout(_loopTimerId)` でタイマーキャンセル → `MidiPlayer.stop()` で音声停止 → 内部状態をリセット → handle.status を "stopped" に更新
    - `isPlaying()`: `_isPlaying` の値を返す
    - _Requirements: 4.2, 5.1, 5.2_

  - [ ]* 5.3 Property 4 のプロパティテストを書く
    - **Property 4: loopCount は指定回数で再生を停止する**
    - 正の整数ジェネレーターを使用する
    - setTimeout をモック化し、指定回数後に自動停止することを検証する
    - **Validates: Requirements 4.4**

  - [ ]* 5.4 Property 5 のプロパティテストを書く
    - **Property 5: isPlaying() は再生状態を正確に反映する**
    - play() → isPlaying() → stop() → isPlaying() のシーケンスを検証する
    - **Validates: Requirements 5.2**

  - [ ]* 5.5 ループ再生と再生制御のユニットテストを書く
    - loop=true で再スケジュールされることを検証する
    - ループ中の stop() でタイマーがキャンセルされることを検証する
    - 連続 play() で前の再生が停止することを検証する
    - 再生完了後の handle.status が "stopped" に更新されることを検証する
    - _Requirements: 4.1, 4.2, 5.1, 5.3, 5.4_

- [x] 6. チェックポイント - 全機能の確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. API マニュアルの作成
  - [x] 7.1 `docs/api-manual.md` を作成する
    - scriptタグでの読み込み方法と初期化手順を記載する
    - 全公開メソッドのシグネチャ、パラメータ説明、戻り値の型を記載する
    - 各メソッドに動作するコード例を含める
    - JSON_Format と Layers_JSON のスキーマ定義を記載する
    - エラーコード一覧（EMPTY_INPUT, INVALID_MIDI_STRING, INVALID_JSON, INVALID_OPTION, AUDIO_NOT_SUPPORTED）と対処方法を記載する
    - BUG-005（ラウンドトリップ精度劣化）を制限事項として記載する
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 8. 最終チェックポイント - 全テスト通過の確認
  - Ensure all tests pass, ask the user if questions arise.

## 備考

- `*` マーク付きのタスクはオプションであり、MVP では省略可能
- 各タスクは要件番号で追跡可能
- チェックポイントで段階的に品質を確認する
- プロパティテストは設計書の正確性プロパティに基づく
- ユニットテストは具体的なシナリオとエッジケースを補完する
- BUG-004 修正済み（AudioContext 使い回し方式）を前提とした実装
- BUG-005 は制限事項としてAPIマニュアルに記載
- BUG-006 修正済み（get_code() は常に配列を返す）を前提とした実装
