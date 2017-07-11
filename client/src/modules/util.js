export default {

  jstr (o) {
    return JSON.stringify(o, null, 2)
  },

  /**
   * In-place deletion of item from a list. Assumes item is an object
   * and key gives the field that identifies the item
   *
   * @param [Array of Ojbects] aList - an array of items
   * @param [Object] item - target item
   * @param [str] key - field in item for identification
   */
  removeItem (aList, item, key) {
    for (let i = aList.length - 1; i >= 0; i -= 1) {
      if (aList[i][key] === item[key]) {
        aList.splice(i, 1)
      }
    }
  },

  /**
   * Saves
   * @param {*} fname
   * @param {*} obj
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
  }

}
