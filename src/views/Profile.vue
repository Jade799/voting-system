<template>
  <div class="profile-page-wrapper">
    <div class="profile-content-container" v-loading="loading">
      <UserInfoCard
        :nickname="globalUserInfo.nickname"
        :signature="globalUserInfo.signature"
        :avatar="globalUserInfo.avatar"
        :bgImage="globalUserInfo.bgImage"
        :isCertified="globalUserInfo.isCertified"
        :stats="stats"
      />

      <div class="content-grid">
        <aside class="sidebar-simple">
          <div
            v-for="item in menuItems"
            :key="item.name"
            class="menu-item"
            :class="{ active: activeMenu === item.name }"
            @click="activeMenu = item.name"
          >
            {{ item.label }}
          </div>
        </aside>

        <main class="dashboard-grid" v-if="activeMenu === 'profile'">
          <div class="left-content-stack">
            <div class="top-row-split">
              <section class="module-card">
                <div class="module-header"><span class="blue-line"></span><h3>账号设置</h3></div>
                <EnterprisePanel :initialUserInfo="globalUserInfo" @update-user="handleUserUpdate" />
              </section>

              <section class="module-card">
                <div class="module-header"><span class="blue-line"></span><h3>投票记录</h3></div>
                <VoteRecords :records="votedPolls.slice(0, 5)" />
              </section>
            </div>

            <section class="module-card stats-overview-module">
              <div class="module-header"><span class="blue-line"></span><h3>投票统计概览</h3></div>
              <div class="stats-data-row">
                <div class="stat-card"><span class="stat-value">{{ stats.voted }}</span><span class="stat-label">参与投票</span></div>
                <div class="stat-card"><span class="stat-value">{{ stats.created }}</span><span class="stat-label">发布投票</span></div>
                <div class="stat-card"><span class="stat-value">{{ stats.enterprise }}</span><span class="stat-label">企业内部投票</span></div>
              </div>
            </section>
          </div>

          <section class="module-card right-activity-column">
            <div class="module-header"><span class="blue-line"></span><h3>我的活动</h3></div>
            <ActivityTimeline :activities="activities" />
          </section>
        </main>

        <main v-else-if="activeMenu === 'security'" class="single-panel">
          <section class="module-card">
            <div class="module-header"><span class="blue-line"></span><h3>账号安全</h3></div>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="登录状态">当前账号已通过本地登录令牌访问接口</el-descriptions-item>
              <el-descriptions-item label="企业认证">{{ globalUserInfo.isCertified ? '已认证' : '未认证' }}</el-descriptions-item>
            </el-descriptions>
          </section>
        </main>

        <main v-else-if="activeMenu === 'privacy'" class="single-panel">
          <section class="module-card">
            <div class="module-header"><span class="blue-line"></span><h3>隐私设置</h3></div>
            <div class="privacy-options">
              <el-checkbox v-model="privacy.showActivity">在个人主页展示活动记录</el-checkbox>
              <el-checkbox v-model="privacy.showEnterprise">展示企业认证标识</el-checkbox>
            </div>
          </section>
        </main>

        <main v-else-if="activeMenu === 'enterprise'" class="single-panel">
          <section class="module-card">
            <div class="module-header"><span class="blue-line"></span><h3>企业内部投票空间</h3></div>
            <el-alert
              v-if="!globalUserInfo.isCertified"
              title="完成企业认证后，可进入所属企业内部投票空间"
              type="warning"
              show-icon
              :closable="false"
            />
            <VoteList v-else :data="enterprisePolls" />
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import UserInfoCard from '../components/UserInfoCard.vue'
import EnterprisePanel from '../components/EnterprisePanel.vue'
import VoteRecords from '../components/VoteRecords.vue'
import ActivityTimeline from '../components/ActivityTimeline.vue'
import VoteList from '../components/VoteList.vue'
import { currentUser } from '../mock/polls.js'
import { api, setSession } from '../services/api.js'

const globalUserInfo = currentUser
const activeMenu = ref('profile')
const loading = ref(false)
const createdPolls = ref([])
const votedPolls = ref([])
const enterprisePolls = ref([])
const activities = ref([])
const privacy = reactive({ showActivity: true, showEnterprise: true })

const menuItems = [
  { name: 'profile', label: '个人资料' },
  { name: 'security', label: '账号安全' },
  { name: 'privacy', label: '隐私设置' },
  { name: 'enterprise', label: '企业空间' }
]

const stats = computed(() => ({
  created: createdPolls.value.length,
  voted: votedPolls.value.length,
  enterprise: enterprisePolls.value.length
}))

const loadProfileData = async () => {
  loading.value = true
  try {
    const [profileRes, createdRes, votedRes, activitiesRes, enterpriseRes] = await Promise.all([
      api.get('/user/profile'),
      api.get('/user/polls'),
      api.get('/user/votes'),
      api.get('/user/activities'),
      api.get('/polls', { params: { enterprise: '1' } })
    ])
    setSession(null, profileRes.data)
    createdPolls.value = createdRes.data
    votedPolls.value = votedRes.data
    activities.value = activitiesRes.data
    enterprisePolls.value = enterpriseRes.data
  } catch (err) {
    console.warn('个人主页数据加载失败:', err.response?.data?.error || err.message)
  } finally {
    loading.value = false
  }
}

const handleUserUpdate = (newInfo) => {
  setSession(null, newInfo)
  loadProfileData()
}

onMounted(loadProfileData)
</script>

<style scoped>
.profile-page-wrapper { background-color: #f7f9fc; min-height: 100vh; padding: 20px 0 50px; }
.profile-content-container { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px; padding: 0 20px; }
.content-grid { display: grid; grid-template-columns: 200px 1fr; gap: 25px; }
.dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: stretch; }
.left-content-stack { display: flex; flex-direction: column; gap: 20px; }
.top-row-split { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.right-activity-column { height: 100%; }
.single-panel { min-width: 0; }
.stats-data-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 10px 0; }
.stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; transition: 0.3s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.stat-value { display: block; font-size: 28px; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 13px; color: #64748b; margin-top: 5px; }
.module-card { background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #edf2f7; }
.module-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.blue-line { width: 4px; height: 16px; background: #3b82f6; border-radius: 2px; }
.module-header h3 { margin: 0; font-size: 16px; color: #1e293b; font-weight: 600; }
.sidebar-simple { display: flex; flex-direction: column; gap: 5px; }
.menu-item { padding: 12px 20px; border-radius: 8px; cursor: pointer; color: #64748b; font-size: 14px; }
.menu-item.active, .menu-item:hover { background: #e0e7ff; color: #4f7fe8; font-weight: 600; }
.privacy-options { display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 1000px) {
  .content-grid, .dashboard-grid, .top-row-split { grid-template-columns: 1fr; }
  .sidebar-simple { flex-direction: row; flex-wrap: wrap; }
}
</style>
