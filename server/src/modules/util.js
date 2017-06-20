
module.exports = {
  jstr(o) {
    return JSON.stringify(o, null, 2)
  },
  removeItem (aList, item, key) {
    for (let i=aList.length-1; i>=0; i-=1) {
      if (aList[i][key] === item[key]) {
        aList.splice(i, 1)
      }
    }
  }
}