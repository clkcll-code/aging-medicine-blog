# 主視覺圖片生成提示詞

給每篇文章生成 HERO 圖用。風格統一對齊「老化研究週報總結圖」那張的質感。

## 使用方式

1. 用下面的提示詞產圖（每篇一張）。
2. 輸出規格：**1600 × 1000 px**（8:5），PNG 或 JPG 皆可。
   - 比例可以不同，但六張最好一致，版面才不會忽高忽低。
   - 實際比例跟我說，我會寫進圖片登記表。
3. 檔案放進 `public/assets/`，檔名沿用現有的（例如 `hero-mitochondria-hub.png`）。
4. 告訴我檔名與實際尺寸，我接手處理登記、替代文字、頁尾出處與 SEO。

## 為什麼建議「圖上不要有文字」

- 生成模型的文字經常拼錯或糊掉，而且是中文站配英文標籤。
- 圖上的文字螢幕閱讀器讀不到，也無法被搜尋引擎索引。
- HERO 圖在手機上只有 335px 寬，圖上的小字必糊。

標題與標籤留在 HTML 裡由我處理，圖只負責視覺。若你就是想要海報那種帶文字的完整版面，也可以，跟我說一聲即可。

---

## 共用風格片段

每則提示詞都已內含，這裡列出來方便你微調：

> Scientific editorial illustration for a medical journal feature. Deep navy-to-black gradient background with subtle nebula-like glow. Volumetric lighting, soft bloom, cinematic depth of field. Luminous cyan, teal, amber, magenta and violet accents. Highly detailed, photorealistic biological rendering with subsurface scattering. Clean composition, generous negative space. No text, no labels, no watermarks.

---

## 1. 粒線體不只是發電廠

檔名：`hero-mitochondria-hub`

```
Scientific editorial illustration for a medical journal feature. A single highly detailed
mitochondrion rendered in three quarters view at the center, its outer membrane translucent
and glowing warm amber-orange, revealing densely folded cristae inside with realistic depth
and subsurface scattering. Faint energy particles stream outward from the organelle along
four soft curving light trails toward four smaller glowing elements arranged around it:
a cluster of ATP energy bursts, a chain of metabolic molecules, a circular strand of
mitochondrial DNA escaping into the cytoplasm, and a fragmenting apoptotic cell.
Deep navy-to-black gradient background with subtle nebula-like glow. Volumetric lighting,
soft bloom, cinematic depth of field. Luminous cyan, teal, amber and magenta accents.
Photorealistic biological rendering. Clean composition, generous negative space.
No text, no labels, no watermarks.
```

## 2. 表觀遺傳時鐘

檔名：`hero-epigenetic-clocks`

```
Scientific editorial illustration for a medical journal feature. An elegant translucent
clock face floating at the center, its hour markers formed by glowing methylated CpG
molecular groups rather than numbers, delicate luminous hands. A DNA double helix winds
around and behind the clock, dissolving into individual glowing methyl groups as it
approaches the dial. Faint concentric data rings and scattered luminous datapoints suggest
a statistical model. Deep navy-to-black gradient background with subtle nebula-like glow.
Volumetric lighting, soft bloom, cinematic depth of field. Luminous cyan, violet and pale
gold accents. Photorealistic rendering with fine detail. Clean composition, generous
negative space. No text, no labels, no watermarks.
```

## 3. Senolytics 從小鼠到人體

檔名：`hero-senolytics`

```
Scientific editorial illustration for a medical journal feature. Split composition.
On the left, a dense field of healthy glowing cells with several enlarged, irregular,
magenta-tinged senescent cells among them being dissolved and cleared away by luminous
particles. On the right, the same scene rendered sparse and uncertain, only a handful of
cells present, dimmer and hazier, suggesting limited human data. A soft luminous gap or
chasm separates the two halves. Deep navy-to-black gradient background with subtle
nebula-like glow. Volumetric lighting, soft bloom, cinematic depth of field. Luminous
teal, magenta and cyan accents. Photorealistic biological rendering with subsurface
scattering. Clean composition, generous negative space. No text, no labels, no watermarks.
```

## 4. 老藥新用：三種藥的證據等級

檔名：`hero-repurposed-drugs`

```
Scientific editorial illustration for a medical journal feature. Three luminous
pharmaceutical capsules of different colors — violet, cyan and teal — floating at three
clearly different heights above a glowing ascending platform or staircase of light,
suggesting three tiers of evidence. Each capsule emits fine molecular structures and
faint pathway diagrams into the surrounding space. The lowest capsule sits in shadow,
the highest is brightly lit. Deep navy-to-black gradient background with subtle
nebula-like glow. Volumetric lighting, soft bloom, cinematic depth of field. Luminous
violet, cyan, teal and amber accents. Photorealistic rendering. Clean composition,
generous negative space. No text, no labels, no watermarks.
```

## 5. 老化的十二個標誌

檔名：`hero-hallmarks`

```
Scientific editorial illustration for a medical journal feature. A translucent luminous
human silhouette standing at the center, surrounded by twelve glowing circular icons
arranged in a wide ring, each containing a distinct detailed biological motif: fraying
chromosome ends, a damaged DNA strand, methylation marks, misfolded protein aggregates,
an autophagosome, a nutrient sensing receptor, a damaged mitochondrion, a senescent cell,
depleted stem cells, signaling molecules between cells, inflammatory cytokines, and gut
microbiota. Fine light lines connect the icons to the central figure. Deep navy-to-black
gradient background with subtle nebula-like glow. Volumetric lighting, soft bloom,
cinematic depth of field. Luminous cyan, amber, magenta and violet accents. Photorealistic
biological rendering. Clean composition, generous negative space. No text, no labels,
no watermarks.
```

## 6. 首頁：研究地圖

檔名：`hero-home`

```
Scientific editorial illustration for a medical journal feature. A luminous mitochondrion
rendered in fine detail at the center of a wide constellation-like network, connected by
delicate glowing filaments to five smaller nodes arranged around it, each containing a
distinct biological motif: a senescent cell, a molecular clock, inflammatory cytokines,
pharmaceutical capsules, and metabolic pathway molecules. The whole scene reads as a map
of a research field. Deep navy-to-black gradient background with subtle nebula-like glow
and faint distant particles. Volumetric lighting, soft bloom, cinematic depth of field.
Luminous cyan, teal, amber and violet accents. Photorealistic biological rendering.
Wide cinematic composition, generous negative space. No text, no labels, no watermarks.
```

---

## 授權

你自己生成的圖，使用權在你手上，沒有第三方授權問題。我會在 `site.config.json` 登記為本站原創，頁尾照常標示。

## 在那之前

現有的 SVG 資訊圖先留著當佔位圖，網站功能完全正常。你把新圖給我，我換掉即可，不影響任何其他部分。
