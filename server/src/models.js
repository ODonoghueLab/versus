const path = require('path')
const fs = require('fs')

const denodeify = require('denodeify')
const rimraf = denodeify(require("rimraf"))
const _ = require('lodash')
const bcrypt = require('bcryptjs')
const Sequelize = require('sequelize')

const tree = require('./modules/tree')
const sequelizeJson = require('sequelize-json')

const config = require('./config')
const conn = require('./conn')
const util = require('./modules/util')
let db = conn.db

/**
 * Definitions of the database for Versus
 *
 * sequelize-json is used as it works with Sqlite, Postgres, and MySQL
 * be sure to use updateAttributes, and not update for sequelize-json
 */

const User = db.define('User', {
  name: Sequelize.STRING,
  email: {type: Sequelize.STRING, unique: true},
  password: Sequelize.STRING
})

// passwords are salted
User.beforeValidate((user) => {
  user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(10))
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

Experiment.hasMany(Image, {as: 'Images'})
Experiment.belongsToMany(User, {through: UserExperiment})
Experiment.hasMany(Participant, {as: 'participants'})
Image.belongsTo(Experiment, {onDelete: 'cascade'})
Participant.belongsTo(Experiment)
User.belongsToMany(Experiment, {through: UserExperiment})


/**
 * Converts a Sequelize record into a JSON-literal object
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
function storeFiles (uploadedFiles, checkFilesForError) {

  return new Promise((resolve, reject) => {

    const experimentDir = String(new Date().getTime())
    const fullExperimentDir = path.join(config.filesDir, experimentDir)
    if (!fs.existsSync(fullExperimentDir)) {
      fs.mkdirSync(fullExperimentDir, 0o744)
    }

    function rollback () {
      for (let i = 0; i < uploadedFiles.length; i += 1) {
        del(uploadedFiles[i].path)
      }
    }

    const inputPaths = []
    const targetPaths = []

    let error = checkFilesForError(uploadedFiles)

    if (error) {
      rollback()
    } else {
      for (let file of uploadedFiles) {
        inputPaths.push(file.path)
        let basename = path.basename(file.originalname)
        let targetPath = path.join(experimentDir, basename)
        targetPaths.push(targetPath)
        let fullTargetPath = path.join(config.filesDir, targetPath)
        try {
          console.log(`>> router.storeFiles ${targetPath}`)
          fs.renameSync(file.path, fullTargetPath)
        } catch (err) {
          error = err
          rollback()
          break
        }
      }
    }

    if (error) {
      reject(error)
    } else {
      resolve(targetPaths)
    }
  })
}

function cleanupImages() {
  return Experiment
    .findAll(
      {include: [{model: Image, as: 'Images'}]})
    .then(experiments => {
      let filenames = []
      for (let experiment of experiments) {
        for (let image of experiment.Images) {
          let url = image.dataValues.url
          filenames.push('files/' + url.slice(6, url.length))
        }
      }
      let promises = []
      for (let expDir of fs.readdirSync('files')) {
        if (!util.isStringInStringList(expDir, filenames)) {
          promises.push(
            rimraf('files/' + expDir)
              .then(() => {
                console.log('> Models.cleanupOrphanedImageFiles deleted', expDir)
              }))
        }
      }
      return Promise.all(promises)
    })
}

function getStructureIdFromPath (p) {
   let tokens = path.basename(p).split('_')
   if (tokens.length > 0) {
     return tokens[0]
   } else {
     return ''
   }
}


/**
 * Access functions - promises that returns JSON
 * literals from the database
 **/

// User functions

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

function createExperiment (userId, attr, imageUrls) {
  console.log('> models.createExperiment')
  return new Promise((resolve, reject) => {
    Experiment
      .create({attr})
      .then((experiment) => {
        let chainedPromise = null
        for (let url of imageUrls) {
          let promise = Image
            .create({url})
            .then(image => {
              experiment.addImage(image)
            })
          if (chainedPromise === null) {
            chainedPromise = promise
          } else {
            chainedPromise = chainedPromise.then(() => promise)
          }
        }
        chainedPromise
          .then(() => {
            experiment
              .addUser(userId, {permission: 0})
              .then(() => {
                let result = unwrapInstance(experiment)
                console.log('> models.createExperiment ready to resolve', result)
                resolve(result)
              })
          })
          .catch(reject)
      })
  })
}

function findExperiment (experimentId) {
  return Experiment.findOne({
    where: {id: experimentId},
    include: [
      {model: Image, as: 'Images'},
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

function fetchExperiments (userId) {
  return Experiment
    .findAll(
      {include: [{model: User, where: {id: userId}}]})
    .then(
      experiments => {
        let results = _.map(experiments, unwrapInstance)
        return results
      })
}

// Participant functions

function createParticipant (experimentId, email) {
  return findExperiment(experimentId)
    .then(experiment => {
      const images = experiment.Images
      const urls = _.map(images, 'url')
      let states = {}
      for (let structureId of experiment.attr.structureIds) {
        let theseUrls = _.filter(urls, u => _.includes(u, structureId))
        states[structureId] = tree.newState(theseUrls)
      }
      const state = tree.newState(urls)
      return Participant
        .create(
          {attr: { email: email, user: null }, state, states})
        .then((participant) => {
          let result = unwrapInstance(participant)
          for (let [structureId, state] of _.toPairs(result.states)) {
            console.log('> models.createParticipant', structureId, state.imageUrls)
          }
          return experiment
            .addParticipant(participant)
            .then(() => {
              return unwrapInstance(participant)
            })
        })
    })
}

function findParticipant (participateId) {
  return Participant
    .findOne({where: {participateId}})
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

function saveParticipantAttr (participateId, newAttr) {
  return findParticipant(participateId)
    .then(participant => {
      let attr = unwrapInstance(participant).attr
      for (let key of _.keys(attr)) {
        attr[key] = newAttr[key]
      }
      return participant
        .updateAttributes({attr})
        .then(participant => {
          let payload = unwrapInstance(participant)
          for (let key of _.keys(payload.attr)) {
            console.log('> saveParticipant payload key', key, payload.attr[key])
          }
          return payload
        })
    })
}

/**
 * Module Initialization on startup
 */
function init() {
  cleanupImages()
    .then(() => console.log('> Models.init done'))
}

init()

module.exports = {
  storeFiles,
  getStructureIdFromPath,
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
