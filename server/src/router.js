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
const express = require('express')

const router = express.Router()

module.exports = router

/**
 * User routes - login/register etc.
 */

/**
 *  Public functions for json-rpc-api
 */

let remoteRunFns = {

  publicRegisterUser (user) {
    return new Promise(resolve => {
      const keys = ['name', 'email', 'password', 'passwordv']

      let errors = []
      if (!user.name) {
        errors.push('Please Enter Your User Name')
      }
      if (!user.email) {
        errors.push('Please Enter Your Email')
      }
      if (!user.password) {
        errors.push('Please Enter Both Password Fields')
      }
      if (user.password !== user.passwordv) {
        errors.push('Passwords Do Not Match')
      }

      let values = {
        name: user.name,
        email: user.email,
        password: user.password
      }

      if (errors.length > 0) {
        resolve({
          success: false,
          errors: errors
        })
      } else {
        models
          .createUser(values)
          .then(() => {
            resolve({success: true})
          })
          .catch(err => {
            resolve({
              success: false,
              errors: ['Couldn\' register, is your email already in use?']
            })
          })
      }
    })
  },

  updateUser (user) {
    return new Promise((resolve) => {
      const keys = ['id', 'name', 'email', 'password']
      let values = {}
      for (let key of keys) {
        if (user[key]) {
          values[key] = user[key]
        }
      }
      if (values) {
        models
          .updateUser(values)
          .then(user => {
            console.log('>> /api/update success', values, user)
            resolve({success: true})
          })
          .catch(err => {
            console.log(`>> /api/update error`, err)
            resolve({
              success: false,
              errors: ['Couldn\' register, is your email already in use?']
            })
          })
      } else {
        resolve({success: false})
      }
    })
  },

  getExperiments (userId) {
    return models
      .fetchExperiments(userId)
      .then(experiments => {
        console.log('> router.getExperiments', experiments)
        return {experiments}
      })
  },

  getExperiment (experimentId) {
    return models
      .fetchExperiment(experimentId)
      .then(experiment => {
        console.log('> router.getExperiment', experiment)
        return {experiment}
      })
  },

  saveExperimentAttr (experimentId, attr) {
    return models
      .saveExperimentAttr(experimentId, attr)
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
        if (participant.user === null) {
          console.log('>> /participate no result found')
          return {new: true}
        } else {
          return models
            .fetchExperiment(participant.ExperimentId)
            .then(experiment => {
              const state = participant.state
              if (tree.isDone(state)) {
                console.log('>> /participate done')
                return {done: true}
              } else {
                const comparison = tree.getComparison(participant.state)
                console.log('>> /participate comparison', comparison)
                return {
                  comparison,
                  attr: experiment.attr }
              }
            })
        }
      })
  },

  chooseItem (participateId, chosenImageIndex) {
    return models
      .fetchParticipant(participateId)
      .then(participant => {
        return models
          .fetchExperiment(participant.ExperimentId)
          .then(experiment => {
            let state = participant.state
            tree.makeChoice(state, chosenImageIndex)
            let payload
            if (tree.isDone(state)) {
              tree.rankNodes(state)
              payload = {done: true}
            } else {
              payload = {
                comparison: tree.getComparison(state),
                attr: experiment.attr
              }
            }
            return models
              .saveParticipant(participateId, {state})
              .then(() => {
                return payload
              })
          })
      })
  },

  saveParticipantUserDetails (participateId, details) {
    return models
      .saveParticipant(participateId, {user: details})
      .then(participant => {
        return models
          .fetchExperiment(participant.ExperimentId)
          .then(experiment => {
            return {
              comparison: tree.getComparison(participant.state),
              attr: experiment.attr
            }
          })
        })
  }
}

router.post('/api/rpc-run', (req, res, next) => {
  let args = req.body.args
  let fnName = req.body.fnName

  if (fnName === 'login') {

    req.body.email = args[0].email
    req.body.password = args[0].password

    passport.authenticate('local', (err, user) => {
      if (err) {
        return next(err)
      }
      if (!user) {
        return res.json({
          success: false,
          msg: 'user/password not found'
        })
      }
      req.logIn(user, (error) => {
        if (error) {
          console.log('>> /api/login error', err)
          return next(error)
        }
        console.log('>> /api/login user', user)
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
    const experimentDir = String(new Date().getTime())
    const fullExperimentDir = path.join(config.filesDir, experimentDir)
    if (!fs.existsSync(fullExperimentDir)) {
      fs.mkdirSync(fullExperimentDir, 0744)
    }

    let err = ''

    function rollback (msg) {
      for (let i = 0; i < uploadedFiles.length; i += 1) {
        del(uploadedFiles[i].path)
      }
      err = msg
    }

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
        inputPaths.push(file.path)
        let basename = path.basename(file.originalname)
        targetPaths.push(path.join(experimentDir, basename))
        try {
          console.log(`>> routes.storeFiles -> ${targetPaths[i]}`)
          fs.renameSync(inputPaths[i], path.join(config.filesDir, targetPaths[i]))
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

router.get('/image/:experimentDir/:basename', (req, res) => {
  let basename = req.params.basename
  let experimentDir = req.params.experimentDir
  console.log('> /image/', experimentDir, basename)
  let filename = path.join(config.filesDir, experimentDir, basename)
  let mimeType = mime.lookup(filename)
  res.setHeader('Content-disposition', `attachment; filename=${basename}`)
  res.setHeader('Content-type', mimeType)
  fs.createReadStream(filename).pipe(res)
})

let remoteUploadFns = {
  createExperimentWithUploadImages (files, userId, attr) {
    console.log('>> routes.remoteUploadFns', files, userId)
    return storeFiles(files)
      .then((paths) => {
        console.log('>> routes.createExperimentWithUploadImages paths', paths)
        return models
          .createExperiment(
            userId,
            attr,
            _.map(paths, f => '/image/' + f))
          .then(experiment => {
            console.log('> routers.createExperimentWithUploadImages output', experiment)
            return {
              success: true,
              experimentId: experiment.id
            }
          })
      })
  }
}

router.post('/api/rpc-upload', upload.array('uploadFiles'), (req, res) => {
  console.log('>> /api/rpc-upload')
  let fnName = req.body.fnName
  let args = JSON.parse(req.body.args)
  if (fnName in remoteUploadFns) {
    const uploadFn = remoteUploadFns[fnName]
    args = _.concat([req.files], args)
    uploadFn(...args)
      .then(result => {
        res.json(result)
      })
  } else {
    throw new Error(`Remote uploadFn ${fnName} not found`)
  }
})
