import { Element }  from './element.js'
import { Css }      from '../core/css.js'
import { get_pos_x, get_pos_y } from '../util/position.js'
import { get_msec, get_msec_step } from '../util/time.js'

export class Editor{
  constructor(){}

  async init(){
    this.clear()
    this.set_octave()
    this.set_event()
    this.view_line()
    this.fit_height()
  }

  clear(){
    Element.elm_editor.innerHTML = ''
  }

  set_event(){
    Element.elm_editor.addEventListener('click'     , this.click_editor.bind(this))
    Element.elm_editor.addEventListener('mousedown' , this.note_move_start.bind(this))
    Element.elm_editor.addEventListener('mousemove' , this.note_move_move.bind(this))
    Element.elm_editor.addEventListener('mouseup'   , this.note_move_end.bind(this))
    // ホバーイベント（旧event.jsから統合）
    Element.elm_editor.addEventListener('mouseover' , this.mouseover_key.bind(this))
    Element.elm_editor.addEventListener('mouseout'  , this.clear_editor_active.bind(this))

    if(Editor._click_note_handler){
      window.removeEventListener('mousedown', Editor._click_note_handler)
    }
    Editor._click_note_handler = this.click_note.bind(this)
    window.addEventListener('mousedown', Editor._click_note_handler)
  }

  set_octave(){
    const keyboard_octaves = Element.elm_octaves
    for(const keyboard_octave of keyboard_octaves){
      const octave_num = keyboard_octave.getAttribute('data-octave')
      const editor_octave = document.createElement('div')
      editor_octave.classList.add('octave')
      editor_octave.setAttribute('data-octave' , octave_num)
      Element.elm_editor.appendChild(editor_octave)
      this.set_dataLine(keyboard_octave, editor_octave)
    }
  }

  set_dataLine(keyboard_octave, editor_octave){
    const keys = keyboard_octave.querySelectorAll(':scope > *')
    for(const key of keys){
      const div = document.createElement('div')
      div.setAttribute('data-type', key.getAttribute('data-type'))
      div.setAttribute('data-key' , key.getAttribute('data-key'))
      editor_octave.appendChild(div)
    }
  }

  click_editor(e){
    if(!e.target.closest('.octave [data-key]')){return}
    const octave   = this.get_octave(e.target)
    const key      = this.get_key(e.target)
    const key_elm  = e.target.closest('[data-key]')
    const octave_rect = key_elm.closest('.octave')
    const key_type = key_elm.getAttribute('data-type')
    const pos = {
      x : get_pos_x(e.pageX),
      y : get_pos_y(key_elm.offsetTop + octave_rect.offsetTop),
    }
    const left = this.note_pos_adjust(pos.x)
    this.put_note_editor(pos.y , left , key_type , octave , key)
  }

  fit_height(){
    const footer_size = 30
    const rect = Element.elm_editor.getBoundingClientRect()
    const height = window.innerHeight - rect.top - footer_size
    Css.set_css(':root', '--editor-height' , `${height}px`)
  }

  get_key(elm){
    const elm_key = elm.closest('[data-key]')
    return elm_key ? elm_key.getAttribute('data-key') : null
  }
  get_octave(elm){
    const elm_octave = elm.closest('.octave')
    return elm_octave ? elm_octave.getAttribute('data-octave') : null
  }

  put_note_editor(top, left, type, octave, key){
    const width = Element.default_note_width
    const note = document.createElement('div')
    note.classList.add('note')
    note.style.setProperty('left'  , `${left}px`,'')
    note.style.setProperty('top'   , `${top}px`,'')
    note.style.setProperty('width' , `${width}px`,'')
    note.setAttribute('data-type'   , type)
    note.setAttribute('data-octave' , octave)
    note.setAttribute('data-key'    , key)
    note.setAttribute('data-status' , 'active')
    Element.elm_editor.appendChild(note)
  }

  note_move_start(e){
    const note = e.target.closest('.note')
    if(!note){return}
    this.move_note = { elm: note, mouse: e.pageX, left: note.offsetLeft }
  }
  note_move_move(e){
    if(!this.move_note){return}
    let left = this.move_note.left - (this.move_note.mouse - e.pageX)
    left = this.note_pos_adjust(left)
    this.move_note.elm.style.setProperty('left' , `${left}px` , '')
  }
  note_move_end(e){
    if(!this.move_note){return}
    delete this.move_note
  }

  note_pos_adjust(num){
    const step_size = get_msec() / get_msec_step()
    return Math.floor(num / step_size) * step_size
  }

  click_note(e){
    this.clear_status_all_note()
    const note = e.target.closest('.editor .note')
    if(note){ note.setAttribute('data-status' , 'active') }
  }
  clear_status_all_note(){
    const elms = Element.elm_editor.querySelectorAll(`.note[data-status='active']`)
    for(const elm of elms){ elm.removeAttribute('data-status') }
  }

  // ホバーハイライト
  mouseover_key(e){
    const elm_octave = e.target.closest('.octave')
    const elm_key    = e.target.closest('[data-key]')
    if(!elm_octave || !elm_key){return}
  }
  clear_editor_active(){}

  // 縦棒ライン
  view_line(){
    const line = document.createElement('div')
    line.classList.add('line')
    const height = Element.elm_editor.scrollHeight
    line.style.setProperty('height',`${height}px`,'')
    Element.elm_editor.appendChild(line)
  }
}
