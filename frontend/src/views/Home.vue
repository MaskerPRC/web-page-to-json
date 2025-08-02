<template>
  <div class="home">
    <!-- 顶部介绍 -->
    <div class="intro-section">
      <el-card class="intro-card">
        <div class="intro-content">
          <h1>🌐 智能网页解析工具</h1>
          <p>输入任意网址，智能提取网页结构、文本、图片、视频等关键信息，转换为结构化JSON数据</p>
          <div class="features">
            <el-tag type="success">智能过滤</el-tag>
            <el-tag type="primary">CSS选择器</el-tag>
            <el-tag type="warning">隐藏元素检测</el-tag>
            <el-tag type="info">样式类过滤</el-tag>
          </div>
        </div>
      </el-card>
    </div>

    <!-- URL输入区域 -->
    <div class="parse-section">
      <el-card class="parse-card">
        <template #header>
          <div class="card-header">
            <span>🔍 开始解析</span>
          </div>
        </template>
        
        <div class="parse-form">
          <el-form @submit.prevent="handleParse">
            <el-form-item>
              <el-input
                v-model="url"
                placeholder="请输入要解析的网址，例如：https://example.com"
                size="large"
                clearable
                :disabled="loading"
                @keyup.enter="handleParse"
              >
                <template #prepend>
                  <el-icon><Link /></el-icon>
                </template>
                <template #append>
                  <el-button 
                    type="primary" 
                    :loading="loading"
                    @click="handleParse"
                    :disabled="!isValidUrl || !hasValidFilter"
                  >
                    <el-icon v-if="!loading"><Search /></el-icon>
                    {{ loading ? '解析中...' : '开始解析' }}
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            
            <!-- 内容类型过滤器 -->
            <el-form-item>
              <div class="filter-section">
                <label class="filter-label">🎯 选择要提取的内容类型：</label>
                <div class="filter-controls">
                  <el-checkbox 
                    v-model="filters.text" 
                    :disabled="loading"
                    @change="validateFilters"
                  >
                    <el-icon><Document /></el-icon>
                    文本内容
                  </el-checkbox>
                  <el-checkbox 
                    v-model="filters.image" 
                    :disabled="loading"
                    @change="validateFilters"
                  >
                    <el-icon><Picture /></el-icon>
                    图片资源
                  </el-checkbox>
                  <el-checkbox 
                    v-model="filters.video" 
                    :disabled="loading"
                    @change="validateFilters"
                  >
                    <el-icon><VideoPlay /></el-icon>
                    视频资源
                  </el-checkbox>
                </div>
                <div v-if="!hasValidFilter" class="filter-error">
                  <el-text type="danger" size="small">
                    <el-icon><Warning /></el-icon>
                    至少需要选择一种内容类型
                  </el-text>
                </div>
              </div>
            </el-form-item>
          </el-form>
          
          <div class="quick-examples" v-if="!loading">
            <p>快速示例：</p>
            <div class="example-links">
              <el-button 
                v-for="example in examples" 
                :key="example.url"
                size="small" 
                plain
                @click="url = example.url"
              >
                {{ example.name }}
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 解析进度 -->
    <div v-if="loading" class="progress-section">
      <el-card>
        <div class="progress-content">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <h3>正在解析网页...</h3>
          <p>{{ progressText }}</p>
          <el-progress :percentage="progressPercentage" :show-text="false"></el-progress>
        </div>
      </el-card>
    </div>

    <!-- 解析结果 -->
    <div v-if="result && !loading" class="result-section">
      <el-card class="result-card">
        <template #header>
          <div class="result-header">
            <div class="result-info">
              <h3>📄 {{ result.title || '解析结果' }}</h3>
              <div class="result-meta">
                <el-tag size="small">{{ result.element_count || 0 }} 个元素</el-tag>
                <el-tag size="small" type="success">{{ result.parse_time || 0 }}ms</el-tag>
                <el-tag size="small" type="info" v-if="result.cached">缓存结果</el-tag>
              </div>
            </div>
            <div class="result-actions">
              <el-button size="small" @click="copyResult">
                <el-icon><DocumentCopy /></el-icon>
                复制JSON
              </el-button>
              <el-button size="small" @click="saveResult" type="primary">
                <el-icon><Download /></el-icon>
                下载JSON
              </el-button>
            </div>
          </div>
        </template>
        
        <JsonViewer :data="result.parsed_data" />
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Link, Search, Loading, DocumentCopy, Download, Document, Picture, VideoPlay, Warning } from '@element-plus/icons-vue'
import JsonViewer from '@/components/JsonViewer.vue'
import apiService from '@/services/api'

export default {
  name: 'Home',
  components: {
    Link,
    Search, 
    Loading,
    DocumentCopy,
    Download,
    Document,
    Picture, 
    VideoPlay,
    Warning,
    JsonViewer
  },
  setup() {
    const url = ref('')
    const loading = ref(false)
    const result = ref(null)
    const progressText = ref('准备开始解析...')
    const progressPercentage = ref(0)
    
    // 内容类型过滤器
    const filters = ref({
      text: true,
      image: true,
      video: true
    })
    
    const examples = ref([
      { name: 'GitHub', url: 'https://github.com' },
      { name: '百度', url: 'https://www.baidu.com' },
      { name: 'MDN', url: 'https://developer.mozilla.org' },
      { name: 'Vue.js', url: 'https://vuejs.org' }
    ])

    const isValidUrl = computed(() => {
      const urlPattern = /^https?:\/\/.+/
      return urlPattern.test(url.value)
    })

    const hasValidFilter = computed(() => {
      return filters.value.text || filters.value.image || filters.value.video
    })

    const validateFilters = () => {
      if (!hasValidFilter.value) {
        ElMessage.warning('至少需要选择一种内容类型')
      }
    }

    const simulateProgress = () => {
      const steps = [
        { text: '正在访问网页...', percentage: 20 },
        { text: '正在加载页面内容...', percentage: 40 },
        { text: '正在分析DOM结构...', percentage: 60 },
        { text: '正在过滤无效元素...', percentage: 80 },
        { text: '正在生成JSON结果...', percentage: 95 }
      ]
      
      let currentStep = 0
      const interval = setInterval(() => {
        if (currentStep < steps.length && loading.value) {
          progressText.value = steps[currentStep].text
          progressPercentage.value = steps[currentStep].percentage
          currentStep++
        } else {
          clearInterval(interval)
        }
      }, 800)
      
      return interval
    }

    const handleParse = async () => {
      if (!isValidUrl.value) {
        ElMessage.warning('请输入有效的网址')
        return
      }

      if (!hasValidFilter.value) {
        ElMessage.warning('至少需要选择一种内容类型')
        return
      }

      loading.value = true
      result.value = null
      progressPercentage.value = 0
      
      const progressInterval = simulateProgress()

      try {
        const response = await apiService.parseUrl(url.value, filters.value)
        
        if (response.success) {
          result.value = response.data
          progressText.value = '解析完成！'
          progressPercentage.value = 100
          
          ElMessage.success(
            response.cached ? '已返回缓存结果' : '解析成功完成'
          )
        } else {
          throw new Error(response.error || '解析失败')
        }
      } catch (error) {
        console.error('解析失败:', error)
        ElMessage.error('解析失败: ' + error.message)
      } finally {
        loading.value = false
        clearInterval(progressInterval)
      }
    }

    const copyResult = async () => {
      try {
        const jsonString = JSON.stringify(result.value.parsed_data, null, 2)
        await navigator.clipboard.writeText(jsonString)
        ElMessage.success('JSON已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败')
      }
    }

    const saveResult = () => {
      const jsonString = JSON.stringify(result.value.parsed_data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `parse_result_${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      ElMessage.success('JSON文件已下载')
    }

    return {
      url,
      loading,
      result,
      progressText,
      progressPercentage,
      examples,
      filters,
      isValidUrl,
      hasValidFilter,
      validateFilters,
      handleParse,
      copyResult,
      saveResult
    }
  }
}
</script>

<style lang="scss" scoped>
.home {
  .intro-section {
    margin-bottom: 30px;
    
    .intro-card {
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      
      :deep(.el-card__body) {
        padding: 40px;
      }
      
      h1 {
        font-size: 2.5rem;
        margin-bottom: 20px;
        font-weight: 300;
      }
      
      p {
        font-size: 1.2rem;
        margin-bottom: 30px;
        opacity: 0.9;
      }
      
      .features {
        .el-tag {
          margin: 0 8px;
        }
      }
    }
  }
  
  .parse-section {
    margin-bottom: 30px;
    
    .parse-form {
      .el-form-item {
        margin-bottom: 20px;
      }
      
      .quick-examples {
        text-align: center;
        
        p {
          color: #666;
          margin-bottom: 10px;
        }
        
        .example-links {
          .el-button {
            margin: 5px;
          }
        }
      }
    }
  }
  
  .progress-section {
    margin-bottom: 30px;
    
    .progress-content {
      text-align: center;
      padding: 30px;
      
      .loading-icon {
        font-size: 48px;
        color: #409EFF;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
      
      h3 {
        margin-bottom: 10px;
        color: #333;
      }
      
      p {
        color: #666;
        margin-bottom: 20px;
      }
    }
    
    .filter-section {
      margin-top: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      
      .filter-label {
        display: block;
        margin-bottom: 15px;
        font-weight: 500;
        color: #495057;
        font-size: 14px;
      }
      
      .filter-controls {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        
        .el-checkbox {
          margin-right: 0;
          
          :deep(.el-checkbox__label) {
            display: flex;
            align-items: center;
            gap: 5px;
            font-weight: 500;
          }
          
          &.is-checked {
            :deep(.el-checkbox__label) {
              color: #409eff;
            }
          }
        }
      }
      
      .filter-error {
        margin-top: 10px;
        
        .el-text {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
  }
  
  .result-section {
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .result-info {
        h3 {
          margin: 0 0 10px 0;
          color: #333;
        }
        
        .result-meta {
          .el-tag {
            margin-right: 10px;
          }
        }
      }
      
      .result-actions {
        .el-button {
          margin-left: 10px;
        }
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .home {
    .intro-card {
      :deep(.el-card__body) {
        padding: 20px;
      }
      
      h1 {
        font-size: 2rem;
      }
      
      p {
        font-size: 1rem;
      }
    }
    
    .result-header {
      flex-direction: column;
      align-items: flex-start;
      
      .result-actions {
        margin-top: 15px;
        
        .el-button {
          margin: 5px 5px 5px 0;
        }
      }
    }
  }
}
</style>