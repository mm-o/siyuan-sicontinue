/**
 * SiContinue 类型定义、常量、工具函数
 */

// ==================== 类型定义 ====================

export interface Agent {
  id: string
  name: string
  icon: string
  prompt: string           // 提示词模板，支持 {{text}} {{before}} {{after}} {{title}}
  description?: string
  tags?: string[]          // 标签，用于分类
  keywords?: string[]      // 关键词，用于搜索匹配
  temperature?: number
  enabled?: boolean
}

export interface Context {
  blockId: string
  blockType?: string
  cursorPosition: { line: number; ch: number }
  beforeCursor: string
  afterCursor: string
  currentLine: string
  currentParagraph: string
  selection: string
  title: string
  content: string
  fullContent?: string
  documentId?: string
  path?: string
}

export type ContextRange = 'full' | 'blocks' | 'current'

export interface CompletionResult {
  text: string
  agentId: string
  timestamp: number
}

export interface Settings {
  version: string
  triggerKey: 'Alt' | 'Ctrl' | 'Shift'
  doubleClickDelay: number
  defaultAgent: string
  contextRange: ContextRange
  contextBeforeBlocks: number
  contextAfterBlocks: number
  agents: Agent[]
}

// ==================== 常量 ====================

// 默认智能体
export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'continue',
    name: '续写',
    icon: '✍️',
    prompt: '请紧接着以下文字续写，直接输出续写内容：\n\n{{before}}█\n\n要求：从█位置开始续写，保持语义连贯，只输出续写的文字，1-2句话。',
    description: '根据上下文智能续写',
    tags: ['写作'],
    keywords: ['续写', '继续', 'continue'],
    enabled: true
  },
  {
    id: 'polish',
    name: '润色',
    icon: '✨',
    prompt: '请润色以下文字，使其更加流畅优雅，保持原意：\n\n{{text}}\n\n只输出润色后的文字。',
    description: '优化文字表达',
    tags: ['写作'],
    keywords: ['润色', '优化', 'polish'],
    enabled: true
  },
  {
    id: 'summarize',
    name: '总结',
    icon: '📝',
    prompt: '请总结以下内容的要点：\n\n{{text}}\n\n要求：简洁清晰，列出核心要点。',
    description: '提取内容要点',
    tags: ['阅读'],
    keywords: ['总结', '摘要', 'summarize'],
    enabled: true
  },
  {
    id: 'translate',
    name: '翻译',
    icon: '🌐',
    prompt: '请翻译以下内容（中文翻译成英文，英文翻译成中文）：\n\n{{text}}\n\n只输出翻译结果。',
    description: '中英互译',
    tags: ['翻译'],
    keywords: ['翻译', 'translate'],
    enabled: true
  },
  {
    id: 'explain',
    name: '解释',
    icon: '💡',
    prompt: '请解释以下内容：\n\n{{text}}\n\n要求：通俗易懂，1-3句话。',
    description: '解释概念或内容',
    tags: ['学习'],
    keywords: ['解释', '什么是', 'explain'],
    enabled: true
  },
  {
    id: 'qa',
    name: '问答',
    icon: '❓',
    prompt: '回答问题：{{text}}\n\n要求：直接回答，简洁准确，1-3句话。',
    description: '回答问题',
    tags: ['问答'],
    keywords: ['问答', '回答', 'qa'],
    enabled: true
  }
]

export const DEFAULT_SETTINGS: Settings = {
  version: '0.0.1',
  triggerKey: 'Alt',
  doubleClickDelay: 300,
  defaultAgent: 'continue',
  contextRange: 'blocks',
  contextBeforeBlocks: 3,
  contextAfterBlocks: 3,
  agents: [...DEFAULT_AGENTS]
}

export const EVENTS = {
  TRIGGER: 'sicontinue:trigger',
  TRIGGER_COMPLETION: 'sicontinue:triggerCompletion',
  SHOW_AGENT_SELECTOR: 'sicontinue:showAgentSelector',
  COMPLETION_START: 'sicontinue:completionStart',
  COMPLETION_END: 'sicontinue:completionEnd',
  COMPLETION_ERROR: 'sicontinue:completionError',
  SETTINGS_UPDATED: 'sicontinue:settingsUpdated'
} as const

export const STORAGE_KEYS = {
  SETTINGS: 'settings.json'
} as const

// ==================== 工具函数 ====================

export function renderPrompt(template: string, context: {
  text?: string
  before?: string
  after?: string
  title?: string
}): string {
  return template
    .replace(/\{\{text\}\}/g, context.text || '')
    .replace(/\{\{before\}\}/g, context.before || '')
    .replace(/\{\{after\}\}/g, context.after || '')
    .replace(/\{\{title\}\}/g, context.title || '')
}

export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target
  const source = sources.shift()
  if (!source) return target
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        deepMerge(target[key] as any, source[key] as any)
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }
  return deepMerge(target, ...sources)
}

function isObject(item: any): item is object {
  return item && typeof item === 'object' && !Array.isArray(item)
}
