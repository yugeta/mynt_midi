import { Keyboard }    from './ui/keyboard.js'
import { Editor }      from './ui/editor.js'
import { Timeline }    from './ui/timeline.js'
import { Timebar }     from './ui/timebar.js'
import { Controls }    from './controller/controls.js'
import { ScrollSync }  from './controller/scroll-sync.js'
import { StringInput } from './controller/string-input.js'
import { JsonIO }      from './controller/json-io.js'
import { SvgImport }   from './core/svg-import.js'

class Main{
  constructor(){
    this.init()
  }

  async init(){
    await new Keyboard().init()
    await new Editor().init()
    await new Timeline().init()
    await new Timebar().init()
    await new ScrollSync().init()
    await new Controls().init()
    await new StringInput().init()
    await new JsonIO().init()
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
