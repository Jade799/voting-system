import axios from 'axios'
import { currentUser } from '../mock/polls.js'

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
})

export const getToken = () => localStorage.getItem('token') || ''

export const setSession = (token, user) => {
  if (token) localStorage.setItem('token', token)
  if (user) {
    const nextUser = { ...user }
    if (!nextUser.avatar) delete nextUser.avatar
    if (!nextUser.bgImage) delete nextUser.bgImage
    Object.assign(currentUser, nextUser)
    localStorage.setItem('user_cache', JSON.stringify(currentUser))
  }
}

export const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user_cache')
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const normalizePoll = (poll) => ({
  ...poll,
  createdAt: Number(poll.createdAt || Date.now()),
  endAt: Number(poll.endAt || Date.now()),
  totalVotes: Number(poll.totalVotes || 0),
  options: (poll.options || []).map((option) => ({
    ...option,
    count: Number(option.count || 0)
  }))
})

export const fetchPolls = async (params = {}) => {
  const { data } = await api.get('/polls', { params })
  return data.map(normalizePoll)
}

export const fetchPoll = async (id) => {
  const { data } = await api.get(`/polls/${id}`)
  return normalizePoll(data)
}
