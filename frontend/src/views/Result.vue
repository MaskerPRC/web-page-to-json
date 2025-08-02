<template>
  <div class="result">
    <div v-if="loading" class="loading-container">
      <el-card>
        <div class="loading-content">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <h3>正在加载解析结果...</h3>
        </div>
      </el-card>
    </div>

    <div v-else-if="error" class="error-container">
      <el-card>
        <div class="error-content">
          <el-icon class="error-icon"><CircleCloseFilled /></el-icon>
          <h3>加载失败</h3>
          <p>{{ error }}</p>
          <el-button @click="$router.push('/history')">返回历史</el-button>
        </div>
      </el-card>
    </div>

    <div v-else-if="result">
      <!-- 结果头部信息 -->
      <el-card class="result-header">
        <div class="header-content">
          <div class="result-info">
            <div class="url-section">
              <h2>📄 {{ result.title || '解析结果' }}</h2>
              <div class="url-info">
                <el-icon><Link /></el-icon>
                <a :href="result.url" target="_blank" class="url-link">{{ result.url }}</a>
              </div>
            </div>
            
            <div class="meta-section">
              <el-space>
                <el-tag size="large">{{ result.element_count || 0 }} 个元素</el-tag>
                <el-tag size="large" type="success">{{ result.parse_time || 0 }}ms</el-tag>
                <el-tag size="large" type="info">{{ formatTime(result.created_at) }}</el-tag>
              </el-space>
            </div>
          </div>
          
          <div class="header-actions">
            <el-space direction="vertical">
              <el-button @click="copyResult">
                <el-icon><DocumentCopy /></el-icon>
                复制JSON
              </el-button>
              <el-button @click="saveResult">
                <el-icon><Download /></el-icon>
                下载JSON
              </el-button>
              <el-button @click="$router.push('/history')">
                <el-icon><Back /></el-icon>
                返回历史
              </el-button>
            </el-space>
          </div>
        </div>
      </el-card>

      <!-- JSON展示区域 -->
      <el-card class="json-display">
        <template #header>
          <div class="json-header">
            <span>🔍 解析数据</span>
            <div class="json-actions">
              <el-button size="small" @click="refreshData" :loading="refreshing">
                <el-icon><Refresh /></el-icon>
                重新加载
              </el-button>
            </div>
          </div>
        </template>
        
        <JsonViewer 
          v-if="result.parsed_data" 
          :data="result.parsed_data" 
          :initial-theme="jsonTheme"
        />
        
        <div v-else class="no-data">
          <el-empty description="暂无解析数据" />
        </div>
      </el-card>

      <!-- 错误信息（如果解析失败） -->
      <el-card v-if="result.status === 'failed'" class="error-info">
        <template #header>
          <span>❌ 解析失败信息</span>
        </template>
        <div class="error-details">
          <p><strong>错误信息:</strong></p>
          <div class="error-message">
            {{ result.error_message || '未知错误' }}
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Loading, 
  CircleCloseFilled, 
  Link, 
  DocumentCopy, 
  Download, 
  Back, 
  Refresh 
} from '@element-plus/icons-vue'
import JsonViewer from '@/components/JsonViewer.vue'
import apiService from '@/services/api'
import dayjs from 'dayjs'

export default {
  name: 'Result',
  components: {
    Loading,
    CircleCloseFilled,
    Link,
    DocumentCopy,
    Download,
    Back,
    Refresh,
    JsonViewer
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    
    const loading = ref(false)
    const refreshing = ref(false)
    const error = ref('')
    const result = ref(null)
    const jsonTheme = ref('light')

    const resultId = computed(() => route.params.id)

    const loadResult = async (showLoading = true) => {
      if (showLoading) {
        loading.value = true
      } else {
        refreshing.value = true
      }
      
      error.value = ''
      
      try {
        const response = await apiService.getParseResult(resultId.value)
        
        if (response.success) {
          result.value = response.data
        } else {
          throw new Error(response.error || '获取解析结果失败')
        }
      } catch (err) {
        console.error('加载解析结果失败:', err)
        error.value = err.message
      } finally {
        loading.value = false
        refreshing.value = false
      }
    }

    const refreshData = () => {
      loadResult(false)
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
      a.download = `parse_result_${result.value.id}_${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      ElMessage.success('JSON文件已下载')
    }

    const formatTime = (timeString) => {
      return dayjs(timeString).format('YYYY-MM-DD HH:mm:ss')
    }

    onMounted(() => {
      if (resultId.value) {
        loadResult()
      } else {
        error.value = '无效的结果ID'
      }
    })

    return {
      loading,
      refreshing,
      error,
      result,
      jsonTheme,
      loadResult,
      refreshData,
      copyResult,
      saveResult,
      formatTime
    }
  }
}
</script>

<style lang="scss" scoped>
.result {
  .loading-container,
  .error-container {
    .loading-content,
    .error-content {
      text-align: center;
      padding: 40px;
      
      .loading-icon,
      .error-icon {
        font-size: 48px;
        margin-bottom: 20px;
      }
      
      .loading-icon {
        color: #409EFF;
        animation: spin 1s linear infinite;
      }
      
      .error-icon {
        color: #f56c6c;
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
  }
  
  .result-header {
    margin-bottom: 20px;
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      
      .result-info {
        flex: 1;
        
        .url-section {
          margin-bottom: 20px;
          
          h2 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.5rem;
          }
          
          .url-info {
            display: flex;
            align-items: center;
            
            .el-icon {
              margin-right: 8px;
              color: #409EFF;
            }
            
            .url-link {
              color: #409EFF;
              text-decoration: none;
              
              &:hover {
                text-decoration: underline;
              }
            }
          }
        }
        
        .meta-section {
          .el-tag {
            margin-right: 10px;
          }
        }
      }
      
      .header-actions {
        margin-left: 20px;
      }
    }
  }
  
  .json-display {
    margin-bottom: 20px;
    
    .json-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
    }
    
    .no-data {
      text-align: center;
      padding: 40px;
    }
  }
  
  .error-info {
    .error-details {
      .error-message {
        background: #fef0f0;
        border: 1px solid #fbc4c4;
        border-radius: 4px;
        padding: 12px;
        margin-top: 10px;
        color: #f56c6c;
        font-family: monospace;
        white-space: pre-wrap;
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .result {
    .result-header {
      .header-content {
        flex-direction: column;
        
        .header-actions {
          margin: 20px 0 0 0;
          width: 100%;
          
          :deep(.el-space) {
            width: 100%;
            justify-content: center;
          }
        }
      }
    }
  }
}
</style>