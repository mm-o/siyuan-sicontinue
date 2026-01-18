<script setup lang="ts">
import { ref, computed } from 'vue'
import { getSettingsManager } from '../main'
import type { Agent } from '../types'
import { DEFAULT_AGENTS } from '../types'
import { pushMsg } from '../api'

const props = defineProps<{ onClose?: () => void }>()

const mgr = getSettingsManager()
const settings = ref({ ...mgr!.settings })
const tab = ref<'general' | 'agents'>('general')
const editing = ref<Agent | null>(null)

// 保存
const save = async () => {
  mgr!.settings = settings.value
  await mgr!.save()
  pushMsg('✅ 已保存', 2000)
}

// 智能体操作
const addAgent = () => {
  editing.value = {
    id: `agent-${Date.now()}`,
    name: '新智能体',
    icon: '🤖',
    prompt: '{{text}}',
    description: '',
    tags: [],
    keywords: [],
    enabled: true
  }
}

const editAgent = (a: Agent) => {
  editing.value = { ...a, tags: [...(a.tags || [])], keywords: [...(a.keywords || [])] }
}

const saveAgent = () => {
  if (!editing.value) return
  const i = settings.value.agents.findIndex(a => a.id === editing.value!.id)
  i >= 0 ? (settings.value.agents[i] = editing.value) : settings.value.agents.push(editing.value)
  editing.value = null
  save()
}

const deleteAgent = (id: string) => {
  if (!confirm('删除这个智能体？')) return
  settings.value.agents = settings.value.agents.filter(a => a.id !== id)
  save()
}

const toggleAgent = (a: Agent) => {
  a.enabled = !a.enabled
  save()
}

const resetAgents = () => {
  if (!confirm('重置所有智能体为默认？')) return
  settings.value.agents = [...DEFAULT_AGENTS]
  save()
}

// 同步新增的默认智能体（不覆盖已有的）
const syncNewAgents = () => {
  const existingIds = new Set(settings.value.agents.map(a => a.id))
  const newAgents = DEFAULT_AGENTS.filter(a => !existingIds.has(a.id))
  if (newAgents.length === 0) {
    pushMsg('没有新智能体需要同步', 2000)
    return
  }
  settings.value.agents.push(...newAgents.map(a => ({ ...a })))
  save()
  pushMsg(`✅ 已添加 ${newAgents.length} 个新智能体`, 2000)
}

const resetAgent = () => {
  if (!editing.value) return
  const defaultAgent = DEFAULT_AGENTS.find(a => a.id === editing.value!.id)
  if (defaultAgent) {
    editing.value = { ...defaultAgent, tags: [...(defaultAgent.tags || [])], keywords: [...(defaultAgent.keywords || [])] }
  }
}

const enabledAgents = computed(() => settings.value.agents.filter(a => a.enabled))
</script>

<template>
  <div class="fn__flex-1 fn__flex config__panel">
    <!-- 左侧 Tab 栏 -->
    <ul class="b3-tab-bar b3-list b3-list--background">
      <li 
        class="b3-list-item" 
        :class="{ 'b3-list-item--focus': tab === 'general' }" 
        @click="tab = 'general'; editing = null"
      >
        <svg class="b3-list-item__graphic"><use xlink:href="#iconSettings"></use></svg>
        <span class="b3-list-item__text">通用</span>
      </li>
      <li 
        class="b3-list-item" 
        :class="{ 'b3-list-item--focus': tab === 'agents' }" 
        @click="tab = 'agents'; editing = null"
      >
        <svg class="b3-list-item__graphic"><use xlink:href="#iconSparkles"></use></svg>
        <span class="b3-list-item__text">智能体</span>
      </li>
    </ul>

    <!-- 右侧内容区 -->
    <div class="config__tab-wrap">
      <!-- 通用设置 -->
      <div v-show="tab === 'general'" class="config__tab-container">
        <label class="fn__flex b3-label">
          <div class="fn__flex-1">
            <div class="fn__flex">触发键</div>
            <div class="b3-label__text">双击触发补全的修饰键</div>
          </div>
          <select v-model="settings.triggerKey" class="b3-select fn__flex-center fn__size200" @change="save">
            <option value="Alt">Alt</option>
            <option value="Ctrl">Ctrl</option>
          </select>
        </label>

        <label class="fn__flex b3-label">
          <div class="fn__flex-1">
            <div class="fn__flex">双击延迟</div>
            <div class="b3-label__text">双击判定时间间隔（毫秒）</div>
          </div>
          <input v-model.number="settings.doubleClickDelay" type="number" min="100" max="500" class="b3-text-field fn__flex-center fn__size200" @change="save" />
        </label>

        <label class="fn__flex b3-label">
          <div class="fn__flex-1">
            <div class="fn__flex">默认智能体</div>
            <div class="b3-label__text">触发补全时使用的智能体</div>
          </div>
          <select v-model="settings.defaultAgent" class="b3-select fn__flex-center fn__size200" @change="save">
            <option v-for="a in enabledAgents" :key="a.id" :value="a.id">{{ a.icon }} {{ a.name }}</option>
          </select>
        </label>

        <label class="fn__flex b3-label">
          <div class="fn__flex-1">
            <div class="fn__flex">上下文范围</div>
            <div class="b3-label__text">发送给 AI 的上下文内容范围</div>
          </div>
          <select v-model="settings.contextRange" class="b3-select fn__flex-center fn__size200" @change="save">
            <option value="full">全文</option>
            <option value="blocks">周围块</option>
            <option value="current">当前块</option>
          </select>
        </label>

        <label v-if="settings.contextRange === 'blocks'" class="fn__flex b3-label">
          <div class="fn__flex-1">
            <div class="fn__flex">上下文块数</div>
            <div class="b3-label__text">前后各取多少个块</div>
          </div>
          <div class="fn__flex fn__flex-center" style="gap: 8px;">
            <input v-model.number="settings.contextBeforeBlocks" type="number" min="0" max="10" class="b3-text-field" style="width: 60px;" @change="save" />
            <span>/</span>
            <input v-model.number="settings.contextAfterBlocks" type="number" min="0" max="10" class="b3-text-field" style="width: 60px;" @change="save" />
          </div>
        </label>

        <!-- Skill 设置 -->
        <div class="b3-label" style="padding: 8px 16px; background: var(--b3-theme-surface); margin-top: 16px;">
          <b>Skill 能力</b>
        </div>

        <label class="fn__flex b3-label">
          <div class="fn__flex-1">
            <div class="fn__flex">格式指南</div>
            <div class="b3-label__text">注入思源格式规范到 AI 提示词</div>
          </div>
          <input type="checkbox" class="b3-switch fn__flex-center" v-model="settings.formatGuideEnabled" @change="save" />
        </label>

        <label class="fn__flex b3-label">
          <div class="fn__flex-1">
            <div class="fn__flex">笔记查询</div>
            <div class="b3-label__text">查询相关笔记作为 AI 上下文</div>
          </div>
          <input type="checkbox" class="b3-switch fn__flex-center" v-model="settings.noteQueryEnabled" @change="save" />
        </label>

        <label v-if="settings.noteQueryEnabled" class="fn__flex b3-label">
          <div class="fn__flex-1">
            <div class="fn__flex">查询数量</div>
            <div class="b3-label__text">最多查询多少条相关笔记</div>
          </div>
          <input v-model.number="settings.noteQueryLimit" type="number" min="1" max="20" class="b3-text-field fn__flex-center fn__size200" @change="save" />
        </label>
      </div>

      <!-- 智能体列表 -->
      <div v-show="tab === 'agents' && !editing" class="config__tab-container sc-tab-fixed">
        <div class="sc-header">
          <span class="sc-header__title">智能体列表</span>
          <div style="display: flex; gap: 8px;">
            <button class="b3-button b3-button--outline" @click="syncNewAgents">
              <svg><use xlink:href="#iconRefresh"></use></svg>
              同步新增
            </button>
            <button class="b3-button b3-button--text" @click="addAgent">
              <svg><use xlink:href="#iconAdd"></use></svg>
              添加
            </button>
          </div>
        </div>

        <div class="sc-scroll sc-agent-list">
          <div v-for="a in settings.agents" :key="a.id" class="sc-agent-card" :class="{ disabled: !a.enabled }">
            <div class="sc-agent-icon">{{ a.icon }}</div>
            <div class="sc-agent-info">
              <div class="sc-agent-name">{{ a.name }}</div>
              <div class="sc-agent-desc">{{ a.description || '无描述' }}</div>
              <div v-if="a.tags?.length" class="sc-agent-tags">
                <span v-for="t in a.tags" :key="t" class="sc-tag">{{ t }}</span>
              </div>
            </div>
            <div class="sc-agent-actions">
              <span class="b3-tooltips b3-tooltips__w" :aria-label="a.enabled ? '禁用' : '启用'">
                <button class="b3-button b3-button--outline" @click="toggleAgent(a)">
                  <svg><use :xlink:href="a.enabled ? '#iconEye' : '#iconEyeoff'"></use></svg>
                </button>
              </span>
              <span class="b3-tooltips b3-tooltips__w" aria-label="编辑">
                <button class="b3-button b3-button--outline" @click="editAgent(a)">
                  <svg><use xlink:href="#iconEdit"></use></svg>
                </button>
              </span>
              <span class="b3-tooltips b3-tooltips__w" aria-label="删除">
                <button class="b3-button b3-button--outline" @click="deleteAgent(a.id)">
                  <svg><use xlink:href="#iconTrashcan"></use></svg>
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 智能体编辑 -->
      <div v-show="editing" class="config__tab-container sc-tab-fixed">
        <div class="sc-header">
          <div class="sc-flex" style="gap: 8px;">
            <button class="b3-button b3-button--outline" style="padding: 4px 6px;" @click="editing = null">
              <svg><use xlink:href="#iconLeft"></use></svg>
            </button>
            <span class="sc-header__title">{{ editing?.id?.startsWith('agent-') ? '添加' : '编辑' }}智能体</span>
          </div>
          <div class="sc-header__actions">
            <button v-if="editing && !editing.id.startsWith('agent-')" class="b3-button b3-button--outline" @click="resetAgent">重置</button>
            <button class="b3-button b3-button--outline" @click="editing = null">取消</button>
            <button class="b3-button b3-button--text" @click="saveAgent">保存</button>
          </div>
        </div>

        <div v-if="editing" class="sc-scroll">
          <label class="fn__flex b3-label">
            <div class="fn__flex-1">
              <div class="fn__flex">图标</div>
              <div class="b3-label__text">Emoji 或字符</div>
            </div>
            <input v-model="editing.icon" class="b3-text-field fn__flex-center" style="width: 60px; text-align: center; font-size: 18px;" />
          </label>

          <label class="fn__flex b3-label">
            <div class="fn__flex-1">
              <div class="fn__flex">名称</div>
              <div class="b3-label__text">智能体显示名称</div>
            </div>
            <input v-model="editing.name" class="b3-text-field fn__flex-center fn__size200" placeholder="智能体名称" />
          </label>

          <label class="fn__flex b3-label">
            <div class="fn__flex-1">
              <div class="fn__flex">描述</div>
              <div class="b3-label__text">简短说明用途</div>
            </div>
            <input v-model="editing.description" class="b3-text-field fn__flex-center fn__size200" placeholder="简短描述" />
          </label>

          <label class="fn__flex b3-label">
            <div class="fn__flex-1">
              <div class="fn__flex">标签</div>
              <div class="b3-label__text">逗号分隔，用于分类</div>
            </div>
            <input :value="editing.tags?.join(',')" class="b3-text-field fn__flex-center fn__size200" placeholder="写作,翻译" @input="editing.tags = ($event.target as HTMLInputElement).value.split(',').filter(Boolean)" />
          </label>

          <label class="b3-label fn__flex-column">
            <div style="margin-bottom: 8px;">
              <div class="fn__flex">提示词模板</div>
              <div class="b3-label__text">支持变量：{{text}} {{before}} {{after}} {{title}} {{notes}}</div>
            </div>
            <textarea v-model="editing.prompt" class="b3-text-field fn__block" rows="5" placeholder="请输入提示词模板..."></textarea>
          </label>

          <label class="fn__flex b3-label">
            <div class="fn__flex-1">
              <div class="fn__flex">交互模式</div>
              <div class="b3-label__text">inline=内联补全，chat=对话框</div>
            </div>
            <select v-model="editing.mode" class="b3-select fn__flex-center fn__size200">
              <option value="inline">内联补全</option>
              <option value="chat">对话框</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
