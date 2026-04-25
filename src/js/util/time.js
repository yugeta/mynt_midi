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

/**
 * タイムライン表示範囲（秒）を取得する
 * Time 入力欄の値。タイムライン全体が何秒分を表示しているか。
 */
export function get_timeline_sec(){
  const elm = document.querySelector(`input[name='time']`)
  const val = elm ? Number(elm.value) : 0
  return val > 0 ? val : get_fulltime() / 1000
}

/**
 * 1秒あたりのピクセル数を取得する
 */
export function get_px_per_sec(){
  const sec = get_timeline_sec()
  return sec > 0 ? get_width() / sec : 0
}

/**
 * 秒 → ピクセル変換
 * @param {number} sec - 秒
 * @returns {number} ピクセル
 */
export function sec2px(sec){
  return sec * get_px_per_sec()
}

/**
 * ピクセル → 秒変換
 * @param {number} px - ピクセル
 * @returns {number} 秒
 */
export function px2sec(px){
  const pps = get_px_per_sec()
  return pps > 0 ? px / pps : 0
}

// --- スケール管理 ---

const _baseMsec = 50  // デフォルトの --time-msec 値

/**
 * 現在のスケール倍率を取得（1.0 = 100%）
 */
export function get_scale(){
  return get_msec() / _baseMsec
}

/**
 * スケール倍率を適用する
 * --time-msec を baseMsec × scale に変更する
 * @param {number} scale - 倍率（0.25〜4.0）
 */
export function apply_scale(scale){
  scale = Math.max(0.25, Math.min(4.0, scale))
  set_msec(_baseMsec * scale)
}

/**
 * Time(秒) から --time-sec の幅を計算して設定する
 * 全箇所で統一的に使う（--time-msec の現在値を使うのでスケールが自動反映される）
 * @param {number} sec - Time の秒数
 */
export function apply_timeline_width(sec){
  const msec = get_msec()
  const sec_step = 10
  const newWidth = sec * sec_step * msec
  set_width(newWidth)
}
