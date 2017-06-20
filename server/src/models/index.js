const _ = require('lodash')
const bcrypt = require('bcryptjs')

// initialize database using Sequelize
const env = process.env.NODE_ENV || 'development'
const dbConfig = require('../config')[env]
const Sequelize = require('sequelize')
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig)

const tree = require('../modules/tree')

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

const Invite = sequelize.define('Invite', {
  inviteId: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4
  },
  email: Sequelize.STRING,
  type: Sequelize.ENUM('collaborate', 'participate')
}, {
  classMethods: {
    associate (models) {
      Invite.belongsTo(
        models.Experiment, {onDelete: 'cascade'})
    }
  }
})

const Result = sequelize.define('Result', {
  inviteId: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4
  },
  age: Sequelize.INTEGER,
  gender: Sequelize.ENUM('male', 'female', 'other'),
  state: Sequelize.JSON
}, {
  classMethods: {
    associate (models) {
      Result.belongsTo(models.Experiment)
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
      Experiment.hasMany(models.Invite, {as: 'Invites'})
      Experiment.hasMany(models.Result, {as: 'Results'})
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
      { model: Invite, as: 'Invites' },
      { model: Participant, as: 'participants' }
    ]
  })
}

function deleteExperiment (experimentId) {
  return models.Experiment
      .destroy({ where: { id: experimentId } })
}

function saveResult (result, state, cb) {
  result.update({ state }).then(cb)
}

function fetchInvite (inviteId) {
  return Invite.findOne({ where: { inviteId } })
}

function deleteInvite (inviteId) {
  console.log('>> models.deleteInvite', inviteId)
  return models.Invite
    .destroy(
      { where: { inviteId } })
    .then(
      () => models.Result.destroy(
        { where: { inviteId } }))
}

function createInvite (experimentId, email) {
  return models
    .fetchExperiment(experimentId)
    .then(experiment => {
      return models.Invite
        .create({ email, type: 'participate' })
        .then((invite) => {
          experiment.addInvite(invite)
          return invite
        })
    })
}

function fetchExperiments (userId) {
  return Experiment.findAll({
    include: [{ model: User, where: { id: userId } }] })
}

function fetchResult (inviteId) {
  return models.Result.findOne({ where: { inviteId } })
}

function saveState (inviteId, state) {
  return fetchResult(inviteId)
    .then(result => {
      return result.update({ state })
    })
}

function makeResult(inviteId, user) {
  return new Promise((resolve, reject) => {
    models
      .fetchInvite(inviteId)
      .then(invite => {
        models
          .fetchExperiment(invite.ExperimentId)
          .then(experiment => {
            let images = experiment.Images
            const imageUrls = _.map(images, 'url')
            let state = tree.newState(imageUrls)
            // since Result has an external inviteId,
            // findOrCreate is needed to overcome
            // the clash with the default uuid generation
            models.Result
              .findOrCreate({
                where: { inviteId },
                defaults: {
                  age: user.age,
                  gender: user.gender,
                  state 
                }
              })
              .spread(resolve)
          })
      })
  })
}

function createExperiment (
    userId, name, description, imageUrls) {
  /* todo do proper promise chain */
  return models.Experiment
    .create({ name, description })
    .then((experiment) => {
      console.log('createExperiment', userId, name, imageUrls)
      imageUrls.forEach((url) => {
        models.Image
          .create({ url })
          .then((image) => experiment.addImage(image))
      })
      return experiment.addUser(userId, { permission: 0 })
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
  Invite,
  Result,
  Participant,
  UserExperiment,
  Experiment,
  fetchExperiment,
  deleteExperiment,
  fetchExperiments,
  fetchResult,
  createInvite,
  fetchInvite,
  deleteInvite,
  saveResult,
  makeResult,
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
