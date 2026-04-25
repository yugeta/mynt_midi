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

    header.appendChild(title)
    header.appendChild(addBtn)
    this._panel.appendChild(header)

    // レイヤー行コンテナ
    this._rowsContainer = document.createElement('div')
    this._rowsContainer.classList.add('layer-rows')
    this._panel.appendChild(this._rowsContainer)
  }

  _insertPanel() {
    // ヘッダーと midi-string-area の間に挿入
    const midiStringArea = document.querySelector('.midi-string-area')
    if (midiStringArea && midiStringArea.parentNode) {
      midiStringArea.parentNode.insertBefore(this._panel, midiStringArea)
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

    // カラーインジケーター
    const color = document.createElement('div')
    color.classList.add('layer-color')
    color.style.backgroundColor = layer.color
    row.appendChild(color)

    // レイヤー名
    const name = document.createElement('span')
    name.classList.add('layer-name')
    name.textContent = layer.name
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

    // 音量スライダー
    const volume = document.createElement('input')
    volume.classList.add('layer-volume')
    volume.type = 'range'
    volume.min = '0'
    volume.max = '100'
    volume.value = String(layer.volume)
    volume.addEventListener('input', (e) => {
      e.stopPropagation()
      LayerModel.updateLayer(layer.id, { volume: Number(e.target.value) })
    })
    row.appendChild(volume)

    // 削除ボタン
    const deleteBtn = document.createElement('span')
    deleteBtn.classList.add('layer-delete-btn')
    deleteBtn.textContent = '✕'
    deleteBtn.title = 'Delete layer'
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      LayerModel.removeLayer(layer.id)
    })
    row.appendChild(deleteBtn)

    // 行クリックでアクティブ切替
    row.addEventListener('click', () => {
      LayerModel.setActive(layer.id)
    })

    return row
  }
}
