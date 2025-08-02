const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Database = require('./database/database');
const WebParser = require('./services/webParser');

const app = express();
const PORT = process.env.PORT || 3025;

// 中间件配置
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});
app.use(limiter);

// 解析请求的特殊限制
const parseLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 解析请求限制更严格
  message: {
    error: '解析请求过于频繁，请稍后再试'
  }
});

// 初始化数据库和服务
const database = new Database();
const webParser = new WebParser();

// API路由

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 获取解析历史
app.get('/api/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const results = await database.getParseHistory(limit, offset);
    const total = await database.getHistoryCount();
    
    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取解析历史失败'
    });
  }
});

// 根据ID获取解析结果
app.get('/api/parse/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await database.getParseResult(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '解析结果不存在'
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取解析结果失败:', error);
    res.status(500).json({
      success: false,
      error: '获取解析结果失败'
    });
  }
});

// 解析网页URL
app.post('/api/parse', parseLimit, async (req, res) => {
  try {
    const { url } = req.body;
    
    // 验证URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL参数无效'
      });
    }
    
    // 简单的URL验证
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url)) {
      return res.status(400).json({
        success: false,
        error: 'URL格式无效，请提供有效的HTTP或HTTPS地址'
      });
    }
    
    console.log(`开始解析URL: ${url}`);
    
    // 检查是否已有缓存结果
    const cached = await database.getCachedResult(url);
    if (cached && Date.now() - new Date(cached.created_at).getTime() < 24 * 60 * 60 * 1000) {
      console.log('返回缓存结果');
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }
    
    // 执行解析
    const startTime = Date.now();
    const parsedResult = await webParser.parseUrl(url);
    const parseTime = Date.now() - startTime;
    
    // 保存到数据库
    const savedResult = await database.saveParseResult({
      url,
      title: parsedResult.title || '未知标题',
      parsed_data: parsedResult.data,
      element_count: countElements(parsedResult.data),
      parse_time: parseTime,
      status: 'success'
    });
    
    console.log(`解析完成，耗时 ${parseTime}ms`);
    
    res.json({
      success: true,
      data: savedResult,
      cached: false
    });
    
  } catch (error) {
    console.error('解析失败:', error);
    
    // 保存失败记录
    if (req.body.url) {
      try {
        await database.saveParseResult({
          url: req.body.url,
          title: '解析失败',
          parsed_data: null,
          element_count: 0,
          parse_time: 0,
          status: 'failed',
          error_message: error.message
        });
      } catch (dbError) {
        console.error('保存失败记录错误:', dbError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: '网页解析失败: ' + error.message
    });
  }
});

// 删除解析记录
app.delete('/api/parse/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await database.deleteParseResult(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }
    
    res.json({
      success: true,
      message: '记录已删除'
    });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({
      success: false,
      error: '删除记录失败'
    });
  }
});

// 统计信息
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await database.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败'
    });
  }
});

// 辅助函数：计算元素数量
function countElements(data) {
  if (!Array.isArray(data)) return 0;
  
  let count = 0;
  
  function countRecursive(elements) {
    elements.forEach(element => {
      count++;
      if (element.children && Array.isArray(element.children)) {
        countRecursive(element.children);
      }
      // 检查CSS选择器格式的属性
      Object.keys(element).forEach(key => {
        if (Array.isArray(element[key]) && key !== 'children' && key !== 'classes') {
          countRecursive(element[key]);
        }
      });
    });
  }
  
  countRecursive(data);
  return count;
}

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await database.init();
    console.log('数据库初始化成功');
    
    // 初始化网页解析器
    await webParser.init();
    console.log('网页解析器初始化成功');
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器启动成功`);
      console.log(`📍 地址: http://localhost:${PORT}`);
      console.log(`📊 API文档: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await webParser.close();
  await database.close();
  process.exit(0);
});

startServer();
