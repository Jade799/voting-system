<template>
  <div class="mypolls-page">
    <div class="page-header">
      <h1>我的投票</h1>
      <el-button type="primary" @click="$router.push('/create')">
        <el-icon><Plus /></el-icon>创建投票
      </el-button>
    </div>

    <el-alert
      v-if="errorText"
      :title="errorText"
      type="warning"
      show-icon
      :closable="false"
      class="page-alert"
    />

    <el-tabs v-model="tab" class="polls-tabs" v-loading="loading">
      <el-tab-pane label="我创建的" name="created">
        <VoteList :data="createdPolls" deletable @delete="handleDelete" />
      </el-tab-pane>
      <el-tab-pane label="我参与的" name="voted">
        <VoteList :data="votedPolls" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { api } from '../services/api.js'
import VoteList from '../components/VoteList.vue'

const tab = ref('created')
const createdPolls = ref([])
const votedPolls = ref([])
const loading = ref(false)
const errorText = ref('')

const loadMyPolls = async () => {
  loading.value = true
  errorText.value = ''
  try {
    const [createdRes, votedRes] = await Promise.all([
      api.get('/user/polls'),
      api.get('/user/votes')
    ])
    createdPolls.value = createdRes.data
    votedPolls.value = votedRes.data
  } catch (err) {
    errorText.value = err.response?.data?.error || '请先登录后查看我的投票'
  } finally {
    loading.value = false
  }
}

const handleDelete = async (item) => {
  try {
    await api.delete(`/polls/${item.id}`)
    createdPolls.value = createdPolls.value.filter((poll) => poll.id !== item.id)
    ElMessage.success('已删除投票')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '删除失败')
  }
}

onMounted(loadMyPolls)
</script>

<style scoped>
.mypolls-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { margin: 0; font-size: 24px; color: #303133; }
.page-alert { margin-bottom: 16px; }
.polls-tabs :deep(.el-tabs__header) { margin-bottom: 20px; }
</style>
