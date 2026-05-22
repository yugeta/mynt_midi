import { MidiParser } from './parser.js'

/**
 * Web Audio API による音声再生
 *
 * 音符のスケジュールは MIDI のテンポ（data.tempo）通りに行う。
 * 再生タイミングは一切変更しない。
 *
 * UI層（Element）への依存なし。oscillatorType / volume は呼び出し側から渡す。
 */

export class MidiPlayer{

  static get audio(){
    if(!MidiPlayer._audioContext || MidiPlayer._audioContext.state === 'closed'){
      // @ts-ignore — Safari旧バージョン向けフォールバック
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      MidiPlayer._audioContext = new AudioCtx()
    }
    return MidiPlayer._audioContext
  }

  /**
   * AudioContext が使用可能な状態であることを保証する
   */
  static async ensureAudioReady(){
    const ctx = MidiPlayer.audio
    if(ctx.state === 'suspended'){
      await ctx.resume()
    }
    return ctx
  }

  /** アクティブなオシレーターとゲインノードの追跡用 */
  static _activeNodes = []

  /**
   * 再生中の全音声を停止する
   * AudioContext は破棄せず、スケジュール済みノードを個別に停止する。
   */
  static stop(){
    if(!MidiPlayer._audioContext){ return }
    const now = MidiPlayer._audioContext.currentTime
    for(const nodes of MidiPlayer._activeNodes){
      for(const osc of nodes.oscillators){
        try{ osc.stop(now) }catch(e){ /* 既に停止済み */ }
      }
      for(const g of nodes.gains){
        try{ g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(0, now) }catch(e){}
      }
      if(nodes.masterGain){
        try{ nodes.masterGain.disconnect() }catch(e){}
      }
      if(nodes.compressor){
        try{ nodes.compressor.disconnect() }catch(e){}
      }
    }
    MidiPlayer._activeNodes = []
  }

  // --- 単音再生（キーボード用） ---

  /** 音名 → 半音オフセット */
  static _NOTE_MAP = {
    'C':0,'C+':1,'D-':1,'D':2,'D+':3,'E-':3,'E':4,'F-':4,
    'F':5,'E+':5,'F+':6,'G-':6,'G':7,'G+':8,'A-':8,
    'A':9,'A+':10,'B-':10,'B':11,'C-':11,'B+':0,
  }

  /**
   * 1音を鳴らし始める（mousedown用）
   * 戻り値のオブジェクトを stopNote() に渡して止める。
   *
   * @param {string} key - 音名 ('c','d-','f+' など)
   * @param {number} octave - オクターブ (0-10)
   * @param {object} [options] - { oscillatorType, volume }
   * @returns {Promise<object|null>} stopNote() に渡すハンドル
   */
  static async startNote(key, octave, options){
    const ctx = await MidiPlayer.ensureAudioReady()
    const opts = options || {}

    const noteKey = key.toUpperCase()
    const semitone = MidiPlayer._NOTE_MAP[noteKey]
    if(semitone == null){ return null }

    const midi = (Number(octave) * 12) + semitone
    const freq = 440 * Math.pow(2, (midi - 69) / 12)

    const oscType = opts.oscillatorType || 'square'
    const volume  = opts.volume != null ? opts.volume / 100 : 0.05

    const now  = ctx.currentTime
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()

    const env = MidiPlayer._getEnvelope(oscType)

    osc.type = oscType
    osc.frequency.setValueAtTime(freq, now)

    // Attack エンベロープ
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + env.attack)
    // Decay → Sustain
    gain.gain.linearRampToValueAtTime(volume * env.sustain, now + env.attack + env.decay)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)

    return { osc, gain, ctx, oscType }
  }

  /**
   * startNote() で開始した音を止める（mouseup用）
   * ADSR の Release フェーズを適用する。
   *
   * @param {object} handle - startNote() の戻り値
   */
  static stopNote(handle){
    if(!handle){ return }
    const { osc, gain, ctx, oscType } = handle
    const now = ctx.currentTime
    const env = MidiPlayer._getEnvelope(oscType || 'square')
    const release = env.release || 0.08
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + release)
    osc.stop(now + release)
  }

  /**
   * MIDI文字列を再生する
   * @param {string} midiString - MIDI文字列
   * @param {object} [options] - { oscillatorType, volume }
   */
  static async play(midiString, options){
    await MidiPlayer.ensureAudioReady()
    const datas = MidiParser.get_code(midiString)
    if(!datas || !datas.length){ return { startTime: 0, duration: 0 } }
    return MidiPlayer._schedule(datas, options || {})
  }

  /**
   * 複数レイヤーを同時再生する（ハイブリッド対応）
   * mode: "string" → MIDI文字列をパースして再生
   * mode: "midi"   → noteEventsを直接スケジュール（精度劣化なし）
   * @param {Array} layers - レイヤー配列
   * @param {object} [options] - { offsetSec?: number }
   */
  static async playLayers(layers, options){
    await MidiPlayer.ensureAudioReady()
    const playable = MidiPlayer._getPlayableLayers(layers)
    if(!playable.length){ return { startTime: 0, duration: 0 } }

    const offsetSec = (options && options.offsetSec) || 0

    let maxDuration = 0
    for(const layer of playable){
      const layerOffset = layer.offset || 0
      const mode = layer.mode || 'string'

      if(mode === 'midi' && Array.isArray(layer.noteEvents) && layer.noteEvents.length){
        // MIDIモード: noteEventsを直接スケジュール
        const result = MidiPlayer._scheduleFromEvents(layer.noteEvents, {
          oscillatorType: layer.oscillatorType || 'square',
          volume: layer.volume,
          offsetSec: offsetSec - layerOffset,
          loop: layer.loop,
        })
        if(result && result.duration > maxDuration){
          maxDuration = result.duration + layerOffset
        }
      } else if(layer.midiString){
        // 軽量モード: モデルデータがあれば直接スケジュール（音の途切れを防止）
        // なければMIDI文字列をパースして再生
        const snapshot = layer.notesData
        if(snapshot && snapshot.length){
          // notesData → noteEvents形式に変換して直接スケジュール
          const events = MidiPlayer._snapshotToEvents(snapshot)
          if(events.length){
            const result = MidiPlayer._scheduleFromEvents(events, {
              oscillatorType: layer.oscillatorType || 'square',
              volume: layer.volume,
              offsetSec: offsetSec - layerOffset,
            })
            if(result && result.duration > maxDuration){
              maxDuration = result.duration + layerOffset
            }
            continue
          }
        }
        // フォールバック: MIDI文字列からパース再生
        const datas = MidiParser.get_code(layer.midiString)
        if(!datas || !datas.length){ continue }
        const result = MidiPlayer._schedule(datas, {
          oscillatorType: layer.oscillatorType || 'square',
          volume: layer.volume,
          offsetSec: offsetSec - layerOffset,
        })
        if(result && result.duration > maxDuration){
          maxDuration = result.duration + layerOffset
        }
      }
    }
    return { startTime: MidiPlayer.audio.currentTime, duration: maxDuration }
  }

  /**
   * 再生可能レイヤーのフィルタリング（solo優先、mute除外）
   */
  static _getPlayableLayers(layers){
    const hasSolo = layers.some(l => l.solo)
    if(hasSolo){
      return layers.filter(l => l.solo && !l.mute && l.visible !== false && (l.midiString || (l.noteEvents && l.noteEvents.length)))
    }
    return layers.filter(l => !l.mute && l.visible !== false && (l.midiString || (l.noteEvents && l.noteEvents.length)))
  }

  /**
   * パース済みデータを Web Audio API でスケジュールする（統合メソッド）
   * @param {Array} datas - MidiParser.get_code() の結果
   * @param {object} options - { oscillatorType?: string, volume?: number, offsetSec?: number }
   */
  static _schedule(datas, options){
    const act = MidiPlayer.audio
    const startTime   = act.currentTime
    const destination = act.createAnalyser()
    const cnt         = MidiPlayer._getChordCount(datas)
    const oscillator  = []
    const gain        = []

    const oscType     = options.oscillatorType || 'square'
    const masterVol   = (options.volume != null ? options.volume : 100) / 100
    const offsetSec   = options.offsetSec || 0

    // ADSR エンベロープパラメータ（秒）
    const env = MidiPlayer._getEnvelope(oscType)

    for(let i=0; i<cnt; i++){
      oscillator[i] = act.createOscillator()
      oscillator[i].type = oscType
      gain[i] = act.createGain()
    }
    destination.fftSize = 4096
    destination.connect(act.destination)
    for(let i=0; i<cnt; i++){
      gain[i].gain.setValueAtTime(0, Math.max(0, startTime - 0.001))
      oscillator[i].connect(gain[i])
      gain[i].connect(destination)
    }

    // オフセット適用: offsetSec より前のノートはスキップし、
    // 以降のノートは (time - offsetSec) 秒後にスケジュールする
    let time = 0
    let scheduleTime = 0
    for(let i=0; i<datas.length; i++){
      const data = datas[i]
      const noteEnd = time + data.tempo

      // このノートの終了がオフセットより前ならスキップ
      if(noteEnd <= offsetSec){
        time = noteEnd
        continue
      }

      // スケジュール上の時刻（オフセット分を差し引く）
      const t = Math.max(0, time - offsetSec)
      const vol = ((data.volume || 50) / 1000) * masterVol

      if(data.freq){
        const noteDur = data.tempo
        const attack  = Math.min(env.attack, noteDur * 0.3)
        const decay   = Math.min(env.decay, noteDur * 0.3)
        const release = Math.min(env.release, noteDur * 0.4)
        const sustainTime = Math.max(0, noteDur - attack - decay - release)
        const sustainVol  = vol * env.sustain

        for(let j=0; j<cnt; j++){
          const g = gain[j].gain
          const noteStart = startTime + t

          // Attack: 0 → vol
          g.setValueAtTime(0, noteStart)
          g.linearRampToValueAtTime(vol, noteStart + attack)

          // Decay: vol → sustainVol
          g.linearRampToValueAtTime(sustainVol, noteStart + attack + decay)

          // Sustain: sustainVol を維持
          g.setValueAtTime(sustainVol, noteStart + attack + decay + sustainTime)

          // Release: sustainVol → 0
          g.linearRampToValueAtTime(0, noteStart + noteDur)

          // 周波数設定
          if(data.freq.constructor === Array){
            for(let k=0; k<cnt; k++){
              const freq = data.freq[k] || data.freq[0]
              oscillator[k].frequency.setValueAtTime(freq, noteStart)
            }
          }
          else{
            oscillator[j].frequency.setValueAtTime(data.freq, noteStart)
          }
        }
      }
      else if(data.S === 'S'){
        for(let j=0; j<cnt; j++){
          gain[j].gain.setValueAtTime(0, startTime + t)
          oscillator[j].frequency.setValueAtTime(0, startTime + t)
        }
      }
      else if(data.S === '~'){
        for(let j=0; j<cnt; j++){
          gain[j].gain.linearRampToValueAtTime(0, startTime + t + data.tempo)
        }
      }
      else{
        time = noteEnd
        continue
      }
      time = noteEnd
      scheduleTime = t + data.tempo
    }

    // スケジュールするノートがなかった場合
    if(scheduleTime <= 0){
      for(let i=0; i<cnt; i++){
        oscillator[i].connect(gain[i])  // already connected above
        oscillator[i].start(startTime)
        oscillator[i].stop(startTime)
      }
      return { startTime, duration: 0 }
    }

    for(let i=0; i<cnt; i++){
      oscillator[i].start(startTime)
      oscillator[i].stop(startTime + scheduleTime + 0.05)
    }

    // ノードを追跡リストに登録
    const nodeEntry = { oscillators: oscillator, gains: gain }
    MidiPlayer._activeNodes.push(nodeEntry)

    // 再生終了時に自動クリーンアップ
    oscillator[0].onended = () => {
      const idx = MidiPlayer._activeNodes.indexOf(nodeEntry)
      if(idx !== -1){ MidiPlayer._activeNodes.splice(idx, 1) }
    }

    return { startTime, duration: scheduleTime }
  }

  /**
   * noteEvents を Web Audio API で直接スケジュールする（MIDIモード用）
   * T値変換を経由しないため精度劣化なし。
   * 各ノートに個別の OscillatorNode + GainNode を割り当てる。
   *
   * @param {Array} events - [{time, duration, midi, velocity}, ...]
   * @param {object} options - { oscillatorType, volume, offsetSec, loop }
   */
  static _scheduleFromEvents(events, options){
    const ctx = MidiPlayer.audio
    const startTime = ctx.currentTime
    const oscType = options.oscillatorType || 'square'
    const masterVol = (options.volume != null ? options.volume : 100) / 100
    const offsetSec = options.offsetSec || 0
    const env = MidiPlayer._getEnvelope(oscType)

    // DynamicsCompressor → 音量の自動正規化（クリッピング防止）
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-10, startTime)
    compressor.knee.setValueAtTime(10, startTime)
    compressor.ratio.setValueAtTime(12, startTime)
    compressor.attack.setValueAtTime(0.003, startTime)
    compressor.release.setValueAtTime(0.1, startTime)
    compressor.connect(ctx.destination)

    // マスターゲイン
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(masterVol, startTime)
    masterGain.connect(compressor)

    const oscillators = []
    const gains = []
    let maxEndTime = 0

    for(const event of events){
      const noteStart = event.time - offsetSec
      const noteEnd = noteStart + event.duration

      // オフセットより前のノートはスキップ
      if(noteEnd <= 0){ continue }

      const schedStart = Math.max(0, noteStart)
      const schedDur = noteEnd - schedStart
      if(schedDur <= 0){ continue }

      const freq = 440 * Math.pow(2, (event.midi - 69) / 12)
      const vel = (event.velocity != null ? event.velocity : 64) / 127
      const vol = vel * 0.12

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = oscType
      osc.frequency.setValueAtTime(freq, startTime + schedStart)

      // ADSR エンベロープ
      const attack = Math.min(env.attack, schedDur * 0.3)
      const decay = Math.min(env.decay, schedDur * 0.3)
      const release = Math.min(env.release, schedDur * 0.4)
      const sustainVol = vol * env.sustain

      const t0 = startTime + schedStart
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(vol, t0 + attack)
      gain.gain.linearRampToValueAtTime(sustainVol, t0 + attack + decay)
      gain.gain.setValueAtTime(sustainVol, t0 + schedDur - release)
      gain.gain.linearRampToValueAtTime(0, t0 + schedDur)

      osc.connect(gain)
      gain.connect(masterGain)
      osc.start(t0)
      osc.stop(t0 + schedDur + 0.01)

      oscillators.push(osc)
      gains.push(gain)

      if(noteEnd > maxEndTime){ maxEndTime = noteEnd }
    }

    if(!oscillators.length){
      masterGain.disconnect()
      compressor.disconnect()
      return { startTime, duration: 0 }
    }

    // ノードを追跡リストに登録
    const nodeEntry = { oscillators, gains, masterGain, compressor }
    MidiPlayer._activeNodes.push(nodeEntry)

    // 最後のオシレーター終了時にクリーンアップ
    oscillators[oscillators.length - 1].onended = () => {
      const idx = MidiPlayer._activeNodes.indexOf(nodeEntry)
      if(idx !== -1){ MidiPlayer._activeNodes.splice(idx, 1) }
      masterGain.disconnect()
      compressor.disconnect()
    }

    return { startTime, duration: maxEndTime }
  }

  /**
   * notesData（モデルスナップショット）を noteEvents 形式に変換する
   * 各ノートを独立したイベントとして扱うため、重なりがあっても途切れない
   * @param {Array} snapshot - MidiModel.saveSnapshot() の結果
   * @returns {Array} [{time, duration, midi, velocity}, ...]
   */
  static _snapshotToEvents(snapshot){
    const events = []
    for(const note of snapshot){
      if(note.type !== 'note'){ continue }
      if(note.octave === null || note.key === null){ continue }

      // 音名 → MIDIノート番号
      const semitone = MidiPlayer._NOTE_MAP[note.key.toUpperCase()]
      if(semitone == null){ continue }

      const midi = (Number(note.octave) * 12) + semitone
      events.push({
        time: note.startTime,
        duration: note.tempo,
        midi: midi,
        velocity: Math.round((note.volume || 50) / 100 * 127),
      })
    }
    return events
  }

  /**
   * オシレータタイプに応じた ADSR エンベロープパラメータを返す
   * @param {string} oscType - オシレータタイプ
   * @returns {{attack: number, decay: number, sustain: number, release: number}}
   */
  static _getEnvelope(oscType){
    switch(oscType){
      case 'sine':
        return { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.15 }
      case 'triangle':
        return { attack: 0.04, decay: 0.08, sustain: 0.75, release: 0.12 }
      case 'sawtooth':
        return { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.1 }
      case 'square':
      default:
        return { attack: 0.01, decay: 0.08, sustain: 0.65, release: 0.08 }
    }
  }

  /**
   * 和音の最大同時発音数を取得
   */
  static _getChordCount(datas){
    let max = 1
    for(let i=0; i<datas.length; i++){
      if(!datas[i].freq || datas[i].freq.constructor !== Array){ continue }
      if(max < datas[i].freq.length){ max = datas[i].freq.length }
    }
    return max
  }
}
