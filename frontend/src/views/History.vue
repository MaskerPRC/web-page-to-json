<template>
  <div class="history page">
    <div class="page-header">
      <h1>📚 解析历史</h1>
      <p>查看所有的网页解析记录</p>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card section-card" :body-style="{ paddingBottom: '8px' }">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-input
            v-model="searchUrl"
            placeholder="搜索URL..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="8">
          <el-select v-model="statusFilter" placeholder="筛选状态" clearable @change="loadHistory">
            <el-option label="全部" value="" />
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadHistory" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 历史记录表格 -->
    <el-card class="table-card section-card">
      <el-skeleton v-if="loading" :rows="5" animated style="margin: 6px 0" />
      <el-table
        :data="historyList"
        v-loading="loading"
        stripe
        @row-click="handleRowClick"
        style="cursor: pointer;"
      >
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column label="URL" min-width="300">
          <template #default="{ row }">
            <el-tooltip :content="row.url" placement="top">
              <div class="url-cell">
                <el-icon><Link /></el-icon>
                <span>{{ truncateUrl(row.url) }}</span>
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <div class="title-cell">
              {{ row.title || '未知标题' }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="元素数" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.element_count || 0 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="解析时间" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.parse_time }}ms</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            <div class="time-cell">
              <el-icon><Clock /></el-icon>
              <span>{{ formatTime(row.created_at) }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-space>
              <el-button size="small" @click.stop="viewResult(row)" v-if="row.status === 'success'">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button size="small" type="danger" @click.stop="deleteRecord(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Link, Clock, View, Delete } from '@element-plus/icons-vue'
import apiService from '@/services/api'
import dayjs from 'dayjs'

export default {
  name: 'History',
  components: {
    Search,
    Refresh, 
    Link,
    Clock,
    View,
    Delete
  },
  setup() {
    const router = useRouter()
    
    const loading = ref(false)
    const historyList = ref([])
    const currentPage = ref(1)
    const pageSize = ref(20)
    const total = ref(0)
    const searchUrl = ref('')
    const statusFilter = ref('')

    const filteredList = computed(() => {
      let list = historyList.value
      
      if (searchUrl.value) {
        list = list.filter(item => 
          item.url.toLowerCase().includes(searchUrl.value.toLowerCase()) ||
          (item.title && item.title.toLowerCase().includes(searchUrl.value.toLowerCase()))
        )
      }
      
      if (statusFilter.value) {
        list = list.filter(item => item.status === statusFilter.value)
      }
      
      return list
    })

    const loadHistory = async () => {
      loading.value = true
      try {
        const response = await apiService.getHistory({
          page: currentPage.value,
          limit: pageSize.value
        })
        
        if (response.success) {
          historyList.value = response.data
          total.value = response.pagination.total
        }
      } catch (error) {
        console.error('加载历史失败:', error)
      } finally {
        loading.value = false
      }
    }

    const handleSearch = () => {
      // 搜索是在前端进行的，所以不需要重新加载数据
    }

    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      loadHistory()
    }

    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      loadHistory()
    }

    const handleRowClick = (row) => {
      if (row.status === 'success') {
        viewResult(row)
      }
    }

    const viewResult = (row) => {
      router.push(`/result/${row.id}`)
    }

    const deleteRecord = async (row) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除这条解析记录吗？\n${row.url}`,
          '确认删除',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await apiService.deleteParseResult(row.id)
        if (response.success) {
          ElMessage.success('删除成功')
          loadHistory()
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除失败:', error)
        }
      }
    }

    const truncateUrl = (url, maxLength = 50) => {
      if (url.length <= maxLength) return url
      return url.substring(0, maxLength) + '...'
    }

    const formatTime = (timeString) => {
      return dayjs(timeString).format('YYYY-MM-DD HH:mm:ss')
    }

    onMounted(() => {
      loadHistory()
    })

    return {
      loading,
      historyList: filteredList,
      currentPage,
      pageSize,
      total,
      searchUrl,
      statusFilter,
      loadHistory,
      handleSearch,
      handleSizeChange,
      handleCurrentChange,
      handleRowClick,
      viewResult,
      deleteRecord,
      truncateUrl,
      formatTime
    }
  }
}
</script>

<style lang="scss" scoped>
.history {
  .page-header {
    text-align: center;
    margin-bottom: 30px;
    
    h1 {
      font-size: 2rem;
      color: var(--app-text-color);
      margin-bottom: 10px;
    }
    
    p {
      color: var(--app-text-secondary);
      font-size: 1.1rem;
    }
  }
  
  .filter-card {
    margin-bottom: 20px;
  }
  
  .table-card {
    .url-cell {
      display: flex;
      align-items: center;
      
      .el-icon {
        margin-right: 8px;
        color: #409EFF;
      }
    }
    
    .title-cell {
      font-weight: 500;
      color: var(--app-text-color);
    }
    
    .time-cell {
      display: flex;
      align-items: center;
      font-size: 14px;
      
      .el-icon {
        margin-right: 5px;
        color: var(--app-text-secondary);
      }
      color: var(--app-text-secondary);
    }
    
    .pagination-wrapper {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }
}

:deep(.el-table__row) {
  cursor: pointer;
  
  &:hover {
    background-color: var(--app-soft-bg);
  }
}
</style>