const Database = require('../database/database');

async function initDatabase() {
  console.log('正在初始化数据库...');
  
  try {
    const db = new Database();
    await db.init();
    
    console.log('✅ 数据库初始化成功！');
    console.log('📁 数据库文件位置: backend/database/data.db');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  }
}

initDatabase();