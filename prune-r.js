// A hook to only retain one relevant R distrubtion per platform

const {remove} = require('fs-extra')
const path = require('path')

const tryRemove = async (path) => {
  try {
    await remove(path)
  } catch (e) {
    console.error(e)
  }
}

module.exports = async (buildPath, _electronVersion, platform, _arch, callback) => {
  const rMacPath = path.join(buildPath, 'r-mac')
  const rWinPath = path.join(buildPath, 'r-win')
  if (platform === 'darwin') {
    await tryRemove(rWinPath)
  } else if (platform === 'win32') { 
    await tryRemove(rMacPath)
  } else {
    throw new Error('Platform is not supported')
  }
  await Promise.all(
    [
      tryRemove(path.join(buildPath, 'prune-r.js')),
      tryRemove(path.join(buildPath, 'get-r-mac.sh')),
      tryRemove(path.join(buildPath, 'get-r-win.sh')),
      tryRemove(path.join(buildPath, 'Dockerfile')),
      tryRemove(path.join(buildPath, 'add-cran-binary-pkgs.R'))
    ]
  )
  callback()
}