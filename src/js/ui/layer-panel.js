import { LayerModel }  from '../midi/layer-model.js'
import { MidiParser } from '../midi/parser.js'
import { MidiModel }  from '../midi/model.js'
import { UndoManager } from '../controller/undo-manager.js'
import { Element }    from './element.js'

/**
 * レイヤーパネルUI
 *
 * ヘッダーと midi-string-area の間に配置される。
 * LayerModel の状態を反映し、ユーザー操作を LayerModel に伝達する。
 */

export class LayerPanel {
  constructor() {
    this._panel = null
    this._rowsContainer = null
  }

  async init() {
    this._buildPanel()
    this._insertPanel()
    this.render()
    this._onChangeHandler = () => this.render()
    LayerModel.onChange(this._onChangeHandler)
  }

  // --- DOM生成 ---

  _buildPanel() {
    this._panel = document.createElement('div')
    this._panel.classList.add('layer-panel')

    // ヘッダー行
    const header = document.createElement('div')
    header.classList.add('layer-panel-header')

    const title = document.createElement('span')
    title.classList.add('layer-panel-title')
    title.textContent = 'Layers'

    const addBtn = document.createElement('button')
    addBtn.classList.add('layer-add-btn')
    addBtn.textContent = '+ Add Layer'
    addBtn.addEventListener('click', () => {
      const layer = LayerModel.addLayer()
      LayerModel.setActive(layer.id)
    })

    const saveBtn = document.createElement('button')
    saveBtn.classList.add('layer-add-btn')
    saveBtn.textContent = '💾 Save Layers'
    saveBtn.addEventListener('click', () => this._openSaveModal())

    const loadBtn = document.createElement('button')
    loadBtn.classList.add('layer-add-btn')
    loadBtn.textContent = '📂 Load Layers'
    loadBtn.addEventListener('click', () => this._openLoadModal())

    header.appendChild(title)
    header.appendChild(addBtn)
    header.appendChild(saveBtn)
    header.appendChild(loadBtn)
    this._panel.appendChild(header)

    // レイヤー行コンテナ
    this._rowsContainer = document.createElement('div')
    this._rowsContainer.classList.add('layer-rows')
    this._panel.appendChild(this._rowsContainer)
  }

  _insertPanel() {
    // workspace-area の先頭に挿入（midi-string-area の左隣）
    const workspace = document.querySelector('.workspace-area')
    if (workspace) {
      workspace.insertBefore(this._panel, workspace.firstChild)
    }
  }

  // --- 描画 ---

  render() {
    if (!this._rowsContainer) { return }
    this._rowsContainer.innerHTML = ''

    const layers = LayerModel.layers
    const activeId = LayerModel.activeLayerId

    for (const layer of layers) {
      const row = this._renderRow(layer, layer.id === activeId)
      this._rowsContainer.appendChild(row)
    }
  }

  _renderRow(layer, isActive) {
    const row = document.createElement('div')
    row.classList.add('layer-row')
    if (isActive) { row.classList.add('active') }
    row.setAttribute('data-layer-id', layer.id)

    // 選択ボタン
    const selectBtn = document.createElement('button')
    selectBtn.classList.add('layer-select-btn')
    selectBtn.textContent = '▶'
    selectBtn.title = 'このレイヤーを選択'
    if (isActive) { selectBtn.classList.add('active') }
    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (LayerModel.activeLayerId !== layer.id) {
        LayerModel.setActive(layer.id)
      }
    })
    selectBtn.addEventListener('mousedown', (e) => e.stopPropagation())
    row.appendChild(selectBtn)

    // カラーインジケーター（クリックで表示/非表示トグル）
    const color = document.createElement('div')
    color.classList.add('layer-color')
    color.style.backgroundColor = layer.visible ? layer.color : 'transparent'
    color.style.borderColor = layer.color
    if (!layer.visible) { color.classList.add('hidden-layer') }
    color.title = layer.visible ? 'Hide layer' : 'Show layer'
    color.addEventListener('click', (e) => {
      e.stopPropagation()
      LayerModel.updateLayer(layer.id, { visible: !layer.visible })
    })
    color.addEventListener('mousedown', (e) => e.stopPropagation())
    row.appendChild(color)

    // モードバッジ
    const modeBadge = document.createElement('span')
    modeBadge.classList.add('layer-mode-badge')
    modeBadge.textContent = layer.mode === 'midi' ? '♪ MIDI' : '✎ String'
    modeBadge.title = layer.mode === 'midi' ? 'MIDI mode' : 'String mode'
    row.appendChild(modeBadge)

    // レイヤー名
    const name = document.createElement('span')
    name.classList.add('layer-name')
    name.textContent = layer.name
    row.appendChild(name)

    // ミュートボタン
    const muteBtn = document.createElement('button')
    muteBtn.classList.add('layer-mute-btn')
    if (layer.mute) { muteBtn.classList.add('on') }
    muteBtn.textContent = 'Mute'
    muteBtn.title = 'Mute'
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      LayerModel.updateLayer(layer.id, { mute: !layer.mute })
    })
    muteBtn.addEventListener('mousedown', (e) => e.stopPropagation())
    row.appendChild(muteBtn)

    // ソロボタン
    const soloBtn = document.createElement('button')
    soloBtn.classList.add('layer-solo-btn')
    if (layer.solo) { soloBtn.classList.add('on') }
    soloBtn.textContent = 'Solo'
    soloBtn.title = 'Solo'
    soloBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      LayerModel.updateLayer(layer.id, { solo: !layer.solo })
    })
    soloBtn.addEventListener('mousedown', (e) => e.stopPropagation())
    row.appendChild(soloBtn)

    // 設定ボタン（詳細モーダルを開く）
    const settingsBtn = document.createElement('button')
    settingsBtn.classList.add('layer-settings-btn')
    settingsBtn.textContent = '詳細'
    settingsBtn.title = '詳細設定'
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this._openDetailModal(layer.id)
    })
    settingsBtn.addEventListener('mousedown', (e) => e.stopPropagation())
    row.appendChild(settingsBtn)

    return row
  }

  // --- レイヤー詳細モーダル ---

  _openDetailModal(layerId) {
    const layer = LayerModel.layers.find(l => l.id === layerId)
    if (!layer) { return }

    // 既存モーダルがあれば削除
    const existing = document.querySelector('.layer-detail-overlay')
    if (existing) { existing.remove() }

    const overlay = document.createElement('div')
    overlay.className = 'layer-detail-overlay'
    overlay.innerHTML = `
      <div class="layer-detail-modal">
        <div class="layer-detail-title">レイヤー設定: <span class="layer-detail-name">${layer.name}</span></div>
        <div class="layer-detail-body">
          <div class="layer-detail-section">
            <label>レイヤー名</label>
            <input type="text" class="ld-name" value="${layer.name}" />
          </div>
          <div class="layer-detail-section">
            <label>オシレータ</label>
            <select class="ld-oscillator">
              <option value="sine" ${layer.oscillatorType === 'sine' ? 'selected' : ''}>sine</option>
              <option value="square" ${layer.oscillatorType === 'square' ? 'selected' : ''}>square</option>
              <option value="sawtooth" ${layer.oscillatorType === 'sawtooth' ? 'selected' : ''}>sawtooth</option>
              <option value="triangle" ${layer.oscillatorType === 'triangle' ? 'selected' : ''}>triangle</option>
            </select>
          </div>
          <div class="layer-detail-section">
            <label>音量</label>
            <input type="range" class="ld-volume" min="0" max="100" value="${layer.volume}" />
            <span class="ld-volume-val">${layer.volume}</span>
          </div>
          <div class="layer-detail-section">
            <label>Fade In（秒）</label>
            <input type="number" class="ld-fadein" min="0" max="60" step="0.5" value="${layer.fadeIn || 0}" />
          </div>
          <div class="layer-detail-section">
            <label>Fade Out（秒）</label>
            <input type="number" class="ld-fadeout" min="0" max="60" step="0.5" value="${layer.fadeOut || 0}" />
          </div>
          <div class="layer-detail-section">
            <label>トランスポーズ</label>
            <div class="ld-transpose-btns">
              <button data-semi="-12">-8ve</button>
              <button data-semi="-1">-1</button>
              <button data-semi="1">+1</button>
              <button data-semi="12">+8ve</button>
            </div>
          </div>
          <div class="layer-detail-section">
            <label>オフセット（秒）</label>
            <input type="number" class="ld-offset" min="0" step="0.1" value="${layer.offset || 0}" />
          </div>
          <div class="layer-detail-section">
            <label>ループ</label>
            <input type="checkbox" class="ld-loop" ${layer.loop ? 'checked' : ''} />
          </div>
        </div>
        <div class="layer-detail-actions">
          <button class="layer-detail-delete">削除</button>
          <span class="layer-detail-spacer"></span>
          <button class="layer-detail-ok">OK</button>
          <button class="layer-detail-cancel">キャンセル</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    // 音量スライダーのリアルタイム表示
    const volSlider = overlay.querySelector('.ld-volume')
    const volVal = overlay.querySelector('.ld-volume-val')
    volSlider.addEventListener('input', () => { volVal.textContent = volSlider.value })

    // トランスポーズボタン
    overlay.querySelectorAll('.ld-transpose-btns button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const semi = Number(btn.dataset.semi)
        this._transposeLayer(layerId, semi)
        // モーダル内の名前表示を更新
        const nameEl = overlay.querySelector('.layer-detail-name')
        const updatedLayer = LayerModel.layers.find(l => l.id === layerId)
        if (nameEl && updatedLayer) { nameEl.textContent = updatedLayer.name }
      })
    })

    // 削除
    overlay.querySelector('.layer-detail-delete').addEventListener('click', () => {
      if(!confirm(`「${layer.name}」を削除しますか？`)){
        return
      }
      overlay.remove()
      LayerModel.removeLayer(layerId)
    })

    // OK
    overlay.querySelector('.layer-detail-ok').addEventListener('click', () => {
      const props = {
        name: overlay.querySelector('.ld-name').value.trim() || layer.name,
        oscillatorType: overlay.querySelector('.ld-oscillator').value,
        volume: Number(overlay.querySelector('.ld-volume').value),
        fadeIn: Number(overlay.querySelector('.ld-fadein').value) || 0,
        fadeOut: Number(overlay.querySelector('.ld-fadeout').value) || 0,
        offset: Number(overlay.querySelector('.ld-offset').value) || 0,
        loop: overlay.querySelector('.ld-loop').checked,
      }
      LayerModel.updateLayer(layerId, props)
      overlay.remove()
    })

    // キャンセル
    overlay.querySelector('.layer-detail-cancel').addEventListener('click', () => {
      overlay.remove()
    })

    // オーバーレイクリックで閉じる
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.remove() }
    })
  }

  // --- Save/Load モーダル ---

  _openSaveModal() {
    const overlay = document.querySelector('.json-modal-overlay')
    const title = document.querySelector('.json-modal-title')
    const textarea = document.querySelector('.json-modal-textarea')
    const execBtn = document.querySelector('.json-modal-execute')
    const formatBtn = document.querySelector('.json-modal-format')
    const errorEl = document.querySelector('.json-modal-error')

    const json = JSON.stringify(LayerModel.toJSON(), null, 2)

    title.textContent = 'Save Layers'
    textarea.value = json
    textarea.placeholder = ''
    textarea.readOnly = true
    execBtn.textContent = 'Copy'
    if (formatBtn) { formatBtn.style.display = 'none' }
    errorEl.textContent = ''
    errorEl.className = 'json-modal-error'
    overlay.classList.add('active')

    const newBtn = execBtn.cloneNode(true)
    execBtn.parentNode.replaceChild(newBtn, execBtn)
    newBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        errorEl.style.color = '#4CAF50'
        errorEl.textContent = 'コピーしました'
        setTimeout(() => { errorEl.textContent = ''; errorEl.style.color = '' }, 2000)
      }).catch(() => {
        textarea.readOnly = false
        textarea.select()
        document.execCommand('copy')
        textarea.readOnly = true
        errorEl.style.color = '#4CAF50'
        errorEl.textContent = 'コピーしました'
      })
    })

    // File Saveボタンを追加
    const existingFileBtn = newBtn.parentNode.querySelector('.json-modal-file-save')
    if (existingFileBtn) { existingFileBtn.remove() }
    const fileBtn = document.createElement('button')
    fileBtn.className = 'json-modal-btn json-modal-file-save'
    fileBtn.textContent = '💾 File Save'
    newBtn.parentNode.insertBefore(fileBtn, newBtn.nextSibling)
    fileBtn.addEventListener('click', () => {
      const blob = new Blob([textarea.value], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mynt-layers.json'
      a.click()
      URL.revokeObjectURL(url)
      errorEl.style.color = '#4CAF50'
      errorEl.textContent = 'ファイルを保存しました'
      setTimeout(() => { errorEl.textContent = ''; errorEl.style.color = '' }, 2000)
    })
  }

  _openLoadModal() {
    const overlay = document.querySelector('.json-modal-overlay')
    const title = document.querySelector('.json-modal-title')
    const textarea = document.querySelector('.json-modal-textarea')
    const execBtn = document.querySelector('.json-modal-execute')
    const formatBtn = document.querySelector('.json-modal-format')
    const errorEl = document.querySelector('.json-modal-error')

    title.textContent = 'Load Layers'
    textarea.value = ''
    textarea.placeholder = '{\n  "format_version": "2.0",\n  "layers": [ ... ]\n}'
    textarea.readOnly = false
    execBtn.textContent = 'Load'
    if (formatBtn) { formatBtn.style.display = '' }
    errorEl.textContent = ''
    errorEl.className = 'json-modal-error'
    overlay.classList.add('active')

    const newBtn = execBtn.cloneNode(true)
    execBtn.parentNode.replaceChild(newBtn, execBtn)
    newBtn.addEventListener('click', () => this._executeLoad(textarea, errorEl, overlay))

    // File Loadボタンを追加
    const existingFileBtn = newBtn.parentNode.querySelector('.json-modal-file-load')
    if (existingFileBtn) { existingFileBtn.remove() }
    const fileBtn = document.createElement('button')
    fileBtn.className = 'json-modal-btn json-modal-file-load'
    fileBtn.textContent = '📂 File Load'
    newBtn.parentNode.insertBefore(fileBtn, newBtn.nextSibling)
    fileBtn.addEventListener('click', () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.addEventListener('change', () => {
        const file = input.files[0]
        if (!file) { return }
        const reader = new FileReader()
        reader.onload = () => {
          textarea.value = reader.result
          // 読み込んだ内容で即ロード実行
          this._executeLoad(textarea, errorEl, overlay)
        }
        reader.readAsText(file)
      })
      input.click()
    })
  }

  _executeLoad(textarea, errorEl, overlay) {
    const val = textarea.value.trim()
    if (!val) {
      errorEl.textContent = 'JSONを入力してください'
      errorEl.className = 'json-modal-error'
      return
    }
    try {
      const data = JSON.parse(val)
      if (!data.layers || !Array.isArray(data.layers) || data.layers.length === 0) {
        errorEl.textContent = '"layers" 配列が必要です（1つ以上のレイヤー）'
        errorEl.className = 'json-modal-error'
        return
      }
      LayerModel.fromJSON(data)
      const active = LayerModel.activeLayer
      if (active && Element.elm_midi_string) {
        Element.elm_midi_string.value = active.midiString
      }
      overlay.classList.remove('active')
    } catch (e) {
      errorEl.textContent = `エラー: ${e.message}`
      errorEl.className = 'json-modal-error'
    }
  }

  // --- トランスポーズ ---

  _transposeLayer(layerId, semitones) {
    const layer = LayerModel.layers.find(l => l.id === layerId)
    if (!layer) { return }

    if (layer.mode === 'midi' && Array.isArray(layer.noteEvents) && layer.noteEvents.length) {
      // MIDIモード: noteEventsのmidi番号を直接変更
      for (const event of layer.noteEvents) {
        event.midi = Math.max(0, Math.min(127, event.midi + semitones))
      }
    } else if (layer.midiString) {
      // Stringモード: MIDI文字列をトランスポーズ
      const transposed = MidiParser.transpose(layer.midiString, semitones)
      layer.midiString = transposed

      // アクティブレイヤーならtextareaとモデルも更新
      if (layerId === LayerModel.activeLayerId) {
        if (Element.elm_midi_string) {
          Element.elm_midi_string.value = transposed
        }
        MidiModel.fromString(transposed)
      } else if (layer.notesData) {
        layer.notesData = null
      }
    } else {
      return
    }

    LayerModel._notify()
    LayerModel._saveToStorage()
    UndoManager.push()
  }
}
