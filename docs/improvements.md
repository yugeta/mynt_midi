MYNT MIDI - 改善提案
===

```
Create : 2025-04-25
```

# 改善一覧

## 1. ui/ ディレクトリの削除 ✅ 完了

## 2. Midi_1 クラスの削除 ✅ 完了

`src/js/midi.js` に `Midi` と `Midi_1` の2クラスが共存しています。

- `Midi_1` は旧実装（単音のみ対応、和音非対応）
- 現在の `Midi` クラスが和音対応済みの上位互換
- `Midi_1` はどこからも参照されていない

対象: `src/js/midi.js` 内の `Midi_1` クラス全体

---

## 3. 空ディレクトリの削除 ✅ 完了

以下のディレクトリは空で、どこからも使われていません。

- `src/js/control/`
- `src/js/midi/`
- `src/js/view/`

将来のリファクタリング用と思われますが、現時点では不要です。

---

## 4. console.log の削除 ✅ 完了

開発用のデバッグログが残っています。

- `src/js/keyboard.js` — `Keyboard.key_click()` 内の `console.log(oct, key)`
- `src/js/editor.js` — `search_note()` 内の `console.log(left, trans.left, trans.width)`

---

## 5. Keyboard クラスの null チェック追加 ✅ 完了

`src/js/keyboard.js` の `key_click()` で、鍵盤以外の要素（オクターブ番号ラベル等）をクリックした場合に `elm_oct` や `elm_key` が null になりエラーが発生します。

```js
// 現状: null チェックなし
static key_click(e){
  const elm_oct = e.target.closest('.octave')
  const elm_key = e.target.closest('[data-key]')
  const oct = elm_oct.getAttribute('data-octave')  // elm_oct が null の場合エラー
```

---

## 6. Editor のイベントリスナー重複防止 ✅ 完了

`Editor.set_event()` で `window.addEventListener('mousedown', ...)` を使用していますが、Editor が再初期化された場合にリスナーが重複登録されます。

---

## 7. Midi.sound() の AudioContext リーク ✅ 完了

`Midi.play()` を呼ぶたびに `new AudioContext()` が生成されますが、使用後に `close()` されていません。
ブラウザの AudioContext 上限（通常6個程度）に達すると音が鳴らなくなります。

対策: AudioContext をシングルトンとして再利用するか、使用後に `close()` する。

---

## 8. SvgImport のキャッシュに Array を使用 ✅ 完了

`svg_import.js` で `SvgImport.datas = SvgImport.datas || []` としていますが、キーが文字列（ファイルパス）なので `Map` または `Object` を使うべきです。
Array に文字列キーで代入すると、`length` が正しく動作しません。

---

## 9. Css.get_css の戻り値が null の場合のハンドリング ✅ 完了

`Util` クラスの `get msec()` で `Css.get_css(':root','--time-msec')` の戻り値に対して `.replace('px','')` を呼んでいますが、CSS変数が未定義の場合 `null.replace()` でエラーになります。

---

## 10. MIDI文字列入力エリアの非表示 ✅ 完了

`src/css/string.css` で `.midi-string-area` に `display: none` が設定されていますが、`src/index.html` の textarea にはサンプルデータが入っています。
`String` クラスが textarea の値を読み取ってエディタに音符を配置する機能があるため、非表示のままだとユーザーが文字列を編集できません。

---

# 優先度

| 優先度 | 項目 | 理由 |
|---|---|---|
| 高 | 1. ui/ 削除 | 二重管理の解消 |
| 高 | 2. Midi_1 削除 | デッドコード除去 |
| 高 | 7. AudioContext リーク | 機能的なバグ |
| 中 | 4. console.log 削除 | コード品質 |
| 中 | 5. null チェック追加 | ランタイムエラー防止 |
| 中 | 9. null ハンドリング | ランタイムエラー防止 |
| 低 | 3. 空ディレクトリ削除 | 整理 |
| 低 | 6. イベントリスナー重複 | エッジケース |
| 低 | 8. SvgImport キャッシュ | 軽微な問題 |
| 低 | 10. 文字列入力エリア非表示 | UX改善 |

---

# 追加改修

## 11. 再生ボタンが動作しない問題 ✅ 完了

- `play_control()` 内の `requestAnimationFrame(this.play.bind(this))` が `Util.play()` を呼んでいた
- `requestAnimationFrame` がタイムスタンプを引数に渡すため MIDI パースに失敗
- `this.play_control.bind(this)` に修正

## 12. Css.get_rules の SecurityError ✅ 完了

- クロスオリジンのスタイルシートの `cssRules` アクセスで `SecurityError` が発生
- `try-catch` でスキップするように修正

## 13. 再生バーと音声の同期 ✅ 完了

詳細は `docs/playback-sync.md` を参照。

- AudioContext.currentTime を唯一の時間基準に統一
- Midi.sound() のスケジュールを currentTime ベースに変更
- タイムバー位置計算を音符配置の座標系に合わせて修正
- set_bar_pos / follow_line に null チェック追加
