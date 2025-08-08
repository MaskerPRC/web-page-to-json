const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Database = require('./database/database');
const WebParser = require('./services/webParser');
const LlmClient = require('./services/llm');

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
let llmClient = null;

// API路由
// LLM 生成爬虫（多阶段）
app.post('/api/llm/generate-crawler', parseLimit, async (req, res) => {
  try {
    if (!llmClient) {
      return res.status(500).json({ success: false, error: 'LLM 未配置：请设置 OPENAI_API_KEY 环境变量后重启服务' })
    }
    const { url, goal, contextJson } = req.body || {}
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: '缺少有效的 url' })
    }

    // 阶段1：让模型先确定输出 JSON 结构
    const step1Prompt = [
      { role: 'system', content: '你是资深爬虫工程师，擅长为网页抽象稳定的数据结构与生成健壮的爬虫代码。' },
      { role: 'user', content: `目标网址: ${url}\n任务: 先只给出“爬虫最终输出的大 JSON 数据结构定义”，包含字段说明和类型示例。不要写代码。${goal ? '\n补充目标: ' + goal : ''}` }
    ]
    const step1 = await llmClient.chat(step1Prompt)

    // 阶段2：在上一步结构基础上，生成 Node.js 独立可运行的爬虫代码
    const step2Prompt = [
      { role: 'system', content: '请生成可直接运行的 Node.js 爬虫代码（只返回代码），包含依赖说明、错误处理、超时与重试、输出为上一步定义的 JSON 结构。' },
      { role: 'user', content: `网址: ${url}\n输出结构: ${step1}\n上下文JSON(可选): ${contextJson ? JSON.stringify(contextJson).slice(0, 4000) : '无'}` }
    ]
    const step2 = await llmClient.chat(step2Prompt, { max_tokens: 6000 })

    // 阶段3：要求模型自审并修复代码中的明显问题（仍只返回最终代码）
    const step3Prompt = [
      { role: 'system', content: '请自检上一步的代码是否存在明显问题（依赖缺失、未定义变量、语法错误、未处理异常等），如有请修复并只输出修复后的完整最终代码。' },
      { role: 'user', content: step2 }
    ]
    const finalCode = await llmClient.chat(step3Prompt, { max_tokens: 6000 })

    res.json({ success: true, data: { step1Schema: step1, code: finalCode } })
  } catch (error) {
    console.error('LLM 生成爬虫失败:', error)
    res.status(500).json({ success: false, error: 'LLM 生成失败: ' + error.message })
  }
})

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
    const { url, filters = { text: true, image: true, video: true } } = req.body;
    
    // 验证URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL参数无效'
      });
    }
    
    // 验证过滤器参数
    if (!filters.text && !filters.image && !filters.video) {
      return res.status(400).json({
        success: false,
        error: '至少需要选择一种内容类型（文本、图片或视频）'
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
    
    console.log(`开始解析URL: ${url}，过滤器:`, filters);
    
    // 生成缓存键（包含过滤器信息）
    const filterKey = `${filters.text ? 'T' : ''}${filters.image ? 'I' : ''}${filters.video ? 'V' : ''}`;
    const cacheKey = `${url}_${filterKey}`;
    
    // 检查是否已有缓存结果
    const cached = await database.getCachedResult(cacheKey);
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
    
    // 应用内容类型过滤
    const filteredData = filterContentByType(parsedResult.data, filters);
    const parseTime = Date.now() - startTime;
    
    // 保存到数据库（使用缓存键）
    const savedResult = await database.saveParseResult({
      url: cacheKey,
      title: parsedResult.title || '未知标题',
      parsed_data: filteredData,
      element_count: countElements(filteredData),
      parse_time: parseTime,
      status: 'success',
      filters: JSON.stringify(filters)
    });
    
    console.log(`解析完成，耗时 ${parseTime}ms，过滤后元素数量: ${countElements(filteredData)}`);
    
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
      // 如果是内容节点（有type属性）
      if (element.type) {
        count++;
      } else {
        // 如果是容器节点（CSS选择器格式）
        Object.keys(element).forEach(key => {
          if (Array.isArray(element[key])) {
            countRecursive(element[key]);
          }
        });
      }
    });
  }
  
  countRecursive(data);
  return count;
}

// 辅助函数：根据内容类型过滤数据
function filterContentByType(data, filters) {
  if (!Array.isArray(data)) return data;
  
  function filterRecursive(elements) {
    const filtered = [];
    
    elements.forEach(element => {
      if (element.type) {
        // 内容节点，检查是否符合过滤条件
        if ((element.text && filters.text) ||
            (element.image && filters.image) ||
            (element.video && filters.video)) {
          filtered.push(element);
        }
      } else {
        // 容器节点，递归过滤子元素
        const newElement = {};
        Object.keys(element).forEach(key => {
          if (Array.isArray(element[key])) {
            const filteredChildren = filterRecursive(element[key]);
            if (filteredChildren.length > 0) {
              newElement[key] = filteredChildren;
            }
          }
        });
        // 只有当容器中有内容时才保留
        if (Object.keys(newElement).length > 0) {
          filtered.push(newElement);
        }
      }
    });
    
    return filtered;
  }
  
  return filterRecursive(data);
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
    try {
      llmClient = new LlmClient();
      console.log('LLM 客户端初始化成功');
    } catch (e) {
      console.warn('LLM 客户端未初始化：', e.message);
    }
    
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
