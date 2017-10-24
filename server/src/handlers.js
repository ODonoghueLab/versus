const path = require('path')

const _ = require('lodash')
const shortid = require('shortid')

const models = require('./models')
const tree = require('./modules/tree')

/**

 handlers.js - this module holds all the functions that are accessible
 to the web-client in the JSON-RPC api. It binds the database to the
 binary-tree search functions

 Any functions defined in the module exports can be accessed by the
 correspoding `rpc` module in the client. These are accessed by their
 names, where a name starting with public are publically accessible
 api's. All other functions need the user to have already logged-in.

 The functions must return a promise that returns a JSON-literal.
 For security, all returned functions must be wrapped in a dictionary.

 Functions that handle file-uploads from the client start with
 upload, and the first parameter will be a filelist object that
 determines the names and locations of the uploaded files on the
 server.
 */

function isStatesDone (states) {
  for (let state of _.values(states)) {
    if (!tree.isDone(state)) {
      return false
    }
  }
  return true
}


function getRandomUnfinishedState (states) {
  let choices = []
  for (let [id, state] of _.toPairs(states)) {
    if (!tree.isDone(state)) {
      for (let j of _.range(state.imageUrls.length)) {
        choices.push(id)
      }
    }
  }
  let id = choices[_.random(choices.length - 1)]
  return states[id]
}


function getParams (imageSizes, probRepeat) {
  let params = {
    nImage: 0,
    maxComparisons: 0,
    nRepeat: 0
  }
  for (let n of imageSizes) {
    let maxComparisons = Math.ceil(n * Math.log2(n))
    let nRepeat = Math.ceil(probRepeat * maxComparisons)
    params.nImage += n
    params.maxComparisons += maxComparisons
    params.nRepeat += nRepeat
  }
  return params
}


async function getNextComparison (participateId) {

  let participant = await models.fetchParticipant(participateId)
  let states = participant.states
  let imageSizes = _.map(_.values(states), s => s.imageUrls.length)
  let nodeSetSizes = _.map(_.values(states), s => s.nodes.length)
  let nNodeTotal = _.sum(nodeSetSizes)
  let nImageTotal = _.sum(imageSizes)
  let experiment = await models.fetchExperiment(participant.ExperimentId)
  const urls = _.map(experiment.images, 'url')

  let isRunning = !isStatesDone(states)
  let isUserInitialized = participant.attr.user !== null

  let payload

  if (isUserInitialized && isRunning) {

    const state = getRandomUnfinishedState(states)
    const comparison = tree.getComparison(state)
    payload = {
      comparison,
      attr: experiment.attr,
      urls,
      progress: {nImageTotal, nNodeTotal}
    }

  } else if (!isUserInitialized) {

    let params = getParams(imageSizes, tree.probRepeat)
    payload = {params, new: true, urls}

  } else { // isDone!

    // Generate surveyCode if it doesn't exist
    let attr = participant.attr
    if (!attr.surveyCode) {
      attr.surveyCode = shortid.generate()
      await models.saveParticipant(participateId, {states, attr})
    }
    payload = {done: true, surveyCode: attr.surveyCode}

  }

  console.log('>> handlers.getComparison', payload)
  return payload
}

/**
 * Returns error if a filelist contains an image file that cannot
 * be usefully displayed, used by uploadImagesAndCreateExperiment
 *
 * @param {FileList} files
 * @returns {String} - an error str if problem, else null string if correct
 */
function checkImageFilesForError (files) {
  if (files.length < 2) {
    return 'Minimum two images.'
  }
  for (let file of files) {

    // handle formats
    const extName = path.extname(file.originalname).toLowerCase()
    if (!_.includes(['.png', '.jpg', '.gif'], extName)) {
      return `only .png, .jpg, .gif`
    }

    // size checking
    if (file.size / 1000000 > 2) {
      return 'Please Keep Images Under 2MB'
    }

  }
  return ''
}


module.exports = {

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
            console.log('>> router.updateUser success', values, user)
            resolve({success: true})
          })
          .catch(err => {
            console.log(`>> router.updateUser error`, err)
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

  async publicInviteParticipant (experimentId, email) {
    let participant = await models.createParticipant(experimentId, email)
    return {participant}
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

  publicGetParticipant (participateId) {
    return getNextComparison(participateId)
  },

  async publicChooseItem (participateId, comparison) {
    let participant = await models.fetchParticipant(
      participateId)

    let experiment = await models.fetchExperiment(
      participant.ExperimentId)

    let urlA = comparison.itemA.url
    let imageSetId = models.getImageSetIdFromPath(urlA)
    let states = participant.states
    let state = states[imageSetId]
    tree.makeChoice(state, comparison)

    await models.saveParticipant(participateId, {states})

    return getNextComparison(participateId)
  },

  publicSaveParticipantUserDetails (participateId, user) {
    console.log('> handlers.publicSaveParticipantUserDetails user', user)
    return models
      .saveParticipantAttr(participateId, {user: user})
      .then(participant => {
        return getNextComparison(participateId)
      })
  },

  // Upload functions - first parameter is always a filelist object

  uploadImagesAndCreateExperiment (files, userId, attr) {
    return models
      .storeFiles(
        files, checkImageFilesForError)
      .then((paths) => {
        let imageSetIds = []
        let nImage = {}
        for (let path of paths) {
          let imageSetId = models.getImageSetIdFromPath(path)
          if (!_.includes(imageSetIds, imageSetId)) {
            imageSetIds.push(imageSetId)
            nImage[imageSetId] = 0
          }
          nImage[imageSetId] += 1
        }
        attr.params = getParams(_.values(nImage), tree.probRepeat)
        attr.imageSetIds = imageSetIds
        console.log('>> routes.uploadImagesAndCreateExperiment attr', attr)
        let urls = _.map(paths, f => '/file/' + f)
        return models
          .createExperiment(
            userId, attr, urls)
          .then(experiment => {
            console.log('> routers.uploadImagesAndCreateExperiment output', experiment)
            return {
              success: true,
              experimentId: experiment.id
            }
          })
      })
  }
}


