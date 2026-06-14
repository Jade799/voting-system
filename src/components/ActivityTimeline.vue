<template>
  <div class="activity-timeline">
    <el-empty v-if="recentActivities.length === 0" description="暂无活动" :image-size="70" />
    <el-timeline v-else>
      <el-timeline-item
        v-for="activity in recentActivities"
        :key="activity.id"
        :type="activity.type === 'created' ? 'primary' : 'success'"
        :hollow="true"
        :timestamp="formatDate(activity.timestamp)"
      >
        <div class="activity-content" @click="$router.push(`/results/${activity.pollId}`)">
          <div class="activity-name">{{ activity.title }}</div>
          <div class="activity-desc">{{ activity.type === 'created' ? '发布了投票' : '参与了投票' }}</div>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activities: { type: Array, default: () => [] }
})

const recentActivities = computed(() => props.activities.slice(0, 5))

const formatDate = (ts) => {
  const d = new Date(Number(ts))
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.activity-timeline { padding-left: 5px; padding-top: 10px; }
.activity-content { display: flex; flex-direction: column; gap: 4px; cursor: pointer; }
.activity-name { font-size: 14px; font-weight: 600; color: #1e293b; }
.activity-desc { font-size: 12px; color: #94a3b8; }
:deep(.el-timeline-item__node) { background-color: #fff; border: 2px solid #6392f1; }
:deep(.el-timeline-item__timestamp) { font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
</style>
