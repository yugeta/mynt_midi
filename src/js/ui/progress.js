/**
 * プログレスオーバーレイ
 *
 * 重い処理中にユーザーに進捗を表示する。
 * ハングアップとの区別がつくようにアニメーション付き。
 */

let _overlay = null

export class Progress {

  /**
   * プログレス表示を開始する
   * @param {string} [message] - 表示メッセージ
   */
  static show(message) {
    if (_overlay) { Progress.hide() }

    _overlay = document.createElement('div')
    _overlay.className = 'progress-overlay'
    _overlay.innerHTML = `
      <div class="progress-content">
        <div class="progress-spinner"></div>
        <div class="progress-message">${message || '処理中...'}</div>
      </div>
    `
    document.body.appendChild(_overlay)
  }

  /**
   * メッセージを更新する
   * @param {string} message
   */
  static update(message) {
    if (!_overlay) { return }
    const el = _overlay.querySelector('.progress-message')
    if (el) { el.textContent = message }
  }

  /**
   * プログレス表示を終了する
   */
  static hide() {
    if (_overlay) {
      _overlay.remove()
      _overlay = null
    }
  }

  /**
   * 重い処理をプログレス付きで実行する
   * UIスレッドを一瞬解放してからコールバックを実行するため、
   * プログレス表示が確実に描画される。
   *
   * @param {string} message - 表示メッセージ
   * @param {Function} fn - 実行する処理（同期でもOK）
   * @returns {Promise<*>} fn の戻り値
   */
  static async run(message, fn) {
    Progress.show(message)
    // UIスレッドを解放して描画を確定させる
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    try {
      const result = await fn()
      return result
    } finally {
      Progress.hide()
    }
  }
}
