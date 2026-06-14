<template>
  <div class="vote-list-wrapper">
    <div class="list-toolbar">
      <span class="list-count">共 <strong>{{ list.length }}</strong> 条记录</span>
      <el-select v-model="sortOrder" size="small" style="width: 120px">
        <el-option label="最新优先" value="newest" />
        <el-option label="票数最多" value="most" />
        <el-option label="即将结束" value="ending" />
      </el-select>
    </div>

    <el-empty v-if="sortedList.length === 0" description="暂无投票记录" :image-size="80" />

    <div v-else class="vote-list">
      <div
        v-for="item in sortedList"
        :key="item.id"
        class="vote-item"
        :class="{ 'is-ended': item.status === 'ended', 'is-pending': item.status === 'pending' }"
      >
        <div class="status-stripe" :class="`stripe-${item.status}`"></div>
        <div class="item-body">
          <div class="item-top">
            <span class="item-title">{{ item.title }}</span>
            <el-tag :type="statusTypes[item.status]" effect="light" size="small" round>{{ statusLabels[item.status] }}</el-tag>
          </div>
          <div class="item-meta">
            <el-tag
              :style="{ background: algorithmColors[item.algorithm] + '18', color: algorithmColors[item.algorithm], borderColor: algorithmColors[item.algorithm] + '40' }"
              size="small"
              effect="plain"
            >
              {{ algorithmLabels[item.algorithm] }}
            </el-tag>
            <span class="meta-text">创建于 {{ formatDate(item.createdAt) }}</span>
            <span class="meta-text">{{ getTimeInfo(item) }}</span>
            <span v-if="item.visibility !== 'public'" class="meta-text">{{ visibilityLabels[item.visibility] }}</span>
          </div>
          <div class="progress-header">
            <span class="voter-info"><el-icon><User /></el-icon>{{ item.totalVotes }} 人参与</span>
            <span class="options-preview">
              <span v-for="opt in item.options.slice(0, 3)" :key="opt.id" class="opt-chip">{{ opt.label }} <strong>{{ opt.count }}</strong></span>
            </span>
          </div>
        </div>

        <div class="item-actions">
          <el-button type="primary" size="small" plain :icon="View" @click="handleView(item)">查看详情</el-button>
          <el-popconfirm
            v-if="deletable"
            title="确认删除这条投票？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            confirm-button-type="danger"
            :icon="WarningFilled"
            icon-color="#f56c6c"
            @confirm="emit('delete', item)"
          >
            <template #reference>
              <el-button type="danger" size="small" plain :icon="Delete">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { View, Delete, User, WarningFilled } from '@element-plus/icons-vue'
import { algorithmLabels, algorithmColors, statusLabels, statusTypes, visibilityLabels } from '../mock/polls.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
  deletable: { type: Boolean, default: false }
})

const emit = defineEmits(['delete'])
const router = useRouter()
const sortOrder = ref('newest')
const list = computed(() => props.data)

const sortedList = computed(() => {
  const arr = [...list.value]
  if (sortOrder.value === 'most') return arr.sort((a, b) => b.totalVotes - a.totalVotes)
  if (sortOrder.value === 'ending') return arr.sort((a, b) => a.endAt - b.endAt)
  return arr.sort((a, b) => b.createdAt - a.createdAt)
})

const handleView = (item) => {
  router.push(item.status === 'ended' ? `/results/${item.id}` : `/vote/${item.id}`)
}

const formatDate = (ts) => {
  const d = new Date(Number(ts))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getTimeInfo = (item) => {
  if (item.status === 'ended') return '已结束'
  if (item.status === 'pending') return '待审核'
  const diff = item.endAt - Date.now()
  if (diff <= 0) return '已结束'
  const days = Math.floor(diff / 86400000)
  const hours = Math.ceil((diff % 86400000) / 3600000)
  return days > 0 ? `剩余 ${days} 天` : `剩余 ${Math.max(hours, 1)} 小时`
}
</script>

<style scoped>
.vote-list-wrapper { display: flex; flex-direction: column; gap: 12px; }
.list-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 0 2px 4px; }
.list-count { font-size: 13px; color: #909399; }
.list-count strong { color: #303133; font-weight: 700; }
.vote-list { display: flex; flex-direction: column; gap: 12px; }
.vote-item { display: flex; align-items: stretch; background: #fff; border-radius: 8px; border: 1px solid #ebeef5; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s; }
.vote-item:hover { border-color: #c6e0ff; box-shadow: 0 4px 16px rgba(64,158,255,0.1); }
.vote-item.is-ended { opacity: 0.75; }
.vote-item.is-pending { border-style: dashed; }
.status-stripe { width: 4px; flex-shrink: 0; }
.stripe-active { background: #67c23a; }
.stripe-ended { background: #dcdfe6; }
.stripe-pending { background: #e6a23c; }
.item-body { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.item-top { display: flex; align-items: center; gap: 10px; }
.item-title { font-size: 15px; font-weight: 600; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.item-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.meta-text { font-size: 12px; color: #909399; }
.progress-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.voter-info { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #606266; }
.options-preview { display: flex; gap: 6px; flex-wrap: wrap; }
.opt-chip { font-size: 11px; color: #909399; background: #f5f7fa; padding: 2px 7px; border-radius: 10px; border: 1px solid #e4e7ed; }
.opt-chip strong { color: #303133; margin-left: 3px; }
.item-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  width: 130px;
  padding: 14px 16px;
  border-left: 1px solid #f5f7fa;
  flex-shrink: 0;
}
.item-actions :deep(.el-button) {
  width: 104px;
  margin-left: 0 !important;
  justify-content: center;
}
.item-actions :deep(.el-popover__reference-wrapper) {
  display: block;
  width: 104px;
}
</style>
