/* ===================================================================
   瀏覽計數器 — Supabase 版
   ------------------------------------------------------------------
   * 每篇文章一個獨立計數（key = 文章 slug）。
   * 首頁自己也有一個站點計數（key = site.config.json 的 supabase.siteSlug）。
   * 首頁卡片會同步顯示各篇文章的次數。
   * 尚未設定 Supabase 時，所有計數欄位直接隱藏，不留半殘的 UI。
   ------------------------------------------------------------------
   只用 fetch，不需要 @supabase/supabase-js，省一包 JS。
   anon key 本來就是設計給前端公開使用的，寫在原始碼裡沒有安全問題 ——
   真正的防線是資料庫的 RLS 政策（見 README 的 SQL）。
   =================================================================== */

(function () {
  'use strict'

  var dataEl = document.getElementById('site-data')
  if (!dataEl) return

  var cfg
  try {
    cfg = JSON.parse(dataEl.textContent)
  } catch (err) {
    return
  }

  var viewEls = document.querySelectorAll('[data-views-for]')
  var siteEls = document.querySelectorAll('.site-views')

  function hideAll() {
    viewEls.forEach(function (el) {
      el.hidden = true
      // 連同前面那個分隔點一起藏掉，才不會留下孤零零的「·」
      var prev = el.previousElementSibling
      if (prev && prev.classList.contains('sep')) prev.hidden = true
    })
    siteEls.forEach(function (el) {
      el.hidden = true
      var prev = el.previousElementSibling
      if (prev && prev.classList.contains('sep')) prev.hidden = true
    })
  }

  if (!cfg.url || !cfg.anonKey) {
    hideAll()
    return
  }

  var base = cfg.url.replace(/\/+$/, '')
  var headers = {
    'apikey': cfg.anonKey,
    'Authorization': 'Bearer ' + cfg.anonKey,
    'Content-Type': 'application/json',
  }

  var isHome = document.body.classList.contains('page-home')
  var pageSlug = isHome ? cfg.siteSlug : document.body.getAttribute('data-page-slug')

  var nf = new Intl.NumberFormat('zh-Hant-TW')

  function paint(counts) {
    viewEls.forEach(function (el) {
      var slug = el.getAttribute('data-views-for')
      var b = el.querySelector('b')
      if (b) b.textContent = nf.format(counts[slug] || 0)
    })
    var siteTotal = counts[cfg.siteSlug]
    if (typeof siteTotal === 'number') {
      siteEls.forEach(function (el) {
        el.hidden = false
        var b = el.querySelector('b')
        if (b) b.textContent = nf.format(siteTotal)
      })
    }
  }

  // 同一個分頁的同一篇文章，一次瀏覽階段只算一次，重新整理不灌水。
  function shouldCount(slug) {
    try {
      var key = 'viewed:' + slug
      if (sessionStorage.getItem(key)) return false
      sessionStorage.setItem(key, '1')
      return true
    } catch (err) {
      return true // 無痕模式等情境拿不到 sessionStorage，就照常計數
    }
  }

  function increment(slug) {
    if (!slug) return Promise.resolve(null)
    if (!shouldCount(slug)) return Promise.resolve(null)
    return fetch(base + '/rest/v1/rpc/' + cfg.incrementFn, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ page_slug: slug }),
    }).catch(function () {
      return null
    })
  }

  function fetchAll() {
    return fetch(base + '/rest/v1/' + cfg.table + '?select=slug,views', {
      headers: headers,
    }).then(function (res) {
      if (!res.ok) throw new Error('讀取計數失敗：' + res.status)
      return res.json()
    })
  }

  increment(pageSlug)
    .then(fetchAll)
    .then(function (rows) {
      var counts = {}
      rows.forEach(function (row) {
        counts[row.slug] = Number(row.views) || 0
      })
      paint(counts)
    })
    .catch(function () {
      // Supabase 掛掉或設定有誤時，不要讓頁面卡著一排破折號。
      hideAll()
    })
})()
