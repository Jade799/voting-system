<template>
  <div class="create-page">
    <div class="create-container">
      <h1 class="page-title">创建投票</h1>

      <el-form :model="form" label-width="110px" class="create-form">
        <el-form-item label="投票标题" required>
          <el-input v-model="form.title" placeholder="请输入投票标题" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="投票描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="说明投票目的、范围或规则" />
        </el-form-item>

        <el-form-item label="投票算法" required>
          <el-radio-group v-model="form.algorithm" class="algo-radio-group">
            <el-radio v-for="(label, key) in algorithmLabels" :key="key" :value="key" class="algo-radio-card">
              <div class="algo-card-inner">
                <el-icon :size="26" :color="algorithmColors[key]"><component :is="getIcon(key)" /></el-icon>
                <span class="algo-name">{{ label }}</span>
                <span class="algo-desc">{{ algoDescriptions[key] }}</span>
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="可投权限" required>
          <el-radio-group v-model="form.visibility" class="visibility-group">
            <el-radio-button value="public">公开投票</el-radio-button>
            <el-radio-button value="certified">认证用户可投</el-radio-button>
            <el-radio-button value="enterprise">本企业内部</el-radio-button>
          </el-radio-group>
          <div v-if="form.visibility !== 'public'" class="form-tip">
            受限投票需要当前账号完成企业认证；企业内部投票会自动限定为 {{ currentUser.companyName || '当前企业' }}。
          </div>
        </el-form-item>

        <el-form-item label="实名要求">
          <div class="identity-setting">
            <el-switch
              v-model="form.requireRealName"
              active-text="强制实名投票"
              inactive-text="允许匿名或公开"
            />
            <div class="form-tip">
              开启后，投票人必须实名提交，投票页不会出现匿名选项；关闭时，投票人可自行选择匿名或公开。
            </div>
          </div>
        </el-form-item>

        <el-form-item label="截止时间" required>
          <el-date-picker
            v-model="form.endAt"
            type="datetime"
            placeholder="选择截止时间"
            :disabled-date="disabledDate"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="投票选项" required>
          <div class="options-editor">
            <div v-for="(opt, idx) in form.options" :key="idx" class="option-row">
              <span class="option-index">{{ idx + 1 }}</span>
              <el-input v-model="opt.label" :placeholder="'选项 ' + (idx + 1)" />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                :disabled="form.options.length <= 2"
                @click="form.options.splice(idx, 1)"
              />
            </div>
            <el-button type="primary" link :icon="Plus" :disabled="form.options.length >= 20" @click="form.options.push({ label: '' })">
              添加选项（{{ form.options.length }}/20）
            </el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" :loading="submitting" :disabled="!canCreate" @click="onCreate">
            <el-icon><CircleCheck /></el-icon>
            发布投票
          </el-button>
          <el-button size="large" @click="$router.push('/')">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElLoading, ElMessage } from 'element-plus'
import { CircleCheck, Delete, Plus } from '@element-plus/icons-vue'
import {
  CircleCheck as IconCheck,
  Select as IconSelect,
  Sort as IconSort,
  Star as IconStar,
  TrendCharts as IconTrend
} from '@element-plus/icons-vue'
import { algorithmColors, algorithmLabels, currentUser } from '../mock/polls.js'
import { api } from '../services/api.js'
import { checkTextSafe } from '../utils/audit.js'

const router = useRouter()
const submitting = ref(false)

const getIcon = (key) => ({
  single: IconCheck,
  multiple: IconSelect,
  weighted: IconTrend,
  borda: IconSort,
  scoring: IconStar
}[key] || IconCheck)

const algoDescriptions = {
  single: '每人限选一项',
  multiple: '每人可选多项',
  weighted: '分配权重总分 100',
  borda: '按偏好排序',
  scoring: '每项 1-10 分'
}

const form = reactive({
  title: '',
  description: '',
  algorithm: 'single',
  visibility: 'public',
  requireRealName: false,
  endAt: '',
  options: [{ label: '' }, { label: '' }]
})

const canCreate = computed(() =>
  form.title.trim() &&
  form.algorithm &&
  form.endAt &&
  form.options.length >= 2 &&
  form.options.every((option) => option.label.trim())
)

const disabledDate = (time) => time.getTime() < Date.now() - 86400000

const onCreate = async () => {
  if (!canCreate.value) return
  if (form.visibility !== 'public' && !currentUser.isCertified) {
    ElMessage.warning('请先在个人主页完成企业认证，再创建受限投票')
    return
  }

  submitting.value = true
  const loading = ElLoading.service({
    lock: true,
    text: '正在审核并发布投票...',
    background: 'rgba(255,255,255,0.75)'
  })

  try {
    const contentToAudit = [form.title, form.description, ...form.options.map((option) => option.label)].join(' | ')
    const audit = await checkTextSafe(contentToAudit)
    if (!audit.safe) {
      ElMessage.error(`审核未通过：${audit.msg}`)
      return
    }

    const { data } = await api.post('/polls', {
      title: form.title,
      description: form.description,
      algorithm: form.algorithm,
      visibility: form.visibility,
      requireRealName: form.requireRealName,
      endAt: new Date(form.endAt).getTime(),
      options: form.options
    })

    ElMessage.success('投票已发布')
    router.push(`/vote/${data.id}`)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '创建失败，请稍后重试')
  } finally {
    submitting.value = false
    loading.close()
  }
}
</script>

<style scoped>
.create-page { max-width: 940px; margin: 0 auto; padding: 24px; }
.create-container { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 32px; }
.page-title { margin: 0 0 32px; font-size: 24px; color: #303133; text-align: center; }
.algo-radio-group { display: grid; grid-template-columns: repeat(5, minmax(128px, 1fr)); gap: 16px; width: 100%; align-items: stretch; }
.algo-radio-group :deep(.el-radio__input) { display: none !important; }
.algo-radio-card { height: 100%; margin: 0 !important; width: 100%; }
.algo-radio-card :deep(.el-radio__label) { display: block; width: 100%; padding: 0; }
.algo-card-inner { box-sizing: border-box; height: 100%; min-height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 18px 12px; border: 2px solid #e4e7ed; border-radius: 8px; transition: all 0.2s; text-align: center; }
.algo-radio-card.is-checked .algo-card-inner { border-color: #409eff; background: #ecf5ff; }
.algo-name { font-size: 15px; font-weight: 700; color: #303133; }
.algo-desc { font-size: 12px; color: #909399; line-height: 1.4; }
.visibility-group { margin-right: 12px; }
.identity-setting { display: flex; flex-direction: column; gap: 8px; }
.form-tip { font-size: 12px; color: #909399; margin-top: 8px; line-height: 1.5; }
.options-editor { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.option-row { display: flex; align-items: center; gap: 10px; }
.option-index { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: #409eff; color: #fff; border-radius: 50%; font-size: 13px; font-weight: 600; flex-shrink: 0; }
@media (max-width: 900px) {
  .algo-radio-group { grid-template-columns: repeat(2, minmax(128px, 1fr)); }
}
</style>
