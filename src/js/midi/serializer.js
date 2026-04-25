import { Element } from '../ui/element.js'
import { get_width } from '../util/time.js'
import { StringInput } from '../controller/string-input.js'

/**
 * エディタ上の音符 → MIDI文字列への逆変換
 *
 * 処理:
 * 1. 全 .note 要素を取得して left でソート
 * 2. 同じ left の音符をグループ化（和音）
 * 3. 位置の差分からテンポを計算
 * 4. 各グループを MIDI 記法に変換
 * 5. 無音区間があれば S を挿入
 */

export class MidiSerializer{

  /**
   * エディタ上の音符からMIDI文字列を生成する
   * @returns {string} MIDI文字列
   */
  static editor2string(){
    const notes = [...Element.elm_editor.querySelectorAll('.note')]
    if(!notes.length){return ''}

    // left でソート
    notes.sort((a, b) => a.offsetLeft - b.offsetLeft)

    // 同じ left の音符をグループ化
    const groups = []
    let currentLeft = -1
    for(const note of notes){
      const left = note.offsetLeft
      if(left !== currentLeft){
        groups.push({ left: left, notes: [] })
        currentLeft = left
      }
      groups[groups.length - 1].notes.push({
        octave : note.getAttribute('data-octave'),
        key    : note.getAttribute('data-key'),
      })
    }

    // タイムライン幅と現在のMIDI再生時間から、位置→時間の変換係数を算出
    const timelineWidth = get_width()
    const midi_string = Element.elm_midi_string.value
    const totalDuration = StringInput.getMidiDuration(midi_string) || 1

    // 位置(px) → 時間(秒) の変換
    const px2sec = totalDuration / timelineWidth

    let result = ''
    let lastTime = 0
    let lastTempo = null

    for(const group of groups){
      const time = group.left * px2sec

      // 前のグループとの時間差から無音区間を検出
      const gap = time - lastTime
      if(gap > 0){
        // テンポ = 60 / gap（4分音符1つ分の時間 = gap秒）
        const tempo = Math.round(60 / gap)
        if(tempo !== lastTempo){
          result += `T${tempo}`
          lastTempo = tempo
        }

        // 無音区間が音符間隔の2倍以上なら休符を挿入
        // （前の音符のテンポでの1音分より大きい場合）
        if(lastTime > 0 && lastTempo){
          const expectedGap = 60 / lastTempo
          if(gap > expectedGap * 1.5){
            result += 'S'
          }
        }
      }

      // 音符をMIDI記法に変換
      if(group.notes.length === 1){
        // 単音
        const n = group.notes[0]
        result += `O${n.octave}${n.key.toUpperCase()}`
      }
      else{
        // 和音
        result += '['
        for(const n of group.notes){
          result += `O${n.octave}${n.key.toUpperCase()}`
        }
        result += ']'
      }

      lastTime = time + (lastTempo ? 60 / lastTempo : 0)
    }

    return result
  }

  /**
   * エディタの音符状態を textarea に同期する
   */
  static syncToTextarea(){
    const str = MidiSerializer.editor2string()
    Element.elm_midi_string.value = str
  }
}
