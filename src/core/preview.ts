/**
 * 补全预览 - 内联 ghost text
 * idx < cache.length: 显示缓存结果
 * idx = cache.length: 显示"生成中"（虚拟项）
 */
import { EVENTS, type Agent } from '../types'
import { generateWithAgent } from './ai'
import { getContextExtractor, getSettingsManager } from '../main'
import { getSkillEngine } from './skill'

export class CompletionPreview {
  private ghost: HTMLSpanElement | null = null
  private cache: string[] = []
  private idx = 0
  private active = false
  private loading = false
  private agents: Agent[] = []
  private agentIdx = 0
  private anchor: { node: Node; offset: number } | null = null

  constructor() {
    document.addEventListener('keydown', this.onKey, true)
    window.addEventListener(EVENTS.TRIGGER_COMPLETION, this.onTrigger as EventListener)
  }

  destroy() {
    document.removeEventListener('keydown', this.onKey, true)
    window.removeEventListener(EVENTS.TRIGGER_COMPLETION, this.onTrigger as EventListener)
    this.hide()
  }

  private get agent() { return this.agents[this.agentIdx] }

  private onTrigger = (e: CustomEvent<{ agentIds?: string[] }>) => {
    const s = getSettingsManager()?.settings
    if (!s) return
    const ids = e.detail?.agentIds
    this.agents = ids?.length
      ? ids.map(id => s.agents.find(a => a.id === id)).filter((a): a is Agent => !!a?.enabled)
      : s.agents.filter(a => a.id === s.defaultAgent && a.enabled)
    if (this.agents.length) { this.agentIdx = 0; this.start() }
  }

  private start() {
    const sel = window.getSelection()
    if (!sel?.rangeCount || !sel.anchorNode) return
    this.anchor = { node: sel.anchorNode, offset: sel.anchorOffset }
    this.cache = []
    this.idx = 0
    this.active = true
    this.generate()
  }

  private hide() {
    this.ghost?.remove()
    Object.assign(this, { ghost: null, active: false, loading: false, agents: [], agentIdx: 0, anchor: null })
  }

  private show() {
    const text = this.idx < this.cache.length
      ? this.cache[this.idx]
      : this.loading && this.agent ? `${this.agent.icon} 生成中...` : ''
    this.render(text)
  }

  private render(text: string) {
    this.ghost?.remove()
    this.ghost = null
    if (!this.anchor || !text) return

    const ghost = document.createElement('span')
    ghost.className = 'sc-ghost'
    ghost.textContent = text
    ghost.style.cssText = 'color:var(--b3-theme-on-surface-light);opacity:.7;font-style:italic;pointer-events:none;user-select:none;'
    ghost.contentEditable = 'false'

    try {
      const r = document.createRange()
      r.setStart(this.anchor.node, this.anchor.offset)
      r.collapse(true)
      r.insertNode(ghost)
      this.ghost = ghost
      // 光标定位到 ghost 前
      const sel = window.getSelection()
      sel?.removeAllRanges()
      const nr = document.createRange()
      nr.setStartBefore(ghost)
      nr.collapse(true)
      sel?.addRange(nr)
    } catch { ghost.remove() }
  }

  private async generate() {
    if (!this.agent) return this.render('没有可用的智能体')

    const targetIdx = this.cache.length
    this.idx = targetIdx
    this.loading = true
    this.show()

    const ctx = await getContextExtractor()?.extract()
    if (!ctx) { this.loading = false; return this.render('无法获取上下文') }

    // 上下文增强：查询相关笔记
    const settings = getSettingsManager()?.settings
    const skill = getSkillEngine()
    let notes = ''
    
    if (settings?.noteQueryEnabled && this.agent.useNoteQuery !== false) {
      try {
        const enhanced = await skill.enhance(ctx)
        if (enhanced.relatedNotes?.length) {
          notes = '相关笔记：\n' + enhanced.relatedNotes.join('\n')
        }
      } catch { /* ignore */ }
    }

    const result = await generateWithAgent(this.agent, {
      text: ctx.selection || ctx.beforeCursor.slice(-200),
      before: ctx.beforeCursor,
      after: ctx.afterCursor,
      title: ctx.title,
      notes
    })

    this.loading = false
    if (result) this.cache.push(result)
    // 用户还在等待此结果时才更新
    if (this.idx === targetIdx) result ? this.show() : this.render('生成失败')
  }

  private switchAgent(d: number) {
    const next = this.agentIdx + d
    if (next < 0 || next >= this.agents.length) return
    this.agentIdx = next
    this.cache = []
    this.generate()
  }

  private onKey = (e: KeyboardEvent) => {
    if (!this.active) return
    const stop = () => { e.preventDefault(); e.stopPropagation() }

    const actions: Record<string, () => void> = {
      ArrowUp: () => this.idx > 0 && (this.idx--, this.show()),
      ArrowDown: () => {
        if (this.idx < this.cache.length - 1) { this.idx++; this.show() }
        else if (this.loading) { this.idx = this.cache.length; this.show() }
        else this.generate()
      },
      ArrowLeft: () => this.switchAgent(-1),
      ArrowRight: () => this.switchAgent(1),
      Tab: () => this.confirm(),
      Enter: () => this.confirm(),
      Escape: () => this.hide()
    }

    if (actions[e.key]) { stop(); actions[e.key]() }
    else if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') this.hide()
  }

  private confirm() {
    const text = this.cache[this.idx]
    this.ghost?.remove()
    this.ghost = null

    if (text && this.anchor) {
      try {
        const sel = window.getSelection()
        sel?.removeAllRanges()
        const r = document.createRange()
        r.setStart(this.anchor.node, this.anchor.offset)
        r.collapse(true)
        sel?.addRange(r)
        // 触发 beforeinput 让思源记录撤销点
        const editor = (this.anchor.node as Element).closest?.('.protyle-wysiwyg') ||
          this.anchor.node.parentElement?.closest('.protyle-wysiwyg')
        editor?.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true }))
        document.execCommand('insertText', false, text)
      } catch {}
    }
    this.hide()
  }
}
