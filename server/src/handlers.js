const path = require('path')
const _ = require('lodash')
const models = require('./models')
const tree = require('./modules/tree')
const shortid = require('shortid')


function isStatesDone (states) {
  for (let state of _.values(states)) {
    if (!tree.isDone(state)) {
      return false
    }
  }
  return true
}


function getUnfinishedState (states) {
  let todoStates = []
  for (let state of _.values(states)) {
    if (!tree.isDone(state)) {
      todoStates.push(state)
    }
  }
  let i = _.random(todoStates.length - 1)
  return todoStates[i]
}


function getStatesParams (states) {
  let params = {
    nImage: 0,
    maxComparisons: 0,
    nRepeat: 0
  }
  for (let state of _.values(states)) {
    let n = state.imageUrls.length
    let maxComparisons = Math.ceil(n * Math.log2(n))
    let nRepeat = Math.ceil(state.probRepeat * maxComparisons)
    params.nImage += n
    params.maxComparisons += maxComparisons
    params.nRepeat += nRepeat
  }
  return {params, new: true}
}


function getComparison (participateId) {
  return models
    .fetchParticipant(participateId)
    .then(participant => {
      return models
        .fetchExperiment(participant.ExperimentId)
        .then(experiment => {
          if (participant.attr.user === null) {
            console.log('>> handlers.getComparison no user found')
            return getStatesParams (participant.states)
          }
          if (isStatesDone(participant.states)) {
            let attr = participant.attr
            // this is needed to store consistency
            let states = participant.states
            if (!attr.surveyCode) {
              attr.surveyCode = shortid.generate()
            }
            return models
              .saveParticipant(participateId, {states, attr})
              .then(() => {
                return {done: true, surveyCode: attr.surveyCode}
              })
          } else {
            const state = getUnfinishedState(participant.states)
            const comparison = tree.getComparison(state)
            let payload = {
              comparison,
              attr: experiment.attr
            }
            console.log('>> handlers.getComparison comparison', payload)
            return payload
          }
        })
    })
}


module.exports = {

  publicRegisterUser (user) {
    return new Promise(resolve => {
      const keys = ['name', 'email', 'password', 'passwordv']

      let errors = []
      if (!user.name) {
        errors.push('Please Enter Your User Name')
      }
      if (!user.email) {
        errors.push('Please Enter Your Email')
      }
      if (!user.password) {
        errors.push('Please Enter Both Password Fields')
      }
      if (user.password !== user.passwordv) {
        errors.push('Passwords Do Not Match')
      }

      let values = {
        name: user.name,
        email: user.email,
        password: user.password
      }

      if (errors.length > 0) {
        resolve({
          success: false,
          errors: errors
        })
      } else {
        models
          .createUser(values)
          .then(() => {
            resolve({success: true})
          })
          .catch(err => {
            resolve({
              success: false,
              errors: ['Couldn\' register, is your email already in use?']
            })
          })
      }
    })
  },

  updateUser (user) {
    return new Promise((resolve) => {
      const keys = ['id', 'name', 'email', 'password']
      let values = {}
      for (let key of keys) {
        if (user[key]) {
          values[key] = user[key]
        }
      }
      if (values) {
        models
          .updateUser(values)
          .then(user => {
            console.log('>> router.updateUser success', values, user)
            resolve({success: true})
          })
          .catch(err => {
            console.log(`>> router.updateUser error`, err)
            resolve({
              success: false,
              errors: ['Couldn\' register, is your email already in use?']
            })
          })
      } else {
        resolve({success: false})
      }
    })
  },

  getExperiments (userId) {
    return models
      .fetchExperiments(userId)
      .then(experiments => {
        return {experiments}
      })
  },

  getExperiment (experimentId) {
    return models
      .fetchExperiment(experimentId)
      .then(experiment => {
        return {experiment}
      })
  },

  saveExperimentAttr (experimentId, attr) {
    return models
      .saveExperimentAttr(experimentId, attr)
  },

  deleteExperiment (experimentId) {
    return models
      .deleteExperiment(experimentId)
      .then(() => {
        return {success: true}
      })
      .catch(err => {
        return {success: false, error: err}
      })
  },

  publicInviteParticipant (experimentId, email) {
    return models
      .createParticipant(
        experimentId, email)
      .then((participant) => {
        return {participant}
      })
  },

  deleteParticipant (participantId) {
    return models
      .deleteParticipant(participantId)
      .then(() => {
        return {success: true}
      })
      .catch(err => {
        return {success: false, error: err}
      })
  },

  publicGetParticipant (participateId) {
    return getComparison(participateId)
  },

  publicChooseItem (participateId, comparison) {
    return models
      .fetchParticipant(participateId)
      .then(participant => {
        return models
          .fetchExperiment(participant.ExperimentId)
          .then(experiment => {
            let urlA = comparison.itemA.url
            let imageSetId = models.getImageSetIdFromPath(urlA)
            let states = participant.states
            let state = states[imageSetId]
            tree.makeChoice(state, comparison)
            return models
              .saveParticipant(participateId, {states})
              .then(() => {
                return getComparison(participateId)
              })
          })
      })
  },

  publicSaveParticipantUserDetails (participateId, user) {
    console.log('> handlers.publicSaveParticipantUserDetails user', user)
    return models
      .saveParticipantAttr(participateId, {user: user})
      .then(participant => {
        return getComparison(participateId)
      })
  },

  // Upload functions - first parameter is always a filelist object

  uploadImagesAndCreateExperiment (files, userId, attr) {

    /**
     * Checks a filelist if they are image files that can
     * be usefully displayed
     *
     * @param {FileList} files
     * @returns {String} - an error str, or null string if correct
     */
    function checkImageFilesForError (files) {
      if (files.length < 2) {
        return 'Minimum two images.'
      }
      for (let file of files) {
        // handle formats
        const extname = path.extname(file.originalname).toLowerCase()
        if (!_.includes(['.png', '.jpg', '.gif'], extname)) {
          return `only png's, jpg's, gif's`
        }
        // size checking
        if (file.size / 1000000 > 2) {
          return 'Please Keep Images Under 2MB'
        }
      }
      return ''
    }

    return models
      .storeFiles(
        files, checkImageFilesForError)
      .then((paths) => {
        imageSetIds = []
        for (let path of paths) {
          let imageSetId = models.getImageSetIdFromPath(path)
          if (!_.includes(imageSetIds, imageSetId)) {
            imageSetIds.push(imageSetId)
          }
        }
        attr.imageSetIds = imageSetIds
        console.log('>> routes.uploadImagesAndCreateExperiment imageSetIds', imageSetIds)
        console.log('>> routes.uploadImagesAndCreateExperiment paths', paths)
        return models
          .createExperiment(
            userId,
            attr,
            _.map(paths, f => '/file/' + f))
          .then(experiment => {
            console.log('> routers.uploadImagesAndCreateExperiment output', experiment)
            return {
              success: true,
              experimentId: experiment.id
            }
          })
      })
  }

}


