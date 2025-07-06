const fs = require('fs');
const path = require('path');

// Read the files
const en = require('../en.json');
const zh = require('../zh.json');
const my = require('../my.json');

const zhMissingKeys = {};
const myMissingKeys = {};

// Function to find and extract missing translations
function findMissingTranslations(enObj, translationObj, missingKeysObj, currentPath = '') {
  for (const key in enObj) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    
    if (!translationObj.hasOwnProperty(key)) {
      // Build the nested structure for the missing key
      setNestedValue(missingKeysObj, newPath.split('.'), enObj[key]);
    } else if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
      findMissingTranslations(enObj[key], translationObj[key], missingKeysObj, newPath);
    }
  }
}

// Helper function to set a nested value based on a path array
function setNestedValue(obj, pathArray, value) {
  const key = pathArray[0];
  
  if (pathArray.length === 1) {
    obj[key] = value;
    return;
  }
  
  if (!obj[key] || typeof obj[key] !== 'object') {
    obj[key] = {};
  }
  
  setNestedValue(obj[key], pathArray.slice(1), value);
}

// Deep merge function to add missing translations
function deepMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

// Find missing translations for both languages
findMissingTranslations(en, zh, zhMissingKeys);
findMissingTranslations(en, my, myMissingKeys);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Write the missing translations to files
if (Object.keys(zhMissingKeys).length > 0) {
  fs.writeFileSync(
    path.join(outputDir, 'zh_missing.json'), 
    JSON.stringify(zhMissingKeys, null, 2), 
    'utf8'
  );
  console.log(`${Object.keys(zhMissingKeys).length} missing Chinese translations written to zh_missing.json`);
}

if (Object.keys(myMissingKeys).length > 0) {
  fs.writeFileSync(
    path.join(outputDir, 'my_missing.json'), 
    JSON.stringify(myMissingKeys, null, 2), 
    'utf8'
  );
  console.log(`${Object.keys(myMissingKeys).length} missing Malay translations written to my_missing.json`);
}

// For demonstration, merge and create updated files with placeholders
const updatedZh = deepMerge(JSON.parse(JSON.stringify(zh)), zhMissingKeys);
const updatedMy = deepMerge(JSON.parse(JSON.stringify(my)), myMissingKeys);

// Write the updated translations with placeholders
fs.writeFileSync(
  path.join(outputDir, 'zh_updated.json'),
  JSON.stringify(updatedZh, null, 2),
  'utf8'
);

fs.writeFileSync(
  path.join(outputDir, 'my_updated.json'),
  JSON.stringify(updatedMy, null, 2),
  'utf8'
);

console.log('Updated translation files with placeholders created in the output directory');
console.log('Please review and translate the missing items before applying them to the actual files');


