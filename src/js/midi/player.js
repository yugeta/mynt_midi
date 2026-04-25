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

  static sound(datas){
    const act = MidiPlayer.audio
    const startTime   = act.currentTime
    const destination = act.createAnalyser()
    const oscillator  = []
    const gain        = []
    let cnt    = this.get_waon_count(datas)
    let volume = (datas[datas.length-1].volume) / 1000

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
      if(data.freq){
        for(let j=0; j<cnt; j++){
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
      gain[i].gain.value = volume
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
