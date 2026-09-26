# 🐾 Dutzis Bank

A small private points bank for two people. Earn Dutzis for studying, workouts,
reading and chores; spend them on each other. Everything is saved **in the
browser of whoever opens it** — there is no server, no account and no database.

## Run it locally

Open `index.html` in a browser. That's it — no build step, no dependencies.

For the service worker and manifest to work you need a local server rather than
`file://`. In VS Code the easiest way is the **Live Server** extension
(right-click `index.html` → *Open with Live Server*), or:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Put it online with GitHub Pages

```bash
git init
git add .
git commit -m "Dutzis Bank"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/dutzis.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
After a minute the site is live at `https://YOUR-NAME.github.io/dutzis/`.

Open that link on your phone and use *Add to Home screen* — because of
`manifest.webmanifest` it installs as a proper app with its own icon and works
offline.

## Make it yours

Everything you'd want to change lives in **`js/data.js`**:

- `SOLO` — activities one person does. `type:'time'` gives 15/30/60 min buttons
  (15 min = 1 Dutzi); `type:'count'` gives one button worth `value`.
- `streak: true` — only these activities keep the daily 🔥 streak alive.
- `DUO` — activities that pay **both** accounts at once.
- `WEEKLY` — end-of-week habit bonuses.
- `SHOP` — `[cost, label]` pairs.
- `NOTES` — the handwritten line on the share card.

Colours and fonts are CSS variables at the top of `css/styles.css`.

> After changing any file, bump `CACHE` in `sw.js` (e.g. `dutzis-v2`) or browsers
> will keep serving the old cached version.

## How it works

- **Two accounts.** Tap a name card to choose who you're logging for.
- **Backdating.** The date field on the Earn tab logs to an earlier day; it turns
  orange so you can't forget.
- **Streaks.** Counted from the entries themselves, so they can't be faked —
  one day of grace before the streak breaks.
- **Card tab.** A designed summary built to be screenshotted and sent.
- **Backup / Restore.** Copies all data as text. Clearing browser data wipes the
  bank, so take a backup now and then.

## Notes

Data never leaves the device. Two people opening the same URL each get their own
separate bank — this is a personal tracker, not a shared one. If you ever want
real sync, the place to add it is `load()` / `save()` in `js/app.js`.

## Licence

MIT — do whatever you like with it.
