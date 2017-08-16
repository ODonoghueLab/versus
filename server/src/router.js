const path = require('path')
const fs = require('fs')

const _ = require('lodash')

const config = require('./config')

const mime = require('mime')
const multer = require('multer')
const upload = multer({dest: config.filesDir})
const del = require('del')

const passport = require('passport')
const express = require('express')

const router = express.Router()
module.exports = router


/**
 * These are the rpc remote functions that take JSON object parameters
 * and return JSON objects
 */
const remoteRunFns = require('./handlers')


/**
 *
 */
router.post('/api/rpc-run', (req, res, next) => {
  let args = req.body.args
  let fnName = req.body.fnName
  console.log(`>> router.rpc-run.${fnName}`)

  if (fnName === 'login') {

    req.body.email = args[0].email
    req.body.password = args[0].password

    passport.authenticate('local', (err, user) => {
      if (err) {
        console.log('>> router.rpc-run.login authenticate error')
        return next(err)
      }
      if (!user) {
        console.log('>> router.rpc-run.login no user found')
        return res.json({
          success: false,
          msg: 'user/password not found'
        })
      }
      req.logIn(user, (error) => {
        if (error) {
          console.log('>> router.rpc-run.login session login error', err)
          return next(error)
        }
        console.log('>> router.rpc-run.login success', user)
        return res.json({
          success: true,
          user: user
        })
      })
    })(req, res, next)

  } else if (fnName === 'logout') {

    req.session.destroy()
    req.logout()
    res.json({success: true})

  } else if (fnName in remoteRunFns) {

    if (!_.startsWith(fnName, 'public')) {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        throw new Error(`Not logged in`)
      }
    }

    const runFn = remoteRunFns[fnName]

    runFn(...args)
      .then(result => {
        res.json(result)
      })

  } else {

    throw new Error(`Remote runFn ${fnName} not found`)

  }

})


/**
 * Returns a file stored on the server
 */
router.get('/file/:experimentDir/:basename', (req, res) => {
  let basename = req.params.basename
  let experimentDir = req.params.experimentDir
  console.log('>> router.file', experimentDir, basename)
  let filename = path.join(config.filesDir, experimentDir, basename)
  let mimeType = mime.lookup(filename)
  res.setHeader('Content-disposition', `attachment; filename=${basename}`)
  res.setHeader('Content-type', mimeType)
  fs.createReadStream(filename).pipe(res)
})


/**
 * Upload file handlers, sends to 'upload*' function with the
 * implicit first argument, a filelist of the uploaded files.
 */
router.post('/api/rpc-upload', upload.array('uploadFiles'), (req, res) => {
  let fnName = req.body.fnName
  let args = JSON.parse(req.body.args)
  console.log('>> router.rpc-upload.' + fnName)
  if (fnName in remoteRunFns) {
    if (!_.startsWith(fnName, 'upload')) {
      throw new Error(`Remote uploadFn ${fnName} should start with 'upload'`)
    }
    const uploadFn = remoteRunFns[fnName]
    args = _.concat([req.files], args)
    uploadFn(...args)
      .then(result => {
        res.json(result)
      })
  } else {
    throw new Error(`Remote uploadFn ${fnName} not found`)
  }
})
