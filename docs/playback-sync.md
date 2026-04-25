再生バーと音声の同期改修
===

```
Create : 2025-04-25
```

# 問題

再生ボタンをクリックした際、タイムバー（再生位置バー）の表示位置と実際の音声再生が同期していない。

# 原因

タイムバーと音声再生が異なる時間基準を使用している。

| 要素 | 時間基準 | 単位 |
|---|---|---|
| タイムバー（play_control） | `Date.now()` | ミリ秒 |
| 音声再生（Midi.sound） | `AudioContext.currentTime` | 秒 |

これらは独立した時計であり、以下の問題が発生する:

1. 2つの時計間にドリフト（ズレ）が生じる
2. AudioContext シングルトン化により `currentTime` が 0 ではなく進んだ状態で `oscillator.start(0)` すると、過去のスケジュールとなり音が即座に全部鳴る
3. タイムバーアニメーション開始と音声再生開始にラグがある

# 改修方針

AudioContext.currentTime を唯一の時間基準として統一する。

## 変更対象ファイル

- `src/js/midi.js` — sound() のスケジュール基準を currentTime に変更、開始時刻と再生時間を返す
- `src/js/util.js` — play() が Midi.play() の戻り値を返すように変更
- `src/js/controls.js` — play_control() を AudioContext.currentTime ベースに変更

## 詳細

### 1. Midi.sound() の修正

現状:
```js
oscillator[i].start(0)
oscillator[i].stop(time)
```

修正後:
```js
const startTime = act.currentTime
oscillator[i].start(startTime)
oscillator[i].stop(startTime + time)
// frequency.setValueAtTime も startTime を基準にオフセット
```

戻り値として `{ startTime, duration }` を返す。

### 2. Midi.play() の修正

`sound()` の戻り値をそのまま返す。

### 3. Util.play() の修正

`Midi.play()` の戻り値を返す。

### 4. Controls の修正

`play_control()` で `Date.now()` の代わりに `Midi.audio.currentTime` を使用:

```js
// 経過時間の計算
const elapsed = (Midi.audio.currentTime - this._playStartTime) * 1000  // ミリ秒に変換
```

`click_play()` で `this.play()` の戻り値から `startTime` を保持。

# 期待される結果

- タイムバーの位置と音声再生が正確に同期する
- AudioContext の currentTime を唯一の時間源とすることでドリフトが発生しない
- 再生終了時にタイムバーが正しい位置で停止する
