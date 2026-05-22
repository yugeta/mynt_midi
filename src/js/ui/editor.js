import { Element }  from './element.js'
import { Css }      from '../core/css.js'
import { get_pos_x, get_pos_y } from '../util/position.js'
import { get_msec, get_msec_step, get_fulltime, set_width, sec2px, apply_timeline_width } from '../util/time.js'
import { MidiSerializer } from '../midi/serializer.js'
import { MidiModel } from '../midi/model.js'
import { MidiParser } from '../midi/parser.js'
import { MidiPlayer } from '../midi/player.js'
import { LayerModel } from '../midi/layer-model.js'
import { UndoManager } from '../controller/undo-manager.js'
import { Timeline } from './timeline.js'

export class Editor{
  /** プレビュー再生中のノートハンドル */
  static _previewNote = null

  constructor(){}

  async init(){
    this.clear()
    this.set_octave()
    this.set_event()
    this.view_line()
    this.fit_height()
  }

  clear(){
    Element.elm_editor.innerHTML = ''
  }

  set_event(){
    Element.elm_editor.addEventListener('mousedown' , this.mousedown_editor.bind(this))
    Element.elm_editor.addEventListener('mousemove' , this.mousemove_editor.bind(this))
    Element.elm_editor.addEventListener('mouseup'   , this.mouseup_editor.bind(this))
    // ホバーイベント（旧event.jsから統合）
    Element.elm_editor.addEventListener('mouseover' , this.mouseover_key.bind(this))
    Element.elm_editor.addEventListener('mouseout'  , this.clear_editor_active.bind(this))

    if(Editor._click_note_handler){
      window.removeEventListener('mousedown', Editor._click_note_handler)
    }
    Editor._click_note_handler = this.click_note.bind(this)
    window.addEventListener('mousedown', Editor._click_note_handler)

    // Delete/Backspaceキーで選択中のノートを削除
    if(Editor._keydown_handler){
      window.removeEventListener('keydown', Editor._keydown_handler)
    }
    Editor._keydown_handler = this.keydown_delete.bind(this)
    window.addEventListener('keydown', Editor._keydown_handler)
  }

  set_octave(){
    const keyboard_octaves = Element.elm_octaves
    for(const keyboard_octave of keyboard_octaves){
      const octave_num = keyboard_octave.getAttribute('data-octave')
      const editor_octave = document.createElement('div')
      editor_octave.classList.add('octave')
      editor_octave.setAttribute('data-octave' , octave_num)
      Element.elm_editor.appendChild(editor_octave)
      this.set_dataLine(keyboard_octave, editor_octave)
    }
  }

  set_dataLine(keyboard_octave, editor_octave){
    const keys = keyboard_octave.querySelectorAll(':scope > *')
    for(const key of keys){
      const div = document.createElement('div')
      div.setAttribute('data-type', key.getAttribute('data-type'))
      div.setAttribute('data-key' , key.getAttribute('data-key'))
      editor_octave.appendChild(div)
    }
  }

  /**
   * mousedown 統合ハンドラ:
   * - 既存ノート右端 → リサイズ開始
   * - 既存ノート中央〜左 → ドラッグ移動開始 + プレビュー音
   * - 空き領域 → ノート配置ドラッグ開始 + プレビュー音
   */
  mousedown_editor(e){
    const RESIZE_ZONE = 6 // 右端からのリサイズ判定幅(px)

    // 既存ノート上の操作
    const note = e.target.closest('.note')
    if(note){
      if(note.classList.contains('layer-inactive')){return}

      // リサイズ判定: ノート右端付近か？
      const noteRect = note.getBoundingClientRect()
      const isResizeZone = (e.clientX >= noteRect.right - RESIZE_ZONE)

      if(isResizeZone){
        // リサイズモード
        this._drag = {
          mode: 'resize',
          elm: note,
          startX: e.pageX,
          origWidth: note.offsetWidth,
        }
        Element.elm_editor.classList.add('dragging')
      } else {
        // 移動モード
        const soloMove = e.altKey  // Alt+ドラッグ: 和音から切り離して単独移動

        // 和音グループを収集（同じ開始位置のノート群）
        const chordNotes = soloMove ? [] : this._getChordGroup(note)

        this._drag = {
          mode: 'move',
          elm: note,
          mouseX: e.pageX,
          mouseY: e.pageY,
          left: note.offsetLeft,
          top: note.offsetTop,
          origWidth: note.offsetWidth,
          soloMove: soloMove,
          chordNotes: chordNotes,  // 一括移動する他のノート
          chordOrigPositions: chordNotes.map(n => ({ elm: n, left: n.offsetLeft })),
        }
        Element.elm_editor.classList.add('dragging')
        const key = note.getAttribute('data-key')
        const octave = note.getAttribute('data-octave')
        Editor._startPreview(key, octave)
      }
      return
    }

    // 空き領域: ノート配置ドラッグ開始
    if(!e.target.closest('.octave [data-key]')){return}
    const octave   = this.get_octave(e.target)
    const key      = this.get_key(e.target)
    const key_elm  = e.target.closest('[data-key]')
    const octave_rect = key_elm.closest('.octave')
    const key_type = key_elm.getAttribute('data-type')
    const pos = {
      x : get_pos_x(e.pageX),
      y : get_pos_y(key_elm.offsetTop + octave_rect.offsetTop),
    }
    const left = this.note_pos_adjust(pos.x)
    const step = this._getSnapStep()

    // 初期幅: マウスの実座標とスナップ後の左端の差分（最小1グリッド）
    // get_pos_x は default_note_width/2 を引くので、生のエディタ内座標を別途計算
    const editor_rect = Element.elm_editor.getBoundingClientRect()
    const rawX = e.pageX - editor_rect.left + Element.elm_editor.scrollLeft
    const initWidth = Math.max(step, Math.ceil((rawX - left) / step) * step)

    const modelNote = MidiModel.addNote(octave, key, left)

    // 同じ時間帯に既存ノートがある場合、和音として開始位置と幅を揃える
    const overlap = this._findOverlappingNote(left, initWidth, null)
    const finalLeft = overlap ? overlap.left : left
    const finalWidth = overlap ? overlap.width : initWidth

    this.put_note_editor(pos.y, finalLeft, key_type, octave, key, modelNote.id, finalWidth)
    // 仮配置のDOM要素を取得
    const placedNote = Element.elm_editor.querySelector(`.note[data-model-id='${modelNote.id}']`)

    this._drag = {
      mode: 'place',
      elm: placedNote,
      anchorLeft: finalLeft,
      startX: e.pageX,
      initWidth: finalWidth,
      modelId: modelNote.id,
    }
    Element.elm_editor.classList.add('dragging')

    // プレビュー音
    Editor._playPreview(key, octave)
  }

  /**
   * MIDI文字列の実再生時間をTime入力欄に反映（超過時のみ拡張）
   */
  static _syncTimeDisplay(){
    const str = Element.elm_midi_string ? Element.elm_midi_string.value : ''
    if(!str || !Element.elm_time){ return }
    const datas = MidiParser.get_code(str)
    if(!datas || !datas.length){ return }

    const duration = datas[datas.length - 1].time
    const currentTime = Number(Element.elm_time.value) || 0

    if(duration > currentTime){
      const sec = Math.ceil(duration * 10) / 10
      Element.elm_time.value = sec
      apply_timeline_width(sec)
      new Timeline().init()
    }
  }

  fit_height(){
    // CSS flex レイアウトで自動フィットするため、明示的な高さ設定は不要
  }

  get_key(elm){
    const elm_key = elm.closest('[data-key]')
    return elm_key ? elm_key.getAttribute('data-key') : null
  }
  get_octave(elm){
    const elm_octave = elm.closest('.octave')
    return elm_octave ? elm_octave.getAttribute('data-octave') : null
  }

  put_note_editor(top, left, type, octave, key, modelId, noteWidth){
    const width = noteWidth || Element.default_note_width
    const note = document.createElement('div')
    note.classList.add('note')
    note.style.setProperty('left'  , `${left}px`,'')
    note.style.setProperty('top'   , `${top}px`,'')
    note.style.setProperty('width' , `${Math.max(4, width)}px`,'')
    note.setAttribute('data-type'   , type)
    note.setAttribute('data-octave' , octave)
    note.setAttribute('data-key'    , key)
    note.setAttribute('data-status' , 'active')
    if(modelId){
      note.setAttribute('data-model-id', modelId)
    }
    Element.elm_editor.appendChild(note)
  }

  mousemove_editor(e){
    if(!this._drag){return}

    this._drag.moved = true
    const step = this._getSnapStep()

    if(this._drag.mode === 'place'){
      // 配置ドラッグ: 右方向にノート幅を伸ばす
      const dx = e.pageX - this._drag.startX
      const rawWidth = this._drag.initWidth + Math.max(0, dx)
      const snappedWidth = Math.max(step, Math.round(rawWidth / step) * step)

      // Alt押下時は和音スナップを無効化（自由サイズ変更）
      if(e.altKey){
        this._drag.elm.style.setProperty('width', `${snappedWidth}px`, '')
      } else {
        // 和音スナップ: 重なるノートがあればその開始位置と幅に合わせる
        const noteLeft = this._drag.elm.offsetLeft
        const overlap = this._findOverlappingNote(noteLeft, snappedWidth, this._drag.elm)
        if(overlap){
          this._drag.elm.style.setProperty('left', `${overlap.left}px`, '')
          this._drag.elm.style.setProperty('width', `${overlap.width}px`, '')
        } else {
          this._drag.elm.style.setProperty('width', `${snappedWidth}px`, '')
        }
      }
    }
    else if(this._drag.mode === 'resize'){
      // リサイズ: 右端をドラッグ
      const dx = e.pageX - this._drag.startX
      const rawWidth = this._drag.origWidth + dx
      const snappedWidth = Math.max(step, Math.round(rawWidth / step) * step)

      // Alt押下時は和音スナップを無効化（自由サイズ変更）
      if(e.altKey){
        this._drag.elm.style.setProperty('width', `${snappedWidth}px`, '')
      } else {
        // 和音スナップ: 重なるノートがあればその開始位置と幅に合わせる
        const noteLeft = this._drag.elm.offsetLeft
        const overlap = this._findOverlappingNote(noteLeft, snappedWidth, this._drag.elm)
        if(overlap){
          this._drag.elm.style.setProperty('left', `${overlap.left}px`, '')
          this._drag.elm.style.setProperty('width', `${overlap.width}px`, '')
        } else {
          this._drag.elm.style.setProperty('width', `${snappedWidth}px`, '')
        }
      }
    }
    else if(this._drag.mode === 'move'){
      // 移動: 横方向
      let left = this._drag.left - (this._drag.mouseX - e.pageX)
      left = this.note_pos_adjust(left)
      if(left < 0){ left = 0 }

      if(this._drag.soloMove){
        // Alt+ドラッグ: 単独で自由移動（和音スナップなし）
        this._drag.elm.style.setProperty('left', `${left}px`, '')
        // 元の幅に戻す
        this._drag.elm.style.setProperty('width', `${this._drag.origWidth}px`, '')
      } else {
        // 通常ドラッグ: 和音グループごと一括移動
        const dx = left - this._drag.left
        this._drag.elm.style.setProperty('left', `${left}px`, '')

        // 和音グループの他のノートも同じ量だけ移動
        for(const pos of this._drag.chordOrigPositions){
          const newLeft = pos.left + dx
          pos.elm.style.setProperty('left', `${Math.max(0, newLeft)}px`, '')
        }
      }

      // 縦方向: マウス位置から最も近いキー行にスナップ（メインノートのみ）
      const editor_rect = Element.elm_editor.getBoundingClientRect()
      const mouseY_in_editor = e.pageY - editor_rect.top + Element.elm_editor.scrollTop
      const key_row = this.find_key_row_at(mouseY_in_editor)
      if(key_row){
        const top = key_row.elm.offsetTop + key_row.octave.offsetTop
        this._drag.elm.style.setProperty('top', `${top}px`, '')
        this._drag.elm.setAttribute('data-type'  , key_row.elm.getAttribute('data-type'))
        this._drag.elm.setAttribute('data-key'   , key_row.elm.getAttribute('data-key'))
        this._drag.elm.setAttribute('data-octave', key_row.octave.getAttribute('data-octave'))
        // 行が変わったらプレビュー音を切り替える
        const newKey = key_row.elm.getAttribute('data-key')
        const newOctave = key_row.octave.getAttribute('data-octave')
        if(newKey !== this._drag._prevKey || newOctave !== this._drag._prevOctave){
          Editor._startPreview(newKey, newOctave)
          this._drag._prevKey = newKey
          this._drag._prevOctave = newOctave
        }
      }
    }
  }

  find_key_row_at(y){
    const octaves = Element.elm_editor.querySelectorAll('.octave')
    for(const octave of octaves){
      const ot = octave.offsetTop
      const oh = octave.offsetHeight
      if(y < ot || y >= ot + oh){ continue }
      const keys = octave.querySelectorAll('[data-key]')
      let closest = null
      let minDist = Infinity
      for(const key of keys){
        const kt = ot + key.offsetTop
        const kh = key.offsetHeight
        const center = kt + kh / 2
        const dist = Math.abs(y - center)
        if(dist < minDist){
          minDist = dist
          closest = { elm: key, octave: octave }
        }
      }
      return closest
    }
    return null
  }
  mouseup_editor(e){
    if(!this._drag){return}
    const mode = this._drag.mode
    const moved = this._drag.moved
    this._drag = null
    Element.elm_editor.classList.remove('dragging')
    // プレビュー音を止める（移動モード用）
    Editor._stopPreview()
    // 実際にドラッグ（移動/リサイズ/配置）が行われた場合のみモデルに同期
    if(moved || mode === 'place'){
      MidiSerializer.syncToTextarea(Element.elm_editor, Element.elm_midi_string)
      Editor._syncTimeDisplay()
      UndoManager.push()
    }
  }

  note_pos_adjust(num){
    const step_size = get_msec() / get_msec_step()
    return Math.floor(num / step_size) * step_size
  }

  /** スナップのグリッド幅(px)を返す */
  _getSnapStep(){
    return get_msec() / get_msec_step()
  }

  /**
   * 指定ノートと同じ開始位置にある他のノートを返す（和音グループ）
   * @param {HTMLElement} noteElm - 基準ノート
   * @returns {Array<HTMLElement>} 同じ位置の他のノート（基準ノート自身は含まない）
   */
  _getChordGroup(noteElm){
    const left = parseFloat(noteElm.style.left) || noteElm.offsetLeft
    const threshold = 4
    const notes = Element.elm_editor.querySelectorAll('.note:not(.layer-inactive)')
    const group = []
    for(const note of notes){
      if(note === noteElm){ continue }
      const noteLeft = parseFloat(note.style.left) || note.offsetLeft
      if(Math.abs(noteLeft - left) <= threshold){
        group.push(note)
      }
    }
    return group
  }

  /**
   * 指定ノートと同じ開始位置にある他のノートがあればその幅を返す（配置時の初期幅揃え用）
   * @param {number} left - スナップ済みの左端位置(px)
   * @returns {number} 既存ノートの幅。なければ 0
   */
  _getExistingNoteWidth(left){
    const notes = Element.elm_editor.querySelectorAll('.note:not(.layer-inactive)')
    const threshold = 2
    for(const note of notes){
      if(Math.abs(note.offsetLeft - left) <= threshold){
        return note.offsetWidth
      }
    }
    return 0
  }

  /**
   * 時間的に重なるノートを探し、そのノートの左端と幅を返す（和音スナップ用）
   * 「重なる」= 2つのノートの時間範囲が少しでもオーバーラップする
   *
   * @param {number} noteLeft - 対象ノートの左端(px)
   * @param {number} noteWidth - 対象ノートの幅(px)
   * @param {HTMLElement} excludeElm - 自分自身（除外）
   * @returns {{left: number, width: number}|null} 重なるノートの位置と幅。なければ null
   */
  _findOverlappingNote(noteLeft, noteWidth, excludeElm){
    const noteRight = noteLeft + noteWidth
    const notes = Element.elm_editor.querySelectorAll('.note:not(.layer-inactive)')
    const threshold = 2

    for(const note of notes){
      if(note === excludeElm){ continue }

      const existLeft = note.offsetLeft
      const existRight = existLeft + note.offsetWidth

      // 時間的に重なるか判定（少しでもオーバーラップ）
      if(noteLeft < existRight - threshold && noteRight > existLeft + threshold){
        return { left: existLeft, width: note.offsetWidth }
      }
    }
    return null
  }

  click_note(e){
    this.clear_status_all_note()
    const note = e.target.closest('.editor .note')
    // アクティブレイヤーのノートのみ選択可能
    if(note && !note.classList.contains('layer-inactive')){
      note.setAttribute('data-status' , 'active')
    }
  }

  /**
   * Delete/Backspaceキーで選択中のノートを削除する
   */
  keydown_delete(e){
    if(e.key !== 'Delete' && e.key !== 'Backspace'){ return }
    // テキスト入力中は無視
    if(e.target.closest('input, textarea, select')){ return }

    const activeNotes = Element.elm_editor.querySelectorAll(`.note[data-status='active']`)
    if(!activeNotes.length){ return }

    e.preventDefault()

    for(const note of activeNotes){
      const modelId = note.getAttribute('data-model-id')
      if(modelId){
        MidiModel.removeNote(modelId)
      }
      note.remove()
    }

    // モデルからMIDI文字列を再生成してtextareaに反映
    MidiSerializer.syncToTextarea(Element.elm_editor, Element.elm_midi_string)
    Editor._syncTimeDisplay()
    UndoManager.push()
  }
  clear_status_all_note(){
    const elms = Element.elm_editor.querySelectorAll(`.note[data-status='active']`)
    for(const elm of elms){ elm.removeAttribute('data-status') }
  }

  // ホバーハイライト
  mouseover_key(e){
    const elm_octave = e.target.closest('.octave')
    const elm_key    = e.target.closest('[data-key]')
    if(!elm_octave || !elm_key){return}
  }
  clear_editor_active(){}

  // 縦棒ライン
  view_line(){
    const line = document.createElement('div')
    line.classList.add('line')
    const height = Element.elm_editor.scrollHeight
    line.style.setProperty('height',`${height}px`,'')
    Element.elm_editor.appendChild(line)
  }

  // --- プレビュー音再生ヘルパー ---

  /** クリック配置時: 短い音を鳴らす */
  static _playPreview(key, octave){
    const active = LayerModel.activeLayer
    const oscType = active ? active.oscillatorType : 'square'
    MidiPlayer.startNote(key, octave, { oscillatorType: oscType }).then(handle => {
      if(!handle){ return }
      // 150ms 後に自動停止
      setTimeout(() => MidiPlayer.stopNote(handle), 150)
    })
  }

  /** ドラッグ中: 持続音を開始（前の音は止める） */
  static _startPreview(key, octave){
    Editor._stopPreview()
    const active = LayerModel.activeLayer
    const oscType = active ? active.oscillatorType : 'square'
    MidiPlayer.startNote(key, octave, { oscillatorType: oscType }).then(handle => {
      Editor._previewNote = handle
    })
  }

  /** ドラッグ終了: 持続音を停止 */
  static _stopPreview(){
    if(Editor._previewNote){
      MidiPlayer.stopNote(Editor._previewNote)
      Editor._previewNote = null
    }
  }
}
