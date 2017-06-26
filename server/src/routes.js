const path = require('path')
const fs = require('fs')

const _ = require('lodash')

const filesDir = require('./config').filesDir
const mime = require('mime')
const multer = require('multer')
const upload = multer({ dest: filesDir })
const fileUploader = require('./modules/fileUploader.js')

const passport = require('passport')

const models = require('./models')
const tree = require('./modules/tree')

const express = require('express')
const router = express.Router()

module.exports = router

router.get('/image/:basename', (req, res) => {
  let basename = req.params.basename
  let filename = path.join(filesDir, basename)
  let mimeType = mime.lookup(filename)
  res.setHeader('Content-disposition', `attachment; filename=${basename}`)
  res.setHeader('Content-type', mimeType)
  fs.createReadStream(filename).pipe(res)
})

router.post('/api/register', (req, res) => {
  // Sanitization
  const varNames = ['firstName', 'lastName', 'email', 'password', 'passwordv']
  for (let varName of varNames) {
    req.sanitize(varName).escape()
    req.sanitize(varName).trim()
  }

  // Validation
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

router.post('/api/experiments', (req, res) => {
  models
    .fetchExperiments(req.body.userId)
    .then(experiments => {
      console.log('>> /experiments', experiments)
      res.json({ experiments })
    })
})

// [POST] Create a new Experiment for current user.
router.post('/api/create-experiment', upload.array('experiment[images]'), (req, res) => {
  let userId = req.body.userId
  let name = req.body.experiment.name
  fileUploader
    .uploadFiles(req.files)
    .then((paths) => {
      let getUrl = f => '/image/' + path.basename(f)
      models
        .createExperiment(
          userId, name, '', _.map(paths, getUrl))
        .then(experiment => {
          res.json({ success: true, experimentId: experiment.id })
        })
    })
})

// [POST] Create a new Experiment for current user.
router.post('/api/delete-experiment/:experimentId', (req, res) => {
  console.log('>> /delete-experiment', req.params.experimentId)
  models
      .deleteExperiment(req.params.experimentId)
      .then(() => {
        res.json({ success: true })
      })
      .catch(err => {
        res.json({ success: false, error: err })
      })
})

router.post('/api/experiment/:experimentId', (req, res) => {
  models
    .fetchExperiment(req.params.experimentId)
    .then(experiment => {
      res.json({ experiment })
    })
})

router.post('/api/participate-invite/:experimentId', (req, res) => {
  models
    .createParticipant(
      req.params.experimentId, req.body.email.trim())
    .then((participant) => {
      res.json({ participant })
    })
})

router.post('/api/participate/:participateId', (req, res) => {
  const participateId = req.params.participateId
  models.fetchParticipant(participateId)
    .then(participant => {
      console.log('>> /participate/', participant)
      if (participant.user === null) {
        console.log('>> /participate no result found')
        res.json({ new: true })
      } else {
        const state = participant.state
        if (tree.isDone(state)) {
          console.log('>> /participate done')
          res.json({ done: true })
        } else {
          const comparison = tree.getComparison(participant.state)
          console.log('>> /participate comparison', comparison)
          return res.json({ comparison })
        }
      }
    })
})

router.post('/api/participate-user/:participateId', (req, res) => {
  let user = req.body
  let participateId = req.params.participateId
  models
    .saveParticipant(participateId, { user: user })
    .then(participant => {
      let comparison = tree.getComparison(participant.state)
      res.json({ comparison })
    })
})

router.post('/api/delete-invite/:participateId', (req, res) => {
  models
    .deleteParticipant(req.params.participateId)
    .then(() => {
      res.json({ success: true })
    })
    .catch(err => {
      res.json({ success: false, error: err })
    })
})

router.post('/api/participate-choose/:participateId', (req, res) => {
  let participateId = req.params.participateId
  let chosenImageIndex = req.body.return
  console.log(participateId, chosenImageIndex)
  models
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
      models
        .saveParticipant(participateId, {state})
        .then(() => {
          res.json(payload)
        })
    })
})
