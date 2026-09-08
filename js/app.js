(() => {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const STAGE = $("#stage");

  // ---------- persistence ----------

  const SAVE_KEY = "wcos-save-v1";
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        solved: state.solved,
        ctfFound: state.ctfFound,
        guestPosts: state.guestPosts
      }));
    } catch (e) { /* private mode / storage disabled — ignore */ }
  }
  const saved = loadSave();

  // ---------- state ----------

  const WIN_IDS = ["home", "videos", "blog", "about", "contact", "guestbook", "terminal", "ctf"];
  const TITLES = { home: "Welcome", videos: "Videos", blog: "Blog", about: "About me", terminal: "Terminal", contact: "Contact", guestbook: "Guestbook", ctf: "ctf.sh" };

  const DEFAULT_POS = {
    home: { x: 168, y: 152, w: 830, h: 470 },
    videos: { x: 190, y: 110, w: 900, h: 640 },
    blog: { x: 210, y: 120, w: 860, h: 610 },
    about: { x: 240, y: 90, w: 800, h: 640 },
    terminal: { x: 300, y: 240, w: 720, h: 420 },
    contact: { x: 380, y: 300, w: 460, h: 360 },
    guestbook: { x: 330, y: 210, w: 520, h: 500 },
    ctf: { x: 300, y: 130, w: 660, h: 620 }
  };

  const state = {
    win: { home: true, videos: false, blog: false, about: false, terminal: false, contact: false, guestbook: false, ctf: false },
    z: { home: 10 },
    pos: JSON.parse(JSON.stringify(DEFAULT_POS)),
    focused: "home",
    zTop: 10,
    videoIx: 0,
    postIx: 0,
    solved: saved.solved || {},
    ctfFound: !!saved.ctfFound,
    guestPosts: saved.guestPosts || [],
    cwd: "",
    term: [
      { text: "WC/OS 2.6.1 — bash 5.2", c: "var(--ink-faint)" },
      { text: "Last login: " + new Date().toDateString() + " on ttys001", c: "var(--ink-faint)" },
      { text: "Type 'help' for commands. 'open blog' launches an app.", c: "var(--ink-faint)" }
    ]
  };

  // clamp a window's stored position into the current viewport, in place
  function clampPos(id) {
    const p = state.pos[id];
    const stageW = STAGE.clientWidth, stageH = STAGE.clientHeight;
    p.x = Math.max(-60, Math.min(stageW - 80, p.x));
    p.y = Math.max(38, Math.min(stageH - 60, p.y));
  }
  WIN_IDS.forEach(clampPos);

  // ---------- window management ----------

  function openWin(id) {
    state.win[id] = true;
    state.focused = id;
    state.zTop += 1;
    state.z[id] = state.zTop;
    syncChrome();
    if (id === "terminal") setTimeout(() => $("#term-input").focus(), 60);
  }
  function closeWin(id) {
    state.win[id] = false;
    syncChrome();
  }
  function focusWin(id) {
    if (state.focused === id) return;
    state.focused = id;
    state.zTop += 1;
    state.z[id] = state.zTop;
    syncChrome();
  }

  function applyWinStyle(id) {
    const winEl = $("#win-" + id);
    const p = state.pos[id];
    winEl.style.left = p.x + "px";
    winEl.style.top = p.y + "px";
    winEl.style.width = p.w + "px";
    winEl.style.height = p.h + "px";
    winEl.style.zIndex = state.z[id] || 10;
  }

  function syncChrome() {
    WIN_IDS.forEach((id) => {
      const winEl = $("#win-" + id);
      winEl.hidden = !state.win[id];
      winEl.classList.toggle("focused", state.focused === id && state.win[id]);
      applyWinStyle(id);
    });
    $("#active-title").textContent = state.win[state.focused] ? TITLES[state.focused] : "WC/OS";
    renderDock();
  }

  function startDrag(id, e) {
    if (e.button !== 0) return;
    focusWin(id);
    const start = { mx: e.clientX, my: e.clientY, x: state.pos[id].x, y: state.pos[id].y };
    const winEl = $("#win-" + id);
    const move = (ev) => {
      const stageW = STAGE.clientWidth, stageH = STAGE.clientHeight;
      const nx = Math.max(-60, Math.min(stageW - 80, start.x + ev.clientX - start.mx));
      const ny = Math.max(38, Math.min(stageH - 60, start.y + ev.clientY - start.my));
      state.pos[id].x = nx;
      state.pos[id].y = ny;
      winEl.style.left = nx + "px";
      winEl.style.top = ny + "px";
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    e.preventDefault();
  }

  // wire up static chrome: drag handles, close buttons, focus-on-mousedown, data-open buttons
  WIN_IDS.forEach((id) => {
    const winEl = $("#win-" + id);
    winEl.addEventListener("mousedown", () => focusWin(id));
  });
  $$("[data-drag]").forEach((h) => h.addEventListener("mousedown", (e) => startDrag(h.dataset.drag, e)));
  $$("[data-close]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); closeWin(b.dataset.close); }));
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) openWin(opener.dataset.open);
  });

  window.addEventListener("resize", () => { WIN_IDS.forEach((id) => { clampPos(id); applyWinStyle(id); }); });

  // ---------- clock ----------

  function tick() {
    const d = new Date();
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
    let h = d.getHours();
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    $("#clock").textContent = `${day} ${mo} ${d.getDate()}  ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ap}`;
  }
  tick();
  setInterval(tick, 20000);

  // ---------- desktop icons ----------

  const DESKTOP_ICONS = [
    { label: "Welcome", glyph: "◉", id: "home" },
    { label: "Videos", glyph: "▶", id: "videos" },
    { label: "Blog", glyph: "✎", id: "blog" },
    { label: "About me", glyph: "☰", id: "about" }
  ];
  (function renderDesktopIcons() {
    const host = $("#desktop-icons");
    DESKTOP_ICONS.forEach((ic) => {
      const b = el("button", "desktop-icon");
      b.innerHTML = `<div class="glyph">${ic.glyph}</div><span class="label">${ic.label}</span>`;
      b.addEventListener("click", () => openWin(ic.id));
      host.appendChild(b);
    });
  })();

  // ---------- dock ----------

  function renderDock() {
    const host = $("#dock");
    host.innerHTML = "";
    const items = WIN_IDS.filter((id) => id !== "ctf" || state.ctfFound);
    const glyphs = { home: "◉", videos: "▶", blog: "✎", about: "☰", contact: "✉", guestbook: "✷", terminal: ">_", ctf: "⚑" };
    items.forEach((id) => {
      const b = el("button", "dock-item" + (state.win[id] ? " open" : "") + (state.focused === id && state.win[id] ? " active" : ""));
      b.innerHTML = `<div class="icon">${glyphs[id]}</div><div class="dot"></div>`;
      b.addEventListener("click", () => openWin(id));
      host.appendChild(b);
    });
  }

  // ---------- widgets ----------

  (function renderWidgetVideo() {
    const v = VIDEOS[0];
    $(".widget-video-title").textContent = v.title;
    $(".thumb .tag").textContent = `youtube embed · ${v.length}`;
  })();

  (function renderWidgetPosts() {
    const host = $("#widget-posts");
    POSTS.slice(0, 3).forEach((p) => {
      const b = el("button", "post-row");
      b.innerHTML = `<div class="title">${escapeHtml(p.title)}</div><div class="meta">${escapeHtml(p.meta)}</div>`;
      b.addEventListener("click", () => openWin("blog"));
      host.appendChild(b);
    });
  })();

  (function renderWidgetShortcuts() {
    const host = $("#widget-shortcuts");
    const items = [
      { label: "Résumé", glyph: "☰", id: "about" },
      { label: "Blog", glyph: "✎", id: "blog" },
      { label: "Videos", glyph: "▶", id: "videos" },
      { label: "Guestbook", glyph: "✷", id: "guestbook" },
      { label: "Terminal", glyph: ">_", id: "terminal" }
    ];
    items.forEach((s) => {
      const b = el("button", "shortcut");
      b.innerHTML = `<span class="glyph">${s.glyph}</span>${s.label}`;
      b.addEventListener("click", () => openWin(s.id));
      host.appendChild(b);
    });
  })();

  // ---------- home ----------

  (function renderHomeTips() {
    const host = $("#home-tips");
    TIPS.forEach((t) => {
      const row = el("div", "tip-row");
      row.innerHTML = `<span class="n">${t.n}</span><div><div class="title">${escapeHtml(t.title)}</div><div class="body">${escapeHtml(t.body)}</div></div>`;
      host.appendChild(row);
    });
  })();

  // ---------- videos ----------

  function renderVideoWindow() {
    const v = VIDEOS[state.videoIx];
    $("#video-title").textContent = v.title;
    $("#video-views").textContent = v.views;
    $("#video-date").textContent = v.date;
    $("#video-length").textContent = v.length;
    $("#video-desc").textContent = v.desc;
    $("#video-count").textContent = `${VIDEOS.length} of 148`;
    const tagHost = $("#video-tags");
    tagHost.innerHTML = "";
    v.tags.forEach((t) => tagHost.appendChild(el("span", "chip", escapeHtml(t))));

    const rowHost = $("#playlist-rows");
    rowHost.innerHTML = "";
    VIDEOS.forEach((vid, i) => {
      const b = el("button", "pl-row" + (i === state.videoIx ? " active" : ""));
      b.innerHTML = `<div class="pl-thumb"><span class="len">${vid.length}</span></div>` +
        `<div class="pl-info"><div class="title">${escapeHtml(vid.title)}</div><div class="views">${escapeHtml(vid.views)}</div></div>`;
      b.addEventListener("click", () => { state.videoIx = i; renderVideoWindow(); });
      rowHost.appendChild(b);
    });
  }
  renderVideoWindow();

  // ---------- blog ----------

  function renderBlogList(filter) {
    const q = (filter || "").trim().toLowerCase();
    const rowHost = $("#blog-rows");
    rowHost.innerHTML = "";
    POSTS.forEach((p, i) => {
      if (q && !p.title.toLowerCase().includes(q)) return;
      const b = el("button", "blog-row" + (i === state.postIx ? " active" : ""));
      b.innerHTML = `<div class="title">${escapeHtml(p.title)}</div><div class="meta">${escapeHtml(p.meta)}</div>`;
      b.addEventListener("click", () => { state.postIx = i; renderBlogWindow(); renderBlogList($("#blog-search").value); });
      rowHost.appendChild(b);
    });
  }
  function renderBlogReader() {
    const p = POSTS[state.postIx];
    $("#post-meta").textContent = p.meta;
    $("#post-title").textContent = p.title;
    const bodyHost = $("#post-body");
    bodyHost.innerHTML = "";
    p.body.forEach((para) => bodyHost.appendChild(el("p", null, escapeHtml(para))));
    $("#post-code").innerHTML = p.code.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  }
  function renderBlogWindow() { renderBlogReader(); }
  renderBlogList("");
  renderBlogReader();
  $("#blog-search").addEventListener("input", (e) => renderBlogList(e.target.value));

  // ---------- about ----------

  (function renderAbout() {
    const roleHost = $("#about-roles");
    ROLES.forEach((r) => {
      const item = el("div", "exp-item");
      item.innerHTML = `<div class="row"><span class="role">${escapeHtml(r.role)}</span><span class="years">${escapeHtml(r.years)}</span></div>` +
        `<div class="org">${escapeHtml(r.org)}</div><p>${escapeHtml(r.body)}</p>`;
      roleHost.appendChild(item);
    });
    const skillHost = $("#about-skills");
    SKILLS.forEach((sk) => skillHost.appendChild(el("span", "skill-chip", escapeHtml(sk))));
    const certHost = $("#about-certs");
    CERTS.forEach((c) => {
      const row = el("div", "cert-row");
      row.innerHTML = `<span>${escapeHtml(c.name)}</span><span class="year">${escapeHtml(c.year)}</span>`;
      certHost.appendChild(row);
    });
  })();

  // ---------- contact ----------

  (function renderContact() {
    const host = $("#contact-links");
    LINKS.forEach((l) => {
      const a = el("a", "link-row");
      a.href = l.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<span class="kind">${escapeHtml(l.kind)}</span><span class="value">${escapeHtml(l.value)}</span><span class="arrow">↗</span>`;
      host.appendChild(a);
    });
  })();

  // ---------- guestbook ----------

  function renderGuestbook() {
    const all = state.guestPosts.concat(GUESTS_SEED);
    $("#guest-count").textContent = `${(1204 + state.guestPosts.length).toLocaleString()} signatures`;
    const host = $("#guest-list");
    host.innerHTML = "";
    all.forEach((g) => {
      const card = el("div", "guest-card");
      card.innerHTML = `<div class="row"><span class="name">${escapeHtml(g.name)}</span><span>${escapeHtml(g.when)}</span></div>` +
        `<div class="text">${escapeHtml(g.text)}</div>`;
      host.appendChild(card);
    });
  }
  renderGuestbook();
  $("#guest-post").addEventListener("click", () => {
    const nameEl = $("#guest-name"), textEl = $("#guest-text");
    const text = textEl.value.trim();
    if (!text) return;
    const name = nameEl.value.trim() || "anonymous";
    state.guestPosts.unshift({ name, when: "just now", text });
    nameEl.value = "";
    textEl.value = "";
    persist();
    renderGuestbook();
  });

  // ---------- CTF ----------

  function renderCtf() {
    const solvedCount = FLAGS.filter((f) => state.solved[f.flag]).length;
    $("#ctf-score").textContent = `${solvedCount} / 5`;
    const host = $("#ctf-rows");
    host.innerHTML = "";
    FLAGS.forEach((f) => {
      const done = !!state.solved[f.flag];
      const row = el("div", "ctf-row" + (done ? " done" : ""));
      row.innerHTML = `<span class="tick">${done ? "✓" : "○"}</span>` +
        `<div class="body"><div class="name">${escapeHtml(done ? f.flag : f.name)}</div><div class="hint">${escapeHtml(f.hint)}</div></div>` +
        `<span class="pts">${f.pts}</span>`;
      host.appendChild(row);
    });
  }
  function submitFlag() {
    const input = $("#ctf-input");
    const v = input.value.trim();
    const msgEl = $("#ctf-msg");
    const hit = FLAGS.find((f) => f.flag.toLowerCase() === v.toLowerCase());
    if (!hit) {
      msgEl.textContent = v ? "nope — that is not one of them" : "enter a flag first";
      msgEl.className = "ctf-msg err";
      return;
    }
    if (state.solved[hit.flag]) {
      msgEl.textContent = "already captured: " + hit.name;
      msgEl.className = "ctf-msg err";
      input.value = "";
      return;
    }
    state.solved[hit.flag] = true;
    input.value = "";
    persist();
    const n = FLAGS.filter((f) => state.solved[f.flag]).length;
    msgEl.textContent = n === 5 ? "all five captured — nicely done, now go get in touch" : `flag accepted — ${hit.name} (${n}/5)`;
    msgEl.className = "ctf-msg ok";
    renderCtf();
  }
  renderCtf();
  $("#ctf-submit").addEventListener("click", submitFlag);
  $("#ctf-input").addEventListener("keydown", (e) => { if (e.key === "Enter") submitFlag(); });

  // ---------- terminal ----------

  const termLinesHost = $("#term-lines");
  const termInput = $("#term-input");
  const termBody = $("#terminal-body");

  function pushTermLine(text, color) {
    const line = el("div", "term-line", "");
    line.textContent = text;
    line.style.color = color || "var(--ink-dim)";
    termLinesHost.appendChild(line);
  }
  function pushPrompt(cmd) {
    const line = el("div", "term-line", "");
    line.textContent = `william@wcos:~${state.cwd}$ ${cmd}`;
    line.style.color = "var(--ink)";
    termLinesHost.appendChild(line);
  }
  function renderCwd() { $("#term-cwd").textContent = "~" + state.cwd; }

  // initial boot lines
  state.term.forEach((l) => {
    const line = el("div", "term-line", "");
    line.textContent = l.text;
    line.style.color = l.c;
    termLinesHost.appendChild(line);
  });
  renderCwd();

  function scrollTermToBottom() { termBody.scrollTop = termBody.scrollHeight; }

  function runCmd(raw) {
    const cmd = raw.trim();
    if (!cmd) { termInput.value = ""; return; }
    pushPrompt(cmd);
    const [name, ...args] = cmd.split(/\s+/);
    const RED = "var(--red)", DIM = "var(--ink-faint)", AMBER = "var(--amber)", CYAN = "var(--cyan)", VIOLET = "var(--violet)";

    switch (name) {
      case "help":
        pushTermLine("available commands", DIM);
        pushTermLine("  ls · cd <dir> · cat <file> · open <app> · whoami · neofetch · clear · exit");
        pushTermLine("  apps: home about videos blog contact guestbook", DIM);
        break;
      case "ls":
        pushTermLine((FILES[state.cwd] || []).join("   "));
        break;
      case "cd": {
        const t = (args[0] || "").replace(/\/$/, "");
        if (!t || t === "~" || t === "..") state.cwd = "";
        else if (FILES["/" + t]) state.cwd = "/" + t;
        else pushTermLine(`cd: no such directory: ${t}`, RED);
        renderCwd();
        break;
      }
      case "cat":
        if (args[0] === "about.txt") {
          pushTermLine("William Carr — Cyber Security.");
          pushTermLine("I make content so anyone can learn to use technology.");
          pushTermLine("Windows · Linux · Networking · Security education.");
        } else if (args[0] === "contact.txt") {
          pushTermLine("youtube.com/@bitnye");
          pushTermLine("hello@bitnye.dev");
        } else if (args[0] === "ctf.sh") {
          pushTermLine("#!/bin/bash", DIM);
          pushTermLine("# flag console — run it, do not read it", DIM);
          pushTermLine("exec wcos-open ctf");
        } else if (args[0] === "flags.md.gpg") {
          pushTermLine("gpg: decryption failed: no secret key", RED);
        } else if (args[0] === "resume.pdf") {
          pushTermLine("binary file — opening About me…", DIM);
          openWin("about");
        } else {
          pushTermLine(`cat: ${args[0] || ""}: no such file`, RED);
        }
        break;
      case "open":
        if (Object.prototype.hasOwnProperty.call(state.win, args[0])) {
          pushTermLine(`launching ${args[0]}…`, DIM);
          openWin(args[0]);
        } else {
          pushTermLine(`open: unknown app: ${args[0] || ""}`, RED);
        }
        break;
      case "./ctf.sh":
      case "ctf.sh":
      case "ctf":
        if (state.cwd !== "/top-secret") { pushTermLine("bash: ./ctf.sh: no such file or directory", RED); break; }
        pushTermLine("starting flag submission console…", DIM);
        state.ctfFound = true;
        persist();
        openWin("ctf");
        break;
      case "sh":
      case "bash":
        if ((args[0] || "").replace("./", "") === "ctf.sh" && state.cwd === "/top-secret") {
          pushTermLine("starting flag submission console…", DIM);
          state.ctfFound = true;
          persist();
          openWin("ctf");
        } else {
          pushTermLine("sh: " + (args[0] || "") + ": not found", RED);
        }
        break;
      case "whoami":
        pushTermLine("william — educator, defender, occasional breaker of home labs");
        break;
      case "neofetch":
        pushTermLine("        WC/OS 2.6.1", CYAN);
        pushTermLine("  ▄▄▄   host      bitnye.dev");
        pushTermLine(" █████  shell     bash 5.2");
        pushTermLine("  ▀▀▀   flags     5 hidden · 1 console");
        pushTermLine("        videos    " + VIDEOS.length + " published");
        pushTermLine("        motto     learn it properly, then teach it", VIOLET);
        break;
      case "sudo":
        pushTermLine("william is not in the sudoers file. This incident has been logged:", AMBER);
        pushTermLine("  sudo: authentication failure ref=CTF{sud0_w4s_l0gg3d}", AMBER);
        break;
      case "clear":
        state.term = [];
        termLinesHost.innerHTML = "";
        termInput.value = "";
        return;
      case "exit":
        closeWin("terminal");
        termInput.value = "";
        return;
      default:
        pushTermLine(`command not found: ${name} — try 'help'`, RED);
    }
    termInput.value = "";
    scrollTermToBottom();
  }

  termInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runCmd(termInput.value); });
  termBody.addEventListener("click", () => termInput.focus());

  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA";
    if (e.key === "`" && !typing) { e.preventDefault(); openWin("terminal"); }
  });

  // ---------- boot ----------

  syncChrome();
})();
