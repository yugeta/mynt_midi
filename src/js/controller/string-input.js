import { MidiParser } from '../midi/parser.js'
import { Element }   from '../ui/element.js'
import { put_note, note_clear, scroll_middle } from '../util/position.js'

/**
 * MIDI文字列入力 → エディタ音符変換
 */

export class StringInput{
  constructor(){}

  async init(){
    this.set_event()
    this.string2editor()
    scroll_middle()
  }

  set_event(){
    if(Element.elm_midi_string){
      Element.elm_midi_string.addEventListener('input', this.change_string.bind(this))
    }
  }

  change_string(){
    note_clear()
    this.string2editor()
  }

  string2editor(){
    const string = Element.elm_midi_string.value
    if(!string){return}
    const midi_datas = MidiParser.get_code(string)
    let left = 0
    for(const midi_data of midi_datas){
      if(midi_data.S.match(/\[(.*)\]/)){
        const reg = RegExp(`\\[(.+?)\\]` , 'i')
        const res = reg.exec(midi_data.S)
        const arr = MidiParser.get_code(res[1])
        for(const midi_data2 of arr){
          put_note(midi_data2.O, midi_data2.S, left)
        }
      }
      else{
        put_note(midi_data.O, midi_data.S, left)
      }
      left += Element.default_note_width
    }
  }
}
