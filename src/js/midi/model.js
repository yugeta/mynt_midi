import { MidiParser } from './parser.js'
import { get_width } from '../util/time.js'

/**
 * MIDIデータモデル
 *
 * 信頼できる唯一のデータソース（Single Source of Truth）。
 * MIDI文字列のパース結果を保持し、DOM操作時にも情報を失わない。
 *
 * データフロー:
 *   MIDI文字列 → fromString() → モデル
 *   モデル → toString() → MIDI文字列
 *   モデル → render() → DOM
 *   DOM操作 → updateNotePosition() → モデル → toString() → textarea
 */

let _notes = []
let _nextId = 0

export class MidiModel{

  // --- モデルの取得 ---

  static get notes(){
    return _notes
  }

  static get duration(){
    if(!_notes.length){return 0}
    return Math.max(..._notes.map(n => n.time))
  }

  // --- MIDI文字列 → モデル ---

  static fromString(str){
    _notes = []
    _nextId = 0
    if(!str){return}

    const datas = MidiParser.get_code(str)
    if(!datas || !datas.length){return}

    const totalDuration = datas[datas.length - 1].time
    const timelineWidth = get_width()

    for(const data of datas){
      const startTime = data.time - data.tempo
      const left = totalDuration > 0
        ? (startTime / totalDuration) * timelineWidth
        : 0

      if(data.S && data.S.match && data.S.match(/\[(.+)\]/)){
        // 和音: 内部をパースして個別の音符としてモデルに追加
        const reg = /\[(.+?)\]/i
        const res = reg.exec(data.S)
        if(res){
          const chordNotes = MidiParser.get_code(res[1])
          const chordId = `chord_${_nextId}`
          if(chordNotes){
            for(const cn of chordNotes){
              _notes.push({
                id       : `note_${_nextId++}`,
                octave   : Number(cn.O || 5),
                key      : (cn.S || '').toLowerCase(),
                tempo    : data.tempo,
                tempoVal : Math.round(60 / data.tempo),
                volume   : data.volume,
                time     : data.time,
                startTime: startTime,
                left     : left,
                chordId  : chordId,
                type     : 'note',
              })
            }
          }
        }
      }
      else if(data.S === 'S'){
        _notes.push({
          id       : `note_${_nextId++}`,
          octave   : null,
          key      : null,
          tempo    : data.tempo,
          tempoVal : Math.round(60 / data.tempo),
          volume   : data.volume,
          time     : data.time,
          startTime: startTime,
          left     : left,
          chordId  : null,
          type     : 'rest',
        })
      }
      else if(data.S === '~'){
        _notes.push({
          id       : `note_${_nextId++}`,
          octave   : null,
          key      : null,
          tempo    : data.tempo,
          tempoVal : Math.round(60 / data.tempo),
          volume   : data.volume,
          time     : data.time,
          startTime: startTime,
          left     : left,
          chordId  : null,
          type     : 'fade',
        })
      }
      else if(data.O !== undefined && data.S){
        _notes.push({
          id       : `note_${_nextId++}`,
          octave   : Number(data.O),
          key      : data.S.toLowerCase(),
          tempo    : data.tempo,
          tempoVal : Math.round(60 / data.tempo),
          volume   : data.volume,
          time     : data.time,
          startTime: startTime,
          left     : left,
          chordId  : null,
          type     : 'note',
        })
      }
    }
  }

  // --- モデル → MIDI文字列 ---

  static toString(){
    if(!_notes.length){return ''}

    // left でソートしてコピー
    const sorted = [..._notes].sort((a, b) => a.left - b.left)

    // 同じ left + 同じ chordId の音符をグループ化
    const groups = []
    let prevLeft = -1
    for(const note of sorted){
      // 同じ位置の音符は和音グループにまとめる
      if(groups.length > 0 && Math.abs(note.left - prevLeft) < 1){
        groups[groups.length - 1].push(note)
      }
      else{
        groups.push([note])
        prevLeft = note.left
      }
    }

    let result = ''
    let lastTempo = null
    let lastOctave = null
    let lastVolume = null

    for(const group of groups){
      const first = group[0]

      // テンポ変更
      if(first.tempoVal !== lastTempo){
        result += `T${first.tempoVal}`
        lastTempo = first.tempoVal
      }

      // 休符
      if(first.type === 'rest'){
        result += 'S'
        continue
      }
      // フェードアウト
      if(first.type === 'fade'){
        result += '~'
        continue
      }

      // 音量変更
      if(first.volume !== lastVolume && first.volume !== 50){
        result += `V${first.volume}`
        lastVolume = first.volume
      }

      // 音符（単音 or 和音）
      const noteGroup = group.filter(n => n.type === 'note')
      if(noteGroup.length === 0){continue}

      if(noteGroup.length === 1){
        // 単音
        const n = noteGroup[0]
        if(n.octave !== lastOctave){
          result += `O${n.octave}`
          lastOctave = n.octave
        }
        result += n.key.toUpperCase()
      }
      else{
        // 和音
        result += '['
        for(const n of noteGroup){
          result += `O${n.octave}${n.key.toUpperCase()}`
        }
        result += ']'
        lastOctave = null // 和音後はオクターブ状態をリセット
      }
    }

    return result
  }

  // --- DOM操作からモデルを更新 ---

  static findById(id){
    return _notes.find(n => n.id === id)
  }

  static updateNotePosition(id, newLeft){
    const note = MidiModel.findById(id)
    if(!note){return}

    // 和音グループの場合、同じchordIdの全音符を移動
    if(note.chordId){
      for(const n of _notes){
        if(n.chordId === note.chordId){
          n.left = newLeft
        }
      }
    }
    else{
      note.left = newLeft
    }

    // left の変更に応じて time を再計算
    MidiModel.recalcTimes()
  }

  static addNote(octave, key, left, tempoVal){
    tempoVal = tempoVal || MidiModel.getDefaultTempo()
    const note = {
      id       : `note_${_nextId++}`,
      octave   : Number(octave),
      key      : key.toLowerCase(),
      tempo    : 60 / tempoVal,
      tempoVal : tempoVal,
      volume   : 50,
      time     : 0,
      startTime: 0,
      left     : left,
      chordId  : null,
      type     : 'note',
    }
    _notes.push(note)
    MidiModel.recalcTimes()
    return note
  }

  static getDefaultTempo(){
    // モデル内の最後のテンポ値を使う。なければ 120
    for(let i = _notes.length - 1; i >= 0; i--){
      if(_notes[i].tempoVal){return _notes[i].tempoVal}
    }
    return 120
  }

  // left の順序に基づいて time を再計算
  static recalcTimes(){
    const sorted = [..._notes].sort((a, b) => a.left - b.left)
    const totalDuration = MidiModel.duration || 1
    const timelineWidth = get_width()

    // left → 相対位置 → time
    for(const note of sorted){
      const ratio = timelineWidth > 0 ? note.left / timelineWidth : 0
      note.startTime = ratio * totalDuration
      note.time = note.startTime + note.tempo
    }
  }
}
