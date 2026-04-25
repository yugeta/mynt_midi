import { Keyboard }    from './ui/keyboard.js'
import { Editor }      from './ui/editor.js'
import { Timeline }    from './ui/timeline.js'
import { Timebar }     from './ui/timebar.js'
import { Controls }    from './controller/controls.js'
import { ScrollSync }  from './controller/scroll-sync.js'
import { StringInput } from './controller/string-input.js'
import { JsonIO }      from './controller/json-io.js'
import { SvgImport }   from './core/svg-import.js'
import { LayerModel }  from './midi/layer-model.js'
import { LayerPanel }  from './ui/layer-panel.js'
import { Element }     from './ui/element.js'

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

    // LayerModel初期化: 既存のtextareaとオシレータタイプから初期レイヤーを生成
    const midiString = Element.elm_midi_string ? Element.elm_midi_string.value : ''
    const oscType = document.querySelector(`[name='oscillator_type']`)
      ? document.querySelector(`[name='oscillator_type']`).value
      : 'square'
    LayerModel.init(midiString, oscType)

    await new LayerPanel().init()
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
