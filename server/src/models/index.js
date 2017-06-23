const _ = require('lodash')
const bcrypt = require('bcryptjs')

const tree = require('../modules/tree')

// initialize database using Sequelize
const env = process.env.NODE_ENV || 'development'
const dbConfig = require('../config')[env]
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
}, {
  classMethods: {
    associate (models) {
      User.belongsToMany(
        models.Experiment, { through: models.UserExperiment })
    }
  }
})
User.beforeValidate((user) => {
  user.password = bcrypt.hashSync(
    user.password, bcrypt.genSaltSync(10))
})

const Image = sequelize.define('Image', {
  url: Sequelize.STRING
}, {
  classMethods: {
    associate (models) {
      Image.belongsTo(
        models.Experiment, {onDelete: 'cascade'})
    }
  }
})

const Participant = sequelize.define('Participant', {
  inviteId: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4
  },
  email: Sequelize.STRING,
  user: Sequelize.JSON,
  state: Sequelize.JSON
}, {
  classMethods: {
    associate (models) {
      Participant.belongsTo(models.Experiment)
    }
  }
})

const UserExperiment = sequelize.define('UserExperiment', {
  permission: Sequelize.INTEGER
})

const Experiment = sequelize.define('Experiment', {
  name: Sequelize.STRING,
  description: Sequelize.STRING
}, {
  classMethods: {
    associate (models) {
      Experiment.hasMany(models.Image, {as: 'Images'})
      Experiment.belongsToMany(
        models.User, {through: models.UserExperiment})
      Experiment.hasMany(models.Participant, {as: 'participants'})
    }
  }
})

/* access functions */

function fetchExperiment (experimentId) {
  return Experiment.find({
    where: { id: experimentId },
    include: [
      { model: Image, as: 'Images' },
      { model: User, as: 'Users' },
      { model: Participant, as: 'participants' }
    ]
  })
}

function deleteExperiment (experimentId) {
  return models.Experiment
      .destroy({ where: { id: experimentId } })
}

function fetchExperiments (userId) {
  return Experiment.findAll({
    include: [{ model: User, where: { id: userId } }] })
}

function createParticipant (experimentId, email) {
  return models
    .fetchExperiment(experimentId)
    .then(experiment => {
      const images = experiment.Images
      const imageUrls = _.map(images, 'url')
      const state = tree.newState(imageUrls)
      return models.Participant
        .create({ email, state })
        .then((participant) => {
          return experiment.addParticipant(participant)
        })
    })
}

function fetchParticipant (inviteId) {
  return models.Participant.findOne({ where: { inviteId } })
}

function deleteParticipant (inviteId) {
  return models.Participant.destroy({ where: { inviteId } })
}

function saveState (inviteId, state) {
  return fetchParticipant(inviteId)
    .then(participant => {
      return participant.update({ state })
    })
}

function unwrapModel(instance) {
  console.log('models.unwrap' ,instance)
  return instance.get({ plain: true })
}

function createExperiment (userId, name, description, imageUrls) {
  return models.Experiment
    .create(
      { name, description })
    .then((experiment) => {
      let promise = null
      for (let url of imageUrls) {
        let newPromise = models.Image
          .create({ url })
          .then(image => experiment.addImage(image))
        if (promise === null) {
          promise = newPromise
        } else {
          promise = promise.then(() => newPromise)
        }
      }
      promise
        .then(() => {
          experiment.addUser(userId, { permission: 0 })
          return experiment
        })
        .then(unwrapModel)

      return promise
    })
}

function createUser (values) {
  console.log('>> createUser', values)
  return models.User.create(values)
}

const models = {
  sequelize,
  User,
  Image,
  Participant,
  UserExperiment,
  Experiment,
  fetchExperiment,
  deleteExperiment,
  fetchExperiments,
  createParticipant,
  fetchParticipant,
  deleteParticipant,
  saveState,
  createExperiment,
  createUser
}

_.each(_.values(models), model => {
  if (model.associate) {
    model.associate(models)
  }
})

module.exports = models
