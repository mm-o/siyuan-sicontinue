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

const enabledAgents = computed(() => settings.value.agents.filter(a => a.enabled))
</script>

<template>
  <div class="sc-settings-wrap">
    <!-- 侧边栏 -->
    <div class="sc-sidebar">
      <div class="sc-sidebar-item" :class="{ active: tab === 'general' }" @click="tab = 'general'; editing = null">
        <svg><use xlink:href="#iconSettings"></use></svg>
        <span>通用</span>
      </div>
      <div class="sc-sidebar-item" :class="{ active: tab === 'agents' }" @click="tab = 'agents'; editing = null">
        <svg><use xlink:href="#iconSparkles"></use></svg>
        <span>智能体</span>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="sc-settings">
      <!-- 通用设置 -->
      <template v-if="tab === 'general'">
        <div class="sc-setting-item">
          <div class="sc-setting-label">
            <div class="sc-setting-title">触发键</div>
            <div class="sc-setting-desc">双击触发补全的修饰键</div>
          </div>
          <select v-model="settings.triggerKey" class="b3-select" @change="save">
            <option value="Alt">Alt</option>
            <option value="Ctrl">Ctrl</option>
          </select>
        </div>

        <div class="sc-setting-item">
          <div class="sc-setting-label">
            <div class="sc-setting-title">双击延迟</div>
            <div class="sc-setting-desc">双击判定时间间隔（毫秒）</div>
          </div>
          <input v-model.number="settings.doubleClickDelay" type="number" min="100" max="500" class="b3-text-field" style="width: 80px;" @change="save" />
        </div>

        <div class="sc-setting-item">
          <div class="sc-setting-label">
            <div class="sc-setting-title">默认智能体</div>
            <div class="sc-setting-desc">触发补全时使用的智能体</div>
          </div>
          <select v-model="settings.defaultAgent" class="b3-select" @change="save">
            <option v-for="a in enabledAgents" :key="a.id" :value="a.id">{{ a.icon }} {{ a.name }}</option>
          </select>
        </div>

        <div class="sc-setting-item">
          <div class="sc-setting-label">
            <div class="sc-setting-title">上下文范围</div>
            <div class="sc-setting-desc">发送给 AI 的上下文内容范围</div>
          </div>
          <select v-model="settings.contextRange" class="b3-select" @change="save">
            <option value="full">全文</option>
            <option value="blocks">周围块</option>
            <option value="current">当前块</option>
          </select>
        </div>

        <div v-if="settings.contextRange === 'blocks'" class="sc-setting-item">
          <div class="sc-setting-label">
            <div class="sc-setting-title">上下文块数</div>
            <div class="sc-setting-desc">前后各取多少个块</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input v-model.number="settings.contextBeforeBlocks" type="number" min="0" max="10" class="b3-text-field" style="width: 50px;" @change="save" />
            <span>/</span>
            <input v-model.number="settings.contextAfterBlocks" type="number" min="0" max="10" class="b3-text-field" style="width: 50px;" @change="save" />
          </div>
        </div>
      </template>

      <!-- 智能体列表 -->
      <template v-else-if="tab === 'agents' && !editing">
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <button class="sc-btn sc-btn--primary" @click="addAgent">+ 添加</button>
          <button class="sc-btn sc-btn--outline" @click="resetAgents">重置默认</button>
        </div>

        <div class="sc-agent-list">
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
              <div class="sc-action-btn" @click="toggleAgent(a)">
                <svg><use :xlink:href="a.enabled ? '#iconEye' : '#iconEyeoff'"></use></svg>
              </div>
              <div class="sc-action-btn" @click="editAgent(a)">
                <svg><use xlink:href="#iconEdit"></use></svg>
              </div>
              <div class="sc-action-btn" @click="deleteAgent(a.id)">
                <svg><use xlink:href="#iconTrashcan"></use></svg>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 智能体编辑 -->
      <template v-else-if="editing">
        <div style="margin-bottom: 16px;">
          <button class="sc-btn sc-btn--outline" @click="editing = null">← 返回</button>
          <span style="margin-left: 12px; color: var(--b3-theme-on-surface-light);">
            {{ editing.id.startsWith('agent-') ? '添加' : '编辑' }}智能体
          </span>
        </div>

        <div class="sc-editor">
          <div class="sc-editor-row">
            <div class="sc-editor-field" style="flex: 0 0 80px;">
              <div class="sc-editor-label">图标</div>
              <input v-model="editing.icon" class="sc-editor-input" style="text-align: center; font-size: 18px;" />
            </div>
            <div class="sc-editor-field">
              <div class="sc-editor-label">名称</div>
              <input v-model="editing.name" class="sc-editor-input" placeholder="智能体名称" />
            </div>
          </div>

          <div class="sc-editor-field">
            <div class="sc-editor-label">描述</div>
            <input v-model="editing.description" class="sc-editor-input" placeholder="简短描述" />
          </div>

          <div class="sc-editor-field">
            <div class="sc-editor-label">标签（逗号分隔）</div>
            <input :value="editing.tags?.join(',')" class="sc-editor-input" placeholder="写作,翻译" @input="editing.tags = ($event.target as HTMLInputElement).value.split(',').filter(Boolean)" />
          </div>

          <div class="sc-editor-field">
            <div class="sc-editor-label">提示词模板（支持 {{text}} {{before}} {{after}} {{title}}）</div>
            <textarea v-model="editing.prompt" class="sc-editor-input" rows="5" placeholder="请输入提示词模板..."></textarea>
          </div>

          <div class="sc-editor-actions">
            <button class="sc-btn sc-btn--outline" @click="editing = null">取消</button>
            <button class="sc-btn sc-btn--primary" @click="saveAgent">保存</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
