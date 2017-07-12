
/**
 * Implementation of the binary-tree method for
 * efficient paired comparions "Efficient method
 * for paired comparison", Silverstein & Farrell
 * Journal of Electronic Imaging (2001) 10(2), 394–398
 *
 * This algorithm was used for aesthethics comparisons
 * "Evaluating the Effectiveness of Color to Convey
 * Alignment Quality in Macromolecular Structures"
 * Heinrich, Kaur, O'Donoghue (2015) Big Data Visual
 * Analytics
 *
 * This implementation written by (c) 2017 Bosco K. Ho,
 * based on the work of Tylor Stewart
 */

function newNode (imageIndex, left, right) {
  return { imageIndex, left, right }
}

function newState (imageUrls) {
  return {
    testImageIndex: 1, // currently testing this imageIndex
    nodeIndex: 0, // node to compare to test imageIndex
    nodes: [newNode(0, null, null)],
    ranks: [],
    urls: imageUrls
  }
}

function makeChoice (state, chosenImageIndex) {
  // state.testImageIndex is always larger than all previously seen imageIndex's
  // so if chosenImageIndex is larger than tree.testImageIndex, this mean
  // state.testImageIndex was chosen, therefore the new image is better
  console.log('>> tree.makeChoice', state.testImageIndex, state.nodeIndex)
  console.log(state.nodes)
  console.log('>> tree.makeChoice -', chosenImageIndex)
  const isTestImageChosen = (chosenImageIndex > state.nodes[state.nodeIndex].imageIndex)
  if (isTestImageChosen) {
    // Right branch holds nodes that are better than imageIndex
    if (state.nodes[state.nodeIndex].right == null) {
      // Insert Node
      state.nodes[state.nodeIndex].right = state.nodes.length
      state.nodes[state.nodes.length] = newNode(state.testImageIndex, null, null)
      state.nodeIndex = 0
      state.testImageIndex += 1 // choose new image
    } else {
      // Traverse Tree
      state.nodeIndex = state.nodes[state.nodeIndex].right
    }
  } else {
    // Left branch holds nodes that are worse than imageIndex
    if (state.nodes[state.nodeIndex].left == null) {
      // Insert Node
      state.nodes[state.nodeIndex].left = state.nodes.length
      state.nodeIndex = 0
      state.nodes[state.nodes.length] = newNode(state.testImageIndex, null, null)
      state.testImageIndex += 1 // load new image
    } else {
      // Traverse Tree
      state.nodeIndex = state.nodes[state.nodeIndex].left
    }
  }
}

function isDone (state) {
  if (state.testImageIndex === state.urls.length) {
    return true
  }
  if (('ranks' in state) && (state.ranks.length > 0)) {
    return true
  }
  return false
}

function makeComparison (state, imageIndexA, imageIndexB) {
  return {
    itemA: { value: imageIndexA, url: state.urls[imageIndexA] },
    itemB: { value: imageIndexB, url: state.urls[imageIndexB] }
  }
}

function getComparison (state) {
  let iNew = state.testImageIndex
  let iNode = state.nodes[state.nodeIndex].imageIndex
  return makeComparison(state, iNode, iNew)
}

function rankNodes (state) {
  // Perform Pre Order Search
  // binary search with the deepest right branch
  // stored in ranks first
  let ranks = []
  function storeRank (nodeIndex) {
    if (typeof state.nodes[nodeIndex] !== typeof undefined) {
      storeRank(state.nodes[nodeIndex].right)
      ranks.push(state.urls[state.nodes[nodeIndex].imageIndex])
      storeRank(state.nodes[nodeIndex].left)
    }
  }
  storeRank(0)
  state.ranks = ranks
}

module.exports = {
  isDone,
  newState,
  newNode,
  makeChoice,
  getComparison,
  rankNodes
}
