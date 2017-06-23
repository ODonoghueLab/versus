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

function unwrapInstance (instance) {
  return instance.get({ plain: true })
}

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
      const state = tree.newState(_.map(images, 'url'))
      return models.Participant
        .create({ email, state })
        .then((participant) => {
          return experiment
            .addParticipant(participant)
            .then(() => participant)
        })
    })
}

function fetchParticipant (inviteId) {
  return models.Participant.findOne({ where: { inviteId } })
}

function deleteParticipant (inviteId) {
  return models.Participant.destroy({ where: { inviteId } })
}

function saveParticipant (inviteId, values) {
  return fetchParticipant(inviteId)
    .then(participant => participant.update(values))
}

function createExperiment (userId, name, description, imageUrls) {
  return models.Experiment
    .create(
      { name, description })
    .then((experiment) => {
      let chainedPromise = null
      for (let url of imageUrls) {
        let promise = models.Image
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
          return experiment
        })
        .then(unwrapInstance)
      return chainedPromise
    })
}

function createUser (values) {
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
  saveParticipant,
  createExperiment,
  createUser
}

_.each(_.values(models), model => {
  if (model.associate) {
    model.associate(models)
  }
})

module.exports = models
