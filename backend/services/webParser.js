const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class WebParser {
  constructor() {
    this.browser = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async parseUrl(url) {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser.newPage();
    
    try {
      // 设置用户代理和视口
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // 访问页面
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30250 
      });
      
      // 等待页面加载
      await page.waitForTimeout(2000);
      
      // 获取页面标题和HTML
      const title = await page.title();
      const html = await page.content();
      
      // 解析HTML
      const parsedData = this.parseHTML(html);
      
      return {
        title,
        data: parsedData,
        url,
        timestamp: new Date().toISOString()
      };
      
    } finally {
      await page.close();
    }
  }

  parseHTML(html) {
    const $ = cheerio.load(html);
    
    // 过滤无用元素
    this.filterUnwantedElements($);
    
    // 扫描页面，统计class出现次数
    this.uniqueClasses = this.scanForUniqueClasses($);
    
    const result = [];
    const startElement = $('body').length > 0 ? $('body') : $('html');
    
    startElement.children().each((index, element) => {
      const parsed = this.parseElement(element, $);
      if (parsed && this.isValidElement(parsed)) {
        result.push(parsed);
      }
    });
    
    return result;
  }

  /**
   * 扫描页面，找出独一无二的class
   * @param {object} $ - Cheerio实例
   * @returns {Set} 独一无二的class集合
   */
  scanForUniqueClasses($) {
    const classCount = {};
    
    // 统计所有class的出现次数
    $('*').each((index, element) => {
      const $el = $(element);
      const allClasses = $el.attr('class') ? $el.attr('class').split(/\s+/).filter(cls => cls.trim()) : [];
      const filteredClasses = this.filterStyleClasses(allClasses);
      
      filteredClasses.forEach(cls => {
        classCount[cls] = (classCount[cls] || 0) + 1;
      });
    });
    
    // 找出只出现一次的class
    const uniqueClasses = new Set();
    Object.keys(classCount).forEach(cls => {
      if (classCount[cls] === 1) {
        uniqueClasses.add(cls);
      }
    });
    
    return uniqueClasses;
  }

  filterUnwantedElements($) {
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'meta', 'link', 'head',
      '.ad', '.advertisement', '.ads',
      '[style*="display:none"]', '[style*="display: none"]',
      '[style*="visibility:hidden"]', '[style*="visibility: hidden"]',
      '[style*="opacity:0"]', '[style*="opacity: 0"]',
      '.hidden', '.hide', '.invisible', '.sr-only', '.visually-hidden', '.d-none'
    ];

    unwantedSelectors.forEach(selector => {
      $(selector).remove();
    });
  }

  isElementVisible(element, $) {
    const $el = $(element);
    
    if (!$el.length) return false;
    
    const style = $el.attr('style') || '';
    
    // 检查各种隐藏样式
    if (style.includes('display:none') || style.includes('display: none')) return false;
    if (style.includes('visibility:hidden') || style.includes('visibility: hidden')) return false;
    
    const opacityMatch = style.match(/opacity\s*:\s*([0-9.]+)/);
    if (opacityMatch && parseFloat(opacityMatch[1]) === 0) return false;
    
    const widthMatch = style.match(/width\s*:\s*([0-9.]+)(?:px)?/);
    const heightMatch = style.match(/height\s*:\s*([0-9.]+)(?:px)?/);
    if ((widthMatch && parseFloat(widthMatch[1]) === 0) || 
        (heightMatch && parseFloat(heightMatch[1]) === 0)) return false;
    
    const className = $el.attr('class') || '';
    const hiddenClasses = ['hidden', 'hide', 'invisible', 'sr-only', 'visually-hidden', 'd-none'];
    if (hiddenClasses.some(cls => className.includes(cls))) return false;
    
    if ($el.attr('aria-hidden') === 'true') return false;
    
    const hasText = $el.text().trim().length > 0;
    const hasChildren = $el.children().length > 0;
    const isImage = element.tagName && element.tagName.toLowerCase() === 'img';
    const isVideo = element.tagName && element.tagName.toLowerCase() === 'video';
    
    if (!hasText && !hasChildren && !isImage && !isVideo) return false;
    
    return true;
  }

  filterStyleClasses(classes) {
    const stylePatterns = [
      // Bootstrap和CSS框架
      /^(btn|nav|navbar|card|modal|alert|badge|breadcrumb|carousel|dropdown|form|input|table)($|-)/,
      /^(container|row|col|grid|flex|d-|justify|align|text-|bg-|border-|p-|m-|pt-|pb-|pl-|pr-|mt-|mb-|ml-|mr-)/,
      
      // Tailwind CSS
      /^tw-/, /^(w|h|min-w|min-h|max-w|max-h)-/, /^(p|m|px|py|pl|pr|pt|pb|mx|my|ml|mr|mt|mb)-/,
      /^(text|bg|border|ring|shadow|outline)-/, /^(flex|grid|items|justify|content|self|place)-/,
      /^(space|gap|divide)-/, /^(rounded|opacity|z|order|inset)-/,
      /^(transition|transform|scale|rotate|translate|skew|origin)-/,
      /^(filter|blur|brightness|contrast|grayscale|sepia)-/,
      /^(cursor|select|resize|appearance)-/, /^(sr-only|not-sr-only|focus-within|group-hover|group-focus)-/,
      /^(sm|md|lg|xl|2xl):/, /^(hover|focus|active|disabled|first|last|odd|even|checked):/,
      /^(font|leading|tracking|text)-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/,
      /^text-(left|center|right|justify)/,
      
      // 颜色和尺寸
      /^(primary|secondary|success|danger|warning|info|light|dark|muted)$/,
      /^(red|blue|green|yellow|orange|purple|pink|gray|grey|black|white|indigo|cyan|teal|lime|emerald|sky|violet|fuchsia|rose|amber|slate|zinc|neutral|stone)($|-)/,
      /^(xs|sm|md|lg|xl|xxl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)($|-)/,
      /^(small|medium|large|big|tiny|mini)$/,
      
      // 布局
      /^(float|position|absolute|relative|fixed|sticky|static|top|bottom|left|right|center)($|-)/,
      /^(block|inline|hidden|visible|overflow|scroll|auto)($|-)/,
      /^(mobile|tablet|desktop|responsive)($|-)/,
      /^(active|inactive|disabled|enabled|selected|hover|focus|visited)$/,
      
      // 其他
      /\d+$/, /^[a-z]{1,2}$/,
      /^(font|weight|style|decoration|transform|transition|animation|opacity|shadow|radius|width|height)($|-)/,
      /^(list|appearance|caret|accent|scroll|snap|touch|will-change|content)/
    ];
    
    return classes.filter(cls => {
      if (!cls || cls.trim().length === 0) return false;
      return !stylePatterns.some(pattern => pattern.test(cls.toLowerCase()));
    });
  }

  buildSelectorKey(tagName, id, classes) {
    let selector = tagName;
    
    if (id && id.trim()) {
      selector += `#${id}`;
    }
    
    if (classes && Array.isArray(classes) && classes.length > 0) {
      selector += `.${classes.join('.')}`;
    }
    
    return selector;
  }

  parseElement(element, $, selectorPath = []) {
    const $el = $(element);
    const tagName = element.tagName.toLowerCase();
    
    if (!this.isElementVisible(element, $)) {
      return null;
    }
    
    // 构建当前元素的选择器部分
    const elementId = $el.attr('id');
    const allClasses = $el.attr('class') ? $el.attr('class').split(/\s+/).filter(cls => cls.trim()) : [];
    const filteredClasses = this.filterStyleClasses(allClasses);
    
    // 检查是否有ID或独一无二的class，可以重置选择器路径（忽略上层）
    let currentPath;
    const uniqueClass = this.findUniqueClass(filteredClasses);
    
    if (elementId && elementId.trim()) {
      // 有ID，重置路径
      currentPath = [this.buildSelectorKey(tagName, elementId.trim(), filteredClasses)];
    } else if (uniqueClass) {
      // 有独一无二的class，重置路径
      currentPath = [this.buildSelectorKey(tagName, null, [uniqueClass])];
    } else {
      // 普通元素，继承上层路径
      currentPath = [...selectorPath, this.buildSelectorKey(tagName, null, filteredClasses)];
    }

    // 检查文本内容
    const directText = $el.contents().filter(function() {
      return this.type === 'text';
    }).text().trim();

    const textContent = $el.clone().children().remove().end().text().trim();

    // 检查图片和视频
    if (tagName === 'img') {
      const imageSrc = $el.attr('src') || $el.attr('data-src') || '';
      return {
        type: tagName,
        selector: currentPath.join(' ').trim(),
        image: this.truncateBase64(imageSrc)
      };
    }

    if (tagName === 'video') {
      const videoSrc = $el.attr('src') || $el.find('source').first().attr('src') || '';
      return {
        type: tagName,
        selector: currentPath.join(' ').trim(),
        video: this.truncateBase64(videoSrc)
      };
    }

    // 如果有直接文本内容
    if (directText) {
      return {
        type: tagName,
        selector: currentPath.join(' ').trim(),
        text: directText
      };
    }

    // 如果是叶子节点且有文本
    if (textContent && $el.children().length === 0) {
      return {
        type: tagName,
        selector: currentPath.join(' ').trim(),
        text: textContent
      };
    }

    // 处理子元素
    const children = [];
    $el.children().each((index, child) => {
      const childResult = this.parseElement(child, $, currentPath);
      if (childResult && this.isValidElement(childResult)) {
        children.push(childResult);
      }
    });

    if (children.length > 0) {
      // 智能合并逻辑：统计有多少个并列的内容分支
      const contentBranches = this.countContentBranches(children);
      
      // 如果只有一个内容分支，考虑是否可以合并
      if (contentBranches <= 1) {
        // 单分支：检查是否可以合并
        if (children.length === 1) {
          const child = children[0];
          if (child.type) {
            // 子节点是内容节点，直接返回（selector已经正确计算）
            return child;
          } else {
            // 子节点是容器，但只有一个分支，继续保持结构
            const uniqueClass = this.findUniqueClass(filteredClasses);
            const selectorKey = this.buildSelectorKey(
              tagName, 
              elementId && elementId.trim() ? elementId.trim() : null, 
              uniqueClass ? [uniqueClass] : (filteredClasses && filteredClasses.length > 0 ? filteredClasses : null)
            );
            return { [selectorKey]: children };
          }
        } else {
          // 多个子节点但只有一个内容分支，保留结构
          const uniqueClass = this.findUniqueClass(filteredClasses);
          const selectorKey = this.buildSelectorKey(
            tagName, 
            elementId && elementId.trim() ? elementId.trim() : null, 
            uniqueClass ? [uniqueClass] : (filteredClasses && filteredClasses.length > 0 ? filteredClasses : null)
          );
          return { [selectorKey]: children };
        }
      } else {
        // 多个内容分支，必须保留容器显示并列关系
        const uniqueClass = this.findUniqueClass(filteredClasses);
        const selectorKey = this.buildSelectorKey(
          tagName, 
          elementId && elementId.trim() ? elementId.trim() : null, 
          uniqueClass ? [uniqueClass] : (filteredClasses && filteredClasses.length > 0 ? filteredClasses : null)
        );
        return { [selectorKey]: children };
      }
    }

    return null;
  }

  /**
   * 计算并列的内容分支数量
   * @param {Array} children - 子节点数组  
   * @returns {number} 内容分支数量
   */
  countContentBranches(children) {
    let branches = 0;
    
    children.forEach(child => {
      if (child.type) {
        // 直接是内容节点，算一个分支
        branches++;
      } else {
        // 是容器节点，检查是否有内容
        Object.keys(child).forEach(key => {
          if (Array.isArray(child[key]) && child[key].length > 0) {
            // 容器有内容，算一个分支
            branches++;
          }
        });
      }
    });
    
    return branches;
  }

  /**
   * 从class列表中找出独一无二的class
   * @param {Array} classes - class数组
   * @returns {string|null} 独一无二的class，没有则返回null
   */
  findUniqueClass(classes) {
    if (!classes || !this.uniqueClasses) return null;
    
    for (const cls of classes) {
      if (this.uniqueClasses.has(cls)) {
        return cls;
      }
    }
    
    return null;
  }

  /**
   * 截取base64数据，只保留前缀部分
   * @param {string} src - 图片或视频的src属性
   * @returns {string} 截取后的base64字符串
   */
  truncateBase64(src) {
    if (!src) return '';
    
    // 检查是否为base64格式
    const base64Pattern = /^data:([a-zA-Z0-9][a-zA-Z0-9\/+]*);base64,(.+)$/;
    const match = src.match(base64Pattern);
    
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      
      // 只保留前50个字符的base64数据，并添加省略号
      const truncatedData = base64Data.length > 50 
        ? base64Data.substring(0, 50) + '...[truncated]'
        : base64Data;
      
      return `data:${mimeType};base64,${truncatedData}`;
    }
    
    // 如果不是base64格式，直接返回原始src
    return src;
  }

  isValidElement(element) {
    return !!(
      element.text || 
      element.image || 
      element.video || 
      (element.children && element.children.length > 0) ||
      Object.keys(element).some(key => Array.isArray(element[key]) && key !== 'classes')
    );
  }
}

module.exports = WebParser;
