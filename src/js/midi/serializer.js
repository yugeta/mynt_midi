import { Element }   from '../ui/element.js'
import { MidiModel } from './model.js'
import { LayerModel } from './layer-model.js'

/**
 * エディタ上の音符 → MIDI文字列への変換
 *
 * データモデル（MidiModel）を経由して変換する。
 * DOM から直接テンポを逆算しない。
 */

export class MidiSerializer{

  /**
   * エディタの音符状態を textarea に同期する
   */
  static syncToTextarea(){
    // DOM の音符位置をモデルに反映
    MidiSerializer.syncDomToModel()
    // モデルから文字列を生成
    const str = MidiModel.toString()
    Element.elm_midi_string.value = str

    // LayerModelのアクティブレイヤーにも反映
    const activeLayer = LayerModel.activeLayer
    if(activeLayer){
      activeLayer.midiString = str
    }
  }

  /**
   * DOM の .note 要素の位置をモデルに反映する
   */
  static syncDomToModel(){
    const domNotes = Element.elm_editor.querySelectorAll('.note[data-model-id]')
    for(const elm of domNotes){
      const id = elm.getAttribute('data-model-id')
      const left = elm.offsetLeft
      const note = MidiModel.findById(id)
      if(note){
        note.left = left
      }
    }
  }
}
