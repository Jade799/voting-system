<template>
  <div class="home-page">
    <!-- 搜索 & 筛选栏 -->
    <div class="filter-bar">
      <div class="search-section">
        <el-input
          v-model="searchText"
          placeholder="搜索投票标题或描述..."
          :prefix-icon="Search"
          clearable
          size="large"
          class="search-input-main"
          @input="onSearch"
        >
          <template #append>
            <el-button @click="onSearch">
              <el-icon><Search /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>

      <div class="filter-chips">
        <div class="chip-group">
          <span class="chip-label">状态：</span>
          <el-check-tag
            :checked="statusFilter === 'all'"
            @change="statusFilter = 'all'"
          >全部</el-check-tag>
          <el-check-tag
            :checked="statusFilter === 'active'"
            type="success"
            @change="statusFilter = 'active'"
          >进行中</el-check-tag>
          <el-check-tag
            :checked="statusFilter === 'ended'"
            type="danger"
            @change="statusFilter = 'ended'"
          >已结束</el-check-tag>
          <el-check-tag
            :checked="statusFilter === 'pending'"
            type="info"
            @change="statusFilter = 'pending'"
          >待审核</el-check-tag>
        </div>

        <div class="chip-group">
          <span class="chip-label">算法：</span>
          <el-check-tag
            :checked="algoFilter === 'all'"
            @change="algoFilter = 'all'"
          >全部</el-check-tag>
          <el-check-tag
            v-for="(label, key) in algorithmLabels"
            :key="key"
            :checked="algoFilter === key"
            :style="algoFilter === key ? { background: algorithmColors[key] + '20', borderColor: algorithmColors[key], color: algorithmColors[key] } : {}"
            @change="algoFilter = key"
          >{{ label }}</el-check-tag>
        </div>

        <div class="chip-group sort-group">
          <span class="chip-label">排序：</span>
          <el-radio-group v-model="sortBy" size="small">
            <el-radio-button value="newest">最新</el-radio-button>
            <el-radio-button value="popular">最热</el-radio-button>
            <el-radio-button value="ending">即将结束</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- 统计 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ filteredPolls.length }}</span>
        <span class="stat-label">个投票</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ activeCount }}</span>
        <span class="stat-label">进行中</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalVotes }}</span>
        <span class="stat-label">总票数</span>
      </div>
    </div>

    <!-- 投票列表 -->
    <div v-if="paginatedPolls.length" class="poll-grid">
      <PollCard v-for="poll in paginatedPolls" :key="poll.id" :poll="poll" />
    </div>

    <el-empty v-else description="没有找到匹配的投票" :image-size="120" />

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination-wrap">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredPolls.length"
        layout="prev, pager, next"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { polls, algorithmLabels, algorithmColors, loadPollsFromDatabase } from '../mock/polls.js'
import PollCard from '../components/PollCard.vue'

const route = useRoute()
const router = useRouter()

const searchText = ref(route.query.q || '')
const statusFilter = ref('all')
const algoFilter = ref('all')
const sortBy = ref('newest')
const currentPage = ref(1)
const pageSize = 8

const onSearch = () => {
  currentPage.value = 1
  router.replace({ query: { q: searchText.value || undefined } })
}

watch(() => route.query.q, (val) => {
  searchText.value = val || ''
})

const filteredPolls = computed(() => {
  let result = [...polls]

  // 搜索
  if (searchText.value.trim()) {
    const q = searchText.value.trim().toLowerCase()
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.creator.toLowerCase().includes(q)
    )
  }

  // 状态筛选
  if (statusFilter.value !== 'all') {
    result = result.filter(p => p.status === statusFilter.value)
  }

  // 算法筛选
  if (algoFilter.value !== 'all') {
    result = result.filter(p => p.algorithm === algoFilter.value)
  }

  // 排序
  if (sortBy.value === 'newest') {
    result.sort((a, b) => b.createdAt - a.createdAt)
  } else if (sortBy.value === 'popular') {
    result.sort((a, b) => b.totalVotes - a.totalVotes)
  } else if (sortBy.value === 'ending') {
    result.sort((a, b) => {
      if (a.status === 'ended' && b.status !== 'ended') return 1
      if (a.status !== 'ended' && b.status === 'ended') return -1
      return a.endAt - b.endAt
    })
  }

  return result
})

const activeCount = computed(() =>
  polls.filter(p => p.status === 'active').length
)

const totalVotes = computed(() =>
  polls.reduce((s, p) => s + p.totalVotes, 0)
)

const totalPages = computed(() =>
  Math.ceil(filteredPolls.value.length / pageSize)
)

const paginatedPolls = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredPolls.value.slice(start, start + pageSize)
})

watch([statusFilter, algoFilter, sortBy], () => {
  currentPage.value = 1
})

onMounted(() => {
  loadPollsFromDatabase()
})
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.filter-bar {
  margin-bottom: 20px;
}
.search-section {
  margin-bottom: 16px;
}
.search-input-main {
  max-width: 600px;
}
.filter-chips {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.chip-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.chip-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  min-width: 50px;
}
.sort-group :deep(.el-radio-button__inner) {
  padding: 4px 12px;
  font-size: 12px;
}
.stats-bar {
  display: flex;
  gap: 32px;
  padding: 16px 0;
  margin-bottom: 20px;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}
.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}
.stat-label {
  font-size: 13px;
  color: #909399;
}
.poll-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}
.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
</style>
