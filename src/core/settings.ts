/**
 * 设置管理
 */

import type { Plugin } from 'siyuan'
import type { Settings } from '../types'
import { DEFAULT_SETTINGS, STORAGE_KEYS, EVENTS, deepMerge } from '../types'

export class SettingsManager {
  settings: Settings = { ...DEFAULT_SETTINGS }
  
  constructor(private plugin: Plugin) {}
  
  async load() {
    try {
      const data = await this.plugin.loadData(STORAGE_KEYS.SETTINGS)
      if (data) {
        this.settings = deepMerge({ ...DEFAULT_SETTINGS }, data)
      }
    } catch (error) {
      console.error('[SiContinue] 加载设置失败:', error)
    }
  }
  
  async save() {
    try {
      await this.plugin.saveData(STORAGE_KEYS.SETTINGS, this.settings)
      window.dispatchEvent(new CustomEvent(EVENTS.SETTINGS_UPDATED, { detail: this.settings }))
    } catch (error) {
      console.error('[SiContinue] 保存设置失败:', error)
      throw error
    }
  }
  
  async reset() {
    this.settings = { ...DEFAULT_SETTINGS }
    await this.save()
  }
  
  update(updates: Partial<Settings>) {
    this.settings = deepMerge(this.settings, updates)
  }
}
