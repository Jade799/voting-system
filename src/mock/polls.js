import { reactive } from 'vue'
import defaultAvatar from '../assets/head_portrait.png'
import defaultBg from '../assets/backgroud.PNG'

export const algorithmLabels = {
  single: '单选',
  multiple: '多选',
  weighted: '权重分配',
  borda: 'Borda 排序',
  scoring: '评分制'
}

export const algorithmColors = {
  single: '#409eff',
  multiple: '#67c23a',
  weighted: '#e6a23c',
  borda: '#f56c6c',
  scoring: '#909399'
}

export const algorithmIcons = {
  single: 'CircleCheck',
  multiple: 'Select',
  weighted: 'TrendCharts',
  borda: 'Sort',
  scoring: 'Star'
}

export const statusLabels = {
  pending: '待审核',
  active: '进行中',
  ended: '已结束'
}

export const statusTypes = {
  pending: 'info',
  active: 'success',
  ended: 'danger'
}

export const visibilityLabels = {
  public: '公开投票',
  certified: '认证用户可投',
  enterprise: '企业内部投票'
}

export const polls = reactive([])

export const loadPollsFromDatabase = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/polls')
    if (!res.ok) throw new Error('网络异常')
    const data = await res.json()
    polls.length = 0
    polls.push(...data)
  } catch (err) {
    console.error('无法从后端读取投票数据:', err)
  }
}

const DEFAULT_USER = {
  id: '',
  nickname: '未登录用户',
  signature: '写下你的个人签名',
  avatar: defaultAvatar,
  bgImage: defaultBg,
  isCertified: false,
  companyName: '',
  realName: ''
}

const getInitialUser = () => {
  const saved = localStorage.getItem('user_cache')
  if (saved) {
    try {
      return { ...DEFAULT_USER, ...JSON.parse(saved) }
    } catch (e) {
      return DEFAULT_USER
    }
  }
  return DEFAULT_USER
}

export const currentUser = reactive(getInitialUser())
