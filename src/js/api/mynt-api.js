/**
 * MYNT MIDI API ファサードモジュール
 *
 * 既存コアモジュール（MidiParser, MidiPlayer, JsonConverter）を統合し、
 * window.MyntMidi として外部システムに公開する。
 */

import { MidiParser } from '../midi/parser.js'
import { MidiPlayer } from '../midi/player.js'
import { JsonConverter } from '../midi/json-converter.js'

// --- 内部状態 ---
let _isPlaying = false
let _loopTimerId = null
let _currentHandle = null
let _loopRemaining = null

// --- 有効なオシレータタイプ ---
const VALID_OSCILLATOR_TYPES = ['sine', 'square', 'sawtooth', 'triangle']

// --- エラー生成ヘルパー ---

/**
 * エラーオブジェクトを生成する
 * @param {string} code - エラーコード
 * @param {string} message - エラーメッセージ
 * @returns {{ code: string, message: string }}
 */
function createError(code, message) {
  return { code, message }
}

// --- バリデーションヘルパー ---

/**
 * 再生オプションをバリデーションする
 * @param {object} options - 再生オプション
 * @returns {{ code: string, message: string } | null} エラーがあればエラーオブジェクト、なければ null
 */
function _validateOptions(options) {
  if (!options) return null

  if (options.oscillatorType !== undefined) {
    if (!VALID_OSCILLATOR_TYPES.includes(options.oscillatorType)) {
      return createError(
        'INVALID_OPTION',
        `Invalid oscillatorType: "${options.oscillatorType}". Must be one of: ${VALID_OSCILLATOR_TYPES.join(', ')}`
      )
    }
  }

  if (options.volume !== undefined) {
    if (typeof options.volume !== 'number' || options.volume < 0 || options.volume > 100) {
      return createError(
        'INVALID_OPTION',
        `Invalid volume: ${options.volume}. Must be a number between 0 and 100`
      )
    }
  }

  if (options.offsetSec !== undefined) {
    if (typeof options.offsetSec !== 'number' || Number.isNaN(options.offsetSec) || options.offsetSec < 0) {
      return createError(
        'INVALID_OPTION',
        `Invalid offsetSec: ${options.offsetSec}. Must be a number >= 0`
      )
    }
  }

  if (options.loopCount !== undefined) {
    if (!Number.isInteger(options.loopCount) || options.loopCount <= 0) {
      return createError(
        'INVALID_OPTION',
        `Invalid loopCount: ${options.loopCount}. Must be a positive integer`
      )
    }
  }

  return null
}

/**
 * Layersの再生前に、グローバルoptionsで指定された値をレイヤーへ反映する
 * @param {Array} layers - layer data list
 * @param {object} options - play options
 * @returns {Array}
 */
function _applyLayerPlaybackOptions(layers, options) {
  if (!Array.isArray(layers) || !layers.length) return []
  const opts = options || {}

  return layers.map(layer => {
    const next = { ...layer }
    if (opts.oscillatorType !== undefined) {
      next.oscillatorType = opts.oscillatorType
    }
    if (opts.volume !== undefined) {
      next.volume = opts.volume
    }
    return next
  })
}

// --- ループスケジューリングヘルパー ---

/**
 * ループ再生のスケジューリングを行う
 * 再生終了後に再スケジュールするか、自然終了のクリーンアップを行う。
 *
 * @param {object} handle - PlaybackHandle
 * @param {number} duration - 再生時間（秒）
 * @param {object} opts - 再生オプション（loop, loopCount 等）
 * @param {function} replayFn - 再再生を行う非同期関数。戻り値は { duration }
 */
function _scheduleLoop(handle, duration, opts, replayFn) {
  if (!duration || duration <= 0) return

  if (opts.loop) {
    // ループ再生: duration 経過後に再スケジュール
    _loopTimerId = setTimeout(async () => {
      // stop() で既にキャンセルされていたらスキップ
      if (!_isPlaying || _currentHandle !== handle) return

      // loopCount チェック
      if (_loopRemaining !== null) {
        _loopRemaining--
        if (_loopRemaining <= 0) {
          // ループ回数到達 → 停止
          _isPlaying = false
          _loopRemaining = null
          handle.status = 'stopped'
          handle.looping = false
          _currentHandle = null
          _loopTimerId = null
          return
        }
      }

      // 再再生
      try {
        const result = await replayFn()
        if (result && result.duration > 0) {
          _scheduleLoop(handle, result.duration, opts, replayFn)
        }
      } catch (e) {
        // 再再生失敗時はクリーンアップ
        _isPlaying = false
        handle.status = 'stopped'
        handle.looping = false
        _currentHandle = null
        _loopTimerId = null
      }
    }, duration * 1000)
  } else {
    // 非ループ: 自然終了時のクリーンアップ
    _loopTimerId = setTimeout(() => {
      _isPlaying = false
      handle.status = 'stopped'
      _currentHandle = null
      _loopTimerId = null
    }, duration * 1000)
  }
}

// --- MyntMidi API オブジェクト ---

const MyntMidi = {
  /** バージョン文字列 */
  version: '1.0.0',

  /**
   * MIDI文字列を再生する
   * @param {string} midiString - MIDI文字列
   * @param {object} [options] - 再生オプション
   * @returns {Promise<object>} PlaybackHandle を含む Promise
   */
  async play(midiString, options) {
    // 1. 入力バリデーション
    if (!midiString || typeof midiString !== 'string' || midiString.trim() === '') {
      return Promise.reject(createError('EMPTY_INPUT', 'Input is empty or undefined'))
    }

    // 2. オプションバリデーション
    const optionError = _validateOptions(options)
    if (optionError) {
      return Promise.reject(optionError)
    }

    // 3. AudioContext 利用可能性チェック
    if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) {
      return Promise.reject(createError('AUDIO_NOT_SUPPORTED', 'Web Audio API is not supported in this environment'))
    }

    // 4. 既存再生の停止（排他制御）
    if (_isPlaying) {
      this.stop()
    }

    // 5. パース＆バリデーション
    const datas = MidiParser.get_code(midiString)
    if (!datas || !datas.length) {
      return Promise.reject(createError('INVALID_MIDI_STRING', 'MIDI string could not be parsed or contains no notes'))
    }

    // 6. 再生開始
    const opts = options || {}
    const result = await MidiPlayer.play(midiString, opts)

    // 7. ループ状態の初期化
    if (opts.loop && opts.loopCount !== undefined && opts.loopCount > 0) {
      _loopRemaining = opts.loopCount - 1  // 最初の再生を1回目としてカウント
    } else if (opts.loop) {
      _loopRemaining = null  // 無限ループ
    }

    // 8. PlaybackHandle 生成
    _isPlaying = true
    const handle = {
      status: 'playing',
      looping: !!opts.loop,
      stop: () => {
        this.stop()
      }
    }
    _currentHandle = handle

    // 9. ループスケジューリング or 自然終了クリーンアップ
    const replayFn = async () => {
      MidiPlayer.stop()
      return MidiPlayer.play(midiString, opts)
    }
    _scheduleLoop(handle, result && result.duration, opts, replayFn)

    return handle
  },

  /**
   * JSONデータを再生する
   * @param {object|string} json - JSON_Format / Layers_JSON オブジェクトまたはJSON文字列
   * @param {object} [options] - 再生オプション
   * @returns {Promise<object>} PlaybackHandle を含む Promise
   */
  async playJson(json, options) {
    // 1. JSON文字列の場合はパースする
    let data
    try {
      data = typeof json === 'string' ? JSON.parse(json) : json
    } catch (e) {
      return Promise.reject(createError('INVALID_JSON', 'Failed to parse JSON string: ' + e.message))
    }

    // 2. null/undefined チェック
    if (!data || typeof data !== 'object') {
      return Promise.reject(createError('INVALID_JSON', 'Input is not a valid JSON object'))
    }

    // 3. オプションバリデーション
    const optionError = _validateOptions(options)
    if (optionError) {
      return Promise.reject(optionError)
    }

    // 4. AudioContext 利用可能性チェック
    if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) {
      return Promise.reject(createError('AUDIO_NOT_SUPPORTED', 'Web Audio API is not supported in this environment'))
    }

    // 5. フォーマット判定
    const format = JsonConverter.detectFormat(data)

    if (format === '2.0' || format === '3.0') {
      // Layers_JSON: レイヤー再生
      if (!data.layers || !Array.isArray(data.layers) || data.layers.length === 0) {
        return Promise.reject(createError('INVALID_JSON', 'Layers_JSON must contain a non-empty layers array'))
      }

      // 既存再生の停止（排他制御）
      if (_isPlaying) {
        this.stop()
      }

      const opts = options || {}
      const layerData = JsonConverter.importLayers(data)
      const playbackLayers = _applyLayerPlaybackOptions(layerData.layers, opts)
      const result = await MidiPlayer.playLayers(playbackLayers, { offsetSec: opts.offsetSec || 0 })

      // ループ状態の初期化
      if (opts.loop && opts.loopCount !== undefined && opts.loopCount > 0) {
        _loopRemaining = opts.loopCount - 1
      } else if (opts.loop) {
        _loopRemaining = null
      }

      // PlaybackHandle 生成
      _isPlaying = true
      const handle = {
        status: 'playing',
        looping: !!opts.loop,
        stop: () => {
          this.stop()
        }
      }
      _currentHandle = handle

      // ループスケジューリング or 自然終了クリーンアップ
      const replayFn = async () => {
        MidiPlayer.stop()
        return MidiPlayer.playLayers(playbackLayers, { offsetSec: opts.offsetSec || 0 })
      }
      _scheduleLoop(handle, result && result.duration, opts, replayFn)

      return handle
    } else {
      // JSON_Format: 単一レイヤー再生
      if (!data.notes || !Array.isArray(data.notes) || !data.bpm) {
        return Promise.reject(createError('INVALID_JSON', 'JSON_Format must contain "bpm" and "notes" fields'))
      }

      // MIDI文字列に変換
      const midiString = JsonConverter.toMidiString(data)
      if (!midiString || midiString.trim() === '') {
        return Promise.reject(createError('INVALID_MIDI_STRING', 'Converted MIDI string is empty'))
      }

      // play() に委譲
      return this.play(midiString, options)
    }
  },

  /**
   * 再生中の全音声を停止する
   */
  stop() {
    if (_loopTimerId) {
      clearTimeout(_loopTimerId)
      _loopTimerId = null
    }
    MidiPlayer.stop()
    _isPlaying = false
    _loopRemaining = null
    if (_currentHandle) {
      _currentHandle.status = 'stopped'
      _currentHandle.looping = false
      _currentHandle = null
    }
  },

  /**
   * 再生中かどうかを返す
   * @returns {boolean}
   */
  isPlaying() {
    return _isPlaying
  },

  /**
   * 単音再生を開始する（押下中の試聴などに利用）
   * @param {string} key - 音名 ('c','d-','f+' など)
   * @param {number} octave - オクターブ
   * @param {object} [options] - 再生オプション
   * @returns {Promise<object|null>} stopNote() に渡すハンドル
   */
  async startNote(key, octave, options) {
    const optionError = _validateOptions(options)
    if (optionError) {
      return Promise.reject(optionError)
    }

    if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) {
      return Promise.reject(createError('AUDIO_NOT_SUPPORTED', 'Web Audio API is not supported in this environment'))
    }

    return MidiPlayer.startNote(key, octave, options || {})
  },

  /**
   * startNote() で開始した単音を停止する
   * @param {object} handle - startNote() の戻り値
   */
  stopNote(handle) {
    MidiPlayer.stopNote(handle)
  },

  /**
   * JSON → MIDI文字列に変換する
   * @param {object|string} json - JSON_Format オブジェクトまたはJSON文字列
   * @returns {string} MIDI文字列
   */
  jsonToMidi(json) {
    return JsonConverter.toMidiString(json)
  },

  /**
   * MIDI文字列 → JSON文字列に変換する
   * @param {string} midiString - MIDI文字列
   * @returns {string} JSON文字列
   */
  midiToJson(midiString) {
    return JsonConverter.toJson(midiString)
  },

  /**
   * MIDI文字列のバリデーション
   * @param {string} midiString - MIDI文字列
   * @returns {{ valid: boolean, noteCount?: number, error?: string }}
   */
  validate(midiString) {
    try {
      if (!midiString || typeof midiString !== 'string' || midiString.trim() === '') {
        return { valid: false, error: 'Input is empty or not a string' }
      }
      const datas = MidiParser.get_code(midiString)
      if (!datas || !datas.length) {
        return { valid: false, error: 'MIDI string could not be parsed or contains no notes' }
      }
      return { valid: true, noteCount: datas.length }
    } catch (e) {
      return { valid: false, error: e.message }
    }
  },
}

// --- グローバル公開 ---
window.MyntMidi = MyntMidi

export { MyntMidi, createError, _validateOptions }
