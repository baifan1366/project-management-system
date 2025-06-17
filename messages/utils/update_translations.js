const fs = require('fs');
const path = require('path');

try {
  // Define file paths
  const zhPath = path.join(__dirname, 'messages', 'zh.json');
  const zhUpdatedPath = path.join(__dirname, 'messages', 'zh_updated.json');
  const zhBackupPath = path.join(__dirname, 'messages', `zh_backup_${Date.now()}.json`);
  
  // Check if files exist
  if (!fs.existsSync(zhPath)) {
    console.error('Error: Original zh.json file not found.');
    process.exit(1);
  }
  
  if (!fs.existsSync(zhUpdatedPath)) {
    console.error('Error: Updated zh_updated.json file not found.');
    process.exit(1);
  }
  
  // Create backup of original file
  fs.copyFileSync(zhPath, zhBackupPath);
  
  
  // Replace original file with updated file
  fs.copyFileSync(zhUpdatedPath, zhPath);
  
  
  // Delete the updated file
  fs.unlinkSync(zhUpdatedPath);
  
  
  
  
} catch (error) {
  console.error('Error updating translations:', error);
} 