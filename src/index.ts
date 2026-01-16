/**
 * SiContinue 思续 - 插件入口
 */

import { Plugin, Dialog } from 'siyuan'
import { createApp } from 'vue'
import './index.scss'
import { init, destroy } from './main'
import Settings from './components/Settings.vue'

export default class SiContinuePlugin extends Plugin {
  async onload() {
    await init(this)
    this.addCommands()
  }

  private addCommands() {
    this.addCommand({
      langKey: 'triggerCompletion',
      langText: '触发补全',
      hotkey: '',
      callback: () => window.dispatchEvent(new CustomEvent('sicontinue:trigger'))
    })
    
    this.addCommand({
      langKey: 'showAgentSelector',
      langText: '选择智能体',
      hotkey: '',
      callback: () => window.dispatchEvent(new CustomEvent('sicontinue:showAgentSelector'))
    })
  }

  async onunload() {
    destroy()
  }

  async uninstall() {
    await this.removeData('settings.json')
  }

  openSetting() {
    const dialog = new Dialog({
      title: 'SiContinue 设置',
      content: '<div id="sc-settings"></div>',
      width: '720px',
      height: '520px',
      destroyCallback: () => {
        app.unmount()
      }
    })
    
    const app = createApp(Settings, {
      onClose: () => dialog.destroy()
    })
    app.mount(dialog.element.querySelector('#sc-settings')!)
  }
}
