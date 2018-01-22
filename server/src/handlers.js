const path = require('path')

const _ = require('lodash')
const shortid = require('shortid')
const prettyMs = require('pretty-ms')

const models = require('./models')
const tree = require('./modules/tree')

/**

 handlers.js - this module holds all the functions that are accessible
 to the web-client in the JSON-RPC api. It binds the database to the
 binary-tree search functions

 Any functions defined in the module exports can be accessed by the
 corresponding `rpc` module in the client. These are accessed by their
 names, where a name starting with public are publicly accessible
 API. All other functions need the user to have already logged-in.

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

function calcExperimentParams (imageSizes, probRepeat) {
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

function calcParticipantAttrOfExperiment (experiment) {

  let participants = experiment.participants
  for (let participant of participants) {
    let attr = participant.attr
    attr.nRepeatTotal = 0
    attr.consistency = 0
    attr.nComparisonDone = 0
    let nComparison = 0
    let time = 0
    for (let state of _.values(participant.states)) {
      attr.nRepeatTotal += state.consistencies.length
      attr.consistency += _.sum(state.consistencies)
      attr.nComparisonDone += state.comparisons.length
      for (let comparison of state.comparisons) {
        nComparison += 1
        if (comparison.repeat) {
          nComparison += 1
        }
        let startMs = new Date(comparison.startTime).getTime()
        let endMs = new Date(comparison.endTime).getTime()
        time += endMs - startMs
      }
    }
    attr.time = prettyMs(time)

    let params = experiment.attr.params
    let maxComparison = params.maxComparisons + params.nRepeat
    attr.progress = nComparison / maxComparison * 100
  }

  return experiment
}

function calcParticipantProgress (participant, experimentAttr) {

  let nComparison = 0
  for (let state of _.values(participant.states)) {
    for (let comparison of state.comparisons) {
      nComparison += 1
      if (comparison.repeat) {
        nComparison += 1
      }
    }
  }
  let params = experimentAttr.params
  let maxComparison = params.maxComparisons + params.nRepeat
  return nComparison / maxComparison * 100

}

async function getNextComparison (participateId) {

  let participant = await models.fetchParticipant(participateId)

  let states = participant.states
  let imageSizes = _.map(_.values(states), s => s.imageUrls.length)

  let experiment = await models.fetchExperiment(participant.ExperimentId)
  let heading = experiment.attr
  let urls = _.map(experiment.images, 'url')

  let isRunning = !isStatesDone(states)
  let isUserInitialized = participant.attr.user !== null

  let payload

  if (isUserInitialized && isRunning) {

    const state = getRandomUnfinishedState(states)
    const comparison = tree.getComparison(state)
    let progress = calcParticipantProgress(participant, heading)
    payload = {comparison, urls, progress, heading}

  } else if (!isUserInitialized) {

    payload = {
      params: calcExperimentParams(imageSizes, tree.probRepeat),
      new: true,
      urls
    }

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
      return 'only .png, .jpg, .gif allowed'
    }

    // size checking
    if (file.size / 1000000 > 2) {
      return 'only images under 2MB allowed'
    }

  }
  return ''
}

module.exports = {

  async publicRegisterUser (user) {
    try {
      let errors = []
      if (!user.name) {
        errors.push('Please Enter Your User Name')
      }
      if (!user.email) {
        errors.push('Please Enter Your Email')
      }
      if (!user.password) {
        errors.push('Please Enter Password')
      }

      let values = {
        name: user.name,
        email: user.email,
        password: user.password
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors: errors
        }
      } else {
        await models.createUser(values)
        return {success: true}
      }

    } catch (error) {

      return {
        success: false,
        errors: ['Couldn\'t register, is your email already in use?']
      }

    }
  },

  /**
   * Updates user where the id field is used to identify the user.
   * Without the id set, the user will not be able to be retrieved
   * from the database
   * @param {Object} user
   * @returns {Promise.<Object>}
   */
  async updateUser (user) {
    try {

      const keys = ['id', 'name', 'email', 'password']
      let values = {}
      for (let key of keys) {
        if (user[key]) {
          values[key] = user[key]
        }
      }

      if (!values) {
        return {
          success: false,
          errors: ['No values to update']
        }
      }

      if (!values.id) {
        return {
          success: false,
          errors: ['No user.id to identify user']
        }
      }

      console.log('>> handlers.updateUser', values)
      await models.updateUser(values)
      return {success: true}

    } catch (err) {

      console.log(`>> handlers.updateUser error`, err)
      return {
        success: false,
        errors: ['Couldn\'t update' + err]
      }

    }
  },

  async publicForceUpdatePassword (user) {
    try {

      const keys = ['id', 'password']
      let values = {}
      for (let key of keys) {
        if (user[key]) {
          values[key] = user[key]
        }
      }

      if (!values.id) {
        return {
          success: false,
          errors: ['No user.id to identify to user']
        }
      }

      if (!values) {
        return {
          success: false,
          errors: ['No values to update']
        }
      }

      console.log('>> handlers.publicForceUpdatePassword', values)
      await models.updateUser(values)
      return {success: true}

    } catch (err) {

      console.log(`>> handlers.publicForceUpdatePassword error`, err)
      return {
        success: false,
        errors: ['Couldn\'t update' + err]
      }

    }
  },

  getExperimentSummaries (userId) {
    return models
      .fetchExperiments(userId)
      .then(experiments => {
        return {experiments}
      })
  },

  async getExperiment (experimentId) {
    let experiment = await models.fetchExperiment(experimentId)
    return {experiment: calcParticipantAttrOfExperiment(experiment)}
  },

  saveExperimentAttr (experimentId, attr) {
    return models.saveExperimentAttr(experimentId, attr)
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
    let participant = await models.fetchParticipant(participateId)

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

  /**
   * Upload functions - first parameter is always a filelist object
   * This is meant to be called by
   *   `rpc.upload('uploadImagesAndCreateExperiment', userId, attr)`
   * in the client.
   * @param {Array<File>} files - a browser filelist object
   * @param {String} userId
   * @param {Object} attr
   */
  async uploadImagesAndCreateExperiment (files, userId, attr) {
    try {

      let paths = await models.storeFiles(files, checkImageFilesForError)

      let imageSetIds = []
      let nImages = {}
      for (let path of paths) {
        let imageSetId = models.getImageSetIdFromPath(path)
        if (!_.includes(imageSetIds, imageSetId)) {
          imageSetIds.push(imageSetId)
          nImages[imageSetId] = 0
        }
        nImages[imageSetId] += 1
      }

      for (let imageSetId of _.keys(nImages)) {
        if (nImages[imageSetId] < 2) {
          throw new Error(
            `image set "${imageSetId}" must include more than 1 image`)
        }
      }

      if (!attr.name) {
        throw new Error('must have experiment name')
      }

      attr.params = calcExperimentParams(_.values(nImages), tree.probRepeat)
      attr.imageSetIds = imageSetIds
      console.log('>> routes.uploadImagesAndCreateExperiment attr', attr)

      let urls = _.map(paths, f => '/file/' + f)

      let experiment = await models.createExperiment(userId, attr, urls)

      console.log(
        '> routers.uploadImagesAndCreateExperiment output', experiment)

      return {
        success: true,
        experimentId: experiment.id
      }

    } catch (error) {

      return {success: false, error: error.toString()}

    }
  }
}


