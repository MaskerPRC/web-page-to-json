const fs = require('fs');
const path = require('path');
const Database = require('../database/database');

async function resetDatabase() {
  console.log('🗄️ 重置数据库...');
  
  try {
    const dbPath = path.join(__dirname, '../database/data.db');
    
    // 删除旧数据库文件
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('✅ 旧数据库文件已删除');
    }
    
    // 创建新数据库
    const db = new Database();
    await db.init();
    
    console.log('✅ 新数据库创建成功！');
    console.log('📁 数据库文件位置: backend/database/data.db');
    
    await db.close();
    console.log('🎉 数据库重置完成！');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库重置失败:', error.message);
    process.exit(1);
  }
}

resetDatabase();