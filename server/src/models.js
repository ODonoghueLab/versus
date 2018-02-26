const path = require('path')
const fs = require('fs')
const del = require('del')

const denodeify = require('denodeify')
const rimraf = denodeify(require('rimraf'))
const _ = require('lodash')

const bcrypt = require('bcryptjs')
const Sequelize = require('sequelize')
const sequelizeJson = require('sequelize-json')

const twochoice = require('./modules/twochoice')
const multiple = require('./modules/multiple')
const util = require('./modules/util')
const config = require('./config')
const conn = require('./conn')
let db = conn.db

/**
 *
 * Definitions of the database for Versus
 *
 * Sequelize is used to interact with the database, as it is
 * quite flexible in terms of the target database.
 * Versus makes extensive use of JSON, and so, in terms of
 * flexibility, sequelize-json is used to map JSON in
 * sequelize as sequelize-json works with Sqlite, Postgres, and MySQL.
 * For the sequelize-json JSON fields, be sure to use updateAttributes,
 * and not update
 *
 * The database is not meant to be accessed directly by the web-handlers.
 * These are meant to be accessed directly by the access functions
 * defined below. These functions take JSON literals as parameters
 * and returns the data in the database as JSON-literals wrapped in
 * a promise.
 *
 * Accessor functions are prefaced with:
 *  - fetch* returns a JSON-literal of the Sequelize instance
 *  - create* creates a database entry from a JSON-literal
 *  - update* updates values in the instance
 *  - [optional] find* returns the actual Sequelize instance
 */

/**
 * @returns {Object|null} JSON-literal of a Sequelize instance
 */
function unwrapInstance (instance) {
  if (instance === null) {
    return null
  } else {
    return instance.get({plain: true})
  }
}

async function deleteFileList (fileList) {
  for (let f of fileList) {
    if (fs.existsSync(f.path)) {
      console.log('>> router.deleteFileList', f.path)
      await del(f.path)
    }
  }
}

/**
 * Moves fileList to a time-stamped sub-directory in config.filesDir.
 * Optional checking function can throw Exceptions for bad files.
 * @param fileList
 * @param checkFilesForError
 * @promise - list of new paths
 */
async function storeFilesInConfigDir (fileList, checkFilesForError) {
  try {
    const timestampDir = String(new Date().getTime())
    const fullDir = path.join(config.filesDir, timestampDir)
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, 0o744)
    }

    if (checkFilesForError) {
      let error = checkFilesForError(fileList)
      if (error) {
        throw new Error(error)
      }
    }

    let targetPaths = []
    for (let file of fileList) {
      let basename = path.basename(file.originalname)
      let targetPath = path.join(timestampDir, basename)
      targetPaths.push(targetPath)

      let fullTargetPath = path.join(config.filesDir, targetPath)
      fs.renameSync(file.path, fullTargetPath)

      console.log(`>> router.storeFilesInConfigDir ${targetPath}`)
    }

    return targetPaths
  } catch (error) {
    await deleteFileList(fileList)
    throw error
  }
}

/**
 * Default User model and accessor functions
 *
 * Unwrapped JSON structure:
 * {
 *   id: Number,
 *   name: string,
 *   password: salted password string,
 *   email: string
 * }
 */

const User = db.define('User', {
  name: Sequelize.STRING,
  email: {
    type: Sequelize.STRING,
    unique: true
  },
  password: {
    type: Sequelize.STRING,
    set (val) {
      let saltedPassword = bcrypt.hashSync(val, bcrypt.genSaltSync(10))
      this.setDataValue('password', saltedPassword)
    }
  }
})

function createUser (values) {
  return User
    .findOne({where: {id: values.id}})
    .then(user => {
      if (user === null) {
        return User
          .create(values)
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
          .updateAttributes(values)
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

function checkUserWithPassword (user, password) {
  return new Promise((resolve) => {
    bcrypt.compare(
      password,
      user.password,
      (err, isMatch) => {
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

/**
 * Custom database models and relationships between models
 */

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
  states: sequelizeJson(db, 'Participant', 'states')
})

const Experiment = db.define('Experiment', {
  attr: sequelizeJson(db, 'Experiment', 'attr')
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
 * Experiment access functions
 *
 * Unwrapped instance JSON structure:
 * {
 *   id: Number,
 *   images: [{ url, filename },..],
 *   participants: [Participant,..],
 *   attr: {
 *     params: {},
 *     imageSetIds: [Strings,..]
 *     name: string,
 *     title: string
 *   }
 * }
 */

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

function fetchAllExperiments () {
  return Experiment.findAll({
    include: [
      {model: Image, as: 'images'},
      {model: User, as: 'Users'},
      {model: Participant, as: 'participants'}
    ]
  }).then(experiments => {
    return _.map(experiments, unwrapInstance)
  })
}

function fetchExperiment (experimentId) {
  return findExperiment(experimentId)
    .then(unwrapInstance)
}

async function saveExperimentAttr (experimentId, attr) {
  let experiment = await findExperiment(experimentId)
  let result = await experiment.updateAttributes({attr})
  return unwrapInstance(result)
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

/**
 * Participant access functions
 *
 * Unwrapped instance JSON structure:
 * {
 *   participateID: UUID string,
 *   attr: {
 *     email: email string,
 *     user: string,
 *   }
 *   states: JSON object to hold states
 * }
 */

async function createParticipant (experimentId, email) {
  let experiment = await findExperiment(experimentId)
  let states
  if (experiment.attr.questionType === '2afc') {
    states = twochoice.getNewStates(experiment)
  } else if (experiment.attr.questionType === 'multiple') {
    states = multiple.getNewStates(experiment)
  }
  let attr = {email, user: null}
  let participant = await Participant.create({attr, states})
  await experiment.addParticipant(participant)
  return unwrapInstance(participant)
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
 * Module Initialization on startup
 */
async function init () {
  await db.sync()
  await cleanupImages()
  console.log('> Models.init done')
}

init()

module.exports = {
  storeFilesInConfigDir,
  createUser,
  fetchUser,
  checkUserWithPassword,
  updateUser,
  createExperiment,
  fetchExperiment,
  fetchExperiments,
  fetchAllExperiments,
  saveExperimentAttr,
  deleteExperiment,
  createParticipant,
  fetchParticipant,
  saveParticipant,
  deleteParticipant
}
