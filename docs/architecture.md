MYNT MIDI - アーキテクチャドキュメント
===

```
Create : 2025-04-25
```

# 概要

MYNT MIDIは、ブラウザベースのMIDIエディタ/プレイヤーです。
Web Audio APIを使用し、独自のMIDI文字列記法からブラウザ上で音声を再生できます。

フレームワークやビルドツールは使用せず、Vanilla JS（ES Modules）+ CSS + HTMLのみで構成されています。
静的サーバーでそのまま配信可能です。

# ディレクトリ構成

```
├── docs/                  # ドキュメント
├── src/                   # 開発版（最新）
│   ├── asset/
│   │   └── octave.html    # 鍵盤1オクターブ分のHTMLテンプレート
│   ├── css/
│   │   ├── style.css      # エントリーCSS（各CSSをimport）
│   │   ├── main_frame.css # フレームレイアウト
│   │   ├── keyboard.css   # ピアノ鍵盤スタイル
│   │   ├── editor.css     # ピアノロールエディタスタイル
│   │   ├── timeline.css   # タイムライン目盛りスタイル
│   │   ├── timebar.css    # 再生位置バースタイル
│   │   ├── header.css     # ヘッダースタイル
│   │   ├── control.css    # コントロールUIスタイル
│   │   └── string.css     # MIDI文字列入力エリアスタイル
│   ├── img/icon/          # SVGアイコン（piano, play, start, stop, timebar）
│   ├── js/
│   │   ├── main.js        # エントリーポイント
│   │   ├── midi.js        # MIDIパース・音声再生
│   │   ├── keyboard.js    # ピアノ鍵盤UI
│   │   ├── editor.js      # ピアノロールエディタ
│   │   ├── timeline.js    # タイムライン表示
│   │   ├── timebar.js     # 再生位置バー
│   │   ├── controls.js    # 再生/停止・設定制御
│   │   ├── string.js      # MIDI文字列 ↔ エディタ変換
│   │   ├── event.js       # スクロール同期・ホバーイベント
│   │   ├── util.js        # 共通ユーティリティ基底クラス
│   │   └── common/
│   │       ├── element.js    # DOM要素アクセサ
│   │       ├── css.js        # CSS変数の動的読み書き
│   │       ├── convert.js    # テンプレート文字列置換
│   │       └── svg_import.js # SVGインライン展開
│   └── index.html         # メインHTML
└── ui/                    # 旧バージョン（コールバックベースの初期化）
```

# UI構成

画面は上から以下の順で構成されています。

1. **ヘッダー** — ロゴ、オシレータタイプ選択、時間設定、再生コントロール
2. **MIDI文字列入力エリア** — textareaに独自記法でMIDI文字列を入力
3. **タイムライン** — 時間目盛りの表示
4. **ピアノロールエディタ** — 左側にピアノ鍵盤、右側に音符配置エリア


# モジュール詳細

## エントリーポイント（main.js）

`DOMContentLoaded`後に各モジュールを`async/await`で順次初期化します。

```
Keyboard → Editor → Timeline → Timebar → Event → Controls → String → SvgImport
```

## 主要モジュール

| ファイル | クラス | 役割 |
|---|---|---|
| `midi.js` | `Midi` | MIDI文字列のパース、Web Audio APIによる音声再生 |
| `keyboard.js` | `Keyboard` | ピアノ鍵盤UIの生成（11オクターブ分を動的生成） |
| `editor.js` | `Editor` | ピアノロール風エディタ（音符の配置・ドラッグ移動・選択） |
| `timeline.js` | `Timeline` | 時間軸の目盛り表示 |
| `timebar.js` | `Timebar` | 再生位置バーのドラッグ操作 |
| `controls.js` | `Controls` | 再生/停止、時間設定、オシレータタイプの制御 |
| `string.js` | `String` | MIDI文字列 → エディタ上の音符への変換 |
| `event.js` | `Event` | 鍵盤/エディタ/タイムライン間のスクロール同期、ホバーハイライト |
| `util.js` | `Util` | 共通ユーティリティ基底クラス（座標計算、スクロール同期、タイムバー制御） |

## 共通モジュール（common/）

| ファイル | クラス | 役割 |
|---|---|---|
| `element.js` | `Element` | DOM要素への静的getterアクセサ集 |
| `css.js` | `Css` | CSSルールの動的取得・設定（CSS変数の読み書き含む） |
| `convert.js` | `Convert` | `{{key}}` 形式のテンプレート文字列置換 |
| `svg_import.js` | `SvgImport` | `<svg src="...">` をfetchしてインラインSVGに展開 |

## クラス継承

```
Util（基底クラス）
  ├── Keyboard
  ├── Editor
  ├── Timeline
  ├── Timebar
  ├── Controls
  ├── String
  └── Event
```

すべての主要モジュールは `Util` を継承しており、座標計算・スクロール同期・タイムバー制御などの共通機能を利用できます。

# MIDI文字列記法

テキストエリアに入力する独自のMIDI記法です。

## コマンド一覧

| 記法 | 説明 | 例 |
|---|---|---|
| `T数値` | テンポ設定（4分音符が1分間に鳴る回数） | `T450` |
| `O数値` | オクターブ指定（0〜10） | `O5` |
| `C D E F G A B` | 音名（ド レ ミ ファ ソ ラ シ） | `C` `E` `G` |
| `音名+` | シャープ | `C+` `F+` |
| `音名-` | フラット | `D-` `B-` |
| `S` | 休符（無音） | `S` |
| `~` | フェードアウト | `~` |
| `V数値` | 音量（デフォルト: 50） | `V80` |
| `[...]` | 和音（角括弧内の音を同時に鳴らす） | `[O5cO6c]` |

## 記法例

```
T450O7EGO8ECDG          # 1upサウンド
T600O6BT100O7E~         # コイン音
T4000 [O5fO6fO7f] S     # 和音 → 休符
```

## パース処理の流れ（Midi.get_code）

1. 正規表現で文字列をトークン分割
2. 各トークンをコマンド種別（T/O/V/音名/S/~/和音）に分類
3. 音名 → MIDIノート番号 → 周波数（Hz）に変換
4. テンポから音の長さ（秒）を算出
5. 時系列データの配列として返却

## 音声再生の流れ（Midi.sound）

1. `AudioContext` を生成
2. 和音数に応じた `OscillatorNode` + `GainNode` を生成
3. 時系列データに従い `frequency.setValueAtTime()` で周波数をスケジュール
4. `oscillator.start(0)` / `oscillator.stop(time)` で再生

# CSS変数

レイアウトやタイムスケールはCSS変数で制御されています。

| 変数名 | デフォルト値 | 説明 |
|---|---|---|
| `--key-width` | `100px` | 鍵盤の幅 |
| `--key-height` | `30px` | 鍵盤1キーの高さ |
| `--editor-line` | `#aaa` | エディタのグリッド線色 |
| `--editor-height` | `500px` | エディタの表示高さ |
| `--time-sec` | `1200px` | タイムラインの全体幅 |
| `--time-msec` | `50px` | 1目盛りのサイズ（px） |
| `--time-msec-step` | `10` | msecの分割数 |
| `--octave-size` | `20px` | オクターブ番号表示の幅 |

# src/ と ui/ の違い

| 項目 | src/（最新） | ui/（旧版） |
|---|---|---|
| 初期化方式 | `async/await` で順次初期化 | コールバックベース |
| `Main` | クラス構文 | 関数構文 |
| `String`クラス | あり（MIDI文字列→エディタ変換） | なし |
| `element.js` | `common/` 配下 | `js/` 直下 |
| 追加モジュール | — | `player.js`, `sound.js` |
| MIDI文字列サンプル | textareaにプリセットあり | 空 |

# 既知の課題・改善候補

- `src/` と `ui/` の二重管理が残っている（統合の余地あり）
- `midi.js` に `Midi` と `Midi_1` の2クラスが共存（旧実装の残骸）
- `src/js/control/`、`src/js/midi/`、`src/js/view/` が空ディレクトリ（未使用）
- ビルドシステム未導入（minify、バンドル等なし）
- テストコードなし
