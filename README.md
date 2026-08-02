# 老化醫學前沿

最新老化醫學（geroscience）研究的中文整理。靜態網站，零 npm 依賴，建置只需要 Node 18+。

作者：**ALEX**

---

## 日常操作：新增一篇文章

1. 在 `content/posts/` 新增一個 `.md` 檔，檔名建議 `YYYY-MM-DD-英文短代稱.md`。
2. 檔頭寫 frontmatter：

```markdown
---
title: 文章標題
slug: english-slug          # 網址會是 /posts/english-slug/
date: 2026-08-02            # 發布日期
summary: 一段話的摘要，會顯示在首頁卡片與搜尋結果。
tags: [標籤一, 標籤二]
---

正文從這裡開始，用 Markdown 撰寫。
```

3. 執行建置：

```bash
npm run build
```

4. 推上 GitHub，Cloudflare Pages 會自動部署：

```bash
git add -A && git commit -m "新增文章：文章標題" && git push
```

首頁卡片會自動多一張、排到最前面，`sitemap.xml` 與 `rss.xml` 也會同步更新。**不需要手動改任何 HTML。**

### 修改既有文章

直接改 `.md` 檔再建置即可。建置腳本會比對內容雜湊，發現變動就把該篇的「最後更新」換成當天日期，並重新排序卡片（最新更新的在最前面）。

`content/post-state.json` 記錄每篇的雜湊與日期，**請一併 commit**，否則日期會在不同機器上跑掉。

### 本機預覽

```bash
npm run dev
```

開 <http://localhost:4173>。

### 支援的 Markdown 語法

標題（`##` 起跳，`#` 保留給文章標題）、粗體、斜體、行內程式碼、連結、圖片、無序與有序清單、引言、圍籬程式碼區塊、表格、分隔線。

---

## 專案結構

```
content/posts/*.md      文章原始檔（你主要會動的地方）
content/post-state.json 各篇的內容雜湊與最後更新日期（自動維護，需 commit）
public/                 原樣複製到網站根目錄的靜態檔
  styles.css            全站樣式
  counter.js            Supabase 瀏覽計數器
  assets/               圖片
scripts/build.mjs       靜態網站產生器
scripts/serve.mjs       本機預覽伺服器
site.config.json        站台設定（標題、作者、HERO 圖與授權、Supabase 金鑰）
dist/                   建置輸出（已 gitignore，由 CI 產生）
```

---

## 設定瀏覽計數器（Supabase）

計數器沒設定時會自動隱藏，網站其他功能不受影響。要啟用的話：

### 1. 建立 Supabase 專案

到 <https://supabase.com> 註冊並建立一個新專案（免費方案即可）。地區選離讀者近的，例如 Singapore 或 Tokyo。

### 2. 建表與函式

在專案左側選單進入 **SQL Editor**，貼上並執行以下 SQL：

```sql
-- 計數表
create table if not exists public.page_views (
  slug       text primary key,
  views      bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- 開啟列級安全性：預設一律拒絕
alter table public.page_views enable row level security;

-- 只允許匿名讀取，寫入一律走下面的函式
drop policy if exists "anon can read views" on public.page_views;
create policy "anon can read views"
  on public.page_views for select
  to anon
  using (true);

-- 遞增函式。security definer 讓它繞過 RLS 寫入，
-- 但呼叫端只能透過這個介面 +1，無法任意改寫數字。
create or replace function public.increment_view(page_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v bigint;
begin
  insert into public.page_views (slug, views, updated_at)
  values (page_slug, 1, now())
  on conflict (slug)
    do update set views = page_views.views + 1, updated_at = now()
  returning views into v;
  return v;
end;
$$;

grant execute on function public.increment_view(text) to anon;
```

### 3. 填入金鑰

到 **Project Settings → API**，複製兩個值填進 `site.config.json`：

```json
"supabase": {
  "url": "https://xxxxxxxxxxxx.supabase.co",
  "anonKey": "eyJhbGciOi...",
  "table": "page_views",
  "incrementFn": "increment_view",
  "siteSlug": "__site__"
}
```

> `anon` public key 本來就是設計給前端公開使用的，寫進原始碼沒有安全疑慮 —— 真正的防線是上面那組 RLS 政策。
> **絕對不要**把 `service_role` key 放進來，那把鑰匙可以繞過所有權限檢查。

### 4. 重新建置並推送

```bash
npm run build && git add -A && git commit -m "啟用瀏覽計數器" && git push
```

計數器的行為：

- 每篇文章一個獨立計數，key 就是文章的 slug。
- 首頁自己也有一個站點計數（key 為 `__site__`），顯示在頁尾。
- 首頁卡片會同步顯示各篇文章的次數。
- 同一個瀏覽階段重複整理同一頁只計一次。

---

## 部署

推到 `main` 分支後會同時觸發兩條部署路線：

| 平台 | 觸發方式 | 設定 |
| --- | --- | --- |
| GitHub Pages | `.github/workflows/pages.yml` | 由 Actions 建置後上傳 |
| Cloudflare Pages | Git 整合 | 建置指令 `node scripts/build.mjs`，輸出目錄 `dist` |

---

## 圖片授權

主視覺圖片 *Cellular senescence* 由 **Velichko Artem** 創作，取自 [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cellular_senescence.png)，依 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 授權使用。本站將原圖等比例縮放至寬 1600 px 並轉存為 JPEG。

依 CC BY 4.0 要求，此標示同時出現在網站每一頁的頁尾。

---

## 免責聲明

本站內容為研究文獻的科普整理，僅供一般資訊參考，**不構成醫療建議**。
