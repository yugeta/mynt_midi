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
    if(!str){return []}
    let T = 120, O = 5, S = '', V = 50
    let tempo = this.tdur(T , 4), datas = [], time = 0, res = null
    const reg = new RegExp(`(\\[(.+?)\\]|[A-G~STOV]+?)([0-9\+\-]*)`, 'gi')

    while ((res = reg.exec(str)) !== null) {
      // ゼロ長マッチで無限ループを防止
      if(res[0].length === 0){
        reg.lastIndex++
        continue
      }
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
      let chord = this.get_code(res[1])
      for(let i=0; i<chord.length; i++){
        arr.push(chord[i].freq)
      }
      return arr
    }
    else{
      return mode
    }
  }

  static tdur(tempo, length){
    if(!tempo || tempo <= 0){ tempo = 1 }
    return (60 / tempo) * (4 / length)
  }

  static mtof(midi){
    return 440 * Math.pow(2, (midi - 69) / 12)
  }

  // --- トランスポーズ ---

  /** 半音番号 → 音名（フラット表記: キーボードDOMのdata-key属性に合わせる） */
  static _NUM_TO_NOTE = ['C','D-','D','E-','E','F','G-','G','A-','A','B-','B']

  /**
   * MIDI文字列をトランスポーズする
   * @param {string} str - MIDI文字列
   * @param {number} semitones - ずらす半音数（+12 = 1オクターブ上、-1 = 半音下 など）
   * @returns {string} トランスポーズ後のMIDI文字列
   */
  static transpose(str, semitones){
    if(!str || semitones === 0){ return str }

    let result = ''
    let currentOctave = 5   // パース時の現在オクターブ（元の文字列基準）
    let emittedOctave = null // 出力済みのオクターブ（まだ未出力ならnull）
    const reg = new RegExp(`(\\[(.+?)\\]|[A-G~STOV]+?)([0-9\\+\\-]*)`, 'gi')
    let res = null

    while((res = reg.exec(str)) !== null){
      // ゼロ長マッチで無限ループを防止
      if(res[0].length === 0){
        reg.lastIndex++
        continue
      }
      if(!res[1]){ continue }
      let mode = res[1]
      let value = res[3]
      const modeUpper = mode.toUpperCase()

      if(modeUpper === 'T' || modeUpper === 'V'){
        result += mode + value
        continue
      }
      if(modeUpper === 'O'){
        if(value){ currentOctave = Number(value) }
        // O指定は出力しない（音名出力時にトランスポーズ後のオクターブを出力する）
        continue
      }
      if(modeUpper === '~' || modeUpper === 'S'){
        result += mode + value
        continue
      }

      // 和音
      if(modeUpper.startsWith('[') || (res[2] && res[2].length > 0)){
        const inner = res[2]
        const transposed = MidiParser.transpose(inner, semitones)
        result += `[${transposed}]`
        continue
      }

      // 通常の音名
      if(['C','D','E','F','G','A','B'].indexOf(modeUpper) !== -1){
        const noteName = value ? modeUpper + value : modeUpper
        const semitone = MidiParser.chord2singleNum(noteName)
        if(semitone === null || semitone === false){
          result += mode + value
          continue
        }
        const newAbsolute = (currentOctave * 12) + semitone + semitones
        const newOctave = Math.floor(newAbsolute / 12)
        const newSemitone = ((newAbsolute % 12) + 12) % 12
        const newNote = MidiParser._NUM_TO_NOTE[newSemitone]

        if(emittedOctave === null || newOctave !== emittedOctave){
          result += `O${newOctave}`
          emittedOctave = newOctave
        }
        result += newNote
        continue
      }

      // その他（そのまま出力）
      result += mode + value
    }
    return result
  }
}
