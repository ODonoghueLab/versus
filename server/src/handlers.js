
const _ = require('lodash')
const shortid = require('shortid')
const prettyMs = require('pretty-ms')

const models = require('./models')
const twochoice = require('./modules/twochoice')
const util = require('./modules/util')
const multiple = require('./modules/multiple')

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
  let errors = []
  if (!user.name) {
    errors.push('no user name')
  }
  if (!user.email) {
    errors.push('no email')
  }
  if (!user.password) {
    errors.push('no Password')
  }

  if (errors.length > 0) {
    throw errors.join(', ').join(errors)
  }

  let values = {
    name: user.name,
    email: user.email,
    password: user.password
  }

  try {
    await models.createUser(values)
    return {success: true}
  } catch (e) {
    throw 'Couldn\'t register, is your email already in use?'
  }
}

/**
 * Updates user where the id field is used to identify the user.
 * @param {Object} user
 * @promise {User}
 */
async function updateUser (user) {
  const keys = ['id', 'name', 'email', 'password']
  let values = {}
  for (let key of keys) {
    if (user[key]) {
      values[key] = user[key]
    }
  }

  if (!values) {
    throw 'No values to update'
  }

  if (!values.id) {
    throw 'No user.id to identify user'
  }

  try {
    console.log('>> handlers.updateUser', values)
    await models.updateUser(values)
    return {success: true}
  } catch (err) {
    throw 'Couldn\'t update user - ' + err.toString()
  }
}

async function publicForceUpdatePassword (user) {
  const keys = ['id', 'password']
  let values = {}
  for (let key of keys) {
    if (user[key]) {
      values[key] = user[key]
    }
  }

  if (!values) {
    throw 'No values to update'
  }

  if (!values.id) {
    throw 'No user.id to identify user'
  }

  try {
    console.log('>> handlers.publicForceUpdatePassword', values)
    await models.updateUser(values)
    return {success: true}
  } catch (err) {
    throw 'Couldn\'t update' + err
  }
}

async function updateParticipant (participant, experimentAttr) {
  let attr = participant.attr

  if (experimentAttr.questionType === '2afc') {
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
        if (comparison.repeat) {
          attr.nnComparisonDone += 1
        }
      }
    }
    attr.progress = attr.nComparisonDone / experimentAttr.maxComparison * 100
    attr.time = prettyMs(time)
    attr.version = 2
  } else {
    attr.nRepeatTotal = 0
    attr.consistency = 0
    attr.nComparisonDone = 0
    let time = 0
    if (!_.isUndefined(participant.states.answers)) {
      for (let answer of participant.states.answers) {
        if (answer.startTime) {
          if (answer.repeatValue === answer.value) {
            attr.consistency += 1
          }
          let startMs = new Date(answer.startTime).getTime()
          let endMs = new Date(answer.endTime).getTime()
          time += endMs - startMs
        }
        attr.nComparisonDone += 1
        if (answer.repeatValue) {
          attr.nComparisonDone += 1
          attr.nRepeatTotal += 1
        }
      }
    }
    attr.progress = attr.nComparisonDone / experimentAttr.maxComparison * 100
    attr.time = prettyMs(time)
    attr.version = 2
  }

  await models.saveParticipant(participant.participateId, {attr})
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

  if (experiment.attr.questionType === '2fac') {
    experiment.attr.maxComparison = experiment.attr.maxTreeComparison + experiment.attr.nRepeat
  } else if (experiment.attr.questionType === 'multiple') {
    let probRepeat = 0.2
    let maxTreeComparison = experiment.attr.imageSetIds.length
    let nRepeat = Math.ceil((probRepeat) * maxTreeComparison)
    let maxComparison = maxTreeComparison + nRepeat
    experiment.attr = _.assign(experiment.attr, {
      nRepeat,
      maxTreeComparison,
      maxComparison
    })
  }

  await models.saveExperimentAttr(experiment.id, experiment.attr)

  if (experiment.participants) {
    for (let participant of experiment.participants) {
      await updateParticipant(participant, experiment.attr)
    }
  }
}

async function updateDatabaseOnInit () {
  let experiments = await models.fetchAllExperiments()
  for (let experiment of experiments) {
    await updateExperimentStructure(experiment)
  }
}

updateDatabaseOnInit()

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
    await updateParticipant(participant, experiment.attr)
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

/**
 * @param participateId
 * @returns {Promise<*>}
 */

async function publicGetNextChoice (participateId) {
  console.log('> handlers.publicGetNextChoice')
  let participant = await models.fetchParticipant(participateId)
  let states = participant.states

  let experiment = await models.fetchExperiment(participant.ExperimentId)
  let experimentAttr = experiment.attr
  let urls = _.map(experiment.images, 'url')

  if (participant.attr.user === null) {
    return {
      status: 'start',
      experimentAttr,
      urls
    }
  }

  await updateParticipant(participant, experiment.attr)

  if (experiment.attr.questionType === '2afc') {
    if (twochoice.isStatesDone(states)) {
      return {
        status: 'done',
        surveyCode: await getSurveyCode(participateId)
      }
    } else {
      return {
        status: 'running2afc',
        urls,
        experimentAttr,
        progress: participant.attr.progress,
        comparison: twochoice.getComparison(twochoice.getRandomUnfinishedState(states))
      }
    }
  } else if (experiment.attr.questionType === 'multiple') {
    let isDone = (participant.attr.nComparisonDone >= experiment.attr.maxTreeComparison) &&
      (participant.attr.nRepeatTotal >= experimentAttr.nRepeat)
    if (isDone) {
      return {
        status: 'done',
        surveyCode: await getSurveyCode(participateId)
      }
    } else {
      let query = multiple.makeThisQuery(experiment, participant)
      return {
        status: 'runningMultiple',
        urls,
        experimentAttr,
        progress: participant.attr.progress,
        question: query.question,
        choices: query.choices
      }
    }
  }
}

async function publicChoose2afc (participateId, comparison) {
  let participant = await models.fetchParticipant(participateId)
  let urlA = comparison.itemA.url
  let imageSetId = models.extractId(urlA)
  let states = participant.states
  let state = states[imageSetId]
  twochoice.makeChoice(state, comparison)
  await models.saveParticipant(participateId, {states})
  return publicGetNextChoice(participateId)
}

function pushToListProp (o, key, item) {
  if (!(key in o)) {
    o[key] = []
  }
  o[key].push(item)
}

async function publicChooseMultiple (participateId, question, answer) {
  let participant = await models.fetchParticipant(participateId)
  answer.endTime = util.getCurrentTimeStr()
  if (!answer.isRepeat) {
    participant.states.answers.push(answer)
    pushToListProp(participant.states, 'toRepeatIds', answer.imageSetId)
  } else {
    let originalAnswer = _.find(participant.states.answers, a => a.imageSetId === answer.imageSetId)
    _.remove(participant.states.toRepeatIds, id => id === answer.imageSetId)
    console.log(answer, originalAnswer, participant.states.toRepeatIds)
    originalAnswer.repeatValue = answer.value
  }
  console.log('> handlers.publicChooseMultiple', participant.states)
  await models.saveParticipant(participateId, {states: participant.states})
  return publicGetNextChoice(participateId)
}

async function publicSaveParticipantUserDetails (participateId, user) {
  let participant = await models.fetchParticipant(participateId)
  participant.attr.user = user
  await models.saveParticipant(participateId, {attr: participant.attr})
  return publicGetNextChoice(participateId)
}

/**
 * Upload functions - first parameter is always a filelist object
 * @param {Array<File>} filelist - a browser filelist object
 * @param {String} userId
 * @param {Object} attr
 */
async function uploadImagesAndCreateExperiment (filelist, userId, attr) {
  try {
    let paths = await models.storeFilesInConfigDir(filelist)

    let imageSetIds = []
    let nImageById = {}
    for (let path of paths) {
      let imageSetId = models.extractId(path)
      if (!_.includes(imageSetIds, imageSetId)) {
        imageSetIds.push(imageSetId)
        nImageById[imageSetId] = 0
      }
      nImageById[imageSetId] += 1
    }

    attr.imageSetIds = imageSetIds
    console.log('>> routes.uploadImagesAndCreateExperiment attr', attr)

    let urls = _.map(paths, f => '/file/' + f)

    if (attr.questionType === '2afc') {
      _.assign(attr, twochoice.calcTreeAttr(_.values(nImageById), twochoice.probRepeat))
    } else if (attr.questionType === 'multiple') {
      let nQuestion = imageSetIds.length
      let probRepeat = 0.2
      let nRepeat = Math.ceil(probRepeat * nQuestion)
      _.assign(attr, {
        nQuestion,
        nRepeat,
        maxComparisons: nQuestion + nRepeat,
      })
    }

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
