# wcacarr.github.io

William Carr's ("@BitNye") portfolio — a browser-desktop OS with windows for
Home, Videos, Blog, About/résumé, Contact, Guestbook, and a hidden terminal + CTF.

Live at https://wcacarr.github.io/

Plain HTML/CSS/JS, no build step or dependencies.

## Run locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080/. (Or just open `index.html` directly.)

## Structure

- `index.html` — page structure / static window chrome
- `css/style.css` — all styling
- `js/data.js` — editable content: videos, blog posts, résumé, guestbook seed, CTF flags
- `js/app.js` — window manager, terminal emulator, CTF + guestbook logic

## Notes

- Desktop only (no mobile layout), per the original design brief.
- Video/blog thumbnails are placeholders — swap in real YouTube embeds by editing
  `js/data.js` and the `.video-player` / `.thumb` markup in `index.html`.
- Guestbook posts and CTF flag progress are saved to the visitor's own
  `localStorage` only — there's no backend, so nothing is shared between visitors.
- The CTF easter egg: open the terminal (press `` ` ``), `ls`, `cd top-secret`,
  then `./ctf.sh`. Five flags (`CTF{...}`) are hidden around the site.
