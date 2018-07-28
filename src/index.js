import { app, session, BrowserWindow } from 'electron'

import execa from 'execa'
import path from 'path'
import http from 'axios'

let rPath = 'r-mac'
// TODO: detect at runtime which platform we have
const rpath = path.join(app.getAppPath(), rPath)
const libPath = path.join(rpath, 'library')
const rscript = path.join(rpath, 'bin', 'Rscript')

const shinyAppPath = path.join(app.getAppPath(), 'shiny')

const backgroundColor = '#2c3e50'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit()
}

// Wait asnychronously
const ayncWait = (milliseconds) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, milliseconds)
  })
}

const randomInt = (min, max) => {
  return Math.round(Math.random() * ((max + 1) - min) + min)
}

const randomPort = () => {
  // Those forbidden ports are in line with shiny
  // https://github.com/rstudio/shiny/blob/288039162086e183a89523ac0aacab824ef7f016/R/server.R#L734
  const forbiddenPorts = [3659, 4045, 6000, 6665, 6666, 6667, 6668, 6669, 6697]

  while (true) {
    let port = randomInt(3000, 8000)
    if (forbiddenPorts.includes(port)) continue
    return port
  }
}

// Start the webserver
const startWebserver = async (attempt, progressCallback) => {
  if (attempt > 3) {
    await progressCallback({attempt: attempt, code: 'failed'})
    throw new Error('Cannot start webserver')
  }

  let shinyPort = randomPort()

  await progressCallback({attempt: attempt, code: 'start'})
  execa(rscript,
    ['--vanilla', '-e', `shiny::runApp('${shinyAppPath}', port=${shinyPort})`],
    { env: {
      'R_LIBS': libPath,
      'R_LIBS_SITE': libPath,
      'R_LIB_PATHS': libPath} })
    .catch(console.error)

  // TODO: handle the case the port is taken and
  // shiny fails

  let url = `http://127.0.0.1:${shinyPort}`
  for (let i = 0; i <= 10; i++) {
    await progressCallback({attempt: attempt, code: 'waiting'})
    await ayncWait(500)
    try {
      const res = await http.head(url, {timeout: 1000})
      if (res.status === 200) {
        await progressCallback({attempt: attempt, code: 'success'})
        return url
      }
    } catch (e) {

    }
  }
  await progressCallback({attempt: attempt, code: 'notresponding'})

  // kill process
  // not sure execa is the right package for it
  return startWebserver(attempt + 1, progressCallback)
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let splashScreen
let shinyUrl

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {nodeIntegration: false}
  })

  // and load the index.html of the app.
  mainWindow.loadURL(shinyUrl)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // Set a content security policy
  session.defaultSession.webRequest.onHeadersReceived((_, callback) => {
    callback({
      responseHeaders: `
        default-src 'none';
        script-src 'self';
        img-src 'self' data:;
        style-src 'self';
        font-src 'self';
      `})
  })

  // Deny all permission requests
  session.defaultSession.setPermissionRequestHandler((_1, _2, callback) => {
    callback(false)
  })

  splashScreen = new BrowserWindow({width: 800,
    height: 600,
    backgroundColor: backgroundColor})
  splashScreen.loadURL(`file://${__dirname}/loading.html`)

  // pass the loading events down to the splashScreen window
  const progressCallback = async (event) => {
    await splashScreen.webContents.send('start-webserver-event', event)
  }
  try {
    shinyUrl = await startWebserver(0, progressCallback)
    createWindow()
    splashScreen.destroy()
    mainWindow.show()
  } catch (e) {
    await splashScreen.webContents.send('failed')
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
