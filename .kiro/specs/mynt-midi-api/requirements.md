# 要件定義書: MYNT MIDI API モジュール

## はじめに

MYNT MIDIプログラムに外部システムから呼び出し可能なAPIモジュールを追加する。
ファサードパターンにより、既存のコアモジュール（MidiParser, MidiPlayer, JsonConverter, LayerModel）を
`window.MyntMidi` として統一的に公開し、JSON またはテキストMIDI文字列を受け取ってブラウザ上で音声を再生する機能を提供する。
ループ再生、停止、レイヤー再生などのオプションを含む。
外部システム利用者向けのAPIマニュアルも作成する。

## 用語集

- **API_Module**: `src/js/api/mynt-api.js` に配置するファサードモジュール。既存コアモジュールへの統一的なインターフェースを提供する
- **MidiPlayer**: Web Audio API を使用した音声再生エンジン（`src/js/midi/player.js`）
- **MidiParser**: MYNT MIDI独自テキスト記法のパーサー（`src/js/midi/parser.js`）
- **JsonConverter**: JSON形式とMIDI文字列の相互変換モジュール（`src/js/midi/json-converter.js`）
- **LayerModel**: 複数レイヤーのメタデータ管理モジュール（`src/js/midi/layer-model.js`）
- **MIDI_String**: MYNT MIDI独自のテキスト音符記法（例: `T450O7EGO8ECDG`）
- **JSON_Format**: AI作曲連携用のJSON形式（`{ bpm, notes: [{ pitch, duration, velocity }] }`）
- **Layers_JSON**: 複数レイヤー対応のJSON形式（`{ format_version: "2.0", layers: [...] }`）
- **Loop_Playback**: 再生終了後に自動的に先頭から再生を繰り返す機能
- **Playback_Handle**: 再生制御用のオブジェクト。停止やステータス確認に使用する
- **External_System**: MYNT MIDI APIを利用する外部のWebアプリケーションやスクリプト
- **API_Manual**: 外部システム利用者向けのAPIリファレンスドキュメント

## 要件

### 要件 1: APIモジュールの公開

**ユーザーストーリー:** 外部システムの開発者として、`window.MyntMidi` を通じてMIDI再生機能にアクセスしたい。これにより、自分のWebアプリケーションからMYNT MIDIの機能を簡単に利用できる。

#### 受け入れ基準

1. THE API_Module SHALL `window.MyntMidi` オブジェクトとしてグローバルスコープに公開する
2. WHEN `src/js/api/mynt-api.js` がスクリプトタグで読み込まれた場合、THE API_Module SHALL 既存のUI初期化（main.js）に依存せず単独で動作する
3. THE API_Module SHALL ES Modules の `import` 文を使用して既存コアモジュール（MidiParser, MidiPlayer, JsonConverter）を参照する
4. THE API_Module SHALL バージョン文字列を `MyntMidi.version` プロパティとして提供する

### 要件 2: MIDI文字列による再生

**ユーザーストーリー:** 外部システムの開発者として、MIDI文字列を渡して音を鳴らしたい。これにより、テキストベースの音楽データを簡単に再生できる。

#### 受け入れ基準

1. WHEN 有効なMIDI文字列が `MyntMidi.play(midiString, options)` に渡された場合、THE API_Module SHALL MidiPlayerを使用して音声を再生する
2. WHEN `play()` が呼び出された場合、THE API_Module SHALL Playback_Handle を含む Promise を返す
3. WHEN `options.oscillatorType` が指定された場合、THE API_Module SHALL 指定されたオシレータタイプ（"sine", "square", "sawtooth", "triangle"）で再生する
4. WHEN `options.volume` が指定された場合、THE API_Module SHALL 指定された音量（0〜100の整数）で再生する
5. IF 空文字列または未定義の値が `play()` に渡された場合、THEN THE API_Module SHALL エラーオブジェクトを含む rejected Promise を返す

### 要件 3: JSONによる再生

**ユーザーストーリー:** 外部システムの開発者として、JSON形式のデータを渡して音を鳴らしたい。これにより、プログラムで生成した音楽データを再生できる。

#### 受け入れ基準

1. WHEN 有効なJSON_Formatオブジェクトが `MyntMidi.playJson(json, options)` に渡された場合、THE API_Module SHALL JsonConverterでMIDI文字列に変換し、MidiPlayerで再生する
2. WHEN JSON文字列（string型）が `playJson()` に渡された場合、THE API_Module SHALL JSON.parseで解析してからMIDI文字列に変換する
3. WHEN 有効なLayers_JSONオブジェクトが `playJson()` に渡された場合、THE API_Module SHALL 複数レイヤーを同時に再生する
4. IF 不正なJSON構造が `playJson()` に渡された場合、THEN THE API_Module SHALL エラーメッセージを含む rejected Promise を返す

### 要件 4: ループ再生

**ユーザーストーリー:** 外部システムの開発者として、BGMをループ再生したい。これにより、ゲームやアプリケーションのバックグラウンド音楽を継続的に鳴らせる。

#### 受け入れ基準

1. WHEN `options.loop` が `true` に設定されて `play()` または `playJson()` が呼び出された場合、THE API_Module SHALL 再生終了後に自動的に先頭から再生を繰り返す
2. WHILE Loop_Playback が有効な状態で `MyntMidi.stop()` が呼び出された場合、THE API_Module SHALL ループを停止し再生を終了する
3. WHILE Loop_Playback が有効な状態で、THE API_Module SHALL Playback_Handle の `looping` プロパティを `true` に設定する
4. WHEN `options.loopCount` が正の整数で指定された場合、THE API_Module SHALL 指定回数だけ繰り返し再生した後に停止する

### 要件 5: 再生制御

**ユーザーストーリー:** 外部システムの開発者として、再生中の音声を停止したい。これにより、ユーザー操作やゲームイベントに応じて音声を制御できる。

#### 受け入れ基準

1. WHEN `MyntMidi.stop()` が呼び出された場合、THE API_Module SHALL 再生中の全音声を即座に停止する
2. WHEN `MyntMidi.isPlaying()` が呼び出された場合、THE API_Module SHALL 現在再生中であれば `true`、停止中であれば `false` を返す
3. WHEN 再生が自然に終了した場合、THE API_Module SHALL Playback_Handle の状態を "stopped" に更新する
4. WHEN 新しい `play()` または `playJson()` が呼び出された場合、THE API_Module SHALL 既存の再生を停止してから新しい再生を開始する

### 要件 6: データ変換API

**ユーザーストーリー:** 外部システムの開発者として、JSONとMIDI文字列を相互変換したい。これにより、データ形式を柔軟に扱える。

#### 受け入れ基準

1. WHEN JSON_Formatオブジェクトが `MyntMidi.jsonToMidi(json)` に渡された場合、THE API_Module SHALL 対応するMIDI文字列を返す
2. WHEN MIDI文字列が `MyntMidi.midiToJson(midiString)` に渡された場合、THE API_Module SHALL 対応するJSON文字列を返す
3. WHEN MIDI文字列が `MyntMidi.validate(midiString)` に渡された場合、THE API_Module SHALL パース可能であれば `{ valid: true, noteCount }` を返す
4. IF パース不可能な文字列が `validate()` に渡された場合、THEN THE API_Module SHALL `{ valid: false, error }` を返す
5. FOR ALL 有効なJSON_Formatオブジェクト、`midiToJson(jsonToMidi(json))` で変換した結果は元のJSONと同等の音楽データを表現する（ラウンドトリップ特性）


### 要件 7: エラーハンドリング

**ユーザーストーリー:** 外部システムの開発者として、API呼び出し時のエラーを適切にハンドリングしたい。これにより、堅牢なアプリケーションを構築できる。

#### 受け入れ基準

1. IF Web Audio API が利用できない環境で再生メソッドが呼び出された場合、THEN THE API_Module SHALL `AudioNotSupportedError` メッセージを含む rejected Promise を返す
2. IF 不正な `oscillatorType` が指定された場合、THEN THE API_Module SHALL `InvalidOptionError` メッセージを含む rejected Promise を返す
3. IF 不正な `volume` 値（0〜100の範囲外）が指定された場合、THEN THE API_Module SHALL `InvalidOptionError` メッセージを含む rejected Promise を返す
4. THE API_Module SHALL 全てのエラーオブジェクトに `code` プロパティ（文字列）と `message` プロパティ（文字列）を含める

### 要件 8: APIマニュアルの作成

**ユーザーストーリー:** 外部システムの開発者として、APIの使い方を理解するためのリファレンスドキュメントを参照したい。これにより、迅速にAPIを導入できる。

#### 受け入れ基準

1. THE API_Manual SHALL `docs/api-manual.md` に配置する
2. THE API_Manual SHALL 全ての公開メソッドのシグネチャ、パラメータ説明、戻り値の型を記載する
3. THE API_Manual SHALL 各メソッドに対して動作するコード例を含める
4. THE API_Manual SHALL JSON_Format と Layers_JSON のスキーマ定義を含める
5. THE API_Manual SHALL scriptタグでの読み込み方法と初期化手順を記載する
6. THE API_Manual SHALL エラーコード一覧と対処方法を記載する

### 要件 9: 既存不具合のリストアップ

**ユーザーストーリー:** 開発者として、API実装前に既存コードベースの不具合を把握したい。これにより、APIが既存の問題を引き継がないよう注意できる。

#### 受け入れ基準

1. THE API_Manual SHALL 既存コードベースで発見された不具合を `docs/known-issues.md` にリストアップする
2. THE API_Manual SHALL 各不具合に対して、影響範囲、再現手順、APIへの影響の有無を記載する
3. THE API_Module SHALL 既存不具合の修正は行わず、リストアップのみとする
