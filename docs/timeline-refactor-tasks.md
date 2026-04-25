タイムライン座標系リファクタリング - タスク一覧
===

```
Create : 2026-04-25
```

# 仕様

- Time = タイムライン全体の表示範囲（秒）。音符の長さとは独立
- key の left = `(startTime / Time秒) * timelineWidth`
- key の width = `(tempo秒 / Time秒) * timelineWidth`
- クリック配置: left → startTime に逆算、width はデフォルトテンポから算出
- テキスト→描画: パース結果の startTime, tempo から left, width を算出
- 描画→テキスト: left, width から startTime, tempo を逆算

# 変換式

```
timelineWidth = CSS --time-sec（px）
timeSec = Time入力欄の値（秒）
pxPerSec = timelineWidth / timeSec

time → px:  left = startTime * pxPerSec
            width = tempo * pxPerSec

px → time:  startTime = left / pxPerSec
            tempo = width / pxPerSec
```

# タスク

## 1. time.js に変換ヘルパーを追加
- `time2px(sec)` と `px2time(px)` を追加
- Time 入力欄の値と timelineWidth から pxPerSec を算出
- 影響ファイル: `src/js/util/time.js`
- 確認: 既存の `get_width()`, `get_fulltime()` 等に影響なし

## 2. MidiModel.fromString() の left/width 計算を変更
- `totalDuration` 基準 → `Time秒` 基準に変更
- width をモデルに追加（現在は left のみ）
- 影響ファイル: `src/js/midi/model.js`
- 確認: textarea にテキストを入力 → key が Time 基準の位置に描画される

## 3. put_note() を width 対応にする
- 現在は固定幅。引数で width を受け取れるようにする
- 影響ファイル: `src/js/util/position.js`
- 確認: 既存の put_note 呼び出し箇所が壊れないこと

## 4. StringInput._renderLayerNotes() の left/width 計算を変更
- `totalDuration` 基準 → `Time秒` 基準に変更
- put_note に width を渡す
- 影響ファイル: `src/js/controller/string-input.js`
- 確認: テキスト入力 → key の位置と幅が Time 基準で正しく描画される

## 5. StringInput._renderFromModelNotes() を width 対応にする
- MidiModel の notes から width を取得して put_note に渡す
- 影響ファイル: `src/js/controller/string-input.js`
- 確認: レイヤー切替 → 戻る → key の位置と幅が維持される

## 6. editor.js click_editor() の addNote を修正
- クリック位置の left → startTime を `px2time()` で算出
- width をデフォルトテンポから算出して DOM に反映
- 影響ファイル: `src/js/ui/editor.js`
- 確認: クリック配置 → テキスト変換 → 再描画 で位置が一致する

## 7. editor.js put_note_editor() を width 対応にする
- 引数に width を追加
- 影響ファイル: `src/js/ui/editor.js`
- 確認: クリック配置した key の幅がテンポに比例する

## 8. MidiModel.addNote() を修正
- width（または tempo）をモデルに正しく保存
- recalcTimes() を Time 基準に変更
- 影響ファイル: `src/js/midi/model.js`
- 確認: addNote → toString() → fromString() のラウンドトリップで位置が一致

## 9. MidiSerializer.syncDomToModel() を width 対応にする
- DOM の width もモデルに反映（ドラッグリサイズ対応の準備）
- 影響ファイル: `src/js/midi/serializer.js`
- 確認: 音符移動後のテキスト変換が正確

## 10. MidiModel.toString() の逆算を修正
- left と width から startTime と tempo を逆算
- Time 基準の変換式を使用
- 影響ファイル: `src/js/midi/model.js`
- 確認: モデル → テキスト → モデル のラウンドトリップで値が一致

## 11. Controls.sync_time_from_midi() の連動を見直す
- Time はタイムライン表示範囲なので、MIDI再生時間で自動変更すべきか再検討
- 再生時間がTimeを超える場合のみ自動拡張する方式が妥当
- 影響ファイル: `src/js/controller/controls.js`
- 確認: テキスト入力で Time が不必要に変わらないこと

## 12. 最終確認
- テキスト入力 → key 描画 → 位置と幅が正しい
- クリック配置 → テキスト変換 → 再描画 → 位置が一致
- レイヤー切替 → 戻る → 位置と幅が維持
- Time 変更 → key の位置と幅がスケーリングされる
- 再生 → 音が正しく鳴る（テンポ、音程に変化なし）

# 影響を受ける既存モジュール

| ファイル | 変更内容 | リスク |
|---|---|---|
| `src/js/util/time.js` | ヘルパー追加のみ | 低 |
| `src/js/midi/model.js` | width 追加、変換式変更 | 高 |
| `src/js/util/position.js` | put_note に width 引数追加 | 中 |
| `src/js/controller/string-input.js` | 描画ロジック変更 | 高 |
| `src/js/ui/editor.js` | クリック配置ロジック変更 | 高 |
| `src/js/midi/serializer.js` | width 同期追加 | 中 |
| `src/js/controller/controls.js` | Time 連動見直し | 中 |

# 影響を受けない（はずの）モジュール

| ファイル | 理由 |
|---|---|
| `src/js/midi/parser.js` | パースロジックは変更なし |
| `src/js/midi/player.js` | 再生はパース結果のみ使用 |
| `src/js/midi/json-converter.js` | JSON変換はパーサー経由 |
| `src/js/midi/layer-model.js` | notesData の構造は変わるが互換 |
| `src/js/api/mynt-api.js` | API はパーサー/プレイヤー経由 |
