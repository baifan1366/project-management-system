const fs = require('fs');
const path = require('path');

// Load the English source file
const enPath = path.join(__dirname, '..', 'en.json');
const zhPath = path.join(__dirname, '..', 'zh.json');
const myPath = path.join(__dirname, '..', 'my.json');

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

try {
  // Load the JSON files
  const enData = require('../en.json');
  const zhData = require('../zh.json');
  const myData = require('../my.json');

  // Find missing translations
  const zhMissing = {};
  const myMissing = {};

  function findMissingTranslations(enObj, translationObj, missingObj, path = '') {
    for (const key in enObj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!translationObj.hasOwnProperty(key)) {
        // Add to missing translations
        if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
          missingObj[key] = {};
          findMissingTranslations(enObj[key], {}, missingObj[key], currentPath);
        } else {
          missingObj[key] = enObj[key]; // Use English as placeholder
        }
      } else if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
        if (!missingObj[key]) {
          missingObj[key] = {};
        }
        findMissingTranslations(enObj[key], translationObj[key], missingObj[key], currentPath);
      }
    }
  }

  // Find missing translations
  findMissingTranslations(enData, zhData, zhMissing);
  findMissingTranslations(enData, myData, myMissing);

  // Create translation files with missing entries
  fs.writeFileSync(
    path.join(outputDir, 'zh_missing.json'),
    JSON.stringify(zhMissing, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outputDir, 'my_missing.json'),
    JSON.stringify(myMissing, null, 2),
    'utf8'
  );

  console.log(`Missing Chinese translations saved to ${path.join(outputDir, 'zh_missing.json')}`);
  console.log(`Missing Malay translations saved to ${path.join(outputDir, 'my_missing.json')}`);

  // Provide information about what to do next
  console.log('\nNext steps:');
  console.log('1. Translate the missing entries in the output files');
  console.log('2. Merge the translations using the merge_translations.js script');
  console.log('3. Apply the updates using the update_translations.js script');

} catch (error) {
  console.error('Error generating translation files:', error);
} 