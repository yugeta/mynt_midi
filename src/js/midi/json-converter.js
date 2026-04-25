/**
 * JSON ↔ MIDI文字列 変換モジュール
 *
 * AI作曲連携用。AIが出力しやすいJSON形式と
 * MYNT MIDI独自のテキスト記法を相互変換する。
 */

import { MidiParser } from './parser.js'

export class JsonConverter {

  // =========================================
  //  JSON → MIDI文字列
  // =========================================

  static toMidiString(jsonStr) {
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    const bpm = data.bpm || 120
    const notes = data.notes
    if (!notes || !notes.length) { return '' }

    let result = ''
    let lastOctave = null
    let lastTempo = null
    let lastVolume = null

    for (const note of notes) {
      // テンポ(T値)
      const tVal = JsonConverter.durationToTempo(note.duration, bpm)
      if (tVal !== lastTempo) {
        result += `T${tVal}`
        lastTempo = tVal
      }

      // 音量
      const vol = JsonConverter.velocityToVolume(note.velocity)
      if (vol !== lastVolume && vol !== 50) {
        result += `V${vol}`
        lastVolume = vol
      }

      // 休符
      if (note.pitch === 'rest') { result += 'S'; continue }
      // フェードアウト
      if (note.pitch === 'fade') { result += '~'; continue }

      // 和音
      if (Array.isArray(note.pitch)) {
        result += '['
        for (const p of note.pitch) {
          const { name, octave } = JsonConverter.parsePitch(p)
          result += `O${octave}${name}`
        }
        result += ']'
        lastOctave = null
        continue
      }

      // 単音
      const { name, octave } = JsonConverter.parsePitch(note.pitch)
      if (octave !== lastOctave) {
        result += `O${octave}`
        lastOctave = octave
      }
      result += name
    }

    return result
  }

  // =========================================
  //  MIDI文字列 → JSON
  // =========================================

  static toJson(midiStr) {
    if (!midiStr) { return JSON.stringify({ bpm: 120, notes: [] }, null, 2) }

    const datas = MidiParser.get_code(midiStr)
    if (!datas || !datas.length) { return JSON.stringify({ bpm: 120, notes: [] }, null, 2) }

    // 最初のテンポからBPMを推定（4分音符基準）
    const firstTempo = datas[0].tempo
    const bpm = Math.round(60 / firstTempo)

    const notes = []
    for (const data of datas) {
      const tVal = Math.round(60 / data.tempo)
      const duration = JsonConverter.tempoToDuration(tVal, bpm)
      const velocity = JsonConverter.volumeToVelocity(data.volume)

      if (data.S === 'S') {
        notes.push({ pitch: 'rest', duration })
      }
      else if (data.S === '~') {
        notes.push({ pitch: 'fade', duration })
      }
      else if (data.S && data.S.match && data.S.match(/\[(.+)\]/)) {
        // 和音
        const reg = /\[(.+?)\]/i
        const res = reg.exec(data.S)
        if (res) {
          const chordDatas = MidiParser.get_code(res[1])
          if (chordDatas) {
            const pitches = chordDatas.map(cn => {
              const octave = cn.O || 5
              const key = JsonConverter.myntKeyToStandard(cn.S || 'C')
              return `${key}${octave}`
            })
            const entry = { pitch: pitches, duration }
            if (velocity !== 64) { entry.velocity = velocity }
            notes.push(entry)
          }
        }
      }
      else if (data.O !== undefined && data.S) {
        const key = JsonConverter.myntKeyToStandard(data.S)
        const entry = { pitch: `${key}${data.O}`, duration }
        if (velocity !== 64) { entry.velocity = velocity }
        notes.push(entry)
      }
    }

    return JSON.stringify({ bpm, notes }, null, 2)
  }

  // =========================================
  //  ヘルパー: pitch パース
  // =========================================

  /** "C#4", "Bb3", "D4" → { name: "C+", octave: 4 } */
  static parsePitch(pitch) {
    const match = pitch.match(/^([A-G])(#|b)?(\d+)$/)
    if (!match) { throw new Error(`Invalid pitch: ${pitch}`) }

    let name = match[1]
    const accidental = match[2]
    const octave = parseInt(match[3])

    if (accidental === '#') { name += '+' }
    else if (accidental === 'b') { name += '-' }

    return { name, octave }
  }

  /** MYNT MIDI の音名 → 標準表記: "C+" → "C#", "B-" → "Bb" */
  static myntKeyToStandard(key) {
    if (!key) { return 'C' }
    const upper = key.toUpperCase()
    if (upper.endsWith('+')) { return upper[0] + '#' }
    if (upper.endsWith('-')) { return upper[0] + 'b' }
    return upper
  }

  // =========================================
  //  ヘルパー: duration ↔ テンポ変換
  // =========================================

  /** duration文字列 → T値 */
  static durationToTempo(duration, bpm) {
    // 数値ならミリ秒直指定
    if (typeof duration === 'number') {
      return Math.round(60000 / duration)
    }

    const dotted = duration.endsWith('.')
    const base = dotted ? duration.slice(0, -1) : duration
    const triplet = base.endsWith('t')
    const num = parseInt(base)

    let tVal = bpm * (num / 4)
    if (triplet) { tVal = bpm * (num / 4) * 1.5 }
    if (dotted) { tVal = tVal / 1.5 }

    return Math.round(tVal)
  }

  /** T値 → 最も近いduration文字列 */
  static tempoToDuration(tVal, bpm) {
    // 標準的な音符の長さとの比率を計算
    const ratio = tVal / bpm
    const durationMap = [
      { ratio: 0.25, label: '1n' },
      { ratio: 0.5,  label: '2n' },
      { ratio: 1,    label: '4n' },
      { ratio: 2,    label: '8n' },
      { ratio: 4,    label: '16n' },
      { ratio: 1.5,  label: '4t' },
    ]

    // 最も近いものを探す
    let best = null
    let bestDiff = Infinity
    for (const d of durationMap) {
      const diff = Math.abs(d.ratio - ratio)
      if (diff < bestDiff) {
        bestDiff = diff
        best = d
      }
    }

    // 差が大きい場合はミリ秒で返す
    if (bestDiff > 0.1) {
      const ms = Math.round(60000 / tVal)
      return ms
    }

    return best.label
  }

  // =========================================
  //  ヘルパー: velocity ↔ volume 変換
  // =========================================

  /** velocity(0-127) → volume(0-100) */
  static velocityToVolume(velocity) {
    if (velocity === undefined) { return 50 }
    return Math.round((velocity / 127) * 100)
  }

  /** volume(0-100) → velocity(0-127) */
  static volumeToVelocity(volume) {
    if (volume === undefined || volume === 50) { return 64 }
    return Math.round((volume / 100) * 127)
  }
}
