/**
 * 补全预览 - 内联 ghost text
 */

import { EVENTS } from '../types'
import { generateCompletion } from './ai'
import { getContextExtractor } from '../main'

export class CompletionPreview {
  private ghost: HTMLSpanElement | null = null
  private cache: string[] = []  // 缓存所有生成的结果
  private index = -1            // 当前索引
  private active = false
  private range: Range | null = null
  private loading = false

  constructor() {
    document.addEventListener('keydown', this.onKeyDown, true)
    window.addEventListener(EVENTS.TRIGGER_COMPLETION, this.show as EventListener)
  }

  destroy() {
    document.removeEventListener('keydown', this.onKeyDown, true)
    window.removeEventListener(EVENTS.TRIGGER_COMPLETION, this.show as EventListener)
    this.hide()
  }

  show = async () => {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    
    this.range = sel.getRangeAt(0).cloneRange()
    this.cache = []
    this.index = -1
    this.active = true
    
    await this.generate()
  }

  hide = () => {
    this.ghost?.remove()
    this.ghost = null
    this.active = false
    this.range = null
    this.loading = false
  }

  private render(text: string) {
    this.ghost?.remove()
    if (!this.range || !text) return
    
    this.ghost = document.createElement('span')
    this.ghost.textContent = text
    this.ghost.style.cssText = 'color:#999;opacity:0.6;font-style:italic;pointer-events:none;'
    this.ghost.contentEditable = 'false'
    
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(this.range.cloneRange())
    
    const r = sel?.getRangeAt(0)
    if (r) {
      r.insertNode(this.ghost)
      r.setStartBefore(this.ghost)
      r.collapse(true)
    }
  }

  private async generate() {
    this.render('正在生成...')
    this.loading = true
    
    const context = await getContextExtractor()?.extract()
    if (!context) {
      this.render('无法获取上下文')
      this.loading = false
      return
    }
    
    const result = await generateCompletion(context.content, context.beforeCursor, context.afterCursor)
    this.loading = false
    
    if (result) {
      this.cache.push(result)
      this.index = this.cache.length - 1
      this.render(result)
    } else {
      this.render('生成失败，请检查思源 AI 配置')
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.active) return
    
    if (this.loading) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        this.hide()
      }
      return
    }
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        this.prev()
        break
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        this.next()
        break
      case 'Tab':
      case 'Enter':
        e.preventDefault()
        e.stopPropagation()
        this.confirm()
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        this.hide()
        break
      default:
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
          this.hide()
        }
    }
  }

  private prev() {
    if (this.index > 0) {
      this.index--
      this.render(this.cache[this.index])
    }
  }

  private async next() {
    // 有缓存则使用缓存
    if (this.index < this.cache.length - 1) {
      this.index++
      this.render(this.cache[this.index])
    } else {
      // 没有缓存则生成新的
      await this.generate()
    }
  }

  private confirm() {
    // 从缓存获取文本，而不是从 DOM
    const text = this.index >= 0 ? this.cache[this.index] : null
    
    // 先移除 ghost
    this.ghost?.remove()
    this.ghost = null
    
    if (text && this.range) {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(this.range)
      document.execCommand('insertText', false, text)
    }
    
    this.active = false
    this.range = null
    this.cache = []
    this.index = -1
  }
}
