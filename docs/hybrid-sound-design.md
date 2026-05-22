MYNT MIDI - ハイブリッドサウンドシステム設計
===

```
Create : 2025-05-22
Status : 設計段階（未実装）
```

# 概要

MYNT MIDIの再生エンジンを拡張し、**軽量モード（MIDI文字列）** と **MIDIモード（時刻ベースnoteEvents）** をハイブリッドで共存させる。

ブラウザゲームでの利用を想定し、以下を実現する：
- SE（効果音）はMIDI文字列で手軽に記述（MSX BASIC PLAY文のような感覚）
- BGMはMIDIファイルからインポートし、精度劣化なしで再生
- 1つのデータ内でBGMとSEを混在させたタイムライン配置が可能
- ゲームランタイムではBGM/SEを独立チャンネルで制御

# 背景・動機

## 現状の課題

1. MIDIインポート時にT値（整数）への変換で精度が劣化する
2. 長い音符（duration > 120000ms）でT=0が発生し、再生不能になる
3. 同時発音の表現が限定的（和音記法のみ、独立パートの同時進行は不可）
4. ゲーム用途でBGMとSEを統合管理する仕組みがない

## 設計方針

- 既存のMIDI文字列機能は一切壊さない
- 新しいMIDIモードを横に追加する形で拡張
- 再生エンジン（Web Audio API / OscillatorNode）は共通
- 段階的に実装可能な設計にする

# アーキテクチャ

## 全体構成

```
┌─────────────────────────────────────────────────┐
│  MYNT MIDI エディタ                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  [軽量モード: string]     [MIDIモード: midi]     │
│  MIDI文字列テキスト       noteEventsリスト        │
│  "T120O5CDES"            [{t,d,n,v}, ...]       │
│                                                 │
│  用途: SE, ジングル       用途: BGM, 長い楽曲     │
│  サイズ: 数十バイト       サイズ: 数KB〜          │
│  精度: T値（整数BPM）    精度: ミリ秒            │
│  入力: textarea手書き     入力: エディタGUI/.mid  │
│                                                 │
├─────────────────────────────────────────────────┤
│  共通再生エンジン（Web Audio API）                │
│  OscillatorNode + GainNode ベース               │
├─────────────────────────────────────────────────┤
│  ゲーム用API（MyntAudio）                        │
│  BGMチャンネル / SEチャンネル / 独立制御          │
└─────────────────────────────────────────────────┘
```

## レイヤーデータ構造（v3.0）

```js
{
  format_version: "3.0",
  name: "boss_battle_intro",
  duration: 30,                    // 全体の長さ（秒）
  layers: [
    {
      id: "layer_0",
      name: "BGM: main theme",
      mode: "midi",                // "string" | "midi"
      offset: 0,                   // 再生開始オフセット（秒）
      loop: true,                  // レイヤー単位のループ
      oscillatorType: "sawtooth",
      volume: 40,
      mute: false,
      solo: false,
      visible: true,
      // MIDIモード用
      noteEvents: [
        { time: 0.0, duration: 0.5, midi: 60, velocity: 64 },
        { time: 0.5, duration: 0.25, midi: 62, velocity: 80 },
        // ...
      ],
      midiString: ""               // 未使用（midiモード時）
    },
    {
      id: "layer_1",
      name: "SE: alert",
      mode: "string",              // 軽量モード
      offset: 2.5,                 // 2.5秒地点で再生開始
      loop: false,
      oscillatorType: "square",
      volume: 70,
      mute: false,
      solo: false,
      visible: true,
      // 軽量モード用
      midiString: "T180O6EDEDEDED",
      noteEvents: null             // 未使用（stringモード時）
    }
  ]
}
```

### 新規フィールド

| フィールド | 型 | デフォルト | 説明 |
|---|---|---|---|
| `mode` | `"string" \| "midi"` | `"string"` | レイヤーの動作モード |
| `offset` | `number` | `0` | 再生開始オフセット（秒） |
| `loop` | `boolean` | `false` | レイヤー単位のループ再生 |
| `noteEvents` | `Array \| null` | `null` | MIDIモード用ノートデータ |

### noteEvent 構造

```js
{
  time: 0.0,        // 開始時刻（秒）— レイヤー内の相対時刻
  duration: 0.5,    // 長さ（秒）
  midi: 60,         // MIDIノート番号（0-127）
  velocity: 64      // ベロシティ（0-127）
}
```

# 再生エンジン設計

## 統合再生フロー

```js
class MidiPlayer {
  static playLayer(layer, startOffset = 0) {
    const layerOffset = layer.offset || 0

    if (layer.mode === 'string') {
      // 既存パス: MIDI文字列 → パース → スケジュール
      const datas = MidiParser.get_code(layer.midiString)
      this._scheduleFromParsed(datas, layer, layerOffset + startOffset)
    }
    else if (layer.mode === 'midi') {
      // 新規パス: noteEvents → 直接スケジュール（変換なし）
      this._scheduleFromEvents(layer.noteEvents, layer, layerOffset + startOffset)
    }
  }

  static _scheduleFromEvents(events, layer, offset) {
    const ctx = this._getContext()
    const now = ctx.currentTime

    for (const event of events) {
      const startTime = now + event.time + offset
      const freq = 440 * Math.pow(2, (event.midi - 69) / 12)
      const vol = (event.velocity / 127) * (layer.volume / 100)

      this._scheduleNote(startTime, event.duration, freq, vol, layer.oscillatorType)
    }
  }
}
```

## ゲーム用API（MyntAudio）

ゲームランタイムで使用する高レベルAPI。

```js
class MyntAudio {
  // --- BGM制御 ---
  static playBGM(name, options = {})    // ループ再生開始
  static stopBGM(options = {})          // 停止（fadeOut対応）
  static pauseBGM()                     // 一時停止
  static resumeBGM()                    // 再開
  static setBGMVolume(vol)              // 音量変更（0-100）

  // --- SE制御 ---
  static playSE(name, options = {})     // 即時再生（BGMに重なる）
  static stopAllSE()                    // 全SE停止

  // --- データ管理 ---
  static register(name, data)           // サウンドデータを登録
  static load(url)                      // JSONファイルから一括読み込み
}
```

### 使用例（ゲームコード）

```js
// 初期化
await MyntAudio.load('sounds/game-sounds.json')

// BGM再生
MyntAudio.playBGM('town_theme', { fadeIn: 1.0 })

// SE再生（BGMと同時に鳴る）
MyntAudio.playSE('coin')
MyntAudio.playSE('jump')

// BGM切り替え
MyntAudio.stopBGM({ fadeOut: 2.0 })
setTimeout(() => MyntAudio.playBGM('battle_theme'), 2000)
```

### ゲーム配布用データフォーマット

```json
{
  "sounds": {
    "coin": {
      "mode": "string",
      "oscillatorType": "square",
      "volume": 60,
      "data": "T600O6BT100O7E~"
    },
    "jump": {
      "mode": "string",
      "oscillatorType": "triangle",
      "volume": 50,
      "data": "T200O4C+D+E+F+"
    },
    "town_theme": {
      "mode": "midi",
      "oscillatorType": "sawtooth",
      "volume": 40,
      "loop": true,
      "data": [
        {"t":0,"d":0.5,"n":60,"v":64},
        {"t":0.5,"d":0.25,"n":62,"v":80}
      ]
    }
  }
}
```

# SMF（標準MIDIファイル）パーサー

## 対応範囲

| 項目 | 対応 |
|---|---|
| SMF Type 0（単一トラック） | ○ |
| SMF Type 1（マルチトラック） | ○ |
| SMF Type 2（独立パターン） | × |
| テンポチェンジ | ○ |
| ノートオン/オフ | ○ |
| ベロシティ | ○ |
| コントロールチェンジ | △（音量のみ） |
| プログラムチェンジ | ×（オシレーターに変換不可） |
| ピッチベンド | × |
| SysEx | × |

## 変換フロー

```
.mid (ArrayBuffer)
  ↓ SMFパーサー
  ↓   - ヘッダーチャンク解析（format, tracks, division）
  ↓   - トラックチャンク解析（deltaTime, events）
  ↓   - テンポマップ構築（tick → 秒 変換テーブル）
  ↓   - noteOn/Off ペアリング
  ↓
noteEvents: [{time, duration, midi, velocity}, ...]
  ↓
レイヤーに格納（mode: "midi"）
  ↓
再生時: noteEvents → Web Audio スケジュール（T値変換なし、精度劣化なし）
```

## 推定実装規模

- SMFパーサー本体: 300-500行
- テンポマップ: 50-100行
- noteOn/Offペアリング: 50-100行
- 合計: 約500-700行（外部ライブラリ不要）

# データサイズ比較

| 内容 | 軽量モード (string) | MIDIモード (midi) | .mid ファイル |
|---|---|---|---|
| SE "ピコッ" | 12バイト | ~60バイト | ~100バイト |
| SE "コイン" | 20バイト | ~80バイト | ~150バイト |
| BGM 30秒 | 200-800バイト | 2-5KB | 3-10KB |
| BGM 3分 | 1-3KB | 10-30KB | 15-50KB |

ゲーム配布時の推奨：
- SE → 軽量モード（文字列）で配布
- BGM → MIDIモード（noteEvents JSON）で配布
- 開発時 → .midファイルからインポートしてnoteEventsに変換

# CPU負荷の考慮

## 再生時の負荷

| 項目 | 軽量モード | MIDIモード |
|---|---|---|
| パース | 正規表現マッチ（軽い） | 不要（データが既にパース済み） |
| スケジュール | ノート数に比例 | ノート数に比例 |
| 発音 | OscillatorNode | OscillatorNode（同じ） |
| 同時発音数 | 通常1-4 | 楽曲により10-30+ |

## 注意点

- 同時発音数が多い楽曲（オーケストラ等）ではOscillatorNodeの数が増え、CPU負荷が上がる
- 対策: 同時発音数の上限設定（例: 最大16音）、優先度の低い音を間引く
- SE再生は瞬間的なので負荷は無視できるレベル

## メモリ使用量

- 軽量モード: 文字列のみ保持（数十バイト〜数KB）
- MIDIモード: noteEvents配列を保持（数KB〜数十KB）
- ゲーム全体のサウンドデータ: 通常100KB以下に収まる

# タイムライン配置（イベントシーン用）

## 概念

1つのデータ内で、BGMとSEを時間軸上に配置する。

```
時間軸 →
0s        5s        10s       15s       20s
├─────────┼─────────┼─────────┼─────────┤
│ BGM(midi) ─────────────────────── loop │  layer_0: offset=0
│         │ SE:剣(string)     │         │  layer_1: offset=5.0
│         │         │ SE:爆発(string)   │  layer_2: offset=10.0
│         │         │         │ SE:勝利 │  layer_3: offset=15.0
└─────────┴─────────┴─────────┴─────────┘
```

## エディタUI上の表現

- 各レイヤーのノートは `offset` 分だけ右にずれて表示される
- レイヤーパネルに `offset` 入力欄を追加
- タイムライン上でドラッグしてオフセットを調整可能（将来）

# 後方互換性

## v2.0 → v3.0 マイグレーション

- `mode` フィールドがないレイヤーは `"string"` として扱う
- `offset` フィールドがないレイヤーは `0` として扱う
- `loop` フィールドがないレイヤーは `false` として扱う
- `noteEvents` フィールドがないレイヤーは `null` として扱う

既存のv2.0データはそのまま動作する。

## MIDI文字列の互換性

MIDI文字列の記法・パーサーは一切変更しない。
軽量モードは現在と完全に同じ動作を維持する。

# 実装ロードマップ

## Phase 1: ハイブリッド基盤

- [ ] LayerModel に `mode`, `noteEvents`, `offset`, `loop` フィールド追加
- [ ] MidiPlayer に `_scheduleFromEvents()` 実装
- [ ] レイヤーパネルにモード表示追加
- [ ] format_version "3.0" のシリアライズ/デシリアライズ

## Phase 2: SMFパーサー

- [ ] SMFバイナリパーサー実装（Type 0/1対応）
- [ ] テンポマップ構築
- [ ] noteOn/Off ペアリング → noteEvents 変換
- [ ] .mid ファイルインポートUI（ドラッグ&ドロップ or ファイル選択）

## Phase 3: エディタ統合

- [ ] MIDIモードレイヤーのエディタ表示（noteEventsから直接描画）
- [ ] offset のタイムライン上での可視化
- [ ] レイヤー単位のループ再生対応

## Phase 4: ゲーム用API

- [ ] MyntAudio クラス実装
- [ ] BGM/SEチャンネル分離
- [ ] フェードイン/アウト
- [ ] ゲーム配布用JSONエクスポート
- [ ] 軽量ランタイム（エディタ不要、再生のみ）の分離

# 関連ドキュメント

- [architecture.md](./architecture.md) — 現在のアーキテクチャ
- [data-flow-spec.md](./data-flow-spec.md) — データフロー仕様
- [midi-string-spec.md](./midi-string-spec.md) — MIDI文字列記法仕様
- [api-manual.md](./api-manual.md) — API仕様
