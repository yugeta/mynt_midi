import { Element }  from './common/element.js'
import { Util }    from './util.js'

/*
  Ex)
  str : "T32O3CDEFGAB04C"
  T* : テンポ(４分音符が１分間で表示される値)　(60 * 1000 / 12 )* TEMPO
  O* : オクターブ
  CDEFGAB : ドレミファソラシド
  C- : フラット
  C+ : シャープ
  ~  : Fade.out
  S  : Space(Blank)
*/

export class Midi extends Util{
  constructor(data){
    super()
    this.data = data || null
  }

  static get audio(){
    return  new (window.AudioContext || window.webkitAudioContext)
  }

  static get analyser(){
    const audio = Midi.audio
    return audio.createAnalyser()
  }


  static play(data){
    const code = Midi.get_code(data)
    Midi.sound(code)
  }

  static get_code(str){
    if(!str){return}
    let T     = 120,
        O     = 5,
        S     = '',
        V     = 50
    let tempo = this.tdur(T , 4),
        datas = [],
        time  = 0,
        res   = null
    const reg = new RegExp(`(\\[(.+?)\\]|[A-G~STOV]+?)([0-9\+\-]*)`, 'gi')

    while ((res = reg.exec(str)) !== null) {
      if(!res[1]){continue}
      let mode  = res[1].toUpperCase()
      let value = res[3]
      let data = {}
      if(mode === "T"){
        if(value){
          T = value
          tempo = this.tdur(T , 4)
        }
        continue
      }
      else if(mode === "O"){
        if(value){
          O = value
          continue
        }
      }
      else if(mode === "V"){
        if(value){
          V = value
          continue
        }
      }
      else if(mode === "~" || mode === "S"){
        data = {
          S     : mode,
          num   : null,
          tempo : tempo,
          freq  : null,
          volume : V,
        }
      }
      else if(["C","D","E","F","G","A","B"].indexOf(mode) !== -1){
        S = value ? mode + value : mode
        let num       = this.chord_octabe2num(S , O)
        let frequency = this.mtof(num)
        data = {
          O      : O,
          S      : S,
          num    : num,
          tempo  : tempo,
          freq   : frequency,
          volume : V,
        }
      }
      else{
        let num   = this.chord_octabe2num(S , O)
        let freqs = this.getOtherCode(mode)
        data = {
          S      : mode,
          num    : num,
          tempo  : tempo,
          freq   : freqs,
          volume : V,
        }
      }
      if(!data || !data.S){continue}
      time += data.tempo
      data.time = time
      datas.push(data)
    }
    return datas
  }
  static chord_octabe2num(chord , octave){
    let add = 12
    if(chord.constructor === Array){
      let arr = []
      for(let i=0; i<chord.length; i++){
        let singleNum = this.chord2singleNum(chord)
        arr.push((octave * add) + singleNum)
      }
      return arr
    }
    else{
      let singleNum = this.chord2singleNum(chord)
      return (octave * add) + singleNum
    }
  }
  static chord2singleNum(chord){
    switch(chord){
      case "B+": // ??
      case "C":
          return 0;
      case "C+":
      case "D-":
          return 1;
      case "D":
          return 2;
      case "D+":
      case "E-":
          return 3;
      case "F-": // ??
      case "E":
          return 4;
      case "E+": // ??
      case "F":
          return 5;
      case "F+":
      case "G-":
          return 6;
      case "G":
          return 7;
      case "G+":
      case "A-":
          return 8;
      case "A":
          return 9;
      case "A+":
      case "B-":
          return 10;
      case "C-": // ??
      case "B":
        return 11;
      case "S":
      case "~":
        return null
      default :
        return false
    }
  }
  static getOtherCode(mode){
    if(!mode){return}
    const reg = new RegExp(`\\[(.+?)\\]` , `ig`)
    let res = reg.exec(mode)
    if(res){
      let chords = res[1];
      let arr = [];
      let chord = this.str2datas(chords);
      for(let i=0; i<chord.length; i++){
        arr.push(chord[i].freq);
      }
      return arr;
    }
    else{
      return mode;
    }
  }
  static str2datas(str){
    if(!str){return;}
    let T = 120,
        O = 5,
        S = "",
        V = 50,
        tempo = this.tdur(T , 4),
        res = null
    let datas = []
    let reg = new RegExp("(\\[(.+?)\\]|[A-G~STOV]+?)([0-9\+\-]*)", "gi")
    let time = 0
    while ((res = reg.exec(str)) !== null) {
      if(!res[1]){continue}
      let mode  = res[1].toUpperCase()
      let value = res[3]
      let data = {}
      if(mode === "T"){
        if(value){
          T = value
          tempo = this.tdur(T , 4)
        }
        continue
      }
      else if(mode === "O"){
        if(value){
          O = value
          continue
        }
      }
      else if(mode === "V"){
        if(value){
          V = value
          continue
        }
      }
      else if(mode === "~" || mode === "S"){
        data = {
          S      : mode,
          num    : null,
          tempo  : tempo,
          freq   : null,
          volume : V,
        }
      }
      else if(["C","D","E","F","G","A","B"].indexOf(mode) !== -1){
        S = value ? mode + value : mode
        let num       = this.chord_octabe2num(S , O)
        let frequency = this.mtof(num)
        data = {
          S     : S,
          num   : num,
          tempo : tempo,
          freq  : frequency,
          volume : V
        }
      }
      else{
        let num   = this.chord_octabe2num(S , O)
        let freqs = this.getOtherCode(mode)
        data = {
          S      : mode,
          num    : num,
          tempo  : tempo,
          freq   : freqs,
          volume : V,
        };
      }
      if(!data || !data.S){continue}
      time += data.tempo
      data.time = time
      datas.push(data)
    }
    return datas
  }

  static tdur(tempo, length) {
    return (60 / tempo) * (4 / length)
  }

  static mtof(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12)
  }

  static sound(datas){
    const act  = Midi.audio
    const destination = act.createAnalyser()
    const oscillator  = []
    const gain        = []
    let cnt           = this.get_waon_count(datas)
    let volume        = (datas[datas.length-1].volume) / 1000
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
        for(let i=0; i<cnt; i++){
          if(data.freq.constructor === Array){
            for(let i=0; i<cnt; i++){
              let freq = data.freq[i] || data.freq[0]
              oscillator[i].frequency.setValueAtTime(freq , time)
            }
          }
          else{
            oscillator[i].frequency.setValueAtTime(data.freq , time)
          }
        }
      }
      else if(data.S === "S"){
        for(let i=0; i<cnt; i++){
          oscillator[i].frequency.setValueAtTime(0 , time)
        }
      }
      else if(data.S === "~"){
        for(let i=0; i<cnt; i++){
          gain[i].gain.linearRampToValueAtTime(0, time + data.tempo)
        }
      }
      else{
        continue
      }
      time += data.tempo
    }
    for(let i=0; i<cnt; i++){
      oscillator[i].start(0)
      oscillator[i].stop(time)
      oscillator[i].connect(gain[i])
      gain[i].gain.value = volume
      gain[i].connect(destination)
    }
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

  // static sound(code){
  //   const audioContext  = Midi.audio
  //   const destination   = audioContext.createAnalyser()
  //   const oscillator    = audioContext.createOscillator()
  //   const gain          = audioContext.createGain()
  //   oscillator.type     = Element.oscillator_type
  //   destination.fftSize = 2048
  //   destination.connect(audioContext.destination)

  //   let time = 0
  //   for(let i=0; i<code.length; i++){
  //     let data = code[i]
  //     if(data.value){
  //       oscillator.frequency.setValueAtTime(data.value , time)
  //     }
  //     else if(data.S === "~"){
  //       gain.gain.linearRampToValueAtTime(0, time)
  //     }
  //     else if(data.S === "S"){
  //       oscillator.frequency.setValueAtTime(0 , time)
  //     }
  //     else{
  //       continue
  //     }
  //     time += data.tempo
  //   }
  //   oscillator.start(0)
  //   oscillator.stop(time)
  //   oscillator.connect(gain) // OscillatorをAnalyserに接続
  //   gain.gain.value = 1.0
  //   gain.connect(destination)
  // }
}




export class Midi_1{
  constructor(data){
    this.data = data || null
  }

  static get audio(){
    return  new (window.AudioContext || window.webkitAudioContext)
  }

  static get analyser(){
    const audio = Midi.audio
    return audio.createAnalyser()
  }


  static play(data){
    const code     = Midi.get_code(data)
    Midi.sound(code)
  }

  static get_code(data){
    const datas = [];
    let T    = 120, 
        O    = 5 , 
        S    = "",
        time = 0,
        res  = null,
        reg  = new RegExp("([TOCDEFGAB~S])([0-9\+\-]*)","ig")

    while ((res = reg.exec(data)) !== null) {
      if(!res[1]){continue}
      let mode  = res[1].toUpperCase()
      let value = res[2]
      switch(mode){
        case "T":
          T = value
          continue
        case "O":
          O = value
          continue
        case "~":
          S = "~"
          break
        case "S":
          S = "S"
          break
        case "C":
        case "D":
        case "E":
        case "F":
        case "G":
        case "A":
        case "B":
          S = value ? mode + value : mode
          break
      }
      let tempo = Midi.tdur(T , 4)
      let data = {
        T     : T,
        O     : O,
        S     : S,
        tempo : tempo,
        value : Midi.scale2value(S, O),
        time  : time,
      }
      datas.push(data)
      time += tempo
    }
    return datas
  }

  static scale2value(S, O){
    let scale = 0
    let add   = 12
    switch(S){
      case "B+": // ??
      case "C" : 
        scale = 0
        break
      case "C+":
      case "D-": 
        scale = 1
        break
      case "D" : 
        scale = 2
        break
      case "D+":
      case "E-": 
        scale = 3
        break
      case "F-": // ??
      case "E" : 
        scale = 4
        break
      case "E+": // ??
      case "F" : 
        scale = 5
        break
      case "F+":
      case "G-": 
        scale = 6
        break
      case "G" : 
        scale = 7
        break
      case "G+":
      case "A-": 
        scale = 8
        break
      case "A" : 
        scale = 9
        break
      case "A+":
      case "B-": 
        scale = 10
        break
      case "C-": // ??
      case "B" : 
        scale = 11
        break
      case "S" :
      case "~" : 
        return ""
    }
    const midi = (O * add) + scale
    return Midi.mtof(midi)
  }

  static tdur(tempo, length) {
    return (60 / tempo) * (4 / length)
  }

  static mtof(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12)
  }

  static sound(code){
    const audioContext  = Midi.audio
    const destination   = audioContext.createAnalyser()
    const oscillator    = audioContext.createOscillator()
    const gain          = audioContext.createGain()
    oscillator.type     = Element.oscillator_type
    destination.fftSize = 2048
    destination.connect(audioContext.destination)

    let time = 0
    for(let i=0; i<code.length; i++){
      let data = code[i]
      if(data.value){
        oscillator.frequency.setValueAtTime(data.value , time)
      }
      else if(data.S === "~"){
        gain.gain.linearRampToValueAtTime(0, time)
      }
      else if(data.S === "S"){
        oscillator.frequency.setValueAtTime(0 , time)
      }
      else{
        continue
      }
      time += data.tempo
    }
    oscillator.start(0)
    oscillator.stop(time)
    oscillator.connect(gain) // OscillatorをAnalyserに接続
    gain.gain.value = 1.0
    gain.connect(destination)
  }
}
