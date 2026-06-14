<template>
  <div id="voting-app">
    <template v-if="route.meta?.layout === 'blank'">
      <router-view />
    </template>
    <template v-else>
      <Navbar />
      <main class="main-content">
        <router-view />
      </main>
    </template>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'

const route = useRoute()

watch(
  () => route.meta?.title,
  (title) => {
    document.title = title ? `${title} - 智选投票` : '智选投票'
  },
  { immediate: true }
)
</script>

<style scoped>
#voting-app { min-height: 100vh; background: #f5f7fa; }
.main-content { min-height: calc(100vh - 60px); }
</style>
