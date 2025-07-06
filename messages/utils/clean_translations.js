const fs = require('fs');
const path = require('path');

// Define paths to translation files
const enPath = path.join(__dirname, '..', 'en.json');
const zhPath = path.join(__dirname, '..', 'zh.json');
const myPath = path.join(__dirname, '..', 'my.json');

try {
  console.log('Starting cleanup of redundant translation keys...');
  
  // Read JSON files
  const en = require(enPath);
  const zh = require(zhPath);
  const my = require(myPath);
  
  // Create backups
  const timestamp = new Date().toISOString().replace(/[:T\-\.Z]/g, '');
  const backupDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
    console.log(`Created backup directory at ${backupDir}`);
  }
  
  const zhBackupPath = path.join(backupDir, `zh_backup_${timestamp}.json`);
  const myBackupPath = path.join(backupDir, `my_backup_${timestamp}.json`);
  
  console.log('Creating backup files...');
  fs.writeFileSync(zhBackupPath, JSON.stringify(zh, null, 2), 'utf8');
  fs.writeFileSync(myBackupPath, JSON.stringify(my, null, 2), 'utf8');
  console.log(`Backups created at ${zhBackupPath} and ${myBackupPath}`);
  
  // Cleanup function to ensure target object only contains keys that exist in reference object
  function cleanObject(target, reference) {
    const result = {};
    
    // Iterate through all keys in the reference object
    for (const key in reference) {
      if (reference.hasOwnProperty(key)) {
        if (typeof reference[key] === 'object' && reference[key] !== null && !Array.isArray(reference[key])) {
          // If nested object, recursively clean
          if (target.hasOwnProperty(key) && typeof target[key] === 'object') {
            result[key] = cleanObject(target[key], reference[key]);
          } else {
            // If key doesn't exist in target or is not an object, use empty object
            result[key] = cleanObject({}, reference[key]);
          }
        } else {
          // If primitive type, copy value (if exists)
          if (target.hasOwnProperty(key)) {
            result[key] = target[key];
          } else {
            // If key doesn't exist in target, use reference value
            result[key] = reference[key];
          }
        }
      }
    }
    
    return result;
  }
  
  // Clean Chinese and Malay translations
  console.log('Cleaning Chinese translations...');
  const cleanedZh = cleanObject(zh, en);
  
  console.log('Cleaning Malay translations...');
  const cleanedMy = cleanObject(my, en);
  
  // Count removed keys
  const zhRemovedCount = countKeys(zh) - countKeys(cleanedZh);
  const myRemovedCount = countKeys(my) - countKeys(cleanedMy);
  
  console.log(`Removed ${zhRemovedCount} redundant keys from Chinese translations`);
  console.log(`Removed ${myRemovedCount} redundant keys from Malay translations`);
  
  // Write cleaned files
  console.log('Writing cleaned files...');
  fs.writeFileSync(zhPath, JSON.stringify(cleanedZh, null, 2), 'utf8');
  fs.writeFileSync(myPath, JSON.stringify(cleanedMy, null, 2), 'utf8');
  
  console.log('Cleanup complete!');
  console.log(`Chinese translations updated at: ${zhPath}`);
  console.log(`Malay translations updated at: ${myPath}`);
  
} catch (error) {
  console.error('Error during translation cleanup:', error);
  process.exit(1);
}

// Helper function: Count keys in an object (including nested keys)
function countKeys(obj) {
  let count = 0;
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      count++;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        count += countKeys(obj[key]);
      }
    }
  }
  
  return count;
}
