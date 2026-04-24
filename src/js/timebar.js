import { Event }    from './event.js'
import { Element }  from './common/element.js'
import { Timeline } from './timeline.js'
import { Util }     from './util.js'

/**
 * 再生時間バーのイベントと表示処理
 */

export class Timebar extends Util{
  constructor(){
    super()
  }

  async init(){
    this.set_event()
  }

  set_event(){
    // scroll
    if(Element.elm_timebar_area){
      Element.elm_timebar_area.addEventListener('scroll', this.scroll_sync_timeline)
    }
    // drag
    window.addEventListener('mousedown' , this.mousedown.bind(this))
    window.addEventListener('mousemove' , this.mousemove.bind(this))
    window.addEventListener('mouseup'   , this.mouseup.bind(this))
  }

  

  mousedown(e){
    if(!e.target.closest('.timebar')
    && !e.target.closest('.timeline')){return}
    let left
    if(e.target.closest('.timebar')){
      left = Element.elm_timebar_icon.style.getPropertyValue('left')
      left = left ? Number(left.replace('px','')) : 0
    }
    else if(e.target.closest('.timeline')){
      left = this.click_timeline(e)
    }
    Timebar.click_data = {
      mouse_x : e.pageX,
      left    : left
    }
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

  

}