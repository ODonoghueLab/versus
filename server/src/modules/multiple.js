/**
 * @fileoverview multiple choice states handling
 *
 * states:
 *   answers:
 *     - startTime
 *     - endTime
 *     - url
 *     - value
 *     - imageSetId: <id>
 *     - repeatValue
 *     - repeatStartTime
 *     - repeatEndTime
 *   toRepeatIds:
 *     - <id>
 */

const _ = require('lodash')
const path = require('path')
const util = require('./util')

function getExperimentAttr (paths, probRepeat) {
  let attr = {
    probRepeat,
    nImage: 0,
    nQuestionMax: 0,
    nRepeatQuestionMax: 0,
  }

  let imageSetIds = []
  for (let path of paths) {
    let imageSetId = util.extractId(path)
    if (!_.includes(imageSetIds, imageSetId)) {
      imageSetIds.push(imageSetId)
    }
  }

  attr.imageSetIds = imageSetIds

  attr.nQuestionMax = imageSetIds.length
  attr.nRepeatQuestionMax = Math.ceil(attr.probRepeat * attr.nQuestionMax)
  attr.nQuestion = attr.nQuestionMax + attr.nRepeatQuestionMax

  return attr
}

function lengthOfPropList (o, key) {
  if (!(key in o)) {
    return 0
  } else {
    console.log('lengthOfProplist')
    return o[key].length
  }
}

function getIntFromStr (s) {
  try {
    return parseInt(s.replace(/^\D+/g, ''))
  } catch (e) {
    return null
  }
}

function getChoices (experiment, participant) {
  let states = participant.states

  let isRepeat = false
  let unansweredIds = _.clone(experiment.attr.imageSetIds)
  for (let answer of states.answers) {
    _.remove(unansweredIds, id => id === answer.imageSetId)
  }
  if (unansweredIds.length === 0) {
    if (lengthOfPropList(states, 'toRepeatIds')) {
      isRepeat = true
    }
  } else {
    if (lengthOfPropList(states, 'toRepeatIds')) {
      // Here is the random probability to do a repeat
      if (Math.random() <= experiment.attr.probRepeat) {
        isRepeat = true
      }
    }
  }
  console.log('> handlers.publicGetNextChoice repeat',
    isRepeat, experiment.attr.nRepeatQuestionMax, unansweredIds)

  let qualificationIds = _.filter(
    unansweredIds, i => _.startsWith(i.toLowerCase(), 'test'))
  qualificationIds = _.sortBy(qualificationIds, i => getIntFromStr(i))
  console.log('> getChoices testIds', qualificationIds)

  let imageSetId
  if (!isRepeat) {
    if (qualificationIds.length > 0) {
      imageSetId = qualificationIds[0]
    } else {
      imageSetId = unansweredIds[Math.floor(Math.random() * unansweredIds.length)]
    }
  } else {
    imageSetId = _.shuffle(states.toRepeatIds)[0]
  }

  let question
  let choices = []
  for (let url of _.map(experiment.images, 'url')) {
    if (util.extractId(url) !== imageSetId) {
      continue
    }
    if (_.includes(url, 'question')) {
      question = {
        isRepeat,
        url,
        imageSetId,
        value: _.last(path.parse(url).name.split('_'))
      }
    } else {
      choices.push({
        isRepeat,
        startTime: util.getCurrentTimeStr(),
        endTime: null,
        url,
        imageSetId,
        value: _.last(path.parse(url).name.split('_'))
      })
    }
  }
  return {question, choices}
}

function isDone (experimentAttr, participant) {
  return (participant.attr.nAnswer >= experimentAttr.nQuestionMax) &&
    (participant.attr.nRepeatAnswer >= experimentAttr.nRepeatQuestionMax)
}

function getStatus (experimentAttr, participant) {
  if (isDone(experimentAttr, participant)) {
    return 'done'
  }

  if (participant.attr.user === null) {
    return 'qualificationStart'
  }

  let unansweredIds = _.clone(experimentAttr.imageSetIds)
  for (let answer of participant.states.answers) {
    _.remove(unansweredIds, id => id === answer.imageSetId)
  }
  let qualificationIds = _.filter(
    unansweredIds, i => _.startsWith(i.toLowerCase(), 'test'))

  console.log('> multiple.getStatus', qualificationIds, participant.states.toRepeatIds)

  if (qualificationIds.length > 0) {
    return 'qualifying'
  }

  if (participant.attr.user.isQualified) {
    return 'running'
  }

  if (_.isUndefined(participant.states.toRepeatIds)) {
    participant.states.toRepeatIds = []
  }

  if (participant.states.toRepeatIds.length === 0) {
    let nQualificationFail = 0
    if (nQualificationFail > 0) {
      return 'qualificationFailed'
    } else {
      return 'start'
    }
  }

  return 'running'

}

function getNewStates (experiment) {
  return {
    answers: [],
    toRepeatIds: []
  }
}

function pushToListProp (o, key, item) {
  if (!(key in o)) {
    o[key] = []
  }
  o[key].push(item)
}

function makeChoice(states, answer) {
  answer.endTime = util.getCurrentTimeStr()
  if (!answer.isRepeat) {
    states.answers.push(answer)
    console.log(answer)
    if (!_.startsWith(answer.imageSetId.toLowerCase(), 'test')) {
      pushToListProp(states, 'toRepeatIds', answer.imageSetId)
    }
  } else {
    let originalAnswer = _.find(states.answers, a => a.imageSetId === answer.imageSetId)
    _.remove(states.toRepeatIds, id => id === answer.imageSetId)
    console.log(answer, originalAnswer, states.toRepeatIds)
    originalAnswer.repeatValue = answer.value
  }
}

module.exports = {
  getExperimentAttr,
  getChoices,
  isDone,
  getNewStates,
  makeChoice,
  getStatus
}
