import { Element }     from '../ui/element.js'
import { MidiParser }  from '../midi/parser.js'
import { MidiPlayer }  from '../midi/player.js'
import { LayerModel }  from '../midi/layer-model.js'
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
    Element.elm_loop.addEventListener('click'  , this.click_loop.bind(this))
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

  get loop_enabled(){
    return Element.elm_loop.getAttribute('data-loop') === 'on'
  }

  click_loop(){
    const current = Element.elm_loop.getAttribute('data-loop')
    Element.elm_loop.setAttribute('data-loop', current === 'on' ? '' : 'on')
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

  /**
   * 全レイヤーの最大再生時間（ミリ秒）を取得
   */
  static _getMaxDuration(){
    let maxMs = 0
    for(const layer of LayerModel.layers){
      if(!layer.midiString){continue}
      const dur = StringInput.getMidiDuration(layer.midiString)
      if(dur > 0){
        const ms = dur * 1000
        if(ms > maxMs){ maxMs = ms }
      }
    }
    return maxMs > 0 ? maxMs : Controls.time
  }

  async click_play(e){
    switch(this.play_status){
      case 'play':
        // 停止
        this.play_status = ''
        Controls._startMs = null
        // 再生中の音声を停止（AudioContextは閉じずにsuspendで止める）
        if(MidiPlayer._audioContext && MidiPlayer._audioContext.state === 'running'){
          MidiPlayer._audioContext.suspend()
        }
        break
      default: {
        this.play_status = 'play'

        // 前回 suspend していた場合は新しいコンテキストで再生
        if(MidiPlayer._audioContext && MidiPlayer._audioContext.state === 'suspended'){
          // suspended 状態の古いコンテキストを閉じて新規作成
          MidiPlayer._audioContext.close()
          MidiPlayer._audioContext = null
        }

        // AudioContext を取得（必要なら新規作成される）
        const ctx = MidiPlayer.audio
        if(ctx.state === 'suspended'){
          await ctx.resume()
        }

        // 音声再生（全レイヤー同時再生）
        MidiPlayer.playLayers(LayerModel.layers)

        // 全レイヤーの最大再生時間をタイムバーの移動時間として使う
        const totalMs = Controls._getMaxDuration()

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

      // ループモード: 先頭に戻って再生を繰り返す
      if(this.loop_enabled){
        this._timebar.set_bar_pos(0)
        MidiPlayer.playLayers(LayerModel.layers)
        Controls._startMs = Date.now()
        window.requestAnimationFrame(this.play_control.bind(this))
        return
      }

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
