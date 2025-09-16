import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../components/HomePage.vue'
import GitLogs from '../components/GitLogs.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
