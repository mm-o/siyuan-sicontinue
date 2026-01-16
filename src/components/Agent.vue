<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getSettingsManager } from '../main'
import type { Agent } from '../types'
import { EVENTS } from '../types'

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement>()
const search = ref('')
const idx = ref(0)
const selected = ref<string[]>([])

// 过滤列表
const list = computed(() => {
  const all = getSettingsManager()!.settings.agents.filter(a => a.enabled)
  if (!search.value) return all
  const q = search.value.toLowerCase()
  return all.filter(a => 
    a.name.toLowerCase().includes(q) || 
    a.keywords?.some(k => k.includes(q)) || 
    a.tags?.some(t => t.includes(q))
  )
})

// 切换选中
const toggle = (a: Agent) => {
  const i = selected.value.indexOf(a.id)
  i >= 0 ? selected.value.splice(i, 1) : selected.value.push(a.id)
}

// 确认选择
const confirm = () => {
  const ids = selected.value.length ? selected.value : (list.value[idx.value] ? [list.value[idx.value].id] : [])
  if (ids.length) {
    window.dispatchEvent(new CustomEvent(EVENTS.TRIGGER_COMPLETION, { detail: { agentIds: ids } }))
  }
  emit('close')
}

// 获取选中序号
const getOrder = (id: string) => selected.value.indexOf(id) + 1

// 键盘事件
const onKey = (e: KeyboardEvent) => {
  const len = list.value.length || 1
  switch (e.key) {
    case 'Escape': emit('close'); break
    case 'ArrowDown': e.preventDefault(); idx.value = (idx.value + 1) % len; break
    case 'ArrowUp': e.preventDefault(); idx.value = (idx.value - 1 + len) % len; break
    case 'Tab': e.preventDefault(); list.value[idx.value] && toggle(list.value[idx.value]); break
    case 'Enter': e.preventDefault(); confirm(); break
  }
}

// 定位到光标
const position = () => {
  const r = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect()
  const p = panel.value
  if (!r || !p) return
  const { offsetWidth: w, offsetHeight: h } = p
  p.style.left = `${Math.max(4, r.left + w > innerWidth ? r.right - w : r.left)}px`
  p.style.top = `${Math.max(4, r.bottom + h > innerHeight ? r.top - h - 4 : r.bottom + 4)}px`
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  position()
})

onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="sc-mask" @click="emit('close')">
    <div ref="panel" class="sc-panel sc-panel--md" @click.stop>
      <input 
        v-model="search" 
        class="sc-input" 
        placeholder="搜索智能体..." 
        autofocus 
        @input="idx = 0" 
      />
      <div class="sc-list">
        <div 
          v-for="(a, i) in list" 
          :key="a.id" 
          class="sc-item" 
          :class="{ focus: i === idx }"
          @click="toggle(a)" 
          @dblclick="confirm" 
          @mouseenter="idx = i"
        >
          <div class="sc-order" :class="{ active: selected.includes(a.id) }">
            {{ getOrder(a.id) || '' }}
          </div>
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
