import { Element } from './element.js'
import { get_msec, get_scale_size } from '../util/time.js'

/**
 * 再生位置バー
 */

export class Timebar{
  constructor(){}

  async init(){
    this.set_event()
  }

  set_event(){
    if(Element.elm_timebar_area){
      Element.elm_timebar_area.addEventListener('scroll', this.scroll_sync_timeline.bind(this))
    }
    window.addEventListener('mousedown' , this.mousedown.bind(this))
    window.addEventListener('mousemove' , this.mousemove.bind(this))
    window.addEventListener('mouseup'   , this.mouseup.bind(this))
  }

  mousedown(e){
    if(!e.target.closest('.timebar') && !e.target.closest('.timeline')){return}
    let left
    if(e.target.closest('.timebar')){
      left = Element.elm_timebar_icon.style.getPropertyValue('left')
      left = left ? Number(left.replace('px','')) : 0
    }
    else if(e.target.closest('.timeline')){
      left = this.click_timeline(e)
    }
    Timebar.click_data = { mouse_x: e.pageX, left: left }
  }

  mousemove(e){
    if(!Timebar.click_data){return}
    const left = this.get_pos(Timebar.click_data.left + (e.pageX - Timebar.click_data.mouse_x))
    this.set_bar_pos(left)
  }

  mouseup(e){
    if(!Timebar.click_data){return}
    delete Timebar.click_data
  }

  click_timeline(e){
    if(e.target.closest('.timebar')){return}
    const rect = Element.elm_timeline.getBoundingClientRect()
    const left = this.get_pos(e.pageX - rect.left)
    this.set_bar_pos(left)
    return left
  }

  get_pos(left){
    left = left > 0 ? left : 0
    return Math.round(left / get_scale_size()) * get_scale_size()
  }

  set_bar_pos(left){
    if(Element.elm_timebar_icon){
      Element.elm_timebar_icon.style.setProperty('left',`${left}px`,'')
    }
    const line = Element.elm_timebar_line
    if(line){
      line.style.setProperty('left',`${left}px`,'')
    }
    this.set_mmdd(left)
  }

  set_mmdd(left){
    const msec = get_msec()
    const sec_size  = msec * 10
    const sec       = Math.floor(left / sec_size)
    const msec_size = 1000 / sec_size
    const msec_val  = ('000'+ Math.floor((left - (sec * sec_size)) * msec_size)).slice(-3)
    Element.elm_mmdd.value = `${sec}.${msec_val}`
  }

  scroll_sync_timeline(e){
    const pos = { x: e.target.scrollLeft, y: Element.elm_editor.scrollTop }
    Element.elm_keyboard.scrollTop  = pos.y
    Element.elm_timeline.scrollLeft = pos.x
    Element.elm_editor.scrollTop    = pos.y
    Element.elm_editor.scrollLeft   = pos.x
  }
}
