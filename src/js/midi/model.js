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

  /**
   * モデルの notes 配列から MIDI 文字列を生成する。
   *
   * タイムライン分割方式:
   * 1. 全ノートの開始/終了時刻からイベントポイントを生成
   * 2. 各区間で「鳴っているノート」を集計
   * 3. 1音なら単音、2音以上なら和音、0音なら休符として出力
   *
   * これにより部分的に重なるノートも正しく和音として表現される。
   * 例: A(0-4) + B(2-6) → A単音(0-2) + [AB]和音(2-4) + B単音(4-6)
   */
  static toString(){
    if(!_notes.length){return ''}

    // 音符ノートのみ抽出（rest/fadeは別処理）
    const noteEvents = _notes.filter(n => n.type === 'note' && n.octave !== null && n.key !== null)
    const restEvents = _notes.filter(n => n.type === 'rest' || n.type === 'fade')

    if(!noteEvents.length && !restEvents.length){return ''}

    // 全イベントポイント（時刻の集合）を収集
    const timePoints = new Set()
    for(const note of noteEvents){
      timePoints.add(note.startTime)
      timePoints.add(note.startTime + note.tempo)
    }
    for(const rest of restEvents){
      timePoints.add(rest.startTime)
      timePoints.add(rest.startTime + rest.tempo)
    }

    // ソートして区間を作る
    const times = [...timePoints].sort((a, b) => a - b)

    // 先頭が0より大きい場合、冒頭に休符区間を追加
    if(times[0] > 0.001){
      times.unshift(0)
    }

    let result = ''
    let lastTempo = null
    let lastOctave = null
    let lastVolume = null

    for(let i = 0; i < times.length - 1; i++){
      const segStart = times[i]
      const segEnd = times[i + 1]
      const segDuration = segEnd - segStart

      if(segDuration < 0.001){ continue }

      // この区間で鳴っているノートを収集
      const activeNotes = noteEvents.filter(n =>
        n.startTime < segEnd - 0.001 && (n.startTime + n.tempo) > segStart + 0.001
      )

      // この区間にある休符/フェードを確認
      const activeRest = restEvents.find(n =>
        n.startTime < segEnd - 0.001 && (n.startTime + n.tempo) > segStart + 0.001
      )

      const tempoVal = Math.max(1, Math.round(60 / segDuration))

      if(activeNotes.length === 0){
        // 無音区間 → 休符 or フェード
        if(tempoVal !== lastTempo){
          result += `T${tempoVal}`
          lastTempo = tempoVal
        }
        if(activeRest && activeRest.type === 'fade'){
          result += '~'
        } else {
          result += 'S'
        }
      }
      else if(activeNotes.length === 1){
        // 単音
        const n = activeNotes[0]
        if(tempoVal !== lastTempo){
          result += `T${tempoVal}`
          lastTempo = tempoVal
        }
        if(n.volume !== lastVolume && n.volume !== 50){
          result += `V${n.volume}`
          lastVolume = n.volume
        }
        if(n.octave !== lastOctave){
          result += `O${n.octave}`
          lastOctave = n.octave
        }
        result += n.key.toUpperCase()
      }
      else {
        // 和音
        if(tempoVal !== lastTempo){
          result += `T${tempoVal}`
          lastTempo = tempoVal
        }
        result += '['
        for(const n of activeNotes){
          result += `O${n.octave}${n.key.toUpperCase()}`
        }
        result += ']'
        lastOctave = null
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

  /**
   * ノートをモデルから削除する
   * - 単音: そのノートを削除
   * - 和音の1音: その音だけ削除。残りが1音になったら chordId を外して単音化
   * @param {string} id - ノートID
   */
  static removeNote(id){
    const note = _notes.find(n => n.id === id)
    if(!note){ return }

    // ノートを削除
    _notes = _notes.filter(n => n.id !== id)

    // 和音グループだった場合、残りのメンバーを確認
    if(note.chordId){
      const remaining = _notes.filter(n => n.chordId === note.chordId)
      if(remaining.length === 1){
        // 1音だけ残ったら単音化（chordId を外す）
        remaining[0].chordId = null
      }
    }
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
