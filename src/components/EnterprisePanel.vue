<template>
  <div class="enterprise-panel-container">
    <div class="info-content-box">
      <div class="display-vertical">
        <div class="info-item">
          <span class="label">当前昵称</span>
          <span class="value">{{ initialUserInfo.nickname }}</span>
        </div>
        <div class="info-item">
          <span class="label">个性签名</span>
          <span class="value">{{ initialUserInfo.signature || '暂无签名' }}</span>
        </div>
        <div class="info-item">
          <span class="label">认证状态</span>
          <span class="value">
            <el-tag :type="initialUserInfo.isCertified ? 'success' : 'info'" size="small" effect="plain">
              {{ initialUserInfo.isCertified ? '已完成企业认证' : '个人用户' }}
            </el-tag>
          </span>
        </div>
        <div class="info-item" v-if="initialUserInfo.isCertified">
          <span class="label">所属企业</span>
          <span class="value">{{ initialUserInfo.companyName }}</span>
        </div>
      </div>

      <div class="action-area">
        <el-button type="primary" @click="openDialog" class="edit-btn">
          <el-icon><Edit /></el-icon>
          编辑资料与认证
        </el-button>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="完善个人与企业信息" width="520px" append-to-body>
      <el-form :model="formData" :rules="rules" ref="formRef" label-position="top">
        <el-divider content-position="left">外观设置</el-divider>
        <div class="appearance-edit-section">
          <div class="upload-item">
            <div class="upload-label">头像</div>
            <div class="avatar-uploader" @click="triggerFileSelect('avatar')">
              <img v-if="formData.avatar" :src="formData.avatar" class="avatar-preview" />
              <div v-else class="upload-placeholder"><el-icon><Plus /></el-icon></div>
            </div>
          </div>
          <div class="upload-item">
            <div class="upload-label">背景</div>
            <div class="bg-uploader" @click="triggerFileSelect('bgImage')">
              <img v-if="formData.bgImage" :src="formData.bgImage" class="bg-preview" />
              <div v-else class="upload-placeholder"><el-icon><Plus /></el-icon></div>
            </div>
          </div>
        </div>

        <input type="file" ref="avatarInputRef" class="hidden-input" accept="image/*" @change="handleFileChange($event, 'avatar')" />
        <input type="file" ref="bgInputRef" class="hidden-input" accept="image/*" @change="handleFileChange($event, 'bgImage')" />

        <el-divider content-position="left">基本信息</el-divider>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="formData.nickname" />
        </el-form-item>
        <el-form-item label="个性签名">
          <el-input v-model="formData.signature" type="textarea" :rows="2" placeholder="写下你的个性签名" />
        </el-form-item>

        <el-divider content-position="left">企业认证</el-divider>
        <el-form-item label="公司全称">
          <el-input v-model="formData.companyName" placeholder="请输入公司全称" />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="formData.realName" placeholder="请输入真实姓名" />
        </el-form-item>
        <div class="cert-tip">公司账号可通过员工名单导入接口维护在职员工。员工姓名与企业匹配后，即可进入企业内部投票空间。</div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import { api, setSession } from '../services/api.js'

const props = defineProps({
  initialUserInfo: { type: Object, required: true }
})
const emit = defineEmits(['update-user'])

const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref(null)
const avatarInputRef = ref(null)
const bgInputRef = ref(null)

const formData = reactive({
  nickname: '',
  signature: '',
  companyName: '',
  realName: '',
  avatar: '',
  bgImage: ''
})

const rules = {
  nickname: [{ required: true, message: '昵称不能为空', trigger: 'blur' }]
}

const openDialog = () => {
  Object.assign(formData, {
    nickname: props.initialUserInfo.nickname || '',
    signature: props.initialUserInfo.signature || '',
    companyName: props.initialUserInfo.companyName || '',
    realName: props.initialUserInfo.realName || '',
    avatar: props.initialUserInfo.avatar || '',
    bgImage: props.initialUserInfo.bgImage || ''
  })
  dialogVisible.value = true
}

const triggerFileSelect = (type) => {
  if (type === 'avatar') avatarInputRef.value.click()
  else bgInputRef.value.click()
}

const handleFileChange = (event, type) => {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 2MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    formData[type] = e.target.result
  }
  reader.readAsDataURL(file)
}

const submitForm = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    let isCertified = false
    if (formData.companyName && formData.realName) {
      const { data } = await api.post('/verify-enterprise', {
        companyName: formData.companyName,
        realName: formData.realName
      })
      isCertified = !!data.success
    }

    const updatedData = { ...formData, isCertified }
    await api.put('/user/profile', updatedData)
    setSession(null, updatedData)
    emit('update-user', updatedData)
    ElMessage.success(isCertified ? '企业认证成功，资料已保存' : '资料已保存')
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.enterprise-panel-container { background: #fff; border-radius: 8px; padding: 20px; border: 1px solid #f0f2f5; }
.display-vertical { display: flex; flex-direction: column; gap: 16px; margin-bottom: 22px; }
.info-item { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #f8fafc; gap: 12px; }
.info-item .label { font-size: 13px; color: #64748b; font-weight: 500; }
.info-item .value { font-size: 14px; color: #0f172a; font-weight: 600; text-align: right; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.action-area { border-top: 1px solid #f1f5f9; padding-top: 18px; }
.edit-btn { width: 100%; height: 42px; border-radius: 8px; font-weight: 600; }
.appearance-edit-section { display: flex; gap: 30px; justify-content: center; margin-bottom: 20px; }
.upload-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.upload-label { font-size: 12px; color: #94a3b8; }
.avatar-uploader, .bg-uploader { border: 1px dashed #d9d9d9; border-radius: 8px; cursor: pointer; background: #f8fafc; overflow: hidden; }
.avatar-uploader { width: 80px; height: 80px; }
.bg-uploader { width: 120px; height: 80px; }
.avatar-preview, .bg-preview { width: 100%; height: 100%; object-fit: cover; }
.upload-placeholder { display: flex; justify-content: center; align-items: center; height: 100%; color: #8c939d; font-size: 20px; }
.hidden-input { display: none; }
.cert-tip { font-size: 12px; line-height: 1.6; color: #909399; background: #f7f9fc; padding: 10px 12px; border-radius: 8px; }
</style>
