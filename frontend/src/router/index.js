import { createRouter, createWebHistory } from 'vue-router'
const Home = () => import(/* webpackChunkName: "home" */ '@/views/Home.vue')
const History = () => import(/* webpackChunkName: "history" */ '@/views/History.vue')
const Stats = () => import(/* webpackChunkName: "stats" */ '@/views/Stats.vue')
const Result = () => import(/* webpackChunkName: "result" */ '@/views/Result.vue')
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

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
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }
  NProgress.configure({ showSpinner: false })
  NProgress.start()
  next()
})

router.afterEach(() => {
  NProgress.done()
})

router.onError(() => {
  NProgress.done()
})

export default router