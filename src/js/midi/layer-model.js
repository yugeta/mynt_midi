/**
 * レイヤーデータモデル
 *
 * 複数レイヤーのメタデータを一元管理する。
 * 既存の MidiModel と同じパターン（モジュールスコープ変数 + static メソッド）で実装。
 *
 * データフロー:
 *   LayerPanel UI → LayerModel → textarea / MidiModel / MidiPlayer
 */

const LAYER_COLORS = [
  "#4A90D9",  // 青
  "#E85D75",  // 赤
  "#50C878",  // 緑
  "#F5A623",  // オレンジ
  "#9B59B6",  // 紫
  "#1ABC9C",  // ティール
  "#E67E22",  // ダークオレンジ
  "#3498DB",  // ライトブルー
]

const VALID_OSCILLATOR_TYPES = ["sine", "square", "sawtooth", "triangle"]

let _layers = []
let _activeLayerId = null
let _nextId = 0
let _callbacks = []

export class LayerModel {

  // --- 読み取り ---

  static get layers() {
    return _layers
  }

  static get activeLayer() {
    return _layers.find(l => l.id === _activeLayerId) || _layers[0] || null
  }

  static get activeLayerId() {
    return _activeLayerId
  }

  // --- 初期化 ---

  static init(midiString, oscillatorType) {
    _layers = []
    _nextId = 0
    _callbacks = []

    const osc = VALID_OSCILLATOR_TYPES.includes(oscillatorType)
      ? oscillatorType
      : "square"

    const layer = LayerModel._createLayer(midiString || "", osc)
    _layers.push(layer)
    _activeLayerId = layer.id
    LayerModel._notify()
  }

  // --- CRUD ---

  static addLayer() {
    const layer = LayerModel._createLayer("", "square")
    _layers.push(layer)
    LayerModel._notify()
    return layer
  }

  static removeLayer(id) {
    if (_layers.length <= 1) {
      return false
    }
    const idx = _layers.findIndex(l => l.id === id)
    if (idx === -1) {
      return false
    }
    _layers.splice(idx, 1)

    // アクティブレイヤーが削除された場合、先頭に切り替え
    if (_activeLayerId === id) {
      _activeLayerId = _layers[0].id
    }
    LayerModel._notify()
    return true
  }

  static setActive(id) {
    const layer = _layers.find(l => l.id === id)
    if (!layer) { return }
    _activeLayerId = id
    LayerModel._notify()
  }

  static updateLayer(id, props) {
    const layer = _layers.find(l => l.id === id)
    if (!layer) { return }

    for (const [key, value] of Object.entries(props)) {
      if (key === "id") { continue } // id は変更不可
      if (key === "volume") {
        layer.volume = Math.max(0, Math.min(100, Number(value) || 0))
      } else if (key === "oscillatorType") {
        layer.oscillatorType = VALID_OSCILLATOR_TYPES.includes(value)
          ? value
          : "square"
      } else if (key in layer) {
        layer[key] = value
      }
    }
    LayerModel._notify()
  }

  // --- イベント通知 ---

  static onChange(callback) {
    if (typeof callback === "function") {
      _callbacks.push(callback)
    }
  }

  // --- シリアライズ ---

  static toJSON() {
    return {
      format_version: "2.0",
      layers: _layers.map(l => ({ ...l }))
    }
  }

  static fromJSON(data) {
    if (!data || !Array.isArray(data.layers) || data.layers.length === 0) {
      return
    }
    _layers = data.layers.map(l => ({
      id: l.id || `layer_${_nextId++}`,
      name: l.name || "Layer",
      oscillatorType: VALID_OSCILLATOR_TYPES.includes(l.oscillatorType)
        ? l.oscillatorType : "square",
      color: l.color || LAYER_COLORS[0],
      midiString: l.midiString || "",
      volume: Math.max(0, Math.min(100, Number(l.volume) || 50)),
      mute: !!l.mute,
      solo: !!l.solo,
    }))
    _activeLayerId = _layers[0].id
    LayerModel._notify()
  }

  // --- 内部ヘルパー ---

  static _createLayer(midiString, oscillatorType) {
    const id = `layer_${_nextId++}`
    const colorIndex = (_nextId - 1) % LAYER_COLORS.length
    return {
      id,
      name: `Layer ${_nextId}`,
      oscillatorType: oscillatorType || "square",
      color: LAYER_COLORS[colorIndex],
      midiString: midiString || "",
      volume: 50,
      mute: false,
      solo: false,
    }
  }

  static _notify() {
    for (const cb of _callbacks) {
      cb()
    }
  }
}
