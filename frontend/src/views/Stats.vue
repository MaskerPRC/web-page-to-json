<template>
  <div class="stats">
    <div class="page-header">
      <h1>📊 统计信息</h1>
      <p>系统解析数据统计和分析</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card total">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.total_parses || 0 }}</h3>
              <p>总解析次数</p>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card success">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><SuccessFilled /></el-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.successful_parses || 0 }}</h3>
              <p>成功解析</p>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card failed">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><CircleCloseFilled /></el-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.failed_parses || 0 }}</h3>
              <p>失败次数</p>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card rate">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.success_rate || 0 }}%</h3>
              <p>成功率</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细信息 -->
    <el-row :gutter="20" class="detail-cards">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>⚡ 性能指标</span>
              <el-button text @click="loadStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="performance-metrics">
            <div class="metric-item">
              <div class="metric-label">平均解析时间</div>
              <div class="metric-value">
                <el-tag type="info" size="large">{{ stats.avg_parse_time || 0 }}ms</el-tag>
              </div>
            </div>
            
            <div class="metric-item">
              <div class="metric-label">平均元素数量</div>
              <div class="metric-value">
                <el-tag type="primary" size="large">{{ stats.avg_element_count || 0 }} 个</el-tag>
              </div>
            </div>
            
            <div class="metric-item">
              <div class="metric-label">最后解析时间</div>
              <div class="metric-value">
                <span class="time-text">{{ formatLastParseTime() }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>📈 成功率分析</span>
            </div>
          </template>
          
          <div class="success-analysis">
            <div class="progress-item">
              <div class="progress-label">
                <span>解析成功率</span>
                <span class="progress-percentage">{{ stats.success_rate || 0 }}%</span>
              </div>
              <el-progress 
                :percentage="stats.success_rate || 0" 
                :color="getProgressColor(stats.success_rate || 0)"
                :stroke-width="20"
              />
            </div>
            
            <div class="success-details">
              <div class="detail-row">
                <span>成功解析:</span>
                <span class="success-count">{{ stats.successful_parses || 0 }} 次</span>
              </div>
              <div class="detail-row">
                <span>失败解析:</span>
                <span class="failed-count">{{ stats.failed_parses || 0 }} 次</span>
              </div>
              <div class="detail-row">
                <span>总计:</span>
                <span class="total-count">{{ stats.total_parses || 0 }} 次</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 系统状态 -->
    <el-card class="system-status">
      <template #header>
        <div class="card-header">
          <span>🔧 系统状态</span>
          <el-button @click="checkSystemHealth" :loading="healthLoading">
            <el-icon><Monitor /></el-icon>
            检查状态
          </el-button>
        </div>
      </template>
      
      <div class="status-content">
        <div class="status-item">
          <div class="status-label">API服务状态</div>
          <div class="status-indicator">
            <el-tag :type="systemHealth.status === 'ok' ? 'success' : 'danger'">
              {{ systemHealth.status === 'ok' ? '正常运行' : '异常' }}
            </el-tag>
          </div>
        </div>
        
        <div class="status-item">
          <div class="status-label">系统版本</div>
          <div class="status-value">{{ systemHealth.version || 'Unknown' }}</div>
        </div>
        
        <div class="status-item">
          <div class="status-label">最后检查时间</div>
          <div class="status-value">{{ formatTime(systemHealth.timestamp) }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Document, 
  SuccessFilled, 
  CircleCloseFilled, 
  TrendCharts, 
  Refresh, 
  Monitor 
} from '@element-plus/icons-vue'
import apiService from '@/services/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default {
  name: 'Stats',
  components: {
    Document,
    SuccessFilled,
    CircleCloseFilled,
    TrendCharts,
    Refresh,
    Monitor
  },
  setup() {
    const loading = ref(false)
    const healthLoading = ref(false)
    const stats = ref({})
    const systemHealth = ref({})

    const loadStats = async () => {
      loading.value = true
      try {
        const response = await apiService.getStats()
        if (response.success) {
          stats.value = response.data
        }
      } catch (error) {
        console.error('加载统计失败:', error)
      } finally {
        loading.value = false
      }
    }

    const checkSystemHealth = async () => {
      healthLoading.value = true
      try {
        const response = await apiService.healthCheck()
        systemHealth.value = response
        ElMessage.success('系统状态检查完成')
      } catch (error) {
        console.error('健康检查失败:', error)
        systemHealth.value = { status: 'error' }
      } finally {
        healthLoading.value = false
      }
    }

    const getProgressColor = (percentage) => {
      if (percentage >= 90) return '#67c23a'
      if (percentage >= 70) return '#e6a23c'
      return '#f56c6c'
    }

    const formatLastParseTime = () => {
      if (!stats.value.last_parse_time) return '暂无数据'
      return dayjs(stats.value.last_parse_time).fromNow()
    }

    const formatTime = (timeString) => {
      if (!timeString) return '暂无数据'
      return dayjs(timeString).format('YYYY-MM-DD HH:mm:ss')
    }

    onMounted(() => {
      loadStats()
      checkSystemHealth()
    })

    return {
      loading,
      healthLoading,
      stats,
      systemHealth,
      loadStats,
      checkSystemHealth,
      getProgressColor,
      formatLastParseTime,
      formatTime
    }
  }
}
</script>

<style lang="scss" scoped>
.stats {
  .page-header {
    text-align: center;
    margin-bottom: 30px;
    
    h1 {
      font-size: 2rem;
      color: #333;
      margin-bottom: 10px;
    }
    
    p {
      color: #666;
      font-size: 1.1rem;
    }
  }
  
  .stats-cards {
    margin-bottom: 30px;
    
    .stat-card {
      &.total {
        .stat-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      }
      
      &.success {
        .stat-icon {
          background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
        }
      }
      
      &.failed {
        .stat-icon {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }
      }
      
      &.rate {
        .stat-icon {
          background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
        }
      }
      
      .stat-content {
        display: flex;
        align-items: center;
        
        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 20px;
          
          .el-icon {
            font-size: 28px;
            color: white;
          }
        }
        
        .stat-info {
          h3 {
            font-size: 2rem;
            font-weight: bold;
            margin: 0 0 5px 0;
            color: #333;
          }
          
          p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }
        }
      }
    }
  }
  
  .detail-cards {
    margin-bottom: 30px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
    }
    
    .performance-metrics {
      .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 0;
        border-bottom: 1px solid #f0f0f0;
        
        &:last-child {
          border-bottom: none;
        }
        
        .metric-label {
          font-weight: 500;
          color: #333;
        }
        
        .metric-value {
          .time-text {
            color: #666;
            font-size: 14px;
          }
        }
      }
    }
    
    .success-analysis {
      .progress-item {
        margin-bottom: 20px;
        
        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          
          .progress-percentage {
            font-weight: bold;
            color: #409EFF;
          }
        }
      }
      
      .success-details {
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          
          .success-count {
            color: #67c23a;
            font-weight: bold;
          }
          
          .failed-count {
            color: #f56c6c;
            font-weight: bold;
          }
          
          .total-count {
            color: #409EFF;
            font-weight: bold;
          }
        }
      }
    }
  }
  
  .system-status {
    .status-content {
      .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 0;
        border-bottom: 1px solid #f0f0f0;
        
        &:last-child {
          border-bottom: none;
        }
        
        .status-label {
          font-weight: 500;
          color: #333;
        }
        
        .status-value {
          color: #666;
          font-family: monospace;
        }
      }
    }
  }
}
</style>