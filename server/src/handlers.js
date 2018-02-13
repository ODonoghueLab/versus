const _ = require('lodash')
const shortid = require('shortid')
const prettyMs = require('pretty-ms')
const path = require('path')
const fs = require('fs')

const config = require('./config')
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
 *
 * User handlers
 *
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
    throw `Update failure ${err}`
  }
}

async function updateParticipant (participant, experimentAttr) {
  let attr = participant.attr

  attr.nRepeatTotal = 0
  attr.consistency = 0
  attr.nComparisonDone = 0
  let time = 0

  if (experimentAttr.questionType === '2afc') {
    for (let state of _.values(participant.states)) {
      for (let comparison of state.comparisons) {
        let startMs = new Date(comparison.startTime).getTime()
        let endMs = new Date(comparison.endTime).getTime()
        time += endMs - startMs
        attr.nComparisonDone += 1
        if (comparison.repeat !== null) {
          attr.nComparisonDone += 1
          attr.nRepeatTotal += 1
          if (comparison.choice === comparison.repeat) {
            attr.consistency += 1
          }
        }
      }
    }
    attr.isDone = twochoice.isStatesDone(participant.states)
  } else {
    if (!_.isUndefined(participant.states.answers)) {
      for (let answer of participant.states.answers) {
        if (answer.startTime) {
          let startMs = new Date(answer.startTime).getTime()
          let endMs = new Date(answer.endTime).getTime()
          time += endMs - startMs
        }
        attr.nComparisonDone += 1
        if ('repeatValue' in answer) {
          attr.nComparisonDone += 1
          attr.nRepeatTotal += 1
          if (answer.repeatValue === answer.value) {
            attr.consistency += 1
          }
        }
      }
    }
    attr.isDone = multiple.isDone(experimentAttr, participant)
  }

  attr.progress = attr.nComparisonDone / experimentAttr.maxComparison * 100
  console.log('> updateParticipant experimentAttr\n', experimentAttr)
  console.log('> updateParticipant progress', attr.nComparisonDone, experimentAttr.maxComparison)
  attr.time = prettyMs(time)
  attr.version = 2

  if (attr.isDone) {
    if (!attr.surveyCode) {
      attr.surveyCode = shortid.generate()
    }
  }

  await models.saveParticipant(participant.participateId, {attr, states: participant.states})
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

  if (experiment.attr.questionType === '2afc') {
    experiment.attr.maxComparison = experiment.attr.maxTreeComparison + experiment.attr.nRepeat
  }

  if (experiment.attr.questionType === 'multiple') {
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

  if (participant.attr.isDone) {
    return {
      status: 'done',
      surveyCode: participant.attr.surveyCode
    }
  } else if (experiment.attr.questionType === '2afc') {
    return {
      status: 'running',
      method: 'publicChoose2afc',
      urls,
      experimentAttr,
      choices: twochoice.getChoices(states),
      progress: participant.attr.progress
    }
  } else if (experiment.attr.questionType === 'multiple') {
    let {question, choices} = multiple.makeChoices(experiment, participant)
    return {
      status: 'running',
      method: 'publicChooseMultiple',
      urls,
      experimentAttr,
      question,
      choices,
      progress: participant.attr.progress,
    }
  }
}

async function publicChoose2afc (participateId, choice) {
  let comparison = choice.comparison
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

async function publicChooseMultiple (participateId, answer) {
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

async function downloadResults (experimentId) {

  console.log('> handlers.downloadResults experiment', experimentId)

  let experiment = await models.fetchExperiment(experimentId)

  let isFoundHeader = false
  let imageSet = {}

  let headerRow = ['participantId', 'surveyCode', 'time']
  let rows = []

  for (let participant of experiment.participants) {

    if (!isFoundHeader) {
      for (let [imageSetId, state] of _.toPairs(participant.states)) {
        imageSet[imageSetId] = {
          imageUrls: state.imageUrls,
          iImage: {}
        }
        headerRow = _.concat(headerRow, state.imageUrls)
        _.each(state.imageUrls, (url, i) => {
          imageSet[imageSetId].iImage[url] = i
        })
      }
      isFoundHeader = true
      console.log('> makeResultCsv header', headerRow)
    }

    let row = [
      participant.participateId,
      participant.attr.surveyCode,
      participant.time
    ]

    for (let [imageSetId, state] of _.toPairs(participant.states)) {
      let thisRow = util.makeArray(state.rankedImageUrls.length, '')
      if (!_.isUndefined(state.rankedImageUrls) && (state.rankedImageUrls.length > 0)) {
        _.each(state.rankedImageUrls, (url, iRank) => {
          thisRow[imageSet[imageSetId].iImage[url]] = iRank
        })
      }
      row = _.concat(row, thisRow)
    }

    console.log('> downloadResults row', row)

    rows.push(row)
  }

  headerRow = _.map(headerRow, h => path.basename(h))
  let result = headerRow.join(',') + '\n'
  for (let row of rows) {
    result += row.join(',') + '\n'
  }

  const timestampDir = String(new Date().getTime())
  const fullDir = path.join(config.filesDir, timestampDir)
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, 0o744)
  }

  let filename = path.join(config.filesDir, timestampDir, 'results.csv')
  fs.writeFileSync(filename, result)
  console.log('> downloadResults filename', filename)

  return {
    filename,
    result: {success: true}
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
  uploadImagesAndCreateExperiment,
  downloadResults
}
