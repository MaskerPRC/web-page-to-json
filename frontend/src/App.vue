<template>
  <div id="app">
    <el-container class="app-container">
      <!-- 头部导航 -->
      <el-header class="app-header">
        <div class="header-content">
          <div class="logo">
            <el-icon><Document /></el-icon>
            <span>网页解析工具</span>
          </div>
          <div class="nav-menu">
            <el-menu 
              :default-active="$route.path" 
              mode="horizontal" 
              router
              background-color="transparent"
              text-color="#333"
              active-text-color="#409EFF"
            >
              <el-menu-item index="/">
                <el-icon><House /></el-icon>
                <span>首页</span>
              </el-menu-item>
              <el-menu-item index="/history">
                <el-icon><Clock /></el-icon>
                <span>解析历史</span>
              </el-menu-item>
              <el-menu-item index="/stats">
                <el-icon><PieChart /></el-icon>
                <span>统计信息</span>
              </el-menu-item>
            </el-menu>
          </div>
        </div>
      </el-header>

      <!-- 主要内容区域 -->
      <el-main class="app-main">
        <router-view />
      </el-main>

      <!-- 底部 -->
      <el-footer class="app-footer">
        <div class="footer-content">
          <p>&copy; 2024 网页解析工具 - 智能提取网页结构信息</p>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import { Document, House, Clock, PieChart } from '@element-plus/icons-vue'

export default {
  name: 'App',
  components: {
    Document,
    House,
    Clock,
    PieChart
  }
}
</script>

<style lang="scss">
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  
  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 20px;
  }
  
  .logo {
    display: flex;
    align-items: center;
    font-size: 20px;
    font-weight: bold;
    color: #409EFF;
    
    .el-icon {
      margin-right: 8px;
      font-size: 24px;
    }
  }
  
  .nav-menu {
    .el-menu {
      border: none !important;
    }
    
    .el-menu-item {
      font-weight: 500;
      
      .el-icon {
        margin-right: 5px;
      }
    }
  }
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.app-footer {
  background: rgba(255, 255, 255, 0.9);
  border-top: 1px solid #e4e7ed;
  
  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
    color: #666;
    font-size: 14px;
  }
}
</style>