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
    this.renderAllLayers()
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
      activeLayer.midiString = Element.elm_midi_string.value
    }
    note_clear()
    this.renderAllLayers()
  }

  /**
   * LayerModel変更コールバック
   * アクティブレイヤーが切り替わった場合、またはレイヤー追加/削除時にエディタを更新
   */
  _onLayerChange(){
    const currentActiveId = LayerModel.activeLayerId
    if(currentActiveId !== _lastActiveLayerId){
      // 切り替え前のレイヤーに textarea の現在値を保存
      const prevLayer = LayerModel.layers.find(l => l.id === _lastActiveLayerId)
      if(prevLayer && Element.elm_midi_string){
        prevLayer.midiString = Element.elm_midi_string.value
      }
      _lastActiveLayerId = currentActiveId
      // 新しいアクティブレイヤーの midiString を textarea に反映
      const activeLayer = LayerModel.activeLayer
      if(activeLayer && Element.elm_midi_string){
        Element.elm_midi_string.value = activeLayer.midiString
      }
    }
    note_clear()
    this.renderAllLayers()
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
    MidiModel.fromString(string)
    StringInput.renderFromModel()
  }

  /**
   * モデルの音符をエディタに描画する（後方互換用）
   */
  static renderFromModel(){
    const notes = MidiModel.notes
    for(const note of notes){
      if(note.type !== 'note'){continue}
      if(note.octave === null || note.key === null){continue}
      put_note(note.octave, note.key, note.left)
      const allNotes = Element.elm_editor.querySelectorAll('.note')
      const lastNote = allNotes[allNotes.length - 1]
      if(lastNote){
        lastNote.setAttribute('data-model-id', note.id)
        // アクティブレイヤーのカラーを適用
        const activeLayer = LayerModel.activeLayer
        if(activeLayer){
          lastNote.style.setProperty('--layer-color', activeLayer.color)
          lastNote.classList.add('layer-active')
          lastNote.setAttribute('data-layer-id', activeLayer.id)
        }
      }
    }
  }

  /**
   * 全レイヤーのノートをエディタに描画する
   * アクティブレイヤーは不透明、それ以外は半透明で表示
   */
  renderAllLayers(){
    const layers = LayerModel.layers
    const activeId = LayerModel.activeLayerId

    // 非アクティブレイヤーを先に描画（背面）
    for(const layer of layers){
      if(layer.id === activeId){continue}
      if(!layer.midiString || !layer.visible){continue}
      StringInput._renderLayerNotes(layer, false)
    }

    // アクティブレイヤーを最後に描画（前面）
    const activeLayer = LayerModel.activeLayer
    if(activeLayer && activeLayer.midiString && activeLayer.visible){
      StringInput._renderLayerNotes(activeLayer, true)
    }
  }

  /**
   * 1レイヤーのノートを描画する
   */
  static _renderLayerNotes(layer, isActive){
    const datas = MidiParser.get_code(layer.midiString)
    if(!datas || !datas.length){return}

    const totalDuration = datas[datas.length - 1].time
    const timelineWidth = get_width()

    for(const data of datas){
      if(!data.S || data.S === 'S' || data.S === '~'){continue}

      const startTime = data.time - data.tempo
      const left = totalDuration > 0
        ? (startTime / totalDuration) * timelineWidth
        : 0

      // 和音の処理
      if(data.S && data.S.match && data.S.match(/\[(.+)\]/)){
        const reg = /\[(.+?)\]/i
        const res = reg.exec(data.S)
        if(res){
          const chordNotes = MidiParser.get_code(res[1])
          if(chordNotes){
            for(const cn of chordNotes){
              const octave = Number(cn.O || 5)
              const key = (cn.S || '').toLowerCase()
              StringInput._putLayerNote(octave, key, left, layer, isActive)
            }
          }
        }
      }
      else{
        if(!data.O && data.O !== 0){continue}
        const octave = Number(data.O)
        const key = data.S.toLowerCase()
        StringInput._putLayerNote(octave, key, left, layer, isActive)
      }
    }
  }

  /**
   * レイヤー属性付きのノートをエディタに配置する
   */
  static _putLayerNote(octave, key, left, layer, isActive){
    put_note(octave, key, left)

    // 最後に追加されたノートにレイヤー属性を付与
    const allNotes = Element.elm_editor.querySelectorAll('.note')
    const note = allNotes[allNotes.length - 1]
    if(!note){return}

    note.setAttribute('data-layer-id', layer.id)
    note.style.setProperty('--layer-color', layer.color)

    if(isActive){
      note.classList.add('layer-active')
    }
    else{
      note.classList.add('layer-inactive')
    }
  }
}
