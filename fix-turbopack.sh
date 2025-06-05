#!/bin/bash

echo "Fixing Turbopack cache issues..."

echo ""
echo "Step 1: Stopping any running Next.js processes..."
pkill -f "next dev" 2>/dev/null || true

echo ""
echo "Step 2: Removing .next directory..."
rm -rf .next

echo ""
echo "Step 3: Clearing npm cache..."
npm cache clean --force

echo ""
echo "Step 4: Removing node_modules and reinstalling..."
rm -rf node_modules
npm install

echo ""
echo "Step 5: Starting fresh development server..."
npm run dev

echo ""
echo "Fix complete!"
