import { LayerModel } from '../midi/layer-model.js'
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
    LayerModel.onChange(() => this.render())
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

    // レイヤー名（ダブルクリックで編集）
    const name = document.createElement('span')
    name.classList.add('layer-name')
    name.textContent = layer.name
    name.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      const input = document.createElement('input')
      input.type = 'text'
      input.classList.add('layer-name-input')
      input.value = layer.name
      name.replaceWith(input)
      input.focus()
      input.select()

      const commit = () => {
        const val = input.value.trim() || layer.name
        LayerModel.updateLayer(layer.id, { name: val })
      }
      input.addEventListener('blur', commit)
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { input.blur() }
        if (ev.key === 'Escape') { input.value = layer.name; input.blur() }
      })
      input.addEventListener('mousedown', (ev) => ev.stopPropagation())
      input.addEventListener('click', (ev) => ev.stopPropagation())
    })
    name.addEventListener('mousedown', (e) => e.stopPropagation())
    name.addEventListener('click', (e) => e.stopPropagation())
    row.appendChild(name)

    // オシレータタイプ選択
    const oscSelect = document.createElement('select')
    oscSelect.classList.add('layer-oscillator')
    for (const type of ['sine', 'square', 'sawtooth', 'triangle']) {
      const opt = document.createElement('option')
      opt.value = type
      opt.textContent = type
      if (type === layer.oscillatorType) { opt.selected = true }
      oscSelect.appendChild(opt)
    }
    oscSelect.addEventListener('change', (e) => {
      e.stopPropagation()
      LayerModel.updateLayer(layer.id, { oscillatorType: e.target.value })
    })
    oscSelect.addEventListener('mousedown', (e) => e.stopPropagation())
    oscSelect.addEventListener('click', (e) => e.stopPropagation())
    row.appendChild(oscSelect)

    // ミュートボタン
    const muteBtn = document.createElement('button')
    muteBtn.classList.add('layer-mute-btn')
    if (layer.mute) { muteBtn.classList.add('on') }
    muteBtn.textContent = 'M'
    muteBtn.title = 'Mute'
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      LayerModel.updateLayer(layer.id, { mute: !layer.mute })
    })
    row.appendChild(muteBtn)

    // ソロボタン
    const soloBtn = document.createElement('button')
    soloBtn.classList.add('layer-solo-btn')
    if (layer.solo) { soloBtn.classList.add('on') }
    soloBtn.textContent = 'S'
    soloBtn.title = 'Solo'
    soloBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      LayerModel.updateLayer(layer.id, { solo: !layer.solo })
    })
    row.appendChild(soloBtn)

    // 音量スライダー + 数値表示
    const volWrap = document.createElement('div')
    volWrap.classList.add('layer-volume-wrap')

    const volume = document.createElement('input')
    volume.classList.add('layer-volume')
    volume.type = 'range'
    volume.min = '0'
    volume.max = '100'
    volume.value = String(layer.volume)

    const volLabel = document.createElement('span')
    volLabel.classList.add('layer-volume-label')
    volLabel.textContent = layer.volume

    volume.addEventListener('input', (e) => {
      e.stopPropagation()
      // ドラッグ中はDOMを再構築しない（直接プロパティ更新）
      layer.volume = Math.max(0, Math.min(100, Number(e.target.value) || 0))
      volLabel.textContent = layer.volume
    })
    volume.addEventListener('change', (e) => {
      e.stopPropagation()
      // ドラッグ完了時にモデルを正式更新
      LayerModel.updateLayer(layer.id, { volume: Number(e.target.value) })
    })
    volume.addEventListener('mousedown', (e) => e.stopPropagation())
    volume.addEventListener('click', (e) => e.stopPropagation())

    volWrap.appendChild(volume)
    volWrap.appendChild(volLabel)
    row.appendChild(volWrap)

    // 削除ボタン（右端に配置）
    const deleteBtn = document.createElement('span')
    deleteBtn.classList.add('layer-delete-btn')
    deleteBtn.textContent = '✕'
    deleteBtn.title = 'Delete layer'
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if(!confirm(`「${layer.name}」を削除しますか？\nこのレイヤーのデータは全て失われます。`)){
        return
      }
      LayerModel.removeLayer(layer.id)
    })
    row.appendChild(deleteBtn)

    // 行クリックでアクティブ切替
    row.addEventListener('click', () => {
      LayerModel.setActive(layer.id)
    })

    return row
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
}
