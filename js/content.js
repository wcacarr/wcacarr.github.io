// Loads editable content from content/ — blog posts (Markdown + front
// matter), videos.yaml and about.yaml — and turns them into the plain data
// objects app.js renders. This is the only file that knows about the
// content/ file formats; app.js just consumes { posts, videos, about }.

(() => {
  "use strict";

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  function parseFrontMatter(raw) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { data: {}, body: raw };
    let data = {};
    try { data = window.jsyaml.load(m[1]) || {}; } catch (e) { console.error("front matter parse error:", e); }
    return { data, body: m[2] };
  }

  // YAML auto-parses bare YYYY-MM-DD scalars into Date objects, so `date`
  // may arrive as either a Date or a plain string depending on the source.
  function toDate(value) {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === "string" && value) {
      const d = new Date(value + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  function isoDate(value) {
    const d = toDate(value);
    return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
  }
  function formatPostMeta(dateValue, readTime) {
    const d = toDate(dateValue);
    const datePart = d ? `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "";
    const readPart = readTime ? String(readTime).toUpperCase() : "";
    return [datePart, readPart].filter(Boolean).join(" · ");
  }

  function extractYouTubeId(url) {
    if (!url) return null;
    const s = String(url).trim();
    if (!s) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  async function fetchText(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`could not load ${path} (${res.status})`);
    return res.text();
  }

  async function loadPosts() {
    const manifest = JSON.parse(await fetchText("content/blog/manifest.json"));
    const posts = await Promise.all(manifest.map(async (filename) => {
      const raw = await fetchText("content/blog/" + filename);
      const { data, body } = parseFrontMatter(raw);
      return {
        title: data.title || filename,
        date: isoDate(data.date),
        meta: formatPostMeta(data.date, data.read_time),
        html: window.marked.parse(body || "")
      };
    }));
    posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return posts;
  }

  async function loadVideos() {
    const raw = await fetchText("content/videos.yaml");
    const list = window.jsyaml.load(raw) || [];
    return list.map((v) => ({
      title: v.title || "",
      length: v.length || "",
      views: v.views || "",
      date: v.date || "",
      desc: (v.description || "").trim(),
      tags: v.tags || [],
      videoId: extractYouTubeId(v.youtube)
    }));
  }

  async function loadAbout() {
    const raw = await fetchText("content/about.yaml");
    const about = window.jsyaml.load(raw) || {};
    // YAML folded scalars (">") add a trailing newline — trim the free-text fields.
    if (typeof about.bio === "string") about.bio = about.bio.trim();
    if (Array.isArray(about.roles)) {
      about.roles = about.roles.map((r) => ({ ...r, body: typeof r.body === "string" ? r.body.trim() : r.body }));
    }
    return about;
  }

  window.loadContent = async function loadContent() {
    const [posts, videos, about] = await Promise.all([loadPosts(), loadVideos(), loadAbout()]);
    return { posts, videos, about };
  };
})();
