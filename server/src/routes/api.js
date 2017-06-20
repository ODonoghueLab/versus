const path = require('path')
const fs = require('fs')

const _ = require('lodash')

const filesDir = require('../config').filesDir
const mime = require('mime')
const multer = require('multer')
const upload = multer({ dest: filesDir })
const fileUploader = require('../modules/fileUploader.js')

const util = require('../modules/util')

const passport = require('passport')

const models = require('../models')
const tree = require('../modules/tree')

module.exports = (app) => {
  // [GET] images that were saved on the server
  app.get('/experiment/image/:basename', (req, res) => {
    console.log('>> /experiment/image/', req.params)
    let basename = req.params.basename
    let filename = path.join(filesDir, basename)
    console.log(filename)
    let mimeType = mime.lookup(filename)
    res.setHeader('Content-disposition', `attachment; filename=${basename}`)
    res.setHeader('Content-type', mimeType)
    fs.createReadStream(filename).pipe(res)
  })

  app.post('/api/register', (req, res) => {
    // Sanitization
    const keys = ['firstName', 'lastName', 'email', 'password', 'passwordv'];
    for (let i = 0; i < keys.length; i += 1) {
      req.sanitize(`${keys[i]}`).escape();
      req.sanitize(`${keys[i]}`).trim();
    }

    // Validation
    req.checkBody('firstName', 'Please Enter Your First Name').notEmpty();
    req.checkBody('lastName', 'Please Enter Your Last Name').notEmpty();
    req.checkBody('email', 'Please Enter Your Email').notEmpty();
    req.checkBody('password', 'Please Enter Both Password Fields').notEmpty();
    req.checkBody('passwordv', 'Please Enter Both Password Fields').notEmpty();
    // req.checkBody('password', 'Please Enter A Longer Password').len(6);
    req.checkBody('password', 'Passwords Do Not Match').equals(req.body.passwordv);

    const errors = req.validationErrors();

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
          console.log('>> /api/register success')
          res.json({ success: true })
        })
        .catch(() => {
          values.errors = ['Couldn\' register, is your email already in use?']
          values.success = false
          res.json(values)
        })
    }
  })

  // [POST] get login form
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err, user) => {
      if (err) {
        console.log('>> /api/login error')
        return next(err)
      }

      if (!user) {
        console.log('>> /api/login fail: user/password not found')
        return res.json({ success: false, msg: 'user/password not found' })
      }

      req.logIn(user, (error) => {
        if (error) {
          console.log('>> /api/login fail: user not found')
          return next(error)
        }
        req.session.user = user
        console.log('>> /api/login success', req.isAuthenticated())
        return res.json({ success: true, user: user })
      })
    })(req, res, next)
  })

  app.post('/api/logout', (req, res) => {
    console.log('>> /api/logout', req.session)
    req.session.destroy()
    req.logout()
    res.json({ success: true })
  })

  app.post('/api/experiments', (req, res) => {
    console.log('>> /api/experiments req.user', req.isAuthenticated())
    models.fetchExperiments(req.body.userId)
      .then(experiments => {
        res.json({ experiments })
      })
  })

// [POST] Create a new Experiment for current user.
  app.post(
    '/api/create-experiment',
    upload.array('experiment[images]'),
    (req, res) => {
      fileUploader
        .uploadFiles(req.files)
        .then((targetPaths) => {
          const basenames = _.map(targetPaths, (p) => path.basename(p))
          const imageUrls = _.map(basenames, f => `/experiment/image/${f}`)
          models
            .createExperiment(
              req.body.userId,
              req.body.experiment.name,
              '',
              imageUrls)
            .then(() => {
              res.json({ success: true })
            })
        })
    })


  // [POST] Create a new Experiment for current user.
  app.post(
    '/api/delete-experiment/:experimentId',
    (req, res) => {
      console.log('>> /api/delete-experiment', req.params.experimentId)
      models
        .deleteExperiment(req.params.experimentId)
        .then(() => res.json({ success: true }))
        .catch(err => res.json({ success: false, error: err }))
    })

  app.post('/api/experiment/:experimentId', (req, res) => {
    models
      .fetchExperiment(req.params.experimentId)
      .then(experiment => {
        console.log('>> /api/experiment', experiment.get({ plain: true }))
        res.json({ experiment })
      })
  })

  app.post('/api/participate-invite/:experimentId', (req, res) => {
    models.fetchExperiment(req.params.experimentId)
      .then(experiment => {
        models.Invite
          .create({
            email: req.body.email.trim(),
            type: 'participate'
          })
          .then((invite) => {
            experiment.addInvite(invite)
            res.json({ invite })
          })
      })
  })

  app.post('/api/delete-invite/:inviteId', (req, res) => {
    models
      .deleteInvite(req.params.inviteId)
      .then(() => {
        res.json({ success: true })
      })
      .catch(err => {
        res.json({ success: false, error: err })
      })
  })

  app.post('/api/participate-user/:inviteId', (req, res) => {
    let user = req.body
    let inviteId = req.params.inviteId
    models.fetchInvite(inviteId)
      .then(invite => {
        console.log('>> /api/participate-user', invite.ExperimentId)
        models.fetchExperiment(invite.ExperimentId)
          .then(experiment => {
            let images = experiment.Images
            const imageUrls = _.map(images, 'url')
            return models.makeResult(invite, user, imageUrls)
          })
          .then(result => {
            return res.json({
              comparison: tree.getCurrentComparison(result.state)
            })
          })
      })
  })

  app.post('/api/participate-choose/:inviteId', (req, res) => {
    let inviteId = req.params.inviteId
    let chosenImageIndex = parseInt(req.body.return)
    console.log(inviteId, chosenImageIndex)
    models.fetchResult(inviteId)
      .then(result => {
        const state = result.get('state')
        const isTestImageChosen = (chosenImageIndex > state.nodes[state.nodeIndex].imageIndex)
        tree.makeChoice(state, isTestImageChosen)
        result.update({ state })
          .then(() => {
            if (tree.isDone(state)) {
              res.json({ done: true })
            } else {
              let iNew = state.testImageIndex
              let iNode = state.nodes[state.nodeIndex].imageIndex
              if (isTestImageChosen) {
                res.json(
                  { comparison: tree.makeComparison(state, iNode, iNew) })
              } else {
                res.json(
                  { comparison: tree.makeComparison(state, iNew, iNode) })
              }
            }
          })
      })
  })

  app.post('/api/participate/:inviteId', (req, res) => {
    const inviteId = req.params.inviteId
    console.log('>> /api/participate', inviteId)
    models.fetchResult(inviteId)
      .then(result => {
        if (result === null) {
          console.log('>> /api/participate no result found')
          res.json({ new: true })
        } else {
          const state = result.get('state')
          if (tree.isDone(state)) {
            console.log('>> /api/participate done')
            res.json({ done: true })
          } else {
            console.log('>> /api/participate state', JSON.stringify(state, null, 2))
            const comparison = tree.getCurrentComparison(result.state)
            console.log('>> /api/participate comparison', comparison)
            return res.json({ comparison })
          }
        }
      })
  })
}
