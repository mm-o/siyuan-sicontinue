/**
 * AI 调用模块
 */

import type { Agent } from '../types'
import { renderPrompt } from '../types'

// 隐藏思源 AI 全局加载进度条
const hideAILoading = () => {
  const check = () => {
    const el = document.querySelector('#progress:has(.b3-dialog__loading)')
    if (el) el.remove()
    else requestAnimationFrame(check)
  }
  check()
}

/**
 * 调用思源 AI
 */
export async function callSiyuanAI(prompt: string, timeout = 60000): Promise<string | null> {
  hideAILoading()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const res = await fetch('/api/ai/chatGPT', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg: prompt }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId))
    
    if (!res.ok) return null
    
    const data = await res.json()
    if (data.code !== 0 || !data.data) return null
    
    // 清理返回内容
    return data.data.replace(/^[\s█]+/, '').replace(/[\s█]+$/, '').trim()
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn('[SiContinue] AI 请求超时')
    }
    return null
  }
}

/**
 * 使用智能体生成内容
 */
export async function generateWithAgent(
  agent: Agent,
  context: { text?: string; before?: string; after?: string; title?: string }
): Promise<string | null> {
  const prompt = renderPrompt(agent.prompt, context)
  return callSiyuanAI(prompt)
}

/**
 * 默认续写（兼容旧逻辑）
 */
export async function generateCompletion(
  _context: string,
  beforeCursor: string,
  _afterCursor: string
): Promise<string | null> {
  const prompt = `请紧接着以下文字续写，直接输出续写内容：

${beforeCursor.slice(-200)}█

要求：从█位置开始续写，保持语义连贯，只输出续写的文字，1-2句话。`

  return callSiyuanAI(prompt)
}
