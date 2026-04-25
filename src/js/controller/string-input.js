import { MidiParser } from '../midi/parser.js'
import { MidiModel }  from '../midi/model.js'
import { LayerModel } from '../midi/layer-model.js'
import { Element }   from '../ui/element.js'
import { put_note, note_clear, scroll_middle } from '../util/position.js'
import { get_width } from '../util/time.js'

/**
 * MIDI文字列入力 → エディタ音符変換
 *
 * データモデル（MidiModel）を経由して変換する。
 * 1. textarea → MidiModel.fromString() → モデル
 * 2. モデル → render() → DOM
 *
 * LayerModel連携:
 * - アクティブレイヤー切替時にtextareaを更新
 * - textarea入力時にアクティブレイヤーのmidiStringを更新
 */

let _lastActiveLayerId = null

export class StringInput{
  constructor(){}

  async init(){
    this.set_event()
    this.string2editor()
    scroll_middle()

    // LayerModel変更時にtextareaを同期
    _lastActiveLayerId = LayerModel.activeLayerId
    LayerModel.onChange(() => this._onLayerChange())
  }

  set_event(){
    if(Element.elm_midi_string){
      Element.elm_midi_string.addEventListener('input', this.change_string.bind(this))
    }
  }

  change_string(){
    // textarea入力時にアクティブレイヤーのmidiStringを更新
    const activeLayer = LayerModel.activeLayer
    if(activeLayer){
      // _notify を避けるため直接プロパティを更新
      activeLayer.midiString = Element.elm_midi_string.value
    }
    note_clear()
    this.string2editor()
  }

  /**
   * LayerModel変更コールバック
   * アクティブレイヤーが切り替わった場合にtextareaとエディタを更新
   */
  _onLayerChange(){
    const currentActiveId = LayerModel.activeLayerId
    if(currentActiveId !== _lastActiveLayerId){
      _lastActiveLayerId = currentActiveId
      // アクティブレイヤーのmidiStringをtextareaに反映
      const activeLayer = LayerModel.activeLayer
      if(activeLayer && Element.elm_midi_string){
        Element.elm_midi_string.value = activeLayer.midiString
        note_clear()
        this.string2editor()
      }
    }
  }

  // MIDI文字列の実再生時間を取得（秒）
  static getMidiDuration(midi_string){
    if(!midi_string){return 0}
    const datas = MidiParser.get_code(midi_string)
    if(!datas || !datas.length){return 0}
    return datas[datas.length - 1].time
  }

  string2editor(){
    const string = Element.elm_midi_string.value
    if(!string){return}

    // モデルを構築
    MidiModel.fromString(string)

    // モデルからDOMを描画
    StringInput.renderFromModel()
  }

  /**
   * モデルの音符をエディタに描画する
   */
  static renderFromModel(){
    const notes = MidiModel.notes
    for(const note of notes){
      if(note.type !== 'note'){continue}
      if(note.octave === null || note.key === null){continue}

      // put_note で DOM 要素を作成
      put_note(note.octave, note.key, note.left)

      // 最後に追加された .note 要素に data-model-id を付与
      const allNotes = Element.elm_editor.querySelectorAll('.note')
      const lastNote = allNotes[allNotes.length - 1]
      if(lastNote){
        lastNote.setAttribute('data-model-id', note.id)
      }
    }
  }
}
