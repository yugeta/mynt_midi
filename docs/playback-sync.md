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

---

# 実施記録

## Phase 1: AudioContext.currentTime ベースへの統一 ✅ 完了

### Midi.sound() の修正
- すべての `setValueAtTime` / `start` / `stop` を `act.currentTime` 基準にオフセット
- `{ startTime, duration }` を戻り値として返すように変更

### Midi.play() / Util.play() の修正
- 戻り値をそのまま返すように変更

### Controls の修正
- `click_play()` で `this.play()` の戻り値から `startTime` を保持
- `play_control()` で `Date.now()` → `Midi.audio.currentTime` に変更

## Phase 2: 追加バグ修正 ✅ 完了

### play_control の再帰呼び出しバグ
- `requestAnimationFrame(this.play.bind(this))` → `this.play_control.bind(this)` に修正
- `requestAnimationFrame` がコールバックにタイムスタンプ（数値）を渡すため、`Util.play(midi_string)` の引数に数値が入り MIDI パースに失敗していた

### Css.get_rules / get_rule の SecurityError
- クロスオリジンのスタイルシートの `cssRules` にアクセスすると `SecurityError` が発生
- `try-catch` で囲んでアクセスできないスタイルシートをスキップするように修正

### set_bar_pos / follow_line の null チェック
- `Element.elm_timebar_icon` / `Element.elm_timebar_line` が null の場合にエラーでアニメーションループが停止していた
- null チェックを追加

### switch 文内の const スコープ
- `click_play()` の `default` ブロック内で `const result` を使用 → ブロックスコープ `{}` で囲んだ

## Phase 3: タイムバーと音符配置の座標系統一 ✅ 完了

### 問題
- 音符は `default_note_width`（50px）ずつ等間隔に配置
- タイムバーは `time2pos()` で経過ミリ秒からピクセル位置を計算（1秒 = 500px）
- テンポによって音符間の実時間が変わるため、2つの座標系が一致しない

### 修正
- `play_control()` のタイムバー位置計算を変更:
  - `経過時間 / 全再生時間` で進捗割合を算出
  - `音符の総数 × default_note_width` で全体幅を算出
  - `進捗割合 × 全体幅` でピクセル位置を決定
- `click_play()` で MIDI データの音符数を事前に取得して保持
