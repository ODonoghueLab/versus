const path = require('path')
const fs = require('fs')
const del = require('del')

const denodeify = require('denodeify')
const rimraf = denodeify(require('rimraf'))
const _ = require('lodash')
const bcrypt = require('bcryptjs')

const Sequelize = require('sequelize')
const sequelizeJson = require('sequelize-json')

const tree = require('./modules/tree')
const util = require('./modules/util')
const config = require('./config')
const conn = require('./conn')
let db = conn.db

/**

 Definitions of the database for Versus

 Sequelize is used to interact with the database, as it is
 quite flexible in terms of the target database.
 Versus makes extensive use of JSON, and so, in terms of
 flexibility, sequelize-json is used to map JSON in
 sequelize as sequelize-json works with Sqlite, Postgres, and MySQL.
 For the sequelize-json JSON fields, be sure to use updateAttributes,
 and not update

 The database is not meant to be accessed directly by the web-handlers.
 These are meant to be accessed directly by the access functions
 defined below. These functions take JSON literals as parameters
 and returns the data in the database as JSON-literals wrapped in
 a promise.
 */

const User = db.define('User', {
  name: Sequelize.STRING,
  email: {type: Sequelize.STRING, unique: true},
  password: Sequelize.STRING
})

const Image = db.define('Image', {
  url: Sequelize.STRING,
  filename: Sequelize.STRING
})

const Participant = db.define('Participant', {
  participateId: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4
  },
  attr: sequelizeJson(db, 'Participant', 'attr'),
  states: sequelizeJson(db, 'Participant', 'states'),
})

const Experiment = db.define('Experiment', {
  attr: sequelizeJson(db, 'Experiment', 'attr'),
})

const UserExperiment = db.define('UserExperiment', {
  permission: Sequelize.INTEGER
})

Experiment.hasMany(Image, {as: 'images'})
Experiment.belongsToMany(User, {through: UserExperiment})
Experiment.hasMany(Participant, {as: 'participants'})
Image.belongsTo(Experiment, {onDelete: 'cascade'})
Participant.belongsTo(Experiment)
User.belongsToMany(Experiment, {through: UserExperiment})


/**
 * Converts a Sequelize record into a JSON-literal
 *
 * @param {SequelizeRecord} instance - a Sequelize Record
 * @returns {Object|null} JSON-literal object or null if unsuccessfull
 */
function unwrapInstance (instance) {
  if (instance === null) {
    return null
  } else {
    return instance.get({plain: true})
  }
}


// File handling functions

async function rollback (uploadedFiles) {
  for (let f of uploadedFiles) {
    if (fs.existsSync(f.path)) {
      console.log('>> router.rollback delete', f.path)
      await del(f.path)
    }
  }
}


/**
 * Stores the files in a unique sub-directory on the server in the
 * directory listed in the config.js file, where the
 * sub-directory is a string version of the time it was loaded in, and
 * the path basenames are based on the original basenames.
 *
 * As well a file checking function is run to ensure the uploaded
 * files are legitimate, this function returns a null string
 * if all is good, otherwise an error string is returned.
 *
 * The new stored path names are returned in a promise.
 *
 * @param uploadedFiles
 * @param checkFilesForError
 * @returns {Promise}
 */
async function storeFiles (uploadedFiles, checkFilesForError) {

  try {
    const timestampDir = String(new Date().getTime())
    const fullDir = path.join(config.filesDir, timestampDir)
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, 0o744)
    }

    let error = checkFilesForError(uploadedFiles)
    if (error) {
      throw new Error(error)
    }

    let targetPaths = []
    for (let file of uploadedFiles) {
      let basename = path.basename(file.originalname)
      let targetPath = path.join(timestampDir, basename)
      targetPaths.push(targetPath)

      let fullTargetPath = path.join(config.filesDir, targetPath)
      fs.renameSync(file.path, fullTargetPath)

      console.log(`>> router.storeFiles ${targetPath}`)
    }

    return targetPaths

  } catch (error) {

    console.log('>> router.storeFiles error:', error)
    await rollback(uploadedFiles)
    throw error

  }
}

/**
 * Checks files stored on server against the database
 * and deletes any files that are not matched with database entries
 */
async function cleanupImages () {
  let experiments = await Experiment.findAll(
    {include: [{model: Image, as: 'images'}]})

  let filenames = []
  for (let experiment of experiments) {
    for (let image of experiment.images) {
      let url = image.dataValues.url
      filenames.push('files/' + url.slice(6, url.length))
    }
  }

  for (let expDir of fs.readdirSync('files')) {
    if (!util.isStringInStringList(expDir, filenames)) {
      await rimraf('files/' + expDir)
      console.log('> Models.cleanupOrphanedImageFiles deleted dir', expDir)
    }
  }
}

/**
 * Key function to return imageSetId from a path name, else empty string
 * These function should be used to allow unique imageSetIds to be
 * extracted across the app.
 */
function getImageSetIdFromPath (p) {
  let tokens = path.basename(p).split('_')
  if (tokens.length > 0) {
    return tokens[0]
  } else {
    return ''
  }
}


/**
 * Access functions - returns promises for JSON literals
 * extracted from the database. These access functions
 * provides an abstraction that insulates the database
 * from the api
 */

// User functions

function saltPassword (user) {
  let result = _.cloneDeep(user)
  if (result.password) {
    result.password = bcrypt.hashSync(result.password, bcrypt.genSaltSync(10))
  }
  return result
}

function createUser (values) {
  return User
    .findOne({where: {id: values.id}})
    .then(user => {
      if (user === null) {
        return User
          .create(saltPassword(values))
          .then(unwrapInstance)
      }
    })
}

function updateUser (values) {
  return User
    .findOne({where: {id: values.id}})
    .then(user => {
      if (user) {
        return user
          .updateAttributes(saltPassword(values))
          .then(unwrapInstance)
      } else {
        return null
      }
    })
}

function fetchUser (values) {
  return User
    .findOne({where: values})
    .then(user => {
      if (user) {
        return unwrapInstance(user)
      } else {
        return null
      }
    })
}

/**
 * Returns a promise that returns a user literal if successful
 * or null if unsuccessful
 */
function checkUserWithPassword (user, password) {
  return new Promise((resolve) => {
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        resolve(null)
      } else if (isMatch) {
        resolve(user)
      } else {
        resolve(null)
      }
    })
  })
}

// Experiment functions

async function createExperiment (userId, attr, imageUrls) {
  console.log('> models.createExperiment')
  let experiment = await Experiment.create({attr})
  for (let url of imageUrls) {
    let image = await Image.create({url})
    await experiment.addImage(image)
  }
  await experiment.addUser(userId, {permission: 0})
  let result = unwrapInstance(experiment)
  console.log('> models.createExperiment', result)
  return result
}

function findExperiment (experimentId) {
  return Experiment.findOne({
    where: {id: experimentId},
    include: [
      {model: Image, as: 'images'},
      {model: User, as: 'Users'},
      {model: Participant, as: 'participants'}
    ]
  })
}

function fetchExperiment (experimentId) {
  return findExperiment(experimentId)
    .then(unwrapInstance)
}

function saveExperimentAttr (experimentId, attr) {
  return findExperiment(experimentId)
    .then(experiment => {
      return experiment
        .updateAttributes({attr})
        .then(unwrapInstance)
    })
}

function deleteExperiment (experimentId) {
  return Experiment
    .destroy({where: {id: experimentId}})
    .then(() => {
      return cleanupImages()
    })
}

async function fetchExperiments (userId) {
  let experiments = await Experiment.findAll(
    {include: [{model: User, where: {id: userId}}]})
  return _.map(experiments, unwrapInstance)
}

// Participant functions

async function createParticipant (experimentId, email) {
  let experiment = await findExperiment(experimentId)

  const images = experiment.images
  const urls = _.map(images, 'url')
  let states = {}
  for (let imageSetId of experiment.attr.imageSetIds) {
    let theseUrls = _.filter(urls, u => _.includes(u, imageSetId))
    states[imageSetId] = tree.newState(theseUrls)
  }
  const state = tree.newState(urls)

  let participant = await Participant.create(
      {attr: {email: email, user: null}, state, states})

  await experiment.addParticipant(participant)

  let result = unwrapInstance(participant)
  for (let [imageSetId, state] of _.toPairs(result.states)) {
    console.log('> models.createParticipant', imageSetId, state.imageUrls)
  }
  return result
}

function findParticipant (participateId) {
  return Participant.findOne({where: {participateId}})
}

function fetchParticipant (participateId) {
  return findParticipant(participateId).then(unwrapInstance)
}

function deleteParticipant (participateId) {
  return Participant.destroy({where: {participateId}})
}

function saveParticipant (participateId, values) {
  return findParticipant(participateId)
    .then(participant => {
      return participant
        .updateAttributes(values)
        .then(unwrapInstance)
    })
}

/**
 * Saves attributes into the attr JSON field, being careful not to
 * overwrite other fields in the attr JSON structure
 *
 * @param {String} participateId
 * @param {Object} newAttr
 * @returns {Promise.<Object>}
 */
async function saveParticipantAttr (participateId, newAttr) {
  let participant = await findParticipant(participateId)

  let attr = unwrapInstance(participant).attr
  for (let key of _.keys(attr)) {
    attr[key] = newAttr[key]
  }

  participant = await participant.updateAttributes({attr})

  let payload = unwrapInstance(participant)
  for (let key of _.keys(payload.attr)) {
    console.log('> saveParticipant payload key', key, payload.attr[key])
  }
  return payload
}

/**
 * Module Initialization on startup
 */
async function init () {
  await db.sync()
  await cleanupImages()
  console.log('> Models.init done')
}

init()

module.exports = {
  storeFiles,
  getImageSetIdFromPath,
  createUser,
  fetchUser,
  checkUserWithPassword,
  updateUser,
  createExperiment,
  fetchExperiment,
  fetchExperiments,
  saveExperimentAttr,
  deleteExperiment,
  createParticipant,
  fetchParticipant,
  saveParticipant,
  deleteParticipant,
  saveParticipantAttr
}
