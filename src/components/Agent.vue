<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSettingsManager } from '../main'
import { EVENTS, type Agent } from '../types'

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement>()
const inputEl = ref<HTMLInputElement>()
const listEl = ref<HTMLElement>()
const search = ref('')
const idx = ref(0)
const selected = ref<string[]>([])
let savedRange: Range | null = null

const list = computed(() => {
  const agents = getSettingsManager()!.settings.agents.filter(a => a.enabled)
  if (!search.value) return agents
  const q = search.value.toLowerCase()
  return agents.filter(a => a.name.toLowerCase().includes(q) || a.keywords?.some(k => k.includes(q)) || a.tags?.some(t => t.includes(q)))
})

const toggle = (a: Agent) => {
  const i = selected.value.indexOf(a.id)
  i >= 0 ? selected.value.splice(i, 1) : selected.value.push(a.id)
}

const confirm = () => {
  const ids = selected.value.length ? [...selected.value] : list.value[idx.value] ? [list.value[idx.value].id] : []
  if (!ids.length || !savedRange) { emit('close'); return }
  
  // 检查是否是对话模式的智能体
  const agents = getSettingsManager()!.settings.agents
  const firstAgent = agents.find(a => a.id === ids[0])
  
  // 先获取光标位置
  const rect = savedRange.getBoundingClientRect()
  const pos = { x: rect.left || rect.right, y: rect.bottom || rect.top }
  
  emit('close')
  
  if (firstAgent?.mode === 'chat') {
    // 打开对话框，传递位置
    window.dispatchEvent(new CustomEvent('sicontinue:openChat', { 
      detail: { agentId: ids[0], pos, range: savedRange } 
    }))
  } else {
    // 内联补全模式
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(savedRange.cloneRange())
    setTimeout(() => window.dispatchEvent(new CustomEvent(EVENTS.TRIGGER_COMPLETION, { detail: { agentIds: ids } })), 50)
  }
}

const move = (d: number) => {
  const len = list.value.length || 1
  idx.value = (idx.value + d + len) % len
  listEl.value?.children[idx.value]?.scrollIntoView({ block: 'nearest' })
}

const onKey = (e: KeyboardEvent) => {
  const actions: Record<string, () => void> = {
    Escape: () => emit('close'),
    ArrowDown: () => move(1),
    ArrowUp: () => move(-1),
    Tab: () => list.value[idx.value] && toggle(list.value[idx.value]),
    Enter: confirm
  }
  if (actions[e.key]) { e.preventDefault(); actions[e.key]() }
}

const onMove = (e: MouseEvent) => {
  const el = listEl.value
  if (!el || el.scrollHeight <= el.clientHeight) return
  const { top, height } = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientY - top - 30) / (height - 60)))
  el.scrollTop = (el.scrollHeight - el.clientHeight) * ratio
}

onMounted(() => {
  const sel = window.getSelection()
  if (sel?.rangeCount) {
    savedRange = sel.getRangeAt(0).cloneRange()
    const r = savedRange.getBoundingClientRect(), p = panel.value
    if (p && (r.width || r.height)) {
      const x = r.left || r.right, y = r.bottom || r.top
      p.style.left = `${Math.max(4, x + p.offsetWidth > innerWidth ? x - p.offsetWidth : x)}px`
      p.style.top = `${Math.max(4, y + p.offsetHeight > innerHeight ? r.top - p.offsetHeight - 4 : y + 4)}px`
    }
  }
  inputEl.value?.focus()
})
</script>

<template>
  <div class="sc-mask" @click="emit('close')">
    <div ref="panel" class="sc-panel" @click.stop>
      <input ref="inputEl" v-model="search" class="sc-input" placeholder="搜索智能体..." @input="idx = 0" @keydown="onKey" />
      <div ref="listEl" class="sc-list" @mousemove="onMove">
        <div v-for="(a, i) in list" :key="a.id" class="sc-item" :class="{ focus: i === idx }" @click="toggle(a)" @dblclick="confirm" @mouseenter="idx = i">
          <div class="sc-order" :class="{ active: selected.includes(a.id) }">{{ selected.indexOf(a.id) + 1 || '' }}</div>
          <span class="sc-icon">{{ a.icon }}</span>
          <div class="sc-content">
            <div class="sc-row">
              <span class="sc-name">{{ a.name }}</span>
              <span v-for="t in (a.tags || []).slice(0, 2)" :key="t" class="sc-tag">{{ t }}</span>
            </div>
            <div v-if="a.description" class="sc-desc">{{ a.description }}</div>
          </div>
        </div>
        <div v-if="!list.length" class="sc-empty">无结果</div>
      </div>
      <div class="sc-hint">
        <span v-if="selected.length">已选 <b>{{ selected.length }}</b> 个</span>
        <span v-else>单击多选 · 双击执行</span>
        <span class="sc-keys">Tab 选择 · Enter 确认</span>
      </div>
    </div>
  </div>
</template>
