import { Element } from './common/element.js'
import { Convert } from './common/convert.js'
import { Midi }    from './midi.js'
import { Util }    from './util.js'

export class Keyboard extends Util{
  constructor(options){
    super()
    this.options = options || {}
    
  }

  async init(){
    const res = await this.asset_load()
    this.view_octave(res)
  }

  // 鍵盤HTMLのファイルパス
  get filepath_asset(){
    return 'asset/octave.html'
  }

  // 鍵盤HTMLの読み込み処理
  async asset_load(){
    return await fetch(this.filepath_asset,{
      method : 'GET',
      headers: {"Content-Type": "text/html"},
    }).then(e => e.text())

  }

  // オクターブ別表示
  view_octave(asset_octave){
    for(let i=0; i<Element.octave_count; i++){
      const html = new Convert(asset_octave).double_bracket({octave : i})
      Element.elm_keyboard.insertAdjacentHTML('afterbegin' ,html)
    }
    this.set_event()
    // Keyboard.set_center()
    this.finish()
  }

  // イベントセット
  set_event(){
    Element.elm_keyboard.addEventListener('click' , Keyboard.key_click)
  }

  // 初期位置をオクターブ中心にする
  static set_center(){
    Element.elm_keyboard.scrollTop = (Element.elm_keyboard.scrollHeight - Element.elm_keyboard.offsetHeight) / 2
  }

  // 初期設定終了後処理
  finish(){
    if(this.options.callback){
      this.options.callback()
    }
  }

  // 鍵盤をクリックした時の処理
  static key_click(e){
    const elm_oct = e.target.closest('.octave')
    const elm_key = e.target.closest('[data-key]')
    const oct = elm_oct.getAttribute('data-octave')
    const key = elm_key.getAttribute('data-key')
    console.log(oct,key)
    Midi.play(`T450O${oct}${key}`)
    // Midi.play('T450O7EGO8ECDG') // coin
  }
}