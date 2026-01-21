import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import HomePage from '../components/HomePage.vue'
import GitLogs from '../components/GitLogs.vue'
import RunningStats from '../components/RunningStats.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/gitlogs',
    name: 'GitLogs',
    component: GitLogs,
    props: true
  },
  {
    path: '/running',
    name: 'RunningStats',
    component: RunningStats
  }
]

const router = createRouter({
  history: createWebHashHistory(), // hash模式，#xxx，这样路由能正常工作
  routes
})

export default router
