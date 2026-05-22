/**
 * JSON Import/Export コントローラー
 *
 * - Import: モーダルにJSON貼り付け → MIDI文字列に変換 → textareaに反映
 * - Export: 現在のMIDI文字列 → JSON変換 → モーダルに表示
 */

import { JsonConverter } from '../midi/json-converter.js'
import { SmfParser }    from '../midi/smf-parser.js'
import { Element }       from '../ui/element.js'
import { MidiModel }     from '../midi/model.js'
import { LayerModel }    from '../midi/layer-model.js'
import { StringInput }   from './string-input.js'
import { note_clear, scroll_middle } from '../util/position.js'

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
    // Import ボタン
    const btnImport = document.querySelector('.json-import-btn')
    if (btnImport) {
      btnImport.addEventListener('click', () => this.openImport())
    }

    // Export ボタン
    const btnExport = document.querySelector('.json-export-btn')
    if (btnExport) {
      btnExport.addEventListener('click', () => this.openExport())
    }

    // MIDI Import ボタン
    const btnMidiImport = document.querySelector('.midi-import-btn')
    if (btnMidiImport) {
      btnMidiImport.addEventListener('click', () => this.openMidiImport())
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

  // --- バリデーション ---
  validate(jsonStr) {
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

    // v2.0 レイヤー形式
    if (parsed.layers && Array.isArray(parsed.layers)) {
      if (parsed.layers.length === 0) {
        return { ok: false, error: '"layers" 配列に1つ以上のレイヤーが必要です' }
      }
      return { ok: true, parsed, format: "2.0" }
    }

    // v1.0 旧形式
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
    return { ok: true, parsed, format: "1.0" }
  }

  // --- Import ---
  openImport() {
    const overlay = document.querySelector('.json-modal-overlay')
    const title = document.querySelector('.json-modal-title')
    const textarea = document.querySelector('.json-modal-textarea')
    const execBtn = document.querySelector('.json-modal-execute')
    const formatBtn = document.querySelector('.json-modal-format')
    const errorEl = document.querySelector('.json-modal-error')

    title.textContent = 'JSON Import'
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
      const result = this.validate(val)
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
    newBtn.addEventListener('click', () => this.executeImport())

    // 整形ボタンのイベントを差し替え
    const newFmt = formatBtn.cloneNode(true)
    formatBtn.parentNode.replaceChild(newFmt, formatBtn)
    newFmt.addEventListener('click', () => this.executeFormat())
  }

  _removeInputListener() {
    if (this._inputListener) {
      const textarea = document.querySelector('.json-modal-textarea')
      if (textarea) { textarea.removeEventListener('input', this._inputListener) }
      this._inputListener = null
    }
  }

  executeFormat() {
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

  executeImport() {
    const textarea = document.querySelector('.json-modal-textarea')
    const errorEl = document.querySelector('.json-modal-error')
    const jsonStr = textarea.value.trim()

    const result = this.validate(jsonStr)
    if (!result.ok) {
      errorEl.textContent = result.error
      errorEl.className = 'json-modal-error'
      return
    }

    try {
      // レイヤー形式に変換（v1.0/v2.0 両対応）
      const layerData = JsonConverter.importLayers(result.parsed)

      note_clear()
      LayerModel.fromJSON(layerData)

      // アクティブレイヤーのmidiStringをtextareaに反映
      const active = LayerModel.activeLayer
      if (active && Element.elm_midi_string) {
        Element.elm_midi_string.value = active.midiString
      }

      scroll_middle()

      this._removeInputListener()
      this.closeModal()
    }
    catch (e) {
      errorEl.textContent = `エラー: ${e.message}`
      errorEl.className = 'json-modal-error'
    }
  }

  // --- Export ---
  openExport() {
    const overlay = document.querySelector('.json-modal-overlay')
    const title = document.querySelector('.json-modal-title')
    const textarea = document.querySelector('.json-modal-textarea')
    const execBtn = document.querySelector('.json-modal-execute')
    const formatBtn = document.querySelector('.json-modal-format')
    const errorEl = document.querySelector('.json-modal-error')

    const json = JsonConverter.exportLayers(LayerModel.layers)

    title.textContent = 'JSON Export'
    textarea.value = json
    textarea.placeholder = ''
    textarea.readOnly = true
    execBtn.textContent = 'Copy'
    formatBtn.style.display = 'none'
    errorEl.textContent = ''
    errorEl.className = 'json-modal-error'
    overlay.classList.add('active')

    // コピーボタン
    const newBtn = execBtn.cloneNode(true)
    execBtn.parentNode.replaceChild(newBtn, execBtn)
    newBtn.addEventListener('click', () => this.executeCopy())
  }

  executeCopy() {
    const textarea = document.querySelector('.json-modal-textarea')
    const errorEl = document.querySelector('.json-modal-error')

    navigator.clipboard.writeText(textarea.value).then(() => {
      errorEl.style.color = '#4CAF50'
      errorEl.textContent = 'コピーしました'
      setTimeout(() => {
        errorEl.textContent = ''
        errorEl.style.color = ''
      }, 2000)
    }).catch(() => {
      // fallback
      textarea.readOnly = false
      textarea.select()
      document.execCommand('copy')
      textarea.readOnly = true
      errorEl.style.color = '#4CAF50'
      errorEl.textContent = 'コピーしました'
    })
  }

  // --- MIDI File Import ---
  openMidiImport() {
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

          // トラックをレイヤーとしてインポート
          const layerData = {
            format_version: "3.0",
            layers: tracks.map(track => ({
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
          }

          note_clear()
          LayerModel.fromJSON(layerData)

          // アクティブレイヤーのtextareaを更新（midiモードでは空）
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

  // --- モーダル閉じる ---
  closeModal() {
    this._removeInputListener()
    const overlay = document.querySelector('.json-modal-overlay')
    if (overlay) { overlay.classList.remove('active') }
  }
}
