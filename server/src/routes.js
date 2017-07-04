const path = require('path')
const fs = require('fs')

const _ = require('lodash')

const filesDir = require('./config').filesDir
const mime = require('mime')
const multer = require('multer')
const upload = multer({ dest: filesDir })
const fileStorage = require('./modules/fileStorage.js')

const passport = require('passport')

const models = require('./models')
const tree = require('./modules/tree')

const express = require('express')
const router = express.Router()

module.exports = router

/**
 * User routes - login/register etc.
 */

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
        res.json({ success: true })
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
  let values = {}
  for (let key of keys) {
    if (req.body[key]) {
      values[key] = req.body[key]
    }
  }
  console.log('>> /api/update', values)
  if (values) {
    models
      .updateUser(values)
      .then(() => {
        res.json({ success: true })
      })
      .catch(err => {
        console.log(`>> \\api\\update`, err)
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
    console.log('>> /api/login user', user)
    if (!user) {
      return res.json(
        { success: false, msg: 'user/password not found' })
    }
    req.logIn(user, (error) => {
      if (error) {
        console.log('>> /api/login error', err)
        return next(error)
      }
      return res.json({ success: true, user: user })
    })
  })(req, res, next)
})

router.post('/api/logout', (req, res) => {
  req.session.destroy()
  req.logout()
  res.json({ success: true })
})

/**
 *  Public functions for json-rpc-api
 */

let remoteRunFns = {

  getExperiments (userId) {
    return models
      .fetchExperiments(userId)
      .then(experiments => {
        return { experiments }
      })
  },

  getExperiment (experimentId) {
    return models
      .fetchExperiment(experimentId)
      .then(experiment => {
        return { experiment }
      })
  },

  deleteExperiment (experimentId) {
    return models
      .deleteExperiment(experimentId)
      .then(() => {
        return { success: true }
      })
      .catch(err => {
        return { success: false, error: err }
      })
  },

  inviteParticipant (experimentId, email) {
    return models
      .createParticipant(
        experimentId, email)
      .then((participant) => {
        return { participant }
      })
  },

  deleteParticipant (participantId) {
    return models
      .deleteParticipant(participantId)
      .then(() => {
        return { success: true }
      })
      .catch(err => {
        return { success: false, error: err }
      })
  },

  getParticipant (participateId) {
    return models
      .fetchParticipant(participateId)
      .then(participant => {
        console.log('>> /participate/', participant)
        if (participant.user === null) {
          console.log('>> /participate no result found')
          return { new: true }
        } else {
          const state = participant.state
          if (tree.isDone(state)) {
            console.log('>> /participate done')
            return { done: true }
          } else {
            const comparison = tree.getComparison(participant.state)
            console.log('>> /participate comparison', comparison)
            return { comparison }
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
          payload = { done: true }
        } else {
          payload = { comparison: tree.getComparison(state) }
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
      .saveParticipant(participateId, { user: details })
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

router.get('/image/:basename', (req, res) => {
  let basename = req.params.basename
  let filename = path.join(filesDir, basename)
  let mimeType = mime.lookup(filename)
  res.setHeader('Content-disposition', `attachment; filename=${basename}`)
  res.setHeader('Content-type', mimeType)
  fs.createReadStream(filename).pipe(res)
})

let remoteUploadFns = {
  uploadImages (paths, name, userId) {
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
  let fnName = req.body.fnName
  let args = JSON.parse(req.body.args)
  if (fnName in remoteUploadFns) {
    const uploadFn = remoteUploadFns[fnName]
    fileStorage(req.files)
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
