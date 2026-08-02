#!/usr/bin/env node
// 零依賴靜態網站產生器。
//   node scripts/build.mjs
//
// 輸入： content/posts/*.md  （frontmatter + Markdown）
//        public/*            （原樣複製的靜態檔）
//        site.config.json
// 輸出： dist/index.html
//        dist/posts/<slug>/index.html
//        dist/sitemap.xml, dist/rss.xml, dist/robots.txt
//
// 設計重點（對應需求）：
//   * 首頁文章卡片在建置階段就寫進 HTML，不靠前端 JS 讀 JSON —— 爬蟲拿到的原始碼即完整內容。
//   * 每篇文章各自一個網址 /posts/<slug>/。
//   * 以內容雜湊追蹤「最後更新」日期，內容一改，下次建置就換成當天日期。
//   * 卡片依最後更新時間新到舊排序。

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const POSTS_DIR = path.join(ROOT, 'content', 'posts')
const PUBLIC_DIR = path.join(ROOT, 'public')
const DIST_DIR = path.join(ROOT, 'dist')
const STATE_FILE = path.join(ROOT, 'content', 'post-state.json')

const config = readJSON(path.join(ROOT, 'site.config.json'))
const TODAY = todayISO()

// GitHub Pages 的專案站台掛在 /<repo>/ 底下，根目錄絕對路徑會指錯地方。
// Cloudflare Pages 則直接掛在網域根目錄。用環境變數切換，同一份原始碼兩邊都能用。
//   Cloudflare：node scripts/build.mjs
//   GitHub    ：BASE_PATH=/aging-medicine-blog node scripts/build.mjs
const BASE = (process.env.BASE_PATH || config.basePath || '').replace(/\/+$/, '')

/** 把站內絕對路徑補上 base path。外部網址原樣放行。 */
function u(p) {
  if (!p || /^(https?:)?\/\//.test(p) || p.startsWith('#') || p.startsWith('mailto:')) return p
  return BASE + p
}

// ---------------------------------------------------------------- 小工具

function readJSON(file, fallback = null) {
  try {
    // Windows 上的編輯器常在 UTF-8 檔頭加 BOM，JSON.parse 會直接拋錯，先剝掉。
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''))
  } catch (err) {
    if (fallback !== null && err.code === 'ENOENT') return fallback
    throw err
  }
}

function todayISO() {
  // 以本地時區的日期為準，避免 UTC 讓「今天」提早或延後一天。
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function hashOf(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16)
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dst = path.join(to, entry.name)
    if (entry.isDirectory()) copyDir(src, dst)
    else fs.copyFileSync(src, dst)
  }
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content, 'utf8')
}

// ------------------------------------------------------- frontmatter 解析

// 支援 `key: value`、`key: "value"`、`key: [a, b, c]` 這幾種寫法就夠用了。
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return { data: {}, body: raw }

  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const key = line.slice(0, sep).trim()
    let value = line.slice(sep + 1).trim()

    if (/^\[.*\]$/.test(value)) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    } else {
      value = value.replace(/^["']|["']$/g, '')
    }
    data[key] = value
  }
  return { data, body: raw.slice(match[0].length) }
}

// ---------------------------------------------------------- Markdown 轉換

// 只實作部落格用得到的語法：標題、段落、清單、引言、程式碼、表格、分隔線、
// 粗體、斜體、行內程式碼、連結、圖片。
function renderInline(text) {
  const codeSpans = []
  // 先把行內程式碼抽走，避免裡面的 * 或 _ 被當成強調語法。
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code)
    return `\u0000CODE${codeSpans.length - 1}\u0000`
  })

  out = esc(out)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy">`)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href)
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${href}"${attrs}>${label}</a>`
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')

  return out.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => `<code>${esc(codeSpans[Number(i)])}</code>`)
}

function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let i = 0

  const flushList = (ordered, items) => {
    const tag = ordered ? 'ol' : 'ul'
    html.push(`<${tag}>${items.map((it) => `<li>${renderInline(it)}</li>`).join('')}</${tag}>`)
  }

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { i++; continue }

    // 圍籬程式碼區塊
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim()
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++
      const cls = lang ? ` class="language-${esc(lang)}"` : ''
      html.push(`<pre><code${cls}>${esc(buf.join('\n'))}</code></pre>`)
      continue
    }

    // 分隔線
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { html.push('<hr>'); i++; continue }

    // 標題（文章正文從 h2 起跳，h1 留給文章標題）
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6)
      const text = heading[2].trim()
      const id = slugifyHeading(text)
      html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`)
      i++
      continue
    }

    // 表格：以 | 開頭，第二行是分隔列
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(line)
      i += 2
      const body = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(cells(lines[i++]))
      html.push(
        '<div class="table-scroll"><table><thead><tr>' +
          head.map((c) => `<th>${renderInline(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          body.map((row) => `<tr>${row.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`).join('') +
          '</tbody></table></div>'
      )
      continue
    }

    // 引言
    if (/^\s*>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''))
      html.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`)
      continue
    }

    // 無序清單
    if (/^\s*[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''))
      flushList(false, items)
      continue
    }

    // 有序清單
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''))
      flushList(true, items)
      continue
    }

    // 段落：連續非空行合併成一段
    const buf = []
    while (i < lines.length && lines[i].trim() && !/^(```|\s*[-*]\s+|\s*\d+\.\s+|#{1,6}\s|\s*>|\s*\|)/.test(lines[i])) {
      buf.push(lines[i++])
    }
    html.push(`<p>${renderInline(buf.join(' '))}</p>`)
  }

  return html.join('\n')
}

function slugifyHeading(text) {
  return (
    'h-' +
    text
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
  )
}

// ------------------------------------------------------------ 讀取文章

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) return []
  const state = readJSON(STATE_FILE, {})
  const nextState = {}

  const posts = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8')
      const { data, body } = parseFrontmatter(raw)
      const slug = data.slug || file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')

      // 內容雜湊決定「最後更新」日期：內容一變，日期就換成建置當天。
      // 換行先正規化成 LF —— git 在 Windows 上會把檔案簽出成 CRLF，
      // 若把換行字元算進雜湊，同一份內容在不同平台會得到不同結果，
      // 日期就會莫名其妙跳成建置當天。
      const fingerprint = hashOf(
        JSON.stringify({ data: { ...data, updated: undefined }, body: body.replace(/\r\n/g, '\n') })
      )
      const prev = state[slug]
      const published = data.date || prev?.published || TODAY
      const updated = !prev ? published : prev.hash === fingerprint ? prev.updated : TODAY

      nextState[slug] = { hash: fingerprint, published, updated }

      const html = renderMarkdown(body)
      return {
        slug,
        url: `/posts/${slug}/`,
        title: data.title || slug,
        summary: data.summary || '',
        author: data.author || config.author,
        tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
        published,
        updated,
        hero: data.hero || config.hero.src,
        heroAlt: data.heroAlt || config.hero.alt,
        html,
        readingMinutes: Math.max(1, Math.round(body.replace(/\s/g, '').length / 400)),
      }
    })

  // 最後更新新的排前面；同日則以發布日、標題決定，確保每次建置順序一致。
  posts.sort(
    (a, b) =>
      b.updated.localeCompare(a.updated) ||
      b.published.localeCompare(a.published) ||
      a.title.localeCompare(b.title, 'zh-Hant')
  )

  write(STATE_FILE, JSON.stringify(nextState, null, 2) + '\n')
  return posts
}

// -------------------------------------------------------------- 版面樣板

function supabaseBootstrap() {
  const s = config.supabase || {}
  const payload = {
    url: s.url || '',
    anonKey: s.anonKey || '',
    table: s.table || 'page_views',
    incrementFn: s.incrementFn || 'increment_view',
    siteSlug: s.siteSlug || '__site__',
  }
  return `<script id="site-data" type="application/json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`
}

function layout({ title, description, bodyClass, canonical, pageSlug = '', head = '', content }) {
  const siteTitle = config.title
  const fullTitle = title === siteTitle ? siteTitle : `${title}｜${siteTitle}`
  return `<!DOCTYPE html>
<html lang="${config.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(config.author)}">
${canonical && config.siteUrl ? `<link rel="canonical" href="${config.siteUrl}${canonical}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${u(config.hero.src)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(siteTitle)}" href="${u('/rss.xml')}">
<link rel="stylesheet" href="${u('/styles.css')}">
<link rel="icon" href="${u('/favicon.svg')}" type="image/svg+xml">
${head}
${supabaseBootstrap()}
</head>
<body class="${bodyClass}"${pageSlug ? ` data-page-slug="${esc(pageSlug)}"` : ''}>
<a class="skip-link" href="#main">跳到主要內容</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${u('/')}">
      <span class="brand-mark" aria-hidden="true"></span>
      <span class="brand-text">${esc(siteTitle)}</span>
    </a>
    <nav class="site-nav" aria-label="主選單">
      <a href="${u('/')}">首頁</a>
      <a href="${u('/rss.xml')}">RSS</a>
    </nav>
  </div>
</header>
<main id="main">
${content}
</main>
${footer()}
<script src="${u('/counter.js')}" defer></script>
</body>
</html>
`
}

function footer() {
  const c = config.hero.credit
  return `<footer class="site-footer">
  <div class="wrap">
    <section class="credit" aria-labelledby="credit-heading">
      <h2 id="credit-heading">圖片出處與授權</h2>
      <p class="credit-line">
        主視覺圖片
        <a href="${c.sourceUrl}" target="_blank" rel="noopener noreferrer"><cite>${esc(c.title)}</cite></a>
        由 <span class="credit-author">${esc(c.author)}</span> 創作，
        取自 <a href="${c.sourceUrl}" target="_blank" rel="noopener noreferrer">${esc(c.sourceName)}</a>，
        依 <a href="${c.licenseUrl}" target="_blank" rel="noopener noreferrer">${esc(c.license)}</a> 授權使用。
        ${esc(c.modification)}。
      </p>
    </section>
    <section class="disclaimer">
      <h2>免責聲明</h2>
      <p>本站內容為研究文獻的科普整理，僅供一般資訊參考，<strong>不構成醫療建議</strong>。任何用藥、補充劑或療程決策，請先諮詢您的主治醫師或合格醫療人員。</p>
    </section>
    <p class="colophon">
      <span>© ${new Date().getFullYear()} ${esc(config.title)}</span>
      <span class="sep" aria-hidden="true">·</span>
      <span>作者 ${esc(config.author)}</span>
      <span class="sep" aria-hidden="true">·</span>
      <span class="site-views" hidden>全站瀏覽 <b data-site-views>—</b></span>
    </p>
  </div>
</footer>`
}

function heroBlock({ src, alt, eyebrow, title, lede, meta = '' }) {
  return `<section class="hero">
  <div class="wrap">
    <div class="hero-media">
      <img src="${u(src)}" alt="${esc(alt)}" width="${config.hero.width}" height="${config.hero.height}" fetchpriority="high" decoding="async">
    </div>
    <div class="hero-copy">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h1>${esc(title)}</h1>
      ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
      ${meta}
    </div>
  </div>
</section>`
}

function postCard(post) {
  return `      <li class="card">
        <article>
          <a class="card-link" href="${u(post.url)}">
            <h3 class="card-title">${esc(post.title)}</h3>
          </a>
          <p class="card-summary">${esc(post.summary)}</p>
          ${post.tags.length ? `<ul class="tags">${post.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
          <footer class="card-meta">
            <span class="byline">${esc(post.author)}</span>
            <span class="sep" aria-hidden="true">·</span>
            <time datetime="${post.published}">發布 ${post.published}</time>
            <span class="sep" aria-hidden="true">·</span>
            <time datetime="${post.updated}">更新 ${post.updated}</time>
            <span class="sep" aria-hidden="true">·</span>
            <span class="views" data-views-for="${esc(post.slug)}">瀏覽 <b>—</b></span>
          </footer>
        </article>
      </li>`
}

function renderIndex(posts) {
  const latestUpdate = posts.length ? posts[0].updated : TODAY
  // 卡片直接寫進 HTML，不經前端 JS 產生。
  const cards = posts.map(postCard).join('\n')

  const content = `${heroBlock({
    src: config.hero.src,
    alt: config.hero.alt,
    eyebrow: '老化醫學 · geroscience',
    title: config.title,
    lede: config.tagline,
    meta: `<p class="hero-meta"><span>作者 ${esc(config.author)}</span><span class="sep" aria-hidden="true">·</span><span>共 ${posts.length} 篇</span><span class="sep" aria-hidden="true">·</span><time datetime="${latestUpdate}">最後更新 ${latestUpdate}</time></p>`,
  })}

<section class="post-list wrap" aria-labelledby="list-heading">
  <div class="section-head">
    <h2 id="list-heading">最新文章</h2>
    <p class="section-note">依最後更新時間排序，最新的在前。</p>
  </div>
  <ul class="cards">
${cards}
  </ul>
</section>`

  return layout({
    title: config.title,
    description: config.description,
    bodyClass: 'page-home',
    canonical: '/',
    content,
  })
}

function renderPost(post, allPosts) {
  const others = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    author: { '@type': 'Person', name: post.author },
    datePublished: post.published,
    dateModified: post.updated,
    image: post.hero,
  }

  const content = `${heroBlock({
    src: post.hero,
    alt: post.heroAlt,
    eyebrow: post.tags[0] || '研究筆記',
    title: post.title,
    lede: post.summary,
    meta: `<p class="hero-meta">
      <span class="byline">作者 <b>${esc(post.author)}</b></span>
      <span class="sep" aria-hidden="true">·</span>
      <time datetime="${post.published}">發布 ${post.published}</time>
      <span class="sep" aria-hidden="true">·</span>
      <time datetime="${post.updated}">最後更新 ${post.updated}</time>
      <span class="sep" aria-hidden="true">·</span>
      <span>約 ${post.readingMinutes} 分鐘</span>
      <span class="sep" aria-hidden="true">·</span>
      <span class="views" data-views-for="${esc(post.slug)}">瀏覽 <b>—</b></span>
    </p>`,
  })}

<article class="post wrap">
  <div class="prose">
${post.html}
  </div>
</article>

${
  others.length
    ? `<section class="more wrap" aria-labelledby="more-heading">
  <h2 id="more-heading">其他文章</h2>
  <ul class="cards">
${others.map(postCard).join('\n')}
  </ul>
  <p class="back"><a href="${u('/')}">← 回到首頁</a></p>
</section>`
    : `<section class="more wrap"><p class="back"><a href="${u('/')}">← 回到首頁</a></p></section>`
}`

  return layout({
    title: post.title,
    description: post.summary || config.description,
    bodyClass: 'page-post',
    canonical: post.url,
    pageSlug: post.slug,
    head: `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
    content,
  })
}

function renderSitemap(posts) {
  const base = config.siteUrl || ''
  const urls = [{ loc: u('/'), lastmod: posts[0]?.updated || TODAY }, ...posts.map((p) => ({ loc: u(p.url), lastmod: p.updated }))]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`
}

function renderRSS(posts) {
  const base = config.siteUrl || ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(config.title)}</title>
  <link>${base}/</link>
  <description>${esc(config.description)}</description>
  <language>zh-Hant</language>
${posts
  .map(
    (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${base}${u(p.url)}</link>
    <guid isPermaLink="false">${esc(p.slug)}</guid>
    <author>${esc(p.author)}</author>
    <pubDate>${new Date(`${p.published}T00:00:00Z`).toUTCString()}</pubDate>
    <description>${esc(p.summary)}</description>
  </item>`
  )
  .join('\n')}
</channel>
</rss>
`
}

// ------------------------------------------------------------------ 主流程

function build() {
  const posts = readPosts()

  rmrf(DIST_DIR)
  fs.mkdirSync(DIST_DIR, { recursive: true })
  copyDir(PUBLIC_DIR, DIST_DIR)

  write(path.join(DIST_DIR, 'index.html'), renderIndex(posts))
  for (const post of posts) {
    write(path.join(DIST_DIR, 'posts', post.slug, 'index.html'), renderPost(post, posts))
  }
  write(path.join(DIST_DIR, 'sitemap.xml'), renderSitemap(posts))
  write(path.join(DIST_DIR, 'rss.xml'), renderRSS(posts))
  write(
    path.join(DIST_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\n${config.siteUrl ? `Sitemap: ${config.siteUrl}/sitemap.xml\n` : ''}`
  )
  // GitHub Pages 預設會跑 Jekyll，會吃掉底線開頭的檔案，關掉比較保險。
  write(path.join(DIST_DIR, '.nojekyll'), '')

  console.log(`建置完成：${posts.length} 篇文章 → dist/`)
  for (const p of posts) {
    console.log(`  ${p.updated}  ${p.url.padEnd(38)} ${p.title}`)
  }
}

build()
