import { MidiParser } from './parser.js'
import { get_width, sec2px, px2sec } from '../util/time.js'

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

    for(const data of datas){
      const startTime = data.time - data.tempo
      const left = sec2px(startTime)
      const width = sec2px(data.tempo)

      if(data.S && data.S.match && data.S.match(/\[(.+)\]/)){
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
                width    : width,
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
          width    : width,
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
          width    : width,
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
          width    : width,
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
    const tempo = 60 / tempoVal
    const width = sec2px(tempo)
    const startTime = px2sec(left)
    const note = {
      id       : `note_${_nextId++}`,
      octave   : Number(octave),
      key      : key.toLowerCase(),
      tempo    : tempo,
      tempoVal : tempoVal,
      volume   : 50,
      time     : startTime + tempo,
      startTime: startTime,
      left     : left,
      width    : width,
      chordId  : null,
      type     : 'note',
    }
    _notes.push(note)
    return note
  }

  static getDefaultTempo(){
    // モデル内の最後のテンポ値を使う。なければ 120
    for(let i = _notes.length - 1; i >= 0; i--){
      if(_notes[i].tempoVal){return _notes[i].tempoVal}
    }
    return 120
  }

  // left の順序に基づいて time を再計算（Time 基準）
  static recalcTimes(){
    for(const note of _notes){
      note.startTime = px2sec(note.left)
      note.time = note.startTime + note.tempo
    }
  }

  /**
   * 秒数データ（startTime, tempo）からピクセル値（left, width）を再計算する
   * スケール変更時に呼ぶ
   */
  static recalcPixels(){
    for(const note of _notes){
      note.left = sec2px(note.startTime)
      note.width = sec2px(note.tempo)
    }
  }

  // --- モデルデータの保存・復元（レイヤー切替用） ---

  /**
   * 現在のモデルデータのスナップショットを返す
   * @returns {Array} notes 配列のディープコピー
   */
  static saveSnapshot(){
    return _notes.map(n => ({ ...n }))
  }

  /**
   * スナップショットからモデルを復元する
   * @param {Array} snapshot - saveSnapshot() の戻り値
   */
  static restoreSnapshot(snapshot){
    if(!snapshot || !Array.isArray(snapshot)){
      _notes = []
      _nextId = 0
      return
    }
    _notes = snapshot.map(n => ({ ...n }))
    // _nextId を復元データの最大値+1に設定
    let maxId = 0
    for(const n of _notes){
      const match = n.id && n.id.match(/note_(\d+)/)
      if(match){
        const num = parseInt(match[1])
        if(num >= maxId){ maxId = num + 1 }
      }
    }
    _nextId = maxId
  }
}
