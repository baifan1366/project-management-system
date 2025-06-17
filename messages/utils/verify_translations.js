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

  
  if (missingKeys.length === 0) {
    
  } else {
    
    missingKeys.forEach(key => 
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
    
    extraKeys.forEach(key => 
  } else {
    
  }
  
  if (missingKeys.length === 0 && extraKeys.length === 0) {
    
    
  }
  
  
} catch (error) {
  
} 