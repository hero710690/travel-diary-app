#!/usr/bin/env node

// Fallback build script for when react-scripts is not found
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fallback build script starting...');

// Check if react-scripts exists
const reactScriptsPath = path.join(__dirname, 'node_modules', '.bin', 'react-scripts');
const reactScriptsExists = fs.existsSync(reactScriptsPath);

console.log(`📋 React Scripts Path: ${reactScriptsPath}`);
console.log(`📋 React Scripts Exists: ${reactScriptsExists}`);

if (!reactScriptsExists) {
  console.log('❌ react-scripts not found, installing...');
  try {
    execSync('npm install react-scripts@5.0.1 --save --legacy-peer-deps', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    console.log('✅ react-scripts installed');
  } catch (error) {
    console.error('❌ Failed to install react-scripts:', error.message);
    process.exit(1);
  }
}

// Try to build
console.log('🏗️ Starting build process...');

const buildCommands = [
  'npx react-scripts build',
  './node_modules/.bin/react-scripts build',
  'node node_modules/react-scripts/scripts/build.js'
];

let buildSuccess = false;

for (const command of buildCommands) {
  try {
    console.log(`🧪 Trying: ${command}`);
    execSync(command, { 
      stdio: 'inherit',
      cwd: __dirname,
      env: { 
        ...process.env, 
        GENERATE_SOURCEMAP: 'false',
        CI: 'false'
      }
    });
    buildSuccess = true;
    console.log('✅ Build successful!');
    break;
  } catch (error) {
    console.log(`❌ Command failed: ${command}`);
    console.log(`Error: ${error.message}`);
  }
}

if (!buildSuccess) {
  console.error('❌ All build attempts failed');
  process.exit(1);
}

// Verify build directory exists
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  console.log('✅ Build directory created successfully');
  const files = fs.readdirSync(buildDir);
  console.log('📁 Build contents:', files);
} else {
  console.error('❌ Build directory not found');
  process.exit(1);
}
