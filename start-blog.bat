@echo off
chcp 65001 >nul
cd /d "%~dp0"

where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo 未检测到 npm，请先安装 Node.js 并重试。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 首次启动，正在安装依赖...
  npm install
)

echo 博客启动中：关闭此窗口可自动停止服务
npm run dev -- --host 127.0.0.1 --port 4321 --open
