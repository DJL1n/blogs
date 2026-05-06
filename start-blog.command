#!/bin/zsh
set -e

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "未检测到 npm，请先安装 Node.js 后重试。"
  read -r "reply?按回车关闭..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "首次启动，开始安装依赖..."
  npm install
fi

echo "博客启动中：关闭该窗口可自动停止服务"
npm run dev -- --host 127.0.0.1 --port 4321 --open

