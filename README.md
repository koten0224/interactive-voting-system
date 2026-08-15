# 互動式簡報投票系統 (Interactive Presentation Voting)

這是一個專為簡報場合打造的高質感、即時互動投票系統。利用 Node.js 與 Express 構建，具備「用完即棄」的特性，並透過 `express-session` 確保每人限投一票。

## 🌟 系統特色

1. **極簡亮色視覺設計**：具備現代亮色系 (Light Theme)、純白磨砂玻璃擬物化 (Glassmorphism) 與流暢的微動畫，類似 Apple 官網風格。
2. **專屬雙方對決模式**：針對您的主題量身打造的紅綠雙色大按鈕，點擊即投票，免二次確認。初始選項內容可透過 `.env` 檔案自由設定。
3. **防止重複投票與「重新投票」機制**：
   - 使用後端 Session 綁定與同步鎖 (Sync Set) 雙重防護，徹底防堵寫腳本的高併發 Race Condition。
   - 開放聽眾「重新投票」，系統會聰明地自動扣除舊選項票數、加上新選項票數。
4. **即時動態開票 (自動 Polling)**：投票後自動進入結果畫面，背景每 3 秒自動拉取最新票數，無須重新整理網頁，進度條動態更新。
5. **後台即時動態改題 (Live Poll Platform)**：管理員可於結果頁面直接修改投票的標題與副標題，送出後全場聽眾的手機畫面會在下次輪詢時「無縫切換」成新題目，並利用 `globalVotingRound` 實現 Session Invalidation 機制強制全場重新投票，完全無須重啟伺服器！
6. **企業級架構與 Clean Code**：透過 Express Middleware (`requireAdmin`, `validateVotingRound`) 封裝權限與狀態驗證，並全面採用 Guard Clauses (提早回傳) 與 2 Spaces 業界排版標準。

---

## 🚀 如何啟動服務？

請打開終端機 (Terminal) 並切換至本專案目錄：
```bash
cd /path/to/your/project
```

### 📦 第一步：安裝依賴套件
若您初次下載此專案，請先確認已安裝 Node.js，然後執行以下指令安裝所有必備套件 (`express`, `express-session`, `dotenv`, `ejs`)：
```bash
npm install
```

### ⚙️ 第二步：設定環境變數 (.env)
本專案的「投票選項名稱」與「管理員密碼」都提取到了環境變數中，以方便自由客製化。
請將專案目錄下的 `.env.example` 複製一份並重新命名為 `.env`：
```bash
cp .env.example .env
```
接著，請用編輯器打開 `.env` 檔案，填入您專屬的管理員密碼與紅綠雙方的初始標題內容。

### 推薦做法：一鍵啟動與關閉 (本地端 + Tunnel 公開網址)
這行指令會同時啟動本地伺服器與 Tunnel 隧道服務。腳本支援 `cloudflare` (預設) 與 `pinggy` 兩種模式：

```bash
# 預設：使用 Cloudflare Tunnel (免註冊、無時限、高穩定度)
./start.sh 

# 或者：指定使用 Pinggy Tunnel (有 60 分鐘連線限制)
./start.sh pinggy
```
> **優勢**：推薦使用預設的 Cloudflare Tunnel，它不像 Pinggy 有 60 分鐘強制斷線的限制，連線品質也更穩定。
> **⚠️ 隧道連線注意事項**：Cloudflare 產生網址後，**請務必先自己點擊該網址測試**。如果點進去出現 `502 Bad Gateway` 或無法連線，這屬於免費伺服器偶發的節點配置延遲，請直接按 `Ctrl + C` 關閉，並重新執行 `./start.sh` 產生新網址即可。
> 
> 若要**關閉服務**，只需在終端機按下 `Ctrl + C`，腳本就會自動為您把 Node 伺服器與 Cloudflare 兩者一次乾淨俐落地關閉！

---

## 👑 管理員操作指南

一般使用者進入網頁後無須登入即可直接點擊紅/綠按鈕投票。
若您身為簡報講者或管理員：

1. 點擊畫面**右上角**的「管理員登入」按鈕。
2. 輸入管理員密碼（自行在`.env`內設定）
3. 登入成功後，系統會自動跳過投票畫面，直接進入「即時開票結果」。
4. 畫面最下方會出現紅色的 **「重置所有票數 (Admin)」** 按鈕，點擊即可將目前的紅綠雙方票數歸零。
5. **(New) 動態發起新投票**：您會看到專屬的「修改投票選項」表單，可直接打字修改紅/綠方的標題與副標題。修改後，重置按鈕會動態變成「送出設定並重啟投票」，點擊後全場觀眾畫面即刻更新為新題目！

---

## 🛠 技術堆疊

- **前端**：HTML5, CSS3 (Vanilla), JavaScript (Vanilla, Fetch API)
- **後端**：Node.js, Express.js (使用 EJS 模板與 Middleware 架構)
- **狀態管理**：express-session (Memory Store)
- **代碼風格**：Prettier (2 Spaces), Guard Clauses, Clean Code
