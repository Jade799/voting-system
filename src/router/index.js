import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Profile from '../views/Profile.vue'
import Home from '../views/Home.vue'
import Vote from '../views/Vote.vue'
import Results from '../views/Results.vue'
import Create from '../views/Create.vue'
import MyPolls from '../views/MyPolls.vue'

const routes = [
  { path: '/login', component: Login, meta: { layout: 'blank', title: '登录' } },
  { path: '/', component: Home, meta: { title: '投票广场' } },
  { path: '/vote/:id', component: Vote, meta: { title: '参与投票' } },
  { path: '/results/:id', component: Results, meta: { title: '投票结果' } },
  { path: '/create', component: Create, meta: { title: '创建投票' } },
  { path: '/mypolls', component: MyPolls, meta: { title: '我的投票' } },
  { path: '/profile', component: Profile, meta: { title: '个人主页' } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
