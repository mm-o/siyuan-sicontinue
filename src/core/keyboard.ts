/**
 * 键盘监听 - Alt 单击/双击触发
 */
import { EVENTS } from '../types'

export class KeyboardListener {
  private lastPress = 0
  private clickCount = 0
  private timer: number | null = null
  private delay = 300
  private pressed = false

  init() {
    document.addEventListener('keydown', this.onDown, true)
    document.addEventListener('keyup', this.onUp, true)
  }

  destroy() {
    document.removeEventListener('keydown', this.onDown, true)
    document.removeEventListener('keyup', this.onUp, true)
    this.timer && clearTimeout(this.timer)
  }

  setDoubleClickDelay(delay: number) { this.delay = delay }

  private onDown = (e: KeyboardEvent) => {
    if (e.key !== 'Alt' || this.pressed) return
    this.pressed = true

    // 检查是否在编辑器中
    if (!(e.target as HTMLElement).closest('.protyle-wysiwyg')) return

    const now = Date.now()
    if (now - this.lastPress < this.delay) {
      this.clickCount++
      this.timer && clearTimeout(this.timer)
      this.timer = null

      if (this.clickCount === 2) {
        e.preventDefault()
        e.stopPropagation()
        window.dispatchEvent(new CustomEvent(EVENTS.SHOW_AGENT_SELECTOR))
        this.clickCount = 0
        this.lastPress = 0
        return
      }
    } else {
      this.clickCount = 1
    }

    this.lastPress = now
    this.timer = window.setTimeout(() => {
      if (this.clickCount === 1) {
        window.dispatchEvent(new CustomEvent(EVENTS.TRIGGER_COMPLETION))
      }
      this.clickCount = 0
      this.timer = null
    }, this.delay)
  }

  private onUp = (e: KeyboardEvent) => {
    if (e.key === 'Alt') this.pressed = false
  }
}
