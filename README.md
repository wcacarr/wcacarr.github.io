# wcacarr.github.io

William Carr's ("@BitNye") portfolio — a browser-desktop OS with windows for
Home, Videos, Blog, About/résumé, Contact, Guestbook, and a hidden terminal + CTF.

Live at https://wcacarr.github.io/

Plain HTML/CSS/JS, no build step or dependencies. Content lives in plain text
files under `content/` — edit those to update the site, no code required.

## Run locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080/. (Opening `index.html` directly by
double-clicking it will NOT work — the content files are loaded with `fetch`,
which browsers block on `file://` pages. Always go through a local server, or
just push and look at the live site.)

## Editing content

Everything you'd want to change day-to-day lives under `content/` as plain
Markdown/YAML — no JavaScript editing needed. Edit a file, commit, push; the
live site picks it up within a minute or two (however long GitHub Pages takes
to redeploy).

### Blog posts — `content/blog/`

Each post is one Markdown file with a few fields at the top, then the post
body written as normal Markdown (paragraphs, \*\*bold\*\*, \`code\`, lists,
and \`\`\`fenced code blocks\`\`\` for the terminal-style snippet boxes).

```markdown
---
title: Your post title
date: 2026-09-08
read_time: 4 min
---

Write the post here, like a normal document. Blank line between paragraphs.

​```
$ this becomes a styled code block
​```
```

**To publish a new post:**
1. Add a new `.md` file in `content/blog/` (name doesn't matter, but
   `YYYY-MM-DD-slug.md` keeps the folder readable).
2. Add that filename to `content/blog/manifest.json`.
3. Commit and push.

Posts are sorted newest-first automatically by the `date` field — you don't
need to worry about where in the manifest you add the line.

### Videos — `content/videos.yaml`

One list, newest first, each entry:

```yaml
- title: Your video title
  youtube: "https://www.youtube.com/watch?v=XXXXXXXXXXX"   # or just the video ID; leave "" for a placeholder
  length: "18:42"
  views: "42K views"
  date: "2 weeks ago"
  tags: ["#windows", "#hardening"]
  description: >
    Write the description as a normal paragraph.
```

Paste a real YouTube link/ID into `youtube:` and it embeds for real
(including thumbnails in the playlist); leave it blank (`""`) and that video
shows the placeholder graphic instead. `length` / `views` / `date` are typed
by hand since there's no YouTube API hooked up — update them when you post,
or leave them blank.

### About me / résumé — `content/about.yaml`

Your name, tagline, bio, experience, skills and certifications all live here
in one file — this drives both the Home window and the About window:

```yaml
name: William Carr
tagline: Cyber Security · Windows / Linux / Networking · Educator
bio: >
  Write your bio as a normal paragraph here.
roles:
  - role: Job title
    org: Company
    years: "2023 — now"
    body: What you did there.
skills: [Windows, Linux, Python, ...]
certs:
  - name: Cert name
    year: 2024
```

Add, remove or reorder entries in `roles`, `skills`, `certs` freely.

### Your photo and résumé PDF — `assets/`

Drop your files in `assets/` (e.g. `assets/photo.jpg`, `assets/resume.pdf`),
then point to them in `content/about.yaml`:

```yaml
photo: assets/photo.jpg
resume: assets/resume.pdf
```

Leave either blank and that part of the site keeps its placeholder — the
"photo here" box, or a disabled Download PDF button.

## SEO — real static pages per blog post

The interactive site is one page (everything lives behind JS-rendered
windows), which is bad for search ranking: there's no separate URL per post
for Google to index. `scripts/build-site.js` fixes this — it runs
automatically on every push (see below) and generates a real, plain-HTML
page per post at `/blog/<slug>/`, plus a `/blog/` index, `sitemap.xml` and
`robots.txt`. Those pages have actual `<title>`/description/Open Graph tags
and the post content sitting directly in the HTML — no JavaScript required
to read them. The interactive Blog window links out to each post's static
page ("View this post's own page ↗"), and vice versa.

You never run this script by hand — a GitHub Actions workflow
(`.github/workflows/deploy.yml`) runs it on every push to `main` and
deploys the result. **One-time setup required:** in this repo's Settings →
Pages, change **Source** from "Deploy from a branch" to **"GitHub
Actions"**. Until that's switched, Pages keeps serving the old
branch-deploy version and the workflow's output won't go live (the
workflow will still run — you can watch it under the Actions tab — it just
won't be the thing Pages actually serves).

Add a `description:` field to a post's front matter for a hand-written
meta description; otherwise one is generated automatically from the first
~160 characters of the post.

## Structure

- `index.html` — page structure / static window chrome
- `css/style.css` — all styling
- `content/` — **edit this** — blog posts, videos, About/résumé
- `assets/` — **drop files here** — your headshot and résumé PDF
- `js/data.js` — fixed site mechanics (contact links, guestbook seed, CTF
  flags, terminal filesystem) — edit occasionally, not routine content
- `js/content.js` — loads and parses `content/` into what the page renders
- `js/app.js` — window manager, terminal emulator, CTF + guestbook logic
- `scripts/build-site.js` — generates `_site/` (gitignored): a copy of the
  app plus the static blog pages, sitemap and robots.txt
- `.github/workflows/deploy.yml` — runs the build and deploys to Pages on
  every push to `main`
- `js/vendor/` — small local copies of `marked` (Markdown) and `js-yaml`
  (YAML) — no CDN dependency; also `require`d directly by the build script

## Notes

- Desktop only (no mobile layout), per the original design brief.
- Guestbook posts and CTF flag progress are saved to the visitor's own
  `localStorage` only — there's no backend, so nothing is shared between
  visitors.
- If a content file fails to load (bad YAML, missing manifest entry, or the
  page opened as a local file instead of through a server), the site shows a
  banner near the top explaining that rather than failing silently.
- The CTF easter egg: open the terminal (press `` ` ``), `ls`, `cd top-secret`,
  then `./ctf.sh`. Five flags (`CTF{...}`) are hidden around the site —
  including one in a blog post's code block (`content/blog/`) and one in a
  video description (`content/videos.yaml`). Leave those as-is when editing;
  the résumé print-mark flag lives in `index.html`, not in `content/`.
