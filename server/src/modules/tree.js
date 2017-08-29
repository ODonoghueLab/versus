
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
  return { imageIndex, left, right, parent }
}

function newState (imageUrls) {
  return {
    testImageIndex: 1, // currently testing this imageIndex
    rootNodeIndex: 0, // root of the binary tree, can change with re-balancing
    nodeIndex: 0, // node to compare to test imageIndex,
    nodes: [newNode(0, null, null, null)],
    ranks: [],
    urls: imageUrls
  }
}


function getOrderedNodeList (state) {
  // Perform Pre Order Search
  // binary search with the deepest right branch
  // stored in ranks first
  let sortedNodes = []
  let nodes = state.nodes
  function storeRank (nodeIndex) {
    if (nodeIndex === null) {
      return
    }
    storeRank(nodes[nodeIndex].left)
    sortedNodes.push(nodes[nodeIndex])
    storeRank(nodes[nodeIndex].right)
  }
  storeRank(state.rootNodeIndex)
  return sortedNodes
}


function balanceSubTree(nodes) {
  const n = nodes.length
  if (n == 0) {
    return null
  }
  const iMidNode = Math.floor(n/2)
  let midNode = nodes[iMidNode]
  midNode.left = null
  midNode.right = null
  const leftNodes = nodes.slice(0, iMidNode)
  const rightNodes = nodes.slice(iMidNode+1, n+1)
  let leftChildNode = balanceSubTree(leftNodes)
  let rightChildNode = balanceSubTree(rightNodes)
  if (leftChildNode !== null) {
    midNode.left = leftChildNode.imageIndex
    leftChildNode.parent = midNode.imageIndex
  }
  if (rightChildNode !== null) {
    midNode.right = rightChildNode.imageIndex
    rightChildNode.parent = midNode.imageIndex
  }
  return midNode
}


function rebalanceTree(state) {
  let sortedNodes = getOrderedNodeList(state)
  let newRootNode = balanceSubTree(sortedNodes)
  newRootNode.parent = null
  state.rootNodeIndex = newRootNode.imageIndex
  state.nodeIndex = state.rootNodeIndex
  state.testImageIndex += 1 // choose new image
  console.log('>> tree.rebalanceTree ===>',
    'rootNodeIndex', state.rootNodeIndex,
    'nodeIndex', state.nodeIndex,
    'testImageIndex', state.testImageIndex)
}

function makeChoice (state, chosenImageIndex) {
  // state.testImageIndex is always larger than all previously seen imageIndex's
  // so if chosenImageIndex is larger than tree.testImageIndex, this mean
  // state.testImageIndex was chosen, therefore the new image is better
  console.log('>> tree.makeChoice (', state.testImageIndex,
    state.nodes[state.nodeIndex].imageIndex, ') -', chosenImageIndex)
  console.log('>> tree.makeChoice',
    'rootNodeIndex', state.rootNodeIndex,
    'nodeIndex', state.nodeIndex,
    'testImageIndex', state.testImageIndex)
  const isTestImageChosen = (chosenImageIndex !== state.nodes[state.nodeIndex].imageIndex)
  if (isTestImageChosen) {
    // Right branch holds nodes that are better than imageIndex
    if (state.nodes[state.nodeIndex].right == null) {
      // Insert Node
      state.nodes[state.nodeIndex].right = state.nodes.length
      state.nodes[state.nodes.length] = newNode(state.testImageIndex, null, null, state.nodeIndex)
      rebalanceTree(state)
    } else {
      // Traverse Tree
      state.nodeIndex = state.nodes[state.nodeIndex].right
    }
  } else {
    // Left branch holds nodes that are worse than imageIndex
    if (state.nodes[state.nodeIndex].left == null) {
      // Insert Node
      state.nodes[state.nodeIndex].left = state.nodes.length
      state.nodes[state.nodes.length] = newNode(state.testImageIndex, null, null, state.nodeIndex)
      rebalanceTree(state)
    } else {
      // Traverse Tree
      state.nodeIndex = state.nodes[state.nodeIndex].left
    }
  }
  console.log('>> tree.makeChoice nodes\n', state.nodes)
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
    if (nodeIndex !== null) {
      storeRank(state.nodes[nodeIndex].left)
      ranks.push(state.urls[state.nodes[nodeIndex].imageIndex])
      storeRank(state.nodes[nodeIndex].right)
    }
  }
  storeRank(state.rootNodeIndex)
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
