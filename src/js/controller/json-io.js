/**
 * JSON Import/Export コントローラー
 *
 * メニュー操作:
 *   - 開く: JSONファイルを読み込み → シーン全体を置き換え
 *   - 保存: 現在のシーン全体をJSONファイルとして保存
 *   - インポート > JSON: JSONファイルを読み込み → レイヤーを追加
 *   - インポート > MIDI: .midファイルを読み込み → レイヤーを追加
 *
 * ツールバーボタン:
 *   - Import: JSONコピペ用モーダル → レイヤーを追加
 */

import { JsonConverter } from '../midi/json-converter.js'
import { SmfParser }    from '../midi/smf-parser.js'
import { Element }       from '../ui/element.js'
import { MidiModel }     from '../midi/model.js'
import { LayerModel }    from '../midi/layer-model.js'
import { StringInput }   from './string-input.js'
import { note_clear, scroll_middle } from '../util/position.js'
import { apply_timeline_width, apply_scale } from '../util/time.js'
import { Timeline }      from '../ui/timeline.js'

export class JsonIO {
  constructor() {}

  async init() {
    this.createModal()
    this.setEvent()
  }

  // --- モーダルHTML生成 ---
  createModal() {
    const modal = document.createElement('div')
    modal.className = 'json-modal-overlay'
    modal.innerHTML = `
      <div class="json-modal">
        <div class="json-modal-header">
          <span class="json-modal-title"></span>
          <span class="json-modal-close">&times;</span>
        </div>
        <textarea class="json-modal-textarea" spellcheck="false"></textarea>
        <div class="json-modal-actions">
          <button class="json-modal-btn json-modal-format">Format</button>
          <button class="json-modal-btn json-modal-execute"></button>
          <button class="json-modal-btn json-modal-cancel">Cancel</button>
        </div>
        <div class="json-modal-error"></div>
      </div>
    `
    document.body.appendChild(modal)
  }

  // --- イベント設定 ---
  setEvent() {
    // ツールバーのImportボタン（JSONコピペ用モーダル）
    const btnImport = document.querySelector('.json-import-btn')
    if (btnImport) {
      btnImport.addEventListener('click', () => this.openImportModal())
    }

    // モーダル閉じる
    const overlay = document.querySelector('.json-modal-overlay')
    const closeBtn = document.querySelector('.json-modal-close')
    const cancelBtn = document.querySelector('.json-modal-cancel')

    if (closeBtn) { closeBtn.addEventListener('click', () => this.closeModal()) }
    if (cancelBtn) { cancelBtn.addEventListener('click', () => this.closeModal()) }
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { this.closeModal() }
      })
    }
  }

  // =========================================
  //  メニュー: 開く（シーン全体を置き換え）
  // =========================================

  openFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.addEventListener('change', () => {
      const file = input.files[0]
      if (!file) { return }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result)
          const layerData = JsonConverter.importLayers(data)

          note_clear()
          LayerModel.fromJSON(layerData)

          const active = LayerModel.activeLayer
          if (active && Element.elm_midi_string) {
            Element.elm_midi_string.value = active.midiString || ''
          }
          if (active && active.midiString) {
            MidiModel.fromString(active.midiString)
          }

          // シーン名を復元（データ内のname → なければファイル名）
          const sceneName = data.name || file.name.replace(/\.json$/i, '')
          JsonIO._setSceneName(sceneName)

          // シーンデータを復元
          if (data.scene) {
            JsonIO._restoreScene(data.scene)
          }

          scroll_middle()
        } catch (e) {
          alert(`ファイルの読み込みに失敗しました: ${e.message}`)
        }
      }
      reader.readAsText(file)
    })
    input.click()
  }

  // =========================================
  //  メニュー: 保存（JSONファイルとして保存）
  // =========================================

  saveFile() {
    const sceneName = JsonIO._getSceneName()
    const sceneOptions = {
      name: sceneName,
      time: Number(Element.elm_time.value) || 1,
      scale: Number(document.querySelector('.scale-slider')?.value) || 100,
      scrollLeft: Element.elm_editor ? Element.elm_editor.scrollLeft : 0,
      scrollTop: Element.elm_editor ? Element.elm_editor.scrollTop : 0,
    }
    const json = JsonConverter.exportLayers(LayerModel.layers, sceneOptions)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // シーン名をファイル名に使用
    const fileName = sceneName.replace(/[\/\\:*?"<>|]/g, '_') + '.json'
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  // =========================================
  //  メニュー: インポート > JSON（レイヤー追加）
  // =========================================

  importJsonFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.addEventListener('change', () => {
      const file = input.files[0]
      if (!file) { return }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result)
          const layerData = JsonConverter.importLayers(data)
          this._addLayersFromImport(layerData)
        } catch (e) {
          alert(`JSONファイルの読み込みに失敗しました: ${e.message}`)
        }
      }
      reader.readAsText(file)
    })
    input.click()
  }

  // =========================================
  //  メニュー: インポート > MIDI（レイヤー追加）
  // =========================================

  importMidiFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mid,.midi,audio/midi'
    input.addEventListener('change', () => {
      const file = input.files[0]
      if (!file) { return }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const tracks = SmfParser.parse(reader.result)
          if (!tracks || !tracks.length) {
            alert('MIDIファイルにノートデータが見つかりませんでした')
            return
          }

          const newLayers = tracks.map(track => ({
            name: track.name,
            mode: "midi",
            oscillatorType: "square",
            noteEvents: track.noteEvents,
            midiString: "",
            offset: 0,
            loop: false,
            volume: 50,
            mute: false,
            solo: false,
            visible: true,
          }))

          LayerModel.addLayers(newLayers)
          note_clear()
          // アクティブレイヤーを更新
          const active = LayerModel.activeLayer
          if (active && Element.elm_midi_string) {
            Element.elm_midi_string.value = active.midiString || ''
          }
          scroll_middle()
        } catch (e) {
          alert(`MIDIファイルの読み込みに失敗しました: ${e.message}`)
        }
      }
      reader.readAsArrayBuffer(file)
    })
    input.click()
  }

  // =========================================
  //  ツールバー: Import モーダル（コピペ → レイヤー追加）
  // =========================================

  openImportModal() {
    const overlay = document.querySelector('.json-modal-overlay')
    const title = document.querySelector('.json-modal-title')
    const textarea = document.querySelector('.json-modal-textarea')
    const execBtn = document.querySelector('.json-modal-execute')
    const formatBtn = document.querySelector('.json-modal-format')
    const errorEl = document.querySelector('.json-modal-error')

    title.textContent = 'JSON Import（レイヤー追加）'
    textarea.value = ''
    textarea.placeholder = '{\n  "bpm": 120,\n  "notes": [\n    { "pitch": "C4", "duration": "4n" }\n  ]\n}'
    textarea.readOnly = false
    execBtn.textContent = 'Import'
    formatBtn.style.display = ''
    errorEl.textContent = ''
    errorEl.className = 'json-modal-error'
    overlay.classList.add('active')

    // textarea入力時のリアルタイムバリデーション
    this._removeInputListener()
    this._inputListener = () => {
      const val = textarea.value.trim()
      if (!val) {
        errorEl.textContent = ''
        errorEl.className = 'json-modal-error'
        return
      }
      const result = this._validate(val)
      if (result.ok) {
        errorEl.textContent = '✓ 有効なJSON'
        errorEl.className = 'json-modal-error valid'
      } else {
        errorEl.textContent = result.error
        errorEl.className = 'json-modal-error'
      }
    }
    textarea.addEventListener('input', this._inputListener)

    // 実行ボタンのイベントを差し替え
    const newBtn = execBtn.cloneNode(true)
    execBtn.parentNode.replaceChild(newBtn, execBtn)
    newBtn.addEventListener('click', () => this._executeModalImport())

    // 整形ボタンのイベントを差し替え
    const newFmt = formatBtn.cloneNode(true)
    formatBtn.parentNode.replaceChild(newFmt, formatBtn)
    newFmt.addEventListener('click', () => this._executeFormat())
  }

  // =========================================
  //  内部メソッド
  // =========================================

  /**
   * インポートしたレイヤーデータを既存に追加する
   */
  _addLayersFromImport(layerData) {
    if (!layerData || !layerData.layers || !layerData.layers.length) { return }

    LayerModel.addLayers(layerData.layers)
    note_clear()

    const active = LayerModel.activeLayer
    if (active && Element.elm_midi_string) {
      Element.elm_midi_string.value = active.midiString || ''
    }
    scroll_middle()
  }

  _removeInputListener() {
    if (this._inputListener) {
      const textarea = document.querySelector('.json-modal-textarea')
      if (textarea) { textarea.removeEventListener('input', this._inputListener) }
      this._inputListener = null
    }
  }

  _executeFormat() {
    const textarea = document.querySelector('.json-modal-textarea')
    const errorEl = document.querySelector('.json-modal-error')
    const val = textarea.value.trim()
    if (!val) { return }
    try {
      const parsed = JSON.parse(val)
      textarea.value = JSON.stringify(parsed, null, 2)
      errorEl.textContent = '✓ 整形しました'
      errorEl.className = 'json-modal-error valid'
    } catch (e) {
      errorEl.textContent = `JSON構文エラー: ${e.message}`
      errorEl.className = 'json-modal-error'
    }
  }

  _executeModalImport() {
    const textarea = document.querySelector('.json-modal-textarea')
    const errorEl = document.querySelector('.json-modal-error')
    const jsonStr = textarea.value.trim()

    const result = this._validate(jsonStr)
    if (!result.ok) {
      errorEl.textContent = result.error
      errorEl.className = 'json-modal-error'
      return
    }

    try {
      const layerData = JsonConverter.importLayers(result.parsed)
      this._addLayersFromImport(layerData)
      this._removeInputListener()
      this.closeModal()
    }
    catch (e) {
      errorEl.textContent = `エラー: ${e.message}`
      errorEl.className = 'json-modal-error'
    }
  }

  _validate(jsonStr) {
    if (!jsonStr) {
      return { ok: false, error: 'JSONを入力してください' }
    }
    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch (e) {
      return { ok: false, error: `JSON構文エラー: ${e.message}` }
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: 'トップレベルはオブジェクトである必要があります' }
    }

    if (parsed.layers && Array.isArray(parsed.layers)) {
      if (parsed.layers.length === 0) {
        return { ok: false, error: '"layers" 配列に1つ以上のレイヤーが必要です' }
      }
      return { ok: true, parsed }
    }

    if (!Array.isArray(parsed.notes)) {
      return { ok: false, error: '"notes" 配列または "layers" 配列が必要です' }
    }
    for (let i = 0; i < parsed.notes.length; i++) {
      const note = parsed.notes[i]
      if (!note.pitch) {
        return { ok: false, error: `notes[${i}]: "pitch" が必要です` }
      }
      if (!note.duration) {
        return { ok: false, error: `notes[${i}]: "duration" が必要です` }
      }
    }
    return { ok: true, parsed }
  }

  closeModal() {
    this._removeInputListener()
    const overlay = document.querySelector('.json-modal-overlay')
    if (overlay) { overlay.classList.remove('active') }
  }

  // --- シーン名ヘルパー ---

  static _getSceneName() {
    const el = document.querySelector('.scene-name')
    return el ? el.textContent : '名称未設定'
  }

  static _setSceneName(name) {
    const el = document.querySelector('.scene-name')
    if (el) { el.textContent = name || '名称未設定' }
    try { localStorage.setItem('mynt_scene_name', name || '名称未設定') } catch(e){}
  }

  /**
   * シーンデータ（time, scale, scroll）を復元する
   */
  static _restoreScene(scene) {
    // Time
    if (scene.time && Element.elm_time) {
      Element.elm_time.value = scene.time
      apply_timeline_width(scene.time)
    }

    // Scale
    if (scene.scale) {
      const slider = document.querySelector('.scale-slider')
      const label = document.querySelector('.scale-value')
      if (slider) { slider.value = scene.scale }
      if (label) { label.textContent = `${scene.scale}%` }
      apply_scale(scene.scale / 100)
      const sec = Number(Element.elm_time.value) || 1
      apply_timeline_width(sec)
      try { localStorage.setItem('mynt_scale', String(scene.scale)) } catch(e){}
    }

    // Timeline再描画
    new Timeline().init()

    // Scroll位置（描画完了後に適用）
    requestAnimationFrame(() => {
      if (scene.scrollLeft != null && Element.elm_editor) {
        Element.elm_editor.scrollLeft = scene.scrollLeft
        if (Element.elm_timeline) { Element.elm_timeline.scrollLeft = scene.scrollLeft }
      }
      if (scene.scrollTop != null && Element.elm_editor) {
        Element.elm_editor.scrollTop = scene.scrollTop
        const keyboard = document.querySelector('.keyboard')
        if (keyboard) { keyboard.scrollTop = scene.scrollTop }
      }
    })
  }
}
