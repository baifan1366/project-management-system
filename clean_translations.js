const path = require('path');
const { execSync } = require('child_process');

// Define path to the manage_translations.js script
const manageScript = path.join(__dirname, 'messages', 'utils', 'manage_translations.js');

console.log('Forwarding to translation management utility...');

try {
  // Run the clean command using the manage_translations.js script
  execSync(`node "${manageScript}" clean`, { stdio: 'inherit' });
  console.log('\nTranslation cleanup completed successfully!');
} catch (error) {
  console.error(`\nTranslation cleanup failed: ${error.message}`);
  process.exit(1);
} 