# 🌐 智能网页解析工具

一个完整的全栈应用，将网页DOM结构智能转换为结构化JSON数据。

## ✨ 核心特性

### 🎯 智能解析
- **DOM结构分析**: 自动分析网页DOM结构
- **内容提取**: 智能提取文本、图片、视频等关键信息
- **CSS选择器**: 保留有语义价值的id和class信息

### 🧠 智能过滤
- **样式类过滤**: 自动过滤Bootstrap、Tailwind CSS等框架样式
- **隐藏元素检测**: 过滤不可见、隐藏、零尺寸元素
- **无用内容清理**: 移除脚本、样式、广告等干扰内容

### 📊 现代化界面
- **Vue 3 + Element Plus**: 现代化的前端界面
- **JSON美化展示**: 支持语法高亮、折叠展开、主题切换
- **响应式设计**: 完美适配桌面和移动端

### 🚀 高性能后端
- **Node.js + Express**: 高性能API服务器
- **SQLite数据库**: 轻量级数据存储
- **缓存机制**: 避免重复解析，提升性能
- **速率限制**: 防止滥用，保护服务器资源

## 🏗️ 技术架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vue.js 前端    │    │  Node.js 后端   │    │  SQLite 数据库   │
│                 │    │                 │    │                 │
│ • Element Plus  │◄──►│ • Express       │◄──►│ • 解析历史       │
│ • Vue Router    │    │ • Puppeteer     │    │ • 统计信息       │
│ • Axios         │    │ • Cheerio       │    │ • 缓存数据       │
│ • JSON渲染      │    │ • 速率限制      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 项目结构

```
web-page-parser-app/
├── backend/                 # 后端API服务器
│   ├── database/           # 数据库模块
│   │   ├── database.js     # 数据库操作
│   │   └── data.db         # SQLite数据库文件
│   ├── services/           # 业务服务
│   │   └── webParser.js    # 网页解析服务
│   ├── package.json
│   └── server.js           # 服务器入口文件
├── frontend/               # 前端Vue应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   └── JsonViewer.vue
│   │   ├── views/          # 页面
│   │   │   ├── Home.vue    # 首页
│   │   │   ├── History.vue # 历史记录
│   │   │   ├── Stats.vue   # 统计信息
│   │   │   └── Result.vue  # 结果页面
│   │   ├── services/       # API服务
│   │   │   └── api.js
│   │   ├── styles/         # 样式文件
│   │   └── router/         # 路由配置
│   ├── public/
│   ├── package.json
│   └── vue.config.js
├── package.json            # 项目根配置
└── README.md
```

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0

### 一键安装和启动

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd web-page-parser-app

# 2. 安装所有依赖并初始化数据库
npm run init

# 3. 启动开发环境（前端+后端）
npm run dev
```

### 分步安装

```bash
# 安装后端依赖
npm run install:backend

# 安装前端依赖  
npm run install:frontend

# 初始化数据库
npm run init:db

# 启动后端开发服务器
npm run dev:backend

# 启动前端开发服务器（新终端）
npm run dev:frontend
```

### 访问应用

- **前端界面**: http://localhost:8080
- **后端API**: http://localhost:3025
- **API文档**: http://localhost:3025/api/health

## 📖 使用指南

### 1. 网页解析

1. 在首页输入要解析的网址
2. 点击"开始解析"按钮
3. 等待解析完成，查看结果

### 2. JSON数据格式

工具输出智能格式化的JSON数据：

```json
[
  {
    "div#header.main-nav": [
      {
        "type": "h1",
        "classes": ["logo"],
        "text": "网站标题"
      },
      {
        "type": "img",
        "image": "https://example.com/logo.png"
      }
    ]
  },
  {
    "type": "p",
    "text": "这是页面内容"
  }
]
```

**格式说明**:
- **容器元素**: 使用CSS选择器格式 `div#id.class1.class2`
- **内容元素**: 包含 `type`、`text`、`image`、`video` 等属性
- **智能过滤**: 自动移除样式相关class和隐藏元素

### 3. 功能特性

#### 🎨 样式过滤
- **Bootstrap**: `btn`, `nav`, `container`, `row`, `col`
- **Tailwind CSS**: `w-full`, `text-center`, `bg-blue-500`
- **通用样式**: 颜色、尺寸、布局、状态类

#### 👁️ 可见性检测
- `display: none`, `visibility: hidden`
- `opacity: 0`, `width/height: 0`
- `.hidden`, `.sr-only`, `aria-hidden="true"`

#### 📊 数据管理
- **解析历史**: 查看所有解析记录
- **统计信息**: 成功率、性能指标
- **缓存机制**: 24小时内重复URL返回缓存结果

## 🔧 配置选项

### 后端配置

环境变量配置 (backend/.env):
```env
PORT=3025
NODE_ENV=development
```

### 前端配置

开发环境配置 (frontend/.env.development):
```env
VUE_APP_API_BASE_URL=http://localhost:3025/api
```

生产环境配置 (frontend/.env.production):
```env
VUE_APP_API_BASE_URL=/api
```

## 📈 API接口

### 解析网页
```http
POST /api/parse
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### 获取历史记录
```http
GET /api/history?page=1&limit=20
```

### 获取解析结果
```http
GET /api/parse/:id
```

### 统计信息
```http
GET /api/stats
```

## 🛡️ 安全特性

- **速率限制**: 防止API滥用
- **输入验证**: URL格式验证
- **SQL注入防护**: 参数化查询
- **XSS防护**: 输出转义
- **CORS配置**: 跨域资源共享控制

## 🔍 故障排除

### 常见问题

**Q: 无法访问某些网站？**
A: 检查目标网站是否有反爬虫机制，或网络连接是否正常。

**Q: 解析速度慢？**
A: 复杂页面解析需要时间，可以查看统计页面了解平均解析时间。

**Q: 前端无法连接后端？**
A: 确认后端服务已启动，检查端口配置是否正确。

### 日志查看

```bash
# 查看后端日志
cd backend && npm run dev

# 查看前端日志  
cd frontend && npm run dev
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Puppeteer](https://puppeteer.dev/) - 网页自动化
- [Cheerio](https://cheerio.js.org/) - 服务端DOM操作
- [Vue.js](https://vuejs.org/) - 前端框架
- [Element Plus](https://element-plus.org/) - UI组件库
- [vue-json-pretty](https://github.com/leezng/vue-json-pretty) - JSON展示组件

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！
