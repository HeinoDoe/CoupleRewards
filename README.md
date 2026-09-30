# 🐾 Dutzis Bank

A small private points bank for two people. Earn Dutzis for studying, workouts,
reading and chores; spend them on each other. Everything is saved in the browser,
and — once you connect a free Firebase project — shared live between both phones.

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

## Share everything between two phones (Firebase)

Sync uses a free Firebase project. Setup from this folder:

```bash
npx firebase-tools login
npx firebase-tools projects:create <project-id>
npx firebase-tools firestore:databases:create "(default)" --location europe-west3 --project <project-id>
npx firebase-tools deploy --only firestore:rules --project <project-id>
npx firebase-tools apps:create WEB "Dutzis Bank" --project <project-id>
npx firebase-tools apps:sdkconfig WEB <app-id> --project <project-id>
```

Copy the printed config into [`js/firebase-config.js`](js/firebase-config.js), commit and push.

On first open each phone asks for a **shared password**. Type the same one on both
phones (capitals and extra spaces don't matter) and they use the same bank. Anything
already saved on a phone can be merged in once. The bottom bar shows the sync state and
app version, so you can check both phones say *Synced with both phones · v3*.
Without a config the app stays local-only and the bar says so.

## Dog training

The **🐕 Training** tab plans one inside and one outside session (5+ min each) every day
except the rest day. Training days alternate between you two, so with Sunday off one of
you always has Mon/Wed/Fri and the other Tue/Thu/Sat. Change the rest day, who has Monday
and the minimum minutes under **⚙️ Plan**. Swap a single day with *⇄ Swap turn*.

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

Phones pick up a new version the next time the app is opened online. The
offline cache in `sw.js` is only used when there's no connection.

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
