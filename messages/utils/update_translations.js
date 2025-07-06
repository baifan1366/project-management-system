const fs = require('fs');
const path = require('path');

try {
  // Define file paths
  const enPath = path.join(__dirname, '..', 'en.json');
  const zhPath = path.join(__dirname, '..', 'zh.json');
  const myPath = path.join(__dirname, '..', 'my.json');
  const outputDir = path.join(__dirname, 'output');
  const zhUpdatedPath = path.join(outputDir, 'zh_updated.json');
  const myUpdatedPath = path.join(outputDir, 'my_updated.json');
  
  // Create backups before applying updates
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const timestamp = new Date().toISOString().replace(/[:T\-\.Z]/g, '');
  const zhBackupPath = path.join(backupDir, `zh_backup_${timestamp}.json`);
  const myBackupPath = path.join(backupDir, `my_backup_${timestamp}.json`);
  
  // Check if updated files exist
  let updateZh = false;
  let updateMy = false;
  
  if (fs.existsSync(zhUpdatedPath)) {
    updateZh = true;
  } else {
    console.log('No updated Chinese translation file found. Skipping Chinese update.');
  }
  
  if (fs.existsSync(myUpdatedPath)) {
    updateMy = true;
  } else {
    console.log('No updated Malay translation file found. Skipping Malay update.');
  }
  
  // Create backups and update files if needed
  if (updateZh) {
    if (!fs.existsSync(zhPath)) {
      console.error('Error: Original zh.json file not found.');
    } else {
      // Create backup of original file
      fs.copyFileSync(zhPath, zhBackupPath);
      console.log(`Backup of zh.json created at ${zhBackupPath}`);
      
      // Replace original file with updated file
      fs.copyFileSync(zhUpdatedPath, zhPath);
      console.log('zh.json has been updated successfully');
    }
  }
  
  if (updateMy) {
    if (!fs.existsSync(myPath)) {
      console.error('Error: Original my.json file not found.');
    } else {
      // Create backup of original file
      fs.copyFileSync(myPath, myBackupPath);
      console.log(`Backup of my.json created at ${myBackupPath}`);
      
      // Replace original file with updated file
      fs.copyFileSync(myUpdatedPath, myPath);
      console.log('my.json has been updated successfully');
    }
  }
  
  // Cleanup
  if (updateZh && fs.existsSync(zhUpdatedPath)) {
    fs.unlinkSync(zhUpdatedPath);
    console.log('Temporary zh_updated.json file deleted');
  }
  
  if (updateMy && fs.existsSync(myUpdatedPath)) {
    fs.unlinkSync(myUpdatedPath);
    console.log('Temporary my_updated.json file deleted');
  }
  
  console.log('Translation update process completed');
} catch (error) {
  console.error('Error updating translations:', error);
} 