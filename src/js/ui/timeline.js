import { Element } from './element.js'
import { get_msec, get_fulltime, get_sec_step, get_width, get_scale } from '../util/time.js'

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
    const scale = get_scale()

    // スケールに応じてラベルを間引く
    // 1目盛りのpx幅が狭い時は、表示間隔を広げる
    let labelInterval = 1  // 何目盛りごとにラベルを表示するか
    if(scale < 0.4){
      labelInterval = 5    // 秒単位のみ（0.5秒刻み）
    } else if(scale < 0.7){
      labelInterval = 2    // 1つおき
    }

    for(let i=1; i<=max_msec; i++){
      const sec  = Math.floor(i / sec_step)
      const msec_val = i - sec * sec_step
      const isSec = (i % sec_step === 0)

      // 間引き: labelInterval に合わないラベルはスキップ
      if(!isSec && (i % labelInterval !== 0)){
        continue
      }

      const div = document.createElement('div')
      if(isSec){
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
