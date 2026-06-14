<template>
  <div class="vote-records-list">
    <el-empty v-if="records.length === 0" description="暂无投票记录" :image-size="70" />
    <div v-for="(item, index) in records" v-else :key="item.id" class="vote-item" @click="$router.push(`/results/${item.id}`)">
      <div class="item-info">
        <div class="item-title">
          <span class="index">{{ index + 1 }}.</span>
          <span class="text">{{ item.title }}</span>
        </div>
        <div class="item-time">{{ formatDate(item.votedAt || item.createdAt) }}</div>
      </div>
      <el-tag :type="statusTypes[item.status]" size="small" effect="plain">{{ statusLabels[item.status] }}</el-tag>
    </div>
  </div>
</template>

<script setup>
import { statusLabels, statusTypes } from '../mock/polls.js'

defineProps({
  records: { type: Array, default: () => [] }
})

const formatDate = (ts) => {
  const d = new Date(Number(ts))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.vote-records-list { display: flex; flex-direction: column; gap: 12px; }
.vote-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; cursor: pointer; }
.vote-item:last-child { border-bottom: none; }
.item-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.item-title { display: flex; gap: 8px; font-size: 14px; font-weight: 500; color: #1e293b; min-width: 0; }
.item-title .index { color: #64748b; }
.item-title .text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-time { font-size: 12px; color: #94a3b8; padding-left: 20px; }
</style>
