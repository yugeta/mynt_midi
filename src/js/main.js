import { Keyboard }  from './keyboard.js'
import { Editor }    from './editor.js'
import { Event }     from './event.js'
import { Timeline }  from './timeline.js'
import { Timebar }   from './timebar.js'
import { Controls }  from './controls.js'
import { String }    from './string.js'
import { SvgImport } from './common/svg_import.js'


class Main{
  constructor(){
    this.init()
  }

  async init(){
    await new Keyboard().init()
    await new Editor().init()
    await new Timeline().init()
    await new Timebar().init()
    await new Event().init()
    await new Controls().init()
    await new String().init()
    await new SvgImport().init()
  }
}


switch(document.readyState){
  case 'complete':
  case 'interactive':
    new Main();break
  default:
    window.addEventListener('DOMContentLoaded' , (()=> new Main()))
}