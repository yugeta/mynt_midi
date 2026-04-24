import { Element }  from './common/element.js'
import { Midi }     from './midi.js'
import { Css }      from './common/css.js'

export class Util{

  get notes(){
    return Element.elm_editor.querySelectorAll(`.note`)
  }


  // エディタ内の音符の中央にスクロールする
  scroll_middle(){
    const pos = {
      min : {x:null,y:null},
      max : {x:null,y:null}
    }
    if(!this.notes.length){return}
    for(const note of this.notes){
      const current = {
        x : note.offsetLeft,
        y : note.offsetTop,
        w : note.offsetWidth,
        h : note.offsetHeight,
      }
      pos.min.x = pos.min.x === null || pos.min.x > current.x ? current.x : pos.min.x
      pos.min.y = pos.min.y === null || pos.min.y > current.y ? current.y : pos.min.y
      pos.max.x = pos.max.x === null || pos.max.x < current.x + current.w ? current.x + current.w : pos.max.x
      pos.max.y = pos.max.y === null || pos.max.y < current.y + current.h ? current.y + current.h : pos.max.y
    }
    Element.elm_keyboard.scrollTop = pos.min.y
  }

  // エディタ内の音符をすべて削除する
  note_clear(){
    for(const note of Element.notes){
      note.parentNode.removeChild(note)
    }
  }

  get_pos_x(left){
    const editor_rect = Element.elm_editor.getBoundingClientRect()
    left = left - editor_rect.left + Element.elm_editor.scrollLeft - (Element.default_note_width / 2)
    left = left < 0 ? 0 : left
    return left
  }

  get_pos_y(top){
    top = top < 0 ? 0 : top
    return top
  }

  set_addSize(size){
    Element.elm_editor.style.setProperty('padding-right', `${size}px`, '')
  }

  // octave,keyから音符を配置
  put_note(octave, key , left){
    octave = Number(octave)
    key = key.toLowerCase()
    const top  = this.get_note_pos_y(octave, key)
    if(top === null){return}
    const width = Element.default_note_width
    const note = document.createElement('div')
    const type = this.get_key_type(key)
    note.classList.add('note')
    note.style.setProperty('left'   , `${left}px`,'')
    note.style.setProperty('top'    , `${top}px`,'')
    note.style.setProperty('width'  , `${width}px`,'')
    note.setAttribute('data-type'   , type)
    note.setAttribute('data-octave' , octave)
    note.setAttribute('data-key'    , key)
    Element.elm_editor.appendChild(note)
  }


  // 音符のy軸を取得
  get_note_pos_y(octave, key){
    const elm_octave = Element.elm_editor.querySelector(`.octave[data-octave='${octave}']`)
    if(!elm_octave){return null}
    const elm_key    = elm_octave.querySelector(`[data-key='${key}']`)
    if(!elm_key){return null}
    return this.get_pos_y(elm_key.offsetTop + elm_octave.offsetTop)
  }
  get_key_type(key){
    if(key.match(/\-/)){
      return 'flat'
    }
    else{
      return 'key'
    }
  }

  // 再生処理
  play(midi_string){
    midi_string = midi_string || Element.elm_midi_string.value
    if(!midi_string){return}
    Midi.play(midi_string)
  }

  // timebarの移動処理
  set_bar_pos(left){
    Element.elm_timebar_icon.style.setProperty('left',`${left}px`,'')
    this.follow_line(left)
    this.set_mmdd(left)
  }

  // ラインがtimebarに追従する処理
  follow_line(left){
    Element.elm_timebar_line.style.setProperty('left',`${left}px`,'')
  }
  set_mmdd(left){
    const sec_size  = this.msec * 10
    const sec       = Math.floor(left / sec_size)
    const msec_size = 1000 / sec_size
    const msec      = ('000'+ Math.floor((left - (sec * sec_size)) * msec_size)).slice(-3)
    Element.elm_mmdd.value = `${sec}.${msec}`
  }

  // 1msecのサイズ(px)
  get msec(){
    const raw = Css.get_css(':root','--time-msec')
    const size = raw ? raw.replace('px' , '') : '50'
    return Number(size)
  }
  // 1msecのサイズ変更(px)
  set msec(size){
    Css.set_css(':root','--time-msec', `${size}px`)
    return Number(size)
  }
  get play_status(){
    return Element.elm_play.getAttribute('data-status') || null
  }
  set play_status(status){
    Element.elm_play.setAttribute('data-status' , status)
  }

  // millisecond (1000ms = 1s)
  get fulltime(){
    return Math.floor(this.width / this.msec * 100)
  }
  // 全体時間のサイズ変更(px)
  set width(size){
    Css.set_css(':root', '--time-sec', `${size}px`)
  }
  // 全体時間のサイズ(px)
  get width(){
    const raw = Css.get_css(':root', '--time-sec')
    const size = raw ? raw.replace('px' , '') : '1200'
    return Number(size)
  }

  // 秒数(ms)からtimelineの座標を返す
  time2pos(msec){
    // msecの１目盛り秒数
    const msec_time = Math.floor(msec / this.msec_time) * this.msec_time
    return msec_time * this.msec / this.msec_step / this.sec_step
  }
  // msecの１目盛り秒数
  get msec_time(){
    return 1000 / this.sec_step / this.msec_step
  }
  // secの分割数
  get sec_step(){
    return 10
  }
  // msecの分割数
  get msec_step(){
    return Number(Css.get_css(':root' , '--time-msec-step') || 1)
  }
  get scale_size(){
    return this.msec / this.msec_step
  }
  // // 1秒のサイズ(px)
  // static get sec(){
  //   return Number(this.msec * this.sec_step)
  // }

  // 1秒のサイズ変更(px)
  static set sec(size){
    Css.set_css(':root','--time-msec', `${size}px`)
    return Number(size)
  }

  /**
   * Event
   */
  scroll_sync_timeline(e){
    const pos = {
      x : e.target.scrollLeft,
      y : Element.elm_editor.scrollTop,
    }
    this.scroll_sync(pos)
  }
  scroll_sync(pos){
    Element.elm_keyboard.scrollTop      = pos.y
    Element.elm_timeline.scrollLeft     = pos.x
    Element.elm_editor.scrollTop        = pos.y
    Element.elm_editor.scrollLeft       = pos.x
    if(Element.elm_timebar_area){
      Element.elm_timebar_area.scrollLeft = pos.x
    }
  }

  /**
   * Timebar
   */
  // 縦棒ライン
  view_line(){
    const line = document.createElement('div')
    line.classList.add('line')
    const height = Element.elm_editor.scrollHeight
    line.style.setProperty('height',`${height}px`,'')
    Element.elm_editor.appendChild(line)
  }
  get_pos(left){
    left = left > 0 ? left : 0
    return Math.round(left / this.scale_size) * this.scale_size
  }
}