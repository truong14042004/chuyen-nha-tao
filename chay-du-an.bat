@echo off
chcp 65001 >nul
title Chuyen Nha Tao - Landing page
cd /d "%~dp0"

echo.
echo   CHUYEN NHA TAO - Landing page
echo   Dang khoi dong may chu tai http://localhost:5173
echo   Dong cua so nay de tat trang.
echo.

where node >nul 2>nul
if %errorlevel%==0 (
  call npx -y http-server . -p 5173 -c-1 -o
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:5173
  python -m http.server 5173
  goto :eof
)

echo   Khong tim thay Node.js hoac Python tren may.
echo   Cai Node.js (ban LTS) tai https://nodejs.org roi chay lai file nay.
echo.
pause
