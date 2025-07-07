const fs = require('fs');
const path = require('path');

// Define paths
const enPath = path.join(__dirname, '..', 'en.json');
const zhPath = path.join(__dirname, '..', 'zh.json');
const myPath = path.join(__dirname, '..', 'my.json');
const outputDir = path.join(__dirname, 'output');
const zhTranslatedPath = path.join(outputDir, 'zh_translated.json');
const myTranslatedPath = path.join(outputDir, 'my_translated.json');

// Create backup directory if not exists
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Deep merge function
function deepMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      } else if (source[key] !== undefined) {
        target[key] = source[key];
      }
    }
  }
  return target;
}

try {
  console.log('Starting translation application process...');
  
  // Check if translated files exist
  if (!fs.existsSync(zhTranslatedPath)) {
    console.error('Chinese translated file not found at:', zhTranslatedPath);
    console.log('Please run the translate_missing.js script first.');
    process.exit(1);
  }
  
  if (!fs.existsSync(myTranslatedPath)) {
    console.error('Malay translated file not found at:', myTranslatedPath);
    console.log('Please run the translate_missing.js script first.');
    process.exit(1);
  }
  
  // Read the JSON files
  console.log('Reading translation files...');
  const zh = require(zhPath);
  const my = require(myPath);
  const zhTranslated = require(zhTranslatedPath);
  const myTranslated = require(myTranslatedPath);
  
  // Create backups
  const timestamp = new Date().toISOString().replace(/[:T\-\.Z]/g, '');
  const zhBackupPath = path.join(backupDir, `zh_backup_${timestamp}.json`);
  const myBackupPath = path.join(backupDir, `my_backup_${timestamp}.json`);
  
  console.log('Creating backups...');
  fs.writeFileSync(zhBackupPath, JSON.stringify(zh, null, 2), 'utf8');
  fs.writeFileSync(myBackupPath, JSON.stringify(my, null, 2), 'utf8');
  console.log(`Backups created at ${zhBackupPath} and ${myBackupPath}`);
  
  // Merge translations
  console.log('Merging translations...');
  const updatedZh = deepMerge(JSON.parse(JSON.stringify(zh)), zhTranslated);
  const updatedMy = deepMerge(JSON.parse(JSON.stringify(my)), myTranslated);
  
  // Write the updated translations
  console.log('Writing updated translation files...');
  fs.writeFileSync(zhPath, JSON.stringify(updatedZh, null, 2), 'utf8');
  fs.writeFileSync(myPath, JSON.stringify(updatedMy, null, 2), 'utf8');
  
  console.log('Translation application completed successfully!');
  console.log('Chinese translations updated at:', zhPath);
  console.log('Malay translations updated at:', myPath);
  
} catch (error) {
  console.error('Error applying translations:', error);
  process.exit(1);
} 