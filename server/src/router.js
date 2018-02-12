const path = require('path')
const fs = require('fs')

const _ = require('lodash')

const config = require('./config')

const mime = require('mime')
const multer = require('multer')
const upload = multer({dest: config.filesDir})

const passport = require('passport')
const express = require('express')

/**
 Main router for the Versus server. This provides the main
 interface for the RPC-JSON api architecture.

 As well the server provides a generic file upload/download
 that will store files directly on the server, which will be
 available for the web-client via a get call
 */

// the router is defined here, and exported for the main express app
const router = express.Router()
module.exports = router

// the remote functions availabe for the RPC-JSON api
const remoteRunFns = require('./handlers')

/**
 * This is the main interface to the JSON-RPC api. It is a post
 * handler, where the function name and args are passed in
 * the body as JSON.
 *
 * Because of the special semantics in initiating/terminating
 * user sessions with login/logut, they are specially
 * handled here, otherwise all functions are sent to the matching
 * functions found in the exports of `handlers.js`.
 */
router.post('/api/rpc-run', (req, res, next) => {
  let params = req.body.params
  let method = req.body.method
  console.log(`>> router.rpc-run.${method}`)

  if (method === 'login') {
    req.body.email = params[0].email
    req.body.password = params[0].password

    passport.authenticate('local', (err, user) => {
      if (err) {
        console.log('>> router.rpc-run.login authenticate error')
        return next(err)
      }
      if (!user) {
        console.log('>> router.rpc-run.login no user found')
        return res.json({
          error: {
            code: -1,
            message: 'user/password not found'
          }
        })
      }
      req.logIn(user, (error) => {
        if (error) {
          console.log('>> router.rpc-run.login session login error', err)
          return next(error)
        }
        console.log('>> router.rpc-run.login success', user)
        let returnUser = _.cloneDeep(user)
        delete returnUser.password
        return res.json({
          result: {
            success: true,
            user: returnUser
          }
        })
      })
    })(req, res, next)
  } else if (method === 'logout') {
    req.session.destroy()
    req.logout()
    res.json({success: true})
  } else if (method in remoteRunFns) {
    if (!_.startsWith(method, 'public')) {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        throw new Error(`Not logged in`)
      }
    }

    const runFn = remoteRunFns[method]

    runFn(...params)
      .then(result => {
        res.json({result})
      })
      .catch(e => {
        res.json({
          error: {
            code: -1,
            message: e.toString()
          }
        })
      })
  } else {
    res.json({
      error: {
        code: -1,
        message: `Remote runFn ${method} not found`
      }
    })
  }
})

/**
 * Returns a file stored on the server
 */
router.get('/file/:timestampDir/:basename', (req, res) => {
  let basename = req.params.basename
  let timestampDir = req.params.timestampDir
  console.log('>> router.file', timestampDir, basename)

  let filename = path.join(config.filesDir, timestampDir, basename)
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
  let method = req.body.method
  let params = JSON.parse(req.body.params)

  console.log('>> router.rpc-upload.' + method)

  if (method in remoteRunFns) {
    if (!_.startsWith(method, 'upload')) {
      throw new Error(`Remote uploadFn ${method} should start with 'upload'`)
    }
    const uploadFn = remoteRunFns[method]
    params = _.concat([req.files], params)
    uploadFn(...params)
      .then(result => {
        res.json({result})
      })
      .catch(e => {
        res.json({
          error: {
            code: -1,
            message: e.toString()
          }
        })
      })
  } else {
    res.json({
      error: {
        code: -1,
        message: `Remote uploadFn ${method} not found`
      }
    })
  }
})

/**
 * Upload file handlers, sends to 'upload*' function with the
 * implicit first argument, a filelist of the uploaded files.
 */
router.post('/api/rpc-download', (req, res) => {
  let method = req.body.method
  let params = req.body.params

  console.log('>> router.rpc-download.' + method, params)

  if (method in remoteRunFns) {
    if (!_.startsWith(method, 'download')) {
      throw new Error(`Remote download ${method} should start with 'download'`)
    }

    const downloadFn = remoteRunFns[method]

    downloadFn(...params)
      .then(result => {
        res.set('data', JSON.stringify({result: result.result}))
        res.set('filename', path.basename(result.filename))
        res.set('Access-Control-Expose-Headers', 'data, filename')
        res.download(result.filename)
      })
      .catch(e => {
        let error = {
          code: -1,
          message: e.toString()
        }
        res.set('data', JSON.stringify({error}))
        res.set('Access-Control-Expose-Headers', 'data, filename')
        res.json({error})
      })
  } else {
    let error = {
      code: -1,
      message: `Remote uploadFn ${method} not found`
    }
    res.set('data', JSON.stringify({error}))
    res.set('Access-Control-Expose-Headers', 'data')
    res.json({error})
  }
})
