# MYNT MIDI API 使い方ガイド

この README は、/api 配下の公開 API の使い方だけをまとめたものです。

## 1. 使う前の準備

HTML で API を読み込みます（ES Modules）。

```html
<script type="module">
  import './api/main.js'

  // 以後、window.MyntMidi が利用可能
  console.log(MyntMidi.version)
</script>
```

注意:
- ブラウザ環境で動作します。
- 音を鳴らす処理は、クリックなどユーザー操作起点で呼ぶのが安全です（Web Audio 制約）。

## 2. 最短で鳴らす

```html
<button id="play">Play</button>
<button id="stop">Stop</button>

<script type="module">
  import './api/main.js'

  const playBtn = document.getElementById('play')
  const stopBtn = document.getElementById('stop')

  playBtn.addEventListener('click', async () => {
    try {
      await MyntMidi.play('T600O6BT100O7E~')
    } catch (err) {
      console.error(err)
    }
  })

  stopBtn.addEventListener('click', () => {
    MyntMidi.stop()
  })
</script>
```

## 3. 再生オプション（PlayOptions）

`play()` / `playJson()` / `bindPlay()` で使えます。

- oscillatorType: `sine | square | sawtooth | triangle`
- volume: `0-100`
- loop: `true/false`
- loopCount: 正の整数（loop=true 時の回数指定）
- offsetSec: `0` 以上の秒数
- fadeOut: `true/false`（bindPlay 停止時の遅延停止）
- fadeOutSec: フェードアウト秒（bindPlay 用）

## 4. API 一覧

### version

API バージョン文字列。

```js
MyntMidi.version
```

### play(midiString, options?)

MIDI文字列を再生します。

```js
const handle = await MyntMidi.play('T450O7EGO8ECDG', {
  oscillatorType: 'sine',
  volume: 80,
  loop: true
})

console.log(handle.status)   // playing
console.log(handle.looping)  // true
```

戻り値（PlaybackHandle）:
- status: `playing` or `stopped`
- looping: ループ中か
- stop(): このハンドル経由で停止

### playJson(jsonOrString, options?)

JSON を再生します。次の2形式に対応します。

1. JSON_Format（単一レイヤー）

```js
await MyntMidi.playJson({
  bpm: 120,
  notes: [
    { pitch: 'C4', duration: '4n', velocity: 80 },
    { pitch: 'E4', duration: '4n' },
    { pitch: 'G4', duration: '2n' },
    { pitch: 'rest', duration: '8n' }
  ]
})
```

2. Layers_JSON（複数レイヤー。format_version: "2.0" / "3.0"）

```js
await MyntMidi.playJson({
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
```

### stop()

再生中の音をすべて停止します。

```js
MyntMidi.stop()
```

### isPlaying()

再生中かどうかを返します。

```js
if (MyntMidi.isPlaying()) {
  MyntMidi.stop()
}
```

### startNote(key, octave, options?) / stopNote(handle)

単音の押下再生に使います（鍵盤UI向け）。

```js
const noteHandle = await MyntMidi.startNote('c', 4, { oscillatorType: 'square', volume: 70 })
// ...
MyntMidi.stopNote(noteHandle)
```

### bindPlay(config)

イベント駆動で「ボタンを押したら再生」を簡単に実装できます。

```html
<button id="coin-play">Play</button>
<button id="coin-stop">Stop</button>

<script type="module">
  import './api/main.js'

  const controller = await MyntMidi.bindPlay({
    source: {
      type: 'json-url', // 'json-url' | 'json-object' | 'midi-string'
      value: './data/coin.json'
    },
    playTrigger: {
      target: '#coin-play',
      event: 'click'
    },
    stopTrigger: {
      target: '#coin-stop',
      event: 'click'
    },
    options: {
      loop: false,
      fadeOut: true,
      fadeOutSec: 0.12,
      volume: 75
    },
    callbacks: {
      onStart: () => console.log('start'),
      onEnd: () => console.log('end'),
      onStop: () => console.log('stop'),
      onError: (err) => console.error(err)
    }
  })

  // 任意タイミングで
  // await controller.play()
  // controller.stop()
  // controller.dispose()
</script>
```

### jsonToMidi(json)

JSON_Format を MIDI文字列へ変換します。

```js
const midi = MyntMidi.jsonToMidi({
  bpm: 120,
  notes: [{ pitch: 'C4', duration: '4n' }]
})
```

### midiToJson(midiString)

MIDI文字列を JSON文字列へ変換します。

```js
const jsonText = MyntMidi.midiToJson('T120O4C')
console.log(JSON.parse(jsonText))
```

### validate(midiString)

MIDI文字列の簡易検証を行います。

```js
const result = MyntMidi.validate('T120O4C')
// { valid: true, noteCount: ... }
```

## 5. エラー処理

主要 API は失敗時に `{ code, message }` 形式で reject します。

よく使うエラーコード:
- EMPTY_INPUT
- INVALID_OPTION
- AUDIO_NOT_SUPPORTED
- INVALID_MIDI_STRING
- INVALID_JSON
- INVALID_BIND_CONFIG

例:

```js
try {
  await MyntMidi.play('')
} catch (err) {
  console.error(err.code, err.message)
}
```

## 6. 補足

- 再生開始時に既に別の音が鳴っている場合、内部で停止してから再生します。
- `bindPlay()` の `source.type = 'json-url'` は、同一URLを内部キャッシュします。
