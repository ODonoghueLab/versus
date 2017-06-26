const path = require('path')
const del = require('del')
const fs = require('fs')
const _ = require('lodash')

const filesDir = require('../config').filesDir

module.exports = {

  uploadFiles (files) {
    return new Promise((resolve, reject) => {
      const stamp = String(new Date().getTime())
      let err = ''

      function rollback (msg) {
        for (let i = 0; i < files.length; i += 1) {
          del(files[i].path)
        }
        err = msg
      }

      const inputPaths = []
      const targetPaths = []

      if (files.length < 2) {
        err = 'Minimum two images.'
      } else {
        for (let i = 0; i < files.length; i += 1) {
          let file = files[i]
          const extname = path.extname(file.originalname).toLowerCase()
          // handle formats
          if (!_.includes(['.png', '.jpg', '.gif'], extname)) {
            rollback(`only png's, jpg's, gif's`)
            break
          }
          // size checking
          if (file.size / 1000000 > 2) {
            rollback('Please Keep Images Under 2MB')
            break
          }
          let basename = String(stamp) + String(i) + extname
          inputPaths.push(file.path)
          targetPaths.push(path.join(filesDir, basename))
          try {
            fs.renameSync(inputPaths[i], targetPaths[i])
            console.log('uploadFiles', path.basename(inputPaths[i]), '->', basename)
          } catch (err) {
            rollback(err)
            break
          }
        }
      }

      if (err) {
        reject(err)
      } else {
        resolve(targetPaths)
      }
    })
  }

}
