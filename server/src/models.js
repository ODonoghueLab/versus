const _ = require('lodash')
const bcrypt = require('bcryptjs')

const tree = require('./modules/tree')

const gmailSend = require('gmail-send')()

// initialize database using Sequelize
const env = process.env.NODE_ENV || 'development'
const dbConfig = require('./config')[env]
const Sequelize = require('sequelize')
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig)

/**
 * Definitions of the database for Versus
 */

const User = sequelize.define('User', {
  firstName: Sequelize.STRING,
  lastName: Sequelize.STRING,
  email: { type: Sequelize.STRING, unique: true },
  password: Sequelize.STRING
})

User.beforeValidate((user) => {
  user.password = bcrypt.hashSync(
    user.password, bcrypt.genSaltSync(10))
})

const Image = sequelize.define('Image', {
  url: Sequelize.STRING
})

const Participant = sequelize.define('Participant', {
  participateId: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4
  },
  email: Sequelize.STRING,
  user: Sequelize.JSON,
  state: Sequelize.JSON
})

const UserExperiment = sequelize.define('UserExperiment', {
  permission: Sequelize.INTEGER
})

const Experiment = sequelize.define('Experiment', {
  name: Sequelize.STRING,
  description: Sequelize.STRING
})

Experiment.hasMany(Image, {as: 'Images'})
Experiment.belongsToMany(User, {through: UserExperiment})
Experiment.hasMany(Participant, {as: 'participants'})
User.belongsToMany(Experiment, { through: UserExperiment })
Image.belongsTo(Experiment, {onDelete: 'cascade'})
Participant.belongsTo(Experiment)

/* access functions - only returns JSON literals */

function unwrapInstance (instance) {
  if (instance === null) {
    return null
  } else {
    return instance.get({ plain: true })
  }
}

function findExperiment (experimentId) {
  return Experiment.findOne({
    where: { id: experimentId },
    include: [
      { model: Image, as: 'Images' },
      { model: User, as: 'Users' },
      { model: Participant, as: 'participants' }
    ]
  })
}

function fetchExperiment (experimentId) {
  return findExperiment(experimentId)
    .then(unwrapInstance)
}

function deleteExperiment (experimentId) {
  return Experiment
      .destroy({ where: { id: experimentId } })
}

function fetchExperiments (userId) {
  return Experiment
    .findAll(
      { include: [{ model: User, where: { id: userId } }] })
    .then(
      experiments => _.map(experiments, unwrapInstance))
}

function createParticipant (experimentId, email) {
  return findExperiment(experimentId)
    .then(experiment => {
      const images = experiment.Images
      const state = tree.newState(_.map(images, 'url'))
      return Participant
        .create({ email, state })
        .then((participant) => {
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
    .findOne({ where: { participateId } })
}

function fetchParticipant (participateId) {
  return findParticipant(participateId).then(unwrapInstance)
}

function deleteParticipant (participateId) {
  return Participant.destroy({ where: { participateId } })
}

function saveParticipant (participateId, values) {
  return findParticipant(participateId)
    .then(participant => {
      return participant
        .update(values)
        .then(unwrapInstance)
    })
}

function createExperiment (userId, name, description, imageUrls) {
  return Experiment
    .create(
      { name, description })
    .then((experiment) => {
      let chainedPromise = null
      for (let url of imageUrls) {
        let promise = Image
          .create({ url })
          .then(image => experiment.addImage(image))
        if (chainedPromise === null) {
          chainedPromise = promise
        } else {
          chainedPromise = chainedPromise.then(() => promise)
        }
      }
      chainedPromise
        .then(() => {
          experiment.addUser(userId, { permission: 0 })
          return unwrapInstance(experiment)
        })
      return chainedPromise
    })
}

function createUser (values) {
  return User
    .findOne({where: {id: values.id}})
    .then(user => {
      if (user === null) {
        console.log('>> models.createUser', values)
        return User.create(values)
      }
    })
}

function updateUser (values) {
  console.log('>> models.updateUser', values)
  return User
    .findOne({ where: { id: values.id } })
    .then(user => {
      if (user) {
        return user
          .update(values)
          .then(unwrapInstance)
      } else {
        return null
      }
    })
}

function fetchUser (values) {
  return User
    .findOne({ where: values })
    .then(unwrapInstance)
}

module.exports = {
  sequelize,
  createUser,
  fetchUser,
  updateUser,
  createExperiment,
  fetchExperiment,
  fetchExperiments,
  deleteExperiment,
  createParticipant,
  fetchParticipant,
  saveParticipant,
  deleteParticipant
}
