const _ = require('lodash')
const shortid = require('shortid')
const prettyMs = require('pretty-ms')
const path = require('path')
const fs = require('fs-extra')

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

function getTime (answer) {
  let startMs = new Date(answer.startTime).getTime()
  let endMs = new Date(answer.endTime).getTime()
  return endMs - startMs
}

async function updateParticipant (participant, experimentAttr) {
  let id = participant.participateId
  let attr = participant.attr
  let states = participant.states

  attr.nAnswer = 0
  attr.nRepeatAnswer = 0
  attr.nConsistentAnswer = 0

  let time = 0

  if (experimentAttr.questionType === '2afc') {
    for (let state of _.values(states)) {
      for (let comparison of state.comparisons) {
        time += getTime(comparison)
        attr.nAnswer += 1
        if (comparison.repeat !== null) {
          attr.nAnswer += 1
          attr.nRepeatAnswer += 1
          if (comparison.choice === comparison.repeat) {
            attr.nConsistentAnswer += 1
          }
        }
      }
    }
    attr.isDone = twochoice.isStatesDone(states)
  } else {
    if (!_.isUndefined(states.answers)) {
      for (let answer of states.answers) {
        time += getTime(answer)
        attr.nAnswer += 1
        if ('repeatValue' in answer) {
          attr.nAnswer += 1
          attr.nRepeatAnswer += 1
          if (answer.repeatValue === answer.value) {
            attr.nConsistentAnswer += 1
          }
        }
      }
    }
    attr.isDone = multiple.isDone(experimentAttr, participant)
  }

  attr.progress = attr.nAnswer / experimentAttr.nQuestion * 100
  attr.time = prettyMs(time)
  attr.version = 2

  if (attr.isDone) {
    if (!attr.surveyCode) {
      attr.surveyCode = shortid.generate()
    }
  }

  await models.saveParticipant(id, {attr, states})
}

/**
 * Checks experiment.attr and participant.attr
 * @param experiment
 * @returns {Object} experiment
 */
async function updateExperimentAttr (experiment) {
  console.log('> handlers.updateExperimentStructure experiment', experiment.attr.name)
  if (experiment.attr.params) {
    _.assign(experiment.attr, experiment.attr.params)
    delete experiment.attr.params
  }

  function replaceAttrKey (oldKey, newKey) {
    if (oldKey in experiment.attr) {
      experiment.attr[newKey] = experiment.attr[oldKey]
      delete experiment.attr[oldKey]
    }
  }

  replaceAttrKey('maxComparisons', 'nQuestionMax')
  replaceAttrKey('maxTreeComparison', 'nQuestionMax')
  replaceAttrKey('nRepeatAnswer', 'nRepeatQuestionMax')
  replaceAttrKey('nRepeatMax', 'nRepeatQuestionMax')
  replaceAttrKey('nRepeat', 'nRepeatQuestionMax')

  if (experiment.attr.questionType === 'multiple') {
    let probRepeat = 0.2
    let nQuestionMax = experiment.attr.imageSetIds.length
    let nRepeatMax = Math.ceil((probRepeat) * nQuestionMax)
    experiment.attr.nQuestionMax = nQuestionMax
    experiment.attr.nRepeatQuestionMax = nRepeatMax
  }

  if (!('questionType' in experiment.attr)) {
    experiment.attr.questionType = '2afc'
  }

  experiment.attr.nQuestion =
    experiment.attr.nQuestionMax + experiment.attr.nRepeatQuestionMax

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
    await updateExperimentAttr(experiment)
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

  console.log('> handlers.publicGetNextChoice', experiment.attr)

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
      _.assign(attr, twochoice.calcExperimentAttr(
        _.values(nImageById), twochoice.probRepeat))
    } else if (attr.questionType === 'multiple') {
      let probRepeat = 0.2
      let nQuestionMax = imageSetIds.length
      let nRepeatQuestionMax = Math.ceil(probRepeat * nQuestionMax)
      let nQuestion = nQuestionMax + nRepeatQuestionMax
      _.assign(attr, {nQuestionMax, nRepeatQuestionMax, nQuestion})
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

  let rows = []

  if (experiment.attr.questionType === '2afc') {
    let isFoundHeader = false
    let imageSet = {}

    let headerRow = ['participantId', 'surveyCode', 'time']

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
        participant.attr.time
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
    rows.unshift(headerRow)

    for (let participant of experiment.participants) {
      rows.push(['---'])
      rows.push(['participantId', participant.participateId])
      for (let state of _.values(participant.states)) {
        for (let comparison of state.comparisons) {
          let fnameA = path.basename(comparison.itemA.url)
          let fnameB = path.basename(comparison.itemA.url)
          let time = getTime(comparison)
          let choice
          if (comparison.itemA.value === comparison.choice) {
            choice = fnameA
          } else {
            choice = fnameB
          }
          rows.push([fnameA, fnameB, choice, prettyMs(time)])
        }
      }
    }
  }

  if (experiment.attr.questionType === 'multiple') {
    let isFoundHeader = false
    let headerRow = ['participantId', 'surveyCode', 'time']
    for (let participant of experiment.participants) {
      if (!isFoundHeader) {
        headerRow = _.concat(headerRow, experiment.attr.imageSetIds)
        rows.push(headerRow)
        let row = ['answer', '', '']
        isFoundHeader = true
        for (let id of experiment.attr.imageSetIds) {
          let image = _.find(experiment.images, image => {
            let urlId = util.extractId(image.url)
            if (urlId !== id) {
              return false
            }
            return _.includes(image.url, 'question')
          })
          console.log('url', id, image.url)
          let value = _.last(path.parse(image.url).name.split('_'))
          row.push(`="${value}"`)
        }
        rows.push(row)
        console.log('> makeResultCsv header', headerRow)
      }

      let row = [
        participant.participateId,
        participant.attr.surveyCode,
        participant.attr.time
      ]

      for (let id of experiment.attr.imageSetIds) {
        let answer = _.find(participant.states.answers, a => a.imageSetId === id)
        let value = ''
        if (answer) {
          value = `="${answer.value}"`
        }
        console.log('answer', id, value)
        row.push(`${value}`)
      }
      rows.push(row)
    }
  }

  const timestampDir = String(new Date().getTime())
  const fullDir = path.join(config.filesDir, timestampDir)
  fs.ensureDirSync(fullDir)

  let filename = path.join(config.filesDir, timestampDir, 'results.csv')

  let result = ''
  for (let row of rows) {
    result += row.join(',') + '\n'
  }

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
