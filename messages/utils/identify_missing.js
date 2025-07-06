const fs = require('fs');
const path = require('path');

// Define paths to translation files
const enPath = path.join(__dirname, '..', 'en.json');
const zhPath = path.join(__dirname, '..', 'zh.json');
const myPath = path.join(__dirname, '..', 'my.json');
const outputDir = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
  console.log(`Created output directory at ${outputDir}`);
}

try {
  console.log('Starting identification of missing translations...');
  
  // Read JSON files
  const en = require(enPath);
  const zh = require(zhPath);
  const my = require(myPath);
  
  // Objects to store missing translations
  const zhMissing = {};
  const myMissing = {};
  
  // Function to find missing translations
  function findMissingTranslations(reference, target, missing, prefix = '') {
    for (const key in reference) {
      if (reference.hasOwnProperty(key)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        
        if (typeof reference[key] === 'object' && reference[key] !== null && !Array.isArray(reference[key])) {
          // If it's an object, recursively check its properties
          if (!target[key] || typeof target[key] !== 'object') {
            // If key doesn't exist or is not an object in target, mark entire object as missing
            missing[currentPath] = reference[key];
          } else {
            // Continue checking nested properties
            findMissingTranslations(reference[key], target[key], missing, currentPath);
          }
        } else {
          // For primitive values, check if they exist in target
          if (!target.hasOwnProperty(key) || target[key] === '') {
            missing[currentPath] = reference[key];
          }
        }
      }
    }
  }
  
  // Find missing translations for Chinese
  console.log('Finding missing Chinese translations...');
  findMissingTranslations(en, zh, zhMissing);
  
  // Find missing translations for Malay
  console.log('Finding missing Malay translations...');
  findMissingTranslations(en, my, myMissing);
  
  // Count missing translations
  const zhMissingCount = Object.keys(zhMissing).length;
  const myMissingCount = Object.keys(myMissing).length;
  
  console.log(`Found ${zhMissingCount} missing translations in Chinese`);
  console.log(`Found ${myMissingCount} missing translations in Malay`);
  
  // Write missing translations to files
  const zhMissingPath = path.join(outputDir, 'zh_missing.json');
  const myMissingPath = path.join(outputDir, 'my_missing.json');
  
  fs.writeFileSync(zhMissingPath, JSON.stringify(zhMissing, null, 2), 'utf8');
  fs.writeFileSync(myMissingPath, JSON.stringify(myMissing, null, 2), 'utf8');
  
  console.log(`Chinese missing translations saved to: ${zhMissingPath}`);
  console.log(`Malay missing translations saved to: ${myMissingPath}`);
  
  // Generate a summary report
  const reportPath = path.join(outputDir, 'translation_report.txt');
  
  const report = `Translation Status Report
Generated on: ${new Date().toISOString()}
==================================

Summary:
- Chinese (zh): ${zhMissingCount} missing translations
- Malay (my): ${myMissingCount} missing translations

Missing in Chinese: ${zhMissingCount > 0 ? 'See zh_missing.json for details' : 'None'}
Missing in Malay: ${myMissingCount > 0 ? 'See my_missing.json for details' : 'None'}

Top 10 missing Chinese translations:
${Object.keys(zhMissing).slice(0, 10).map(key => `- ${key}`).join('\n')}

Top 10 missing Malay translations:
${Object.keys(myMissing).slice(0, 10).map(key => `- ${key}`).join('\n')}
`;
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`Translation report saved to: ${reportPath}`);
  
  console.log('Missing translation identification complete!');
  
} catch (error) {
  console.error('Error identifying missing translations:', error);
  process.exit(1);
} 