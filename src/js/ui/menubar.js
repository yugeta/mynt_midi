export class Menubar {
  constructor() {
    this.menubar = document.querySelector('.menubar')
    this.menuItems = this.menubar.querySelectorAll('.menu-item[data-menu]')
    this.isOpen = false
  }

  async init() {
    this.menuItems.forEach(item => {
      const label = item.querySelector('.menu-label')
      if (!label) return

      // クリックでトグル
      label.addEventListener('mousedown', e => {
        e.preventDefault()
        if (item.classList.contains('active')) {
          this.closeAll()
        } else {
          this.openMenu(item)
        }
      })

      // メニューが開いている状態でホバーすると切り替え
      item.addEventListener('mouseenter', () => {
        if (this.isOpen && !item.classList.contains('active')) {
          this.openMenu(item)
        }
      })
    })

    // ドロップダウン項目のクリック
    this.menubar.addEventListener('click', e => {
      const li = e.target.closest('li[data-action]')
      if (!li || li.classList.contains('menu-separator')) return
      const action = li.dataset.action
      if (action) {
        this.handleAction(action)
        this.closeAll()
      }
    })

    // メニュー外クリックで閉じる
    document.addEventListener('mousedown', e => {
      if (!this.menubar.contains(e.target)) {
        this.closeAll()
      }
    })

    // Escで閉じる
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeAll()
    })
  }

  openMenu(item) {
    this.closeAll()
    item.classList.add('active')
    this.isOpen = true
  }

  closeAll() {
    this.menuItems.forEach(m => m.classList.remove('active'))
    this.isOpen = false
  }

  handleAction(action) {
    // 各アクションのディスパッチ（将来的に拡張可能）
    const event = new CustomEvent('menubar-action', { detail: { action } })
    document.dispatchEvent(event)
    console.log(`[Menubar] action: ${action}`)
  }
}
