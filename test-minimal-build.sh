#!/bin/bash

# Minimal Build Test - Only Essential React Dependencies
# This script tests the absolute minimum setup

set -e

echo "🧪 Testing Minimal React Build"
echo "=============================="

cd client

echo "📋 Current environment:"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo ""

# Complete cleanup
echo "🧹 Complete cleanup..."
rm -rf node_modules package-lock.json yarn.lock
npm cache clean --force

# Remove any remaining config files that might cause issues
echo "🧹 Removing potential config conflicts..."
rm -f tailwind.config.js postcss.config.js tsconfig.json
rm -f *.backup

# Show current package.json
echo "📋 Current package.json dependencies:"
cat package.json | grep -A 10 '"dependencies"'

# Install minimal dependencies
echo "📦 Installing minimal dependencies..."
npm install

# Test critical dependencies
echo "🔍 Testing critical dependencies..."
npm run test:deps

# Check what's actually installed
echo "📋 Installed packages:"
ls -la node_modules/ | grep -E "(react|web-vitals)" || echo "Core packages check"

# Verify react-scripts specifically
echo "🔍 Verifying react-scripts..."
if [ -d "node_modules/react-scripts" ]; then
  echo "✅ react-scripts directory exists"
  if [ -f "node_modules/.bin/react-scripts" ]; then
    echo "✅ react-scripts binary exists"
  else
    echo "❌ react-scripts binary missing"
  fi
else
  echo "❌ react-scripts directory missing"
  exit 1
fi

# Test react-scripts command
echo "🧪 Testing react-scripts command..."
if npx react-scripts --version; then
  echo "✅ react-scripts command works"
else
  echo "❌ react-scripts command failed"
  exit 1
fi

# Try the build
echo "🏗️ Attempting minimal build..."
if npm run build; then
  echo "✅ Build successful!"
  echo ""
  echo "📦 Build output:"
  ls -la build/
  echo ""
  echo "📊 Build size:"
  du -sh build/
  echo ""
  echo "🎉 Minimal build test PASSED!"
  echo ""
  echo "📁 Build contents:"
  find build -type f -name "*.html" -o -name "*.js" -o -name "*.css" | head -10
  echo ""
  echo "✅ Ready for deployment!"
else
  echo "❌ Build failed!"
  echo ""
  echo "🔍 Final debugging:"
  echo "Package.json exists: $([ -f package.json ] && echo 'Yes' || echo 'No')"
  echo "Node modules size: $(du -sh node_modules/ 2>/dev/null || echo 'N/A')"
  echo "React scripts version:"
  npx react-scripts --version 2>/dev/null || echo "Not accessible"
  echo ""
  exit 1
fi
