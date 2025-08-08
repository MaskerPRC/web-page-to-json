<template>
  <div id="app">
    <el-container class="app-container">
      <!-- 左侧侧边栏（桌面端） -->
      <el-aside class="app-aside hidden-mobile" :width="asideCollapsed ? '72px' : '260px'">
        <div class="brand">
          <el-icon><Document /></el-icon>
          <span v-if="!asideCollapsed" class="brand-name">网页解析工具</span>
        </div>
        <el-menu :default-active="$route.path" router class="aside-menu" :unique-opened="true" :collapse="asideCollapsed">
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
        <div class="aside-footer">
          <span v-if="!asideCollapsed">主题</span>
          <el-switch
            v-model="isDark"
            inline-prompt
            :active-action-icon="Moon"
            :inactive-action-icon="Sunny"
            @change="handleThemeChange"
            :loading="themeLoading"
          />
        </div>
      </el-aside>

      <el-container class="app-shell">
        <!-- 顶部工具条 -->
        <el-header class="app-topbar">
          <div class="left">
            <el-button class="hidden-desktop" circle text @click="drawerVisible = true">
              <el-icon><Menu /></el-icon>
            </el-button>
            <el-button class="hidden-mobile" circle text @click="toggleAside">
              <el-icon><Menu /></el-icon>
            </el-button>
            <span class="page-title">{{$route.meta.title || '网页解析工具'}}</span>
          </div>
          <div class="right">
            <el-switch
              class="hidden-mobile"
              v-model="isDark"
              inline-prompt
              :active-action-icon="Moon"
              :inactive-action-icon="Sunny"
              @change="handleThemeChange"
              :loading="themeLoading"
            />
          </div>
        </el-header>

        <!-- 主要内容区域 -->
        <el-main class="app-main">
          <transition name="view-fade" mode="out-in">
            <router-view />
          </transition>
        </el-main>

        <!-- 底部 -->
        <el-footer class="app-footer">
          <div class="footer-content">
            <p>&copy; 2024 网页解析工具 - 智能提取网页结构信息</p>
          </div>
        </el-footer>
      </el-container>
    </el-container>

    <!-- 移动端抽屉菜单（侧边栏） -->
    <el-drawer v-model="drawerVisible" direction="ltr" :with-header="false" size="78%">
      <div class="drawer-content">
        <div class="brand">
          <el-icon><Document /></el-icon>
          <span class="brand-name">网页解析工具</span>
        </div>
        <el-menu :default-active="$route.path" router @select="() => (drawerVisible = false)">
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
        <div class="drawer-actions">
          <span>主题</span>
          <el-switch
            v-model="isDark"
            inline-prompt
            :active-action-icon="Moon"
            :inactive-action-icon="Sunny"
            @change="handleThemeChange"
            :loading="themeLoading"
          />
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { Document, House, Clock, PieChart, Moon, Sunny, Menu } from '@element-plus/icons-vue'

export default {
  name: 'App',
  components: {
    Document,
    House,
    Clock,
    PieChart,
    Moon,
    Sunny,
    Menu
  },
  data() {
    return {
      isDark: false,
      themeLoading: false,
      drawerVisible: false,
      asideCollapsed: false
    }
  },
  mounted() {
    this.isDark = document.documentElement.classList.contains('dark')
    try {
      this.asideCollapsed = localStorage.getItem('aside-collapsed') === '1'
    } catch {}
  },
  methods: {
    handleThemeChange(val) {
      try {
        this.themeLoading = true
        const html = document.documentElement
        if (val) {
          html.classList.add('dark')
          html.setAttribute('data-theme', 'dark')
          localStorage.setItem('theme', 'dark')
        } else {
          html.classList.remove('dark')
          html.setAttribute('data-theme', 'light')
          localStorage.setItem('theme', 'light')
        }
        // 轻微的全局过渡，减少切换突兀
        document.body.style.transition = 'background-color 0.2s ease, color 0.2s ease'
      } finally {
        this.$nextTick(() => (this.themeLoading = false))
      }
    },
    toggleAside() {
      this.asideCollapsed = !this.asideCollapsed
      try { localStorage.setItem('aside-collapsed', this.asideCollapsed ? '1' : '0') } catch {}
    }
  }
}
</script>

<style lang="scss">
// Shell 布局
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #eaeef5 100%);
}

.app-aside {
  padding: 16px 12px;
  background: var(--app-card-bg);
  border-right: 1px solid var(--app-border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 16px;
    color: var(--app-text-color);
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--app-soft-bg);
  }

  .aside-menu {
    border-right: 0;
  }

  .aside-footer {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-top: 1px dashed var(--app-border-color);
    color: var(--app-text-secondary);
  }
}

.app-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--app-border-color);
  .left { display: flex; align-items: center; gap: 8px; }
  .right { display: flex; align-items: center; gap: 12px; }
  .page-title { font-weight: 700; color: var(--app-text-color); }
}

.app-main {
  padding: 20px;
}

.app-footer {
  background: rgba(255, 255, 255, 0.8);
  border-top: 1px solid var(--app-border-color);
  .footer-content {
    text-align: center;
    color: var(--app-text-secondary);
    font-size: 14px;
  }
}

// Drawer
.drawer-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.drawer-actions {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 6px;
  border-top: 1px dashed var(--app-border-color);
}

// 暗黑适配
.dark {
  .app-container { background: radial-gradient(1200px 600px at 10% 10%, #1f2937 0%, rgba(17, 24, 39, 0.95) 40%, #0b1220 100%); }
  .app-topbar { background: rgba(17, 24, 39, 0.7); }
  .app-aside { background: #0f172a; }
  .app-footer { background: rgba(17, 24, 39, 0.7); }
}
</style>