import { Element }     from '../ui/element.js'
import { MidiParser }  from '../midi/parser.js'
import { MidiPlayer }  from '../midi/player.js'
import { StringInput } from './string-input.js'
import { Timebar }     from '../ui/timebar.js'
import { Timeline }    from '../ui/timeline.js'
import { get_msec, get_fulltime, get_width, set_msec } from '../util/time.js'

/**
 * 再生/停止・設定制御
 *
 * - Time入力欄はMIDI実再生時間で自動設定される
 * - タイムバーは実再生時間でタイムライン右端まで移動
 * - 終了判定は Date.now() ベース
 */

export class Controls{
  constructor(){
    this._timebar = new Timebar()
  }

  async init(){
    // MIDI文字列から実再生時間を算出してTimeにセット
    this.sync_time_from_midi()
    this.set_event()
  }

  set_event(){
    Element.elm_time.addEventListener('change' , this.change_time.bind(this))
    Element.elm_play.addEventListener('click'  , this.click_play.bind(this))
  }

  // タイムライン全体の時間（ミリ秒）
  static get time(){
    return Number(Element.elm_time.value) * 1000
  }

  get play_status(){
    return Element.elm_play.getAttribute('data-status') || null
  }
  set play_status(status){
    Element.elm_play.setAttribute('data-status' , status)
  }

  // MIDI文字列の実再生時間からTime入力欄を設定
  sync_time_from_midi(){
    const midi_string = Element.elm_midi_string.value
    const duration = StringInput.getMidiDuration(midi_string)
    if(duration > 0){
      // 秒単位で小数点1桁に丸める
      Element.elm_time.value = Math.ceil(duration * 10) / 10
    }
    else{
      Element.elm_time.value = get_fulltime() / 1000
    }
  }

  change_time(e){
    const time = Number(Element.elm_time.value)
    set_msec(time * get_msec() * 10)
    new Timeline().init()
  }

  async click_play(e){
    switch(this.play_status){
      case 'play':
        // 停止
        this.play_status = ''
        Controls._startMs = null
        break
      default: {
        this.play_status = 'play'

        // AudioContext の resume（初回のみ）
        const ctx = MidiPlayer.audio
        if(ctx.state === 'suspended'){
          await ctx.resume()
        }

        // 音声再生（テンポ通り）
        const midi_string = Element.elm_midi_string.value
        if(midi_string){
          MidiPlayer.play(midi_string)
        }

        // MIDI実再生時間をタイムバーの移動時間として使う
        const midiDuration = StringInput.getMidiDuration(midi_string)
        const totalMs = midiDuration > 0 ? midiDuration * 1000 : Controls.time

        // タイムバーアニメーション開始
        Controls._startMs = Date.now()
        Controls._totalMs = totalMs
        Controls._timelineWidth = get_width()
        this.play_control()
        break
      }
    }
  }

  play_control(){
    if(this.play_status !== 'play' || !Controls._startMs){
      return
    }

    const elapsed = Date.now() - Controls._startMs
    const total   = Controls._totalMs
    const width   = Controls._timelineWidth

    // 終了判定
    if(elapsed >= total){
      this._timebar.set_bar_pos(width)
      this.play_status = ''
      Controls._startMs = null
      return
    }

    // 進捗に応じたピクセル位置
    const left = (elapsed / total) * width
    this._timebar.set_bar_pos(left)

    window.requestAnimationFrame(this.play_control.bind(this))
  }
}
