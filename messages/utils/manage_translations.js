const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths
const utilsDir = __dirname;
const verifyScript = path.join(utilsDir, 'verify_translations.js');
const identifyScript = path.join(utilsDir, 'identify_missing.js');
const cleanScript = path.join(utilsDir, 'clean_translations.js');
const applyScript = path.join(utilsDir, 'apply_translations.js');

// Check if scripts exist
const scriptsExist = [
  { path: verifyScript, name: 'verify_translations.js' },
  { path: identifyScript, name: 'identify_missing.js' },
  { path: cleanScript, name: 'clean_translations.js' },
  { path: applyScript, name: 'apply_translations.js' }
].every(script => {
  const exists = fs.existsSync(script.path);
  if (!exists) {
    console.error(`Error: Script ${script.name} not found at ${script.path}`);
  }
  return exists;
});

if (!scriptsExist) {
  console.error('Some required scripts are missing. Please make sure all translation utility scripts are in the same directory.');
  process.exit(1);
}

// Define available commands
const commands = {
  verify: {
    description: 'Verify translation files for structural integrity',
    script: verifyScript
  },
  identify: {
    description: 'Identify missing translations in language files',
    script: identifyScript
  },
  clean: {
    description: 'Clean translation files by removing redundant keys',
    script: cleanScript
  },
  apply: {
    description: 'Apply translated content to language files',
    script: applyScript
  },
  all: {
    description: 'Run all translation utilities in sequence (verify → identify → clean → apply)',
    script: null
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

// Show help if no command or help requested
if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(`
Translation Management Utility
=============================

Usage: node manage_translations.js <command>

Available commands:
${Object.entries(commands).map(([cmd, info]) => `  ${cmd.padEnd(10)} - ${info.description}`).join('\n')}

Examples:
  node manage_translations.js verify    # Verify translation files
  node manage_translations.js all       # Run all utilities in sequence
  `);
  process.exit(0);
}

// Check if command is valid
if (!commands[command]) {
  console.error(`Error: Unknown command "${command}"`);
  console.log('Run "node manage_translations.js help" for usage information');
  process.exit(1);
}

// Function to run a script and handle errors
function runScript(scriptPath, name) {
  console.log(`\n==== Running ${name} ====`);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error running ${name}: ${error.message}`);
    return false;
  }
}

// Execute the requested command
if (command === 'all') {
  // Run all scripts in sequence
  console.log('Running all translation utilities in sequence...\n');
  
  const results = [
    { name: 'Verification', success: runScript(verifyScript, 'verify_translations.js') },
    { name: 'Identification', success: runScript(identifyScript, 'identify_missing.js') },
    { name: 'Cleaning', success: runScript(cleanScript, 'clean_translations.js') },
    { name: 'Application', success: runScript(applyScript, 'apply_translations.js') }
  ];
  
  // Print summary
  console.log('\n==== Summary ====');
  results.forEach(result => {
    console.log(`${result.name}: ${result.success ? 'Success' : 'Failed'}`);
  });
  
  const allSuccessful = results.every(r => r.success);
  if (allSuccessful) {
    console.log('\nAll translation utilities completed successfully!');
  } else {
    console.error('\nSome translation utilities failed. Check the logs above for details.');
    process.exit(1);
  }
} else {
  // Run a single script
  const scriptPath = commands[command].script;
  const success = runScript(scriptPath, path.basename(scriptPath));
  
  if (success) {
    console.log(`\n${command} completed successfully!`);
  } else {
    console.error(`\n${command} failed. Check the logs above for details.`);
    process.exit(1);
  }
} 