#!/bin/bash

echo "🚀 啟動 Node.js 伺服器..."
node server.js &
NODE_PID=$!

# 等待 Node.js 完全啟動，避免隧道建立時連不到本機 port 3000
sleep 2

echo "🌐 啟動 Cloudflare Tunnel 對外連線..."
# 啟動 Cloudflare Tunnel，跑在背景 (免註冊、無60分鐘限制)
npx -y cloudflared tunnel --url http://127.0.0.1:3000 &
CLOUDFLARED_PID=$!

# 定義清理函數
cleanup() {
    echo -e "\n🛑 正在關閉系統..."
    # 關閉 Node 伺服器
    kill $NODE_PID 2>/dev/null
    # 關閉 Cloudflare Tunnel
    kill $CLOUDFLARED_PID 2>/dev/null
    echo "✅ 所有服務已乾淨關閉！"
    exit
}

# 捕捉 Ctrl+C (SIGINT) 或終止訊號 (SIGTERM)
trap cleanup SIGINT SIGTERM

# 等待所有背景程序。若按下 Ctrl+C 會中斷 wait 並觸發 trap
wait $NODE_PID $CLOUDFLARED_PID
