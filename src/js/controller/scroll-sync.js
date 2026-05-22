import { Element } from '../ui/element.js'

/**
 * スクロール同期
 */

export class ScrollSync{
  constructor(){}

  async init(){
    Element.elm_editor.addEventListener('scroll'   , this.scroll_sync_editor.bind(this))
    Element.elm_keyboard.addEventListener('scroll'  , this.scroll_sync_keyboard.bind(this))
    Element.elm_timeline.addEventListener('scroll'  , this.scroll_sync_timeline.bind(this))
  }

  scroll_sync_editor(e){
    this.scroll_sync({ x: e.target.scrollLeft, y: e.target.scrollTop })
  }

  scroll_sync_keyboard(e){
    this.scroll_sync({ x: Element.elm_editor.scrollLeft, y: e.target.scrollTop })
  }

  scroll_sync_timeline(e){
    this.scroll_sync({ x: e.target.scrollLeft, y: Element.elm_editor.scrollTop })
  }

  scroll_sync(pos){
    Element.elm_keyboard.scrollTop  = pos.y
    Element.elm_timeline.scrollLeft = pos.x
    Element.elm_editor.scrollTop    = pos.y
    Element.elm_editor.scrollLeft   = pos.x
    if(Element.elm_timebar_area){
      Element.elm_timebar_area.scrollLeft = pos.x
    }
    // スクロール位置を保存（デバウンス）
    clearTimeout(ScrollSync._saveTimer)
    ScrollSync._saveTimer = setTimeout(() => {
      try {
        localStorage.setItem('mynt_scroll_left', String(pos.x))
        localStorage.setItem('mynt_scroll_top', String(pos.y))
      } catch(e){}
    }, 300)
  }
}
