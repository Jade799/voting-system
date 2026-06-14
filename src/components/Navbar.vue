<template>
  <el-menu mode="horizontal" class="navbar" :ellipsis="false" router>
    <el-menu-item index="/" class="logo-item">
      <div class="logo">
        <el-icon :size="24"><TrendCharts /></el-icon>
        <span class="logo-text">智选投票</span>
      </div>
    </el-menu-item>

    <el-menu-item index="/"><el-icon><HomeFilled /></el-icon>投票广场</el-menu-item>
    <el-menu-item index="/create"><el-icon><Plus /></el-icon>创建投票</el-menu-item>
    <el-menu-item index="/mypolls"><el-icon><Document /></el-icon>我的投票</el-menu-item>
    <el-menu-item index="/profile"><el-icon><User /></el-icon>个人主页</el-menu-item>

    <div class="navbar-right">
      <el-input
        v-model="searchQuery"
        placeholder="搜索投票"
        :prefix-icon="Search"
        clearable
        class="search-input"
        @keyup.enter="doSearch"
      />
      <el-dropdown trigger="click" @command="handleCommand">
        <div class="user-avatar">
          <el-avatar :size="32" :src="user.avatar || defaultAvatar" />
          <span class="username">{{ user.nickname }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile"><el-icon><User /></el-icon>个人主页</el-dropdown-item>
            <el-dropdown-item command="mypolls"><el-icon><Document /></el-icon>我的投票</el-dropdown-item>
            <el-dropdown-item divided command="logout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </el-menu>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { TrendCharts, HomeFilled, Plus, Document, Search, ArrowDown, User, SwitchButton } from '@element-plus/icons-vue'
import { currentUser } from '../mock/polls.js'
import { api, clearSession, getToken, setSession } from '../services/api.js'
import defaultAvatar from '../assets/head_portrait.png'

const router = useRouter()
const user = currentUser
const searchQuery = ref('')

const doSearch = () => {
  router.push({ path: '/', query: { q: searchQuery.value.trim() || undefined } })
}

const handleCommand = (cmd) => {
  if (cmd === 'profile') router.push('/profile')
  else if (cmd === 'mypolls') router.push('/mypolls')
  else if (cmd === 'logout') {
    clearSession()
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}

onMounted(async () => {
  if (!getToken()) return
  try {
    const { data } = await api.get('/user/profile')
    setSession(null, data)
  } catch (err) {
    console.warn('导航栏用户资料同步失败:', err.response?.data?.error || err.message)
  }
})
</script>

<style scoped>
.navbar { padding: 0 24px; display: flex; align-items: center; border-bottom: 1px solid #e4e7ed; background: #fff; height: 60px; }
.logo-item { pointer-events: none !important; border-bottom: none !important; margin-right: 16px; }
.logo { display: flex; align-items: center; gap: 8px; color: #409eff; }
.logo-text { font-size: 20px; font-weight: 700; color: #303133; }
.navbar-right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
.search-input { width: 220px; }
.search-input :deep(.el-input__wrapper) { border-radius: 20px; }
.user-avatar { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: background 0.2s; }
.user-avatar:hover { background: #f5f7fa; }
.username { font-size: 14px; color: #606266; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:deep(.el-avatar img) { width: 100%; height: 100%; object-fit: cover; }
</style>
