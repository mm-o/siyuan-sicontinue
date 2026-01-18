/**
 * 主应用初始化
 */

import type { Plugin } from 'siyuan'
import { createApp } from 'vue'
import App from './App.vue'
import { SettingsManager } from './core/settings'
import { KeyboardListener } from './core/keyboard'
import { ContextExtractor } from './core/context'
import { CompletionPreview } from './core/preview'
import { getSkillEngine } from './core/skill'
import { EVENTS } from './types'

let plugin: Plugin | null = null
let app: any = null
let settingsManager: SettingsManager | null = null
let keyboardListener: KeyboardListener | null = null
let contextExtractor: ContextExtractor | null = null
let completionPreview: CompletionPreview | null = null

export const usePlugin = (p?: Plugin) => p ? (plugin = p) : plugin!
export const getSettingsManager = () => settingsManager
export const getContextExtractor = () => contextExtractor
export const getCompletionPreview = () => completionPreview

export async function init(p: Plugin) {
  usePlugin(p)
  
  // 加载设置
  settingsManager = new SettingsManager(p)
  await settingsManager.load()
  
  // 初始化上下文提取器
  contextExtractor = new ContextExtractor(p)
  contextExtractor.setContextRange(
    settingsManager.settings.contextRange,
    settingsManager.settings.contextBeforeBlocks,
    settingsManager.settings.contextAfterBlocks
  )
  
  // 初始化 Skill 引擎
  const skill = getSkillEngine()
  skill.setEnabled(settingsManager.settings.skillEnabled !== false)
  skill.setOptions({
    formatGuide: settingsManager.settings.formatGuideEnabled !== false,
    noteQuery: settingsManager.settings.noteQueryEnabled,
    queryLimit: settingsManager.settings.noteQueryLimit || 5
  })
  
  // 初始化补全预览
  completionPreview = new CompletionPreview()
  
  // 初始化键盘监听
  keyboardListener = new KeyboardListener()
  keyboardListener.setDoubleClickDelay(settingsManager.settings.doubleClickDelay)
  keyboardListener.init()
  
  // 设置全局访问
  ;(window as any).__sicontinue__ = { 
    plugin: p, 
    contextExtractor,
    completionPreview,
    settings: settingsManager.settings 
  }
  
  // 监听事件
  setupEventListeners()
  
  // 挂载主应用
  mountApp(p)
}

export function destroy() {
  keyboardListener?.destroy()
  completionPreview?.destroy()
  app?.unmount()
  document.getElementById(plugin?.name || '')?.remove()
  delete (window as any).__sicontinue__
  settingsManager = null
  keyboardListener = null
  contextExtractor = null
  completionPreview = null
  plugin = null
  app = null
}

function setupEventListeners() {
  window.addEventListener(EVENTS.SETTINGS_UPDATED, ((e: CustomEvent) => {
    const s = e.detail
    if (s?.doubleClickDelay) {
      keyboardListener?.setDoubleClickDelay(s.doubleClickDelay)
    }
    if (s?.contextRange || s?.contextBeforeBlocks || s?.contextAfterBlocks) {
      contextExtractor?.setContextRange(s.contextRange, s.contextBeforeBlocks, s.contextAfterBlocks)
    }
    // 同步 Skill 设置
    const skill = getSkillEngine()
    skill.setEnabled(s?.skillEnabled !== false)
    skill.setOptions({
      formatGuide: s?.formatGuideEnabled !== false,
      noteQuery: s?.noteQueryEnabled,
      queryLimit: s?.noteQueryLimit || 5
    })
  }) as EventListener)
}

function mountApp(p: Plugin) {
  const div = document.createElement('div')
  div.id = p.name
  div.className = 'sicontinue-app'
  div.style.cssText = 'position: fixed; z-index: 9999;'
  app = createApp(App)
  app.mount(div)
  document.body.appendChild(div)
}
