# Schedule Desk

Photokitchen's multi-project timing scheduler, with a live-synced Town Hall calendar.

## What's in this repo

- `index.html` — the dashboard itself (this is what people actually use)
- `data/townhall.json` — the live Town Hall snapshot. Starts seeded with real data; overwritten automatically every sync.
- `sync-trello.js` — pulls the real board and rewrites `data/townhall.json`
- `.github/workflows/sync-trello.yml` — runs the sync on a schedule (every 30 min by default) and commits the result. No manual pushes required once this is set up.

## One-time setup

### 1. Get Trello API credentials
1. Go to https://trello.com/power-ups/admin (or https://trello.com/app-key while logged in as an account with access to the Town Hall board)
2. Copy your **API Key**
3. Generate a **Token** from the same page (grants read access to your boards)

### 2. Add them as repo secrets
In this repo: **Settings → Secrets and variables → Actions → New repository secret**
- `TRELLO_KEY` — the API key from step 1
- `TRELLO_TOKEN` — the token from step 1

That's it — the workflow will start running on its schedule automatically once these exist.

### 3. Turn on GitHub Pages (to actually host the dashboard)
**Settings → Pages → Source: Deploy from a branch → Branch: main, folder: / (root)**

Give it a minute, then your dashboard is live at `https://<your-username>.github.io/<repo-name>/`.

## Adjusting the sync frequency

Edit the `cron` line in `.github/workflows/sync-trello.yml`:
```yaml
- cron: '*/30 * * * *'   # every 30 minutes (default)
- cron: '*/15 * * * *'   # every 15 minutes
- cron: '0 * * * *'      # once an hour
```
GitHub's own minimum practical interval is about 5 minutes, and scheduled runs can lag a few minutes under load — treat the cron as "roughly," not to-the-second.

## Running a sync manually

Go to the **Actions** tab → **Sync Trello Town Hall** → **Run workflow**. Useful right after changing something on the board when you don't want to wait for the next scheduled run.

## If a board list ever changes

The four Shoots lists, Meetings and Team Activities, Leaves and Offset, and Holidays are hardcoded by Trello list ID at the top of `sync-trello.js` (this is intentional — it's a whitelist, so Regie/Lins/Gilbert/Birthdays are never touched no matter what). If a list ever gets renamed, archived, or replaced with a new one, its ID needs to be updated in that file.

## Local testing

```bash
TRELLO_KEY=xxx TRELLO_TOKEN=yyy node sync-trello.js
python3 -m http.server 8000
# open http://localhost:8000
```
