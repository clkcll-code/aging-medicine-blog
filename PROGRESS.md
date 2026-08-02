# 進度紀錄

> 這份檔案是給「如果中途當機、換電腦、或隔幾天回來接手」用的。
> 有進展就更新它，並跟著 commit 進 git，記錄就不會消失。

最後更新：2026-08-02

---

## 一句話現況

網站本體全部做完並已上線 GitHub Pages；**剩下兩件事需要你本人在 Cloudflare 與 Supabase 的後台操作**，因為那要用你的帳號登入。

---

## 已完成 ✅

| # | 需求 | 狀態 | 證據 |
| --- | --- | --- | --- |
| 1 | 老化醫學／粒線體主題部落格，手機版不破框 | 完成 | 375px 實測：首頁與文章頁 `scrollWidth == 375`，無橫向溢出；表格包在 `.table-scroll` 內自行捲動 |
| 2 | 每篇文章獨立網址 | 完成 | `/posts/<slug>/index.html`，同子網域 |
| 3 | HERO 圖 + CC BY 出處標在 footer | 完成 | Wikimedia《Cellular senescence》/ Velichko Artem / CC BY 4.0，標示在每頁 `.site-footer` |
| 4 | 文章標作者；HERO 圖等比縮放不超過內文寬 | 完成 | `作者 ALEX`；圖 1600×1064 於手機渲染為 335×223（比例 1.504 → 1.502），上限 `--content-width: 44rem` |
| 5 | 文章與首頁卡片都有日期，更新自動換日期 | 完成 | `content/post-state.json` 存內容雜湊，`scripts/build.mjs` 比對後改「最後更新」 |
| 6 | 首頁列表寫死在 HTML，不用 JS 讀 JSON | 完成 | `dist/index.html` 內含完整 `<article>` 卡片；JS 只負責填瀏覽數字 |
| 7 | 新增／修改文章後首頁自動加卡片、重排序 | 完成 | `npm run build` 依「最後更新」由新到舊排序 |
| 8 | Supabase 計數器（每篇獨立 + 首頁站點計數） | **程式碼完成，金鑰未填** | `public/counter.js` 已寫好；`site.config.json` 的 `supabase.url` / `anonKey` 目前是空字串，未設定時計數器自動隱藏 |
| 9 | GitHub Pages → 自動部署 Cloudflare Pages | **一半** | GitHub Pages 已上線；Cloudflare 專案尚未建立 |

**GitHub Pages 網址（已上線）**：<https://clkcll-code.github.io/aging-medicine-blog/>

GitHub 儲存庫：<https://github.com/clkcll-code/aging-medicine-blog>（帳號 `clkcll-code`，`gh` CLI 已登入）

---

## 待辦 ⬜

### A. 建立 Cloudflare Pages 專案（需要你操作）

已選定做法：**Cloudflare 直接連 GitHub**（不用在 repo 放任何金鑰）。

1. 登入 <https://dash.cloudflare.com> → 左側 **Workers & Pages** → **Create** → **Pages** 分頁 → **Connect to Git**
2. 授權 GitHub，選儲存庫 `clkcll-code/aging-medicine-blog`
3. 設定頁面填：
   - Project name：`aging-medicine-blog`　←　網址會變成 `aging-medicine-blog.pages.dev`，名字打錯網址就會不一樣
   - Production branch：`main`
   - Framework preset：**None**
   - Build command：`node scripts/build.mjs`
   - Build output directory：`dist`
   - 環境變數：**不要設 `BASE_PATH`**（Cloudflare 掛在網域根目錄，設了反而會 404）
4. **Save and Deploy**

之後每次 `git push` 到 `main`，Cloudflare 會自己重新建置，不需要再進後台。

> 為什麼 GitHub Pages 要 `BASE_PATH` 而 Cloudflare 不用：
> GitHub Pages 的專案站台掛在 `/aging-medicine-blog/` 底下，Cloudflare 掛在網域根目錄 `/`。
> `scripts/build.mjs` 讀環境變數 `BASE_PATH` 來處理這個差異，見 `.github/workflows/pages.yml`。

### B. 設定 Supabase 計數器（需要你操作）

1. 到 <https://supabase.com> 建免費專案（地區選 Singapore 或 Tokyo）
2. 左側 **SQL Editor** → 貼上 `README.md`「設定瀏覽計數器」那一節的 SQL → Run
3. **Project Settings → API**，複製 **Project URL** 與 **anon public** key
4. 把這兩個值給我，我填進 `site.config.json` 並重新建置推送

> 只給 `anon public` key，那把鑰匙本來就設計成公開給前端用，真正的防線是 SQL 裡的 RLS 政策。
> **絕對不要**給 `service_role` key。

### C. 驗證並交付網址

Cloudflare 專案建好後，我會確認 `https://aging-medicine-blog.pages.dev` 樣式與圖片不 404、手機版不破框、計數器有數字，再把最終網址交給你。

---

## 本機環境備忘

- Node：v24.15.0（`.node-version` 釘 22，Cloudflare 與 GitHub Actions 都吃這個檔）
- 專案零 npm 依賴，`node scripts/build.mjs` 就能建置，不需要 `npm install`
- `wrangler` **沒有**裝在這台機器上（`npm ls -g` 是空的），選 Git 整合就用不到它
- 本機預覽：`npm run dev` → <http://localhost:4173>
- `dist/` 在 `.gitignore` 裡，由 CI 產生，不進版控
- `content/post-state.json` **要 commit**，否則日期會在不同機器上跑掉
