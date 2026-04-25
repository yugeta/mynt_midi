import { Element }    from '../ui/element.js'
import { MidiParser } from './parser.js'

/**
 * Web Audio API による音声再生
 *
 * 音符のスケジュールは MIDI のテンポ（data.tempo）通りに行う。
 * 再生タイミングは一切変更しない。
 */

export class MidiPlayer{

  static get audio(){
    if(!MidiPlayer._audioContext || MidiPlayer._audioContext.state === 'closed'){
      MidiPlayer._audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    return MidiPlayer._audioContext
  }

  static play(midi_string){
    const code = MidiParser.get_code(midi_string)
    return MidiPlayer.sound(code)
  }

  /**
   * 複数レイヤーを同時再生する
   * 各レイヤーに独立したオシレータ+ゲインチェーンを生成
   */
  static playLayers(layers){
    const playable = MidiPlayer._getPlayableLayers(layers)
    if(!playable.length){ return { startTime: 0, duration: 0 } }

    let maxDuration = 0
    for(const layer of playable){
      const result = MidiPlayer._soundLayer(layer)
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
   * 1レイヤーの音声を再生する（レイヤー固有のoscillatorTypeとvolumeを適用）
   */
  static _soundLayer(layer){
    const datas = MidiParser.get_code(layer.midiString)
    if(!datas || !datas.length){ return null }

    const act = MidiPlayer.audio
    const startTime = act.currentTime
    const destination = act.createAnalyser()
    const oscillator = []
    const gain = []
    const cnt = MidiPlayer.get_waon_count(datas)
    const layerVolume = (layer.volume || 50) / 100

    for(let i=0; i<cnt; i++){
      oscillator[i] = act.createOscillator()
      gain[i] = act.createGain()
    }
    for(let i=0; i<cnt; i++){
      oscillator[i].type = layer.oscillatorType || 'square'
    }
    destination.fftSize = 4096
    destination.connect(act.destination)

    let time = 0
    for(let i=0; i<datas.length; i++){
      const data = datas[i]
      const volume = ((data.volume || 50) / 1000) * layerVolume

      if(data.freq){
        for(let j=0; j<cnt; j++){
          gain[j].gain.setValueAtTime(volume, startTime + time)
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
      else if(data.S === "S"){
        for(let j=0; j<cnt; j++){
          gain[j].gain.setValueAtTime(0, startTime + time)
          oscillator[j].frequency.setValueAtTime(0, startTime + time)
        }
      }
      else if(data.S === "~"){
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

  static sound(datas){
    const act = MidiPlayer.audio
    const startTime   = act.currentTime
    const destination = act.createAnalyser()
    const oscillator  = []
    const gain        = []
    let cnt    = this.get_waon_count(datas)

    for(let i=0; i<cnt; i++){
      oscillator[i] = act.createOscillator()
      gain[i]       = act.createGain()
    }
    for(let i=0; i<cnt; i++){
      oscillator[i].type = Element.oscillator_type
    }
    destination.fftSize = 4096
    destination.connect(act.destination)

    let time = 0
    for(let i=0; i<datas.length; i++){
      let data = datas[i]
      let volume = (data.volume || 50) / 1000

      if(data.freq){
        // 音符の開始時に gain を設定（フェードアウト後の復帰を含む）
        for(let j=0; j<cnt; j++){
          gain[j].gain.setValueAtTime(volume, startTime + time)
          if(data.freq.constructor === Array){
            for(let k=0; k<cnt; k++){
              let freq = data.freq[k] || data.freq[0]
              oscillator[k].frequency.setValueAtTime(freq , startTime + time)
            }
          }
          else{
            oscillator[j].frequency.setValueAtTime(data.freq , startTime + time)
          }
        }
      }
      else if(data.S === "S"){
        for(let j=0; j<cnt; j++){
          gain[j].gain.setValueAtTime(0, startTime + time)
          oscillator[j].frequency.setValueAtTime(0 , startTime + time)
        }
      }
      else if(data.S === "~"){
        for(let j=0; j<cnt; j++){
          gain[j].gain.linearRampToValueAtTime(0, startTime + time + data.tempo)
        }
      }
      else{
        continue
      }
      time += data.tempo
    }
    for(let i=0; i<cnt; i++){
      oscillator[i].start(startTime)
      oscillator[i].stop(startTime + time)
      oscillator[i].connect(gain[i])
      gain[i].gain.setValueAtTime(0, startTime)
      gain[i].connect(destination)
    }
    return { startTime: startTime, duration: time }
  }

  static get_waon_count(datas){
    let max_count = 1
    for(let i=0; i<datas.length; i++){
      if(!datas[i].freq || datas[i].freq.constructor !== Array){continue}
      if(max_count < datas[i].freq.length){
        max_count = datas[i].freq.length
      }
    }
    return max_count
  }
}
