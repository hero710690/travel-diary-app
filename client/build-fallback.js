#!/usr/bin/env node

// Fallback build script for when react-scripts has dependency issues
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fallback build script starting...');

// Check critical dependencies
const checkDependency = (depName) => {
  const depPath = path.join(__dirname, 'node_modules', depName);
  const exists = fs.existsSync(depPath);
  console.log(`📋 ${depName}: ${exists ? '✅ Found' : '❌ Missing'}`);
  return exists;
};

console.log('🔍 Checking critical dependencies...');
const hasTypeScript = checkDependency('typescript');
const hasReactScripts = checkDependency('react-scripts');
const hasBuiltinModules = checkDependency('builtin-modules');

// Install missing dependencies
const missingDeps = [];
if (!hasTypeScript) missingDeps.push('typescript@^4.9.5');
if (!hasReactScripts) missingDeps.push('react-scripts@5.0.1');
if (!hasBuiltinModules) missingDeps.push('builtin-modules@^3.3.0');

if (missingDeps.length > 0) {
  console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  console.log('📦 Installing missing dependencies...');
  try {
    execSync(`npm install ${missingDeps.join(' ')} --save --legacy-peer-deps`, { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    console.log('✅ Missing dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install missing dependencies:', error.message);
    process.exit(1);
  }
}

// Try to build
console.log('🏗️ Starting build process...');

const buildCommands = [
  'npm run build',
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
        CI: 'false',
        SKIP_PREFLIGHT_CHECK: 'true'
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
  
  // Additional debugging
  console.log('🔍 Additional debugging info:');
  try {
    console.log('TypeScript version:');
    execSync('npx tsc --version', { stdio: 'inherit', cwd: __dirname });
  } catch (e) {
    console.log('TypeScript not accessible');
  }
  
  try {
    console.log('React Scripts version:');
    execSync('npx react-scripts --version', { stdio: 'inherit', cwd: __dirname });
  } catch (e) {
    console.log('React Scripts not accessible');
  }
  
  process.exit(1);
}

// Verify build directory exists
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  console.log('✅ Build directory created successfully');
  const files = fs.readdirSync(buildDir);
  console.log('📁 Build contents:', files.slice(0, 10)); // Show first 10 files
} else {
  console.error('❌ Build directory not found');
  process.exit(1);
}
