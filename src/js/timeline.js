import { Css }      from './common/css.js'
import { Element }  from './common/element.js'
import { Util }     from './util.js'

/**
 * Timeline処理
 * 
 * 1秒 = 500pxとして計算（css参照）
 * 
 */

export class Timeline extends Util{
  constructor(){
    super()
  }

  async init(){
    this.clear_number_value()
    this.view_second()
    this.set_addSize(this.diff_size)
  }
  
  // 文字列はみ出しサイズ
  get diff_size(){
    return Element.elm_timeline.scrollWidth - this.width
  }

  view_second(){
    const max_msec = this.fulltime / 100
    for(let i=1; i<=max_msec; i++){
      const div = document.createElement('div')
      const sec  = Math.floor(i / this.sec_step)
      const msec = i - sec * this.sec_step
      // sec
      if(i % this.sec_step === 0){
        div.classList.add('sec')
        div.textContent = `${sec}.0`
      }
      // msec
      else{
        div.textContent = `${sec}.${msec}`
        div.classList.add('msec')
      }
      const x = this.msec * i
      div.style.setProperty('left',`${x}px`,'')
      Element.elm_timeline.appendChild(div)
    }
  }

  clear_number_value(){
    for(const elm of Element.elm_numbers){
      elm.parentNode.removeChild(elm)
    }
  }
}