import { app, session, BrowserWindow } from 'electron'

import execa from 'execa'
import path from 'path'
import http from 'axios'

const shiny_port = 4539

const rpath = path.join(app.getAppPath(), 'r-mac')
const lib_path = path.join(app.getAppPath(), 'r-mac', 'library')
const rscript = path.join(app.getAppPath(), 'r-mac', 'bin', 'Rscript')


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Wait asnychronously
const ayncWait = (milliseconds) => {
  return new Promise((resolve, _) => {
    setTimeout(resolve, milliseconds)
  })
}

// Start the webserver
const startWebserver = async () => {
  execa(rscript, 
    ['--vanilla', '-e', `shiny::runApp(file.path('shiny'), port=${shiny_port})`],
    { env: {
      "R_LIBS": lib_path,
      "R_LIBS_SITE": lib_path,
      "R_LIB_PATHS": lib_path} }).catch(console.error)
  let url = `http://127.0.0.1:${shiny_port}`
  for(let i = 0; i <= 10; i++) {
    await ayncWait(1000)
    try{
      const res = await http.head(url, {timeout: 1000})
      if (res.status == 200) return url
    } catch (e) {
    }
  }
  // if process is finished,
  // increate port counter and try again
  // TODO: handle fail
  return url
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let splashScreen
let shinyUrl

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, 
    webPreferences:{nodeIntegration:false}
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
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {    
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
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(false);
    });
  
    splashScreen = new BrowserWindow({width: 800, height: 600})
    splashScreen.loadURL(`file://${__dirname}/loading.html`)
    console.log("wat")
    shinyUrl = await startWebserver()
    createWindow()
    
    splashScreen.destroy()
    mainWindow.show()  
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit(); 
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
