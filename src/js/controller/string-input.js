import { MidiParser } from '../midi/parser.js'
import { Element }   from '../ui/element.js'
import { put_note, note_clear, scroll_middle } from '../util/position.js'
import { get_width } from '../util/time.js'

/**
 * MIDI文字列入力 → エディタ音符変換
 *
 * 音符の配置は実再生時間ベースでタイムライン幅にスケーリングする。
 * 各音符の data.time（累積再生時間）を使い、
 * left = (data.time / totalDuration) * timelineWidth で計算。
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
    const midi_datas = MidiParser.get_code(string)
    if(!midi_datas || !midi_datas.length){return}

    const totalDuration = midi_datas[midi_datas.length - 1].time
    if(totalDuration <= 0){return}

    const timelineWidth = get_width()

    for(const midi_data of midi_datas){
      // data.time は累積時間（この音符の終了時点）
      // 開始時点 = data.time - data.tempo
      const startTime = midi_data.time - midi_data.tempo
      const left = (startTime / totalDuration) * timelineWidth

      // 和音
      if(midi_data.S.match(/\[(.*)\]/)){
        const reg = RegExp(`\\[(.+?)\\]` , 'i')
        const res = reg.exec(midi_data.S)
        const arr = MidiParser.get_code(res[1])
        for(const midi_data2 of arr){
          put_note(midi_data2.O, midi_data2.S, left)
        }
      }
      // 単音
      else{
        put_note(midi_data.O, midi_data.S, left)
      }
    }
  }
}
