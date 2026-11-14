# Tether

A tiny, always-on-top to-do list for you Mac. Tether lives on your screen as a small orb that shows how many tasks you have left. Click it and it opens into a checklist. Finish a task, and (if you want) it can be logged to a Notion database for you. 

## Description


## Features
- **Floating orb** that stays above every other window, including full-screen apps, and follows you across Spaces
- **Click to expand** into a checklist with add, complete and delete
- **Draggable** by the orb or the panel header, and it will never open off the edge of your screen
- **Task count** on the orb (tasks you haven't finished yet)
- **Panel resizes** to fit your list, and scrolls when the list is long
- **Saved locally**, so your tasks are still there after you quit or restart
- **Menu bar icon** with reset position, open at login, settings and quit.
- **Keyboard shortcuts** to jump straight to adding a task
- **Optional Notion sync** that logs the tasks you complete (off by default)

## Technologies used
- Electron
- HTML
- CSS
- JavaScript
- Zustand
- Local JSON storage
- Notion

## Limitations


## Future plans
- add OAuth to make app accessible to all users to make notion sync integrations simpler

## How to set up Locally
Follow these steps in order. Each step says what you should see when it worked.

### Prerequisites
- A Mac
- Node.js
- Git

### Install
#### 1. Get the code
 
```bash
git clone https://github.com/YOUR-USERNAME/tether.git
cd tether
npm install
```
 
#### 2. Try it without installing (optional)
 
```bash
npm run dev
```
 
This opens Tether in development mode. Quit it from the menu bar icon when you're done.
 
#### 3. Build the app
 
```bash
npm run build
npx electron-builder --mac
```
 
When it finishes, look in the `dist/` folder:
 
- `tether-<version>.dmg` is an installer. Open it and drag Tether into your **Applications** folder.
- `dist/mac-arm64/tether.app` is the app itself, if you'd rather copy it over by hand.
If the build seems to hang at the "signing" step, see [Troubleshooting](#troubleshooting).
 
#### 4. Open it the first time
 
Tether isn't signed with an Apple Developer ID, so macOS may refuse to open it the first time. Right-click **tether** in Applications, choose **Open**, and confirm. If macOS says the app is "damaged", run this once and try again:
 
```bash
xattr -cr /Applications/tether.app
```

### Using Tether
| What | How |
| --- | --- |
| Open or close the list | Click the number on the orb. Click **X** in the panel to collapse it. |
| Move it | Drag the orb, or drag the panel by its header. |
| Add a task | Type in the box and press Enter or **+**. |
| Complete or delete | Use the checkbox or the trash icon on a task. |
| Add a task from anywhere | Press **Cmd+T**. Tether opens and puts the cursor in the add box. |
| Bring Tether to the front | Press **Cmd+Option+T**. |
| Lost the orb off-screen? | Menu bar icon, **Reset Position**. |
| Start Tether when you log in | Menu bar icon, **Open at Login** (only works in the installed app, not in `npm run dev`). |
 
**A note on Cmd+T:** it is registered system-wide while Tether is running, so it takes priority over other apps' own Cmd+T (like "new tab" in a browser). Quit Tether from the menu bar icon to get that shortcut back.

### Notion Sync (Optional)
Tether can log every task you complete to a Notion database, one row per task. It's off until you connect it, and it only ever sends **completed** tasks. Unfinished tasks stay on your Mac.
 
#### 1. Make a database in Notion
 
Create a table database with exactly these three properties. The names and types must match:
 
| Property name | Type |
| --- | --- |
| `Name` | Title (every database has one by default) |
| `Completed` | Checkbox |
| `Date` | Date |
 
#### 2. Get a Notion token
 
Create a Notion API token that is allowed to read and write content. Notion's own guide to creating integrations and tokens is at [developers.notion.com](https://developers.notion.com). If you use an integration (not a personal token), remember to share your database with it, or Notion will say it can't find the database.
 
Treat the token like a password. Don't paste it into files in this project, and never commit it.
 
#### 3. Find the data source ID
 
In Notion, open your database, click the **...** menu, choose **Manage data sources**, and copy the **data source ID**. This is different from the ID in the page's URL.
 
#### 4. Connect in Tether
 
1. Click the menu bar icon, then **Settings…**
2. Paste the token and the data source ID, then press **Connect**.
3. If something is wrong (a bad token, wrong ID, or a missing column), Tether tells you what to fix.
Once connected, a **Sync** button appears at the top of the panel. To turn it off, open Settings and choose **Disconnect**.

### How syncing works
- Tether syncs **when it launches**, **every hour** while it's running, and whenever you press **Sync**.
- Each completed task is sent once. Tether remembers which ones are already in Notion, so pressing Sync twice won't create duplicates.
- The `Date` column is the day you completed the task, in your local time zone.
- If you're offline, nothing is lost. The tasks wait and are sent on the next sync.
- If Notion rejects your token (for example, it expired), Tether shows a message and asks you to reconnect in Settings.
macOS will ask for permission to use "tether Safe Storage" in your Keychain the first time you connect. That's where your token is kept, encrypted. Choose **Always Allow**. Because the app isn't signed, macOS may ask again after you rebuild it.

### Where your data lives
Everything is stored in `~/Library/Application Support/tether/`:
 
- `tasks.json` is your task list
- `notion.json` is your Notion connection, with the token encrypted
- `tasks.corrupt<timestamp>.json` only appears if your task file was ever damaged. Tether saves a copy before starting fresh.
To remove Tether completely, quit it, delete it from Applications, and delete that folder. If you used Notion sync, you can also revoke the token in Notion.

## Project scripts
```bash
npm run dev                      # run in development mode
npm run build                    # compile the app
npx electron-builder --mac       # package it into dist/
```
