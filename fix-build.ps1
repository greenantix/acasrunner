# PowerShell Fix Script for ACAS Build Issues

Write-Host "Fixing ACAS build issues..." -ForegroundColor Cyan

# 1. Clean caches (PowerShell compatible)
Write-Host "Cleaning caches..." -ForegroundColor Yellow
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "tsconfig.tsbuildinfo") { Remove-Item -Force "tsconfig.tsbuildinfo" }

# 2. Install dependencies with legacy peer deps to fix version conflicts
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps

# 3. Try building
Write-Host "Building project..." -ForegroundColor Yellow
npm run build

Write-Host "Build process completed!" -ForegroundColor Green
