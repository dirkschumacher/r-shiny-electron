import { app, session, BrowserWindow } from 'electron'

import {spawn, ChildProcess} from 'child_process'
import path from 'path'
import http from 'axios'
import os from 'os'
import execa from 'execa'

let rPath
if (os.platform() === 'win32') {
  rPath = 'r-win'
} else if (os.platform() === 'darwin') {
  rPath = 'r-mac'
} else {
  throw new Error("OS not supported")
}

const rpath = path.join(app.getAppPath(), rPath)
const libPath = path.join(rpath, 'library')
const rscript = path.join(rpath, 'bin', 'R')

const shinyAppPath = path.join(app.getAppPath(), 'shiny')

const backgroundColor = '#2c3e50'

// We have to launch a child process for the R shiny webserver
// Things we need to take into account:
// The process dies during setup
// The process dies during app usuage (e.g. the OS kills the process)
// At the random port, another webserver is running
// at any given time there should be 0 or 1 shiny processes
let rShinyProcess = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit()
}

const waitFor = (milliseconds) => {
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

// tries to start a webserver
// attempt - a counter how often it was attempted to start a webserver
// use the progress call back to listen for intermediate status reports
// use the onErrorStartup callback to react to a critical failure during startup
// use the onErrorLater callback to handle the case when the R process dies
// use onSuccess to retrieve the shinyUrl
const tryStartWebserver = async (attempt, progressCallback, onErrorStartup, 
                                 onErrorLater, onSuccess)  => {
  if (attempt > 3) {
    await progressCallback({attempt: attempt, code: 'failed'})
    await onErrorStartup()
    return
  }

  if (rShinyProcess !== null) {
    await onErrorStartup() // should not happen
    return
  }

  let shinyPort = randomPort()

  await progressCallback({attempt: attempt, code: 'start'})

  // changing .lib.loc - same strategy as the checkpoint package
  const libPathEscaped = JSON.stringify(libPath.split('\\').join('/'))
  const shinyAppPathEscaped = JSON.stringify(shinyAppPath.split('\\').join('/'))
  const rCode = `assign(".lib.loc", ${libPathEscaped}, envir = environment(.libPaths));shiny::runApp(${shinyAppPathEscaped}, port=${shinyPort})`
  
  let shinyRunning = false
  const then = async (_) => {
    rShinyProcess = null
    if (shinyRunning) {
      await onErrorLater()
    } else {
      await tryStartWebserver(attempt + 1, progressCallback, onErrorStartup, onErrorLater, onSuccess)
    }
  }
  
  rShinyProcess = execa(rscript,
    ['--vanilla', '-e', rCode],
    { env: {
      'RHOME': rpath,
      'R_HOME_DIR': rpath,
      'R_LIBS': libPath,
      'R_LIBS_USER': libPath,
      'R_LIBS_SITE': libPath,
      'R_LIB_PATHS': libPath} }).then(then).catch(then)


  let url = `http://127.0.0.1:${shinyPort}`
  for (let i = 0; i <= 10; i++) {
    await waitFor(500)
    try {
      const res = await http.head(url, {timeout: 1000})
      // TODO: check that it is really shiny and not some other webserver
      if (res.status === 200) {
        await progressCallback({attempt: attempt, code: 'success'})
        shinyRunning = true
        onSuccess(url)
        return
      }
    } catch (e) {

    }
  }
  await progressCallback({attempt: attempt, code: 'notresponding'})

  try{
    rShinyProcess.kill()
  } catch(e) {}
  // this triggers the exit callback and ensures, only one process lives
  // potential problem: what happens if the process never exists?
  // maybe add a UI warning that you might want to restart the app
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let loadingSplashScreen
let errorSplashScreen

const createWindow = (shinyUrl) => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {nodeIntegration: false}
  })

  mainWindow.loadURL(shinyUrl)

  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
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

  loadingSplashScreen = new BrowserWindow({width: 800,
                                    height: 600,
                                    backgroundColor: backgroundColor})
  loadingSplashScreen.loadURL(`file://${__dirname}/loading.html`)
  loadingSplashScreen.on('closed', () => {
    loadingSplashScreen = null
  })
  const emitSpashEvent = async (event, data) => {
    try {
      await loadingSplashScreen.webContents.send(event, data)
     } catch(e) {}
  }

  // pass the loading events down to the loadingSplashScreen window
  const progressCallback = async (event) => {
    await emitSpashEvent('start-webserver-event', event)
  } 

  const onErrorLater = async () => {
    if (!mainWindow) { // fired when we quit the app
      return
    }
    errorSplashScreen = new BrowserWindow({width: 800,
      height: 600,
      backgroundColor: backgroundColor})
    errorSplashScreen.loadURL(`file://${__dirname}/failed.html`)
    errorSplashScreen.on('closed', () => {
      errorSplashScreen = null
    })
    await errorSplashScreen.show()
    mainWindow.destroy()
  }

  const onErrorStartup = async () => {
    await emitSpashEvent('failed')
  }

  try {
    await tryStartWebserver(0, progressCallback, onErrorStartup, onErrorLater, (url) => {
      createWindow(url)
      loadingSplashScreen.destroy()
      loadingSplashScreen = null
      mainWindow.show()
    })
  } catch (e) {
    await emitSpashEvent('failed')
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  // }
  // We overwrite the behaviour for now as it makes things easier
  // remove all events
  app.quit()
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
