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
import { UndoManager } from './controller/undo-manager.js'
import { Progress }    from './ui/progress.js'
import { apply_timeline_width, apply_scale, sec2px } from './util/time.js'
import { note_clear } from './util/position.js'

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
      Progress.show('データを復元中...')
      // UIスレッドを解放して描画を確定
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      // 復元したアクティブレイヤーのmidiStringをtextareaに反映
      const activeLayer = LayerModel.activeLayer
      if (activeLayer && Element.elm_midi_string) {
        Element.elm_midi_string.value = activeLayer.midiString || ''
      }
      // Time入力欄を復元（保存値があればそれを使う、なければ譜面から再計算）
      const savedTime = localStorage.getItem('mynt_time')
      if (savedTime) {
        Element.elm_time.value = savedTime
        apply_timeline_width(Number(savedTime))
      } else {
        Controls.sync_time_from_midi()
        const sec = Number(Element.elm_time.value) || 1
        apply_timeline_width(sec)
      }
    }

    await new LayerPanel().init()
    await new StringInput().init()
    this._jsonIO = new JsonIO()
    await this._jsonIO.init()
    await new SvgImport().init()

    // シーン名を復元
    const savedSceneName = localStorage.getItem('mynt_scene_name')
    if (savedSceneName) {
      Main.setSceneName(savedSceneName)
    }

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

    // スクロール位置を復元 & プログレス終了
    requestAnimationFrame(() => {
      const savedScrollLeft = localStorage.getItem('mynt_scroll_left')
      const savedScrollTop = localStorage.getItem('mynt_scroll_top')
      if (savedScrollLeft) {
        const sl = Number(savedScrollLeft)
        if (Element.elm_editor) { Element.elm_editor.scrollLeft = sl }
        if (Element.elm_timeline) { Element.elm_timeline.scrollLeft = sl }
      }
      if (savedScrollTop) {
        const st = Number(savedScrollTop)
        if (Element.elm_editor) { Element.elm_editor.scrollTop = st }
        if (Element.elm_keyboard) { Element.elm_keyboard.scrollTop = st }
      }
      Progress.hide()
    })

    // メニューバーアクションのハンドリング
    document.addEventListener('menubar-action', (e) => {
      const action = e.detail && e.detail.action
      if (action === 'new') {
        this._handleNew()
      }
      else if (action === 'open') {
        this._jsonIO && this._jsonIO.openFile()
      }
      else if (action === 'save') {
        this._jsonIO && this._jsonIO.saveFile()
      }
      else if (action === 'import-json') {
        this._jsonIO && this._jsonIO.importJsonFile()
      }
      else if (action === 'import-midi') {
        this._jsonIO && this._jsonIO.importMidiFile()
      }
    })

    // シーン名クリックで編集モーダル
    const sceneNameEl = document.querySelector('.scene-name')
    if (sceneNameEl) {
      sceneNameEl.addEventListener('click', () => this._showSceneNameModal())
    }

    // Undo/Redo 初期化 + キーボードショートカット
    UndoManager.init()
    window.addEventListener('keydown', (e) => {
      // テキスト入力中は無視
      if (e.target.closest('input, textarea, select')) { return }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        UndoManager.undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        UndoManager.redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        UndoManager.redo()
      }
    })
  }
  /**
   * 新規作成: エディタ・モデル・レイヤーをすべてリセットする
   */
  _handleNew(){
    // シーン名入力モーダルを表示（デフォルトは常に「名称未設定」）
    this._showSceneNameModal((name) => {
      // エディタのノートをクリア
      note_clear()

      // textareaをクリア
      if(Element.elm_midi_string){
        Element.elm_midi_string.value = ''
      }

      // MidiModelをリセット
      MidiModel.fromString('')

      // LayerModelをデフォルト状態にリセット（コールバックは維持してUIを再描画）
      LayerModel.reset('', 'square')

      // Time入力欄をデフォルトに戻す
      if(Element.elm_time){
        Element.elm_time.value = 1
        apply_timeline_width(1)
      }

      // タイムラインを再描画
      new Timeline().init()

      // スクロールを基準位置（先頭）に戻す
      if(Element.elm_editor){ Element.elm_editor.scrollLeft = 0 }
      if(Element.elm_timeline){ Element.elm_timeline.scrollLeft = 0 }
      if(Element.elm_keyboard){ Element.elm_keyboard.scrollTop = 0 }
      const timebarArea = document.querySelector('.timebar-area')
      if(timebarArea){ timebarArea.scrollLeft = 0 }

      // シーン名を設定
      Main.setSceneName(name)

      // localStorageの保存データもクリア
      LayerModel._saveToStorage()

      // Undo履歴をリセット
      UndoManager.init()
    }, '名称未設定')
  }

  /**
   * シーン名入力モーダルを表示する
   * @param {Function} [onConfirm] - 確定時のコールバック（名前を引数で受け取る）。省略時は名前変更のみ
   * @param {string} [defaultName] - 入力欄の初期値。省略時は現在のシーン名
   */
  _showSceneNameModal(onConfirm, defaultName){
    const initialName = defaultName !== undefined ? defaultName : Main.getSceneName()

    // シンプルなモーダルを動的生成
    const overlay = document.createElement('div')
    overlay.className = 'scene-name-modal-overlay'
    overlay.innerHTML = `
      <div class="scene-name-modal">
        <div class="scene-name-modal-title">シーン名</div>
        <input type="text" class="scene-name-modal-input" value="${initialName}" />
        <div class="scene-name-modal-actions">
          <button class="scene-name-modal-ok">OK</button>
          <button class="scene-name-modal-cancel">キャンセル</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    const input = overlay.querySelector('.scene-name-modal-input')
    input.focus()
    input.select()

    const confirm = () => {
      const name = input.value.trim() || '名称未設定'
      Main.setSceneName(name)
      overlay.remove()
      if (onConfirm) { onConfirm(name) }
    }

    const cancel = () => {
      overlay.remove()
    }

    overlay.querySelector('.scene-name-modal-ok').addEventListener('click', confirm)
    overlay.querySelector('.scene-name-modal-cancel').addEventListener('click', cancel)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { confirm() }
      if (e.key === 'Escape') { cancel() }
    })
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { cancel() }
    })
  }

  // --- シーン名管理 ---

  static getSceneName(){
    const el = document.querySelector('.scene-name')
    return el ? el.textContent : '名称未設定'
  }

  static setSceneName(name){
    const el = document.querySelector('.scene-name')
    if (el) { el.textContent = name || '名称未設定' }
    // localStorageにも保存
    try { localStorage.setItem('mynt_scene_name', name || '名称未設定') } catch(e){}
  }
}

switch(document.readyState){
  case 'complete':
  case 'interactive':
    new Main();break
  default:
    window.addEventListener('DOMContentLoaded' , (()=> new Main()))
}
