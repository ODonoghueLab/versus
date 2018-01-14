export default {

  jstr (o) {
    return JSON.stringify(o, null, 2)
  },

  /**
   * In-place deletion of item from a list. Assumes item is an object
   * and key gives the field that identifies the item
   * @param [Array <obj>] aList - an array of items
   * @param [obj] item - target item
   * @param [string] key - field in item for identification
   */
  removeItem (aList, item, key) {
    for (let i = aList.length - 1; i >= 0; i -= 1) {
      if (aList[i][key] === item[key]) {
        aList.splice(i, 1)
      }
    }
  },

  /**
   * Forces the browser to download a json file from the client
   * @param {string} fname
   * @param {obj} obj - data to download
   */
  downloadObject (fname, obj) {
    let s = JSON.stringify(obj, null, 2)
    let data = 'text/json;charset=utf-8,' + encodeURIComponent(s)

    let a = document.createElement('a')
    a.href = 'data:' + data
    a.download = 'data.json'
    a.innerHTML = 'download JSON'

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  },

  /**
   * Returns an n-length array of v values
   * @param n
   * @param v
   * @returns {Array}
   */
  makeArray (n, v) {
    let l = []
    for (let i = 0; i < n; i += 1) {
      l.push(v)
    }
    return l
  },

  isStringInStringList (str, testStrList) {
    for (let testStr of testStrList) {
      if (_.includes(str, testStr)) {
        return true
      }
    }
    return false
  }

}
