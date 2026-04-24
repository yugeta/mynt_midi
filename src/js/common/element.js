export class Element{
  static get elm_midiFrame(){
    return document.querySelector(`.midi-frame[data-type='editor']`)
  }
  static get elm_headerFrame(){
    return document.querySelector(`.midi-frame[data-type='timeline']`)
  }
  static get elm_keyboard(){
    return this.elm_midiFrame.querySelector('.keyboard')
  }
  static get elm_octaves(){
    return this.elm_keyboard.querySelectorAll(':scope > .octave')
  }
  static get elm_editor(){
    return this.elm_midiFrame.querySelector('.editor')
  }
  static get elm_timeline(){
    return this.elm_headerFrame.querySelector('.timeline')
  }

  static get elm_midi_string(){
    return document.querySelector(`[name='midi-string']`)
  }

  static get octave_count(){
    return 11
  }

  static get oscillator_type(){
    return document.querySelector(`[name='oscillator_type']`).value
  }

  static get elm_time(){
    return document.querySelector(`input[name='time']`)
  }


  static get default_note_width(){
    return 50
  }

  static get notes(){
    return Element.elm_editor.querySelectorAll(`.note`)
  }

  /**
   * Timebar
   */
  static get elm_timebar_area(){
    return document.querySelector(`.timebar-area`)
  }
  static get elm_timebar_scroll(){
    return document.querySelector(`.timebar-scroll`)
  }
  static get elm_timebar_icon(){
    return document.querySelector(`.timebar`)
  }
  static get elm_timebar_line(){
    return Element.elm_editor.querySelector(`:scope > .line`)
  }
  static get elm_mmdd(){
    return document.querySelector(`input[name='mmdd']`)
  }
  static get elm_numbers(){
    return Element.elm_timeline.querySelectorAll(`.sec,.msec`)
  }

  /**
   * Control
   */
  static get elm_play(){
    return document.querySelector(`[name='play'] .play`)
  }
  
  
}