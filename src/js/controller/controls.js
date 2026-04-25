import { Element }    from '../ui/element.js'
import { MidiParser } from '../midi/parser.js'
import { MidiPlayer } from '../midi/player.js'
import { Timebar }    from '../ui/timebar.js'
import { Timeline }   from '../ui/timeline.js'
import { get_msec, get_fulltime, set_msec } from '../util/time.js'

/**
 * 再生/停止・設定制御
 */

export class Controls{
  constructor(){
    this._timebar = new Timebar()
  }

  async init(){
    this.set_time()
    this.set_event()
  }

  set_event(){
    Element.elm_time.addEventListener('change' , this.change_time.bind(this))
    Element.elm_play.addEventListener('click'  , this.click_play.bind(this))
  }

  static get time(){
    return Number(Element.elm_time.value) * 1000
  }

  get play_status(){
    return Element.elm_play.getAttribute('data-status') || null
  }
  set play_status(status){
    Element.elm_play.setAttribute('data-status' , status)
  }

  set_time(time){
    time = time || get_fulltime() / 1000
    Element.elm_time.value = time
  }

  change_time(e){
    const time = Number(Element.elm_time.value)
    set_msec(time * get_msec() * 10)
    new Timeline().init()
  }

  click_play(e){
    switch(this.play_status){
      case 'play':
        this.play_status = ''
        Controls._playStartTime = null
        break
      default: {
        this.play_status = 'play'
        const midi_string = Element.elm_midi_string.value
        if(!midi_string){return}
        const midi_datas = MidiParser.get_code(midi_string)
        Controls._noteCount = midi_datas ? midi_datas.length : 0

        const result = MidiPlayer.play(midi_string)
        if(result){
          Controls._playStartTime = result.startTime
          Controls._playDuration  = result.duration
        }
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

    const elapsed_sec = MidiPlayer.audio.currentTime - Controls._playStartTime

    if(Controls._playDuration && elapsed_sec >= Controls._playDuration){
      this.play_status = ''
      Controls._playStartTime = null
      return
    }

    const progress_ratio = Controls._playDuration > 0 ? elapsed_sec / Controls._playDuration : 0
    const total_width = Controls._noteCount * Element.default_note_width
    const left = progress_ratio * total_width

    this._timebar.set_bar_pos(left)

    window.requestAnimationFrame(this.play_control.bind(this))
  }
}
