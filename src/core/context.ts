/**
 * 上下文获取
 */

import type { Plugin } from 'siyuan'
import type { Context, ContextRange } from '../types'
import { getBlockByID } from '../api'

export class ContextExtractor {
  private plugin: Plugin
  private contextRange: ContextRange = 'blocks'
  private beforeBlocks = 3
  private afterBlocks = 3

  constructor(plugin: Plugin) {
    this.plugin = plugin
  }

  setContextRange(range: ContextRange, before?: number, after?: number) {
    this.contextRange = range
    if (before !== undefined) this.beforeBlocks = before
    if (after !== undefined) this.afterBlocks = after
  }

  async extract(): Promise<Context | null> {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return null

    const range = sel.getRangeAt(0)
    const block = this.findBlock(range.startContainer)
    if (!block) return null

    const blockId = block.getAttribute('data-node-id')
    if (!blockId) return null

    const info = await getBlockByID(blockId)
    if (!info) return null

    const blockText = block.textContent || ''
    const before = this.getTextBefore(block, range)
    const after = this.getTextAfter(block, range)
    const content = await this.getContent(block, info.root_id)
    const title = await this.getTitle(info.root_id)

    return {
      blockId,
      blockType: info.type,
      cursorPosition: { line: 0, ch: before.length },
      beforeCursor: before,
      afterCursor: after,
      currentLine: blockText,
      currentParagraph: blockText,
      selection: range.toString(),
      title,
      content,
      fullContent: content,
      documentId: info.root_id,
      path: info.hpath || ''
    }
  }

  private findBlock(node: Node): HTMLElement | null {
    let el = node as HTMLElement
    while (el && el !== document.body) {
      if (el.nodeType === 1 && el.hasAttribute('data-node-id')) return el
      el = el.parentElement as HTMLElement
    }
    return null
  }

  private getTextBefore(block: HTMLElement, range: Range): string {
    const r = document.createRange()
    r.selectNodeContents(block)
    r.setEnd(range.startContainer, range.startOffset)
    return r.toString()
  }

  private getTextAfter(block: HTMLElement, range: Range): string {
    const r = document.createRange()
    r.setStart(range.endContainer, range.endOffset)
    r.selectNodeContents(block)
    r.setEndAfter(block.lastChild || block)
    return r.toString()
  }

  private async getContent(block: HTMLElement, docId: string): Promise<string> {
    switch (this.contextRange) {
      case 'full':
        return document.querySelector('.protyle-wysiwyg')?.textContent || ''
      case 'blocks':
        return this.getBlocks(block)
      default:
        return block.textContent || ''
    }
  }

  private getBlocks(block: HTMLElement): string {
    const texts: string[] = []
    
    let prev = block.previousElementSibling as HTMLElement
    let count = 0
    while (prev && count < this.beforeBlocks) {
      if (prev.hasAttribute('data-node-id')) {
        texts.unshift(prev.textContent || '')
        count++
      }
      prev = prev.previousElementSibling as HTMLElement
    }

    texts.push(block.textContent || '')

    let next = block.nextElementSibling as HTMLElement
    count = 0
    while (next && count < this.afterBlocks) {
      if (next.hasAttribute('data-node-id')) {
        texts.push(next.textContent || '')
        count++
      }
      next = next.nextElementSibling as HTMLElement
    }

    return texts.join('\n\n')
  }

  private async getTitle(docId: string): Promise<string> {
    const el = document.querySelector('.protyle-title__input')
    if (el?.textContent) return el.textContent
    const info = await getBlockByID(docId)
    return info?.content || ''
  }
}
