const _ = require('lodash')
const path = require('path')

module.exports = {

  /**
   * @return {String} of JSON-literal o
   */
  jstr (o) {
    return JSON.stringify(o, null, 2)
  },

  /**
   * In-place removal of item from a list of dictionaries, using key for comparison
   */
  removeItem (aList, item, key) {
    const iLast = aList.length - 1
    for (let i = iLast; i >= 0; i -= 1) {
      if (aList[i][key] === item[key]) {
        aList.splice(i, 1)
      }
    }
  },

  /**
   * @returns {Array} - of n-length consisting of v values
   */
  makeArray (n, v) {
    let l = []
    for (let i = 0; i < n; i += 1) {
      l.push(v)
    }
    return l
  },

  /**
   * @return {boolean} if str is a sub-string of any string of testStrList
   */
  isStringInStringList (str, testStrList) {
    for (let testStr of testStrList) {
      if (_.includes(testStr, str)) {
        return true
      }
    }
    return false
  },

  getCurrentTimeStr () {
    let date = new Date()
    return date.toJSON()
  },

  getTimeInterval (answer) {
    let startMs = new Date(answer.startTime).getTime()
    let endMs = new Date(answer.endTime).getTime()
    return (endMs - startMs) / 1000
  },

  extractId (p, delimiter = '_', iToken = 0) {
    let ext = path.extname(p)
    let base = path.basename(p, ext)
    let tokens = base.split(delimiter)
    if (tokens.length > iToken) {
      return tokens[iToken]
    } else {
      return ''
    }
  }

}
