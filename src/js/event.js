import { Element } from './common/element.js'
import { Util }    from './util.js'

export class Event extends Util{
  constructor(){
    super()
  }

  async init(){
    // mouse-over
    Element.elm_keyboard.addEventListener('mouseover' , this.mouseover_key.bind(this))
    Element.elm_keyboard.addEventListener('mouseout'  , this.clear_active.bind(this))
    Element.elm_editor.addEventListener('mouseover'   , this.mouseover_key.bind(this))
    Element.elm_editor.addEventListener('mouseout'    , this.clear_active.bind(this))
    // scroll
    Element.elm_editor.addEventListener('scroll'      , this.scroll_sync_editor.bind(this))
    Element.elm_keyboard.addEventListener('scroll'    , this.scroll_sync_keyboard.bind(this))
    Element.elm_timeline.addEventListener('scroll'    , this.scroll_sync_timeline.bind(this))
  }

  // ----------
  // mouse-over
  mouseover_key(e){
    const elm_octave = e.target.closest('.octave')
    const elm_key    = e.target.closest('[data-key]')
    if(!elm_octave || !elm_key){return}
    const octave_num = elm_octave.getAttribute('data-octave')
    const key        = elm_key.getAttribute('data-key')
    this.set_active(octave_num, key)
  }

  set_active(octave, key){
    this.clear_active()
    const targets = Element.elm_keyboard.querySelectorAll(`.octave[data-octave='${octave}'] [data-key='${key}'] `)
    for(const target of targets){
      target.setAttribute('data-status' , 'active')
    }
  }

  clear_active(){
    const actives = Element.elm_keyboard.querySelectorAll(`[data-status='active']`)
    for(const active of actives){
      active.removeAttribute('data-status')
    }
  }

  // ----------
  // scroll
  scroll_sync_editor(e){
    const pos = {
      x : e.target.scrollLeft,
      y : e.target.scrollTop,
    }
    this.scroll_sync(pos)
  }
  scroll_sync_keyboard(e){
    const pos = {
      x : Element.elm_editor.scrollLeft,
      y : e.target.scrollTop,
    }
    this.scroll_sync(pos)
  }
}