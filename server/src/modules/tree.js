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


const _ = require('lodash')

function newNode (imageIndex, left, right, parent) {
  return {imageIndex, left, right, parent}
}


function newState (imageUrls) {
  let untestedImageIndices = _.range(imageUrls.length)
  let rootImageIndex = untestedImageIndices.shift()
  let rootNode = newNode(rootImageIndex, null, null, null)
  let newImageIndex = untestedImageIndices.shift()
  console.log(untestedImageIndices, newImageIndex)
  return {
    urls: imageUrls,
    rootNodeIndex: 0, // can change with re-balancing
    nodes: [rootNode],
    testNodeIndex: 0, // points to imageIndex of image to test
    untestedImageIndices,
    newImageIndex,
    ranks: [],
    comparisons: [],
  }
}


/**
 * Sorts the nodes into an ordered list based on
 * the position in the binary tree with left-most
 * first
 *
 * @param state
 * @returns {Array} of nodes
 */
function getOrderedNodeList (state) {
  let sortedNodes = []
  function storeRank (nodeIndex) {
    if (nodeIndex !== null) {
      storeRank(state.nodes[nodeIndex].left)
      sortedNodes.push(state.nodes[nodeIndex])
      storeRank(state.nodes[nodeIndex].right)
    }
  }
  storeRank(state.rootNodeIndex)
  return sortedNodes
}


/**
 * Balances the binary tree represented by the order of
 * the sorted nodes and returns the root node of the
 * new tree
 *
 * @param {Array} of sorted nodes
 * @returns {node} the root node of the re-balanced tree
 */
function balanceSubTree (sortedNodes) {
  const nNode = sortedNodes.length
  if (nNode == 0) {
    return null
  }

  const iMidNode = Math.floor(nNode / 2)
  let leftNodes = sortedNodes.slice(0, iMidNode)
  let midNode = sortedNodes[iMidNode]
  let rightNodes = sortedNodes.slice(iMidNode + 1, nNode + 1)

  let leftChildNode = balanceSubTree(leftNodes)
  let rightChildNode = balanceSubTree(rightNodes)
  if (leftChildNode !== null) {
    midNode.left = leftChildNode.imageIndex
    leftChildNode.parent = midNode.imageIndex
  } else {
    midNode.left = null
  }
  if (rightChildNode !== null) {
    midNode.right = rightChildNode.imageIndex
    rightChildNode.parent = midNode.imageIndex
  } else {
    midNode.right = null
  }

  return midNode
}


function insertNodeForNewImageIndex (state) {

  // create new node for newImageIndex
  let node = newNode(state.newImageIndex, null, null, state.testNodeIndex)
  iNewNode = state.nodes.length
  state.nodes.push(node)

  // rebalance the tree
  let sortedNodes = getOrderedNodeList(state)
  let newRootNode = balanceSubTree(sortedNodes)
  newRootNode.parent = null
  state.rootNodeIndex = newRootNode.imageIndex
  state.testNodeIndex = state.rootNodeIndex

  // get new Image
  state.newImageIndex = state.untestedImageIndices.shift()

  console.log('>> tree.resetTreeForNewTestImage ===>',
    'rootNodeIndex', state.rootNodeIndex,
    'testNodeIndex', state.testNodeIndex,
    'newImageIndex', state.newImageIndex,
    state.untestedImageIndices)

  return iNewNode
}


function makeChoice (state, comparison) {

  let testNode = state.nodes[state.testNodeIndex]
  let chosenImageIndex = comparison.choice

  console.log('>> tree.makeChoice',
    'rootNodeIndex', state.rootNodeIndex,
    'testNodeIndex', state.testNodeIndex,
    'newImageIndex', state.newImageIndex,
    '- chosenImageIndex', chosenImageIndex)

  // go right branch if newImageIndex is chosen (preferred)
  if (chosenImageIndex === state.newImageIndex) {
    if (testNode.right === null) {
      testNode.right = insertNodeForNewImageIndex(state)
    } else {
      state.testNodeIndex = testNode.right
    }
  } else {
    if (testNode.left === null) {
      testNode.left = insertNodeForNewImageIndex(state)
    } else {
      state.testNodeIndex = testNode.left
    }
  }

  state.comparisons.push(comparison)

  console.log(state.nodes)
}


function isDone (state) {
  if (_.isUndefined(state.newImageIndex)) {
    return true
  }
  if (('ranks' in state) && (state.ranks.length > 0)) {
    return true
  }
  return false
}


function makeComparison (state, imageIndexA, imageIndexB) {
  return {
    itemA: {value: imageIndexA, url: state.urls[imageIndexA]},
    itemB: {value: imageIndexB, url: state.urls[imageIndexB]},
    choice: null,
    isRepeat: false
  }
}


function getComparison (state) {
  let iNew = state.newImageIndex
  let iNode = state.nodes[state.testNodeIndex].imageIndex
  return makeComparison(state, iNode, iNew)
}


function rankNodes (state) {
  let orderedNodes = getOrderedNodeList(state)
  state.ranks = _.map(orderedNodes, n => state.urls[n.imageIndex])
}

module.exports = {
  isDone,
  newState,
  makeChoice,
  getComparison,
  rankNodes
}
