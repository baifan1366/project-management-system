const fs = require('fs');

try {
  const en = require('./messages/en.json');
  const zh = require('./messages/zh.json');

  const missingKeys = [];

  function findMissingKeys(enObj, zhObj, path = '') {
    for (const key in enObj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!zhObj.hasOwnProperty(key)) {
        missingKeys.push(currentPath);
      } else if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
        findMissingKeys(enObj[key], zhObj[key], currentPath);
      }
    }
  }

  findMissingKeys(en, zh);

  console.log('===== VERIFICATION RESULTS =====');
  if (missingKeys.length === 0) {
    console.log('✓ SUCCESS: No missing keys found. All English keys are now present in the Chinese translation.');
  } else {
    console.log(`✗ ERROR: Found ${missingKeys.length} keys still missing:`);
    missingKeys.forEach(key => console.log(`  - ${key}`));
  }

  // Also check if there are any keys in zh.json that are not in en.json
  const extraKeys = [];

  function findExtraKeys(zhObj, enObj, path = '') {
    for (const key in zhObj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!enObj.hasOwnProperty(key)) {
        extraKeys.push(currentPath);
      } else if (typeof zhObj[key] === 'object' && zhObj[key] !== null && !Array.isArray(zhObj[key])) {
        findExtraKeys(zhObj[key], enObj[key], currentPath);
      }
    }
  }

  findExtraKeys(zh, en);

  if (extraKeys.length > 0) {
    console.log(`\n✗ WARNING: Found ${extraKeys.length} extra keys in zh.json that are not in en.json:`);
    extraKeys.forEach(key => console.log(`  - ${key}`));
  } else {
    console.log('\n✓ SUCCESS: No extra keys found in zh.json.');
  }
  
  if (missingKeys.length === 0 && extraKeys.length === 0) {
    console.log('\n✅ PERFECT MATCH: The translation files are perfectly aligned.');
    console.log('\nThe Chinese translation file has been successfully updated with all missing translations.');
  }
  
  console.log('==============================');
} catch (error) {
  console.log('Error during verification:', error);
} 