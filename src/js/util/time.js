import { Css } from '../core/css.js'

/**
 * 時間⇔ピクセル変換ユーティリティ
 */

export function get_msec(){
  const raw = Css.get_css(':root','--time-msec')
  const size = raw ? raw.replace('px' , '') : '50'
  return Number(size)
}

export function set_msec(size){
  Css.set_css(':root','--time-msec', `${size}px`)
}

export function get_width(){
  const raw = Css.get_css(':root', '--time-sec')
  const size = raw ? raw.replace('px' , '') : '1200'
  return Number(size)
}

export function set_width(size){
  Css.set_css(':root', '--time-sec', `${size}px`)
}

export function get_msec_step(){
  return Number(Css.get_css(':root' , '--time-msec-step') || 1)
}

export function get_sec_step(){
  return 10
}

export function get_scale_size(){
  return get_msec() / get_msec_step()
}

export function get_msec_time(){
  return 1000 / get_sec_step() / get_msec_step()
}

export function get_fulltime(){
  return Math.floor(get_width() / get_msec() * 100)
}

export function time2pos(msec){
  const msec_time = Math.floor(msec / get_msec_time()) * get_msec_time()
  return msec_time * get_msec() / get_msec_step() / get_sec_step()
}
