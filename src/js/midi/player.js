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
      MidiPlayer._audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if(MidiPlayer._audioContext.state === 'suspended'){
      MidiPlayer._audioContext.resume()
    }
    return MidiPlayer._audioContext
  }

  /**
   * MIDI文字列を再生する
   * @param {string} midiString - MIDI文字列
   * @param {object} [options] - { oscillatorType, volume }
   */
  static play(midiString, options){
    const datas = MidiParser.get_code(midiString)
    if(!datas || !datas.length){ return { startTime: 0, duration: 0 } }
    return MidiPlayer._schedule(datas, options || {})
  }

  /**
   * 複数レイヤーを同時再生する
   */
  static playLayers(layers){
    const playable = MidiPlayer._getPlayableLayers(layers)
    if(!playable.length){ return { startTime: 0, duration: 0 } }

    let maxDuration = 0
    for(const layer of playable){
      const datas = MidiParser.get_code(layer.midiString)
      if(!datas || !datas.length){ continue }
      const result = MidiPlayer._schedule(datas, {
        oscillatorType: layer.oscillatorType || 'square',
        volume: layer.volume,
      })
      if(result && result.duration > maxDuration){
        maxDuration = result.duration
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
      return layers.filter(l => l.solo && !l.mute && l.midiString)
    }
    return layers.filter(l => !l.mute && l.midiString)
  }

  /**
   * パース済みデータを Web Audio API でスケジュールする（統合メソッド）
   * @param {Array} datas - MidiParser.get_code() の結果
   * @param {object} options - { oscillatorType?: string, volume?: number }
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

    for(let i=0; i<cnt; i++){
      oscillator[i] = act.createOscillator()
      oscillator[i].type = oscType
      gain[i] = act.createGain()
    }
    destination.fftSize = 4096
    destination.connect(act.destination)

    let time = 0
    for(let i=0; i<datas.length; i++){
      const data = datas[i]
      const vol = ((data.volume || 50) / 1000) * masterVol

      if(data.freq){
        for(let j=0; j<cnt; j++){
          gain[j].gain.setValueAtTime(vol, startTime + time)
          if(data.freq.constructor === Array){
            for(let k=0; k<cnt; k++){
              const freq = data.freq[k] || data.freq[0]
              oscillator[k].frequency.setValueAtTime(freq, startTime + time)
            }
          }
          else{
            oscillator[j].frequency.setValueAtTime(data.freq, startTime + time)
          }
        }
      }
      else if(data.S === 'S'){
        for(let j=0; j<cnt; j++){
          gain[j].gain.setValueAtTime(0, startTime + time)
          oscillator[j].frequency.setValueAtTime(0, startTime + time)
        }
      }
      else if(data.S === '~'){
        for(let j=0; j<cnt; j++){
          gain[j].gain.linearRampToValueAtTime(0, startTime + time + data.tempo)
        }
      }
      else{ continue }
      time += data.tempo
    }

    for(let i=0; i<cnt; i++){
      oscillator[i].start(startTime)
      oscillator[i].stop(startTime + time)
      oscillator[i].connect(gain[i])
      gain[i].gain.setValueAtTime(0, startTime)
      gain[i].connect(destination)
    }
    return { startTime, duration: time }
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
