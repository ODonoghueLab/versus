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
const util = require('./util')
const path = require('path')

// probability that a repeat comparison will be chosen
let probRepeat = 0.2

function lengthOfPropList (o, key) {
  if (!(key in o)) {
    return 0
  } else {
    console.log('lengthOfProplist')
    return o[key].length
  }
}

function makeQuery (imageSetId, images, isRepeat) {

}

function makeThisQuery (experiment, participant) {
  let states = participant.states

  let unansweredIds = _.clone(experiment.attr.imageSetIds)
  for (let answer of states.answers) {
    _.remove(unansweredIds, id => id === answer.imageSetId)
  }

  let nRepeat = 0
  let nAnswer = 0
  for (let a of states.answers) {
    nAnswer += 1
    if (a.repeatValue) {
      nRepeat += 1
    }
  }

  let probRepeat = 0.2

  let isRepeat = false
  if (unansweredIds.length === 0) {
    if (lengthOfPropList(states, 'toRepeatIds')) {
      isRepeat = true
    }
  } else {
    if (lengthOfPropList(states, 'toRepeatIds')) {
      // Here is the random probability to do a repeat
      if (Math.random() <= probRepeat) {
        isRepeat = true
      }
    }
  }

  console.log('> handlers.publicGetNextChoice doRepeatComparison',
    isRepeat, nRepeat, experiment.attr.nRepeat, unansweredIds)

  let imageSetId
  if (!isRepeat) {
    imageSetId = unansweredIds[Math.floor(Math.random() * unansweredIds.length)]
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

module.exports = {
  makeThisQuery
}
