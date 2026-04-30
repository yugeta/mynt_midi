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
import { MidiModel }   from './midi/model.js'
import { LayerPanel }  from './ui/layer-panel.js'
import { Element }     from './ui/element.js'
import { Menubar }     from './ui/menubar.js'
import { apply_timeline_width, apply_scale, sec2px } from './util/time.js'

class Main{
  constructor(){
    this.init()
  }

  async init(){
    await new Menubar().init()
    await new Keyboard().init()
    await new Editor().init()
    await new Timeline().init()
    await new Timebar().init()
    await new ScrollSync().init()
    await new Controls().init()

    // LayerModel初期化: localStorageに保存データがあれば復元、なければtextareaから生成
    const restored = LayerModel.loadFromStorage()
    if (!restored) {
      const midiString = Element.elm_midi_string ? Element.elm_midi_string.value : ''
      const oscType = document.querySelector(`[name='oscillator_type']`)
        ? document.querySelector(`[name='oscillator_type']`).value
        : 'square'
      LayerModel.init(midiString, oscType)
    } else {
      // 復元したアクティブレイヤーのmidiStringをtextareaに反映
      const activeLayer = LayerModel.activeLayer
      if (activeLayer && Element.elm_midi_string) {
        Element.elm_midi_string.value = activeLayer.midiString || ''
      }
      // Time入力欄を復元した譜面に合わせて再計算
      Controls.sync_time_from_midi()
      const sec = Number(Element.elm_time.value) || 1
      apply_timeline_width(sec)
    }

    await new LayerPanel().init()
    await new StringInput().init()
    await new JsonIO().init()
    await new SvgImport().init()

    // スケールスライダーの値を復元（change_scaleと同等の処理をフルで実行）
    const savedScale = localStorage.getItem('mynt_scale')
    if (savedScale) {
      const pct = Number(savedScale)
      const slider = document.querySelector('.scale-slider')
      const label = document.querySelector('.scale-value')
      if (slider) { slider.value = pct }
      if (label) { label.textContent = `${pct}%` }

      // CSS変数を更新
      apply_scale(pct / 100)
      const sec = Number(Element.elm_time.value) || 1
      apply_timeline_width(sec)

      // アクティブレイヤーのノートのピクセル値を再計算
      MidiModel.recalcPixels()

      // 非アクティブレイヤーのスナップショットも再計算
      for (const layer of LayerModel.layers) {
        if (!layer.notesData) { continue }
        for (const n of layer.notesData) {
          n.left = sec2px(n.startTime)
          n.width = sec2px(n.tempo)
        }
      }

      // タイムラインとノートを再描画
      new Timeline().init()
      LayerModel._notify()
    }
  }
}

switch(document.readyState){
  case 'complete':
  case 'interactive':
    new Main();break
  default:
    window.addEventListener('DOMContentLoaded' , (()=> new Main()))
}
