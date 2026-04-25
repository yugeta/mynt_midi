import { Element } from './element.js'
import { get_msec, get_fulltime, get_sec_step, get_width } from '../util/time.js'

/**
 * タイムライン目盛り表示
 */

export class Timeline{
  constructor(){}

  async init(){
    this.clear_number_value()
    this.view_second()
    this.set_addSize(this.diff_size)
  }

  get diff_size(){
    return Element.elm_timeline.scrollWidth - get_width()
  }

  view_second(){
    const msec = get_msec()
    const sec_step = get_sec_step()
    const max_msec = get_fulltime() / 100
    for(let i=1; i<=max_msec; i++){
      const div = document.createElement('div')
      const sec  = Math.floor(i / sec_step)
      const msec_val = i - sec * sec_step
      if(i % sec_step === 0){
        div.classList.add('sec')
        div.textContent = `${sec}.0`
      }
      else{
        div.textContent = `${sec}.${msec_val}`
        div.classList.add('msec')
      }
      const x = msec * i
      div.style.setProperty('left',`${x}px`,'')
      Element.elm_timeline.appendChild(div)
    }
  }

  clear_number_value(){
    for(const elm of Element.elm_numbers){
      elm.parentNode.removeChild(elm)
    }
  }

  set_addSize(size){
    Element.elm_editor.style.setProperty('padding-right', `${size}px`, '')
  }
}
