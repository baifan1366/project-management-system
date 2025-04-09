// 这个脚本用于下载企鹅模型并放置在正确位置
// 运行方式: node scripts/download-penguin-model.js

const fs = require('fs');
const path = require('path');
const https = require('https');

// 创建目录如果不存在
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`已创建目录: ${directory}`);
  }
}

// 下载文件
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    console.log(`开始下载: ${url}`);
    
    const file = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败，状态码: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`文件下载成功: ${destination}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    // 企鹅模型URL - 这里使用的是Sketchfab上的一个开源模型示例
    // 您可以将此URL替换为您选择的模型URL
    const penguinModelUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';
    
    // 目标路径
    const publicDir = path.join(__dirname, '..', 'public');
    const destination = path.join(publicDir, 'penguin.glb');
    
    // 确保目录存在
    ensureDirectoryExists(publicDir);
    
    // 下载文件
    await downloadFile(penguinModelUrl, destination);
    
    console.log('✅ 企鹅模型已成功下载并保存到public文件夹');
    console.log('注意: penguin.glb已添加到.gitignore，不会被提交到版本控制系统');
  } catch (error) {
    console.error('❌ 下载失败:', error.message);
    process.exit(1);
  }
}

main(); 