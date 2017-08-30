module.exports = {

  jstr (o) {
    return JSON.stringify(o, null, 2)
  },

  removeItem (aList, item, key) {
    const iLast = aList.length - 1
    for (let i = iLast; i >= 0; i -= 1) {
      if (aList[i][key] === item[key]) {
        aList.splice(i, 1)
      }
    }
  },

  makeArray (n, v) {
    let l = []
    for (let i = 0; i < n; i += 1) {
      l.push(v)
    }
    return l
  }

}
