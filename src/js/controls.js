import { Element }  from './common/element.js'
import { Midi }     from './midi.js'
import { Timeline } from './timeline.js'
import { Util }     from './util.js'

export class Controls extends Util{
  constructor(){
    super()
  }

  async init(){
    this.set_time()
    this.set_event()
  }

  set_event(){
    Element.elm_time.addEventListener('change' , this.change_time.bind(this))
    Element.elm_play.addEventListener('click' , this.click_play.bind(this))
  }

  static get time(){
    return Number(Element.elm_time.value) * 1000
  }

  set_time(time){
    time = time || this.fulltime / 1000
    Element.elm_time.value = time
  }
  change_time(e){
    const time = Number(Element.elm_time.value)
    this.sec = time * this.msec * 10
    new Timeline()
  }

  click_play(e){
    switch(this.play_status){
      case 'play':
        this.play_status = ''
        Controls._playStartTime = null
        break
      default: {
        this.play_status = 'play'
        // MIDI データを取得して音符の総数を把握
        const midi_string = Element.elm_midi_string.value
        if(!midi_string){return}
        const midi_datas = Midi.get_code(midi_string)
        Controls._noteCount = midi_datas ? midi_datas.length : 0

        // 音声再生を開始し、AudioContext の開始時刻を取得
        const result = this.play()
        if(result){
          Controls._playStartTime = result.startTime
          Controls._playDuration  = result.duration
        }
        // タイムバーアニメーション開始
        this.play_control()
        break
      }
    }
  }

  play_control(){
    if(this.play_status !== 'play'){
      Controls._playStartTime = null
      return
    }

    if(!Controls._playStartTime){return}

    // AudioContext.currentTime を基準に経過時間を計算（秒）
    const elapsed_sec = Midi.audio.currentTime - Controls._playStartTime

    // 再生終了チェック
    if(Controls._playDuration && elapsed_sec >= Controls._playDuration){
      this.play_status = ''
      Controls._playStartTime = null
      return
    }

    // 経過割合から音符配置に対応するピクセル位置を計算
    // 音符は default_note_width ずつ等間隔に配置されている
    const progress_ratio = Controls._playDuration > 0 ? elapsed_sec / Controls._playDuration : 0
    const total_width = Controls._noteCount * Element.default_note_width
    const left = progress_ratio * total_width

    // timebar
    this.set_bar_pos(left)

    // repeat
    window.requestAnimationFrame(this.play_control.bind(this))
  }
}