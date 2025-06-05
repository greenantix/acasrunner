@echo off
title ACAS Runner - Quick Fix & Restart
echo ==========================================
echo  Fixing Next.js Config & Restarting
echo ==========================================
echo.

echo Fixed next.config.ts file - removing circular reference
echo.

echo Running security audit fix...
call npm audit fix

echo.
echo Clearing Next.js cache...
rmdir /s /q .next 2>nul

echo.
echo Starting development server...
echo Application will be available at: http://localhost:9002
echo.
call npm run dev

echo.
echo Press any key to exit...
pause >nul