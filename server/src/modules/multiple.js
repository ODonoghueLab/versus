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
  attr.nAllQuestion = attr.nQuestionMax + attr.nRepeatQuestionMax

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

function getCorrectValue (experiment, testId) {
  let image = _.find(experiment.images, image => {
    let isSameId = util.extractId(image.url) === testId
    let isQuestion = image.url.includes('question')
    return isSameId && isQuestion
  })
  return util.extractId(image.url, '_', 2)
}

function checkQualificationFail (experiment, states) {
  let nQualificationFail = 0
  let imageSetIds = experiment.attr.imageSetIds
  let qualificationIds = _.filter(imageSetIds, i => _.startsWith(i.toLowerCase(), 'test'))
  for (let testId of qualificationIds) {
    let answer = _.find(states.answers, a => a.imageSetId === testId)
    if (!(getCorrectValue(experiment, testId) === answer.value)) {
      nQualificationFail += 1
    }
  }
  return (nQualificationFail > 0)
}

function updateStatesToAttr (participant, experiment) {
  let experimentAttr = experiment.attr
  let attr = participant.attr
  let states = participant.states

  if (_.isUndefined(states.toRepeatIds)) {
    states.toRepeatIds = []
  }

  attr.nAnswer = 0
  attr.nRepeatAnswer = 0
  attr.nConsistentAnswer = 0
  attr.time = 0
  if (!_.isUndefined(states.answers)) {
    for (let answer of states.answers) {
      attr.time += util.getTimeInterval(answer)
      attr.nAnswer += 1
      if ('repeatValue' in answer) {
        attr.nAnswer += 1
        attr.nRepeatAnswer += 1
        if (answer.repeatValue === answer.value) {
          attr.nConsistentAnswer += 1
        }
      }
    }
  }
  attr.progress = attr.nAnswer / experimentAttr.nAllQuestion * 100

  attr.isDone = (attr.nAnswer >= experimentAttr.nAllQuestion) &&
    (attr.nRepeatAnswer >= experimentAttr.nRepeatQuestionMax) &&
    ((attr.nAnswer - attr.nRepeatAnswer) >= experimentAttr.nQuestionMax)

  console.log('> multiple.updateStatesToAttr experimentAttr', experimentAttr)
  console.log('> multiple.updateStatesToAttr attr', attr)
  if (!attr.isDone && attr.surveyCode) {
    delete attr.surveyCode
  }

  if (attr.isDone) {
    attr.status = 'done'
  } else if (attr.user === null) {
    attr.status = 'qualificationStart'
  } else {
    let unansweredIds = _.clone(experimentAttr.imageSetIds)
    for (let answer of states.answers) {
      _.remove(unansweredIds, id => id === answer.imageSetId)
    }
    let qualificationIds = _.filter(
      unansweredIds, i => _.startsWith(i.toLowerCase(), 'test'))
    if (qualificationIds.length > 0) {
      attr.status = 'qualifying'
    } else if (attr.user.isQualified) {
      attr.status = 'running'
    } else {
      attr.status = 'running'
      if (states.toRepeatIds.length === 0) {
        if (checkQualificationFail(experiment, states)) {
          attr.status = 'qualificationFailed'
        } else {
          attr.status = 'start'
        }
      }
    }
  }
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
  getNewStates,
  makeChoice,
  updateStatesToAttr
}
