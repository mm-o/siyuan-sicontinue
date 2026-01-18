<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Agent from './components/Agent.vue'
import ChatDialog from './components/ChatDialog.vue'
import { EVENTS, type Agent as AgentType } from './types'
import { getSettingsManager } from './main'

const showAgent = ref(false)
const showChat = ref(false)
const chatAgent = ref<AgentType | null>(null)
const chatPos = ref<{ x: number; y: number } | undefined>()
const chatRange = ref<Range | undefined>()

onMounted(() => {
  window.addEventListener(EVENTS.SHOW_AGENT_SELECTOR, () => showAgent.value = true)
  
  window.addEventListener('sicontinue:openChat', ((e: CustomEvent<{ agentId: string; pos?: { x: number; y: number }; range?: Range }>) => {
    const settings = getSettingsManager()?.settings
    const agent = settings?.agents.find(a => a.id === e.detail.agentId)
    if (agent) {
      chatAgent.value = agent
      chatPos.value = e.detail.pos
      chatRange.value = e.detail.range
      showChat.value = true
    }
  }) as EventListener)
})
</script>

<template>
  <Agent v-if="showAgent" @close="showAgent = false" />
  <ChatDialog v-if="showChat && chatAgent" :agent="chatAgent" :pos="chatPos" :range="chatRange" @close="showChat = false" />
</template>
