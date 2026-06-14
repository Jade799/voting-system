<template>
  <div class="login-wrapper">
    <el-card class="login-card">
      <div class="login-logo">
        <el-icon :size="36" color="#409eff"><TrendCharts /></el-icon>
        <h2 class="title">智选投票系统</h2>
      </div>

      <el-tabs v-model="mode" class="login-tabs">
        <el-tab-pane label="登录" name="login" />
        <el-tab-pane label="注册" name="register" />
      </el-tabs>

      <el-form :model="form" label-position="top" @keyup.enter="onSubmit">
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="请输入手机号或邮箱" :prefix-icon="User" clearable />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" :prefix-icon="Lock" />
        </el-form-item>

        <el-form-item v-if="mode === 'register'" label="昵称">
          <el-input v-model="form.nickname" placeholder="设置你的昵称（可选）" :prefix-icon="EditPen" clearable />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" class="submit-btn" :loading="loading" @click="onSubmit">
            {{ mode === 'login' ? '立即登录' : '注册并登录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { TrendCharts, User, Lock, EditPen } from '@element-plus/icons-vue'
import { api, setSession } from '../services/api.js'

const router = useRouter()
const mode = ref('login')
const loading = ref(false)
const form = reactive({ username: '', password: '', nickname: '' })

const onSubmit = async () => {
  if (!form.username.trim() || !form.password.trim()) {
    ElMessage.warning('请填写账号和密码')
    return
  }
  loading.value = true
  try {
    const url = mode.value === 'login' ? '/login' : '/register'
    const { data } = await api.post(url, form)
    setSession(data.token, data.user)
    ElMessage.success(mode.value === 'login' ? '登录成功' : '注册成功，欢迎加入')
    router.push('/')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #e8f4ff 0%, #d0e8ff 50%, #eef2f7 100%);
}
.login-card { width: 400px; padding: 16px 24px 24px; border-radius: 12px; box-shadow: 0 8px 32px rgba(64,158,255,0.15); }
.login-logo { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 8px; }
.title { margin: 0; font-size: 20px; color: #303133; font-weight: 700; }
.login-tabs { margin-bottom: 8px; }
.submit-btn { width: 100%; height: 42px; font-size: 15px; border-radius: 8px; }
</style>
