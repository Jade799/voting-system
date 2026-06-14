<template>
  <div class="results-page">
    <div v-loading="loading">
      <div v-if="poll" class="results-container">
        <div class="results-header">
          <div class="header-top">
            <el-tag :type="statusTypes[poll.status]" effect="dark" size="small">{{ statusLabels[poll.status] }}</el-tag>
            <el-tag
              :style="{ background: algorithmColors[poll.algorithm] + '20', color: algorithmColors[poll.algorithm], borderColor: algorithmColors[poll.algorithm] }"
              size="small"
            >
              {{ algorithmLabels[poll.algorithm] }}
            </el-tag>
            <el-tag :type="poll.requireRealName ? 'warning' : 'info'" size="small">
              {{ poll.requireRealName ? '强制公开身份' : '可匿名' }}
            </el-tag>
          </div>
          <h1 class="results-title">{{ poll.title }}</h1>
          <p class="results-desc">{{ poll.description || '暂无描述' }}</p>
          <div class="results-meta">
            <span>发起人：{{ poll.creator }}</span>
            <span>总参与：{{ poll.totalVotes }} 人</span>
            <span>截止：{{ formatDate(poll.endAt) }}</span>
          </div>
        </div>

        <div class="chart-section">
          <h2 class="section-title"><el-icon><DataAnalysis /></el-icon>投票结果</h2>
          <ResultChart :poll="poll" />
        </div>

        <div class="data-section">
          <h2 class="section-title"><el-icon><List /></el-icon>详细数据</h2>
          <el-table :data="tableData" stripe style="width: 100%" class="results-table">
            <el-table-column type="index" label="排名" width="70" align="center">
              <template #default="{ $index }">
                <span class="rank-badge" :class="rankClass($index)">{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="label" label="选项" min-width="160" />
            <el-table-column :label="valueLabel" width="150" align="center">
              <template #default="{ row }"><span class="value-cell">{{ formatValue(row.count) }}</span></template>
            </el-table-column>
            <el-table-column label="占比" width="220" align="center">
              <template #default="{ row }">
                <el-progress :percentage="row.pct" :color="algorithmColors[poll.algorithm]" :stroke-width="16" :text-inside="true" />
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="realname-section">
          <div class="realname-header">
            <div>
              <h2 class="section-title"><el-icon><User /></el-icon>公开投票记录</h2>
              <p>公开身份投票会在这里显示投票人标识和选择；匿名投票只显示数量。企业内部投票显示真实姓名。</p>
            </div>
            <el-tag effect="plain">匿名 {{ anonymousCount }} 条</el-tag>
          </div>

          <el-empty v-if="publicVotes.length === 0" description="暂无公开投票记录" :image-size="80" />
          <div v-else class="realname-list">
            <div v-for="record in publicVotes" :key="record.id" class="realname-item">
              <div class="voter-info">
                <strong>{{ record.voterName }}</strong>
                <span>{{ formatDateTime(record.createdAt) }}</span>
              </div>
              <div class="choice-list">
                <el-tag v-for="choice in record.choices" :key="choice" size="small" effect="plain">{{ choice }}</el-tag>
              </div>
            </div>
          </div>
        </div>

        <div class="results-actions">
          <el-button v-if="poll.status === 'active'" type="primary" size="large" @click="$router.push(`/vote/${poll.id}`)">
            <el-icon><Select /></el-icon>去投票
          </el-button>
          <el-button size="large" @click="$router.push('/')"><el-icon><Back /></el-icon>返回列表</el-button>
        </div>
      </div>
      <el-empty v-else :description="errorText || '投票不存在'" :image-size="120" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Back, DataAnalysis, List, Select, User } from '@element-plus/icons-vue'
import { algorithmColors, algorithmLabels, statusLabels, statusTypes } from '../mock/polls.js'
import { api, fetchPoll } from '../services/api.js'
import ResultChart from '../components/ResultChart.vue'

const route = useRoute()
const poll = ref(null)
const loading = ref(false)
const errorText = ref('')
const publicVotes = ref([])
const anonymousCount = ref(0)

const valueLabel = computed(() => {
  if (!poll.value) return ''
  if (poll.value.algorithm === 'scoring') return '平均分'
  if (poll.value.algorithm === 'borda') return 'Borda 分数'
  if (poll.value.algorithm === 'weighted') return '平均权重'
  return '得票数'
})

const tableData = computed(() => {
  if (!poll.value) return []
  const sorted = [...poll.value.options].sort((a, b) => b.count - a.count)
  if (poll.value.algorithm === 'scoring') {
    return sorted.map((option) => ({ label: option.label, count: option.count, pct: Math.round((option.count / 10) * 100) }))
  }
  if (poll.value.algorithm === 'borda') {
    const max = Math.max(...sorted.map((option) => option.count), 1)
    return sorted.map((option) => ({ label: option.label, count: option.count, pct: Math.round((option.count / max) * 100) }))
  }
  if (poll.value.algorithm === 'weighted') {
    const total = sorted.reduce((sum, option) => sum + option.count, 0) || 1
    return sorted.map((option) => ({ label: option.label, count: option.count, pct: Math.round((option.count / total) * 100) }))
  }
  const total = poll.value.totalVotes || 1
  return sorted.map((option) => ({ label: option.label, count: option.count, pct: Math.round((option.count / total) * 100) }))
})

const loadPublicVotes = async () => {
  try {
    const { data } = await api.get(`/polls/${route.params.id}/public-votes`)
    publicVotes.value = data.visible || []
    anonymousCount.value = data.anonymousCount || 0
  } catch (err) {
    publicVotes.value = []
    anonymousCount.value = 0
  }
}

const loadResult = async () => {
  loading.value = true
  try {
    poll.value = await fetchPoll(route.params.id)
    await loadPublicVotes()
  } catch (err) {
    errorText.value = err.response?.data?.error || '投票不存在'
  } finally {
    loading.value = false
  }
}

const formatValue = (value) => Number.isInteger(Number(value)) ? String(value) : Number(value).toFixed(1)
const rankClass = (idx) => idx === 0 ? 'rank-gold' : idx === 1 ? 'rank-silver' : idx === 2 ? 'rank-bronze' : ''
const formatDate = (ts) => {
  const d = new Date(Number(ts))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const formatDateTime = (ts) => {
  const d = new Date(Number(ts))
  return `${formatDate(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(loadResult)
</script>

<style scoped>
.results-page { max-width: 900px; margin: 0 auto; padding: 24px; }
.results-container { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
.results-header { padding: 32px 32px 24px; border-bottom: 1px solid #f0f0f0; }
.header-top { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.results-title { margin: 0 0 8px; font-size: 24px; color: #303133; }
.results-desc { margin: 0 0 16px; font-size: 14px; color: #606266; }
.results-meta { display: flex; gap: 24px; font-size: 13px; color: #909399; flex-wrap: wrap; }
.section-title { display: flex; align-items: center; gap: 8px; font-size: 18px; color: #303133; margin: 0 0 16px; }
.chart-section, .data-section, .realname-section { padding: 32px; border-bottom: 1px solid #f0f0f0; }
.rank-badge { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px; font-weight: 700; background: #f0f0f0; color: #909399; }
.rank-gold { background: #fff7e6; color: #faad14; }
.rank-silver { background: #f5f5f5; color: #8c8c8c; }
.rank-bronze { background: #fff2e8; color: #d46b08; }
.value-cell { font-size: 16px; font-weight: 600; color: #303133; }
.realname-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.realname-header p { margin: -8px 0 0; font-size: 12px; color: #909399; }
.realname-list { display: flex; flex-direction: column; gap: 10px; }
.realname-item { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; background: #fafafa; border-radius: 8px; }
.voter-info { display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
.voter-info strong { font-size: 14px; color: #303133; }
.voter-info span { font-size: 12px; color: #909399; }
.choice-list { display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
.results-actions { display: flex; justify-content: center; gap: 16px; padding: 24px 32px 32px; }
</style>
