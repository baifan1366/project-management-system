const fs = require('fs');

// Read the files
const zh = require('./messages/zh.json');
const missingTranslations = require('./missing_translations.json');

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

// Merge the missing translations into the zh.json object
const updatedZh = deepMerge(zh, missingTranslations);

// Write the updated translations back to zh.json
fs.writeFileSync('./messages/zh_updated.json', JSON.stringify(updatedZh, null, 2), 'utf8');


