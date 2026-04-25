MYNT MIDI - 既知の不具合リスト
===

```
Create : 2025-04-25
Update : 2026-04-25
```

# 概要

MYNT MIDI API モジュール実装前に、既存コードベースで確認された不具合・問題点を記録する。
API が既存の問題を引き継がないよう、影響範囲と API への影響の有無を明記する。


# 不具合一覧

## BUG-001: パーサーの暗黙的型変換依存 ✅ 修正済み（2026-04-25）

| 項目 | 内容 |
|---|---|
| ファイル | `src/js/midi/parser.js` |
| 深刻度 | 中 |
| API影響 | あり（API経由の再生精度に影響する可能性） |
| 対応 | `get_code()` / `str2datas()` の T, O, V 代入時に `Number()` を追加 |

### 説明

`MidiParser.get_code()` 内で、正規表現のキャプチャ結果（文字列型）が
数値変換されずにそのまま `T`, `O`, `V` 変数に代入されている。

```js
// parser.js 30行目付近
if(mode === "T"){
  if(value){ T = value; tempo = this.tdur(T , 4) }  // T は文字列 "450" のまま
  continue
}
else if(mode === "O"){
  if(value){ O = value; continue }  // O は文字列 "5" のまま
}
```

`tdur()` 内の `60 / tempo` や `chord_octave2num()` 内の `octave * 12` は
JavaScript の暗黙的型変換で動作しているが、厳密な比較（`===`）や
文字列連結が混在する場面で予期しない動作を起こす可能性がある。

### 再現手順

1. `MidiParser.get_code("T450O7E")` を実行
2. 戻り値の `data.O` を確認 → 文字列 `"7"` が返る（数値 `7` ではない）
3. `typeof data.O === 'number'` → `false`

### 影響範囲

- `MidiParser.get_code()` の全呼び出し箇所
- `MidiModel.fromString()` でオクターブを `Number(data.O)` で変換しているため、モデル側では回避済み
- `MidiPlayer._schedule()` では `data.volume` を数値として演算しており、暗黙変換に依存


---

## BUG-002: webkitAudioContext の型警告 ✅ 修正済み（2026-04-25）

| 項目 | 内容 |
|---|---|
| ファイル | `src/js/midi/player.js` |
| 深刻度 | 低 |
| API影響 | なし（動作には影響しないが、コード品質の問題） |
| 対応 | 変数に分離 + `@ts-ignore` コメント追加で警告を抑制。下位互換は維持 |

### 説明

`MidiPlayer.audio` ゲッター内で `window.webkitAudioContext` を参照しているが、
現代のブラウザでは `AudioContext` が標準化されており、`webkitAudioContext` は
TypeScript / JSDoc の型定義に存在しない。

```js
// player.js 14行目
MidiPlayer._audioContext = new (window.AudioContext || window.webkitAudioContext)()
```

IDE上で「プロパティ 'webkitAudioContext' は型 'Window & typeof globalThis' に存在していない可能性があります」
という警告が表示される。

### 再現手順

1. `src/js/midi/player.js` をIDEで開く
2. 14行目に型警告が表示される

### 影響範囲

- Safari の古いバージョン（iOS 14.4以前）での互換性に関わるが、実害は少ない
- API モジュールは `MidiPlayer` を内部で使用するため、警告は引き継ぐが動作に影響なし


---

## BUG-003: パーサーのコード重複（get_code / str2datas） ✅ 修正済み（2026-04-25）

| 項目 | 内容 |
|---|---|
| ファイル | `src/js/midi/parser.js` |
| 深刻度 | 低（保守性の問題） |
| API影響 | なし（動作には影響しない） |
| 対応 | `str2datas()` を削除し `get_code()` に統一。`getOtherCode()` の呼び出しを差し替え |

### 説明

`MidiParser.get_code()` と `MidiParser.str2datas()` がほぼ同一のパースロジックを持つ。
`str2datas()` は和音内部のパース用に使われているが、`get_code()` との違いは
戻り値のデータに `O` プロパティを含むかどうかだけ。

```js
// get_code() 内の音名処理
data = { O: O, S: S, num: num, tempo: tempo, freq: frequency, volume: V }

// str2datas() 内の音名処理
data = { S: S, num: num, tempo: tempo, freq: frequency, volume: V }
```

コードの重複により、一方を修正した際にもう一方の修正を忘れるリスクがある。

### 影響範囲

- 保守性の問題のみ。現時点で動作上の不具合はない
- API モジュールは `MidiParser.get_code()` のみを間接的に使用するため、直接の影響なし


---

## BUG-004: AudioContext の stop() による完全破棄 ✅ 修正済み（2026-04-25）

| 項目 | 内容 |
|---|---|
| ファイル | `src/js/midi/player.js` |
| 深刻度 | 中 |
| API影響 | あり（ループ再生・連続再生に影響） |
| 対応 | `close()` による破棄を廃止。OscillatorNode を `_activeNodes` で追跡し個別に `stop()` する方式に変更。再生終了時に自動クリーンアップ |

### 説明

`MidiPlayer.stop()` は `AudioContext.close()` を呼び出してコンテキストを完全に破棄する。
これにより、停止直後に `play()` を呼び出すと新しい `AudioContext` が生成されるが、
ブラウザによっては `AudioContext` の生成数に制限があり、
短時間に stop → play を繰り返すとリソースリークや生成失敗が発生する可能性がある。

```js
// player.js 36-40行目
static stop(){
  if(!MidiPlayer._audioContext){ return }
  if(MidiPlayer._audioContext.state !== 'closed'){
    MidiPlayer._audioContext.close()
  }
  MidiPlayer._audioContext = null
}
```

### 再現手順

1. `MidiPlayer.play("T450O7EG")` を実行
2. 即座に `MidiPlayer.stop()` を実行
3. 即座に `MidiPlayer.play("T450O7EG")` を再実行
4. 上記を高速に繰り返す

### 影響範囲

- API のループ再生機能で、ループ間の再スケジュール時に影響する可能性
- API の `stop()` → `play()` の連続呼び出しパターンで問題が顕在化する可能性
- API実装時に、stop() の実装方式を見直す必要がある（close() ではなく、スケジュール済みノードの停止に変更するなど）


---

## BUG-005: JsonConverter のラウンドトリップ精度劣化

| 項目 | 内容 |
|---|---|
| ファイル | `src/js/midi/json-converter.js` |
| 深刻度 | 中 |
| API影響 | あり（jsonToMidi / midiToJson の変換精度に影響） |

### 説明

`JsonConverter.tempoToDuration()` は T値を最も近い音符記号（"4n", "8n" 等）に
マッピングするが、標準的な音符に該当しない場合はミリ秒（数値）にフォールバックする。
このミリ秒値を `durationToTempo()` で逆変換すると、`Math.round()` の丸め誤差により
元の T値と異なる値になる場合がある。

```js
// 例: T4000 の場合
// tempoToDuration(4000, 120) → ratio = 33.33 → ミリ秒フォールバック → 15 (ms)
// durationToTempo(15, 120) → Math.round(60000 / 15) = 4000 ← この場合はOK

// 例: T3000 の場合
// tempoToDuration(3000, 120) → ratio = 25 → ミリ秒フォールバック → 20 (ms)
// durationToTempo(20, 120) → Math.round(60000 / 20) = 3000 ← この場合もOK

// 例: T700 の場合
// tempoToDuration(700, 120) → ratio = 5.83 → ミリ秒フォールバック → 86 (ms)
// durationToTempo(86, 120) → Math.round(60000 / 86) = 698 ← 元の700と異なる
```

### 再現手順

1. `JsonConverter.toJson("T700O5C")` を実行 → duration が `86` (ms) になる
2. 結果のJSONを `JsonConverter.toMidiString()` に渡す → `T698` になる
3. 元の `T700` と異なる

### 影響範囲

- API の `jsonToMidi()` / `midiToJson()` のラウンドトリップで音の長さが微妙に変わる
- 効果音（T3000, T4000 等の超高速テンポ）では影響が小さいが、中間テンポで顕在化しやすい
- `validate()` のラウンドトリップ検証に影響する可能性


---

## BUG-006: play() の戻り値が空データ時に不統一

| 項目 | 内容 |
|---|---|
| ファイル | `src/js/midi/player.js` |
| 深刻度 | 低 |
| API影響 | あり（API の Promise 戻り値の一貫性に影響） |

### 説明

`MidiPlayer.play()` は、パース結果が空の場合に `{ startTime: 0, duration: 0 }` を返すが、
`MidiParser.get_code()` が `undefined` を返す場合（空文字列入力時）と
空配列を返す場合の区別がない。

```js
// player.js 100行目付近
static async play(midiString, options){
  await MidiPlayer.ensureAudioReady()
  const datas = MidiParser.get_code(midiString)
  if(!datas || !datas.length){ return { startTime: 0, duration: 0 } }
  // ...
}
```

また、`MidiParser.get_code()` は入力が falsy の場合に `undefined` を返す（`return` のみ）。

```js
// parser.js 19行目
static get_code(str){
  if(!str){return}  // undefined を返す
  // ...
}
```

### 再現手順

1. `MidiParser.get_code("")` → `undefined`
2. `MidiParser.get_code("XYZ")` → `[]`（有効なトークンなし）
3. どちらも `play()` では同じ `{ startTime: 0, duration: 0 }` になる

### 影響範囲

- API でエラーハンドリングを実装する際、「入力なし」と「パース失敗」を区別できない
- API の `validate()` メソッドで適切なエラーメッセージを返すために、パーサーの戻り値を正規化する必要がある


# まとめ

| ID | 深刻度 | API影響 | 概要 | 状態 |
|---|---|---|---|---|
| BUG-001 | 中 | あり | パーサーの暗黙的型変換依存 | ✅ 修正済み |
| BUG-002 | 低 | なし | webkitAudioContext の型警告 | ✅ 修正済み |
| BUG-003 | 低 | なし | パーサーのコード重複 | ✅ 修正済み |
| BUG-004 | 中 | あり | AudioContext の stop() による完全破棄 | ✅ 修正済み |
| BUG-005 | 中 | あり | JsonConverter のラウンドトリップ精度劣化 | 未対応 |
| BUG-006 | 低 | あり | play() の戻り値が空データ時に不統一 | 未対応 |

API実装時に特に注意が必要なのは BUG-001, BUG-004, BUG-005 の3件。
BUG-004 はループ再生の実装方式に直接影響するため、API設計段階で対策を検討する必要がある。
