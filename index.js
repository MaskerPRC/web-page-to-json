const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class WebPageToJson {
  constructor() {
    this.browser = null;
  }

  /**
   * 初始化浏览器
   */
  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * 获取网页HTML内容
   * @param {string} url - 目标网址
   * @returns {string} HTML内容
   */
  async getPageHTML(url) {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser.newPage();
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      // 访问页面并等待加载完成
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30250 
      });
      
      // 等待一段时间确保动态内容加载
      await page.waitForTimeout(2000);
      
      const html = await page.content();
      await page.close();
      return html;
    } catch (error) {
      await page.close();
      throw new Error(`获取页面失败: ${error.message}`);
    }
  }

  /**
   * 过滤样式相关的class名称
   * @param {Array} classes - class数组
   * @returns {Array} 过滤后的class数组
   */
  filterStyleClasses(classes) {
    const stylePatterns = [
      // Bootstrap和CSS框架相关
      /^(btn|nav|navbar|card|modal|alert|badge|breadcrumb|carousel|dropdown|form|input|table)($|-)/,
      /^(container|row|col|grid|flex|d-|justify|align|text-|bg-|border-|p-|m-|pt-|pb-|pl-|pr-|mt-|mb-|ml-|mr-)/,
      
      // Tailwind CSS框架相关
      /^tw-/,  // tw- 前缀
      /^(w|h|min-w|min-h|max-w|max-h)-/,  // 宽高相关
      /^(p|m|px|py|pl|pr|pt|pb|mx|my|ml|mr|mt|mb)-/,  // 间距相关
      /^(text|bg|border|ring|shadow|outline)-/,  // 颜色和效果
      /^(flex|grid|items|justify|content|self|place)-/,  // 布局相关
      /^(space|gap|divide)-/,  // 间隔相关
      /^(rounded|opacity|z|order|inset)-/,  // 样式属性
      /^(transition|transform|scale|rotate|translate|skew|origin)-/,  // 动画变换
      /^(filter|blur|brightness|contrast|grayscale|sepia)-/,  // 滤镜效果
      /^(cursor|select|resize|appearance)-/,  // 交互相关
      /^(sr-only|not-sr-only|focus-within|group-hover|group-focus)-/,  // 特殊状态
      /^(sm|md|lg|xl|2xl):/,  // 响应式前缀
      /^(hover|focus|active|disabled|first|last|odd|even|checked):/,  // 状态前缀
      /^(font|leading|tracking|text)-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/,  // 字体尺寸
      /^text-(left|center|right|justify)/,  // 文本对齐
      
      // 颜色相关
      /^(primary|secondary|success|danger|warning|info|light|dark|muted)$/,
      /^(red|blue|green|yellow|orange|purple|pink|gray|grey|black|white|indigo|cyan|teal|lime|emerald|sky|violet|fuchsia|rose|amber|slate|zinc|neutral|stone)($|-)/,
      
      // 尺寸相关
      /^(xs|sm|md|lg|xl|xxl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)($|-)/,
      /^(small|medium|large|big|tiny|mini)$/,
      
      // 布局和定位
      /^(float|position|absolute|relative|fixed|sticky|static|top|bottom|left|right|center)($|-)/,
      /^(block|inline|hidden|visible|overflow|scroll|auto)($|-)/,
      
      // 响应式
      /^(mobile|tablet|desktop|responsive)($|-)/,
      
      // 状态相关
      /^(active|inactive|disabled|enabled|selected|hover|focus|visited)$/,
      
      // 数字结尾的class（通常是样式相关）
      /\d+$/,
      
      // 单字母或很短的class（通常是样式简写）
      /^[a-z]{1,2}$/,
      
      // CSS属性相关
      /^(font|weight|style|decoration|transform|transition|animation|opacity|shadow|radius|width|height)($|-)/,
      
      // 更多Tailwind工具类
      /^(list|appearance|caret|accent|scroll|snap|touch|will-change|content)/
    ];
    
    return classes.filter(cls => {
      if (!cls || cls.trim().length === 0) return false;
      
      // 检查是否匹配任何样式模式
      return !stylePatterns.some(pattern => pattern.test(cls.toLowerCase()));
    });
  }

  /**
   * 解析DOM元素为JSON结构
   * @param {object} element - Cheerio元素对象
   * @param {object} $ - Cheerio实例
   * @returns {object} JSON结构
   */
  parseElement(element, $) {
    const $el = $(element);
    const tagName = element.tagName.toLowerCase();
    
    // 检查元素是否可见，不可见的直接跳过
    if (!this.isElementVisible(element, $)) {
      return null;
    }
    
    // 获取基本属性
    const result = {
      type: tagName
    };
    
    // 只在有id时添加id属性
    const elementId = $el.attr('id');
    if (elementId && elementId.trim()) {
      result.id = elementId.trim();
    }
    
    // 只在有有效classes时添加classes属性
    const allClasses = $el.attr('class') ? $el.attr('class').split(/\s+/).filter(cls => cls.trim()) : [];
    const filteredClasses = this.filterStyleClasses(allClasses);
    if (filteredClasses && filteredClasses.length > 0) {
      result.classes = filteredClasses;
    }

    // 检查是否为文本节点（包含直接文本内容）
    const directText = $el.contents().filter(function() {
      return this.type === 'text';
    }).text().trim();

    // 检查是否为图片
    if (tagName === 'img') {
      result.image = $el.attr('src') || $el.attr('data-src') || '';
      return result;
    }

    // 检查是否为视频
    if (tagName === 'video') {
      result.video = $el.attr('src') || $el.find('source').first().attr('src') || '';
      return result;
    }

    // 检查是否包含有意义的文本内容
    if (directText) {
      result.text = directText;
      return result;
    }

    // 如果没有直接文本，检查是否只包含单一文本子元素
    const textContent = $el.clone().children().remove().end().text().trim();
    if (textContent && $el.children().length === 0) {
      result.text = textContent;
      return result;
    }

    // 处理子元素
    const children = [];
    $el.children().each((index, child) => {
      const childResult = this.parseElement(child, $);
      if (childResult && this.isValidElement(childResult)) {
        children.push(childResult);
      }
    });

    // 如果有子元素，添加children属性
    if (children.length > 0) {
      // 检查是否只是容器元素（没有text、image、video等内容）
      const hasContent = result.text || result.image || result.video;
      
      if (!hasContent) {
        // 容器元素：使用CSS选择器格式作为key
        const elementId = $el.attr('id');
        const allClasses = $el.attr('class') ? $el.attr('class').split(/\s+/).filter(cls => cls.trim()) : [];
        const filteredClasses = this.filterStyleClasses(allClasses);
        
        const selectorKey = this.buildSelectorKey(
          tagName, 
          elementId && elementId.trim() ? elementId.trim() : null, 
          filteredClasses && filteredClasses.length > 0 ? filteredClasses : null
        );
        return { [selectorKey]: children };
      } else {
        // 有内容的元素：正常添加children属性
        result.children = children;
      }
    }

    return result;
  }

  /**
   * 构建CSS选择器格式的key
   * @param {string} tagName - 标签名
   * @param {string} id - id属性
   * @param {Array} classes - class数组
   * @returns {string} CSS选择器格式的key
   */
  buildSelectorKey(tagName, id, classes) {
    let selector = tagName;
    
    // 添加id
    if (id && id.trim()) {
      selector += `#${id}`;
    }
    
    // 添加classes
    if (classes && Array.isArray(classes) && classes.length > 0) {
      selector += `.${classes.join('.')}`;
    }
    
    return selector;
  }

  /**
   * 检查元素是否有效（包含有用信息）
   * @param {object} element - 解析后的元素对象
   * @returns {boolean} 是否有效
   */
  isValidElement(element) {
    // 检查是否有文本、图片、视频或子元素
    return !!(
      element.text || 
      element.image || 
      element.video || 
      (element.children && element.children.length > 0) ||
      // 检查CSS选择器格式的属性（容器元素）
      Object.keys(element).some(key => Array.isArray(element[key]) && key !== 'classes')
    );
  }

  /**
   * 过滤无用的DOM元素
   * @param {object} $ - Cheerio实例
   */
  filterUnwantedElements($) {
    // 移除脚本、样式、注释等无用元素
    const unwantedSelectors = [
      'script',
      'style', 
      'noscript',
      'meta',
      'link',
      'head',
      '.ad',
      '.advertisement', 
      '.ads',
      // 显式隐藏的元素
      '[style*="display:none"]',
      '[style*="display: none"]',
      '[style*="visibility:hidden"]',
      '[style*="visibility: hidden"]',
      '[style*="opacity:0"]',
      '[style*="opacity: 0"]',
      // 常见的隐藏class
      '.hidden',
      '.hide',
      '.invisible',
      '.sr-only',
      '.visually-hidden',
      '.d-none'
    ];

    unwantedSelectors.forEach(selector => {
      $(selector).remove();
    });
  }

  /**
   * 检查元素是否可见
   * @param {object} element - Cheerio元素对象
   * @param {object} $ - Cheerio实例
   * @returns {boolean} 是否可见
   */
  isElementVisible(element, $) {
    const $el = $(element);
    
    // 检查元素是否存在
    if (!$el.length) return false;
    
    // 检查inline style
    const style = $el.attr('style') || '';
    
    // 检查display属性
    if (style.includes('display:none') || style.includes('display: none')) {
      return false;
    }
    
    // 检查visibility属性
    if (style.includes('visibility:hidden') || style.includes('visibility: hidden')) {
      return false;
    }
    
    // 检查opacity
    const opacityMatch = style.match(/opacity\s*:\s*([0-9.]+)/);
    if (opacityMatch && parseFloat(opacityMatch[1]) === 0) {
      return false;
    }
    
    // 检查width和height
    const widthMatch = style.match(/width\s*:\s*([0-9.]+)(?:px)?/);
    const heightMatch = style.match(/height\s*:\s*([0-9.]+)(?:px)?/);
    
    if ((widthMatch && parseFloat(widthMatch[1]) === 0) || 
        (heightMatch && parseFloat(heightMatch[1]) === 0)) {
      return false;
    }
    
    // 检查常见的隐藏class
    const className = $el.attr('class') || '';
    const hiddenClasses = ['hidden', 'hide', 'invisible', 'sr-only', 'visually-hidden', 'd-none'];
    
    if (hiddenClasses.some(cls => className.includes(cls))) {
      return false;
    }
    
    // 检查aria-hidden属性
    if ($el.attr('aria-hidden') === 'true') {
      return false;
    }
    
    // 检查元素是否有实际内容或子元素
    const hasText = $el.text().trim().length > 0;
    const hasChildren = $el.children().length > 0;
    const isImage = element.tagName && element.tagName.toLowerCase() === 'img';
    const isVideo = element.tagName && element.tagName.toLowerCase() === 'video';
    
    // 如果没有文本、子元素，也不是图片或视频，可能是装饰性元素
    if (!hasText && !hasChildren && !isImage && !isVideo) {
      return false;
    }
    
    return true;
  }

  /**
   * 将网页转换为JSON结构
   * @param {string} url - 目标网址
   * @returns {Array} JSON结构数组
   */
  async convertToJson(url) {
    try {
      console.log(`正在获取网页内容: ${url}`);
      const html = await this.getPageHTML(url);
      
      console.log('正在解析DOM结构...');
      const $ = cheerio.load(html);
      
      // 过滤无用元素
      this.filterUnwantedElements($);
      
      const result = [];
      
      // 从body开始解析，如果没有body则从html开始
      const startElement = $('body').length > 0 ? $('body') : $('html');
      
      startElement.children().each((index, element) => {
        const parsed = this.parseElement(element, $);
        if (parsed && this.isValidElement(parsed)) {
          result.push(parsed);
        }
      });
      
      return result;
      
    } catch (error) {
      throw new Error(`转换失败: ${error.message}`);
    }
  }
}

/**
 * 导出函数用于直接调用
 * @param {string} url - 目标网址
 * @returns {Array} JSON结构数组
 */
async function webPageToJson(url) {
  const converter = new WebPageToJson();
  try {
    const result = await converter.convertToJson(url);
    return result;
  } finally {
    await converter.close();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.log('用法: node index.js <网址>');
    console.log('示例: node index.js https://example.com');
    process.exit(1);
  }

  webPageToJson(url)
    .then(result => {
      console.log('转换结果:');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('错误:', error.message);
      process.exit(1);
    });
}

module.exports = { WebPageToJson, webPageToJson };
