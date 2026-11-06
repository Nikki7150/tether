import { app, shell, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

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
  const macTemplateIconPath = join(__dirname, '../../resources/trayTemplate.png')
  const defaultIconPath = join(__dirname, '../../resources/icon.png')
  const chosenPath = existsSync(macTemplateIconPath) ? macTemplateIconPath : defaultIconPath

  const fromFile = nativeImage.createFromPath(chosenPath)
  const baseImage = fromFile.isEmpty() ? nativeImage.createFromPath(icon) : fromFile
  const resized = baseImage.resize({ width: 18, height: 18 })

  if (process.platform === 'darwin') {
    resized.setTemplateImage(true)
  }

  return resized
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  let preExpandedPosition = null

  ipcMain.on('set-expanded', (event, expanded) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const bounds = win.getBounds()
    if (expanded) {
      preExpandedPosition = { x: bounds.x, y: bounds.y }
      const currentDisplay = screen.getDisplayMatching(bounds)
      const { workArea } = currentDisplay
      let newX = bounds.x
      let newY = bounds.y
      const panelRightEdge = newX + PANEL_W
      const workAreaRightEdge = workArea.x + workArea.width
      const rightOverflow = panelRightEdge - workAreaRightEdge
      if (rightOverflow > 0) {
        newX -= rightOverflow;
      }
      const panelBottomEdge = newY + MIN_PANEL_H
      const workAreaBottomEdge = workArea.y + workArea.height
      const bottomOverflow = panelBottomEdge - workAreaBottomEdge
      if (bottomOverflow > 0) {
        newY -= bottomOverflow;
      }
      win.setBounds({
        x: newX,
        y: newY,
        width: PANEL_W,
        height: MIN_PANEL_H
      })
    } else {
      const targetX = preExpandedPosition ? preExpandedPosition.x : bounds.x
      const targetY = preExpandedPosition ? preExpandedPosition.y : bounds.y
      win.setBounds({
        x: targetX,
        y: targetY,
        width: ORB_SIZE,
        height: ORB_SIZE
      })
    }
  })

  ipcMain.on('set-panel-height', (event, nextHeight) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || typeof nextHeight !== 'number') return

    const bounds = win.getBounds()
    if (bounds.width !== PANEL_W) return

    const clampedHeight = Math.max(MIN_PANEL_H, Math.min(MAX_PANEL_H, Math.ceil(nextHeight)))
    if (bounds.height === clampedHeight) return

    const currentDisplay = screen.getDisplayMatching(bounds)
    const { workArea } = currentDisplay
    let newY = bounds.y

    const panelBottomEdge = newY + clampedHeight
    const workAreaBottomEdge = workArea.y + workArea.height
    const bottomOverflow = panelBottomEdge - workAreaBottomEdge
    if (bottomOverflow > 0) {
      newY -= bottomOverflow
    }

    win.setBounds({
      x: bounds.x,
      y: newY,
      width: PANEL_W,
      height: clampedHeight
    })
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
