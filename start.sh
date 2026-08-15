#!/bin/bash

# 預設選項
TUNNEL_CHOICE="cloudflare"

# 判斷使用者傳入的參數
if [ "$1" == "pinggy" ]; then
    TUNNEL_CHOICE="pinggy"
elif [ "$1" == "cloudflare" ]; then
    TUNNEL_CHOICE="cloudflare"
elif [ -n "$1" ]; then
    echo "⚠️  未知選項: $1。支援的選項為 'cloudflare' 或 'pinggy'。"
    echo "使用預設選項: cloudflare"
fi

echo "🚀 啟動 Node.js 伺服器..."
node server.js &
NODE_PID=$!

# 等待 Node.js 完全啟動，避免隧道建立時連不到本機 port 3000
sleep 2

if [ "$TUNNEL_CHOICE" == "pinggy" ]; then
    echo "🌐 啟動 Pinggy Tunnel 對外連線 (注意: 每次連線有 60 分鐘限制)..."
    ssh -p 443 -R0:localhost:3000 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 a.pinggy.io &
    TUNNEL_PID=$!
else
    echo "🌐 啟動 Cloudflare Tunnel 對外連線 (免註冊、無時限)..."
    npx -y cloudflared tunnel --url http://127.0.0.1:3000 &
    TUNNEL_PID=$!
fi

# 定義清理函數
cleanup() {
    echo -e "\n🛑 正在關閉系統..."
    # 關閉 Node 伺服器
    kill $NODE_PID 2>/dev/null
    # 關閉 Tunnel
    kill $TUNNEL_PID 2>/dev/null
    echo "✅ 所有服務已乾淨關閉！"
    exit
}

# 捕捉 Ctrl+C (SIGINT) 或終止訊號 (SIGTERM)
trap cleanup SIGINT SIGTERM

# 等待所有背景程序。若按下 Ctrl+C 會中斷 wait 並觸發 trap
wait $NODE_PID $TUNNEL_PID
