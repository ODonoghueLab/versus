const _ = require('lodash')
const bcrypt = require('bcryptjs')

const tree = require('./modules/tree')

const JsonField = require('sequelize-json')

const Sequelize = require('sequelize')
const conn = require('./conn')
let db = conn.db

// Reset database `force: true` -> wipes database
db.sync({ force: false })

/**
 * Definitions of the database for Versus
 */

const User = db.define('User', {
  name: Sequelize.STRING,
  email: {type: Sequelize.STRING, unique: true},
  password: Sequelize.STRING
})

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
  email: Sequelize.STRING,
  user: Sequelize.JSON,
  state: Sequelize.JSON,
  attr: JsonField(db, 'User', 'attr')
})

const Experiment = db.define('Experiment', {
  attr: Sequelize.JSON,
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

/* access functions - only returns JSON literals */

function unwrapInstance (instance) {
  if (instance === null) {
    return null
  } else {
    let result = instance.get({plain: true})
    for (let key of ['attr', 'user', 'state']) {
      if (key in result) {
        if (typeof result[key] === 'string') {
          result[key] = JSON.parse(result[key])
        }
      }
    }
    if ('participants' in result) {
      for (let p of result.participants) {
        for (let key of ['attr', 'user', 'state']) {
          if (key in p) {
            if (typeof p[key] === 'string') {
              p[key] = JSON.parse(p[key])
            }
          }
        }
      }
    }
    return result
  }
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
      experiment.update({attr})
      return experiment
    })
}

function deleteExperiment (experimentId) {
  return Experiment
    .destroy({where: {id: experimentId}})
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

function createParticipant (experimentId, email) {
  return findExperiment(experimentId)
    .then(experiment => {
      const images = experiment.Images
      const state = tree.newState(_.map(images, 'url'))
      return Participant
        .create({email, state})
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
        .update(values)
        .then(unwrapInstance)
    })
}

function createExperiment (userId, attr, imageUrls) {
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
          .update(values)
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

module.exports = {
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
  deleteParticipant
}
