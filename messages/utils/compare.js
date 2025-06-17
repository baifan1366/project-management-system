const fs = require('fs');

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