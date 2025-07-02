@echo off
echo 启动PandaWiki前端应用...

cd web\app\dist\standalone

set NEXT_PUBLIC_API_URL=http://localhost:8001
set NODE_ENV=production
set PORT=3010
set HOSTNAME=0.0.0.0

echo 前端应用将在 http://localhost:3010 启动
echo 后端API地址: %NEXT_PUBLIC_API_URL%

node server.js 