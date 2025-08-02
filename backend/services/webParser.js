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

  parseElement(element, $) {
    const $el = $(element);
    const tagName = element.tagName.toLowerCase();
    
    if (!this.isElementVisible(element, $)) {
      return null;
    }
    
    const result = { type: tagName };
    
    const elementId = $el.attr('id');
    if (elementId && elementId.trim()) {
      result.id = elementId.trim();
    }
    
    const allClasses = $el.attr('class') ? $el.attr('class').split(/\s+/).filter(cls => cls.trim()) : [];
    const filteredClasses = this.filterStyleClasses(allClasses);
    if (filteredClasses && filteredClasses.length > 0) {
      result.classes = filteredClasses;
    }

    // 检查文本内容
    const directText = $el.contents().filter(function() {
      return this.type === 'text';
    }).text().trim();

    // 检查图片和视频
    if (tagName === 'img') {
      result.image = $el.attr('src') || $el.attr('data-src') || '';
      return result;
    }

    if (tagName === 'video') {
      result.video = $el.attr('src') || $el.find('source').first().attr('src') || '';
      return result;
    }

    if (directText) {
      result.text = directText;
      return result;
    }

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

    if (children.length > 0) {
      const hasContent = result.text || result.image || result.video;
      
      if (!hasContent) {
        // 容器元素：使用CSS选择器格式
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
        result.children = children;
      }
    }

    return result;
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
