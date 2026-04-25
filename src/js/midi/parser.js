/**
 * MIDI文字列パーサー
 * 
 * 記法:
 *   T* : テンポ（4分音符が1分間に鳴る回数）
 *   O* : オクターブ
 *   CDEFGAB : 音名
 *   C+/D- : シャープ/フラット
 *   ~ : フェードアウト
 *   S : 休符
 *   V* : 音量
 *   [...] : 和音
 */

export class MidiParser{

  static get_code(str){
    if(!str){return}
    let T = 120, O = 5, S = '', V = 50
    let tempo = this.tdur(T , 4), datas = [], time = 0, res = null
    const reg = new RegExp(`(\\[(.+?)\\]|[A-G~STOV]+?)([0-9\+\-]*)`, 'gi')

    while ((res = reg.exec(str)) !== null) {
      if(!res[1]){continue}
      let mode  = res[1].toUpperCase()
      let value = res[3]
      let data = {}
      if(mode === "T"){
        if(value){ T = Number(value); tempo = this.tdur(T , 4) }
        continue
      }
      else if(mode === "O"){
        if(value){ O = Number(value); continue }
      }
      else if(mode === "V"){
        if(value){ V = Number(value); continue }
      }
      else if(mode === "~" || mode === "S"){
        data = { S: mode, num: null, tempo: tempo, freq: null, volume: V }
      }
      else if(["C","D","E","F","G","A","B"].indexOf(mode) !== -1){
        S = value ? mode + value : mode
        let num = this.chord_octave2num(S , O)
        let frequency = this.mtof(num)
        data = { O: O, S: S, num: num, tempo: tempo, freq: frequency, volume: V }
      }
      else{
        let num = this.chord_octave2num(S , O)
        let freqs = this.getOtherCode(mode)
        data = { S: mode, num: num, tempo: tempo, freq: freqs, volume: V }
      }
      if(!data || !data.S){continue}
      time += data.tempo
      data.time = time
      datas.push(data)
    }
    return datas
  }

  static chord_octave2num(chord , octave){
    const add = 12
    if(chord.constructor === Array){
      let arr = []
      for(let i=0; i<chord.length; i++){
        arr.push((octave * add) + this.chord2singleNum(chord))
      }
      return arr
    }
    else{
      return (octave * add) + this.chord2singleNum(chord)
    }
  }

  static chord2singleNum(chord){
    switch(chord){
      case "B+": case "C": return 0
      case "C+": case "D-": return 1
      case "D": return 2
      case "D+": case "E-": return 3
      case "F-": case "E": return 4
      case "E+": case "F": return 5
      case "F+": case "G-": return 6
      case "G": return 7
      case "G+": case "A-": return 8
      case "A": return 9
      case "A+": case "B-": return 10
      case "C-": case "B": return 11
      case "S": case "~": return null
      default: return false
    }
  }

  static getOtherCode(mode){
    if(!mode){return}
    const reg = new RegExp(`\\[(.+?)\\]` , `ig`)
    let res = reg.exec(mode)
    if(res){
      let arr = []
      let chord = this.str2datas(res[1])
      for(let i=0; i<chord.length; i++){
        arr.push(chord[i].freq)
      }
      return arr
    }
    else{
      return mode
    }
  }

  static str2datas(str){
    if(!str){return}
    let T = 120, O = 5, S = "", V = 50
    let tempo = this.tdur(T , 4), res = null, datas = [], time = 0
    let reg = new RegExp("(\\[(.+?)\\]|[A-G~STOV]+?)([0-9\+\-]*)", "gi")
    while ((res = reg.exec(str)) !== null) {
      if(!res[1]){continue}
      let mode  = res[1].toUpperCase()
      let value = res[3]
      let data = {}
      if(mode === "T"){
        if(value){ T = Number(value); tempo = this.tdur(T , 4) }
        continue
      }
      else if(mode === "O"){
        if(value){ O = Number(value); continue }
      }
      else if(mode === "V"){
        if(value){ V = Number(value); continue }
      }
      else if(mode === "~" || mode === "S"){
        data = { S: mode, num: null, tempo: tempo, freq: null, volume: V }
      }
      else if(["C","D","E","F","G","A","B"].indexOf(mode) !== -1){
        S = value ? mode + value : mode
        let num = this.chord_octave2num(S , O)
        let frequency = this.mtof(num)
        data = { S: S, num: num, tempo: tempo, freq: frequency, volume: V }
      }
      else{
        let num = this.chord_octave2num(S , O)
        let freqs = this.getOtherCode(mode)
        data = { S: mode, num: num, tempo: tempo, freq: freqs, volume: V }
      }
      if(!data || !data.S){continue}
      time += data.tempo
      data.time = time
      datas.push(data)
    }
    return datas
  }

  static tdur(tempo, length){
    return (60 / tempo) * (4 / length)
  }

  static mtof(midi){
    return 440 * Math.pow(2, (midi - 69) / 12)
  }
}
