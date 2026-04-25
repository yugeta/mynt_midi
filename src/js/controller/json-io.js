/**
 * JSON Import/Export コントローラー
 *
 * - Import: モーダルにJSON貼り付け → MIDI文字列に変換 → textareaに反映
 * - Export: 現在のMIDI文字列 → JSON変換 → モーダルに表示
 */

import { JsonConverter } from '../midi/json-converter.js'
import { Element }       from '../ui/element.js'
import { MidiModel }     from '../midi/model.js'
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

  // --- Import ---
  openImport() {
    const overlay = document.querySelector('.json-modal-overlay')
    const title = document.querySelector('.json-modal-title')
    const textarea = document.querySelector('.json-modal-textarea')
    const execBtn = document.querySelector('.json-modal-execute')
    const errorEl = document.querySelector('.json-modal-error')

    title.textContent = 'JSON Import'
    textarea.value = ''
    textarea.placeholder = '{\n  "bpm": 120,\n  "notes": [\n    { "pitch": "C4", "duration": "4n" }\n  ]\n}'
    textarea.readOnly = false
    execBtn.textContent = 'Import'
    errorEl.textContent = ''
    overlay.classList.add('active')

    // 実行ボタンのイベントを差し替え
    const newBtn = execBtn.cloneNode(true)
    execBtn.parentNode.replaceChild(newBtn, execBtn)
    newBtn.addEventListener('click', () => this.executeImport())
  }

  executeImport() {
    const textarea = document.querySelector('.json-modal-textarea')
    const errorEl = document.querySelector('.json-modal-error')
    const jsonStr = textarea.value.trim()

    if (!jsonStr) {
      errorEl.textContent = 'JSONを入力してください'
      return
    }

    try {
      // JSON バリデーション
      const parsed = JSON.parse(jsonStr)
      if (!parsed.notes || !Array.isArray(parsed.notes)) {
        errorEl.textContent = '"notes" 配列が必要です'
        return
      }

      // MIDI文字列に変換
      const midiStr = JsonConverter.toMidiString(parsed)

      // textareaに反映 → 既存フローに合流
      Element.elm_midi_string.value = midiStr
      note_clear()
      MidiModel.fromString(midiStr)
      StringInput.renderFromModel()
      scroll_middle()

      this.closeModal()
    }
    catch (e) {
      errorEl.textContent = `エラー: ${e.message}`
    }
  }

  // --- Export ---
  openExport() {
    const overlay = document.querySelector('.json-modal-overlay')
    const title = document.querySelector('.json-modal-title')
    const textarea = document.querySelector('.json-modal-textarea')
    const execBtn = document.querySelector('.json-modal-execute')
    const errorEl = document.querySelector('.json-modal-error')

    const midiStr = Element.elm_midi_string.value
    const json = JsonConverter.toJson(midiStr)

    title.textContent = 'JSON Export'
    textarea.value = json
    textarea.placeholder = ''
    textarea.readOnly = true
    execBtn.textContent = 'Copy'
    errorEl.textContent = ''
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

  // --- モーダル閉じる ---
  closeModal() {
    const overlay = document.querySelector('.json-modal-overlay')
    if (overlay) { overlay.classList.remove('active') }
  }
}
