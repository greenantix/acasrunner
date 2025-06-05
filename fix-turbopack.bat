@echo off
echo Fixing Turbopack cache issues...

echo.
echo Step 1: Stopping any running Next.js processes...
taskkill /f /im node.exe 2>nul

echo.
echo Step 2: Removing .next directory...
if exist .next rmdir /s /q .next

echo.
echo Step 3: Clearing npm cache...
npm cache clean --force

echo.
echo Step 4: Removing node_modules and reinstalling...
if exist node_modules rmdir /s /q node_modules
npm install

echo.
echo Step 5: Starting fresh development server...
npm run dev

echo.
echo Fix complete!
pause
