import axios from 'axios'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置NProgress
NProgress.configure({ showSpinner: false })

// 创建axios实例
const api = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || 'http://localhost:3025/api',
  timeout: 60000, // 60秒超时
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    NProgress.start()
    return config
  },
  (error) => {
    NProgress.done()
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    NProgress.done()
    return response.data
  },
  (error) => {
    NProgress.done()
    
    let message = '请求失败'
    
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          message = data.error || '请求参数错误'
          break
        case 401:
          message = '未授权访问'
          break
        case 403:
          message = '禁止访问'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 429:
          message = data.error || '请求过于频繁，请稍后再试'
          break
        case 500:
          message = data.error || '服务器内部错误'
          break
        default:
          message = data.error || `请求失败 (${status})`
      }
    } else if (error.request) {
      // 网络错误
      message = '网络连接失败，请检查网络状态'
    } else {
      // 其他错误
      message = error.message || '未知错误'
    }
    
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  }
)

// API服务对象
const apiService = {
  // 健康检查
  async healthCheck() {
    return await api.get('/health')
  },

  // 解析URL
  async parseUrl(url, filters = { text: true, image: true, video: true }) {
    return await api.post('/parse', { url, filters })
  },

  // LLM 生成爬虫：分三步（服务端串行执行）
  async generateCrawler(params) {
    // params: { url, goal?, contextJson? }
    return await api.post('/llm/generate-crawler', params)
  },

  // 获取解析历史
  async getHistory(params = {}) {
    const { page = 1, limit = 20 } = params
    return await api.get('/history', {
      params: { page, limit }
    })
  },

  // 根据ID获取解析结果
  async getParseResult(id) {
    return await api.get(`/parse/${id}`)
  },

  // 删除解析记录
  async deleteParseResult(id) {
    return await api.delete(`/parse/${id}`)
  },

  // 获取统计信息
  async getStats() {
    return await api.get('/stats')
  }
}

export default apiService
