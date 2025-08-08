<template>
  <div class="json-viewer">
    <div class="viewer-controls">
      <el-space>
        <el-button size="small" @click="expandAll" type="primary" plain>
          <el-icon><Plus /></el-icon>
          全部展开
        </el-button>
        <el-button size="small" @click="collapseAll" type="info" plain>
          <el-icon><Minus /></el-icon>
          全部折叠
        </el-button>
        <el-switch
          v-model="showLineNumbers"
          active-text="行号"
          size="small"
        />
        <el-select v-model="theme" size="small" style="width: 120px">
          <el-option label="浅色主题" value="light" />
          <el-option label="深色主题" value="dark" />
        </el-select>
      </el-space>
    </div>
    
    <div class="viewer-content" :class="[`theme-${theme}`]">
      <vue-json-pretty
        :data="data"
        :show-line-number="showLineNumbers"
        :show-length="true"
        :collapsed-on-click-brackets="true"
        :deep="deep"
        :theme="theme"
        :highlight-mouseover-node="true"
        :highlight-selected-node="true"
        :select-on-click-node="true"
        :show-double-quotes="false"
        @nodeClick="handleNodeClick"
      />
    </div>
    
    <!-- 节点信息面板 -->
    <div v-if="selectedNode" class="node-info">
      <el-card size="small">
        <template #header>
          <div class="node-header">
            <span>选中节点信息</span>
            <el-button size="small" text @click="selectedNode = null">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </template>
        <div class="node-details">
          <div class="node-path">
            <strong>路径:</strong> {{ selectedNode.path }}
          </div>
          <div class="node-type">
            <strong>类型:</strong> {{ getNodeType(selectedNode.data) }}
          </div>
          <div class="node-value" v-if="selectedNode.data !== null && selectedNode.data !== undefined">
            <strong>值:</strong> 
            <code>{{ formatNodeValue(selectedNode.data) }}</code>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { Plus, Minus, Close } from '@element-plus/icons-vue'

export default {
  name: 'JsonViewer',
  components: {
    VueJsonPretty,
    Plus,
    Minus,
    Close
  },
  props: {
    data: {
      type: [Object, Array],
      required: true
    },
    initialTheme: {
      type: String,
      default: 'light'
    }
  },
  setup(props) {
    const showLineNumbers = ref(true)
    const theme = ref(props.initialTheme)
    const deep = ref(3)
    const selectedNode = ref(null)
    
    // 跟随全局暗黑模式
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      theme.value = isDark ? 'dark' : 'light'
    }
    syncTheme()
    if (typeof window !== 'undefined') {
      const observer = new MutationObserver(syncTheme)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    }

    const expandAll = () => {
      deep.value = 99
    }

    const collapseAll = () => {
      deep.value = 1
    }

    const handleNodeClick = (node) => {
      selectedNode.value = {
        path: node.path,
        data: node.data
      }
    }

    const getNodeType = (data) => {
      if (Array.isArray(data)) return 'Array'
      if (data === null) return 'null'
      if (data === undefined) return 'undefined'
      return typeof data
    }

    const formatNodeValue = (data) => {
      if (typeof data === 'string') {
        return `"${data}"`
      }
      if (Array.isArray(data)) {
        return `Array(${data.length})`
      }
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data)
        return `Object(${keys.length} keys)`
      }
      return String(data)
    }

    return {
      showLineNumbers,
      theme,
      deep,
      selectedNode,
      expandAll,
      collapseAll,
      handleNodeClick,
      getNodeType,
      formatNodeValue
    }
  }
}
</script>

<style lang="scss" scoped>
.json-viewer {
  .viewer-controls {
    margin-bottom: 15px;
    padding: 12px 15px;
    background: var(--app-soft-bg);
    border-radius: 8px;
    border: 1px solid var(--app-border-color);
  }
  
  .viewer-content {
    border: 1px solid var(--app-border-color);
    border-radius: 8px;
    overflow: hidden;
    
    &.theme-dark {
      background: #1e1e1e;
    }
    
    :deep(.vjs-tree) {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      line-height: 1.5;
      padding: 16px 20px;
      max-height: 600px;
      overflow: auto;
    }
    
    :deep(.vjs-key) {
      color: #0969da;
      font-weight: 600;
    }
    
    :deep(.vjs-string) {
      color: #032f62;
    }
    
    :deep(.vjs-number) {
      color: #0550ae;
    }
    
    :deep(.vjs-boolean) {
      color: #8250df;
    }
    
    :deep(.vjs-null) {
      color: #656d76;
    }
  }
  
  .node-info {
    margin-top: 15px;
    
    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .node-details {
      .node-path {
        margin-bottom: 10px;
        font-family: monospace;
        background: #f6f8fa;
        padding: 5px 8px;
        border-radius: 4px;
        font-size: 12px;
      }
      
      .node-type {
        margin-bottom: 10px;
      }
      
      .node-value {
        code {
          background: #f6f8fa;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
        }
      }
    }
  }
}

// 深色主题的额外样式
.theme-dark {
  :deep(.vjs-key) {
    color: #79c0ff;
  }
  
  :deep(.vjs-string) {
    color: #a5d6ff;
  }
  
  :deep(.vjs-number) {
    color: #79c0ff;
  }
  
  :deep(.vjs-boolean) {
    color: #d2a8ff;
  }
  
  :deep(.vjs-null) {
    color: #8b949e;
  }
}
</style>