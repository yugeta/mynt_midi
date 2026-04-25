import { Element }    from './element.js'
import { Convert }    from '../core/convert.js'
import { MidiPlayer } from '../midi/player.js'
import { LayerModel } from '../midi/layer-model.js'

export class Keyboard{
  constructor(options){
    this.options = options || {}
  }

  async init(){
    const res = await this.asset_load()
    this.view_octave(res)
  }

  get filepath_asset(){
    return 'asset/octave.html'
  }

  async asset_load(){
    return await fetch(this.filepath_asset,{
      method : 'GET',
      headers: {"Content-Type": "text/html"},
    }).then(e => e.text())
  }

  view_octave(asset_octave){
    for(let i=0; i<Element.octave_count; i++){
      const html = new Convert(asset_octave).double_bracket({octave : i})
      Element.elm_keyboard.insertAdjacentHTML('afterbegin' ,html)
    }
    this.set_event()
    if(this.options.callback){
      this.options.callback()
    }
  }

  set_event(){
    Element.elm_keyboard.addEventListener('mousedown' , Keyboard.key_down)
    window.addEventListener('mouseup' , Keyboard.key_up)
    // ホバーイベント（旧event.jsから統合）
    Element.elm_keyboard.addEventListener('mouseover' , Keyboard.mouseover_key)
    Element.elm_keyboard.addEventListener('mouseout'  , Keyboard.clear_active)
  }

  static set_center(){
    Element.elm_keyboard.scrollTop = (Element.elm_keyboard.scrollHeight - Element.elm_keyboard.offsetHeight) / 2
  }

  static key_down(e){
    const elm_oct = e.target.closest('.octave')
    const elm_key = e.target.closest('[data-key]')
    if(!elm_oct || !elm_key){ return }
    e.preventDefault()
    const oct = elm_oct.getAttribute('data-octave')
    const key = elm_key.getAttribute('data-key')
    const active = LayerModel.activeLayer
    const oscType = active ? active.oscillatorType : 'square'
    MidiPlayer.startNote(key, oct, { oscillatorType: oscType }).then(handle => {
      Keyboard._activeNote = handle
    })
  }

  static key_up(){
    if(Keyboard._activeNote){
      MidiPlayer.stopNote(Keyboard._activeNote)
      Keyboard._activeNote = null
    }
  }

  static mouseover_key(e){
    const elm_octave = e.target.closest('.octave')
    const elm_key    = e.target.closest('[data-key]')
    if(!elm_octave || !elm_key){return}
    const octave_num = elm_octave.getAttribute('data-octave')
    const key        = elm_key.getAttribute('data-key')
    Keyboard.set_active(octave_num, key)
  }

  static set_active(octave, key){
    Keyboard.clear_active()
    const targets = Element.elm_keyboard.querySelectorAll(`.octave[data-octave='${octave}'] [data-key='${key}']`)
    for(const target of targets){
      target.setAttribute('data-status' , 'active')
    }
  }

  static clear_active(){
    const actives = Element.elm_keyboard.querySelectorAll(`[data-status='active']`)
    for(const active of actives){
      active.removeAttribute('data-status')
    }
  }
}
