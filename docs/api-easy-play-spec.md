# API簡易再生仕様（イベント駆動）

作成日: 2026-06-27
対象: `api/main.js` 読み込み後、少ない記述で音再生を行うための運用仕様

実装状況: `MyntMidi.bindPlay()` 実装済

## 背景

現行 API は柔軟だが、実装時に fetch、イベント登録、停止制御、コールバック管理を都度書く必要がある。
本仕様は「手軽に鳴らせる実装パターン」を標準化し、ページ側コードを短く保つことを目的とする。

## 既存ドキュメント状況

- [docs/api-manual.md](docs/api-manual.md) はコア API リファレンス中心
- イベント対象、DOM 準備タイミング、停止イベント、再生完了コールバックをまとめた簡易運用仕様として本書を追加

## 必須要件（ユーザー要件の整理）

1. 指定 JSON ファイルの読み込み、または MIDI 文字列直接指定
2. イベント対象で再生開始（クリックなど）
3. ループフラグ指定
4. F.O.（フェードアウト）フラグ指定
5. 停止イベント対応（任意）
6. `DOMContentLoaded` 後に要素を解決して初期化
7. 再生開始時 / 終了時コールバック

## 追加推奨要件（不足しやすい項目）

1. 二重起動防止
- 再生中クリック時の方針を定義（無視 / 再スタート / 重ね再生禁止）

2. 先読みキャッシュ
- JSON URL からの読み込みは 1 回目のみ fetch し、2 回目以降はキャッシュ利用

3. 失敗時の通知フック
- `onError(err)` を必須で持たせ、UI 表示とログ出力を統一

4. ユーザー操作起点の保証
- Web Audio 制約回避のため、再生は必ずユーザーイベント起点で開始

5. 破棄処理
- SPA などで画面離脱時にイベント解除できる `dispose()` を持たせる

6. デフォルトオプション
- `volume`, `oscillatorType`, `loop`, `fadeOut`, `offsetSec` を初期値化

## 推奨インターフェース案

```js
const controller = await MyntMidi.bindPlay({
  source: {
    type: 'json-url', // 'json-url' | 'json-object' | 'midi-string'
    value: '/sounds/coin.json'
  },
  playTrigger: {
    target: '#coin-btn',
    event: 'click'
  },
  stopTrigger: {
    target: '#coin-stop-btn',
    event: 'click'
  },
  options: {
    loop: false,
    fadeOut: true,
    volume: 70
  },
  callbacks: {
    onStart: () => {},
    onEnd: () => {},
    onStop: () => {},
    onError: (err) => {}
  }
})

// 画面破棄時
controller.dispose()
```

## 実装ルール（ページ側）

1. 初期化タイミング
- `DOMContentLoaded` 後に `bindPlay()` を呼ぶ

2. 要素解決
- `playTrigger.target` / `stopTrigger.target` が見つからない場合は初期化失敗

3. 入力ソース
- `json-url`: 取得後に内部で `playJson()`
- `json-object`: そのまま `playJson()`
- `midi-string`: `play()`

4. 再生終了判定
- `PlaybackHandle.status` 監視または内部タイマーで `onEnd` を呼ぶ

5. 停止
- 停止イベント時は `MyntMidi.stop()` 実行後 `onStop` 発火

6. F.O. フラグ
- `fadeOut: true` 時は停止直前に短いフェードを適用（可能な場合）

## 最小利用例

```html
<button id="coin-btn">Play</button>
<button id="coin-stop-btn">Stop</button>

<script type="module">
  import '../../api/main.js'

  window.addEventListener('DOMContentLoaded', async () => {
    await MyntMidi.bindPlay({
      source: { type: 'json-url', value: '../コイン.json' },
      playTrigger: { target: '#coin-btn', event: 'click' },
      stopTrigger: { target: '#coin-stop-btn', event: 'click' },
      options: { loop: false, fadeOut: true },
      callbacks: {
        onStart: () => console.log('start'),
        onEnd: () => console.log('end'),
        onError: (err) => console.error(err)
      }
    })
  })
</script>
```

## 導入ステップ（推奨）

1. API 利用
- `MyntMidi.bindPlay()` を利用してイベント駆動再生を実装

2. 互換維持
- 既存の `play()` / `playJson()` / `stop()` は変更しない

3. 検証
- [sample/html/coin-play-button.html](sample/html/coin-play-button.html) を `bindPlay()` 版へ置換して動作確認

4. ドキュメント連携
- [docs/api-manual.md](docs/api-manual.md) に「簡易再生 API」章を追加

## 非目標

1. DAW 相当の詳細制御（レイヤー編集、タイムライン同期）
2. 複数同時 SE の高度ミキシング
3. 既存コア API の挙動変更