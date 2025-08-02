const { webPageToJson } = require('./index.js');

/**
 * 示例用法
 */
async function example() {
  try {
    console.log('=== 网页转JSON工具示例 ===\n');
    
    // 示例网址（可以替换为其他网址）
    const testUrl = 'https://example.com';
    
    console.log(`正在转换网页: ${testUrl}`);
    console.log('请稍等...\n');
    
    const result = await webPageToJson(testUrl);
    
    console.log('转换完成！结果如下：');
    console.log('='.repeat(50));
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(50));
    
    console.log(`\n共解析出 ${result.length} 个顶级元素`);
    
    // 统计信息
    let textCount = 0;
    let imageCount = 0;
    let videoCount = 0;
    
    function countElements(elements) {
      elements.forEach(element => {
        if (element.text) textCount++;
        if (element.image) imageCount++;
        if (element.video) videoCount++;
        if (element.children) {
          countElements(element.children);
        }
      });
    }
    
    countElements(result);
    
    console.log(`统计信息:`);
    console.log(`- 文本元素: ${textCount} 个`);
    console.log(`- 图片元素: ${imageCount} 个`);
    console.log(`- 视频元素: ${videoCount} 个`);
    
  } catch (error) {
    console.error('示例运行失败:', error.message);
  }
}

// 运行示例
if (require.main === module) {
  example();
}

module.exports = { example };