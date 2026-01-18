/**
 * Skill 引擎 - 思源笔记能力集成
 */
import { SIYUAN_FORMAT_GUIDE, BLOCK_TYPES, LIST_SUBTYPES } from './format'
import { searchNotes, getBacklinks, getRecentBlocks, queryByKeywords, type BlockResult } from './query'
import { enhanceContext, buildEnhancedPromptContext, type EnhancedContext } from './enhance'
import type { Context } from '../../types'

export interface SkillOptions {
  formatGuide?: boolean    // 是否注入格式指南
  noteQuery?: boolean      // 是否查询相关笔记
  backlinks?: boolean      // 是否查询反向链接
  queryLimit?: number      // 查询数量限制
}

export class SkillEngine {
  private enabled = true
  private options: SkillOptions = {
    formatGuide: true,
    noteQuery: true,
    backlinks: true,
    queryLimit: 5
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  setOptions(options: Partial<SkillOptions>) {
    Object.assign(this.options, options)
  }

  // 获取格式指南
  getFormatGuide(): string {
    return this.enabled && this.options.formatGuide ? SIYUAN_FORMAT_GUIDE : ''
  }

  // 增强上下文
  async enhance(ctx: Context): Promise<EnhancedContext> {
    if (!this.enabled) return ctx
    return enhanceContext(ctx, {
      queryNotes: this.options.noteQuery,
      queryBacklinks: this.options.backlinks,
      limit: this.options.queryLimit
    })
  }

  // 构建增强的 prompt
  buildPromptContext(enhanced: EnhancedContext): string {
    return buildEnhancedPromptContext(enhanced)
  }

  // 查询相关笔记
  async queryRelatedNotes(keywords: string[]): Promise<BlockResult[]> {
    if (!this.enabled || !this.options.noteQuery) return []
    return queryByKeywords(keywords, this.options.queryLimit)
  }

  // 搜索笔记
  async search(keyword: string, limit?: number): Promise<BlockResult[]> {
    return searchNotes(keyword, limit || this.options.queryLimit)
  }

  // 获取反向链接
  async getBacklinks(blockId: string): Promise<BlockResult[]> {
    return getBacklinks(blockId, this.options.queryLimit)
  }

  // 获取最近笔记
  async getRecent(days = 7): Promise<BlockResult[]> {
    return getRecentBlocks(days, this.options.queryLimit)
  }
}

// 单例
let skillEngine: SkillEngine | null = null

export function getSkillEngine(): SkillEngine {
  if (!skillEngine) {
    skillEngine = new SkillEngine()
  }
  return skillEngine
}

// 导出类型和常量
export { SIYUAN_FORMAT_GUIDE, BLOCK_TYPES, LIST_SUBTYPES }
export type { BlockResult, EnhancedContext }
export * from './query'
