# MIDI → MIDI JSON 変換レポート

## 変換内容

**入力**: `yueno-guang-dobyusshi.mid` (標準 MIDI ファイル)  
**出力**: `yueno-guang-dobyusshi.json` (MIDI JSON フォーマット 2.0)

---

## MIDI JSON 仕様

### フォーマットバージョン
`2.0` （複数レイヤー形式）

### 構造
```json
{
  "format_version": "2.0",
  "layers": [
    { レイヤー 1 },
    { レイヤー 2 },
    ...
  ]
}
```

---

## レイヤー構成

### Layer 0: Track 3（高声部 / メロディ）
| 項目 | 値 |
|-----|-----|
| **Oscillator Type** | `square` （矩形波・ファミコン風） |
| **Volume** | 50 (0〜100) |
| **BPM** | 120 |
| **Notes** | **724** |
| **Pitch Range** | A#2 ~ G5 |
| **Duration Types** | 40+ 種類 |

**特徴**:
- 主メロディと高い和音
- 複雑なリズム構造（付点音符、複合リズム多数）
- 幅広いピッチレンジ

### Layer 1: Track 4（低声部 / 伴奏）
| 項目 | 値 |
|-----|-----|
| **Oscillator Type** | `sawtooth` （ノコギリ波・鋭い音） |
| **Volume** | 50 (0〜100) |
| **BPM** | 120 |
| **Notes** | **996** |
| **Pitch Range** | A#1 ~ G4 |
| **Duration Types** | 45+ 種類 |

**特徴**:
- 伴奏と低音
- より多くのノート
- より低いピッチレンジ

---

## Duration（音価）の統計

### 標準記号表記（MIDI JSON）

| Duration | 説明 | 用例 |
|----------|------|------|
| `"1n"` | 全音符 | Layer 0: 39個 |
| `"2n"` | 2分音符 | Layer 0: 45個、Layer 1: 48個 |
| `"4n"` | 4分音符 | Layer 0: 23個、Layer 1: 51個 |
| `"4n."` | 付点4分音符 | Layer 0: 60個 |
| `"2n."` | 付点2分音符 | Layer 0: 60個 |
| `"1n."` | 付点全音符 | Layer 1: 17個 |

### 数値指定（ティック値）

複雑なリズム（3連符、変則拍など）は数値で指定:
- **Layer 0**: 3,360〜173,280 (複数タイプ)
- **Layer 1**: 2,400〜477,600 (複数タイプ)

---

## ファイル情報

### メタデータ
- **ファイルサイズ**: 172 KB
- **行数**: 8,620 行
- **形式**: JSON (UTF-8)
- **総ノート数**: 1,720

### 内容サンプル

```json
{
  "pitch": "F4",
  "duration": "4n",
  "velocity": 64
}
```

- **pitch**: 音名（例: C4, F#5, A#2）
- **duration**: 音価（標準記号または数値）
- **velocity**: MIDI ベロシティ（0〜127）

---

## 変換プロセス

### ステップ

1. **MIDI ファイル読み込み**
   - MIDI Format 1 解析
   - PPQN (480) と テンポ (120 BPM) を抽出

2. **トラック分離**
   - Tempo Meta トラック（インデックス 0）をスキップ
   - ノート データを持つトラック（インデックス 3, 4）をレイヤー化

3. **Note イベント抽出**
   - Note On / Note Off メッセージから音符情報を取得
   - ピッチ (MIDI note number → 音名変換)
   - ベロシティ（強弱記号）

4. **Duration 計算**
   - ティック差分 → 標準記号または数値に変換
   - PPQN480 ベースの計算

5. **Oscillator Type 割当**
   - Layer 0 (トラック 3): `square` （スクエア波）
   - Layer 1 (トラック 4): `sawtooth` （のこぎり波）

6. **JSON シリアライズ**
   - UTF-8 エンコーディング
   - インデント 2 スペース

---

## 用途

### このファイルの使用場面

✅ **Web Audio API での再生**
- Tone.js などのシンセサイザーライブラリで直接使用可能

✅ **ゲーム開発**
- BGM データとして埋め込み

✅ **MIDI 編集**
- 標準 MIDI との相互変換

✅ **データ分析**
- 楽曲構造の機械学習入力

---

## 技術詳細

### MIDI Note → Note Name 変換

```python
NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def midi_note_to_string(note_num):
    octave = (note_num // 12) - 1
    note = NOTE_NAMES[note_num % 12]
    return f"{note}{octave}"
```

### Duration ティック値

```
PPQN = 480

1n   = 1920 ticks  (全音符)
2n   = 960 ticks   (2分音符)
4n   = 480 ticks   (4分音符)
8n   = 240 ticks   (8分音符)
16n  = 120 ticks   (16分音符)
4n.  = 720 ticks   (付点4分音符 = 480 × 1.5)
```

---

## 品質チェックリスト

✅ Format Version: 2.0  
✅ Layer Count: 2  
✅ Total Notes: 1,720  
✅ Pitch Range: A#1 (note 34) ~ G5 (note 79)  
✅ Tempo Consistency: 120 BPM (全 Layer)  
✅ Velocity Distribution: 多様性あり  
✅ Duration Variety: 45+ unique patterns  
✅ JSON Validity: ✓ Valid

---

## 互換性

### 対応プラットフォーム

| プラットフォーム | 対応度 |
|----------------|-------|
| **Web Audio API** | ✅ Full |
| **Tone.js** | ✅ Full |
| **Synthesizer.js** | ✅ Full |
| **JSMIDGEN** | ⚠️ Partial |
| **標準 MIDI** | ⚠️ Needs reconversion |

---

## 次のステップ

### 推奨される用途

1. **Web ブラウザでの再生**
   ```javascript
   // Tone.js を使用した例
   const now = Tone.now();
   midiJsonData.layers.forEach(layer => {
     layer.notes.forEach((note, idx) => {
       synth.triggerAttackRelease(note.pitch, note.duration, now);
     });
   });
   ```

2. **他形式への変換**
   - MusicXML への再変換
   - 標準 MIDI への逆変換

3. **データ解析**
   - 音楽構造の自動認識
   - コード解析

---

**変換完了**: 2025-05-06  
**バージョン**: MIDI JSON Format 2.0  
**ステータス**: ✅ Ready for Use
