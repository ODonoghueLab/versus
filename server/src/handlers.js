const _ = require('lodash')
const shortid = require('shortid')
const path = require('path')
const fs = require('fs-extra')

const config = require('./config')
const models = require('./models')
const twochoice = require('./modules/twochoice')
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

async function updateParticipant (participant, experiment) {
  console.log('> handlers.updateParticipant', participant.participateId)
  if (experiment.attr.questionType === '2afc') {
    twochoice.updateParticipantStates(participant, experiment)
  } else {
    multiple.updateParticipantStates(participant, experiment)
  }
  if (participant.attr.status === 'done') {
    if (!participant.attr.surveyCode) {
      participant.attr.surveyCode = shortid.generate()
    }
  }
  await models.saveParticipant(
    participant.participateId,
    {
      attr: participant.attr,
      states: participant.states
    })
}

/**
 * Checks experiment.attr and participant.attr
 * @param experiment
 * @returns {Object} experiment
 */
async function updateExperimentAttr (experiment) {
  if (experiment.attr.params) {
    _.assign(experiment.attr, experiment.attr.params)
    delete experiment.attr.params
  }
  if (!('questionType' in experiment.attr)) {
    experiment.attr.questionType = '2afc'
  }

  let urls = _.map(experiment.images, 'url')

  if (!('fractionRepeat' in experiment.attr)) {
    experiment.attr.fractionRepeat = 0.2
  }
  experiment.attr.fractionRepeat = parseFloat(experiment.attr.fractionRepeat)

  if ('nQuestion' in experiment.attr) {
    delete experiment.attr.nQuestion
  }

  if (experiment.attr.questionType === '2afc') {
    _.assign(
      experiment.attr,
      twochoice.getExperimentAttr(urls, experiment.attr.fractionRepeat))
  } else if (experiment.attr.questionType === 'multiple') {
    _.assign(
      experiment.attr,
      multiple.getExperimentAttr(urls, experiment.attr.fractionRepeat))
  }

  let attr = experiment.attr
  if (!('text' in attr) || !('sectionKeys' in attr.text)) {
    if (attr.questionType === 'multiple') {
      attr.text = {
        sectionKeys: [
          'qualificationStart', 'qualificationFailed', 'start', 'running', 'done'],
        sections: {
          running: {
            header: 'Which image encode the contact shown in the 3D model?',
            blurb: 'Remember that your answers will be timed and checked for consistency'
          },
          qualificationStart: {
            header: '',
            blurb: 'You will now start a short qualification test. Please answer carefully'
          },
          done: {
            header: '',
            blurb: 'Your tests are done. Thank you. Your survey code is'
          },
          start: {
            header: 'Great Job!',
            blurb: 'You will now start the survey. Do not forget to copy the survey code provided at the end of the survey, and paste it into the Mechanical Turk page.'
          },
          qualificationFailed: {
            header: '',
            blurb: 'Sorry, you have not passed the qualification. Thank you for your time'
          }
        }
      }
    } else if (attr.questionType === '2afc') {
      attr.text = {
        sectionKeys: ['start', 'running', 'done'],
        sections: {
          running: {
            header: 'Which image looks better?',
            blurb: 'Click on the image that looks better. Take your time'
          },
          done: {
            header: '',
            blurb: 'Your tests are done. Thank you. Your survey code is'
          },
          start: {
            header: '',
            blurb: 'You will now start the survey. Do not forget to copy the survey code provided at the end of the survey, and paste it into the Mechanical Turk page.'
          }
        }
      }
    }
  }

  if ('title' in experiment.attr) {
    experiment.attr.text.sections.running.header = experiment.attr.title
    delete experiment.attr.title
    experiment.attr.text.sections.running.blurb = experiment.attr.blurb
    delete experiment.attr.blurb
  }

  console.log('> handlers.updateExperimentAttr',
    experiment.id,
    experiment.attr.name,
    experiment.attr.fractionRepeat,
    experiment.attr.probShowRepeat,
    experiment.attr.nAllQuestion)

  await models.saveExperimentAttr(experiment.id, experiment.attr)

  if (experiment.participants) {
    for (let participant of experiment.participants) {
      await updateParticipant(participant, experiment)
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
  console.log(`> getExperiment init`)
  let experiment = await models.fetchExperiment(experimentId)
  experiment.participants = _.sortBy(experiment.participants, p => -p.createdAt)
  return {experiment}
}

async function saveExperimentAttr (experimentId, attr) {
  let experiment = await models.fetchExperiment(experimentId)
  _.assign(experiment.attr, attr)
  await updateExperimentAttr(experiment)
  return {experiment}
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
  let participant = await models.fetchParticipant(participateId)
  let experiment = await models.fetchExperiment(participant.ExperimentId)
  let experimentAttr = experiment.attr
  let urls = _.map(experiment.images, 'url')

  await updateParticipant(participant, experiment)
  console.log(`> handlers.publicGetNextChoice participant`, participateId)

  let status = participant.attr.status
  if (status === 'done') {
    return {
      status,
      experimentAttr,
      surveyCode: participant.attr.surveyCode
    }
  } else if (_.includes(['qualifying', 'running'], status)) {
    let progress = participant.attr.progress
    let choices, question, method
    if (experiment.attr.questionType === '2afc') {
      choices = twochoice.getChoices(experiment, participant)
      method = 'publicChoose2afc'
    } else if (experiment.attr.questionType === 'multiple') {
      let result = multiple.getChoices(experiment, participant)
      question = result.question
      choices = result.choices
      method = 'publicChooseMultiple'
    }
    return {
      status,
      urls,
      experimentAttr,
      question,
      choices,
      progress,
      method
    }
  } else {
    return {
      status,
      experimentAttr,
      urls
    }
  }
}

async function publicChoose2afc (participateId, answer) {
  let participant = await models.fetchParticipant(participateId)
  let states = participant.states
  twochoice.makeChoice(states, answer.comparison)
  await models.saveParticipant(participateId, {states})
  return publicGetNextChoice(participateId)
}

async function publicChooseMultiple (participateId, answer) {
  let participant = await models.fetchParticipant(participateId)
  let states = participant.states
  multiple.makeChoice(states, answer)
  await models.saveParticipant(participateId, {states})
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
    let urls = _.map(paths, f => '/file/' + f)
    let fractionRepeat = parseFloat(attr.fractionRepeat)
    if (attr.questionType === '2afc') {
      _.assign(attr, twochoice.getExperimentAttr(urls, fractionRepeat))
    } else if (attr.questionType === 'multiple') {
      _.assign(attr, multiple.getExperimentAttr(urls, fractionRepeat))
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

  let result
  if (experiment.attr.questionType === '2afc') {
    result = twochoice.makeCsv(experiment)
  }
  if (experiment.attr.questionType === 'multiple') {
    result = multiple.makeCsv(experiment)
  }

  const timestampDir = String(new Date().getTime())
  const fullDir = path.join(config.filesDir, timestampDir)
  fs.ensureDirSync(fullDir)
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
