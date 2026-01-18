/**
 * 上下文增强 - 查询相关笔记作为 AI 参考
 */
import { searchNotes, getBacklinks, type BlockResult } from './query'
import type { Context } from '../../types'

export interface EnhancedContext extends Context {
  relatedNotes?: string[]
  backlinks?: string[]
}

// 增强上下文
export async function enhanceContext(
  ctx: Context,
  options: { queryNotes?: boolean; queryBacklinks?: boolean; limit?: number } = {}
): Promise<EnhancedContext> {
  const { queryNotes = true, queryBacklinks = true, limit = 5 } = options
  const enhanced: EnhancedContext = { ...ctx }

  // 提取关键词并查询相关笔记
  if (queryNotes) {
    const keywords = extractKeywords(ctx.selection || ctx.currentParagraph || ctx.beforeCursor)
    if (keywords.length > 0) {
      try {
        const notes = await searchNotes(keywords[0], limit)
        enhanced.relatedNotes = formatNotes(notes)
      } catch { /* ignore */ }
    }
  }

  // 查询反向链接
  if (queryBacklinks && ctx.blockId) {
    try {
      const links = await getBacklinks(ctx.blockId, limit)
      enhanced.backlinks = formatNotes(links)
    } catch { /* ignore */ }
  }

  return enhanced
}

// 格式化笔记结果
function formatNotes(notes: BlockResult[]): string[] {
  return notes.map(n => {
    const path = n.hpath || ''
    const content = (n.content || '').slice(0, 100).replace(/\n/g, ' ')
    return `[${path}] ${content}`
  })
}

// 提取关键词
function extractKeywords(text: string): string[] {
  if (!text) return []
  
  // 移除标点符号，保留中英文和数字
  const cleaned = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .trim()
  
  // 分词并过滤
  const words = cleaned
    .split(/\s+/)
    .filter(w => w.length > 1) // 至少2个字符
    .filter(w => !isStopWord(w))
  
  // 去重并取前3个
  return [...new Set(words)].slice(0, 3)
}

// 停用词
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'this', 'that', 'it', 'its', 'and', 'or', 'but', 'if', 'then', 'so'
])

function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase())
}

// 构建增强的 prompt 上下文
export function buildEnhancedPromptContext(enhanced: EnhancedContext): string {
  const parts: string[] = []

  if (enhanced.relatedNotes?.length) {
    parts.push('相关笔记：')
    parts.push(...enhanced.relatedNotes.map(n => `- ${n}`))
  }

  if (enhanced.backlinks?.length) {
    parts.push('反向链接：')
    parts.push(...enhanced.backlinks.map(l => `- ${l}`))
  }

  return parts.join('\n')
}
