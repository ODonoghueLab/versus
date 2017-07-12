const path = require('path')
const fs = require('fs')

const _ = require('lodash')

const config = require('./config')
const models = require('./models')
const tree = require('./modules/tree')

const mime = require('mime')
const multer = require('multer')
const upload = multer({dest: config.filesDir})
const del = require('del')

const passport = require('passport')
const jwt = require('jwt-simple')

const express = require('express')

const router = express.Router()

module.exports = router

/**
 * User routes - login/register etc.
 */

function getJwtToken (user) {
  let payload = {id: user.id}
  let token = jwt.encode(payload, config.jwtSecret)
  return token
}

router.post('/api/token', function(req, res) {
  if (req.body.email && req.body.password) {
    let email = req.body.email
    let password = req.body.password
    models
      .fetchUser({email})
      .then(user => {
        models.checkUserWithPassword(user, password)
          .then((user) => {
            if (user === null) {
              res.sendStatus(401)
            } else {
              let payload = {id: user.id}
              let token = jwt.encode(payload, config.jwtSecret)
              res.json({token})
            }
          })
      })
      .catch(() => {
        res.sendStatus(401)
      })
  }
})

router.post('/api/register', (req, res) => {
  // Sanitization
  const keys = ['firstName', 'lastName', 'email', 'password', 'passwordv']
  for (let key of keys) {
    req.sanitize(key).escape()
    req.sanitize(key).trim()
  }
  // Server-side validation using expressValidator
  req.checkBody('firstName', 'Please Enter Your First Name').notEmpty()
  req.checkBody('lastName', 'Please Enter Your Last Name').notEmpty()
  req.checkBody('email', 'Please Enter Your Email').notEmpty()
  req.checkBody('password', 'Please Enter Both Password Fields').notEmpty()
  req.checkBody('passwordv', 'Please Enter Both Password Fields').notEmpty()
  // req.checkBody('password', 'Please Enter A Longer Password').len(6);
  req.checkBody('password', 'Passwords Do Not Match').equals(req.body.passwordv)
  const errors = req.validationErrors()
  let values = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password
  }
  if (errors) {
    values.errors = errors.map(obj => obj.msg)
    values.success = false
    res.json(values)
  } else {
    models
      .createUser(values)
      .then(() => {
        res.json({success: true})
      })
      .catch(err => {
        console.log('>> \api\register', err)
        values.errors = ['Couldn\' register, is your email already in use?']
        values.success = false
        res.json(values)
      })
  }
})

router.post('/api/update', (req, res) => {
  const keys = ['id', 'firstName', 'lastName', 'email', 'password']
  for (let key of keys) {
    req.sanitize(key).escape()
    req.sanitize(key).trim()
  }
  let values = {}
  for (let key of keys) {
    if (req.body[key]) {
      values[key] = req.body[key]
    }
  }
  if (values) {
    models
      .updateUser(values)
      .then(user => {
        console.log('>> /api/update success', values, user)
        res.json({success: true})
      })
      .catch(err => {
        console.log(`>> /api/update error`, err)
        values.errors = ['Couldn\' register, is your email already in use?']
        values.success = false
        res.json(values)
      })
  }
})

// [POST] get login form
router.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) {
      console.log('>> /api/login error', err)
      return next(err)
    }
    if (!user) {
      return res.json(
        {success: false, msg: 'user/password not found'})
    }
    console.log('>> /api/login user', user)
    req.logIn(user, (error) => {
      if (error) {
        console.log('>> /api/login error', err)
        return next(error)
      }
      console.log('>> /api/login user', user)
      return res.json({
        success: true,
        user: user,
        jwtToken: getJwtToken(user)
      })
    })
  })(req, res, next)
})

router.post('/api/logout', (req, res) => {
  req.session.destroy()
  req.logout()
  res.json({success: true})
})

/**
 *  Public functions for json-rpc-api
 */

let remoteRunFns = {

  getExperiments (userId) {
    return models
      .fetchExperiments(userId)
      .then(experiments => {
        return {experiments}
      })
  },

  getExperiment (experimentId) {
    return models
      .fetchExperiment(experimentId)
      .then(experiment => {
        return {experiment}
      })
  },

  deleteExperiment (experimentId) {
    return models
      .deleteExperiment(experimentId)
      .then(() => {
        return {success: true}
      })
      .catch(err => {
        return {success: false, error: err}
      })
  },

  inviteParticipant (experimentId, email) {
    return models
      .createParticipant(
        experimentId, email)
      .then((participant) => {
        return {participant}
      })
  },

  deleteParticipant (participantId) {
    return models
      .deleteParticipant(participantId)
      .then(() => {
        return {success: true}
      })
      .catch(err => {
        return {success: false, error: err}
      })
  },

  getParticipant (participateId) {
    return models
      .fetchParticipant(participateId)
      .then(participant => {
        console.log('>> /participate/', participant)
        if (participant.user === null) {
          console.log('>> /participate no result found')
          return {new: true}
        } else {
          const state = participant.state
          if (tree.isDone(state)) {
            console.log('>> /participate done')
            return {done: true}
          } else {
            const comparison = tree.getComparison(participant.state)
            console.log('>> /participate comparison', comparison)
            return {comparison}
          }
        }
      })
  },

  chooseItem (participateId, chosenImageIndex) {
    return models
      .fetchParticipant(participateId)
      .then(participant => {
        let payload
        let state = participant.state
        tree.makeChoice(state, chosenImageIndex)
        if (tree.isDone(state)) {
          tree.rankNodes(state)
          payload = {done: true}
        } else {
          payload = {comparison: tree.getComparison(state)}
        }
        return models
          .saveParticipant(participateId, {state})
          .then(() => {
            return payload
          })
      })
  },

  saveParticipantUserDetails (participateId, details) {
    return models
      .saveParticipant(participateId, {user: details})
      .then(participant => {
        return {
          comparison: tree.getComparison(participant.state)
        }
      })
  }
}

router.post('/api/rpc-run', (req, res) => {
  let args = req.body.args
  let fnName = req.body.fnName
  if (fnName in remoteRunFns) {
    const runFn = remoteRunFns[fnName]
    runFn(...args).then(result => {
      res.json(result)
    })
  } else {
    throw new Error(`Remote runFn ${fnName} not found`)
  }
})

/**
 * Uploading file-handler and generic file return
 */

function storeFiles (uploadedFiles) {

  return new Promise((resolve, reject) => {
    const stamp = String(new Date().getTime())
    let err = ''

    function rollback (msg) {
      for (let i = 0; i < uploadedFiles.length; i += 1) {
        del(uploadedFiles[i].path)
      }
      err = msg
    }

    console.log('>> routes.storeFiles', uploadedFiles)
    const inputPaths = []
    const targetPaths = []

    if (uploadedFiles.length < 2) {
      err = 'Minimum two images.'
    } else {
      for (let i = 0; i < uploadedFiles.length; i += 1) {
        let file = uploadedFiles[i]
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
        targetPaths.push(path.join(config.filesDir, basename))
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

router.get('/image/:basename', (req, res) => {
  let basename = req.params.basename
  let filename = path.join(config.filesDir, basename)
  let mimeType = mime.lookup(filename)
  res.setHeader('Content-disposition', `attachment; filename=${basename}`)
  res.setHeader('Content-type', mimeType)
  fs.createReadStream(filename).pipe(res)
})

let remoteUploadFns = {
  uploadImages (paths, name, userId) {
    console.log('>> routes.remoteUploadFns', paths, name, userId)
    return models
      .createExperiment(
        userId,
        name,
        '',
        _.map(paths, f => '/image/' + path.basename(f)))
      .then(experiment => {
        return {
          success: true,
          experimentId: experiment.id
        }
      })
  }
}

router.post('/api/rpc-upload', upload.array('uploadFiles'), (req, res) => {
  console.log('>> /api/rpc-upload')
  let fnName = req.body.fnName
  let args = JSON.parse(req.body.args)
  if (fnName in remoteUploadFns) {
    const uploadFn = remoteUploadFns[fnName]
    storeFiles(req.files)
      .then((paths) => {
        args = _.concat([paths], args)
        uploadFn(...args)
          .then(result => {
            res.json(result)
          })
      })
  } else {
    throw new Error(`Remote uploadFn ${fnName} not found`)
  }
})
