モジュール構造リファクタリング
===

```
Create : 2025-04-25
```

# 現状の構造

```
src/js/
├── common/
│   ├── convert.js       # テンプレート文字列置換
│   ├── css.js           # CSS変数の動的読み書き
│   ├── element.js       # DOM要素アクセサ（アプリ固有だがcommonに配置）
│   └── svg_import.js    # SVGインライン展開
├── main.js              # エントリーポイント
├── midi.js              # MIDIパース + 音声再生（2責務混在）
├── keyboard.js          # ピアノ鍵盤UI
├── editor.js            # ピアノロールエディタ
├── timeline.js          # タイムライン表示
├── timebar.js           # 再生位置バー
├── controls.js          # 再生/停止・設定制御
├── string.js            # MIDI文字列→エディタ変換
├── event.js             # スクロール同期 + ホバーイベント
└── util.js              # 全モジュールの基底クラス（神クラス）
```

# 現状の問題点

1. util.js が神クラス — 座標計算、スクロール同期、タイムバー制御、再生処理、CSS変数アクセスなど無関係な責務が混在。全モジュールが継承
2. midi.js がパースと音声再生の2責務を持つ
3. event.js がスクロール同期とホバーイベントを混在
4. common/element.js がアプリ固有のDOM要素を返すのに「common」にある
5. フラットすぎてUI系・音声系・データ系の区別がつかない
6. string.js のクラス名 `String` がビルトインと衝突

# 改善後の構造

```
src/js/
├── main.js                  # エントリーポイント
├── core/                    # アプリ非依存の汎用ユーティリティ
│   ├── css.js               # CSS変数の動的読み書き
│   ├── convert.js           # テンプレート文字列置換
│   └── svg-import.js        # SVGインライン展開
├── midi/                    # MIDI関連（データ層）
│   ├── parser.js            # MIDI文字列のパース
│   └── player.js            # Web Audio APIによる音声再生
├── ui/                      # UI表示・操作（ビュー層）
│   ├── element.js           # DOM要素アクセサ
│   ├── keyboard.js          # ピアノ鍵盤
│   ├── editor.js            # ピアノロールエディタ
│   ├── timeline.js          # タイムライン目盛り
│   └── timebar.js           # 再生位置バー
├── controller/              # 操作・イベント制御
│   ├── controls.js          # 再生/停止・設定
│   ├── scroll-sync.js       # スクロール同期
│   └── string-input.js      # MIDI文字列入力→エディタ変換
└── util/                    # 共有ヘルパー（継承ではなくインポートで使用）
    ├── position.js          # 座標計算
    └── time.js              # 時間⇔ピクセル変換
```

# 設計方針

- util.js の神クラス継承を廃止 → 責務ごとに分離し、インポートで使用
- midi.js を parser.js（パース）と player.js（再生）に分離
- event.js のスクロール同期を controller/scroll-sync.js に分離
- event.js のホバーイベントは ui/keyboard.js に統合
- common/ → core/（汎用）と ui/element.js（アプリ固有）に分離
- string.js → controller/string-input.js（ビルトイン名衝突を解消）
