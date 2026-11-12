import { app, shell, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFile, writeFile, copyFile } from 'fs/promises'
import icon from '../../resources/icon.png?asset'
import trayIcon from '../../resources/trayTemplate.png?asset'
import { syncCompletedTasks, NOTION_VERSION } from './notionSync'
import { saveNotionConfig, loadNotionConfig, clearNotionConfig } from './notionConfig'

let tray = null
let mainWindow = null

const ORB_SIZE = 50
const PANEL_W = 320
const MIN_PANEL_H = 140
const MAX_PANEL_H = 820

function resetWindowPosition(win) {
  const targetWindow = win ?? mainWindow
  if (!targetWindow) return

  const { width, height } = targetWindow.getBounds()
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const margin = 16
  const x = workArea.x + workArea.width - width - margin
  const y = workArea.y + margin

  targetWindow.setPosition(x, y)
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 50,
    height: 50,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function createTrayImage() {
  const image = nativeImage.createFromPath(trayIcon).resize({ width: 18, height: 18 })
  if (process.platform === 'darwin') {
    image.setTemplateImage(true)
  }
  return image
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  let panelShift = { dx: 0, dy: 0 }

  ipcMain.on('set-expanded', (event, expanded) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const bounds = win.getBounds()
    if (expanded) {
      const { workArea } = screen.getDisplayMatching(bounds)
      let newX = bounds.x
      let newY = bounds.y
      const rightOverflow = newX + PANEL_W - (workArea.x + workArea.width)
      if (rightOverflow > 0) newX -= rightOverflow
      const bottomOverflow = newY + MIN_PANEL_H - (workArea.y + workArea.height)
      if (bottomOverflow > 0) newY -= bottomOverflow
      panelShift = { dx: newX - bounds.x, dy: newY - bounds.y }
      win.setBounds({ x: newX, y: newY, width: PANEL_W, height: MIN_PANEL_H })
    } else {
      win.setBounds({
        x: bounds.x - panelShift.dx,
        y: bounds.y - panelShift.dy,
        width: ORB_SIZE,
        height: ORB_SIZE
      })
      panelShift = { dx: 0, dy: 0 }
    }
  })

  ipcMain.on('set-panel-height', (event, nextHeight) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || typeof nextHeight !== 'number') return
    const bounds = win.getBounds()
    if (bounds.width !== PANEL_W) return
    const { workArea } = screen.getDisplayMatching(bounds)
    const margin = 16
    const maxHeight = Math.min(MAX_PANEL_H, workArea.height - margin * 2)
    const clampedHeight = Math.max(MIN_PANEL_H, Math.min(maxHeight, Math.ceil(nextHeight)))
    if (bounds.height === clampedHeight) return
    let newY = bounds.y
    const bottomOverflow = newY + clampedHeight - (workArea.y + workArea.height)
    if (bottomOverflow > 0) newY -= bottomOverflow
    newY = Math.max(newY, workArea.y)
    panelShift.dy += newY - bounds.y
    win.setBounds({ x: bounds.x, y: newY, width: PANEL_W, height: clampedHeight })
  })

  let draOffset = null;
  ipcMain.on('drag-start', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const cursor = screen.getCursorScreenPoint()
    const [winX, winY] = win.getPosition()
    draOffset = { x: cursor.x - winX, y: cursor.y - winY}
  })
  ipcMain.on('drag-move', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || !draOffset) return
    const cursor = screen.getCursorScreenPoint()
    win.setPosition(cursor.x - draOffset.x, cursor.y - draOffset.y)
  })
  ipcMain.on('drag-end', () => {
    draOffset = null
  })

  const tasksFile = () => join(app.getPath('userData'), 'tasks.json')
  ipcMain.handle('tasks:load', async () => {
    try {
      const data = await readFile(tasksFile(), 'utf-8')
      const parsed = JSON.parse(data)
      if (!Array.isArray(parsed)) {
        throw new Error('Parsed task data is not an array')
      }
      return parsed
    } catch (error) {
      if (error.code === "ENOENT") {
        return []
      }
      try {
        const backupPath = join(app.getPath('userData'), `tasks.corrupt${Date.now()}.json`)
        await copyFile(tasksFile(), backupPath)
        console.error(`Corrupt tasks file backed up to ${backupPath}`)
      } catch (backupError) {
        console.error('Failed to create a backup of the corrupt tasks file: ', backupError)
      }
      return []
    }
  })

  console.log(app.getPath('userData'))

  ipcMain.handle('tasks:save', async (event, tasks) => {
    try {
      const data = JSON.stringify(tasks, null, 2)
      await writeFile(tasksFile(), data, 'utf-8')
      return true
    } catch (error) {
      console.error('Failed to save tasks: ', error)
      throw error
    }
  })

  ipcMain.handle('notion:status', async () => {
    try {
      return { connected: (await loadNotionConfig()) !== null }
    } catch {
      return { connected: false }
    }
  })

  ipcMain.handle('notion:connect', async (event, { token, dataSourceId }) => {
    token = typeof token === 'string' ? token.trim() : ''
    dataSourceId = typeof dataSourceId === 'string' ? dataSourceId.trim() : ''
    if (!token || !dataSourceId) {
      return { ok: false, error: 'Please enter both the token and the data source ID.'}
    }
    let res
    try {
      res = await fetch(
        `https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
        { headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION }}
      )
    } catch {
      return { ok: false, error: "Couldn't reach Notion. Check your internet connection." }
    }
    if (res.status === 401) return { ok: false, error: "Notion rejected that token." }
    if (res.status === 404) return { ok: false, error: "Couldn't find that data source. Check the ID and that your token can access it." }
    if (!res.ok) return { ok: false, error: `Notion returned an error (${res.status}).` }
    const props = (await res.json()).properties ?? {}
    const expected = { Name: 'title', Completed: 'checkbox', Date: 'date' }
    const missing = Object.entries(expected)
      .filter(([name, type]) => props[name]?.type !== type)
      .map(([name, type]) => `${name} (${type})`)
    if (missing.length > 0) {
      return { ok: false, error: `Your database needs these columns: ${missing.join(', ')}.` }
    }
    try {
      await saveNotionConfig({ token, dataSourceId })
    } catch (error) {
      console.error("Failed to save Notion Config: ", error.message)
      return { ok: false, error: "Couldn't store the connection securely on this Mac." }
    }
    return { ok: true }
  })

  ipcMain.handle('notion:disconnect', async () => {
    await clearNotionConfig()
    return { ok: true }
  })

  ipcMain.handle('notion:sync', async () => {
    let config
    try {
      config = await loadNotionConfig()
    } catch {
      return { syncedIds: [], error: 'not-configured' }
    }
    if (!config) return { syncedIds: [], error: 'not-configured' }
    return syncCompletedTasks({ ...config, tasks })
  })

  createWindow()

  tray = new Tray(createTrayImage())
  tray.setToolTip('Tether')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Reset Position',
        click: () => resetWindowPosition()
      },
      {
        label: 'Open at Login',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        enabled: app.isPackaged,
        click: (menuItem) => {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
          })
        }
      },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ])
  )

  tray.on('click', () => {
    if (!mainWindow) return
    if (!mainWindow.isVisible()) mainWindow.show()
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  const isRegistered = globalShortcut.register('CommandOrControl+Option+T', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  const isRegistered2 = globalShortcut.register('CommandOrControl+T', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.webContents.send('focus-add-task-input')
    }
  });

  if (!isRegistered) {
    console.log('shortcut registration failed');
  }

  if (!isRegistered2) {
    console.log('CommandOrControl+T shortcut registration failed')
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
