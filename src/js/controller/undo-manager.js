import { MidiModel }   from '../midi/model.js'
import { LayerModel }  from '../midi/layer-model.js'
import { Element }     from '../ui/element.js'
import { note_clear }  from '../util/position.js'

/**
 * Undo/Redo マネージャー（スナップショット方式）
 *
 * アクティブレイヤーの midiString を操作確定時に保存し、
 * Ctrl+Z / Ctrl+Shift+Z で状態を復元する。
 *
 * レイヤーごとに独立した履歴を持つ。
 */

const MAX_HISTORY = 100

/** レイヤーID → { stack: string[], pointer: number } */
let _histories = {}

export class UndoManager {

  /**
   * 現在のアクティブレイヤーの状態を履歴に追加する
   * 操作が確定したタイミングで呼ぶ。
   */
  static push() {
    const layer = LayerModel.activeLayer
    if (!layer) { return }

    const id = layer.id
    const state = layer.midiString || ''

    if (!_histories[id]) {
      _histories[id] = { stack: [state], pointer: 0 }
      return
    }

    const h = _histories[id]

    // 現在の状態と同じなら追加しない
    if (h.stack[h.pointer] === state) { return }

    // pointer より先の履歴を破棄（redo 履歴をクリア）
    h.stack = h.stack.slice(0, h.pointer + 1)

    // 追加
    h.stack.push(state)
    if (h.stack.length > MAX_HISTORY) {
      h.stack.shift()
    }
    h.pointer = h.stack.length - 1
  }

  /**
   * 初期状態を登録する（レイヤー読み込み時に呼ぶ）
   */
  static init() {
    const layer = LayerModel.activeLayer
    if (!layer) { return }
    const id = layer.id
    if (!_histories[id]) {
      _histories[id] = { stack: [layer.midiString || ''], pointer: 0 }
    }
  }

  /**
   * Undo: 1つ前の状態に戻す
   */
  static undo() {
    const layer = LayerModel.activeLayer
    if (!layer) { return }

    const h = _histories[layer.id]
    if (!h || h.pointer <= 0) { return }

    h.pointer--
    UndoManager._restore(h.stack[h.pointer])
  }

  /**
   * Redo: 1つ先の状態に進む
   */
  static redo() {
    const layer = LayerModel.activeLayer
    if (!layer) { return }

    const h = _histories[layer.id]
    if (!h || h.pointer >= h.stack.length - 1) { return }

    h.pointer++
    UndoManager._restore(h.stack[h.pointer])
  }

  /**
   * 状態を復元する（共通処理）
   */
  static _restore(midiString) {
    const layer = LayerModel.activeLayer
    if (!layer) { return }

    layer.midiString = midiString

    // textarea を更新
    if (Element.elm_midi_string) {
      Element.elm_midi_string.value = midiString
    }

    // MidiModel を再構築
    MidiModel.fromString(midiString)

    // エディタを再描画
    note_clear()
    LayerModel._notify()
    LayerModel._saveToStorage()
  }

  /**
   * レイヤー切替時に呼ぶ（新しいレイヤーの初期状態を登録）
   */
  static onLayerSwitch() {
    UndoManager.init()
  }

  /**
   * 全履歴をクリアする
   */
  static clear() {
    _histories = {}
  }
}
