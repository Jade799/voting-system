<template>
  <div class="vote-page">
    <div v-loading="loading">
      <div v-if="poll" class="vote-container">
        <div class="vote-header">
          <div class="header-top">
            <el-tag :type="statusTypes[poll.status]" effect="dark" size="small">{{ statusLabels[poll.status] }}</el-tag>
            <el-tag
              :style="{ background: algorithmColors[poll.algorithm] + '20', color: algorithmColors[poll.algorithm], borderColor: algorithmColors[poll.algorithm] }"
              size="small"
            >
              {{ algorithmLabels[poll.algorithm] }}
            </el-tag>
            <el-tag v-if="poll.visibility !== 'public'" size="small">{{ visibilityLabels[poll.visibility] }}</el-tag>
            <el-tag :type="poll.requireRealName ? 'warning' : 'info'" size="small">
              {{ poll.requireRealName ? '强制公开身份' : '可匿名' }}
            </el-tag>
          </div>
          <h1 class="vote-title">{{ poll.title }}</h1>
          <p class="vote-desc">{{ poll.description || '暂无描述' }}</p>
          <div class="vote-meta">
            <span>发起人：{{ poll.creator }}</span>
            <span>截止时间：{{ formatDate(poll.endAt) }}</span>
            <span>{{ poll.totalVotes }} 人已参与</span>
          </div>
        </div>

        <div class="vote-body">
          <el-alert
            v-if="poll.denyReason && !hasVoted"
            :title="poll.denyReason"
            type="warning"
            show-icon
            :closable="false"
            class="notice"
          />

          <div v-if="poll.status === 'active' && !hasVoted" class="identity-choice">
            <template v-if="poll.requireRealName">
              <el-alert
                title="本投票要求公开身份参与。普通投票展示用户ID，企业内部投票展示真实姓名。"
                type="warning"
                show-icon
                :closable="false"
              />
            </template>
            <template v-else>
              <div class="identity-title">投票展示方式</div>
              <el-radio-group v-model="isAnonymous">
                <el-radio-button :value="true">匿名投票</el-radio-button>
                <el-radio-button :value="false">公开身份</el-radio-button>
              </el-radio-group>
              <div class="identity-tip">
                选择匿名后，仅统计票数，不展示你的选择；选择公开身份后，普通投票展示用户ID，企业内部投票展示真实姓名。
              </div>
            </template>
          </div>

          <template v-if="poll.algorithm === 'single'">
            <el-radio-group v-model="singleValue" class="vote-options full-row-options">
              <div
                v-for="opt in poll.options"
                :key="opt.id"
                class="vote-option-card"
                :class="{ selected: singleValue === opt.id }"
                @click="singleValue = opt.id"
              >
                <el-radio :value="opt.id" size="large">{{ opt.label }}</el-radio>
              </div>
            </el-radio-group>
          </template>

          <template v-if="poll.algorithm === 'multiple'">
            <el-checkbox-group v-model="multipleValues" class="vote-options full-row-options">
              <div
                v-for="opt in poll.options"
                :key="opt.id"
                class="vote-option-card"
                :class="{ selected: multipleValues.includes(opt.id) }"
                @click="toggleMultiple(opt.id)"
              >
                <el-checkbox :value="opt.id" size="large">{{ opt.label }}</el-checkbox>
              </div>
            </el-checkbox-group>
            <div class="vote-hint">已选 {{ multipleValues.length }} 项</div>
          </template>

          <template v-if="poll.algorithm === 'weighted'">
            <div class="weighted-sum" :style="{ color: usedWeight > 100 ? '#f56c6c' : '#303133' }">{{ usedWeight }} / 100</div>
            <el-progress :percentage="Math.min(usedWeight, 100)" :color="usedWeight > 100 ? '#f56c6c' : '#67c23a'" :stroke-width="20" :text-inside="true" class="weight-progress" />
            <div class="vote-options">
              <div v-for="opt in poll.options" :key="opt.id" class="weighted-item">
                <span class="weighted-label">{{ opt.label }}</span>
                <div class="weighted-control">
                  <el-button size="small" circle :disabled="(weightValues[opt.id] || 0) <= 0" @click="adjustWeight(opt.id, -5)">-</el-button>
                  <el-input-number v-model="weightValues[opt.id]" :min="0" :max="100" :step="5" size="small" controls-position="right" class="weight-input" />
                  <el-button size="small" circle :disabled="(weightValues[opt.id] || 0) >= 100" @click="adjustWeight(opt.id, 5)">+</el-button>
                </div>
              </div>
            </div>
          </template>

          <template v-if="poll.algorithm === 'borda'">
            <div class="vote-hint">按偏好排序，第一名最优先</div>
            <div class="vote-options">
              <div v-for="(opt, idx) in bordaOrdered" :key="opt.id" class="borda-item">
                <span class="borda-rank">{{ idx + 1 }}</span>
                <span class="borda-label">{{ opt.label }}</span>
                <div class="borda-actions">
                  <el-button size="small" :icon="Top" circle :disabled="idx === 0" @click="moveBorda(idx, -1)" />
                  <el-button size="small" :icon="Bottom" circle :disabled="idx === bordaOrdered.length - 1" @click="moveBorda(idx, 1)" />
                </div>
              </div>
            </div>
          </template>

          <template v-if="poll.algorithm === 'scoring'">
            <div class="vote-options">
              <div v-for="opt in poll.options" :key="opt.id" class="scoring-item">
                <span class="scoring-label">{{ opt.label }}</span>
                <el-rate v-model="scoreValues[opt.id]" :max="10" :colors="['#f56c6c','#e6a23c','#67c23a']" show-score score-template="{value} 分" />
              </div>
            </div>
          </template>

          <el-alert v-if="hasVoted" title="你已参与过此投票" type="success" show-icon :closable="false" class="notice" />

          <div class="submit-area">
            <template v-if="poll.status === 'active' && !hasVoted">
              <el-button type="primary" size="large" :disabled="!canSubmit || poll.canVote === false" :loading="submitting" @click="submitVote">
                <el-icon><Select /></el-icon>提交投票
              </el-button>
              <el-button size="large" @click="$router.push(`/results/${poll.id}`)">查看实时结果</el-button>
            </template>
            <template v-else>
              <el-button type="primary" size="large" @click="$router.push(`/results/${poll.id}`)">
                <el-icon><DataAnalysis /></el-icon>查看结果
              </el-button>
            </template>
          </div>

          <section class="public-votes">
            <div class="public-votes-header">
              <div>
                <h3>公开投票记录</h3>
                <p>公开身份投票会展示投票人标识和选择；匿名投票仅显示数量。企业内部投票显示真实姓名。</p>
              </div>
              <el-tag effect="plain">匿名 {{ anonymousCount }} 条</el-tag>
            </div>

            <el-empty v-if="publicVotes.length === 0" description="暂无公开投票记录" :image-size="80" />
            <div v-else class="public-vote-list">
              <div v-for="record in publicVotes" :key="record.id" class="public-vote-item">
                <div class="public-voter">
                  <strong>{{ record.voterName }}</strong>
                  <span>{{ formatDate(record.createdAt) }}</span>
                </div>
                <div class="public-choice">
                  <el-tag v-for="choice in record.choices" :key="choice" size="small" effect="plain">{{ choice }}</el-tag>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <el-empty v-else :description="errorText || '投票不存在'" :image-size="120" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Bottom, DataAnalysis, Select, Top } from '@element-plus/icons-vue'
import { algorithmColors, algorithmLabels, statusLabels, statusTypes, visibilityLabels } from '../mock/polls.js'
import { api, fetchPoll } from '../services/api.js'

const route = useRoute()
const router = useRouter()

const poll = ref(null)
const loading = ref(false)
const submitting = ref(false)
const hasVoted = ref(false)
const errorText = ref('')
const isAnonymous = ref(true)
const singleValue = ref(null)
const multipleValues = ref([])
const weightValues = reactive({})
const bordaOrdered = ref([])
const scoreValues = reactive({})
const publicVotes = ref([])
const anonymousCount = ref(0)

const usedWeight = computed(() => Object.values(weightValues).reduce((sum, value) => sum + Number(value || 0), 0))

const canSubmit = computed(() => {
  if (!poll.value) return false
  switch (poll.value.algorithm) {
    case 'single': return singleValue.value !== null
    case 'multiple': return multipleValues.value.length > 0
    case 'weighted': return usedWeight.value === 100
    case 'borda': return bordaOrdered.value.length === poll.value.options.length
    case 'scoring': return poll.value.options.every((option) => scoreValues[option.id] > 0)
    default: return false
  }
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

const loadPoll = async () => {
  loading.value = true
  errorText.value = ''
  try {
    poll.value = await fetchPoll(route.params.id)
    isAnonymous.value = !poll.value.requireRealName
    bordaOrdered.value = [...poll.value.options]
    poll.value.options.forEach((option) => {
      weightValues[option.id] = 0
      scoreValues[option.id] = 0
    })
    try {
      const { data } = await api.get(`/polls/${poll.value.id}/voted`)
      hasVoted.value = data.voted
    } catch (err) {
      hasVoted.value = false
    }
    await loadPublicVotes()
  } catch (err) {
    poll.value = null
    errorText.value = err.response?.data?.error || '投票不存在'
  } finally {
    loading.value = false
  }
}

const toggleMultiple = (id) => {
  const idx = multipleValues.value.indexOf(id)
  if (idx >= 0) multipleValues.value.splice(idx, 1)
  else multipleValues.value.push(id)
}

const adjustWeight = (id, delta) => {
  weightValues[id] = Math.max(0, Math.min(100, Number(weightValues[id] || 0) + delta))
}

const moveBorda = (idx, dir) => {
  const target = idx + dir
  if (target < 0 || target >= bordaOrdered.value.length) return
  ;[bordaOrdered.value[idx], bordaOrdered.value[target]] = [bordaOrdered.value[target], bordaOrdered.value[idx]]
}

const submitVote = async () => {
  if (!poll.value || !canSubmit.value) return
  submitting.value = true
  try {
    await api.post(`/polls/${poll.value.id}/vote`, {
      algorithm: poll.value.algorithm,
      singleValue: singleValue.value,
      multipleValues: multipleValues.value,
      weightValues,
      bordaOrder: bordaOrdered.value.map((option) => option.id),
      scoreValues,
      isAnonymous: poll.value.requireRealName ? false : isAnonymous.value
    })
    hasVoted.value = true
    ElMessage.success('投票成功')
    await loadPublicVotes()
    router.push(`/results/${poll.value.id}`)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '投票失败')
  } finally {
    submitting.value = false
  }
}

const formatDate = (ts) => {
  const d = new Date(Number(ts))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(loadPoll)
</script>

<style scoped>
.vote-page { max-width: 980px; margin: 0 auto; padding: 24px; }
.vote-container { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
.vote-header { padding: 32px 40px 24px; border-bottom: 1px solid #f0f0f0; }
.header-top { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.vote-title { margin: 0 0 8px; font-size: 24px; color: #303133; }
.vote-desc { margin: 0 0 16px; font-size: 14px; color: #606266; line-height: 1.6; }
.vote-meta { display: flex; gap: 24px; font-size: 13px; color: #909399; flex-wrap: wrap; }
.vote-body { padding: 28px 40px 36px; }
.notice { margin-bottom: 18px; }
.identity-choice { margin-bottom: 20px; padding: 16px; background: #f8fafc; border: 1px solid #edf2f7; border-radius: 8px; }
.identity-title { margin-bottom: 10px; font-size: 14px; font-weight: 700; color: #303133; }
.identity-tip { margin-top: 8px; font-size: 12px; color: #909399; line-height: 1.5; }
.vote-options { width: 100%; display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 20px; }
.full-row-options { align-items: stretch; }
.vote-option-card { box-sizing: border-box; width: 100%; min-height: 64px; display: flex; align-items: center; padding: 16px 20px; border: 2px solid #e4e7ed; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.vote-option-card:hover, .vote-option-card.selected { border-color: #409eff; background: #ecf5ff; }
.vote-option-card :deep(.el-radio), .vote-option-card :deep(.el-checkbox) { width: 100%; height: auto; margin-right: 0; }
.vote-option-card :deep(.el-radio__label), .vote-option-card :deep(.el-checkbox__label) { font-size: 16px; line-height: 1.5; color: #303133; white-space: normal; }
.vote-hint { font-size: 13px; color: #909399; margin-bottom: 12px; }
.weighted-sum { font-size: 36px; font-weight: 700; text-align: center; margin-bottom: 8px; }
.weight-progress { margin-bottom: 24px; }
.weighted-item, .borda-item, .scoring-item { width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: #fafafa; border-radius: 8px; gap: 12px; }
.weighted-label, .borda-label, .scoring-label { flex: 1; font-size: 15px; color: #303133; }
.weighted-control { display: flex; align-items: center; gap: 8px; }
.weight-input { width: 110px; }
.borda-rank { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: #409eff; color: #fff; border-radius: 50%; font-size: 14px; font-weight: 600; flex-shrink: 0; }
.borda-actions { display: flex; gap: 4px; }
.submit-area { display: flex; justify-content: center; gap: 16px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #f0f0f0; }
.public-votes { margin-top: 28px; padding-top: 22px; border-top: 1px solid #f0f0f0; }
.public-votes-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.public-votes-header h3 { margin: 0 0 4px; font-size: 16px; color: #303133; }
.public-votes-header p { margin: 0; font-size: 12px; color: #909399; }
.public-vote-list { display: flex; flex-direction: column; gap: 10px; }
.public-vote-item { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; background: #fafafa; border-radius: 8px; }
.public-voter { display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
.public-voter strong { font-size: 14px; color: #303133; }
.public-voter span { font-size: 12px; color: #909399; }
.public-choice { display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
</style>
