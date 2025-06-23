#!/bin/bash

# Fix React Scripts Installation Issues
# This script ensures react-scripts is properly installed

set -e

echo "🔧 Fixing React Scripts Installation"
echo "===================================="

cd client

echo "📋 Current environment:"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo ""

# Step 1: Complete cleanup
echo "🧹 Complete cleanup..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
npm cache clean --force

# Step 2: Check package.json
echo "📋 Checking package.json..."
if [ -f "package.json" ]; then
  echo "✅ package.json exists"
  grep -E "(react-scripts|typescript)" package.json || echo "Key dependencies check"
else
  echo "❌ package.json missing!"
  exit 1
fi

# Step 3: Install with different strategies
echo "📦 Installing dependencies with multiple strategies..."

# Strategy 1: Standard install
echo "🧪 Strategy 1: Standard npm install"
if npm install; then
  echo "✅ Standard install successful"
else
  echo "❌ Standard install failed, trying strategy 2..."
  
  # Strategy 2: Legacy peer deps
  echo "🧪 Strategy 2: npm install with legacy peer deps"
  if npm install --legacy-peer-deps; then
    echo "✅ Legacy peer deps install successful"
  else
    echo "❌ Legacy peer deps failed, trying strategy 3..."
    
    # Strategy 3: Force install
    echo "🧪 Strategy 3: npm install with force"
    if npm install --force; then
      echo "✅ Force install successful"
    else
      echo "❌ All install strategies failed"
      exit 1
    fi
  fi
fi

# Step 4: Verify react-scripts specifically
echo "🔍 Verifying react-scripts installation..."
if [ -d "node_modules/react-scripts" ]; then
  echo "✅ react-scripts directory exists"
  ls -la node_modules/react-scripts/ | head -5
else
  echo "❌ react-scripts directory missing, installing explicitly..."
  npm install react-scripts@5.0.1 --save --legacy-peer-deps
fi

# Step 5: Check binary
echo "🔍 Checking react-scripts binary..."
if [ -f "node_modules/.bin/react-scripts" ]; then
  echo "✅ react-scripts binary exists"
else
  echo "❌ react-scripts binary missing"
  # Try to create symlink if package exists but binary doesn't
  if [ -d "node_modules/react-scripts" ]; then
    echo "🔧 Attempting to fix binary symlink..."
    cd node_modules/.bin
    ln -sf ../react-scripts/bin/react-scripts.js react-scripts
    cd ../..
  fi
fi

# Step 6: Test react-scripts
echo "🧪 Testing react-scripts..."
if npx react-scripts --version; then
  echo "✅ react-scripts is working"
else
  echo "❌ react-scripts not working"
  
  # Additional debugging
  echo "🔍 Additional debugging:"
  echo "Node modules size: $(du -sh node_modules/)"
  echo "React scripts contents:"
  ls -la node_modules/react-scripts/ 2>/dev/null || echo "Directory not accessible"
  echo "Bin directory contents:"
  ls -la node_modules/.bin/ | grep react || echo "No react binaries found"
fi

# Step 7: Test other critical dependencies
echo "🔍 Testing other critical dependencies..."
DEPS=("typescript" "ajv" "tailwindcss" "@tailwindcss/forms")
for dep in "${DEPS[@]}"; do
  if [ -d "node_modules/$dep" ]; then
    echo "✅ $dep found"
  else
    echo "❌ $dep missing"
  fi
done

echo ""
echo "🎯 Summary:"
echo "==========="
if npx react-scripts --version >/dev/null 2>&1; then
  echo "✅ react-scripts is working properly"
  echo "🚀 You can now try building: npm run build"
else
  echo "❌ react-scripts still not working"
  echo "🔧 Manual steps to try:"
  echo "  1. Delete node_modules and package-lock.json"
  echo "  2. Run: npm install react-scripts@5.0.1 --save"
  echo "  3. Run: npm install --legacy-peer-deps"
  echo "  4. Check Node.js version compatibility"
fi
