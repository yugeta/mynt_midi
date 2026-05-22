/**
 * SMF（Standard MIDI File）パーサー
 *
 * .mid ファイル（ArrayBuffer）を解析し、noteEvents 形式に変換する。
 * 対応: Type 0（単一トラック）、Type 1（マルチトラック）
 *
 * 出力形式:
 *   [{time, duration, midi, velocity}, ...]
 *   - time: 開始時刻（秒）
 *   - duration: 長さ（秒）
 *   - midi: MIDIノート番号（0-127）
 *   - velocity: ベロシティ（0-127）
 */

export class SmfParser {

  /**
   * ArrayBuffer を解析してトラックごとの noteEvents を返す
   * @param {ArrayBuffer} buffer - .mid ファイルのバイナリデータ
   * @returns {Array<{name: string, noteEvents: Array}>} トラック配列
   */
  static parse(buffer) {
    const view = new DataView(buffer)
    let offset = 0

    // --- ヘッダーチャンク ---
    const headerChunk = SmfParser._readChunkHeader(view, offset)
    if (headerChunk.id !== 'MThd') {
      throw new Error('Invalid MIDI file: missing MThd header')
    }
    offset += 8

    const format = view.getUint16(offset); offset += 2
    const numTracks = view.getUint16(offset); offset += 2
    const division = view.getUint16(offset); offset += 2

    if (format > 1) {
      throw new Error(`Unsupported MIDI format: Type ${format}`)
    }

    // division: ticks per quarter note（上位ビットが0の場合）
    const ticksPerBeat = division & 0x7FFF

    // --- トラックチャンク ---
    const tracks = []
    for (let i = 0; i < numTracks; i++) {
      const trackChunk = SmfParser._readChunkHeader(view, offset)
      if (trackChunk.id !== 'MTrk') {
        // 不明なチャンクはスキップ
        offset += 8 + trackChunk.length
        continue
      }
      offset += 8

      const trackEnd = offset + trackChunk.length
      const events = SmfParser._parseTrack(view, offset, trackEnd)
      tracks.push(events)
      offset = trackEnd
    }

    // --- テンポマップ構築 ---
    const tempoMap = SmfParser._buildTempoMap(tracks, ticksPerBeat)

    // --- noteOn/Off ペアリング → noteEvents 変換 ---
    const result = []
    for (let i = 0; i < tracks.length; i++) {
      const noteEvents = SmfParser._convertToNoteEvents(tracks[i], tempoMap, ticksPerBeat)
      if (noteEvents.length > 0) {
        const trackName = SmfParser._getTrackName(tracks[i]) || `Track ${i + 1}`
        result.push({ name: trackName, noteEvents })
      }
    }

    return result
  }

  // --- チャンクヘッダー読み取り ---

  static _readChunkHeader(view, offset) {
    const id = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    )
    const length = view.getUint32(offset + 4)
    return { id, length }
  }

  // --- 可変長数値の読み取り ---

  static _readVarLen(view, offset) {
    let value = 0
    let byte
    let bytesRead = 0
    do {
      byte = view.getUint8(offset + bytesRead)
      value = (value << 7) | (byte & 0x7F)
      bytesRead++
    } while (byte & 0x80)
    return { value, bytesRead }
  }

  // --- トラックイベント解析 ---

  static _parseTrack(view, offset, end) {
    const events = []
    let tick = 0
    let runningStatus = 0

    while (offset < end) {
      // デルタタイム
      const delta = SmfParser._readVarLen(view, offset)
      offset += delta.bytesRead
      tick += delta.value

      // ステータスバイト
      let status = view.getUint8(offset)

      // ランニングステータス
      if (status < 0x80) {
        status = runningStatus
      } else {
        offset++
        if (status < 0xF0) {
          runningStatus = status
        }
      }

      const type = status & 0xF0
      const channel = status & 0x0F

      if (type === 0x90) {
        // Note On
        const note = view.getUint8(offset); offset++
        const velocity = view.getUint8(offset); offset++
        events.push({ tick, type: 'noteOn', channel, note, velocity })
      }
      else if (type === 0x80) {
        // Note Off
        const note = view.getUint8(offset); offset++
        const velocity = view.getUint8(offset); offset++
        events.push({ tick, type: 'noteOff', channel, note, velocity })
      }
      else if (type === 0xA0) {
        // Polyphonic Aftertouch
        offset += 2
      }
      else if (type === 0xB0) {
        // Control Change
        offset += 2
      }
      else if (type === 0xC0) {
        // Program Change
        offset += 1
      }
      else if (type === 0xD0) {
        // Channel Aftertouch
        offset += 1
      }
      else if (type === 0xE0) {
        // Pitch Bend
        offset += 2
      }
      else if (status === 0xFF) {
        // Meta Event
        const metaType = view.getUint8(offset); offset++
        const len = SmfParser._readVarLen(view, offset)
        offset += len.bytesRead

        if (metaType === 0x51) {
          // Set Tempo（マイクロ秒/四分音符）
          const tempo = (view.getUint8(offset) << 16) |
                        (view.getUint8(offset + 1) << 8) |
                        view.getUint8(offset + 2)
          events.push({ tick, type: 'tempo', tempo })
        }
        else if (metaType === 0x03) {
          // Track Name
          let name = ''
          for (let i = 0; i < len.value; i++) {
            name += String.fromCharCode(view.getUint8(offset + i))
          }
          events.push({ tick, type: 'trackName', name })
        }
        else if (metaType === 0x2F) {
          // End of Track
          offset += len.value
          break
        }

        offset += len.value
      }
      else if (status === 0xF0 || status === 0xF7) {
        // SysEx
        const len = SmfParser._readVarLen(view, offset)
        offset += len.bytesRead + len.value
      }
      else {
        // 不明なイベント — 安全にスキップ
        break
      }
    }

    return events
  }

  // --- テンポマップ構築 ---

  static _buildTempoMap(tracks, ticksPerBeat) {
    // 全トラックからテンポイベントを収集（通常はトラック0にある）
    const tempoEvents = []
    for (const track of tracks) {
      for (const event of track) {
        if (event.type === 'tempo') {
          tempoEvents.push(event)
        }
      }
    }

    // tick順にソート
    tempoEvents.sort((a, b) => a.tick - b.tick)

    // デフォルトテンポ: 120 BPM = 500000 μs/beat
    if (tempoEvents.length === 0 || tempoEvents[0].tick > 0) {
      tempoEvents.unshift({ tick: 0, type: 'tempo', tempo: 500000 })
    }

    // テンポマップ: [{tick, tempo(μs/beat), timeSeconds}]
    const map = []
    let currentTime = 0
    for (let i = 0; i < tempoEvents.length; i++) {
      const event = tempoEvents[i]
      if (i > 0) {
        const prevEvent = tempoEvents[i - 1]
        const deltaTicks = event.tick - prevEvent.tick
        const secPerTick = prevEvent.tempo / 1000000 / ticksPerBeat
        currentTime += deltaTicks * secPerTick
      }
      map.push({
        tick: event.tick,
        tempo: event.tempo,
        timeSeconds: currentTime,
      })
    }

    return map
  }

  // --- tick → 秒 変換 ---

  static _tickToSeconds(tick, tempoMap, ticksPerBeat) {
    // テンポマップから該当区間を探す
    let mapEntry = tempoMap[0]
    for (let i = tempoMap.length - 1; i >= 0; i--) {
      if (tempoMap[i].tick <= tick) {
        mapEntry = tempoMap[i]
        break
      }
    }

    const deltaTicks = tick - mapEntry.tick
    const secPerTick = mapEntry.tempo / 1000000 / ticksPerBeat
    return mapEntry.timeSeconds + (deltaTicks * secPerTick)
  }

  // --- noteOn/Off ペアリング → noteEvents ---

  static _convertToNoteEvents(trackEvents, tempoMap, ticksPerBeat) {
    const noteEvents = []
    // 未完了のノート: key = `${channel}_${note}`, value = [{tick, velocity}]
    const pending = new Map()

    for (const event of trackEvents) {
      if (event.type === 'noteOn' && event.velocity > 0) {
        const key = `${event.channel}_${event.note}`
        if (!pending.has(key)) { pending.set(key, []) }
        pending.get(key).push({ tick: event.tick, velocity: event.velocity })
      }
      else if (event.type === 'noteOff' || (event.type === 'noteOn' && event.velocity === 0)) {
        const key = `${event.channel}_${event.note}`
        const queue = pending.get(key)
        if (queue && queue.length > 0) {
          const start = queue.shift()
          const startSec = SmfParser._tickToSeconds(start.tick, tempoMap, ticksPerBeat)
          const endSec = SmfParser._tickToSeconds(event.tick, tempoMap, ticksPerBeat)
          const duration = endSec - startSec

          if (duration > 0) {
            noteEvents.push({
              time: startSec,
              duration: duration,
              midi: event.note,
              velocity: start.velocity,
            })
          }
        }
      }
    }

    // 開始時刻でソート
    noteEvents.sort((a, b) => a.time - b.time)
    return noteEvents
  }

  // --- トラック名取得 ---

  static _getTrackName(trackEvents) {
    for (const event of trackEvents) {
      if (event.type === 'trackName') {
        return event.name
      }
    }
    return null
  }
}
