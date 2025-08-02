import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import History from '@/views/History.vue'
import Stats from '@/views/Stats.vue'
import Result from '@/views/Result.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: '首页 - 网页解析工具'
    }
  },
  {
    path: '/history',
    name: 'History',
    component: History,
    meta: {
      title: '解析历史 - 网页解析工具'
    }
  },
  {
    path: '/stats',
    name: 'Stats',
    component: Stats,
    meta: {
      title: '统计信息 - 网页解析工具'
    }
  },
  {
    path: '/result/:id',
    name: 'Result',
    component: Result,
    meta: {
      title: '解析结果 - 网页解析工具'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router