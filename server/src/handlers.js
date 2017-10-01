const path = require('path')
const _ = require('lodash')
const models = require('./models')
const tree = require('./modules/tree')

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
    return models
      .fetchParticipant(participateId)
      .then(participant => {
        return models
          .fetchExperiment(participant.ExperimentId)
          .then(experiment => {
            if (participant.user === null) {
              console.log('>> router.publicGetParticipant none found')
              return {new: true, nImage: experiment.Images.length}
            }
            const state = participant.state
            console.log('> publicGetParticipant state', state)
            if (tree.isDone(state)) {
              console.log('>> router.publicGetParticipant done')
              return {done: true, surveyCode: state.surveyCode}
            } else {
              const comparison = tree.getComparison(participant.state)
              console.log('>> router.publicGetParticipant comparison', comparison)
              return {
                comparison,
                attr: experiment.attr
              }
            }
          })
      })
  },

  publicChooseItem (participateId, comparison) {
    return models
      .fetchParticipant(participateId)
      .then(participant => {
        return models
          .fetchExperiment(participant.ExperimentId)
          .then(experiment => {
            let state = participant.state
            tree.makeChoice(state, comparison)
            let payload
            if (tree.isDone(state)) {
              payload = {done: true, surveyCode: state.surveyCode}
            } else {
              payload = {
                comparison: tree.getComparison(state),
                attr: experiment.attr
              }
            }
            return models
              .saveParticipant(participateId, {state})
              .then(() => payload)
          })
      })
  },

  publicSaveParticipantUserDetails (participateId, details) {
    return models
      .saveParticipant(participateId, {user: details})
      .then(participant => {
        return models
          .fetchExperiment(participant.ExperimentId)
          .then(experiment => {
            return {
              comparison: tree.getComparison(participant.state),
              attr: experiment.attr
            }
          })
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


