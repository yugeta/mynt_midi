import { MidiParser } from '../midi/parser.js'
import { MidiModel }  from '../midi/model.js'
import { LayerModel } from '../midi/layer-model.js'
import { UndoManager } from './undo-manager.js'
import { Element }   from '../ui/element.js'
import { put_note, note_clear, scroll_middle } from '../util/position.js'
import { get_width, get_fulltime, get_msec, set_width, sec2px, apply_timeline_width } from '../util/time.js'
import { Timeline }  from '../ui/timeline.js'

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

    // アクティブレイヤーのmidiStringからMidiModelを初期化
    const activeLayer = LayerModel.activeLayer
    if(activeLayer && activeLayer.midiString){
      MidiModel.fromString(activeLayer.midiString)
    }

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
    StringInput._syncTimeDisplay()
    // localStorageに保存
    LayerModel._saveToStorage()
    // Undo履歴に追加（デバウンス: 入力が500ms止まったら確定）
    clearTimeout(StringInput._undoTimer)
    StringInput._undoTimer = setTimeout(() => UndoManager.push(), 500)
  }

  /**
   * MIDI文字列の実再生時間をTime入力欄に反映し、タイムラインも更新する
   * 再生時間が現在の Time を超える場合のみ自動拡張する
   */
  static _syncTimeDisplay(){
    const midi_string = Element.elm_midi_string ? Element.elm_midi_string.value : ''
    const duration = StringInput.getMidiDuration(midi_string)
    if(!Element.elm_time){ return }

    const currentTime = Number(Element.elm_time.value) || 0

    if(duration > 0 && duration > currentTime){
      // 再生時間が Time を超えた場合のみ拡張
      const sec = Math.ceil(duration * 10) / 10
      Element.elm_time.value = sec
      apply_timeline_width(sec)
      new Timeline().init()
    }
  }

  /**
   * LayerModel変更コールバック
   * アクティブレイヤーが切り替わった場合、またはレイヤー追加/削除時にエディタを更新
   * レイヤー切替時はモデルデータ（notesData）を保存・復元して位置を維持する
   */
  _onLayerChange(){
    const currentActiveId = LayerModel.activeLayerId
    if(currentActiveId !== _lastActiveLayerId){
      // 切り替え前のレイヤーにモデルデータと textarea の現在値を保存
      const prevLayer = LayerModel.layers.find(l => l.id === _lastActiveLayerId)
      if(prevLayer){
        prevLayer.notesData = MidiModel.saveSnapshot()
        if(Element.elm_midi_string){
          prevLayer.midiString = Element.elm_midi_string.value
        }
      }
      _lastActiveLayerId = currentActiveId

      // 新しいアクティブレイヤーのデータを復元
      const activeLayer = LayerModel.activeLayer
      if(activeLayer){
        if(activeLayer.notesData){
          // スナップショットがあればモデルを復元
          MidiModel.restoreSnapshot(activeLayer.notesData)
        } else if(activeLayer.midiString){
          // スナップショットがなければ midiString からモデルを構築
          MidiModel.fromString(activeLayer.midiString)
        } else {
          MidiModel.restoreSnapshot(null)
        }
        if(Element.elm_midi_string){
          Element.elm_midi_string.value = activeLayer.midiString || ''
        }
      }
      // レイヤー切替後に保存
      LayerModel._saveToStorage()
      UndoManager.onLayerSwitch()
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
      put_note(note.octave, note.key, note.left, note.width)
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
   * notesData があればモデルデータから描画（位置を正確に維持）
   */
  renderAllLayers(){
    const layers = LayerModel.layers
    const activeId = LayerModel.activeLayerId

    // 非アクティブレイヤーを先に描画（背面）
    for(const layer of layers){
      if(layer.id === activeId){continue}
      if(!layer.visible){continue}
      if(layer.notesData && layer.notesData.length){
        // notesData から描画（位置を正確に維持）
        StringInput._renderFromSnapshotNotes(layer.notesData, layer, false)
      } else if(layer.midiString){
        // フォールバック: midiString からパース描画
        StringInput._renderLayerNotes(layer, false)
      }
    }

    // アクティブレイヤーを最後に描画（前面）— MidiModel から描画
    const activeLayer = LayerModel.activeLayer
    if(activeLayer && activeLayer.visible){
      const notes = MidiModel.notes
      if(notes && notes.length){
        StringInput._renderFromModelNotes(notes, activeLayer)
      } else if(activeLayer.midiString){
        StringInput._renderLayerNotes(activeLayer, true)
      }
    }
  }

  /**
   * スナップショットデータからエディタに描画する（非アクティブレイヤー用）
   */
  static _renderFromSnapshotNotes(notesData, layer, isActive){
    for(const note of notesData){
      if(note.type !== 'note'){continue}
      if(note.octave === null || note.key === null){continue}
      put_note(note.octave, note.key, note.left, note.width)

      const allNotes = Element.elm_editor.querySelectorAll('.note')
      const lastNote = allNotes[allNotes.length - 1]
      if(!lastNote){continue}

      lastNote.setAttribute('data-layer-id', layer.id)
      lastNote.style.setProperty('--layer-color', layer.color)

      if(isActive){
        lastNote.classList.add('layer-active')
      } else {
        lastNote.classList.add('layer-inactive')
      }
    }
  }

  /**
   * MidiModel の notes 配列からエディタに描画する（left を保持）
   */
  static _renderFromModelNotes(notes, layer){
    for(const note of notes){
      if(note.type !== 'note'){continue}
      if(note.octave === null || note.key === null){continue}
      put_note(note.octave, note.key, note.left, note.width)

      const allNotes = Element.elm_editor.querySelectorAll('.note')
      const lastNote = allNotes[allNotes.length - 1]
      if(!lastNote){continue}

      lastNote.setAttribute('data-model-id', note.id)
      lastNote.setAttribute('data-layer-id', layer.id)
      lastNote.style.setProperty('--layer-color', layer.color)
      lastNote.classList.add('layer-active')
    }
  }

  /**
   * 1レイヤーのノートを描画する（Time 基準）
   */
  static _renderLayerNotes(layer, isActive){
    const datas = MidiParser.get_code(layer.midiString)
    if(!datas || !datas.length){return}

    for(const data of datas){
      if(!data.S || data.S === 'S' || data.S === '~'){continue}

      const startTime = data.time - data.tempo
      const left = sec2px(startTime)
      const width = sec2px(data.tempo)

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
              StringInput._putLayerNote(octave, key, left, width, layer, isActive)
            }
          }
        }
      }
      else{
        if(!data.O && data.O !== 0){continue}
        const octave = Number(data.O)
        const key = data.S.toLowerCase()
        StringInput._putLayerNote(octave, key, left, width, layer, isActive)
      }
    }
  }

  /**
   * レイヤー属性付きのノートをエディタに配置する
   */
  static _putLayerNote(octave, key, left, width, layer, isActive){
    put_note(octave, key, left, width)

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
