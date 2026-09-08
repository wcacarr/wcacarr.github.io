#!/usr/bin/env node
// Builds _site/ — the deployable output. Copies the app as-is (index.html,
// css/, js/, content/, assets/) so the interactive WC/OS experience keeps
// working exactly as before, then additionally generates real static HTML
// pages for each blog post (plus a blog index, sitemap and robots.txt) so
// search engines have an actual crawlable page per post instead of one
// JS-rendered app shell.
//
// Zero external dependencies — reuses the same marked/js-yaml UMD builds
// already vendored for the browser at js/vendor/, which work unmodified
// under Node's CommonJS `require`.

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "_site");
const SITE_URL = process.env.SITE_URL || "https://wcacarr.github.io";

const marked = require(path.join(ROOT, "js/vendor/marked.min.js"));
const yaml = require(path.join(ROOT, "js/vendor/js-yaml.min.js"));

// ---------- fs helpers ----------

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function copyDir(src, dest) {
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
function writeFile(dest, content) {
  mkdirp(path.dirname(dest));
  fs.writeFileSync(dest, content);
}

// ---------- content helpers (mirrors js/content.js's parsing rules) ----------

function parseFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  return { data: yaml.load(m[1]) || {}, body: m[2] };
}

function toDate(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" && value) {
    const d = new Date(value + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function formatMeta(dateValue, readTime) {
  const d = toDate(dateValue);
  const datePart = d ? `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "";
  const readPart = readTime ? String(readTime).toUpperCase() : "";
  return [datePart, readPart].filter(Boolean).join(" · ");
}
function isoDate(value) {
  const d = toDate(value);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
}

function slugFor(filename) {
  return filename.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
function excerptFor(data, body) {
  if (data.description) return String(data.description).trim();
  const plain = stripMarkdown(body);
  if (plain.length <= 160) return plain;
  const cut = plain.slice(0, 160);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- load content ----------

function loadAbout() {
  const raw = fs.readFileSync(path.join(ROOT, "content/about.yaml"), "utf8");
  const about = yaml.load(raw) || {};
  if (typeof about.bio === "string") about.bio = about.bio.trim();
  return about;
}

function loadPosts() {
  const manifestPath = path.join(ROOT, "content/blog/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const posts = manifest.map((filename) => {
    const raw = fs.readFileSync(path.join(ROOT, "content/blog", filename), "utf8");
    const { data, body } = parseFrontMatter(raw);
    const slug = slugFor(filename);
    return {
      slug,
      filename,
      title: data.title || filename,
      date: isoDate(data.date),
      meta: formatMeta(data.date, data.read_time),
      excerpt: excerptFor(data, body),
      html: marked.parse(body || "")
    };
  });
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return posts;
}

// ---------- templates ----------

const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">`;

const ARTICLE_STYLE = `
  :root { --cyan: oklch(0.80 0.13 195); --violet: oklch(0.74 0.14 305); --ink: #e9ebee; --ink-dim: #c3c8ce; --ink-mute: #a8aeb7; --ink-faint: #8b9099; --bg: #07080a; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); }
  body { font-family: 'Space Grotesk', Helvetica, sans-serif; color: var(--ink); line-height: 1.6; }
  a { color: var(--cyan); }
  header.site { max-width: 720px; margin: 0 auto; padding: 28px 24px 0; display: flex; align-items: center; gap: 10px; font-size: 13px; }
  header.site .mark { width: 20px; height: 20px; border-radius: 5px; background: linear-gradient(140deg, var(--cyan), var(--violet)); display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; color: var(--bg); flex-shrink: 0; }
  header.site a { color: var(--ink-dim); text-decoration: none; }
  header.site a:hover { color: var(--ink); }
  main { max-width: 720px; margin: 0 auto; padding: 28px 24px 80px; }
  .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.14em; color: var(--ink-faint); }
  h1 { font-size: 34px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; margin: 14px 0 0; }
  article p { font-size: 16px; color: var(--ink-dim); margin: 20px 0 0; }
  article h1, article h2, article h3 { color: var(--ink); margin: 28px 0 0; }
  article ul, article ol { color: var(--ink-dim); font-size: 16px; }
  article strong { color: var(--ink); }
  article pre { margin: 20px 0 0; padding: 16px 18px; border-radius: 11px; background: #0f1216; border: 1px solid rgba(255,255,255,0.09); overflow-x: auto; }
  article pre, article code { font-family: 'JetBrains Mono', monospace; font-size: 13.5px; color: var(--ink-dim); }
  article pre code { background: none; padding: 0; }
  .post-list { list-style: none; margin: 24px 0 0; padding: 0; display: flex; flex-direction: column; gap: 22px; }
  .post-list li { padding-bottom: 22px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .post-list h2 { font-size: 20px; margin: 0; }
  .post-list h2 a { color: var(--ink); text-decoration: none; }
  .post-list h2 a:hover { color: var(--cyan); }
  .post-list .meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-faint); margin-top: 6px; }
  .post-list p { color: var(--ink-mute); margin: 10px 0 0; font-size: 14.5px; }
  footer.site { max-width: 720px; margin: 0 auto; padding: 20px 24px 60px; font-size: 12.5px; color: var(--ink-faint); }
`;

function pageShell({ title, description, canonical, ogType, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${FONT_LINK}
<style>${ARTICLE_STYLE}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

function siteHeader(about) {
  return `<header class="site"><div class="mark">WC</div><a href="${SITE_URL}/">${escapeHtml(about.name || "Home")} — WC/OS</a></header>`;
}

function postPage(post, about) {
  const canonical = `${SITE_URL}/blog/${post.slug}/`;
  const body = `${siteHeader(about)}
<main>
  <span class="eyebrow">${escapeHtml(post.meta)}</span>
  <h1>${escapeHtml(post.title)}</h1>
  <article>${post.html}</article>
</main>
<footer class="site"><a href="${SITE_URL}/blog/">← All posts</a> · <a href="${SITE_URL}/">Open the interactive site ↗</a></footer>`;
  return pageShell({ title: `${post.title} — ${about.name || ""}`, description: post.excerpt, canonical, ogType: "article", bodyHtml: body });
}

function blogIndexPage(posts, about) {
  const canonical = `${SITE_URL}/blog/`;
  const items = posts.map((p) => `  <li>
    <h2><a href="${SITE_URL}/blog/${p.slug}/">${escapeHtml(p.title)}</a></h2>
    <div class="meta">${escapeHtml(p.meta)}</div>
    <p>${escapeHtml(p.excerpt)}</p>
  </li>`).join("\n");
  const body = `${siteHeader(about)}
<main>
  <span class="eyebrow">BLOG</span>
  <h1>Notes on ${escapeHtml(about.field || "security")} &amp; systems</h1>
  <ul class="post-list">
${items}
  </ul>
</main>
<footer class="site"><a href="${SITE_URL}/">Open the interactive site ↗</a></footer>`;
  return pageShell({ title: `Blog — ${about.name || ""}`, description: `Articles by ${about.name || ""}: ${posts.slice(0, 3).map((p) => p.title).join(", ")}.`, canonical, ogType: "website", bodyHtml: body });
}

// ---------- sitemap / robots ----------

function sitemap(posts) {
  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
    { loc: `${SITE_URL}/blog/`, priority: "0.8" },
    ...posts.map((p) => ({ loc: `${SITE_URL}/blog/${p.slug}/`, priority: "0.7", lastmod: p.date || undefined }))
  ];
  const body = urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}    <priority>${u.priority}</priority>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function robotsTxt() {
  return `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

// ---------- build ----------

function build() {
  rmrf(OUT);
  mkdirp(OUT);

  for (const name of ["index.html", "css", "js", "content", "assets", ".nojekyll"]) {
    const src = path.join(ROOT, name);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(OUT, name);
    if (fs.statSync(src).isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }

  const about = loadAbout();
  const posts = loadPosts();

  for (const post of posts) {
    writeFile(path.join(OUT, "blog", post.slug, "index.html"), postPage(post, about));
  }
  writeFile(path.join(OUT, "blog", "index.html"), blogIndexPage(posts, about));
  writeFile(path.join(OUT, "sitemap.xml"), sitemap(posts));
  writeFile(path.join(OUT, "robots.txt"), robotsTxt());

  console.log(`Built ${posts.length} post page(s) into ${OUT}`);
}

build();
