#!/bin/bash

# Local Build Testing Script
# Test the frontend build process locally before pushing to GitHub Actions

set -e

echo "🧪 Testing Frontend Build Locally"
echo "================================="

cd client

echo "📋 Current environment:"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo ""

# Clean everything
echo "🧹 Cleaning npm cache and dependencies..."
npm cache clean --force
rm -rf node_modules package-lock.json

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Test critical dependencies
echo "🔍 Testing critical dependencies..."
npm run test:deps

# Verify specific problematic modules
echo "🔍 Checking specific modules..."
if [ -d "node_modules/ajv" ]; then
  echo "✅ ajv found"
  ls -la node_modules/ajv/dist/ | head -5
else
  echo "❌ ajv missing"
fi

if [ -d "node_modules/ajv-keywords" ]; then
  echo "✅ ajv-keywords found"
else
  echo "❌ ajv-keywords missing"
fi

if [ -d "node_modules/typescript" ]; then
  echo "✅ typescript found"
else
  echo "❌ typescript missing"
fi

if [ -d "node_modules/tailwindcss" ]; then
  echo "✅ tailwindcss found"
else
  echo "❌ tailwindcss missing"
fi

if [ -d "node_modules/@tailwindcss/forms" ]; then
  echo "✅ @tailwindcss/forms found"
else
  echo "❌ @tailwindcss/forms missing"
fi

# Test TypeScript compilation
echo "🧪 Testing TypeScript..."
npx tsc --version || echo "TypeScript not accessible"

# Test React Scripts
echo "🧪 Testing React Scripts..."
npx react-scripts --version || echo "React Scripts not accessible"

# Test Tailwind CSS
echo "🧪 Testing Tailwind CSS..."
npx tailwindcss --version || echo "Tailwind CSS not accessible"

# Try the build
echo "🏗️ Attempting build..."
echo "Using command: GENERATE_SOURCEMAP=false npm run build"

if GENERATE_SOURCEMAP=false npm run build; then
  echo "✅ Build successful!"
  echo ""
  echo "📦 Build output:"
  ls -la build/
  echo ""
  echo "📊 Build size:"
  du -sh build/
  echo ""
  echo "🎉 Local build test PASSED!"
  echo "You can now safely push to GitHub Actions."
else
  echo "❌ Build failed!"
  echo ""
  echo "🔍 Debugging information:"
  echo "Node modules size: $(du -sh node_modules/)"
  echo "Package lock exists: $([ -f package-lock.json ] && echo 'Yes' || echo 'No')"
  echo ""
  echo "📋 Tailwind config check:"
  if [ -f "tailwind.config.js" ]; then
    echo "✅ tailwind.config.js exists"
    head -10 tailwind.config.js
  else
    echo "❌ tailwind.config.js missing"
  fi
  echo ""
  echo "📋 PostCSS config check:"
  if [ -f "postcss.config.js" ]; then
    echo "✅ postcss.config.js exists"
  else
    echo "❌ postcss.config.js missing"
  fi
  echo ""
  echo "🔧 Suggested fixes:"
  echo "1. Check the error message above"
  echo "2. Try: npm install --force"
  echo "3. Try: rm -rf node_modules package-lock.json && npm install"
  echo "4. Check for version conflicts in package.json"
  echo "5. Verify Tailwind CSS configuration"
  echo ""
  exit 1
fi
