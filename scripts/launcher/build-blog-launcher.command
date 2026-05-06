#!/bin/zsh
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="博客启动器.app"
APP_PATH="$PROJECT_ROOT/$APP_NAME"
TMP_SCPT="/tmp/blog-launcher.applescript"

if ! command -v osacompile >/dev/null 2>&1; then
  echo "未检测到 osacompile。请先安装 Xcode Command Line Tools（xcode-select --install）并重试。"
  read '?按回车关闭'
  exit 1
fi

cat <<EOF2 > "$TMP_SCPT"
on run
  tell application "Terminal"
    activate
    set launchCommand to "cd " & quoted form of "$PROJECT_ROOT" & " && /bin/zsh ./start-blog.command"
    if (count of windows) is 0 then
      do script launchCommand
    else
      do script launchCommand in front window
    end if
  end tell
end run
EOF2

rm -rf "$APP_PATH"
osacompile -o "$APP_PATH" "$TMP_SCPT"
rm -f "$TMP_SCPT"

echo "已生成：$APP_PATH"
echo "双击打开即可启动；关闭终端窗口后服务会自动停止。"
