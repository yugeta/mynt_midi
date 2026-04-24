import { Midi }    from './midi.js'
import { Element }  from './common/element.js'
import { Util }    from './util.js'

/**
 * 文字列を音符に変換するクラス
 */

export class String extends Util{
  constructor(){
    super()
  }

  async init(){
    this.set_event()
    this.string2editor()
    this.scroll_middle()
  }

  set_event(){
    if(Element.elm_midi_string){
      Element.elm_midi_string.addEventListener('input', this.change_string.bind(this))
    }
  }

  change_string(){
    this.note_clear()
    this.string2editor()
  }

  // string文字列をEditorの音符に変換する。
  string2editor(){
    // 文字列取得
    const string = Element.elm_midi_string.value
    if(!string){return}

    // 文字列をデータ変換
    const midi_datas = Midi.get_code(string)

    // 音符を置く
    let left = 0
    for(const midi_data of midi_datas){
      // 和音
      if(midi_data.S.match(/\[(.*)\]/)){
        const reg = RegExp(`\\[(.+?)\\]` , 'i')
        const res = reg.exec(midi_data.S)
        const arr = Midi.get_code(res[1])
        for(const midi_data2 of arr){
          this.put_note(midi_data2.O, midi_data2.S, left)
        }
      }
      // 単音
      else{
        this.put_note(midi_data.O, midi_data.S, left)
      }
      left += Element.default_note_width
    }
  }
}