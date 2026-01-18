<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { generateWithAgent } from '../core/ai'
import { getSkillEngine, type BlockResult } from '../core/skill'
import { cleanInvalidRefs } from '../core/skill/format'
import { getContextExtractor } from '../main'
import { insertBlock } from '../api'
import type { Agent } from '../types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: BlockResult[]
}

interface SkillInfo {
  keywords: string[]
  notes: BlockResult[]
  queryTime: number
}

const props = defineProps<{ 
  agent: Agent
  pos?: { x: number; y: number }
  range?: Range
}>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement>()
const inputEl = ref<HTMLTextAreaElement>()
const listEl = ref<HTMLElement>()

const messages = ref<Message[]>([])
const input = ref('')
const loading = ref(false)
const skillInfo = ref<SkillInfo | null>(null)
const skillExpanded = ref(false)
const selectedMsg = ref<number>(-1)

let savedRange: Range | null = null
let savedBlockId: string | null = null

// ==================== 核心逻辑 ====================

// 用 AI 提取关键词 - 让 AI 理解用户意图
const extractKeywords = async (text: string): Promise<string[]> => {
  try {
    const res = await fetch('/api/ai/chatGPT', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        msg: `从以下用户输入中提取用于搜索笔记的关键词（1-3个核心词，用逗号分隔，只输出关键词）：
"${text}"
关键词：` 
      })
    })
    const data = await res.json()
    if (data.code === 0 && data.data) {
      const keywords = data.data.split(/[,，、\s]+/).map((s: string) => s.trim()).filter((s: string) => s.length >= 2)
      console.log('[Skill] AI提取关键词:', keywords)
      return keywords.slice(0, 3)
    }
  } catch (e) {
    console.error('[Skill] AI提取关键词失败:', e)
  }
  // 回退：简单分词
  const chinese = text.match(/[\u4e00-\u9fa5]{2,}/g) || []
  const english = text.match(/[a-zA-Z]{3,}/g) || []
  return [...new Set([...chinese, ...english])].slice(0, 3)
}

// 发送消息
const send = async () => {
  const text = input.value.trim()
  if (!text || loading.value) return
  
  messages.value.push({ id: `u-${Date.now()}`, role: 'user', content: text })
  input.value = ''
  loading.value = true
  selectedMsg.value = -1
  scrollToBottom()
  
  try {
    const ctx = await getContextExtractor()?.extract()
    const skill = getSkillEngine()
    const startTime = Date.now()
    
    // 用 AI 提取关键词
    const keywords = await extractKeywords(text)
    
    // 并行查询所有关键词
    let notes: BlockResult[] = []
    if (keywords.length) {
      const results = await Promise.all(keywords.map(k => skill.search(k, 3)))
      // 合并去重
      const seen = new Set<string>()
      results.flat().forEach(n => {
        if (!seen.has(n.id)) { seen.add(n.id); notes.push(n) }
      })
      notes = notes.slice(0, 8)
    }
    console.log('[Skill] 查询结果:', notes.length, '条')
    
    skillInfo.value = { keywords, notes, queryTime: Date.now() - startTime }
    
    // 构建上下文 - 保持原始内容，让 AI 理解
    const notesContext = notes.length ? buildNotesContext(notes) : ''
    
    // 构建对话历史
    const history = messages.value.slice(-4).map(m => 
      `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`
    ).join('\n')
    
    const result = await generateWithAgent(props.agent, {
      text: history ? `${history}\n用户: ${text}` : text,
      before: ctx?.beforeCursor || '',
      after: ctx?.afterCursor || '',
      title: ctx?.title || '',
      notes: notesContext
    })
    
    messages.value.push({
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: cleanInvalidRefs(result || '抱歉，无法生成回复'),
      sources: notes.slice(0, 3)
    })
  } catch (e) {
    console.error('[Skill] 错误:', e)
    messages.value.push({ id: `a-${Date.now()}`, role: 'assistant', content: '发生错误，请重试' })
  }
  
  loading.value = false
  scrollToBottom()
}

// 构建笔记上下文 - 包含块ID让AI可以正确引用
const buildNotesContext = (notes: BlockResult[]): string => {
  if (!notes.length) return ''
  return `相关笔记（可用块ID创建引用）：
${notes.map((n, i) => `[${i + 1}] ID: ${n.id} | ${n.hpath}
${(n.content || '').slice(0, 150)}`).join('\n\n')}`
}

// 滚动到底部
const scrollToBottom = () => nextTick(() => listEl.value && (listEl.value.scrollTop = listEl.value.scrollHeight))

// ==================== 插入逻辑 ====================

// 智能插入 - 检测格式并选择合适的插入方式
const insertToEditor = async (content: string) => {
  emit('close')
  if (!content) return
  
  // 检测是否包含 markdown 格式
  const hasMarkdown = /^#+\s|^\*\s|^-\s|^\d+\.\s|```|==.*==|#\S+#|\[\[|\(\(/.test(content)
  
  setTimeout(async () => {
    if (hasMarkdown && savedBlockId) {
      // 使用思源 API 插入 markdown 块
      try {
        await insertBlock('markdown', content, undefined, savedBlockId)
        console.log('[Skill] 已插入 markdown 块')
      } catch (e) {
        console.error('[Skill] 插入失败，回退到文本插入:', e)
        fallbackInsert(content)
      }
    } else {
      fallbackInsert(content)
    }
  }, 50)
}

// 回退插入方式
const fallbackInsert = (content: string) => {
  if (!savedRange) return
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(savedRange.cloneRange())
  
  const editor = savedRange.startContainer.parentElement?.closest('.protyle-wysiwyg')
  editor?.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: content, bubbles: true }))
  document.execCommand('insertText', false, content)
}

// ==================== 笔记跳转 ====================

const openNote = (id: string) => {
  if (!id) return
  // 使用思源的 openTab
  const siyuan = (window as any).siyuan
  if (siyuan?.openTab) {
    siyuan.openTab({ app: siyuan.app, doc: { id, action: ['cb-get-hl'] } })
  } else {
    // 备用：滚动高亮
    const block = document.querySelector(`[data-node-id="${id}"]`)
    if (block) {
      block.scrollIntoView({ behavior: 'smooth', block: 'center' })
      block.classList.add('protyle-wysiwyg--hl')
      setTimeout(() => block.classList.remove('protyle-wysiwyg--hl'), 2000)
    }
  }
}

// ==================== 键盘交互 ====================

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') { emit('close'); return }
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return }
  
  const assistantMsgs = messages.value.filter(m => m.role === 'assistant')
  if (e.key === 'ArrowUp' && assistantMsgs.length) {
    e.preventDefault()
    selectedMsg.value = selectedMsg.value <= 0 ? assistantMsgs.length - 1 : selectedMsg.value - 1
  }
  if (e.key === 'ArrowDown' && assistantMsgs.length) {
    e.preventDefault()
    selectedMsg.value = selectedMsg.value >= assistantMsgs.length - 1 ? -1 : selectedMsg.value + 1
  }
  if (e.key === 'Tab' && selectedMsg.value >= 0) {
    e.preventDefault()
    const msg = assistantMsgs[selectedMsg.value]
    if (msg) insertToEditor(msg.content)
  }
}

const clear = () => { messages.value = []; skillInfo.value = null; selectedMsg.value = -1 }

// ==================== 初始化 ====================

onMounted(() => {
  savedRange = props.range || null
  
  // 获取当前块 ID
  if (savedRange) {
    const node = savedRange.startContainer
    const block = (node as Element).closest?.('[data-node-id]') || 
                  (node.parentElement?.closest('[data-node-id]'))
    savedBlockId = block?.getAttribute('data-node-id') || null
  }
  
  // 定位面板
  nextTick(() => {
    const p = panel.value
    if (!p) return
    
    if (props.pos) {
      const x = Math.max(8, Math.min(props.pos.x, innerWidth - p.offsetWidth - 8))
      const y = props.pos.y + p.offsetHeight > innerHeight 
        ? props.pos.y - p.offsetHeight - 8 
        : props.pos.y + 8
      p.style.left = `${x}px`
      p.style.top = `${Math.max(8, y)}px`
    } else {
      p.style.left = `${(innerWidth - p.offsetWidth) / 2}px`
      p.style.top = `${(innerHeight - p.offsetHeight) / 2}px`
    }
    
    inputEl.value?.focus()
  })
})

// 内容预览 - 简单截断
const preview = (s: string, len = 60) => (s || '').slice(0, len) + ((s?.length || 0) > len ? '...' : '')
</script>

<template>
  <div class="sc-mask" @click="emit('close')">
    <div ref="panel" class="sc-panel sc-chat" @click.stop>
      <!-- 标题栏 -->
      <div class="sc-chat-head">
        <span class="sc-chat-title">{{ agent.icon }} {{ agent.name }}</span>
        <div class="sc-chat-btns">
          <button class="sc-btn-sm" @click="clear" title="清空">🗑️</button>
          <button class="sc-btn-sm" @click="emit('close')" title="关闭">✕</button>
        </div>
      </div>
      
      <!-- 消息列表 -->
      <div ref="listEl" class="sc-chat-list">
        <div v-if="!messages.length" class="sc-empty">输入问题开始对话</div>
        
        <template v-for="msg in messages" :key="msg.id">
          <div 
            class="sc-msg" 
            :class="[msg.role, { selected: msg.role === 'assistant' && selectedMsg === messages.filter(m => m.role === 'assistant').indexOf(msg) }]"
            @click="msg.role === 'assistant' && insertToEditor(msg.content)"
          >
            <div class="sc-msg-text">{{ msg.content }}</div>
            
            <!-- 引用来源 -->
            <div v-if="msg.sources?.length" class="sc-msg-refs">
              <span 
                v-for="s in msg.sources" 
                :key="s.id" 
                class="sc-ref"
                @click.stop="openNote(s.id)"
              >📄 {{ s.hpath?.split('/').pop() }}</span>
            </div>
          </div>
        </template>
        
        <div v-if="loading" class="sc-msg assistant">
          <div class="sc-msg-text sc-loading">思考中...</div>
        </div>
      </div>
      
      <!-- Skill 信息 -->
      <div v-if="skillInfo" class="sc-skill" :class="{ expanded: skillExpanded }">
        <div class="sc-skill-bar" @click="skillExpanded = !skillExpanded">
          <span>🔍 {{ skillInfo.keywords.join(' ') || '无' }}</span>
          <span>{{ skillInfo.notes.length }} 条 · {{ skillInfo.queryTime }}ms {{ skillExpanded ? '▼' : '▶' }}</span>
        </div>
        <div v-show="skillExpanded" class="sc-skill-list">
          <div v-for="n in skillInfo.notes" :key="n.id" class="sc-skill-item" @click="openNote(n.id)">
            <span class="sc-skill-path">{{ n.hpath }}</span>
            <span class="sc-skill-preview">{{ preview(n.content) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 输入框 -->
      <div class="sc-chat-foot">
        <textarea 
          ref="inputEl"
          v-model="input" 
          class="sc-input"
          rows="1"
          placeholder="输入问题，Enter 发送..."
          @keydown="onKey"
        ></textarea>
      </div>
      
      <!-- 提示 -->
      <div class="sc-hint">
        <span>点击回复插入 · ↑↓ 选择 · Tab 插入</span>
        <span class="sc-keys">Esc 关闭</span>
      </div>
    </div>
  </div>
</template>
