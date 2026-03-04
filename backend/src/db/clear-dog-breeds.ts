import pool from './pool';

async function clear() {
  const client = await pool.connect();
  try {
    const res = await client.query('DELETE FROM breeds WHERE species = $1', ['dog']);
    console.log(`已清空 ${res.rowCount} 条狗品种记录。请执行 npm run seed 重新导入。`);
  } catch (err) {
    console.error('清空失败（若有宠物引用品种会报错）:', err);
    throw err;
  } finally {
    client.release();
  }
}

clear()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
