MYNT MIDI API リファレンスマニュアル
===

```
Create : 2025-04-25
Version: 1.0.0
```

# クイックスタート

## 1. スクリプトの読み込み

```html
<script type="module" src="src/js/api/mynt-api.js"></script>
```

> **注意:** `type="module"` が必須です。MYNT MIDI API は ES Modules として提供されます。

## 2. 初期化の確認

スクリプトの読み込みが完了すると、`window.MyntMidi` オブジェクトが自動的に利用可能になります。
既存の UI（main.js）に依存せず、API 単独で動作します。

```html
<script type="module">
  // モジュール読み込み後に利用可能
  import './src/js/api/mynt-api.js'

  console.log(MyntMidi.version) // "1.0.0"
</script>
```

## 3. 最初の再生

```html
<script type="module">
  import './src/js/api/mynt-api.js'

  // コイン音を再生
  const handle = await MyntMidi.play('T600O6BT100O7E~')
  console.log(handle.status) // "playing"
</script>
```

## 4. JSON で再生

```html
<script type="module">
  import './src/js/api/mynt-api.js'

  const music = {
    bpm: 120,
    notes: [
      { pitch: 'C4', duration: '4n', velocity: 80 },
      { pitch: 'E4', duration: '4n' },
      { pitch: 'G4', duration: '4n' },
      { pitch: 'rest', duration: '8n' },
      { pitch: ['C4', 'E4', 'G4'], duration: '2n' }
    ]
  }

  const handle = await MyntMidi.playJson(music)
</script>
```

## 5. 外部同梱用パッケージ構築（重要）

API を外部プロジェクトに同梱する場合は、`src/js/api/mynt-api.js` 単体コピーではなく
配布用 `api/` ディレクトリ（本体: `api/mynt-api.js`、エントリ: `api/main.js`）を生成して同梱してください。

```sh
sh ./scripts/build-api-package.sh
```

生成手順と、バージョンアップ時に必須の `sh` 更新ルールは以下を参照:

- [api-package-build.md](api-package-build.md)

推奨運用:

- `sh ./scripts/check-api-package.sh` で同梱 `api/` の同期状態を確認
- `sh ./scripts/install-git-hooks.sh` で pre-commit チェックを有効化

---

# API リファレンス

## プロパティ

### `MyntMidi.version`

| 項目 | 内容 |
|---|---|
| 型 | `string` |
| 説明 | API のバージョン文字列 |

```js
console.log(MyntMidi.version) // "1.0.0"
```

---

## メソッド

### `MyntMidi.play(midiString, options?)`

MIDI 文字列を再生します。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `midiString` | `string` | ○ | MIDI 文字列（例: `"T450O7EGO8ECDG"`） |
| `options` | `PlayOptions` | - | 再生オプション |

| 戻り値 | 型 |
|---|---|
| 成功時 | `Promise<PlaybackHandle>` |
| 失敗時 | `Promise.reject({ code, message })` |

```js
// 基本的な再生
const handle = await MyntMidi.play('T450O7EGO8ECDG')

// オプション付き再生
const handle2 = await MyntMidi.play('T450O7EGO8ECDG', {
  oscillatorType: 'sine',
  volume: 80,
  loop: true
})

// エラーハンドリング
try {
  await MyntMidi.play('')
} catch (err) {
  console.error(err.code)    // "EMPTY_INPUT"
  console.error(err.message) // "Input is empty or undefined"
}
```

---

### `MyntMidi.playJson(json, options?)`

JSON データを再生します。JSON_Format（単一レイヤー）と Layers_JSON（複数レイヤー）の両方に対応します。
Layers_JSON は `format_version: "2.0"` と `"3.0"` の両方を受け付けます。
`options.oscillatorType` / `options.volume` は Layers 再生時に全レイヤーへ上書き適用されます。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `json` | `object \| string` | ○ | JSON_Format / Layers_JSON オブジェクト、またはJSON文字列 |
| `options` | `PlayOptions` | - | 再生オプション |

| 戻り値 | 型 |
|---|---|
| 成功時 | `Promise<PlaybackHandle>` |
| 失敗時 | `Promise.reject({ code, message })` |

```js
// JSON_Format（単一レイヤー）
const handle = await MyntMidi.playJson({
  bpm: 120,
  notes: [
    { pitch: 'C4', duration: '4n', velocity: 80 },
    { pitch: 'E4', duration: '4n' },
    { pitch: 'G4', duration: '2n' }
  ]
})

// Layers_JSON（複数レイヤー）
const handle2 = await MyntMidi.playJson({
  format_version: '3.0',
  layers: [
    {
      name: 'Melody',
      oscillatorType: 'square',
      volume: 80,
      bpm: 120,
      notes: [
        { pitch: 'E5', duration: '8n' },
        { pitch: 'G5', duration: '8n' }
      ]
    },
    {
      name: 'Bass',
      oscillatorType: 'triangle',
      volume: 60,
      bpm: 120,
      notes: [
        { pitch: 'C3', duration: '4n' }
      ]
    }
  ]
}, {
  oscillatorType: 'sine',
  volume: 70,
  offsetSec: 0.2
})

// JSON文字列でも可
const jsonStr = '{"bpm":120,"notes":[{"pitch":"C4","duration":"4n"}]}'
const handle3 = await MyntMidi.playJson(jsonStr)
```

---

### `MyntMidi.stop()`

再生中の全音声を即座に停止します。ループ再生中の場合、ループも停止します。

| パラメータ | なし |
|---|---|
| 戻り値 | `void` |

```js
const handle = await MyntMidi.play('T450O7EGO8ECDG', { loop: true })
console.log(handle.status)  // "playing"
console.log(handle.looping) // true

MyntMidi.stop()
console.log(handle.status)  // "stopped"
console.log(handle.looping) // false
```

---

### `MyntMidi.isPlaying()`

現在再生中かどうかを返します。

| パラメータ | なし |
|---|---|
| 戻り値 | `boolean` |

```js
console.log(MyntMidi.isPlaying()) // false

await MyntMidi.play('T450O7EGO8ECDG')
console.log(MyntMidi.isPlaying()) // true

MyntMidi.stop()
console.log(MyntMidi.isPlaying()) // false
```

---

### `MyntMidi.startNote(key, octave, options?)`

単音の再生を開始します。押下中のみ鳴らす SE や試聴向け API です。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `key` | `string` | ○ | 音名（例: `"c"`, `"d-"`, `"f+"`） |
| `octave` | `number` | ○ | オクターブ（例: `4`） |
| `options` | `PlayOptions` | - | 再生オプション |

| 戻り値 | 型 |
|---|---|
| 成功時 | `Promise<NoteHandle \| null>` |
| 失敗時 | `Promise.reject({ code, message })` |

```js
const noteHandle = await MyntMidi.startNote('c', 5, {
  oscillatorType: 'square',
  volume: 60
})

setTimeout(() => {
  MyntMidi.stopNote(noteHandle)
}, 200)
```

---

### `MyntMidi.stopNote(handle)`

`startNote()` で開始した単音を停止します。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `handle` | `NoteHandle` | ○ | `startNote()` の戻り値 |

| 戻り値 | 型 |
|---|---|
| 戻り値 | `void` |

```js
const handle = await MyntMidi.startNote('g', 5)
MyntMidi.stopNote(handle)
```

---

### `MyntMidi.jsonToMidi(json)`

JSON_Format オブジェクトを MIDI 文字列に変換します。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `json` | `object \| string` | ○ | JSON_Format オブジェクトまたはJSON文字列 |

| 戻り値 | 型 | 説明 |
|---|---|---|
| 成功時 | `string` | MIDI 文字列 |
| 失敗時 | 例外をスロー | JSON パース失敗時 |

```js
const midi = MyntMidi.jsonToMidi({
  bpm: 120,
  notes: [
    { pitch: 'C4', duration: '4n', velocity: 80 },
    { pitch: 'E4', duration: '4n' },
    { pitch: 'G4', duration: '4n' }
  ]
})
console.log(midi) // "V63O4CO4EO4G" のような文字列
```

---

### `MyntMidi.midiToJson(midiString)`

MIDI 文字列を JSON 文字列に変換します。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `midiString` | `string` | ○ | MIDI 文字列 |

| 戻り値 | 型 | 説明 |
|---|---|---|
| 成功時 | `string` | JSON 文字列（JSON_Format 形式） |
| 空入力時 | `string` | `{ "bpm": 120, "notes": [] }` |

```js
const json = MyntMidi.midiToJson('T450O7EGO8ECDG')
const data = JSON.parse(json)
console.log(data.bpm)          // 133（T450 から推定）
console.log(data.notes.length) // 6
console.log(data.notes[0])     // { pitch: "E7", duration: "4n" }
```

---

### `MyntMidi.validate(midiString)`

MIDI 文字列が有効かどうかを検証します。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `midiString` | `string` | ○ | MIDI 文字列 |

| 戻り値 | 型 | 説明 |
|---|---|---|
| 有効時 | `ValidationResult` | `{ valid: true, noteCount: number }` |
| 無効時 | `ValidationResult` | `{ valid: false, error: string }` |

```js
// 有効な MIDI 文字列
const result = MyntMidi.validate('T450O7EGO8ECDG')
console.log(result.valid)     // true
console.log(result.noteCount) // 6

// 無効な入力
const result2 = MyntMidi.validate('')
console.log(result2.valid) // false
console.log(result2.error) // "Input is empty or not a string"

// パース不可能な文字列
const result3 = MyntMidi.validate('XYZ123')
console.log(result3.valid) // false
console.log(result3.error) // "MIDI string could not be parsed or contains no notes"
```

---

# 型定義

## PlayOptions

再生メソッド（`play()`, `playJson()`）に渡すオプションオブジェクトです。

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `oscillatorType` | `"sine" \| "square" \| "sawtooth" \| "triangle"` | `"square"` | 音色の種類 |
| `volume` | `number` (0〜100) | `50` | 音量 |
| `loop` | `boolean` | `false` | ループ再生の有効/無効 |
| `loopCount` | `number` | _(無限)_ | ループ回数。`loop: true` と併用。省略時は無限ループ |
| `offsetSec` | `number` | `0` | 再生開始オフセット（秒）。`0` 以上 |

```js
// 全オプション指定の例
await MyntMidi.play('T450O7EGO8ECDG', {
  oscillatorType: 'sine',
  volume: 70,
  loop: true,
  loopCount: 3,
  offsetSec: 0.5
})
```

補足:

- `play()` / `playJson()` の両方で `offsetSec` が有効です。
- `playJson()` で Layers_JSON を再生する場合、`oscillatorType` / `volume` は全レイヤーへ一括適用されます。

## PlaybackHandle

再生制御用のオブジェクトです。`play()` / `playJson()` の戻り値として返されます。

| プロパティ | 型 | 説明 |
|---|---|---|
| `status` | `"playing" \| "stopped"` | 現在の再生状態 |
| `looping` | `boolean` | ループ再生中かどうか |
| `stop()` | `function` | この再生を停止する |

```js
const handle = await MyntMidi.play('T450O7EGO8ECDG', { loop: true })

console.log(handle.status)  // "playing"
console.log(handle.looping) // true

// PlaybackHandle から直接停止
handle.stop()
console.log(handle.status)  // "stopped"
```

## NoteHandle

`startNote()` の戻り値ハンドルです。`stopNote(handle)` に渡して停止します。

| プロパティ | 型 | 説明 |
|---|---|---|
| `osc` | `OscillatorNode` | 発音ノード |
| `gain` | `GainNode` | 音量エンベロープノード |
| `ctx` | `AudioContext` | AudioContext |
| `oscType` | `string` | 使用中オシレータ |

## ValidationResult

`validate()` の戻り値です。

| プロパティ | 型 | 条件 | 説明 |
|---|---|---|---|
| `valid` | `boolean` | 常に存在 | バリデーション結果 |
| `noteCount` | `number` | `valid: true` の場合 | パースされた音符数 |
| `error` | `string` | `valid: false` の場合 | エラーの説明 |

## MyntMidiError

エラーオブジェクトの構造です。`play()` / `playJson()` の rejected Promise に含まれます。

| プロパティ | 型 | 説明 |
|---|---|---|
| `code` | `string` | エラーコード（下記一覧参照） |
| `message` | `string` | エラーの詳細メッセージ |

---

# データスキーマ

## JSON_Format（単一レイヤー）

AI 作曲連携用の JSON 形式です。`playJson()` および `jsonToMidi()` で使用します。

```json
{
  "bpm": 120,
  "notes": [
    { "pitch": "C4", "duration": "4n", "velocity": 64 },
    { "pitch": "E4", "duration": "8n" },
    { "pitch": "rest", "duration": "4n" },
    { "pitch": ["C4", "E4", "G4"], "duration": "4n" },
    { "pitch": "fade", "duration": "4n" }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `bpm` | `number` | ○ | テンポ（BPM）。例: 120 |
| `notes` | `array` | ○ | 音符の配列 |
| `notes[].pitch` | `string \| string[]` | ○ | 音名+オクターブ（例: `"C4"`）、`"rest"`（休符）、`"fade"`（フェードアウト）、または和音配列（例: `["C4", "E4", "G4"]`） |
| `notes[].duration` | `string \| number` | ○ | 音符の長さ。文字列（`"1n"`, `"2n"`, `"4n"`, `"8n"`, `"16n"`, `"4t"` 等）またはミリ秒（数値） |
| `notes[].velocity` | `number` | - | 音量 0〜127。デフォルト: 64 |

### duration の記法

| 記法 | 意味 |
|---|---|
| `"1n"` | 全音符 |
| `"2n"` | 2分音符 |
| `"4n"` | 4分音符 |
| `"8n"` | 8分音符 |
| `"16n"` | 16分音符 |
| `"4t"` | 4分音符の3連符 |
| `500` | 500ミリ秒（数値で直接指定） |

### pitch の記法

| 記法 | 意味 |
|---|---|
| `"C4"` | ド（オクターブ4） |
| `"C#4"` | ド#（シャープ） |
| `"Bb3"` | シ♭（フラット） |
| `"rest"` | 休符 |
| `"fade"` | フェードアウト |
| `["C4", "E4", "G4"]` | 和音（Cメジャー） |

## Layers_JSON（複数レイヤー）

複数の楽器パートを同時に再生するための JSON 形式です。

```json
{
  "format_version": "3.0",
  "layers": [
    {
      "name": "Melody",
      "oscillatorType": "square",
      "volume": 80,
      "mute": false,
      "solo": false,
      "bpm": 120,
      "notes": [
        { "pitch": "E5", "duration": "8n" },
        { "pitch": "G5", "duration": "8n" }
      ]
    },
    {
      "name": "Bass",
      "oscillatorType": "triangle",
      "volume": 60,
      "mute": false,
      "solo": false,
      "bpm": 120,
      "notes": [
        { "pitch": "C3", "duration": "4n" }
      ]
    }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `format_version` | `string` | ○ | `"2.0"` または `"3.0"` |
| `layers` | `array` | ○ | レイヤーの配列 |
| `layers[].name` | `string` | - | レイヤー名 |
| `layers[].oscillatorType` | `string` | - | オシレータタイプ（`"sine"`, `"square"`, `"sawtooth"`, `"triangle"`） |
| `layers[].volume` | `number` | - | 音量 0〜100 |
| `layers[].mute` | `boolean` | - | ミュート状態 |
| `layers[].solo` | `boolean` | - | ソロ状態 |
| `layers[].bpm` | `number` | - | テンポ（BPM） |
| `layers[].notes` | `array` | ○ | 音符配列（JSON_Format の `notes` と同形式） |

注記:

- `format_version: "3.0"` では `id`, `mode`, `offset`, `loop`, `fadeIn`, `fadeOut`, `visible`, `noteEvents` などの拡張フィールドを含められます。
- API 再生時は `layers` 配列に必要な再生情報があれば、拡張フィールドは省略しても動作します。

---

# MIDI 文字列構文リファレンス

MYNT MIDI 独自のテキスト音符記法の概要です。詳細は [midi-string-spec.md](midi-string-spec.md) を参照してください。

## 基本構文

| トークン | 書式 | 説明 | デフォルト |
|---|---|---|---|
| テンポ | `T{数値}` | 4分音符が1分間に鳴る回数 | 120 |
| オクターブ | `O{数値}` | オクターブ指定（0〜10） | 5 |
| 音量 | `V{数値}` | 音量（0〜100） | 50 |
| 音名 | `C D E F G A B` | ドレミファソラシ | - |
| シャープ | `{音名}+` | 半音上げ（例: `C+` = ド#） | - |
| フラット | `{音名}-` | 半音下げ（例: `D-` = レ♭） | - |
| 休符 | `S` | 無音 | - |
| フェードアウト | `~` | 音量を0にフェード | - |
| 和音 | `[{音符列}]` | 角括弧内の音を同時に鳴らす | - |

## 記述例

```
T600O6BT100O7E~          コイン音
T450O7EGO8ECDG            1upサウンド
T120O5CDEFGAB             Cメジャースケール
T120[O4CO4EO4G]           Cメジャーコード（和音）
T300O5C S C S E G         休符を含むメロディ
```

---

# エラーコード一覧

| コード | 説明 | 発生条件 | 対処方法 |
|---|---|---|---|
| `EMPTY_INPUT` | 入力が空 | `play()` に空文字列、`undefined`、`null` を渡した場合 | 有効な MIDI 文字列を渡してください |
| `INVALID_MIDI_STRING` | MIDI 文字列が不正 | パース結果に有効な音符が含まれない場合 | MIDI 文字列の構文を確認してください。`validate()` で事前検証できます |
| `INVALID_JSON` | JSON 構造が不正 | `playJson()` に不正な JSON を渡した場合（パース失敗、`bpm`/`notes` 欠落、空の `layers` 配列など） | JSON_Format または Layers_JSON のスキーマに従ってください |
| `INVALID_OPTION` | オプション値が不正 | `oscillatorType` が有効な4種類以外、`volume` が 0〜100 の範囲外、`offsetSec` が 0 未満、`loopCount` が正の整数でない場合 | `oscillatorType` は `"sine"`, `"square"`, `"sawtooth"`, `"triangle"`、`volume` は 0〜100、`offsetSec` は 0 以上、`loopCount` は正の整数を指定してください |
| `AUDIO_NOT_SUPPORTED` | Web Audio API 非対応 | `AudioContext` が存在しない環境で再生メソッドを呼び出した場合 | Web Audio API に対応したブラウザ（Chrome, Firefox, Safari, Edge の最新版）を使用してください |

## エラーハンドリングの例

```js
// try-catch パターン
try {
  const handle = await MyntMidi.play(userInput)
} catch (err) {
  switch (err.code) {
    case 'EMPTY_INPUT':
      alert('MIDI文字列を入力してください')
      break
    case 'INVALID_MIDI_STRING':
      alert('MIDI文字列の形式が正しくありません')
      break
    case 'AUDIO_NOT_SUPPORTED':
      alert('お使いのブラウザは音声再生に対応していません')
      break
    default:
      console.error('再生エラー:', err.message)
  }
}

// Promise.catch パターン
MyntMidi.play(userInput)
  .then(handle => {
    console.log('再生開始')
  })
  .catch(err => {
    console.error(`[${err.code}] ${err.message}`)
  })
```

## 再生前のバリデーション

エラーを事前に防ぐには、`validate()` で MIDI 文字列を検証してから再生してください。

```js
const result = MyntMidi.validate(userInput)
if (result.valid) {
  console.log(`${result.noteCount} 音符を検出しました`)
  await MyntMidi.play(userInput)
} else {
  console.error('無効な入力:', result.error)
}
```

---

# 実用例

## BGM のループ再生

```html
<script type="module">
  import './src/js/api/mynt-api.js'

  // BGM を無限ループ再生
  const bgm = await MyntMidi.play('T120O5CDEFGABO6C', {
    oscillatorType: 'sine',
    volume: 30,
    loop: true
  })

  // ユーザー操作で停止
  document.getElementById('stop-btn').addEventListener('click', () => {
    MyntMidi.stop()
  })
</script>
```

## 効果音の再生

```html
<script type="module">
  import './src/js/api/mynt-api.js'

  document.getElementById('coin-btn').addEventListener('click', async () => {
    await MyntMidi.play('T600O6BT100O7E~', {
      oscillatorType: 'square',
      volume: 60
    })
  })

  document.getElementById('powerup-btn').addEventListener('click', async () => {
    await MyntMidi.play('T450O7EGO8ECDG', {
      oscillatorType: 'square',
      volume: 50
    })
  })
</script>
```

## JSON から MIDI 文字列への変換

```js
// AI が生成した JSON を MIDI 文字列に変換
const aiOutput = {
  bpm: 140,
  notes: [
    { pitch: 'E5', duration: '8n', velocity: 100 },
    { pitch: 'D5', duration: '8n', velocity: 90 },
    { pitch: 'C5', duration: '4n', velocity: 80 }
  ]
}

const midiStr = MyntMidi.jsonToMidi(aiOutput)
console.log(midiStr) // MIDI 文字列が出力される

// 逆変換
const jsonStr = MyntMidi.midiToJson(midiStr)
console.log(jsonStr) // JSON 文字列が出力される
```

## 指定回数のループ再生

```js
// 3回だけ繰り返して停止
const handle = await MyntMidi.play('T300O5CEGC', {
  loop: true,
  loopCount: 3
})

// 再生状態の監視
const interval = setInterval(() => {
  if (!MyntMidi.isPlaying()) {
    console.log('再生完了')
    clearInterval(interval)
  }
}, 100)
```

## 複数レイヤーの同時再生

```js
const song = {
  format_version: '3.0',
  layers: [
    {
      name: 'Melody',
      oscillatorType: 'square',
      volume: 70,
      bpm: 120,
      notes: [
        { pitch: 'E5', duration: '4n' },
        { pitch: 'D5', duration: '4n' },
        { pitch: 'C5', duration: '2n' }
      ]
    },
    {
      name: 'Bass',
      oscillatorType: 'triangle',
      volume: 50,
      bpm: 120,
      notes: [
        { pitch: 'C3', duration: '2n' },
        { pitch: 'G2', duration: '2n' }
      ]
    }
  ]
}

await MyntMidi.playJson(song, {
  loop: true,
  offsetSec: 0.4
})
```

---

# 制限事項

## JSON ラウンドトリップの精度劣化（BUG-005）

`jsonToMidi()` と `midiToJson()` を使った JSON → MIDI文字列 → JSON の往復変換（ラウンドトリップ）では、テンポ値に ±1% 程度の誤差が生じる場合があります。

### 原因

内部の `tempoToDuration()` は T値を最も近い音符記号（`"4n"`, `"8n"` 等）にマッピングしますが、標準的な音符に該当しない場合はミリ秒にフォールバックします。このミリ秒値を逆変換する際に `Math.round()` の丸め誤差が発生します。

### 例

```js
// T700 の場合
const json = MyntMidi.midiToJson('T700O5C')
const midi = MyntMidi.jsonToMidi(json)
// midi は "T698O5C" になる可能性がある（元の T700 と異なる）
```

### 影響範囲

- 中間テンポ（T100〜T1000 付近）で顕在化しやすい
- 超高速テンポ（T3000, T4000 等の効果音向け）では影響が小さい
- 音符の pitch（音程）には影響しない

### 推奨対処

精度が重要な場合は、JSON 経由ではなく MIDI 文字列を直接使用してください。

```js
// 推奨: MIDI 文字列を直接保存・再生
const original = 'T700O5CDEFG'
await MyntMidi.play(original)

// 非推奨: JSON 経由のラウンドトリップ（誤差が生じる可能性）
const json = MyntMidi.midiToJson(original)
const converted = MyntMidi.jsonToMidi(json)
// converted は original と完全一致しない場合がある
```

---

# 動作環境

| 項目 | 要件 |
|---|---|
| ブラウザ | Web Audio API 対応ブラウザ（Chrome, Firefox, Safari, Edge の最新版） |
| JavaScript | ES Modules 対応（`<script type="module">` が必要） |
| 依存関係 | なし（外部ライブラリ不要） |
