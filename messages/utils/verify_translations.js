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

// Function to check if a file is valid JSON
function isValidJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      line: error.message.match(/line (\d+)/)?.[1] || 'unknown'
    };
  }
}

// Function to check structural integrity
function checkStructure(reference, target, path = '') {
  const issues = [];
  
  // Check for missing keys in target
  for (const key in reference) {
    if (reference.hasOwnProperty(key)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!target.hasOwnProperty(key)) {
        issues.push({
          type: 'missing_key',
          path: currentPath,
          message: `Key "${currentPath}" exists in reference but not in target`
        });
      } else if (typeof reference[key] !== typeof target[key]) {
        issues.push({
          type: 'type_mismatch',
          path: currentPath,
          message: `Type mismatch for "${currentPath}": reference is ${typeof reference[key]}, target is ${typeof target[key]}`
        });
      } else if (typeof reference[key] === 'object' && reference[key] !== null && !Array.isArray(reference[key])) {
        // Recursively check nested objects
        const nestedIssues = checkStructure(reference[key], target[key], currentPath);
        issues.push(...nestedIssues);
      }
    }
  }
  
  // Check for extra keys in target
  for (const key in target) {
    if (target.hasOwnProperty(key) && !reference.hasOwnProperty(key)) {
      const currentPath = path ? `${path}.${key}` : key;
      issues.push({
        type: 'extra_key',
        path: currentPath,
        message: `Key "${currentPath}" exists in target but not in reference`
      });
    }
  }
  
  return issues;
}

try {
  console.log('Starting translation verification...');
  
  // Check if files are valid JSON
  console.log('Checking JSON validity...');
  const enValid = isValidJson(enPath);
  const zhValid = isValidJson(zhPath);
  const myValid = isValidJson(myPath);
  
  const jsonErrors = [];
  
  if (!enValid.valid) {
    jsonErrors.push(`English file (en.json) is not valid JSON: ${enValid.error} at line ${enValid.line}`);
  }
  
  if (!zhValid.valid) {
    jsonErrors.push(`Chinese file (zh.json) is not valid JSON: ${zhValid.error} at line ${zhValid.line}`);
  }
  
  if (!myValid.valid) {
    jsonErrors.push(`Malay file (my.json) is not valid JSON: ${myValid.error} at line ${myValid.line}`);
  }
  
  if (jsonErrors.length > 0) {
    console.error('JSON validation errors found:');
    jsonErrors.forEach(error => console.error(`- ${error}`));
    throw new Error('JSON validation failed');
  }
  
  console.log('All files are valid JSON. Checking structural integrity...');
  
  // Read JSON files
  const en = require(enPath);
  const zh = require(zhPath);
  const my = require(myPath);
  
  // Check structure
  const zhIssues = checkStructure(en, zh);
  const myIssues = checkStructure(en, my);
  
  // Count issues by type
  const zhMissingKeys = zhIssues.filter(issue => issue.type === 'missing_key').length;
  const zhExtraKeys = zhIssues.filter(issue => issue.type === 'extra_key').length;
  const zhTypeMismatches = zhIssues.filter(issue => issue.type === 'type_mismatch').length;
  
  const myMissingKeys = myIssues.filter(issue => issue.type === 'missing_key').length;
  const myExtraKeys = myIssues.filter(issue => issue.type === 'extra_key').length;
  const myTypeMismatches = myIssues.filter(issue => issue.type === 'type_mismatch').length;
  
  // Generate report
  const reportPath = path.join(outputDir, 'verification_report.txt');
  
  const report = `Translation Verification Report
Generated on: ${new Date().toISOString()}
==================================

JSON Validity:
- English (en.json): ${enValid.valid ? 'Valid' : 'Invalid - ' + enValid.error}
- Chinese (zh.json): ${zhValid.valid ? 'Valid' : 'Invalid - ' + zhValid.error}
- Malay (my.json): ${myValid.valid ? 'Valid' : 'Invalid - ' + myValid.error}

Structure Issues:
- Chinese (zh.json): ${zhIssues.length} issues found
  * Missing keys: ${zhMissingKeys}
  * Extra keys: ${zhExtraKeys}
  * Type mismatches: ${zhTypeMismatches}
  
- Malay (my.json): ${myIssues.length} issues found
  * Missing keys: ${myMissingKeys}
  * Extra keys: ${myExtraKeys}
  * Type mismatches: ${myTypeMismatches}

${zhIssues.length > 0 || myIssues.length > 0 ? 'Sample Issues:' : 'No issues found!'}
${zhIssues.slice(0, 5).map(issue => `- Chinese: ${issue.message}`).join('\n')}
${zhIssues.length > 5 ? `... and ${zhIssues.length - 5} more issues in Chinese translations` : ''}

${myIssues.slice(0, 5).map(issue => `- Malay: ${issue.message}`).join('\n')}
${myIssues.length > 5 ? `... and ${myIssues.length - 5} more issues in Malay translations` : ''}
`;
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`Verification report saved to: ${reportPath}`);
  
  // Save detailed issues to JSON files
  if (zhIssues.length > 0) {
    const zhIssuesPath = path.join(outputDir, 'zh_issues.json');
    fs.writeFileSync(zhIssuesPath, JSON.stringify(zhIssues, null, 2), 'utf8');
    console.log(`Chinese issues saved to: ${zhIssuesPath}`);
  }
  
  if (myIssues.length > 0) {
    const myIssuesPath = path.join(outputDir, 'my_issues.json');
    fs.writeFileSync(myIssuesPath, JSON.stringify(myIssues, null, 2), 'utf8');
    console.log(`Malay issues saved to: ${myIssuesPath}`);
  }
  
  // Summary
  console.log('\nVerification Summary:');
  console.log(`- Chinese: ${zhIssues.length === 0 ? 'No issues' : `${zhIssues.length} issues found`}`);
  console.log(`- Malay: ${myIssues.length === 0 ? 'No issues' : `${myIssues.length} issues found`}`);
  
  console.log('\nTranslation verification complete!');
  
} catch (error) {
  console.error('Error during translation verification:', error);
  process.exit(1);
} 