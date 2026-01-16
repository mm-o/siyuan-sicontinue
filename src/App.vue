<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Agent from './components/Agent.vue'
import { EVENTS } from './types'

const showAgent = ref(false)

onMounted(() => {
  window.addEventListener(EVENTS.SHOW_AGENT_SELECTOR, () => showAgent.value = true)
})
</script>

<template>
  <Agent v-if="showAgent" @close="showAgent = false" />
</template>
