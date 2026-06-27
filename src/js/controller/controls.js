import { Element }     from '../ui/element.js'
import { MidiParser }  from '../midi/parser.js'
import { MidiPlayer }  from '../midi/player.js'
import { LayerModel }  from '../midi/layer-model.js'
import { MidiModel }   from '../midi/model.js'
import { StringInput } from './string-input.js'
import { Timebar }     from '../ui/timebar.js'
import { Timeline }    from '../ui/timeline.js'
import { Keyboard }    from '../ui/keyboard.js'
import { get_msec, get_fulltime, get_width, set_msec, set_width, get_scale, apply_scale, apply_timeline_width, sec2px, px2sec } from '../util/time.js'

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
    // Time入力欄: localStorageに保存値があればそれを使う（リロード時の復元）
    // なければMIDI文字列から再計算
    const savedTime = localStorage.getItem('mynt_time')
    if (savedTime) {
      Element.elm_time.value = savedTime
    } else {
      Controls.sync_time_from_midi()
    }
    this.set_event()
  }

  set_event(){
    Element.elm_time.addEventListener('change' , this.change_time.bind(this))
    Element.elm_play.addEventListener('click'  , this.click_play.bind(this))
    Element.elm_loop.addEventListener('click'  , this.click_loop.bind(this))

    const startBtn = document.querySelector(`[name='play'] .start`)
    if(startBtn){
      startBtn.addEventListener('click', this.click_start.bind(this))
    }

    const trimBtn = document.querySelector('.trim-btn')
    if(trimBtn){
      trimBtn.addEventListener('click', this.click_trim.bind(this))
    }

    const scaleSlider = document.querySelector('.scale-slider')
    if(scaleSlider){
      scaleSlider.addEventListener('input', this.change_scale.bind(this))
    }
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

  /**
   * Start: カーソル（タイムバー）を先頭（0秒位置）に戻し、画面もスクロール
   */
  click_start(){
    this._timebar.set_bar_pos(0)
    // 画面を先頭に合わせる（全スクロール要素を直接リセット）
    requestAnimationFrame(() => {
      Element.elm_editor.scrollLeft = 0
      Element.elm_timeline.scrollLeft = 0
    })
  }

  // MIDI文字列の実再生時間からTime入力欄を設定
  static sync_time_from_midi(){
    const midi_string = Element.elm_midi_string.value
    const duration = StringInput.getMidiDuration(midi_string)
    if(duration > 0){
      // 秒単位で小数点1桁に丸める
      Element.elm_time.value = Math.ceil(duration * 10) / 10
    }
    else{
      Element.elm_time.value = get_fulltime() / 1000
    }
    try { localStorage.setItem('mynt_time', Element.elm_time.value) } catch(e){}
  }

  change_time(e){
    const sec = Number(Element.elm_time.value)
    if(sec <= 0){ return }
    apply_timeline_width(sec)
    new Timeline().init()
    try { localStorage.setItem('mynt_time', String(sec)) } catch(e){}
  }

  /**
   * Trim: 全レイヤーのMIDI再生時間にTimeをフィットさせる
   */
  click_trim(){
    let maxDuration = 0
    for(const layer of LayerModel.layers){
      const dur = StringInput.getLayerDuration(layer)
      if(dur > maxDuration){ maxDuration = dur }
    }
    if(maxDuration <= 0){ return }

    // 末尾ノートの切れ防止マージン
    const sec = Math.ceil((maxDuration + 0.05) * 10) / 10

    // 画面幅に収まるスケールへ自動調整（上限・下限でクランプ）
    const editorWidth = Element.elm_editor ? Element.elm_editor.clientWidth : 0
    if(editorWidth > 0){
      const currentScale = get_scale() || 1
      const baseMsec = get_msec() / currentScale
      const requiredMsec = editorWidth / (sec * 10)
      const fittedScale = Math.max(0.25, Math.min(4.0, requiredMsec / baseMsec))
      const fittedPct = Math.round(fittedScale * 100)

      apply_scale(fittedScale)
      const slider = document.querySelector('.scale-slider')
      const label = document.querySelector('.scale-value')
      if(slider){ slider.value = String(fittedPct) }
      if(label){ label.textContent = `${fittedPct}%` }
      try { localStorage.setItem('mynt_scale', String(fittedPct)) } catch(e){}
    }

    // Time/幅を先に確定してからノートのpxを再計算する
    Element.elm_time.value = sec
    apply_timeline_width(sec)

    // trim後の表示基準（scale + time）で全ノートのピクセル位置を更新
    MidiModel.recalcPixels()
    for(const layer of LayerModel.layers){
      if(!layer.notesData){ continue }
      for(const n of layer.notesData){
        n.left = sec2px(n.startTime)
        n.width = sec2px(n.tempo)
      }
    }

    new Timeline().init()
    LayerModel._notify()
    try { localStorage.setItem('mynt_time', String(sec)) } catch(e){}
  }

  /**
   * Scale: タイムラインの表示倍率を変更
   * ノートの時間的位置は変えず、ピクセル表示幅だけ拡大/縮小する
   */
  change_scale(e){
    const pct = Number(e.target.value)
    const label = document.querySelector('.scale-value')
    if(label){ label.textContent = `${pct}%` }

    // スケール値を保存
    try { localStorage.setItem('mynt_scale', String(pct)) } catch(e){}

    // --time-msec を変更（目盛りのピクセル幅が変わる）
    apply_scale(pct / 100)

    // --time-sec を再計算（Time秒数は変わらない）
    const sec = Number(Element.elm_time.value) || 1
    apply_timeline_width(sec)

    // アクティブレイヤーのノートのピクセル値を再計算
    MidiModel.recalcPixels()

    // 非アクティブレイヤーのスナップショットも再計算
    for(const layer of LayerModel.layers){
      if(!layer.notesData){ continue }
      for(const n of layer.notesData){
        n.left = sec2px(n.startTime)
        n.width = sec2px(n.tempo)
      }
    }

    // タイムラインを再描画、ノートはLayerModel通知で再描画
    new Timeline().init()
    LayerModel._notify()
  }

  /**
   * 全レイヤーの最大再生時間（ミリ秒）を取得
   */
  static _getMaxDuration(){
    let maxMs = 0
    for(const layer of LayerModel.layers){
      const dur = StringInput.getLayerDuration(layer)
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
        Controls._noteTimeline = null
        Keyboard.clearPlaying()
        MidiPlayer.stop()
        break
      default: {
        this.play_status = 'play'

        // 前回の再生が残っていれば停止
        MidiPlayer.stop()

        // タイムバーの現在位置からオフセット（秒）を取得
        const barLeft = Element.elm_timebar_icon
          ? Number(Element.elm_timebar_icon.style.getPropertyValue('left').replace('px','') || 0)
          : 0
        const offsetSec = px2sec(barLeft)

        // 音声再生（全レイヤー同時再生、オフセット付き）
        await MidiPlayer.playLayers(LayerModel.layers, { offsetSec })

        // キーボードハイライト用のノートタイムテーブルを構築
        Controls._noteTimeline = Controls._buildNoteTimeline(offsetSec)

        // タイムバーは Time（タイムライン全体秒数）基準で移動
        const timeSec = Number(Element.elm_time.value) || (get_fulltime() / 1000)
        const totalMs = timeSec * 1000
        const offsetMs = offsetSec * 1000

        // タイムバーアニメーション開始（オフセット分を既に経過したものとして扱う）
        Controls._startMs = Date.now() - offsetMs
        Controls._totalMs = totalMs
        Controls._audioDurationMs = Controls._getMaxDuration()
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
    const total   = Controls._totalMs       // Time 基準（タイムライン全体）
    const audioDur = Controls._audioDurationMs  // MIDI 実再生時間
    const width   = Controls._timelineWidth

    // タイムバー終了判定（Time 基準）
    if(elapsed >= total){
      this._timebar.set_bar_pos(width)
      Keyboard.clearPlaying()

      // ループモード: 先頭に戻って再生を繰り返す
      if(this.loop_enabled){
        this._timebar.set_bar_pos(0)
        MidiPlayer.playLayers(LayerModel.layers)
        Controls._startMs = Date.now()
        Controls._noteTimeline = Controls._buildNoteTimeline(0)
        window.requestAnimationFrame(this.play_control.bind(this))
        return
      }

      this.play_status = ''
      Controls._startMs = null
      Controls._noteTimeline = null
      return
    }

    // 進捗に応じたピクセル位置（Time 基準）
    const left = (elapsed / total) * width
    this._timebar.set_bar_pos(left)

    // 再生位置の自動スクロール
    Controls._autoScroll(left)

    // キーボードハイライト更新
    Controls._updateKeyboardHighlight(elapsed / 1000)

    window.requestAnimationFrame(this.play_control.bind(this))
  }

  /**
   * 再生位置がエディタの表示範囲外に出たら自動スクロールする
   * @param {number} left - タイムバーのピクセル位置
   */
  static _autoScroll(left){
    const editor = Element.elm_editor
    if(!editor){ return }

    const viewLeft  = editor.scrollLeft
    const viewWidth = editor.clientWidth
    const viewRight = viewLeft + viewWidth

    // タイムバーが右端の80%を超えたら、タイムバーが左から30%の位置に来るようスクロール
    if(left > viewRight - viewWidth * 0.2){
      const newScroll = Math.max(0, left - viewWidth * 0.3)
      editor.scrollLeft = newScroll
      if(Element.elm_timeline){ Element.elm_timeline.scrollLeft = newScroll }
      if(Element.elm_timebar_area){ Element.elm_timebar_area.scrollLeft = newScroll }
    }
    // タイムバーが左端より前に行った場合（ループ時など）
    else if(left < viewLeft){
      const newScroll = Math.max(0, left - viewWidth * 0.1)
      editor.scrollLeft = newScroll
      if(Element.elm_timeline){ Element.elm_timeline.scrollLeft = newScroll }
      if(Element.elm_timebar_area){ Element.elm_timebar_area.scrollLeft = newScroll }
    }
  }

  /**
   * 再生可能レイヤーのノートからタイムテーブルを構築する
   * @param {number} offsetSec - 再生開始オフセット（秒）
   * @returns {Array} [{startSec, endSec, octave, key}, ...]
   */
  static _buildNoteTimeline(offsetSec){
    const timeline = []
    const playable = MidiPlayer._getPlayableLayers(LayerModel.layers)

    /** 半音番号 → 音名 */
    const SEMITONE_TO_KEY = ['c','d-','d','e-','e','f','g-','g','a-','a','b-','b']

    for(const layer of playable){
      const layerOffset = layer.offset || 0
      const mode = layer.mode || 'string'

      if(mode === 'midi' && Array.isArray(layer.noteEvents) && layer.noteEvents.length){
        // MIDIモード: noteEventsから直接タイムライン構築
        for(const event of layer.noteEvents){
          const startSec = event.time + layerOffset - offsetSec
          const endSec = startSec + event.duration
          if(endSec <= 0){ continue }

          const octave = Math.floor(event.midi / 12)
          const key = SEMITONE_TO_KEY[event.midi % 12]

          timeline.push({
            startSec: Math.max(0, startSec),
            endSec,
            octave,
            key
          })
        }
      } else if(layer.midiString){
        // 軽量モード: MIDI文字列からタイムライン構築
        const datas = MidiParser.get_code(layer.midiString)
        if(!datas || !datas.length){ continue }

        for(const data of datas){
          if(!data.freq){ continue }
          const startSec = data.time - data.tempo + layerOffset - offsetSec
          const endSec = data.time + layerOffset - offsetSec
          if(endSec <= 0){ continue }

          // 和音の処理
          if(data.freq.constructor === Array){
            const reg = /\[(.+?)\]/i
            const res = reg.exec(data.S)
            if(res){
              const chordNotes = MidiParser.get_code(res[1])
              if(chordNotes){
                for(const cn of chordNotes){
                  if(cn.O != null && cn.S){
                    timeline.push({
                      startSec: Math.max(0, startSec),
                      endSec,
                      octave: cn.O,
                      key: cn.S.toLowerCase()
                    })
                  }
                }
              }
            }
          } else if(data.O != null) {
            timeline.push({
              startSec: Math.max(0, startSec),
              endSec,
              octave: data.O,
              key: data.S.toLowerCase()
            })
          }
        }
      }
    }

    // startSec でソート
    timeline.sort((a, b) => a.startSec - b.startSec)
    return timeline
  }

  /**
   * 現在の再生時刻に鳴っているノートのキーをハイライトする
   * @param {number} currentSec - 再生開始からの経過秒数
   */
  static _updateKeyboardHighlight(currentSec){
    const timeline = Controls._noteTimeline
    if(!timeline || !timeline.length){ return }

    // 現在鳴っているノートを収集
    const activeKeys = new Set()
    for(const note of timeline){
      if(note.startSec > currentSec){ break } // ソート済みなので以降は未来
      if(note.endSec > currentSec){
        activeKeys.add(`${note.octave}:${note.key}`)
      }
    }

    Keyboard.setPlaying(activeKeys)
  }
}
