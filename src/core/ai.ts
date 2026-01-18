/**
 * AI 调用模块
 */

import type { Agent } from '../types'
import { renderPrompt } from '../types'
import { getSkillEngine } from './skill'

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
  context: { text?: string; before?: string; after?: string; title?: string; notes?: string }
): Promise<string | null> {
  // 注入格式指南（如果智能体启用）
  const skill = getSkillEngine()
  const formatGuide = agent.useFormatGuide !== false ? skill.getFormatGuide() : ''
  
  let prompt = renderPrompt(agent.prompt, context)
  if (formatGuide) {
    prompt = `${formatGuide}\n\n${prompt}`
  }
  
  return callSiyuanAI(prompt)
}
