import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { ElMessage } from 'element-plus'
import './styles/global.scss'

// 初始化主题（在应用挂载前尽早执行，减少闪烁）
(() => {
  try {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDark = savedTheme ? savedTheme === 'dark' : prefersDark
    if (useDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  } catch (e) {
    // 忽略主题初始化错误
  }
})()

const app = createApp(App)

// 如需使用多个图标，建议在具体页面按需导入

// 全局配置
app.config.globalProperties.$message = ElMessage

app.use(router)
app.use(ElementPlus)

app.mount('#app')