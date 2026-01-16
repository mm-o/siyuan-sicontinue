/**
 * 键盘监听核心组件
 * 负责监听 Alt 键的单击和双击事件
 */

import type { Plugin } from 'siyuan'
import { EVENTS } from '../types'
import { pushMsg } from '../api'

export class KeyboardListener {
  private plugin: Plugin
  private lastAltPressTime = 0
  private altClickCount = 0
  private doubleClickTimer: number | null = null
  private doubleClickDelay = 300
  private isAltPressed = false

  constructor(plugin: Plugin) {
    this.plugin = plugin
  }

  /**
   * 初始化键盘监听
   */
  init() {
    document.addEventListener('keydown', this.handleKeyDown, true)
    document.addEventListener('keyup', this.handleKeyUp, true)
  }

  /**
   * 销毁键盘监听
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown, true)
    document.removeEventListener('keyup', this.handleKeyUp, true)
    if (this.doubleClickTimer) {
      clearTimeout(this.doubleClickTimer)
      this.doubleClickTimer = null
    }
  }

  /**
   * 处理 keydown 事件
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    // 只处理 Alt 键
    if (event.key !== 'Alt') {
      return
    }

    // 防止重复触发（按住 Alt 键会持续触发 keydown）
    if (this.isAltPressed) {
      return
    }
    this.isAltPressed = true

    // 检查是否在编辑器中
    const target = event.target as HTMLElement
    if (!this.isInEditor(target)) {
      return
    }

    const now = Date.now()
    const timeSinceLastPress = now - this.lastAltPressTime

    // 双击检测
    if (timeSinceLastPress < this.doubleClickDelay) {
      this.altClickCount++
      
      // 清除单击定时器
      if (this.doubleClickTimer) {
        clearTimeout(this.doubleClickTimer)
        this.doubleClickTimer = null
      }

      // 触发双击
      if (this.altClickCount === 2) {
        this.handleDoubleClick(event)
        this.altClickCount = 0
        this.lastAltPressTime = 0
        return
      }
    } else {
      // 重置计数
      this.altClickCount = 1
    }

    this.lastAltPressTime = now

    // 延迟触发单击，等待可能的第二次点击
    this.doubleClickTimer = window.setTimeout(() => {
      if (this.altClickCount === 1) {
        this.handleSingleClick(event)
      }
      this.altClickCount = 0
      this.doubleClickTimer = null
    }, this.doubleClickDelay)
  }

  /**
   * 处理 keyup 事件
   */
  private handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Alt') {
      this.isAltPressed = false
    }
  }

  /**
   * 检查是否在编辑器中
   */
  private isInEditor(target: HTMLElement): boolean {
    // 检查是否在 protyle-wysiwyg 编辑器中
    return !!target.closest('.protyle-wysiwyg')
  }

  /**
   * 处理单击事件
   */
  private handleSingleClick(event: KeyboardEvent) {
    event.preventDefault()
    event.stopPropagation()
    pushMsg('🚀 Alt 单击 - 准备补全...', 2000)
    window.dispatchEvent(new CustomEvent(EVENTS.TRIGGER_COMPLETION))
  }

  /**
   * 处理双击事件
   */
  private handleDoubleClick(event: KeyboardEvent) {
    event.preventDefault()
    event.stopPropagation()
    window.dispatchEvent(new CustomEvent(EVENTS.SHOW_AGENT_SELECTOR))
  }

  /**
   * 设置双击延迟时间
   */
  setDoubleClickDelay(delay: number) {
    this.doubleClickDelay = delay
  }
}
