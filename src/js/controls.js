import { Element }  from './common/element.js'
import { Timeline } from './timeline.js'
import { Util }     from './util.js'

export class Controls extends Util{
  constructor(){
    super()
  }

  async init(){
    this.set_time()
    this.set_event()
  }

  set_event(){
    Element.elm_time.addEventListener('change' , this.change_time.bind(this))
    Element.elm_play.addEventListener('click' , this.click_play.bind(this))
  }

  static get time(){
    return Number(Element.elm_time.value) * 1000
  }

  set_time(time){
    time = time || this.fulltime / 1000
    Element.elm_time.value = time
  }
  change_time(e){
    const time = Number(Element.elm_time.value)
    this.sec = time * this.msec * 10
    new Timeline()
  }

  click_play(e){
    switch(this.play_status){
      case 'play':
        this.play_status = ''
        break
      default:
        this.play_status = 'play'
        this.play_control()
        this.play()
        break
    }
  }

  play_control(){
    if(this.play_status !== 'play'){
      Controls.play_time = null
      return
    }

    // current play start time
    Controls.play_time = Controls.play_time || (+new Date())

    // Progress time
    let progress_time = (+new Date()) - Controls.play_time

    // max
    if(progress_time > Controls.time){
      progress_time = 0
      Controls.play_time = (+new Date())
    }
    
    // get_position
    const left = this.time2pos(progress_time)

    // timebar
    this.set_bar_pos(left)

    // repeat
    window.requestAnimationFrame(this.play_control.bind(this))
  }
}