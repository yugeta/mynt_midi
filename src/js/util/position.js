import { Element } from '../ui/element.js'

/**
 * 座標計算ユーティリティ
 */

export function get_pos_x(left){
  const editor_rect = Element.elm_editor.getBoundingClientRect()
  left = left - editor_rect.left + Element.elm_editor.scrollLeft - (Element.default_note_width / 2)
  return left < 0 ? 0 : left
}

export function get_pos_y(top){
  return top < 0 ? 0 : top
}

export function get_note_pos_y(octave, key){
  const elm_octave = Element.elm_editor.querySelector(`.octave[data-octave='${octave}']`)
  if(!elm_octave){return null}
  const elm_key = elm_octave.querySelector(`[data-key='${key}']`)
  if(!elm_key){return null}
  return get_pos_y(elm_key.offsetTop + elm_octave.offsetTop)
}

export function get_key_type(key){
  return key.match(/\-/) ? 'flat' : 'key'
}

export function put_note(octave, key, left){
  octave = Number(octave)
  key = key.toLowerCase()
  const top = get_note_pos_y(octave, key)
  if(top === null){return}
  const width = Element.default_note_width
  const note = document.createElement('div')
  const type = get_key_type(key)
  note.classList.add('note')
  note.style.setProperty('left'   , `${left}px`,'')
  note.style.setProperty('top'    , `${top}px`,'')
  note.style.setProperty('width'  , `${width}px`,'')
  note.setAttribute('data-type'   , type)
  note.setAttribute('data-octave' , octave)
  note.setAttribute('data-key'    , key)
  Element.elm_editor.appendChild(note)
}

export function note_clear(){
  for(const note of Element.notes){
    note.parentNode.removeChild(note)
  }
}

export function scroll_middle(){
  const notes = Element.elm_editor.querySelectorAll('.note')
  const pos = {
    min : {x:null,y:null},
    max : {x:null,y:null}
  }
  if(!notes.length){return}
  for(const note of notes){
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
