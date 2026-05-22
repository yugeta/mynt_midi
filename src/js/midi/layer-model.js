/**
 * レイヤーデータモデル
 *
 * 複数レイヤーのメタデータを一元管理する。
 * モジュールスコープ変数 + static メソッドによるシングルトンパターン。
 *
 * イベント管理:
 *   - init()  : アプリ起動時に1回だけ呼ぶ（コールバック初期化含む）
 *   - reset() : ユーザー操作でデータをリセット（コールバックは維持）
 *   - onChange() / offChange() : リスナーの登録・解除
 *
 * ハイブリッドモード:
 *   - mode: "string" — 軽量モード（MIDI文字列テキスト）
 *   - mode: "midi"   — MIDIモード（noteEventsリスト、精度劣化なし）
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
const VALID_MODES = ["string", "midi"]

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

  // --- 初期化（アプリ起動時に1回だけ呼ぶ） ---

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
    // init時は通知しない（まだリスナーが登録されていないため）
  }

  // --- リセット（ユーザー操作用、コールバックは維持） ---

  static reset(midiString, oscillatorType) {
    _layers = []
    _nextId = 0

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

  /**
   * 複数レイヤーを既存データに追加する（インポート用）
   * @param {Array} newLayers - 追加するレイヤーデータの配列
   */
  static addLayers(newLayers) {
    if (!Array.isArray(newLayers) || newLayers.length === 0) { return }

    for (const l of newLayers) {
      const layer = {
        id: `layer_${_nextId++}`,
        name: l.name || "Layer",
        mode: VALID_MODES.includes(l.mode) ? l.mode : "string",
        oscillatorType: VALID_OSCILLATOR_TYPES.includes(l.oscillatorType)
          ? l.oscillatorType : "square",
        color: l.color || LAYER_COLORS[(_nextId - 1) % LAYER_COLORS.length],
        midiString: l.midiString || "",
        noteEvents: Array.isArray(l.noteEvents) ? l.noteEvents : null,
        notesData: null,
        offset: Number(l.offset) || 0,
        loop: !!l.loop,
        fadeIn: Number(l.fadeIn) || 0,
        fadeOut: Number(l.fadeOut) || 0,
        volume: Math.max(0, Math.min(100, Number(l.volume) || 50)),
        mute: !!l.mute,
        solo: !!l.solo,
        visible: l.visible !== false,
      }
      _layers.push(layer)
    }

    LayerModel._notify()
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

  /**
   * 変更リスナーを登録する
   * @param {Function} callback
   */
  static onChange(callback) {
    if (typeof callback !== "function") { return }
    // 重複登録を防止
    if (_callbacks.includes(callback)) { return }
    _callbacks.push(callback)
  }

  /**
   * 変更リスナーを解除する
   * @param {Function} callback
   */
  static offChange(callback) {
    const idx = _callbacks.indexOf(callback)
    if (idx !== -1) {
      _callbacks.splice(idx, 1)
    }
  }

  // --- シリアライズ ---

  static toJSON() {
    return {
      format_version: "3.0",
      layers: _layers.map(l => ({ ...l }))
    }
  }

  static fromJSON(data) {
    if (!data || !Array.isArray(data.layers) || data.layers.length === 0) {
      return
    }
    _layers = data.layers.map((l, index) => ({
      id: l.id || `layer_${_nextId++}`,
      name: l.name || "Layer",
      mode: VALID_MODES.includes(l.mode) ? l.mode : "string",
      oscillatorType: VALID_OSCILLATOR_TYPES.includes(l.oscillatorType)
        ? l.oscillatorType : "square",
      color: l.color || LAYER_COLORS[index % LAYER_COLORS.length],
      midiString: l.midiString || "",
      noteEvents: Array.isArray(l.noteEvents) ? l.noteEvents : null,
      notesData: l.notesData || null,
      offset: Number(l.offset) || 0,
      loop: !!l.loop,
      fadeIn: Number(l.fadeIn) || 0,
      fadeOut: Number(l.fadeOut) || 0,
      volume: Math.max(0, Math.min(100, Number(l.volume) || 50)),
      mute: !!l.mute,
      solo: !!l.solo,
      visible: l.visible !== false,
    }))

    // _nextId を復元データの最大値+1に設定（ID衝突を防ぐ）
    for (const layer of _layers) {
      const match = layer.id && layer.id.match(/layer_(\d+)/)
      if (match) {
        const num = parseInt(match[1]) + 1
        if (num > _nextId) { _nextId = num }
      }
    }

    _activeLayerId = _layers[0].id
    LayerModel._notify()
  }

  // --- 内部ヘルパー ---

  static _createLayer(midiString, oscillatorType) {
    const id = `layer_${_nextId++}`
    const colorIndex = (_nextId - 1) % LAYER_COLORS.length
    return {
      id,
      name: `Note ${_nextId}`,
      mode: "string",
      oscillatorType: oscillatorType || "square",
      color: LAYER_COLORS[colorIndex],
      midiString: midiString || "",
      noteEvents: null,
      notesData: null,
      offset: 0,
      loop: false,
      fadeIn: 0,
      fadeOut: 0,
      volume: 50,
      mute: false,
      solo: false,
      visible: true,
    }
  }

  static _notify() {
    for (const cb of _callbacks) {
      cb()
    }
    LayerModel._saveToStorage()
  }

  // --- localStorage 永続化 ---

  static _STORAGE_KEY = 'mynt_layers'

  static _saveToStorage() {
    try {
      const json = JSON.stringify(LayerModel.toJSON())
      localStorage.setItem(LayerModel._STORAGE_KEY, json)
    } catch(e) { /* quota exceeded etc. */ }
  }

  static loadFromStorage() {
    try {
      const raw = localStorage.getItem(LayerModel._STORAGE_KEY)
      if (!raw) { return false }
      const data = JSON.parse(raw)
      if (!data || !Array.isArray(data.layers) || data.layers.length === 0) { return false }
      LayerModel.fromJSON(data)
      return true
    } catch(e) {
      return false
    }
  }
}
