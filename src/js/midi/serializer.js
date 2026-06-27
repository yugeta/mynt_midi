import { MidiModel }  from './model.js'
import { LayerModel } from './layer-model.js'
import { px2sec }     from '../util/time.js'

/**
 * エディタ上の音符 → MIDI文字列への変換
 *
 * データモデル（MidiModel）を経由して変換する。
 * DOM要素は呼び出し側から渡す（Element への直接依存なし）。
 */

export class MidiSerializer{

  /**
   * エディタの音符状態を textarea に同期する
   * @param {HTMLElement} editorElm - .editor 要素
   * @param {HTMLTextAreaElement} textareaElm - textarea 要素
   */
  static syncToTextarea(editorElm, textareaElm){
    MidiSerializer.syncDomToModel(editorElm)
    const str = MidiModel.toString()
    textareaElm.value = str

    const activeLayer = LayerModel.activeLayer
    if(activeLayer){
      activeLayer.midiString = str
      activeLayer.notesData = MidiModel.saveSnapshot()
    }
  }

  /**
   * DOM の .note 要素の位置をモデルに反映する
   * @param {HTMLElement} editorElm - .editor 要素
   */
  static syncDomToModel(editorElm){
    const domNotes = editorElm.querySelectorAll('.note[data-model-id]')
    for(const elm of domNotes){
      const id = elm.getAttribute('data-model-id')
      const left = elm.offsetLeft
      const width = elm.offsetWidth
      const key = elm.getAttribute('data-key')
      const octaveRaw = elm.getAttribute('data-octave')
      const note = MidiModel.findById(id)
      if(note){
        note.left = left
        note.width = width
        // 縦移動で変わった音階情報もモデルへ反映する。
        if(key){
          note.key = key.toLowerCase()
        }
        if(octaveRaw !== null){
          const octave = Number(octaveRaw)
          if(!Number.isNaN(octave)){
            note.octave = octave
          }
        }
        // width → tempo/tempoVal を逆算
        const tempo = px2sec(width)
        if(tempo > 0){
          note.tempo = tempo
          note.tempoVal = Math.round(60 / tempo)
        }
        note.startTime = px2sec(left)
        note.time = note.startTime + note.tempo
      }
    }
  }
}
