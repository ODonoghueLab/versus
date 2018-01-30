const path = require('path')

const _ = require('lodash')
const shortid = require('shortid')
const prettyMs = require('pretty-ms')

const models = require('./models')
const tree = require('./modules/tree')

/**
 *
 * handlers.js - this module holds all the functions that are accessible
 * to the web-client in the JSON-RPC api. It binds the database to the
 * binary-tree search functions
 *
 * Any functions defined in the module exports can be accessed by the
 * corresponding `rpc` module in the client. These are accessed by their
 * names, where a name starting with public are publicly accessible
 * API. All other functions need the user to have already logged-in.
 *
 * The functions must return a promise that returns a JSON-literal.
 * For security, all returned functions must be wrapped in a dictionary.
 *
 * Functions that handle file-uploads from the client start with
 * upload, and the first parameter will be a filelist object that
 * determines the names and locations of the uploaded files on the
 * server.
 */

/**
 * User handlers
 */

async function publicRegisterUser (user) {
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
}

/**
 * Updates user where the id field is used to identify the user.
 * Without the id set, the user will not be able to be retrieved
 * from the database
 * @param {Object} user
 * @returns {Promise.<Object>}
 */
async function updateUser (user) {
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
}

async function publicForceUpdatePassword (user) {
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
}

function isStatesDone (states) {
  for (let state of _.values(states)) {
    if (!tree.isDone(state)) {
      return false
    }
  }
  return true
}

function getCurrentTimeStr () {
  let date = new Date()
  return date.toJSON()
}

function getRandomUnfinishedState (states) {
  let choices = []
  for (let [id, state] of _.toPairs(states)) {
    if (!tree.isDone(state)) {
      _.times(
        state.imageUrls.length,
        () => { choices.push(id) })
    }
  }
  let id = choices[_.random(choices.length - 1)]
  return states[id]
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
  return nComparison / experimentAttr.maxComparison * 100
}

/**
 * Specific handlers - promises that return a JSON literal
 */

async function getExperimentSummaries (userId) {
  let experiments = await models.fetchExperiments(userId)
  let payload = {experiments: []}
  for (let experiment of experiments) {
    console.log('> handlers.getExperimentSummaries', experiment)
    payload.experiments.push({id: experiment.id, attr: experiment.attr})
  }
  return payload
}

async function getExperiment (experimentId) {
  let experiment = await models.fetchExperiment(experimentId)
  for (let participant of experiment.participants) {
    let attr = calcParticipant2afcAttr (participant)
    await models.saveParticipantAttr(participant.participateId, attr)
  }
  return {experiment}
}

function saveExperimentAttr (experimentId, attr) {
  return models.saveExperimentAttr(experimentId, attr)
}

function deleteExperiment (experimentId) {
  return models
    .deleteExperiment(experimentId)
    .then(() => {
      return {success: true}
    })
    .catch(err => {
      return {success: false, error: err}
    })
}

async function publicInviteParticipant (experimentId, email) {
  let participant = await models.createParticipant(experimentId, email)
  return {participant}
}

function deleteParticipant (participantId) {
  return models
    .deleteParticipant(participantId)
    .then(() => {
      return {success: true}
    })
    .catch(err => {
      return {success: false, error: err}
    })
}

async function getSurveyCode (participateId) {
  let participant = await models.fetchParticipant(participateId)
  let attr = participant.attr
  if (!attr.surveyCode) {
    attr.surveyCode = shortid.generate()
    await models.saveParticipant(participateId, {attr})
  }
  return attr.surveyCode
}

async function publicGetNextChoice (participateId) {
  let participant = await models.fetchParticipant(participateId)
  let experiment = await models.fetchExperiment(participant.ExperimentId)
  updateExperimentStructure(experiment)
  let experimentAttr = experiment.attr
  let urls = _.map(experiment.images, 'url')
  let states = participant.states

  if (participant.attr.user === null) {
    return {status: 'start', experimentAttr, urls}
  }

  if (experiment.attr.questionType === '2afc') {
    if (!isStatesDone(states)) {
      return {
        status: 'running2afc',
        urls,
        experimentAttr,
        comparison: tree.getComparison(getRandomUnfinishedState(states)),
        progress: calcParticipantProgress(participant, experimentAttr)
      }
    } else { // isDone!
      return {
        status: 'done',
        surveyCode: await getSurveyCode(participateId)
      }
    }
  }

  if (experiment.attr.questionType === 'multiple') {

    let unAnsweredImageSetids = _.clone(experiment.attr.imageSetIds)
    for (let answer of states) {
      _.remove(unAnsweredImageSetids, id => id === answer.imageSetId)
    }

    console.log('handlers.publicGetNextChoice', unAnsweredImageSetids)

    if (unAnsweredImageSetids.length > 0) {
      let i = parseInt(Math.random() * unAnsweredImageSetids.length - 1)
      let imageSetId = unAnsweredImageSetids[i]
      let question
      let choices = []
      for (let url of _.map(experiment.images, 'url')) {
        if (!_.includes(url, imageSetId)) {
          continue
        }
        if (_.includes(url, 'question')) {
          question = {
            url,
            imageSetId,
            value: _.last(path.parse(url).name.split('_'))
          }
        } else {
          choices.push({
            startTime: getCurrentTimeStr(),
            endTime: null,
            url,
            imageSetId,
            value: _.last(path.parse(url).name.split('_'))
          })
        }
      }
      return {
        status: 'runningMultiple',
        question,
        choices,
        experimentAttr,
        imageSetId
      }
    } else {
      return {
        status: 'done',
        surveyCode: await getSurveyCode(participateId)
      }
    }
  }
}

async function publicChoose2afc (participateId, comparison) {
  let participant = await models.fetchParticipant(participateId)
  let urlA = comparison.itemA.url
  let imageSetId = models.getImageSetIdFromPath(urlA)
  let states = participant.states
  let state = states[imageSetId]
  tree.makeChoice(state, comparison)
  await models.saveParticipant(participateId, {states})
  return publicGetNextChoice(participateId)
}

async function publicChooseMultiple (participateId, question, answer) {
  let participant = await models.fetchParticipant(participateId)
  answer.endTime = getCurrentTimeStr()
  let states = participant.states
  states.push(answer)
  console.log('> handlers.publicChooseMultiple', participant.states)
  await models.saveParticipant(participateId, {states})
  return publicGetNextChoice(participateId)
}

async function publicSaveParticipantUserDetails (participateId, user) {
  console.log('> handlers.publicSaveParticipantUserDetails user', user)
  await models.saveParticipantAttr(participateId, {user: user})
  return publicGetNextChoice(participateId)
}

/**
 * Upload functions - first parameter is always a filelist object
 * This is meant to be called by
 *   `rpc.upload('uploadImagesAndCreateExperiment', userId, attr)`
 * in the client.
 * @param {Array<File>} files - a browser filelist object
 * @param {String} userId
 * @param {Object} attr
 */
async function uploadImagesAndCreateExperiment (files, userId, attr) {
  try {
    let paths = await models.storeFilesInConfigDir(files)

    let imageSetIds = []
    let nImageById = {}
    for (let path of paths) {
      let imageSetId = models.getImageSetIdFromPath(path)
      if (!_.includes(imageSetIds, imageSetId)) {
        imageSetIds.push(imageSetId)
        nImageById[imageSetId] = 0
      }
      nImageById[imageSetId] += 1
    }

    _.assign(attr, tree.calcTreeAttr(_.values(nImageById), tree.probRepeat))
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

async function calcParticipant2afcAttr (participant) {
  let attr = participant.attr
  attr.nRepeatTotal = 0
  attr.consistency = 0
  attr.nComparisonDone = 0
  for (let state of _.values(participant.states)) {
    attr.nRepeatTotal += state.consistencies.length
    attr.consistency += _.sum(state.consistencies)
    attr.nComparisonDone += state.comparisons.length
  }
  let time = 0
  for (let state of _.values(participant.states)) {
    for (let comparison of state.comparisons) {
      let startMs = new Date(comparison.startTime).getTime()
      let endMs = new Date(comparison.endTime).getTime()
      time += endMs - startMs
    }
  }
  attr.time = prettyMs(time)
  attr.version = 2
  return attr
}

/**
 * Checks experiment.attr and participant.attr
 * @param experiment
 * @returns {Object} experiment
 */
async function updateExperimentStructure (experiment) {
  console.log('> handlers.updateExperimentStructure experiment', experiment.attr.name)
  if (experiment.attr.params) {
    _.assign(experiment.attr, experiment.attr.params)
    delete experiment.attr.params
  }

  if (experiment.attr.maxComparisons) {
    experiment.attr.maxTreeComparison = experiment.attr.maxComparisons
    delete experiment.attr.maxComparisons
  }

  experiment.attr.maxComparison =
    experiment.attr.maxTreeComparison +
    experiment.attr.nRepeat

  experiment.attr.version = 9

  await models.saveExperimentAttr(experiment.id, experiment.attr)

  // Calculate statistics of finished experiment
  if (experiment.participants) {
    for (let participant of experiment.participants) {
      if (experiment.attr.questionType === '2afc') {
        let attr = calcParticipant2afcAttr(participant)
        await models.saveParticipantAttr(participant.participateId, attr)
      }
    }
  }
}

async function updateDb () {
  let experiments = await models.fetchAllExperiments()
  for (let experiment of experiments) {
    await updateExperimentStructure(experiment)
  }
}

updateDb()

module.exports = {
  publicRegisterUser,
  updateUser,
  publicForceUpdatePassword,
  getExperimentSummaries,
  getExperiment,
  saveExperimentAttr,
  deleteExperiment,
  publicInviteParticipant,
  deleteParticipant,
  publicGetNextChoice,
  publicChoose2afc,
  publicChooseMultiple,
  publicSaveParticipantUserDetails,
  uploadImagesAndCreateExperiment
}
